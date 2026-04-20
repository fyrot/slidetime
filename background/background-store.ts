import { TimerMessage, TimerFlagType, type TimerData, type TimerMessaging, type TimerState, type TimerStates } from "~timer-types"
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
    case TimerMessage.TOGGLE_SLIDE_PAUSE:
      handleToggleSlidePause(currentSession);
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
        paused: false,
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

    const isActiveSlide = (timer.slideId === session.activeSlideId);
    const shouldBeRunning = isActiveSlide && !timer.paused;
    const wasRunning = timer.startedAt != null;

    // the running to not-running transition owns the bank/unbank of timer start data
    if (shouldBeRunning && !wasRunning) {
      timer.startedAt = Date.now();
    } else if (!shouldBeRunning && wasRunning) {
      timer.accumulatedMs += Date.now() - (timer.startedAt as number);
      timer.startedAt = null;
    }

    // reset-on-slide only applies when leaving the slide, not when pausing on it
    // NOTE: this is currently undocumented in the reference
    if (!isActiveSlide && timer.enabled && timer.flags?.some(f => f.type === TimerFlagType.RESET_ON_SLIDE)) {
      timer.accumulatedMs = 0;
    }

    timer.enabled = isActiveSlide;
  }
}

function handleToggleSlidePause(session: SlidesSession) {
  const targets = Object.values(session.timerStateRecord).filter(
    (t) =>
      t.slideId === session.activeSlideId &&
      (t.timerType === "countdown" || t.timerType === "stopwatch")
  );
  if (targets.length === 0) { return; }

  // if any targeted timer is currently running, pause all; else resume all
  const anyRunning = targets.some((t) => !t.paused);
  const nextPaused = anyRunning;

  for (const timer of targets) {
    timer.paused = nextPaused;
  }

  verifyActiveTimers(session);

  // push fresh state so render reflects the toggle without waiting on the 5s sync heartbeat interval we already have set up
  handleGetTimerStates(session);
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

