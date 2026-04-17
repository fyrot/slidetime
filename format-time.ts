// making this its own file since we can add options for how time is rendered depending on flags 

import type { TimerState } from "~timer-types";

// note for later: add some type of array or set to timer state where we can store and reference "format flags"

export function formatTimer(timerState: TimerState, options: Record<string, boolean> = {}):string {
  // merge per-timer flags on top of global options (per-timer flags take precedence)
  const mergedOptions: Record<string, boolean> = { ...options };
  for (const flag of timerState.flags ?? []) {
    mergedOptions[flag] = true;
  }

  switch (timerState.timerType) {
    case "time":
      return formatTime("time", mergedOptions);
    case "shorttime":
      return formatTime("shorttime", mergedOptions);
    case "longtime":
      return formatTime("longtime", mergedOptions);
    case "countdown":
      return formatCountdown(timerState, mergedOptions);
    case "stopwatch":
      return formatStopwatch(timerState, mergedOptions);
    case "timeto":
      return formatTimeTo(timerState, mergedOptions);
    case "perpetualcountdown":
      return formatPerpetualCountdown(timerState, mergedOptions);
    case "perpetualstopwatch":
      return formatPerpetualStopwatch(timerState, mergedOptions);
    case "date":
      return formatDate("date", mergedOptions);
    case "shortdate":
      return formatDate("shortdate", mergedOptions);
    case "longdate":
      return formatDate("longdate", mergedOptions);
    case "datetime":
      return formatTime("datetime", mergedOptions);
  }
}

export function formatTime(type: "time" | "shorttime" | "longtime" | "datetime" = "time", options: Record<string, boolean> = {}):string {
  const is24Hr = options["24hr"] ?? false;
  const currentDate = new Date();
  if (type === "shorttime") {
    return currentDate.toLocaleTimeString([], { hour12: !is24Hr, hour: "numeric", minute: "2-digit" }); // 1:05 pm or 13:05
  } else if (type === "datetime") {
    return currentDate.toLocaleString([], { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: !is24Hr }); // Saturday, April 4, 2026, 1:05:09 PM or Saturday, April 4, 2026, 13:05:09
  } else if (type === "longtime") {
    return currentDate.toLocaleTimeString([], { hour12: !is24Hr, hour: "numeric", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 }); // 1:05:09.123 PM or 13:05:09.123
  } else {
    return currentDate.toLocaleTimeString([], { hour12: !is24Hr, hour: "numeric", minute: "2-digit", second: "2-digit" }); // 1:05:09 PM or 13:05:09
  }
}

// we want to be "second"-agnostic if that makes sense
// shifting to milliseconds as a more fluid unit of time so we can select for
// dynamic units of time on user preference (for formats like countdown and stopwatch) if we want to
export function formatTimeTo(timerState: TimerState, options: Record<string, boolean> = {}):string {
  // duration stores absolute epoch seconds for timeto — compute diff fresh every frame
  // Math.ceil so the last second is shown until the exact target moment (not swallowed early)
  const remaining = Math.max(Math.ceil((timerState.duration ?? 0) - Date.now() / 1000), 0);
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  if (hours > 0) return `${hours}:${padTwoZeros(minutes)}:${padTwoZeros(seconds)}`;
  return `${minutes}:${padTwoZeros(seconds)}`;
}

export function formatPerpetualCountdown(timerState: TimerState, options: Record<string, boolean> = {}): string {
  // immune to slide navigation
  const remaining = Math.max(Math.ceil((timerState.duration ?? 0) - Date.now() / 1000), 0);
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  if (hours > 0) return `${hours}:${padTwoZeros(minutes)}:${padTwoZeros(seconds)}`;
  return `${minutes}:${padTwoZeros(seconds)}`;
}

export function formatPerpetualStopwatch(timerState: TimerState, options: Record<string, boolean> = {}): string {
  // immune to slide navigation
  const elapsed = Math.max(Math.floor(Date.now() / 1000 - (timerState.duration ?? 0)), 0);
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  if (hours > 0) return `${hours}:${padTwoZeros(minutes)}:${padTwoZeros(seconds)}`;
  return `${minutes}:${padTwoZeros(seconds)}`;
}

export function getElapsedMs(timerState: TimerState): number {
  const active = timerState.startedAt ? Date.now() - timerState.startedAt : 0;
  return timerState.accumulatedMs + active;
}

export function formatCountdown(timerState: TimerState, options: Record<string, boolean> = {}):string {
  // this code currently assumes seconds as the primary unit of time still, here for now
  const elapsedSec = Math.floor(getElapsedMs(timerState) / 1000);
  const remainingRaw = (timerState.duration ?? 0) - elapsedSec;
  const remaining = Math.max(remainingRaw, 0);
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  if (hours > 0) return `${hours}:${padTwoZeros(minutes)}:${padTwoZeros(seconds)}`;
  return `${minutes}:${padTwoZeros(seconds)}`;
}

export function formatStopwatch(timerState: TimerState, options: Record<string, boolean> = {}):string {
  // same as formatCountdown's comment, default for now is seconds as our leading unit
  const elapsedSec = Math.floor(getElapsedMs(timerState) / 1000);
  // duration acts as the starting point
  const totalRaw = (timerState.duration ?? 0) + elapsedSec;
  const hours = Math.floor(totalRaw / 3600);
  const minutes = Math.floor((totalRaw % 3600) / 60);
  const seconds = totalRaw % 60;
  if (hours > 0) return `${hours}:${padTwoZeros(minutes)}:${padTwoZeros(seconds)}`;
  return `${minutes}:${padTwoZeros(seconds)}`;
}

export function formatDate(type: "date" | "shortdate" | "longdate" = "date", options: Record<string, boolean> = {}):string {
  const currentDate = new Date();
  if (type === "shortdate") {
    return currentDate.toLocaleDateString([], { weekday : "short", month: "short", day: "numeric", year: "numeric" }); // Sat, Apr 4, 2026
  } else if (type === "longdate") {
    return currentDate.toLocaleDateString([], { weekday : "long", month: "long", day: "numeric", year: "numeric" }); // Saturday, April 4, 2026
  } else {
    return currentDate.toLocaleDateString(); // 4/4/2026
  }
}

// helper functions below

function padNumStart(withString: string, forWidth: number, on: number):string {
  return on.toString().padStart(forWidth, withString);
}

function padTwoZeros(on: number):string {
  return padNumStart("0", 2, on);
}