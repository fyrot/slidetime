import type { TimerData, TimerType } from "~timer-types";


// regex matches for <<time>> or <<countdown:mm::ss>>
// we can expand it to be more robust/flexible later
// ex: only check for the beginning "time", "countdown" etc. in the string, conditionally check the rest for flags

const TIMER_REGEX = /^<<(?:(time|date|shortdate|longdate)|(timeto)(\d{1,2}):(\d{2})|(\d+):(\d{2})([+-]))>>$/

export interface ParsedTimerToken {
  timerType: TimerType
  duration?: number
}

export function parseTimerToken(tokenTxt: string) {
  const matches = tokenTxt.trim().match(TIMER_REGEX);
  if (!matches) { return null; }

  if (matches[1]) {
    switch (matches[1]) {
      case "time":
        return parseTokenTime();
      case "date":
        return parseTokenDate();
      case "shortdate":
        return parseTokenDate("shortdate");
      case "longdate":
        return parseTokenDate("longdate");
    }
  }
  else if (matches[2] === "timeto") {
    return parseTokenTimeTo(matches[3], matches[4]);
  }
  else if (matches[7]) {
    if (matches[7] === "+") {
      return parseTokenStopwatch(matches[5], matches[6]);
    } 
    else if (matches[7] === "-") {
      return parseTokenCountdown(matches[5], matches[6]);
    }
  }

  return null;
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
function parseTokenTime() {
  const timerObj: ParsedTimerToken = {
    timerType: "time"
  }
  
  return timerObj;
}

function parseTokenCountdown(minutesStr: string, secondsStr: string) {
  const minutes = parseInt(minutesStr ?? "0"); // defaults to 0 if not provided
  const seconds = parseInt(secondsStr ?? "0");

  const totalSeconds = minutes * 60 + seconds;

  const timerObj: ParsedTimerToken = {
    timerType: "countdown",
    duration: totalSeconds
  };

  return timerObj;
}

function parseTokenStopwatch(minutesStr: string, secondsStr: string) {
  const minutes = parseInt(minutesStr ?? "0"); // defaults to 0 if not provided
  const seconds = parseInt(secondsStr ?? "0");

  const totalSeconds = minutes * 60 + seconds;

  const timerObj: ParsedTimerToken = {
    timerType: "stopwatch",
    duration: totalSeconds
  };

  return timerObj;
}

function parseTokenDate(type: string = "date") {
  const timerObj: ParsedTimerToken = {
    timerType: type as TimerType
  }

  return timerObj;
}

 // TODO: allow the countdown to include hours as well, but most tests should be less than an hour
function parseTokenTimeTo(hoursStr: string, minutesStr: string) {
  let hours = parseInt(hoursStr ?? "0");
  const minutes = parseInt(minutesStr ?? "0");

  const now = new Date();
  let targetTime: Date;

  if (hours >= 1 && hours <= 12) {
    hours = hours % 12;
    // check today am/pm, and tomorrow am for next occurence of time, based on 12 hour system so that's probably the best way
    const amTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
    const pmTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours + 12, minutes, 0);
    const tmrwAmTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hours, minutes, 0);

    const times = [amTime, pmTime, tmrwAmTime].filter(t => t.getTime() > now.getTime()); // only if in future
    
    times.sort((a, b) => a.getTime() - b.getTime()); // get soonest one
    
    targetTime = times[0];
  } else {
    // 24 hour fallback
    targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
    // if the target time has already passed today, assume they meant tomorrow
    if (targetTime.getTime() < now.getTime()) {
      targetTime.setDate(targetTime.getDate() + 1);
    }
  }

  const durationSeconds = Math.floor((targetTime.getTime() - now.getTime()) / 1000);

  const timerObj: ParsedTimerToken = {
    timerType: "countdown",
    duration: durationSeconds
  };

  return timerObj;

}