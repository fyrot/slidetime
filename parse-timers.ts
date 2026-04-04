import type { TimerData, TimerType } from "~timer-types";


// regex matches for <<time>> or <<countdown:mm::ss>>
// we can expand it to be more robust/flexible later
// ex: only check for the beginning "time", "countdown" etc. in the string, conditionally check the rest for flags

const TIMER_REGEX = /^<<(time|countdown)(?::(\d{2}):(\d{2}))?>>$/
// /^<<(time|countdown:(\d{2}):(\d{2}))>>$/; <- old reg-ex, new one is more flexible
// matches[1] = timer type, after that are optional(?) parameters


export interface ParsedTimerToken {
  timerType: TimerType
  duration?: number
}

export function parseTimerToken(tokenTxt: string) {
  const matches = tokenTxt.trim().match(TIMER_REGEX);
  if (!matches) { return null; }

  switch (matches[1]) {
    case "time":
      return parseTokenTime(matches);
    case "countdown":
      return parseTokenCountdown(matches);
    default:
      return null;
  }
}

export function buildTimerData(timerToken: ParsedTimerToken, tokenInd: number, slideId: string):TimerData {
  // note, we only need to store slide id and not its session because that's how they're scoped already
  const timerData: TimerData = {
    id: `${slideId}-${tokenInd}`,
    timerType: timerToken.timerType,
    slideId: slideId,
    duration: timerToken.duration
  }

  return timerData;
}

// helper functions for parseToken
function parseTokenTime(matches: RegExpMatchArray) {
  const timerObj: ParsedTimerToken = {
    timerType: "time"
  }
  
  return timerObj;
}

function parseTokenCountdown(matches: RegExpMatchArray) {
  const minutes = parseInt(matches[2] ?? "0"); // defaults to 00:00 if not provided
  const seconds = parseInt(matches[3] ?? "0");

  const totalSeconds = minutes * 60 + seconds;

  const timerObj: ParsedTimerToken = {
    timerType: "countdown",
    duration: totalSeconds
  };

  return timerObj;
}