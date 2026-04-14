export enum TimerMessage {
  SLIDE_CHANGED = "SLIDE_CHANGED",
  REGISTER_TIMERS = "REGISTER_TIMERS",
  GET_TIMER_STATES = "GET_TIMER_STATES",
  RESET_SESSION = "RESET_SESSION",
  HEART_BEAT = "HEART_BEAT"
}

export type TimerType = "time" | "shorttime" | "longtime" |"countdown" | "stopwatch" | "date" | "shortdate" | "longdate"


export enum TimerFlag {
  HR24 = "24hr",
}

export interface TimerData {
  id: string
  timerType: TimerType
  slideId: string // google presents the slide id in the url "hash"

  duration?: number
  flags?: TimerFlag[]
}

export interface TimerState extends TimerData {
  enabled: boolean
  startedAt: number | null
  accumulatedMs: number
}

export interface TimerStates {
  timers: TimerState[]
}


// messaging interfaces

export interface SlideChangedMessage {
  messageType: TimerMessage.SLIDE_CHANGED,
  slideId: string // no need for self identification bc we'll be listening to the tab/presentation sending -- implicit param essentially
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

export type TimerMessaging = 
  | SlideChangedMessage 
  | RegisterTimersMessage 
  | GetTimerStatesMessage 
  | ResetSessionMessage 
  | HeartbeatMessage

// union ^ pretty sure that's what that's called



// commands will be pause, resume, etc. so we can manage state
// ignore above, maybe we can just pause and resume on slide change by inference

// planned types for v1 will prob be countdown and clock
