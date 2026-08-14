import { formatTimer, getElapsedMs } from "~format-time";
import type { PlasmoCSConfig } from "plasmo";
import { claimView, discoverTimerViews, resolveTimerAssignments } from "~content/extract-timers";
import { computeVisibleTimerIds, isViewVisible } from "~content/view-visibility";
import { TimerMessage, type TimerData, type TimerMessaging, type TimerState, type TimerStates } from "~timer-types";
import { debugLog } from "~utils/debug-options";
import { getAlarmSoundLocation } from "~popup/settings/alarmSounds";

// this file is kind of long haha, wonder if we should spread out these functions a bit better

debugLog("GFN Timer: content script injected");

// variable interval ping definitions
const VISIBILITY_CHECK_INTERVAL = 100; // 0.1s
const STATE_SYNC_INTERVAL = 5000;

const INITIAL_RETRIES = 30;
let extractRetries = 0;
let pendingSlideId = ""; // slide the retry counter currently applies to

// for selecting text nodes from rendered slide

const TEXT_NODE_QUERY = "g.sketchy-text-content-text > text";

interface TimerView {
  display: SVGTextElement
  blanks: SVGTextElement[]
}

const timerElmRecord: Record<string, TimerView[]> = {};
// specs of everything we ever registered this session, so a port reconnect
// with lost background state can re-register instead of stranding visible ids
const registeredTimerSpecs: Record<string, TimerData> = {};
const firedSet = new Set<string>();
const soundFiredSet = new Set<string>();

const PORT_NAME = "gfn-timer";
const SLIDE_ID_REGEX = /slide=([^&]+)/;
const PRESENT_MODE_QUERY = ".sketchyViewerContainer";
const PRESENT_MODE_CONTAINER = ".punch-full-screen-element";
const SLIDE_WRAPPER_QUERY = ".punch-viewer-page-wrapper"; // keeping for potential future use

const PAUSE_PLAY_KEY = "y";

let currentSlideId = "";
let inPresentMode = false;
let presentDocument: Document | null = null;
let presentDocumentObserver: MutationObserver | null = null;
let observedPresentDocument: Document | null = null;
let mutationExtractTimeout: number | null = null;

// moving to content scripts acting on caches from the background store 
let slideCheckInterval: number | null = null;
let stateSyncInterval: number | null = null;
let renderLoopId: number | null = null;
let cachedTimerStates: TimerStates | null = null;
let lastSentVisibleIds: string[] | null = null;




let currentOptions: Record<string, boolean> = {};

// Load options initially
chrome.storage.local.get(["timerOptionStates"], (result) => {
  if (result.timerOptionStates) {
    currentOptions = result.timerOptionStates;
  }
});

// Listen for options changes dynamically
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes.timerOptionStates) {
    currentOptions = changes.timerOptionStates.newValue;
    // sync the pause/play keybind listener with the setting while presenting
    if (inPresentMode) {
      if (currentOptions?.pausePlayTimers) {
        attachPauseListener();
      } else {
        detachPauseListener();
      }
    }
  }
});

// The port exists ONLY while presenting. Holding one open on editor pages made
// every idle MV3 service-worker suspension fire a disconnect/reconnect churn
// loop, and an extension reload left orphaned content scripts throwing
// "Attempting to use a disconnected port object" on their next postMessage.
let port: chrome.runtime.Port | null = null;
let contextGoneLogged = false;

function ensurePort(): chrome.runtime.Port {
  if (port) { return port; }

  const newPort = chrome.runtime.connect({ name: PORT_NAME });
  port = newPort;

  newPort.onDisconnect.addListener(() => {
    if (port !== newPort) { return; } // an explicit disconnect already replaced it
    port = null;
    currentSlideId = "";
    lastSentVisibleIds = null;
    if (!inPresentMode) { return; }

    // the background may have lost its session (e.g. worker restart); re-register
    // everything we know so visible ids always have state behind them. Deferred
    // out of the disconnect event; the next 100ms tick republishes visibility.
    const specs = Object.values(registeredTimerSpecs);
    if (specs.length > 0) {
      setTimeout(() => {
        if (!inPresentMode) { return; }
        postToBackground({
          messageType: TimerMessage.REGISTER_TIMERS,
          timers: specs
        });
      }, 0);
    }
  })

  // render loop now acts on cached timer states
  newPort.onMessage.addListener((msg: TimerStates) => {
    //debugLog("GFN Timer: cached", msg.timers.length, "timers from BG");
    cachedTimerStates = msg;
  });

  return newPort;
}

