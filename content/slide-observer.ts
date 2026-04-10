import { formatTimer } from "~format-time";
import type { PlasmoCSConfig } from "plasmo";
import { buildTimerData, parseTimerToken } from "~parse-timers";
import { TimerMessage, type TimerData, type TimerMessaging, type TimerStates } from "~timer-types";

// moved from root again

// TODO: i remember hearing that setinterval can drift, so we can look at that after the text replacement at least works
// would likely need to be most corrected in the background store

// TODO: move from polling per second via setinterval and move to event based mutationobserver approach

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
let timerSyncInterval: number | null = null;
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

// render cycle
port.onMessage.addListener((msg: TimerStates) => {
  renderTimerStates(msg);
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
  inPresentMode = true;
  currentSlideId = "";
  
  // the background timer is to handle cases where google slides' internal rendering structure changes
  // checks for slide changes + timer state sync 

  // TODO: timer state should be mapped to dates rather than interval increments, subject to drift currently
  if (!timerSyncInterval) {
    timerSyncInterval = setInterval(syncTimers, 1000);
  }

}

function exitPresentMode() {
  inPresentMode = false;
  currentSlideId = "";
  
  
  // clear stale element and document references so re-entering present mode rescans
  for (const key of Object.keys(timerElmRecord)) {
    delete timerElmRecord[key];
  }
  presentDocument = null; // this was why we were getting stale reference errors again


  const messageContent: TimerMessaging = {
    messageType: TimerMessage.RESET_SESSION
  };
  port.postMessage(messageContent);

  // clear poll interval since we're not presenting anymore again

  if (timerSyncInterval) {
    clearInterval(timerSyncInterval);
    timerSyncInterval = null;
  }
}

function getCurrentSlideId(): string {
  const fullHash = window.location.href;
  const matches = fullHash.match(SLIDE_ID_REGEX);
  return matches ? matches[1] : "";
}

function extractFromCurrentSlide() {
  const slideId = getCurrentSlideId();
  if (!slideId) { return; } 
  // this really shouldn't ever be fulfilled in present mode, unless the link got clapped

  const doc = getPresentDocument();
  if (!doc) { return; }

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
}


function onSlideChanged() {
  const slideId = getCurrentSlideId();

  const messageContent:TimerMessaging = {
    messageType: TimerMessage.SLIDE_CHANGED,
    slideId: slideId
  };

  port.postMessage(messageContent);

  extractFromCurrentSlide();
  
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

function syncTimers() {
  // run every second while in present mode
  if (!inPresentMode) return;

  const id = getCurrentSlideId();
  if (id !== currentSlideId) {
    currentSlideId = id;
    onSlideChanged();
  }

  getTimerStates();
}

function renderTimerStates(timerStates: TimerStates) {
  for (const timerState of timerStates.timers) {
    const nodeRef = timerElmRecord[timerState.id];
    if (!nodeRef) { continue; }

    nodeRef.textContent = formatTimer(timerState, currentOptions);
  }
}