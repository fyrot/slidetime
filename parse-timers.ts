import type { TimerData, TimerType } from "~timer-types";


// regex matches for <<time>> or <<countdown:mm::ss>>
// we can expand it to be more robust/flexible later
// ex: only check for the beginning "time", "countdown" etc. in the string, conditionally check the rest for flags

const TIMER_REGEX = /^<<(?:(time|date|shortdate|longdate)|(\d+):(\d{2})([+-]))>>$/

export interface ParsedTimerToken {
  timerType: TimerType
  duration?: number
}

export function parseTimerToken(tokenTxt: string) {
  const matches = tokenTxt.trim().match(TIMER_REGEX);
  if (!matches) { return null; }

  // i asked copilot if there were any errors in what i added and it wanted me to split it into the two seperate if statements isntead of just checking
  // one by one like if (matches[4] === "+") and if (matches[1] === "time") etc. im not too sure why but it works
  if (matches[1]) {
    switch (matches[1]) {
      case "time":
        return parseTokenTime();
      case "date":
        return parseTokenDate(matches);
      case "shortdate":
        return parseTokenDate(matches, "shortdate");
      case "longdate":
        return parseTokenDate(matches, "longdate");
    }
  }
  else if (matches[4]) {
    if (matches[4] === "+") {
      return parseTokenStopwatch(matches);
    } 
    else if (matches[4] === "-") {
      return parseTokenCountdown(matches);
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

function parseTokenCountdown(matches: RegExpMatchArray) {
  const minutes = parseInt(matches[2] ?? "0"); // defaults to 0 if not provided
  const seconds = parseInt(matches[3] ?? "0");

  const totalSeconds = minutes * 60 + seconds;

  const timerObj: ParsedTimerToken = {
    timerType: "countdown",
    duration: totalSeconds
  };

  return timerObj;
}

function parseTokenStopwatch(matches: RegExpMatchArray) {
  const minutes = parseInt(matches[2] ?? "0"); // defaults to 0 if not provided
  const seconds = parseInt(matches[3] ?? "0");

  const totalSeconds = minutes * 60 + seconds;

  const timerObj: ParsedTimerToken = {
    timerType: "stopwatch",
    duration: totalSeconds
  };

  return timerObj;
}

function parseTokenDate(matches: RegExpMatchArray, type: string = "date") {
  const timerObj: ParsedTimerToken = {
    timerType: type as TimerType
  }

  return timerObj;
}