// Never throws: an extension reload invalidates this content script's runtime,
// and any port can die between creation and use — both must degrade to a
// dropped message, not an uncaught error in the page.
function postToBackground(message: TimerMessaging): boolean {
  if (!chrome.runtime?.id) {
    if (!contextGoneLogged) {
      contextGoneLogged = true;
      debugLog("GFN Timer: extension context invalidated (reloaded?); refresh the tab");
    }
    return false;
  }

  try {
    ensurePort().postMessage(message);
    return true;
  } catch {
    port = null; // stale port; retry once on a fresh connection
    try {
      ensurePort().postMessage(message);
      return true;
    } catch {
      port = null;
      return false;
    }
  }
}

function dropPort() {
  const oldPort = port;
  port = null;
  try { oldPort?.disconnect(); } catch { /* already gone */ }
}


// we're going with a two-tiered approach, observer for present mode detection and 
// a poll for render updates / slide change detection
// --> outer observed is determined by .punch-full-screen-element appear in immediate dom body
const outerObserver = new MutationObserver(() => {
  const currentlyPresenting = isInPresentMode();

  if (currentlyPresenting && !inPresentMode) {
    enterPresentMode();
  }
  else if (!currentlyPresenting && inPresentMode) {
    exitPresentMode();
  }
});

// we can scope to simply the immediate childlist, .punch-full-screen-element is a direct child
outerObserver.observe(document.body, { childList: true });

function enterPresentMode() {
  debugLog("GFN Timer: enterPresentMode");
  inPresentMode = true;
  currentSlideId = "";
  extractRetries = 0;
  lastSentVisibleIds = null;

  // slide change detection + visibility sampling; starts immediately — the
  // old 500ms warm-up delay just left a dead zone at presentation start
  if (!slideCheckInterval) {
    checkSlideChange(); // run immediately on enter
    slideCheckInterval = window.setInterval(() => {checkSlideChange();}, VISIBILITY_CHECK_INTERVAL);
  }
  // slower interval state sync to refresh cached states from background store
  // -> also serves as a heartbeat to keep the service worker alive
  if (!stateSyncInterval) {
    getTimerStates();
    stateSyncInterval = window.setInterval(getTimerStates, STATE_SYNC_INTERVAL);
  }

   


  // render loop, runs every frame and does local calculations
  if (!renderLoopId) {
    renderLoopId = requestAnimationFrame(renderLoop);
  }

  // only attach the listener if the pause/play setting is on
  if (currentOptions?.pausePlayTimers) {
    attachPauseListener();
  }

}

function exitPresentMode() {
  inPresentMode = false;
  currentSlideId = "";

  // always detach the keybind on exit, regardless of setting, presence will be handled in detach function
  detachPauseListener();

  // reset cached states
  cachedTimerStates = null;
  firedSet.clear();
  soundFiredSet.clear();

  // Explicitly deactivate everything before deleting the background session.
  publishVisibleTimerIds([], false, true);

  // clear stale element and document references so re-entering present mode rescans
  for (const key of Object.keys(timerElmRecord)) {
    delete timerElmRecord[key];
  }
  for (const key of Object.keys(registeredTimerSpecs)) {
    delete registeredTimerSpecs[key];
  }
  // presentDocument removal now is here
  disconnectPresentDocumentObserver();
  presentDocument = null;

  const messageContent: TimerMessaging = {
    messageType: TimerMessage.RESET_SESSION
  };
  postToBackground(messageContent);

  // no port outside present mode — otherwise every idle service-worker
  // suspension churns a disconnect/reconnect loop on editor pages
  dropPort();


  // clear all active intervals | slideChange, stateSync, render

  if (slideCheckInterval) {
    clearInterval(slideCheckInterval);
    slideCheckInterval = null;
  }

  if (stateSyncInterval) {
    clearInterval(stateSyncInterval);
    stateSyncInterval = null;
  }

  if (renderLoopId) {
    cancelAnimationFrame(renderLoopId);
    renderLoopId = null;
  }
}

