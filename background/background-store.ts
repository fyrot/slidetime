import { TimerMessage, type TimerData, type TimerMessaging, type TimerState, type TimerStates } from "~timer-types"

// moved from root

// basically a universal source of truth for the other applications that should be accurate

// move this interface to its own file
interface SlidesSession {
  port: chrome.runtime.Port // we open up a listener with each slides port
  activeSlideId: string,
  timerStateRecord: Record<string, TimerState>
}

const MILLISECONDS_PER_SEC = 1000;

const allSessions: Record<string, SlidesSession> = {};


chrome.runtime.onConnect.addListener((port) => {
    registerPort(port);
})

setInterval(() => {
  updateTimerPos();
}, MILLISECONDS_PER_SEC);

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
  for (const timer of timers) {
    if (!session.timerStateRecord[timer.id]) {
      session.timerStateRecord[timer.id] = {
        ...timer,
        enabled: false,
        elapsed: 0
      };
    }
  }
  verifyActiveTimers(session);
}

function verifyActiveTimers(session: SlidesSession) {
  // kind of unnecessary helper, just putting it here in case we want to do some other 
  // logic checks that iterate through all of our active timers

  for (const timer of Object.values(session.timerStateRecord)) {
    timer.enabled = (timer.slideId === session.activeSlideId);
  }
}

function handleSlideChanged(session: SlidesSession, newSlideId: string) {
  session.activeSlideId = newSlideId;
  verifyActiveTimers(session);
  
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

function updateTimerPos() {
  for (const session of Object.values(allSessions)) {
    for (const timer of Object.values(session.timerStateRecord)) {
      
      if (timer.enabled) {
        
        if (timer.timerType === "countdown" && timer.elapsed < (timer.duration ?? 0)) {
          // prob better to handle elapsed vs duration relationship here than in render
          timer.elapsed++;
        } 
        else if (timer.timerType === "stopwatch") {
          timer.elapsed++;
        }

      }
    }
  }
}