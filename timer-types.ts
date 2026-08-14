export enum TimerMessage {
  VISIBLE_TIMERS = "VISIBLE_TIMERS",
  REGISTER_TIMERS = "REGISTER_TIMERS",
  GET_TIMER_STATES = "GET_TIMER_STATES",
  RESET_SESSION = "RESET_SESSION",
  HEART_BEAT = "HEART_BEAT",
  TOGGLE_SLIDE_PAUSE = "TOGGLE_SLIDE_PAUSE"
}

export type TimerType = "time" | "shorttime" | "longtime" | "countdown" | "stopwatch" | "timeto" | "perpetualcountdown" | "perpetualstopwatch" | "date" | "shortdate" | "longdate" | "datetime"

// formerly timerflag, renamed to be more specific as flags plan to have values associated with them
export enum TimerFlagType {
  HR24 = "24hr",
  RESET_ON_SLIDE = "reset",
  ID = "id",
}

export type AppliedFlag =
  | { type: TimerFlagType.HR24 }
  | { type: TimerFlagType.RESET_ON_SLIDE }
  | { type: TimerFlagType.ID; value: string }

export interface TimerData {
  id: string
  timerType: TimerType
  // Kept as registration/debugging metadata and an id-minting namespace only;
  // slide ids no longer drive timer activation.
  slideIds: string[]

  duration?: number
  flags?: AppliedFlag[]
}

export interface TimerState extends TimerData {
  enabled: boolean
  paused: boolean
  startedAt: number | null
  accumulatedMs: number
  // Lets brief visibility gaps during slide transitions stay seamless.
  pendingHandoff?: { atMs: number, accumulatedMs: number } | null
}

export interface TimerStates {
  timers: TimerState[]
}


// messaging interfaces

export interface VisibleTimersMessage {
  messageType: TimerMessage.VISIBLE_TIMERS,
  timerIds: string[]
}

export interface RegisterTimersMessage {
  messageType: TimerMessage.REGISTER_TIMERS,
  timers: TimerData[]
}

export interface GetTimerStatesMessage {
  messageType: TimerMessage.GET_TIMER_STATES
}

export interface ResetSessionMessage {
  messageType: TimerMessage.RESET_SESSION
}

// unnecessary definition for now in case we wanna use later, state syncs act as de facto heartbeat currently
export interface HeartbeatMessage {
  messageType: TimerMessage.HEART_BEAT
}

export interface ToggleSlidePauseMessage {
  messageType: TimerMessage.TOGGLE_SLIDE_PAUSE
}

export type TimerMessaging =
  | VisibleTimersMessage
  | RegisterTimersMessage
  | GetTimerStatesMessage
  | ResetSessionMessage
  | HeartbeatMessage
  | ToggleSlidePauseMessage

// union ^ pretty sure that's what that's called



// commands will be pause, resume, etc. so we can manage state
// ignore above, maybe we can just pause and resume on slide change by inference

// planned types for v1 will prob be countdown and clock