function getCurrentSlideId(): string {
  const fullHash = window.location.href;
  const matches = fullHash.match(SLIDE_ID_REGEX);
  return matches ? matches[1] : "";
}

function extractFromCurrentSlide(): boolean {
  const slideId = getCurrentSlideId() || "deck";

  const doc = getPresentDocument();
  if (!doc) {
    debugLog("GFN Timer: extract -> no presentDocument");
    return false;
  }

  const allTextNodes = doc.querySelectorAll<SVGTextElement>(TEXT_NODE_QUERY);
  if (allTextNodes.length === 0) {
    debugLog(`GFN Timer: extract -> slide ${slideId} not ready (no rendered text nodes)`);
    return false;
  }

  pruneTimerViews();

  const foundTimers: TimerData[] = [];
  const assignments = resolveTimerAssignments(
    discoverTimerViews(doc),
    slideId,
    Object.keys(timerElmRecord)
  );

  for (const { view, timerData } of assignments) {
    claimView(view, timerData.id);
    registeredTimerSpecs[timerData.id] = timerData;

    if (!timerElmRecord[timerData.id]) {
      timerElmRecord[timerData.id] = [];
    }
    if (!hasRecordedDisplay(view.displayNode)) {
      timerElmRecord[timerData.id].push({
        display: view.displayNode,
        blanks: view.blankNodes
      });
      foundTimers.push(timerData);
      debugLog(`GFN Timer: discovered timer ${view.tokenText} -> ${timerData.id}`);
    }
  }


  debugLog(`GFN Timer: Parsed ${assignments.length} timer tokens`);
 
  if (foundTimers.length > 0) {
    debugLog(`GFN Timer: registering ${foundTimers.length} timer view(s)`);
    const messageContent:TimerMessaging = {
      messageType: TimerMessage.REGISTER_TIMERS,
      timers: foundTimers
    };

    postToBackground(messageContent);
  }

  updateVisibleTimers();

  return true;
}

function publishVisibleTimerIds(timerIds: string[], requestStates = true, force = false): boolean {
  const unchanged = lastSentVisibleIds != null &&
    lastSentVisibleIds.length === timerIds.length &&
    lastSentVisibleIds.every((timerId, index) => timerId === timerIds[index]);
  if (unchanged && !force) { return false; }

  lastSentVisibleIds = [...timerIds];
  const messageContent: TimerMessaging = {
    messageType: TimerMessage.VISIBLE_TIMERS,
    timerIds
  };
  postToBackground(messageContent);
  debugLog(`GFN Timer: visible timers -> [${timerIds.join(", ")}]`);
  if (requestStates) {
    getTimerStates();
  }
  return true;
}

function updateVisibleTimers(): boolean {
  return publishVisibleTimerIds(computeVisibleTimerIds(timerElmRecord, isViewVisible));
}

function getTimerStates() {
  // more like a ping and response
  const messageContent: TimerMessaging = {
    messageType: TimerMessage.GET_TIMER_STATES
  }

  postToBackground(messageContent);
}

function getPresentDocument(): Document | null {
  // we gotta iterate through each iframe and get its document to access the present mode text
  for (const iframe of document.querySelectorAll("iframe")) {
    // skip hidden/zero-size frames (e.g. presenter view helpers) so visibility
    // checks run against the iframe the audience actually sees
    const frameRect = iframe.getBoundingClientRect();
    if (frameRect.width <= 0 || frameRect.height <= 0) { continue; }
    if (iframe.checkVisibility?.() === false) { continue; }

    const doc = iframe.contentDocument;
    if (doc?.querySelector(PRESENT_MODE_QUERY)) {
      if (presentDocument !== doc) {
        presentDocument = doc;
      }
      attachPresentDocumentObserver(doc);
      return doc;
    }
  }

  disconnectPresentDocumentObserver();
  presentDocument = null;
  return null;
}

