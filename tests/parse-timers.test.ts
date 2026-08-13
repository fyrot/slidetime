import { afterEach, describe, expect, it, vi } from "vitest";

import { buildTimerData, parseTimerToken } from "~parse-timers";
import { TimerFlagType } from "~timer-types";

describe("parseTimerToken", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("parses countdowns, stopwatches, and ids", () => {
    expect(parseTimerToken("<<5:00->>")).toMatchObject({
      timerType: "countdown",
      duration: 300
    });
    expect(parseTimerToken("<<0:20-|id=test>>")).toEqual({
      timerType: "countdown",
      duration: 20,
      flags: [{ type: TimerFlagType.ID, value: "test" }]
    });
    expect(parseTimerToken("<<0:00+>>")).toMatchObject({
      timerType: "stopwatch",
      duration: 0
    });
  });

  it("stores the next 5:00 PM occurrence as epoch seconds", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15, 12, 0, 0));

    expect(parseTimerToken("<<~17:00>>")).toMatchObject({
      timerType: "timeto",
      duration: Math.floor(new Date(2026, 0, 15, 17, 0, 0).getTime() / 1000)
    });
  });

  it("parses ampersand-separated flag combinations", () => {
    expect(parseTimerToken("<<5:00-|id=a&24hr>>")?.flags).toEqual([
      { type: TimerFlagType.ID, value: "a" },
      { type: TimerFlagType.HR24 }
    ]);
    expect(parseTimerToken("<<5:00-|reset>>")?.flags).toEqual([
      { type: TimerFlagType.RESET_ON_SLIDE }
    ]);
  });

  it("derives shared ids from id flags and local ids from slide position", () => {
    const shared = parseTimerToken("<<5:00-|id=alex>>");
    const local = parseTimerToken("<<5:00->>");
    expect(shared).not.toBeNull();
    expect(local).not.toBeNull();

    expect(buildTimerData(shared!, 4, "slide-A").id).toBe("countdown-alex");
    expect(buildTimerData(local!, 4, "slide-A").id).toBe("slide-A-4");
  });

  it.each([
    "<<5:00>>",
    "<<5:0->>",
    "before <<5:00->>",
    "<<5:00->> after"
  ])("rejects invalid or unanchored input %s", (input) => {
    expect(parseTimerToken(input)).toBeNull();
  });
});
