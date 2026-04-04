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

let currentSlideId = "";
let inPresentMode = false;
let presentDocument: Document | null = null;

const port = chrome.runtime.connect({ name: PORT_NAME });

// render cycle
port.onMessage.addListener((msg: TimerStates) => {
  renderTimerStates(msg);
})

setInterval(pollTimers, 1000);
// idk if it's better practice to have 1000 be MILLISECONDS_PER_SEC

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
  return getPresentDocument() !== null;
}

function pollTimers() {
  //console.log(`GFN timer poll — url: ${window.location.href} — present mode: ${isInPresentMode()}`);
  
  if (!isInPresentMode()) {
    if (inPresentMode) {
      // reset logic if we just exited present mode
      inPresentMode = false;
      currentSlideId = "";
      // clear stale element references so re-entering present mode rescans
      for (const key of Object.keys(timerElmRecord)) {
        delete timerElmRecord[key];
      }
      
      const messageContent: TimerMessaging = {
        messageType: TimerMessage.RESET_SESSION
      }
      port.postMessage(messageContent)
      
    }

    //console.log("GFN: not in present mode, skipping");
    return;
  }

  if (!inPresentMode) {
    inPresentMode = true;
  }

  //console.log("GFN reached present mode");

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

    nodeRef.textContent = formatTimer(timerState);
  }
}