function attachPresentDocumentObserver(doc: Document) {
  if (observedPresentDocument === doc || !doc.body) { return; }

  disconnectPresentDocumentObserver();
  presentDocumentObserver = new MutationObserver((mutations) => {
    const includesExternalMutation = mutations.some((mutation) => {
      const target = mutation.target.nodeType === 1
        ? mutation.target as Element
        : mutation.target.parentElement;
      return !target?.closest?.("[data-slidetime-owned]");
    });
    if (!includesExternalMutation) { return; }

    if (mutationExtractTimeout != null) {
      clearTimeout(mutationExtractTimeout);
    }
    mutationExtractTimeout = window.setTimeout(() => {
      mutationExtractTimeout = null;
      if (!inPresentMode) { return; }
      debugLog(`GFN Timer: re-extract-on-mutation for slide ${getCurrentSlideId() || "deck"}`);
      if (extractFromCurrentSlide()) {
        getTimerStates();
      }
    }, 150);
  });
  presentDocumentObserver.observe(doc.body, { childList: true, subtree: true });
  observedPresentDocument = doc;
}

function disconnectPresentDocumentObserver() {
  presentDocumentObserver?.disconnect();
  presentDocumentObserver = null;
  observedPresentDocument = null;
  if (mutationExtractTimeout != null) {
    clearTimeout(mutationExtractTimeout);
    mutationExtractTimeout = null;
  }
}

function pruneTimerViews() {
  // a transiently missing present document must not wipe the view bindings;
  // writes to disconnected nodes are harmless until a real document shows up
  if (!presentDocument) { return; }

  for (const [timerId, views] of Object.entries(timerElmRecord)) {
    // isConnected alone is not enough: a node inside a stale, replaced iframe
    // document is still "connected" to that document
    timerElmRecord[timerId] = views.filter(({ display }) =>
      display.isConnected && display.ownerDocument === presentDocument
    );
    if (timerElmRecord[timerId].length === 0) {
      delete timerElmRecord[timerId];
    }
  }
}

function hasRecordedDisplay(displayNode: SVGTextElement): boolean {
  return Object.values(timerElmRecord).some((views) =>
    views.some(({ display }) => display === displayNode)
  );
}

function isInPresentMode(): boolean {
  return document.querySelector(PRESENT_MODE_CONTAINER) !== null;
}


// check for slide change, called every sec approximately
function checkSlideChange() {
  if (!inPresentMode) return;

  const id = getCurrentSlideId() || "deck";
  const previousPresentDocument = presentDocument;
  const doc = getPresentDocument();
  if (doc) {
    // iframe is ready — retry pause listener attach if the setting is on and it wasn't attached at enter time
    if (currentOptions?.pausePlayTimers) {
      attachPauseListener();
    }

    const presentDocumentChanged = doc !== previousPresentDocument;
    if (presentDocumentChanged && id === currentSlideId) {
      debugLog(`GFN Timer: re-extract-on-document-change for slide ${id}`);
      if (extractFromCurrentSlide()) {
        getTimerStates();
      }
    }

    if (id !== currentSlideId) {
      // each pending slide gets its own retry budget
      if (pendingSlideId !== id) {
        pendingSlideId = id;
        extractRetries = 0;
      }
      //debugLog("GFN Timer: slide changed from", currentSlideId, "to", id);
      debugLog(`GFN Timer: extraction attempt ${extractRetries + 1} for slide ${id}`)
      if (extractFromCurrentSlide()) {
        debugLog(`GFN Timer: extraction ready for slide ${id}`);
        currentSlideId = id;
        extractRetries = 0;
        getTimerStates();
      } else {
        extractRetries++;
        debugLog(`GFN Timer: extraction not ready for slide ${id}; retry ${extractRetries}/${INITIAL_RETRIES}`);
        if (extractRetries >= INITIAL_RETRIES) {
          debugLog(`GFN Timer: extraction retry limit hit for slide ${id}`);
          currentSlideId = id;
          extractRetries = 0;
          getTimerStates();
        }
      }
    }
  }

  // Visibility drives activation and is intentionally sampled at this 100ms
  // cadence, not in the animation-frame render loop.
  updateVisibleTimers();
}

