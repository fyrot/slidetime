import { TimerMessage, type TimerData, type TimerMessaging, type TimerState, type TimerStates } from "~timer-types"
import { debugLog } from "~utils/debug-options";

// basically a universal source of truth for the other applications that should be accurate
// NEW: now does not update elapsed time, rather acts as a db for the content scripts

// move this interface to its own file
interface SlidesSession {
  port: chrome.runtime.Port // we open up a listener with each slides port
  activeSlideId: string,
  timerStateRecord: Record<string, TimerState>
}

const allSessions: Record<string, SlidesSession> = {};

chrome.runtime.onConnect.addListener((port) => {
    registerPort(port);
});

// logic

function registerPort(port: chrome.runtime.Port) {
  const tabId = port.sender?.tab?.id;
  if (tabId == null) { return; }

  if (allSessions[tabId]) {
    allSessions[tabId].port = port;
  } else {
    allSessions[tabId] = {
      port,
      activeSlideId: "",
      timerStateRecord: {}
    };
  }

  port.onMessage.addListener((msg: TimerMessaging) => {
    handleMessage(tabId, msg);
  });

  port.onDisconnect.addListener(() => {
    delete allSessions[tabId];
  });
}

function handleMessage(tabId: number, msg: TimerMessaging) {
  const currentSession = allSessions[tabId];
  if (currentSession == null) { return; }
  // yet another non-null assertion

  switch (msg.messageType) {
    case TimerMessage.SLIDE_CHANGED:
      handleSlideChanged(currentSession, msg.slideId);
      break;
    case TimerMessage.REGISTER_TIMERS:
      handleRegisterTimers(currentSession, msg.timers);
      break;
    case TimerMessage.GET_TIMER_STATES:
      handleGetTimerStates(currentSession);
      break;
    case TimerMessage.RESET_SESSION:
      handleResetSession(currentSession);
      break;
  }
}


function handleRegisterTimers(session: SlidesSession, timers: TimerData[]) {
  debugLog("-- (Registering) --");
  for (const timer of timers) {
    if (!session.timerStateRecord[timer.id]) {
      session.timerStateRecord[timer.id] = {
        ...timer,
        enabled: false,
        startedAt: null,
        accumulatedMs: 0
      };
      debugLog("Registered new timer");
    }
  }
  debugLog("-- (Registered) -- ");
  verifyActiveTimers(session);
}

function verifyActiveTimers(session: SlidesSession) {
  for (const timer of Object.values(session.timerStateRecord)) {
    
    const shouldBeEnabled = (timer.slideId === session.activeSlideId);
    // detecting incongruity between shouldbeenabled and what is stored for determine logic
    if (shouldBeEnabled && !timer.enabled) {
      // resuming -> start the clock (again?)
      timer.startedAt = Date.now();
    } else if (!shouldBeEnabled && timer.enabled) {
      // pausing -> bank the elapsed time, reset startedAt
      if (timer.startedAt) {
        timer.accumulatedMs += Date.now() - timer.startedAt;
        timer.startedAt = null;
      }
    }

    timer.enabled = shouldBeEnabled;
  }
}

function handleSlideChanged(session: SlidesSession, newSlideId: string) {
  session.activeSlideId = newSlideId;
  verifyActiveTimers(session);
  debugLog("Slide changed");
}

function handleGetTimerStates(session: SlidesSession) {
  const retrieved: TimerStates = {
    timers: Object.values(session.timerStateRecord)
  };
  session.port.postMessage(retrieved);
}

function handleResetSession(session: SlidesSession) {
  session.timerStateRecord = {};
  session.activeSlideId = "";
}

