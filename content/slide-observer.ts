import { formatTimer, getElapsedMs } from "~format-time";
import type { PlasmoCSConfig } from "plasmo";
import { buildTimerData, parseTimerToken } from "~parse-timers";
import { TimerMessage, type TimerData, type TimerMessaging, type TimerState, type TimerStates } from "~timer-types";
import { debugLog } from "~utils/debug-options";

debugLog("GFN Timer: content script injected");

// variable interval ping definitions
const SLIDE_CHANGED_INTERVAL = 100; // 0.1s
const STATE_SYNC_INTERVAL = 5000;

const INITIAL_RETRIES = 10;
let extractRetries = 0;

// for selecting text nodes from rendered slide

const TEXT_NODE_QUERY = "g.sketchy-text-content-text > text";

const timerElmRecord: Record<string, SVGTextElement[]> = {};
const firedSet = new Set<string>();

const PORT_NAME = "gfn-timer";
const SLIDE_ID_REGEX = /slide=([^&]+)/;
const PRESENT_MODE_QUERY = ".sketchyViewerContainer";
const PRESENT_MODE_CONTAINER = ".punch-full-screen-element";
const SLIDE_WRAPPER_QUERY = ".punch-viewer-page-wrapper"; // keeping for potential future use

const PAUSE_PLAY_KEY = "y";

let currentSlideId = "";
let inPresentMode = false;
let presentDocument: Document | null = null;

// moving to content scripts acting on caches from the background store 
let slideCheckInterval: number | null = null;
let stateSyncInterval: number | null = null;
let renderLoopId: number | null = null;
let cachedTimerStates: TimerStates | null = null;




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

let port = makePort();

