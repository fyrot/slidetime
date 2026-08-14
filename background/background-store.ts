import {
  applyVisibleTimers,
  handleRegisterTimers,
  handleToggleVisiblePause,
  resetTimerStates
} from "~background/timer-engine";
import { TimerMessage, type TimerMessaging, type TimerState, type TimerStates } from "~timer-types"
import { debugLog } from "~utils/debug-options";


// background-store is now a manager / "hot cache" for timer states -- real storage is done in the session storage 
// massive oopsies on my part -- assumed that background workers persisted like they did in manifest v2, manifest v3 is waay different

// outdated // basically a universal source of truth for the other applications that should be accurate

// move this interface to its own file later
interface SlidesSession {
  port: chrome.runtime.Port // we open up a listener with each slides port
  visibleTimerIds: string[],
  timerStateRecord: Record<string, TimerState>
}

interface PersistedSession {
  visibleTimerIds: string[],
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
    visibleTimerIds: session.visibleTimerIds,
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
        visibleTimerIds: persisted?.visibleTimerIds ?? [],
        timerStateRecord: persisted?.timerStateRecord ?? {}
      };
    } catch {
      allSessions[tabId] = { port, visibleTimerIds: [], timerStateRecord: {} };
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
    case TimerMessage.VISIBLE_TIMERS:
      currentSession.visibleTimerIds = msg.timerIds;
      applyVisibleTimers(
        currentSession.timerStateRecord,
        new Set(currentSession.visibleTimerIds),
        Date.now()
      );
      persistSession(tabId, currentSession);
      // push fresh state immediately: a snapshot cached before a timer started
      // would otherwise freeze its display until the next 5s sync
      handleGetTimerStates(currentSession);
      debugLog("Visible timers changed");
      break;
    case TimerMessage.REGISTER_TIMERS:
      debugLog("-- (Registering) --");
      handleRegisterTimers(
        currentSession.timerStateRecord,
        msg.timers,
        new Set(currentSession.visibleTimerIds),
        Date.now()
      );
      debugLog("-- (Registered) -- ");
      persistSession(tabId, currentSession);
      handleGetTimerStates(currentSession);
      break;
    case TimerMessage.GET_TIMER_STATES:
      handleGetTimerStates(currentSession);
      break;
    case TimerMessage.RESET_SESSION:
      resetTimerStates(currentSession.timerStateRecord);
      currentSession.visibleTimerIds = [];
      chrome.storage.session.remove(sessionKey(tabId));
      break;
    case TimerMessage.TOGGLE_SLIDE_PAUSE:
      // prefer the keypress-time sample over our copy, which lags by one poll
      if (handleToggleVisiblePause(
        currentSession.timerStateRecord,
        new Set(msg.timerIds ?? currentSession.visibleTimerIds),
        Date.now()
      )) {
        persistSession(tabId, currentSession);
        // Push fresh state so render reflects the toggle without waiting on the 5s sync heartbeat.
        handleGetTimerStates(currentSession);
      }
      break;
  }
}


function handleGetTimerStates(session: SlidesSession) {
  const retrieved: TimerStates = {
    timers: Object.values(session.timerStateRecord)
  };
  session.port.postMessage(retrieved);
}
