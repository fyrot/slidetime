// making this its own file since we can add options for how time is rendered depending on flags 

import type { TimerState } from "~timer-types";

// note for later: add some type of array or set to timer state where we can store and reference "format flags"

export function formatTimer(timerState: TimerState):string {
  switch (timerState.timerType) {
    case "time":
      return formatTime();
    case "countdown":
      return formatCountdown(timerState);
  }
}

export function formatTime():string {
  // default implementation for testing
  const currentDate = new Date();
  const hh =  `${padTwoZeros(currentDate.getHours())}`;
  const mm =  `${padTwoZeros(currentDate.getMinutes())}`;
  const ss =  `${padTwoZeros(currentDate.getSeconds())}`;
  const formatString =  `${hh}:${mm}:${ss}`;
  return formatString;
}

export function formatCountdown(timerState: TimerState):string {
  // default impl. for testing
  const remainingRaw = (timerState.duration ?? 0) - timerState.elapsed;
  const remaining = Math.max(remainingRaw, 0);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const mm = padTwoZeros(minutes);
  const ss = padTwoZeros(seconds);
  const formatString =  `${mm}:${ss}`  
  return formatString;
}

// helper functions below

function padNumStart(withString: string, forWidth: number, on: number):string {
  return on.toString().padStart(forWidth, withString);
}

function padTwoZeros(on: number):string {
  return padNumStart("0", 2, on);
}