function makePort() {
  const newPort = chrome.runtime.connect({ name: PORT_NAME });
  
  // auto reconnect
  newPort.onDisconnect.addListener(() => {
    port = makePort();
  })

  // render loop now acts on cached timer states
  newPort.onMessage.addListener((msg: TimerStates) => {
    //debugLog("GFN Timer: cached", msg.timers.length, "timers from BG");
    cachedTimerStates = msg;
  });

  return newPort;

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

  // slide change detection, operates on a faster interval for "responsiveness"
  if (!slideCheckInterval) {
    checkSlideChange(); // run immediately on enter
    setTimeout(() => {
      slideCheckInterval = setInterval(() => {checkSlideChange();}, SLIDE_CHANGED_INTERVAL);
    }, 500);
    
  }
  // slower interval state sync to refresh cached states from background store
  // -> also serves as a heartbeat to keep the service worker alive
  if (!stateSyncInterval) {
    getTimerStates();
    stateSyncInterval = setInterval(getTimerStates, STATE_SYNC_INTERVAL);
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

  // clear stale element and document references so re-entering present mode rescans
  for (const key of Object.keys(timerElmRecord)) {
    delete timerElmRecord[key];
  }
  // presentDocument removal now is here
  presentDocument = null;

  const messageContent: TimerMessaging = {
    messageType: TimerMessage.RESET_SESSION
  };
  port.postMessage(messageContent);


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
  const slideId = getCurrentSlideId();
  if (!slideId) {
    debugLog("GFN Timer: extract -> no slideId");
    return false;
  }

  const doc = getPresentDocument();
  if (!doc) {
    debugLog("GFN Timer: extract -> no presentDocument");
    return false;
  }

  const allTextNodes = doc.querySelectorAll<SVGTextElement>(TEXT_NODE_QUERY);
  const foundTimers: TimerData[] = [];
  let tokenInd = 0;

  for (const textNode of allTextNodes) {
    const text = textNode.textContent ?? "";
    const parsedTimerToken = parseTimerToken(text);

    if (parsedTimerToken == null) { continue; }
    
    const timerData = buildTimerData(parsedTimerToken, tokenInd, slideId);
    if (!timerElmRecord[timerData.id]) {
      timerElmRecord[timerData.id] = [];
    }
    if (!timerElmRecord[timerData.id].includes(textNode)) {
      timerElmRecord[timerData.id].push(textNode);
      foundTimers.push(timerData);
    }
    tokenInd++;
  }


  debugLog(`GFN Timer: Parsed ${tokenInd} timer tokens`);
 
  if (foundTimers.length > 0) {
    const messageContent:TimerMessaging = {
      messageType: TimerMessage.REGISTER_TIMERS,
      timers: foundTimers
    };

    port.postMessage(messageContent);
  }

  return true;
}


function onSlideChanged(): boolean {
  // we'll go with polling for this; in case google engineers change how the dom renders slides
  //  this is a more robust, stable method that will likely require less dev intervention
  const slideId = getCurrentSlideId();
  const extracted = extractFromCurrentSlide();
  const messageContent:TimerMessaging = {
    messageType: TimerMessage.SLIDE_CHANGED,
    slideId: slideId
  };

  port.postMessage(messageContent);

  return extracted;
}

function getTimerStates() {
  // more like a ping and response
  const messageContent: TimerMessaging = {
    messageType: TimerMessage.GET_TIMER_STATES
  }

  port.postMessage(messageContent);
}

function getPresentDocument(): Document | null {
  
  if (presentDocument?.querySelector(PRESENT_MODE_QUERY)) {
    return presentDocument;
  }

  // we gotta iterate through each iframe and get its document to access the present mode text
  for (const iframe of document.querySelectorAll("iframe")) {
    const doc = iframe.contentDocument;
    if (doc?.querySelector(PRESENT_MODE_QUERY)) {
      presentDocument = doc;
      return doc;
    }
  }

  presentDocument = null;
  return null;
}

function isInPresentMode(): boolean {
  return document.querySelector(PRESENT_MODE_CONTAINER) !== null;
}


// check for slide change, called every sec approximately
function checkSlideChange() {
  if (!inPresentMode) return;

  const id = getCurrentSlideId();
  if (id !== currentSlideId) {
    //debugLog("GFN Timer: slide changed from", currentSlideId, "to", id);
    const doc = getPresentDocument();
    if (!doc) { return; }

    // iframe is ready — retry pause listener attach if the setting is on and it wasn't attached at enter time
    if (currentOptions?.pausePlayTimers) {
      attachPauseListener();
    }

    debugLog("trying..")
    if (onSlideChanged()) {
      debugLog("onslidechanged hit");
      currentSlideId = id;
      extractRetries = 0;
      getTimerStates();
    } else if (extractRetries++ > INITIAL_RETRIES) {
      debugLog("extract retry limit hit");
      currentSlideId = id;
      extractRetries = 0;
      getTimerStates();
    }
    
  }
}

// pause/play functionality, toggles all timers (type countdown or stopwatch) on the current slide.
// keydown focus lives inside the present-mode iframe
// that doc materializes lazily, so we rely on check slide change in order to add it 
let pauseListenerDoc: Document | null = null;

function onPauseKeydown(e: KeyboardEvent) {
  debugLog("GFN Timer: Got key press! " + e.key.toLowerCase())
  if (e.key.toLowerCase() !== PAUSE_PLAY_KEY) { return; }
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) { return; }

  // redundant check because it will only be registered in present mode
  if (!inPresentMode) { return; }

  // toggle logic is handled in background store
  const messageContent: TimerMessaging = { messageType: TimerMessage.TOGGLE_SLIDE_PAUSE };
  port.postMessage(messageContent);
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

  if (cachedTimerStates) {
    for (const timerState of cachedTimerStates.timers) {
      const nodeRefs = timerElmRecord[timerState.id];
      if (!nodeRefs) { continue; }

      const formatted = formatTimer(timerState, currentOptions);
      for (const nodeRef of nodeRefs) {
        nodeRef.textContent = formatted;
      }
      checkAutoAdvance(timerState);
    }
  }

  renderLoopId = requestAnimationFrame(renderLoop);
}