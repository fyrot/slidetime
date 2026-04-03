export enum TimerMessage {
  SLIDE_CHANGED = "SLIDE_CHANGED",
  REGISTER_TIMERS = "REGISTER_TIMERS",
  GET_TIMER_STATES = "GET_TIMER_STATES"
}

export type TimerType = "time" | "countdown"

export interface TimerData {
  id: string
  timerType: TimerType
  slideInd: number

  duration?: number
}

export interface TimerState extends TimerData {
  enabled: boolean
  elapsed: number
}

export interface TimerStates {
  timers: TimerState[]
}


// messaging interfaces

export interface SlideChangedMessage {
  messageType: TimerMessage.SLIDE_CHANGED,
  slideInd: number // no need for self identification bc we'll be listening to the tab/presentation sending -- implicit param essentially
}

export interface RegisterTimersMessage {
  messageType: TimerMessage.REGISTER_TIMERS,
  timers: TimerData[]
}

export interface GetTimerStatesMessage {
  messageType: TimerMessage.GET_TIMER_STATES
}

export type TimerMessaging = SlideChangedMessage | RegisterTimersMessage | GetTimerStatesMessage





// commands will be pause, resume, etc. so we can manage state
// ignore above, maybe we can just pause and resume on slide change by inference

// planned types for v1 will prob be countdown and clock
