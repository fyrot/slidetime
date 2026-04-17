import { TimerFlag } from "~timer-types";
import type { TimerData, TimerType } from "~timer-types";

// Format: <<timerExpr>> or <<timerExpr|flag1&flag2&flag3>>
// timerExpr is one of:
//   keyword  → time | date | shortdate | longdate
//   timeto   → ~H:MM  (first char ~ = "time until next occurrence")
//   stopwatch/countdown → mm:ss+ or mm:ss-  (last char determines direction)
const TIMER_REGEX = /^<<([^|>]+?)(?:\|([^>]*))?>>$/;

export interface ParsedTimerToken {
  timerType: TimerType
  duration?: number
  flags?: TimerFlag[]
}

export function parseTimerToken(tokenTxt: string) {
  const matches = tokenTxt.trim().match(TIMER_REGEX);
  if (!matches) { return null; }

  const timerExpr = matches[1];
  const knownFlagValues = new Set<string>(Object.values(TimerFlag));
  const flags: TimerFlag[] = matches[2]
    ? matches[2].split("&").map(f => f.trim()).filter((f): f is TimerFlag => knownFlagValues.has(f))
    : [];

  // ~HH:MM → timeto (countdown to next occurrence of that time)
  if (timerExpr[0] === "~") {
    return parseTokenTimeTo(timerExpr.slice(1), flags);
  }

  // mm:ss+ or mm:ss- → stopwatch or countdown
  const lastChar = timerExpr[timerExpr.length - 1];
  if (lastChar === "+" || lastChar === "-") {
    const timeStr = timerExpr.slice(0, -1);
    const timeMatch = timeStr.match(/^(\d+):(\d{2})$/);
    if (!timeMatch) { return null; }
    if (lastChar === "+") {
      return parseTokenStopwatch(timeMatch[1], timeMatch[2], flags);
    } else {
      return parseTokenCountdown(timeMatch[1], timeMatch[2], flags);
    }
  }

  if (lastChar === "p") {
    const secondToLastChar = timerExpr[timerExpr.length - 2];
    const timeStr = timerExpr.slice(0, -2);
    const timeMatch = timeStr.match(/^(\d+):(\d{2})$/);
    if (!timeMatch) { return null; }
    if (secondToLastChar === "+") {
      return parseTokenPerpetual(timeMatch[1], timeMatch[2], false, flags);
    }
    if (secondToLastChar === "-") {
      return parseTokenPerpetual(timeMatch[1], timeMatch[2], true, flags);
    }
      
  }

  // keyword timers
  switch (timerExpr) {
    case "time":       return parseTokenTime("time", flags);
    case "shorttime":  return parseTokenTime("shorttime", flags); // alias for time, same formatting options
    case "longtime":   return parseTokenTime("longtime", flags);
    case "date":       return parseTokenDate("date", flags);
    case "shortdate":  return parseTokenDate("shortdate", flags);
    case "longdate":   return parseTokenDate("longdate", flags);
    case "datetime":    return parseTokenDate("datetime", flags);
  }

  return null;
}

export function buildTimerData(timerToken: ParsedTimerToken, tokenInd: number, slideId: string):TimerData {
  // note, we only need to store slide id and not its session because that's how they're scoped already
  const timerData: TimerData = {
    id: `${slideId}-${tokenInd}`,
    timerType: timerToken.timerType,
    slideId: slideId,
    duration: timerToken.duration,
    flags: timerToken.flags
  }

  return timerData;
}

// helper functions for parseToken
function parseTokenTime(type: "time" | "shorttime" | "longtime", flags: TimerFlag[]) {
  const timerObj: ParsedTimerToken = {
    timerType: type,
    flags
  };
  return timerObj;
}

// TODO: allow countdown and stopwatch to include hours as well
function parseTokenCountdown(minutesStr: string, secondsStr: string, flags: TimerFlag[]) {
  const minutes = parseInt(minutesStr ?? "0");
  const seconds = parseInt(secondsStr ?? "0");
  const totalSeconds = minutes * 60 + seconds;

  const timerObj: ParsedTimerToken = {
    timerType: "countdown",
    duration: totalSeconds,
    flags
  };
  return timerObj;
}

function parseTokenStopwatch(minutesStr: string, secondsStr: string, flags: TimerFlag[]) {
  const minutes = parseInt(minutesStr ?? "0");
  const seconds = parseInt(secondsStr ?? "0");
  const totalSeconds = minutes * 60 + seconds;

  const timerObj: ParsedTimerToken = {
    timerType: "stopwatch",
    duration: totalSeconds,
    flags
  };
  return timerObj;
}

function parseTokenDate(type: string = "date", flags: TimerFlag[]) {
  const timerObj: ParsedTimerToken = {
    timerType: type as TimerType,
    flags
  };
  return timerObj;
}

function parseTokenPerpetual(minutesStr: string, secondsStr: string, isCountdown: boolean = false, flags: TimerFlag[]) {
  const minutes = parseInt(minutesStr ?? "0");
  const seconds = parseInt(secondsStr ?? "0");
  const totalSeconds = minutes * 60 + seconds;
  const nowEpoch = Math.floor(Date.now() / 1000);

  if (isCountdown) {
    return { timerType: "perpetualcountdown" as const, duration: nowEpoch + totalSeconds, flags };
  } else {
    return { timerType: "perpetualstopwatch" as const, duration: nowEpoch - totalSeconds, flags };
  }
}

// TODO: allow the countdown to include hours as well, but most tests should be less than an hour
function parseTokenTimeTo(timeStr: string, flags: TimerFlag[]) {
  const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!timeMatch) { return null; }

  let hours = parseInt(timeMatch[1] ?? "0");
  const minutes = parseInt(timeMatch[2] ?? "0");

  const now = new Date();
  let targetTime: Date;

  if (hours >= 1 && hours <= 12) {
    hours = hours % 12;
    const amTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
    const pmTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours + 12, minutes, 0);
    const tmrwAmTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hours, minutes, 0);

    const times = [amTime, pmTime, tmrwAmTime].filter(t => t.getTime() > now.getTime());
    times.sort((a, b) => a.getTime() - b.getTime());
    targetTime = times[0];
  } else {
    targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
    if (targetTime.getTime() < now.getTime()) {
      targetTime.setDate(targetTime.getDate() + 1);
    }
  }

  const timerObj: ParsedTimerToken = {
    timerType: "timeto",
    duration: Math.floor(targetTime.getTime() / 1000), // store as epoch seconds; formatTimeTo computes diff fresh
    flags
  };

  return timerObj;
}