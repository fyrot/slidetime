import { describe, expect, it } from "vitest";

import {
  handleRegisterTimers,
  handleSlideChanged,
  handleToggleSlidePause
} from "~background/timer-engine";
import { TimerFlagType, type AppliedFlag, type TimerData, type TimerState } from "~timer-types";

function countdown(id: string, slideId: string, flags?: AppliedFlag[]): TimerData {
  return { id, timerType: "countdown", duration: 300, slideIds: [slideId], flags };
}

describe("timer engine", () => {
  it("shares one elapsed-time budget across every slide carrying an id", () => {
    const timers: Record<string, TimerState> = {};
    handleRegisterTimers(timers, [countdown("countdown-alex", "A1")], "", 0);
    handleSlideChanged(timers, "A1", 0);

    handleSlideChanged(timers, "A2", 20_000);
    expect(timers["countdown-alex"].accumulatedMs).toBe(20_000);
    handleRegisterTimers(timers, [countdown("countdown-alex", "A2")], "A2", 20_000);

    handleSlideChanged(timers, "B1", 50_000);
    handleRegisterTimers(timers, [countdown("countdown-bob", "B1")], "B1", 50_000);
    expect(300 - timers["countdown-alex"].accumulatedMs / 1000).toBe(250);
    expect(timers["countdown-alex"].startedAt).toBeNull();

    handleSlideChanged(timers, "A2", 60_000);
    expect(timers["countdown-bob"].accumulatedMs).toBe(10_000);
    expect(timers["countdown-alex"].accumulatedMs).toBe(50_000);
    expect(timers["countdown-alex"].startedAt).toBe(60_000);
  });

  it("does not reset state when the same id is registered again", () => {
    const timers: Record<string, TimerState> = {};
    handleRegisterTimers(timers, [countdown("countdown-alex", "A1")], "A1", 0);
    handleSlideChanged(timers, "B1", 12_000);
    handleRegisterTimers(timers, [countdown("countdown-alex", "A2")], "B1", 12_000);

    expect(Object.keys(timers)).toEqual(["countdown-alex"]);
    expect(timers["countdown-alex"].accumulatedMs).toBe(12_000);
    expect(timers["countdown-alex"].slideIds).toEqual(["A1", "A2"]);
  });

  it("collapses two placeholders with the same id into one state entry", () => {
    const timers: Record<string, TimerState> = {};
    handleRegisterTimers(timers, [
      countdown("countdown-alex", "A1"),
      countdown("countdown-alex", "A1")
    ], "A1", 0);

    expect(Object.keys(timers)).toEqual(["countdown-alex"]);
    expect(timers["countdown-alex"].slideIds).toEqual(["A1"]);
  });

  it("keeps exact accounting across zero-duration A to B to A changes", () => {
    const timers: Record<string, TimerState> = {};
    handleRegisterTimers(timers, [countdown("countdown-alex", "A")], "A", 100);
    handleSlideChanged(timers, "B", 100);
    handleSlideChanged(timers, "A", 100);

    expect(timers["countdown-alex"].accumulatedMs).toBe(0);
    expect(timers["countdown-alex"].startedAt).toBe(100);
  });

  it("zeroes accumulated time when a reset timer leaves its slide", () => {
    const timers: Record<string, TimerState> = {};
    handleRegisterTimers(timers, [countdown("countdown-reset", "A", [
      { type: TimerFlagType.RESET_ON_SLIDE }
    ])], "A", 0);
    handleSlideChanged(timers, "B", 8_000);

    expect(timers["countdown-reset"].accumulatedMs).toBe(0);
    expect(timers["countdown-reset"].startedAt).toBeNull();
    expect(timers["countdown-reset"].enabled).toBe(false);
  });

  it("banks elapsed time and stops ticking when toggled paused", () => {
    const timers: Record<string, TimerState> = {};
    handleRegisterTimers(timers, [countdown("countdown-alex", "A")], "A", 1_000);

    expect(handleToggleSlidePause(timers, "A", 6_000)).toBe(true);
    expect(timers["countdown-alex"].paused).toBe(true);
    expect(timers["countdown-alex"].accumulatedMs).toBe(5_000);
    expect(timers["countdown-alex"].startedAt).toBeNull();
  });
});
