import { describe, expect, it } from "vitest";

import {
  HANDOFF_GRACE_MS,
  applyVisibleTimers,
  handleRegisterTimers,
  handleToggleVisiblePause
} from "~background/timer-engine";
import { TimerFlagType, type AppliedFlag, type TimerData, type TimerState } from "~timer-types";

function countdown(id: string, slideId: string, flags?: AppliedFlag[]): TimerData {
  return { id, timerType: "countdown", duration: 300, slideIds: [slideId], flags };
}

function visible(...timerIds: string[]): ReadonlySet<string> {
  return new Set(timerIds);
}

describe("timer engine", () => {
  it("shares one elapsed-time budget across changing visible sets", () => {
    const timers: Record<string, TimerState> = {};
    handleRegisterTimers(timers, [countdown("alex", "A1")], visible("alex"), 0);

    applyVisibleTimers(timers, visible(), 20_000);
    expect(timers.alex.accumulatedMs).toBe(20_000);
    expect(timers.alex.pendingHandoff).toEqual({ atMs: 20_000, accumulatedMs: 20_000 });

    applyVisibleTimers(timers, visible("alex"), 20_300);
    expect(timers.alex.accumulatedMs).toBe(20_300);

    handleRegisterTimers(timers, [countdown("bob", "B1")], visible("bob"), 50_000);
    expect(timers.alex.accumulatedMs).toBe(50_000);
    expect(timers.alex.startedAt).toBeNull();
    expect(timers.bob.startedAt).toBe(50_000);

    applyVisibleTimers(timers, visible("alex"), 60_000);
    expect(timers.alex.accumulatedMs).toBe(50_000);
    expect(timers.alex.startedAt).toBe(60_000);
    expect(timers.bob.accumulatedMs).toBe(10_000);
    expect(timers.bob.startedAt).toBeNull();
  });

  it("credits a visibility gap exactly at the handoff grace boundary", () => {
    const timers: Record<string, TimerState> = {};
    handleRegisterTimers(timers, [countdown("alex", "A")], visible("alex"), 0);
    applyVisibleTimers(timers, visible(), 10_000);
    applyVisibleTimers(timers, visible("alex"), 10_000 + HANDOFF_GRACE_MS);

    expect(timers.alex.accumulatedMs).toBe(10_000 + HANDOFF_GRACE_MS);
    expect(timers.alex.pendingHandoff).toBeNull();
  });

  it("does not credit a visibility gap beyond the handoff grace boundary", () => {
    const timers: Record<string, TimerState> = {};
    handleRegisterTimers(timers, [countdown("alex", "A")], visible("alex"), 0);
    applyVisibleTimers(timers, visible(), 10_000);
    applyVisibleTimers(timers, visible("alex"), 10_000 + HANDOFF_GRACE_MS + 1);

    expect(timers.alex.accumulatedMs).toBe(10_000);
    expect(timers.alex.pendingHandoff).toBeNull();
  });

  it("restores and credits reset-on-slide state after a brief render gap", () => {
    const timers: Record<string, TimerState> = {};
    handleRegisterTimers(timers, [countdown("reset", "A", [
      { type: TimerFlagType.RESET_ON_SLIDE }
    ])], visible("reset"), 0);

    applyVisibleTimers(timers, visible(), 8_000);
    expect(timers.reset.accumulatedMs).toBe(0);
    expect(timers.reset.pendingHandoff).toEqual({ atMs: 8_000, accumulatedMs: 8_000 });

    applyVisibleTimers(timers, visible("reset"), 8_300);
    expect(timers.reset.accumulatedMs).toBe(8_300);
  });

  it("keeps reset-on-slide state at zero after a long render gap", () => {
    const timers: Record<string, TimerState> = {};
    handleRegisterTimers(timers, [countdown("reset", "A", [
      { type: TimerFlagType.RESET_ON_SLIDE }
    ])], visible("reset"), 0);

    applyVisibleTimers(timers, visible(), 8_000);
    applyVisibleTimers(timers, visible("reset"), 8_000 + HANDOFF_GRACE_MS + 1);

    expect(timers.reset.accumulatedMs).toBe(0);
    expect(timers.reset.startedAt).toBe(8_000 + HANDOFF_GRACE_MS + 1);
  });

  it("pauses without creating a handoff and resumes without crediting the paused span", () => {
    const timers: Record<string, TimerState> = {};
    handleRegisterTimers(timers, [countdown("alex", "A")], visible("alex"), 1_000);

    expect(handleToggleVisiblePause(timers, visible("alex"), 6_000)).toBe(true);
    expect(timers.alex.paused).toBe(true);
    expect(timers.alex.accumulatedMs).toBe(5_000);
    expect(timers.alex.startedAt).toBeNull();
    expect(timers.alex.pendingHandoff).toBeNull();

    expect(handleToggleVisiblePause(timers, visible("alex"), 16_000)).toBe(true);
    expect(timers.alex.paused).toBe(false);
    expect(timers.alex.accumulatedMs).toBe(5_000);
    expect(timers.alex.startedAt).toBe(16_000);
  });

  it("pauses all visible countdowns and stopwatches together", () => {
    const timers: Record<string, TimerState> = {};
    const stopwatch: TimerData = {
      id: "watch",
      timerType: "stopwatch",
      duration: 0,
      slideIds: ["A"]
    };
    handleRegisterTimers(
      timers,
      [countdown("count", "A"), stopwatch],
      visible("count", "watch"),
      0
    );

    expect(handleToggleVisiblePause(timers, visible("count", "watch"), 5_000)).toBe(true);
    expect(timers.count.paused).toBe(true);
    expect(timers.watch.paused).toBe(true);
    expect(timers.count.accumulatedMs).toBe(5_000);
    expect(timers.watch.accumulatedMs).toBe(5_000);
  });

  it("returns false when no visible countdown or stopwatch can be toggled", () => {
    const timers: Record<string, TimerState> = {};
    handleRegisterTimers(timers, [countdown("alex", "A")], visible(), 0);

    expect(handleToggleVisiblePause(timers, visible(), 5_000)).toBe(false);
    expect(timers.alex.paused).toBe(false);
  });
});
