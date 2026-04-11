// making this its own file since we can add options for how time is rendered depending on flags 

import type { TimerState } from "~timer-types";

// note for later: add some type of array or set to timer state where we can store and reference "format flags"

export function formatTimer(timerState: TimerState, options: Record<string, boolean> = {}):string {
  switch (timerState.timerType) {
    case "time":
      return formatTime(options);
    case "countdown":
      return formatCountdown(timerState);
    case "stopwatch":
      return formatStopwatch(timerState);
    case "date":
      return formatDate();
    case "shortdate":
      return formatDate("shortdate");
    case "longdate":
      return formatDate("longdate");
  }
}

export function formatTime(options: Record<string, boolean> = {}):string {
  const is24Hr = options["24hr"] ?? false; // should exist but just in case
  const currentDate = new Date();
  
  return currentDate.toLocaleTimeString([], { hour12: !is24Hr });
}

// we want to be "second"-agnostic if that makes sense
// shifting to milliseconds as a more fluid unit of time so we can select for
// dynamic units of time on user preference (for formats like countdown and stopwatch) if we want to
export function getElapsedMs(timerState: TimerState): number {
  const active = timerState.startedAt ? Date.now() - timerState.startedAt : 0;
  return timerState.accumulatedMs + active;
}

export function formatCountdown(timerState: TimerState):string {
  // this code currently assumes seconds as the primary unit of time still, here for now
  const elapsedSec = Math.floor(getElapsedMs(timerState) / 1000);
  const remainingRaw = (timerState.duration ?? 0) - elapsedSec;
  const remaining = Math.max(remainingRaw, 0);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  return `${minutes}:${padTwoZeros(seconds)}`;
}

export function formatStopwatch(timerState: TimerState):string {
  // same as formatCountdown's comment, default for now is seconds as our leading unit
  const elapsedSec = Math.floor(getElapsedMs(timerState) / 1000);
  // duration acts as the starting point
  const totalRaw = (timerState.duration ?? 0) + elapsedSec;
  const minutes = Math.floor(totalRaw / 60);
  const seconds = totalRaw % 60;
  return `${minutes}:${padTwoZeros(seconds)}`;
}

export function formatDate(type: "date" | "shortdate" | "longdate" = "date"):string {
  const currentDate = new Date();
  if (type === "date") return currentDate.toLocaleDateString(); // 4/4/2026
  else if (type === "shortdate") return currentDate.toLocaleDateString([], { weekday : "short", month: "short", day: "numeric", year: "numeric" }); // Sat, Apr 4, 2026
  else if (type === "longdate") return currentDate.toLocaleDateString([], { weekday : "long", month: "long", day: "numeric", year: "numeric" }); // Saturday, April 4, 2026
  else return currentDate.toLocaleDateString(); // 4/4/2026, but this DEFINITELY shouldn't happen
}

// helper functions below

function padNumStart(withString: string, forWidth: number, on: number):string {
  return on.toString().padStart(forWidth, withString);
}

function padTwoZeros(on: number):string {
  return padNumStart("0", 2, on);
}