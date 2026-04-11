import { formatTimer } from "~format-time";
import type { PlasmoCSConfig } from "plasmo";
import { buildTimerData, parseTimerToken } from "~parse-timers";
import { TimerMessage, type TimerData, type TimerMessaging, type TimerStates } from "~timer-types";

console.log("GFN Timer: content script injected");

// for selecting text nodes from rendered slide

const TEXT_NODE_QUERY = "g.sketchy-text-content-text > text";

const timerElmRecord: Record<string, SVGTextElement> = {};

const PORT_NAME = "gfn-timer";
const SLIDE_ID_REGEX = /slide=([^&]+)/;
const PRESENT_MODE_QUERY = ".sketchyViewerContainer";
const PRESENT_MODE_CONTAINER = ".punch-full-screen-element";
const SLIDE_WRAPPER_QUERY = ".punch-viewer-page-wrapper"; // keeping for potential future use

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
  }
});

const port = chrome.runtime.connect({ name: PORT_NAME });

// render loop now acts on cached timer states
port.onMessage.addListener((msg: TimerStates) => {
  //console.log("GFN Timer: cached", msg.timers.length, "timers from BG");
  cachedTimerStates = msg;
})


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
  console.log("GFN Timer: enterPresentMode");
  inPresentMode = true;
  currentSlideId = "";

  // slide change detection, operates on a faster interval for "responsiveness"
  if (!slideCheckInterval) {
    checkSlideChange(); // run immediately on enter
    slideCheckInterval = setInterval(checkSlideChange, 1000);
  }

  // slower interval state sync to refresh cached states from background store
  // -> also serves as a heartbeat to keep the service worker alive
  if (!stateSyncInterval) {
    getTimerStates();
    stateSyncInterval = setInterval(getTimerStates, 5000);
  }

  // render loop, runs every frame and does local calculations
  if (!renderLoopId) {
    renderLoopId = requestAnimationFrame(renderLoop);
  }
}

function exitPresentMode() {
  inPresentMode = false;
  currentSlideId = "";

  // reset cached states
  cachedTimerStates = null;

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
    //console.log("GFN Timer: extract -> no slideId");
    return false;
  }

  const doc = getPresentDocument();
  if (!doc) {
    //console.log("GFN Timer: extract -> no presentDocument");
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
      timerElmRecord[timerData.id] = textNode;
      foundTimers.push(timerData);
    }
    tokenInd++;
  }

 
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

  const messageContent:TimerMessaging = {
    messageType: TimerMessage.SLIDE_CHANGED,
    slideId: slideId
  };

  port.postMessage(messageContent);

  return extractFromCurrentSlide();
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
    //console.log("GFN Timer: slide changed from", currentSlideId, "to", id);
    if (onSlideChanged()) {
      currentSlideId = id; // only commit if extraction succeeded (iframe may not be ready yet)
      getTimerStates();
    }
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
      const nodeRef = timerElmRecord[timerState.id];
      if (!nodeRef) { continue; }

      nodeRef.textContent = formatTimer(timerState, currentOptions);
    }
  }

  renderLoopId = requestAnimationFrame(renderLoop);
}