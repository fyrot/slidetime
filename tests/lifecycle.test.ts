import { describe, expect, it } from "vitest";

import {
  handleRegisterTimers,
  handleSlideChanged
} from "~background/timer-engine";
import type { TimerData, TimerState } from "~timer-types";

const timer: TimerData = {
  id: "countdown-alex",
  timerType: "countdown",
  duration: 300,
  slideIds: ["A"]
};

describe("timer lifecycle message ordering", () => {
  it("starts on register when SLIDE_CHANGED arrived first", () => {
    const timers: Record<string, TimerState> = {};
    const activeSlideId = "A";
    handleSlideChanged(timers, activeSlideId, 1_000);
    handleRegisterTimers(timers, [timer], activeSlideId, 1_500);

    expect(timers[timer.id].startedAt).toBe(1_500);
    expect(timers[timer.id].enabled).toBe(true);
  });

  it("starts on slide change when REGISTER_TIMERS arrived first", () => {
    const timers: Record<string, TimerState> = {};
    handleRegisterTimers(timers, [timer], "", 1_000);
    expect(timers[timer.id].startedAt).toBeNull();

    handleSlideChanged(timers, "A", 1_500);
    expect(timers[timer.id].startedAt).toBe(1_500);
  });

  it("never replaces a concurrent start time or double-counts elapsed time", () => {
    const timers: Record<string, TimerState> = {};
    handleRegisterTimers(timers, [timer], "A", 100);
    handleSlideChanged(timers, "A", 200);
    handleRegisterTimers(timers, [timer], "A", 250);

    expect(timers[timer.id].startedAt).toBe(100);
    handleSlideChanged(timers, "B", 300);
    expect(timers[timer.id].accumulatedMs).toBe(200);
    expect(timers[timer.id].startedAt).toBeNull();
  });
});
