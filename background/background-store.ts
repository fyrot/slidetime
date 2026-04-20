import { TimerMessage, TimerFlagType, type TimerData, type TimerMessaging, type TimerState, type TimerStates } from "~timer-types"
import { debugLog } from "~utils/debug-options";


// background-store is now a manager / "hot cache" for timer states -- real storage is done in the session storage 
// massive oopsies on my part -- assumed that background workers persisted like they did in manifest v2, manifest v3 is waay different

// outdated // basically a universal source of truth for the other applications that should be accurate

// move this interface to its own file later
interface SlidesSession {
  port: chrome.runtime.Port // we open up a listener with each slides port
  activeSlideId: string,
  timerStateRecord: Record<string, TimerState>
}

interface PersistedSession {
  activeSlideId: string,
  timerStateRecord: Record<string, TimerState>
}

const allSessions: Record<string, SlidesSession> = {};
const pendingMessages: Record<string, TimerMessaging[]> = {};

chrome.runtime.onConnect.addListener((port) => {
    registerPort(port);
});

// logic

function sessionKey(tabId: number): string {
  // create a more distinct key from a tab id
  return `timerSession-${tabId}`;
}

async function persistSession(tabId: number, session: SlidesSession) {
  const persistedData: PersistedSession = {
    activeSlideId: session.activeSlideId,
    timerStateRecord: session.timerStateRecord
  };

  await chrome.storage.session.set({ [sessionKey(tabId)]: persistedData });
}

async function registerPort(port: chrome.runtime.Port) {
  const tabId = port.sender?.tab?.id;
  if (tabId == null) { return; }

  // register listeners immediately so no messages are missed during the async storage read
  port.onMessage.addListener((msg: TimerMessaging) => {
    if (allSessions[tabId]) {
      handleMessage(tabId, msg);
    } else {
      pendingMessages[tabId] ??= [];
      pendingMessages[tabId].push(msg);
    }
  });

  port.onDisconnect.addListener(() => {
    delete allSessions[tabId];
    delete pendingMessages[tabId];
  });

  if (allSessions[tabId]) {
    allSessions[tabId].port = port;
  } else {
    try {
      const stored = await chrome.storage.session.get(sessionKey(tabId));
      const persisted: PersistedSession | undefined = stored[sessionKey(tabId)];
      allSessions[tabId] = {
        port,
        activeSlideId: persisted?.activeSlideId ?? "",
        timerStateRecord: persisted?.timerStateRecord ?? {}
      };
    } catch {
      allSessions[tabId] = { port, activeSlideId: "", timerStateRecord: {} };
    }

    for (const msg of pendingMessages[tabId] ?? []) {
      handleMessage(tabId, msg);
    }
    delete pendingMessages[tabId];
  }
}

function handleMessage(tabId: number, msg: TimerMessaging) {
  const currentSession = allSessions[tabId];
  if (currentSession == null) { return; }
  // yet another non-null assertion

  switch (msg.messageType) {
    case TimerMessage.SLIDE_CHANGED:
      handleSlideChanged(currentSession, tabId, msg.slideId);
      break;
    case TimerMessage.REGISTER_TIMERS:
      handleRegisterTimers(currentSession, tabId, msg.timers);
      break;
    case TimerMessage.GET_TIMER_STATES:
      handleGetTimerStates(currentSession);
      break;
    case TimerMessage.RESET_SESSION:
      handleResetSession(currentSession, tabId);
      break;
    case TimerMessage.TOGGLE_SLIDE_PAUSE:
      handleToggleSlidePause(currentSession, tabId);
      break;
  }
}


function handleRegisterTimers(session: SlidesSession, tabId: number, timers: TimerData[]) {
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
    } else {
      // if already present, across all stored records include this new slide id as a "home"
      for (const slideId of timer.slideIds) {
        if (!session.timerStateRecord[timer.id].slideIds.includes(slideId)) {
          session.timerStateRecord[timer.id].slideIds.push(slideId);
        }
      }
    }
  }
  debugLog("-- (Registered) -- ");
  verifyActiveTimers(session, tabId);
}

function verifyActiveTimers(session: SlidesSession, tabId: number) {
  for (const timer of Object.values(session.timerStateRecord)) {

    const isActiveSlide = timer.slideIds.includes(session.activeSlideId);
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

  persistSession(tabId, session);
}

function handleToggleSlidePause(session: SlidesSession, tabId: number) {
  const targets = Object.values(session.timerStateRecord).filter(
    (t) =>
      t.slideIds.includes(session.activeSlideId) &&
      (t.timerType === "countdown" || t.timerType === "stopwatch")
  );
  if (targets.length === 0) { return; }

  // if any targeted timer is currently running, pause all; else resume all
  const anyRunning = targets.some((t) => !t.paused);
  const nextPaused = anyRunning;

  for (const timer of targets) {
    timer.paused = nextPaused;
  }

  verifyActiveTimers(session, tabId);

  // push fresh state so render reflects the toggle without waiting on the 5s sync heartbeat interval we already have set up
  handleGetTimerStates(session);
}

function handleSlideChanged(session: SlidesSession, tabId: number, newSlideId: string) {
  session.activeSlideId = newSlideId;
  verifyActiveTimers(session, tabId);
  debugLog("Slide changed");
}

function handleGetTimerStates(session: SlidesSession) {
  const retrieved: TimerStates = {
    timers: Object.values(session.timerStateRecord)
  };
  session.port.postMessage(retrieved);
}

function handleResetSession(session: SlidesSession, tabId: number) {
  session.timerStateRecord = {};
  session.activeSlideId = "";
  chrome.storage.session.remove(sessionKey(tabId));
}