// pause/play functionality, toggles visible timers (type countdown or stopwatch).
// keydown focus lives inside the present-mode iframe
// that doc materializes lazily, so we rely on check slide change in order to add it 
let pauseListenerDoc: Document | null = null;

function onPauseKeydown(e: KeyboardEvent) {
  debugLog("GFN Timer: Got key press! " + e.key.toLowerCase())
  if (e.key.toLowerCase() !== PAUSE_PLAY_KEY) { return; }
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) { return; }

  // redundant check because it will only be registered in present mode
  if (!inPresentMode) { return; }

  // toggle logic is handled in background store; sample visibility fresh at
  // keypress so a mid-transition poll lag cannot pause the wrong timer
  const messageContent: TimerMessaging = {
    messageType: TimerMessage.TOGGLE_SLIDE_PAUSE,
    timerIds: computeVisibleTimerIds(timerElmRecord, isViewVisible)
  };
  postToBackground(messageContent);
}

function attachPauseListener() {
  const doc = getPresentDocument();
  if (!doc) { return; } // iframe not ready yet; a later checkSlideChange will retry
  if (pauseListenerDoc === doc) { return; } // already attached to this doc

  // clean up old listener if it exists
  if (pauseListenerDoc) {
    pauseListenerDoc.removeEventListener("keydown", onPauseKeydown);
  }

  doc.addEventListener("keydown", onPauseKeydown);
  pauseListenerDoc = doc;
}

function detachPauseListener() {
  if (!pauseListenerDoc) { return; }
  pauseListenerDoc.removeEventListener("keydown", onPauseKeydown);
  pauseListenerDoc = null;
}



// used for the autoadvance feature
function advanceSlide() {
  const doc = getPresentDocument();
  if (!doc) return;
  // should only be called in renderer, this is just here in case something goes really wrong
  
  const wrapper = doc.querySelector<HTMLElement>(SLIDE_WRAPPER_QUERY);
  if (!wrapper) return;
  wrapper.click();
}

function playZeroSound() {
  const audio = new Audio(chrome.runtime.getURL(getAlarmSoundLocation()));
  audio.volume = 0.8;
  audio.play();
}

function checkZeroSound(timerState: TimerState) {
  if (!currentOptions["countdownSound"]) return;
  if (soundFiredSet.has(timerState.id))  return;


  let finished = false;
  const type = timerState.timerType;

  if (type === "countdown") {
    const elapsedMs = getElapsedMs(timerState);
    const remainingSec = (timerState.duration ?? 0) - Math.floor(elapsedMs / 1000);
    finished = remainingSec <= 0;
  } 
  else if (type === "timeto" || type === "perpetualcountdown") {
    const remaining = Math.ceil((timerState.duration ?? 0) - Date.now() / 1000);
    finished = remaining <= 0;
  }

  if (finished) {
    soundFiredSet.add(timerState.id);
    playZeroSound();
  }
}

function checkAutoAdvance(timerState: TimerState) {
  if (!currentOptions["countdownAdvance"]) { return; }
  if (timerState.timerType !== "countdown") { return; }
  if (firedSet.has(timerState.id)) { return; }

  const elapsedMs = getElapsedMs(timerState);
  const remainingSec = (timerState.duration ?? 0) - Math.floor(elapsedMs / 1000);
  if (remainingSec <= 0) {
    firedSet.add(timerState.id);
    advanceSlide();
  }
}

// now we can render our updates by accessing animation frames, snappy, responsive updates
function renderLoop() {
  if (!inPresentMode) {
    renderLoopId = null;
    return;
  }

  pruneTimerViews();

  if (cachedTimerStates) {
    for (const timerState of cachedTimerStates.timers) {
      const views = timerElmRecord[timerState.id];
      if (!views) { continue; }

      const formatted = formatTimer(timerState, currentOptions);
      for (const view of views) {
        // skip the write when unchanged: every textContent assignment replaces the
        // text child node, which needlessly churns the present-document observer
        if (view.display.textContent !== formatted) {
          view.display.textContent = formatted;
        }
      }
      checkAutoAdvance(timerState);
      checkZeroSound(timerState);
    }
  }

  renderLoopId = requestAnimationFrame(renderLoop);
}
