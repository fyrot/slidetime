import { describe, expect, it } from "vitest";

import {
  applyVisibleTimers,
  handleRegisterTimers
} from "~background/timer-engine";
import type { TimerData, TimerState } from "~timer-types";

function timer(slideId = "A"): TimerData {
  return {
    id: "countdown-alex",
    timerType: "countdown",
    duration: 300,
    slideIds: [slideId]
  };
}

function visible(...timerIds: string[]): ReadonlySet<string> {
  return new Set(timerIds);
}

describe("timer lifecycle message ordering", () => {
  it("starts on register when visibility arrived first", () => {
    const timers: Record<string, TimerState> = {};
    const registeredTimer = timer();
    const visibleIds = visible(registeredTimer.id);
    applyVisibleTimers(timers, visibleIds, 1_000);
    handleRegisterTimers(timers, [registeredTimer], visibleIds, 1_500);

    expect(timers[registeredTimer.id].startedAt).toBe(1_500);
    expect(timers[registeredTimer.id].enabled).toBe(true);
  });

  it("starts on visibility when registration arrived first", () => {
    const timers: Record<string, TimerState> = {};
    const registeredTimer = timer();
    handleRegisterTimers(timers, [registeredTimer], visible(), 1_000);
    expect(timers[registeredTimer.id].startedAt).toBeNull();

    applyVisibleTimers(timers, visible(registeredTimer.id), 1_500);
    expect(timers[registeredTimer.id].startedAt).toBe(1_500);
  });

  it("never resets accumulated time or restarts a duplicate registration", () => {
    const timers: Record<string, TimerState> = {};
    const registeredTimer = timer();
    handleRegisterTimers(timers, [registeredTimer], visible(registeredTimer.id), 100);
    applyVisibleTimers(timers, visible(), 200);
    applyVisibleTimers(timers, visible(registeredTimer.id), 300);
    handleRegisterTimers(timers, [timer("B")], visible(registeredTimer.id), 350);

    expect(timers[registeredTimer.id].accumulatedMs).toBe(200);
    expect(timers[registeredTimer.id].startedAt).toBe(300);
    expect(timers[registeredTimer.id].slideIds).toEqual(["A", "B"]);

    applyVisibleTimers(timers, visible(), 400);
    expect(timers[registeredTimer.id].accumulatedMs).toBe(300);
    expect(timers[registeredTimer.id].startedAt).toBeNull();
  });

  it("collapses two same-id placeholders into one state entry", () => {
    const timers: Record<string, TimerState> = {};
    const firstView = timer();
    const secondView = timer();
    handleRegisterTimers(timers, [firstView, secondView], visible(firstView.id), 100);

    expect(Object.keys(timers)).toEqual([firstView.id]);
    expect(timers[firstView.id].startedAt).toBe(100);
    expect(timers[firstView.id].slideIds).toEqual(["A"]);
  });
});
