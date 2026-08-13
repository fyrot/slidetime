import { TimerFlagType, type TimerData, type TimerState } from "~timer-types";

export function handleRegisterTimers(
  timerStateRecord: Record<string, TimerState>,
  timers: TimerData[],
  activeSlideId: string,
  now: number
): void {
  for (const timer of timers) {
    if (!timerStateRecord[timer.id]) {
      timerStateRecord[timer.id] = {
        ...timer,
        enabled: false,
        paused: false,
        startedAt: null,
        accumulatedMs: 0
      };
    } else {
      // If already present, include this new slide id as another "home".
      for (const slideId of timer.slideIds) {
        if (!timerStateRecord[timer.id].slideIds.includes(slideId)) {
          timerStateRecord[timer.id].slideIds.push(slideId);
        }
      }
    }
  }

  verifyActiveTimers(timerStateRecord, activeSlideId, now);
}

export function verifyActiveTimers(
  timerStateRecord: Record<string, TimerState>,
  activeSlideId: string,
  now: number
): void {
  for (const timer of Object.values(timerStateRecord)) {
    const isActiveSlide = timer.slideIds.includes(activeSlideId);
    const shouldBeRunning = isActiveSlide && !timer.paused;
    const wasRunning = timer.startedAt != null;

    // A pending handoff is only redeemable while the slide it points at is still
    // the active one; once the presentation moves on, the departure is final.
    if (timer.pendingHandoff && timer.pendingHandoff.slideId !== activeSlideId) {
      timer.pendingHandoff = null;
    }

    // The running to not-running transition owns the bank/unbank of timer start data.
    if (shouldBeRunning && !wasRunning) {
      timer.startedAt = now;
      // Slide changes are reported before the destination slide's tokens are
      // extracted, so a timer that also lives on that slide briefly deactivates.
      // If the slide it "left to" turns out to contain it (its registration
      // arrives while that slide is still active), restore the banked value and
      // credit the gap so the handoff is seamless. This also undoes a spurious
      // reset-on-slide zeroing for that case.
      if (timer.pendingHandoff && timer.pendingHandoff.slideId === activeSlideId) {
        timer.accumulatedMs = timer.pendingHandoff.accumulatedMs + (now - timer.pendingHandoff.atMs);
      }
      timer.pendingHandoff = null;
    } else if (!shouldBeRunning && wasRunning) {
      timer.accumulatedMs += now - timer.startedAt;
      timer.startedAt = null;
      if (!isActiveSlide) {
        timer.pendingHandoff = { atMs: now, slideId: activeSlideId, accumulatedMs: timer.accumulatedMs };
      }
    }

    // Reset-on-slide only applies when leaving the slide, not when pausing on it.
    if (!isActiveSlide && timer.enabled && timer.flags?.some(f => f.type === TimerFlagType.RESET_ON_SLIDE)) {
      timer.accumulatedMs = 0;
    }

    timer.enabled = isActiveSlide;
  }
}

export function handleSlideChanged(
  timerStateRecord: Record<string, TimerState>,
  newSlideId: string,
  now: number
): void {
  verifyActiveTimers(timerStateRecord, newSlideId, now);
}

export function handleToggleSlidePause(
  timerStateRecord: Record<string, TimerState>,
  activeSlideId: string,
  now: number
): boolean {
  const targets = Object.values(timerStateRecord).filter(
    (timer) =>
      timer.slideIds.includes(activeSlideId) &&
      (timer.timerType === "countdown" || timer.timerType === "stopwatch")
  );
  if (targets.length === 0) { return false; }

  // If any targeted timer is currently running, pause all; otherwise resume all.
  const anyRunning = targets.some((timer) => !timer.paused);
  const nextPaused = anyRunning;

  for (const timer of targets) {
    timer.paused = nextPaused;
  }

  verifyActiveTimers(timerStateRecord, activeSlideId, now);
  return true;
}

export function resetTimerStates(timerStateRecord: Record<string, TimerState>): void {
  for (const timerId of Object.keys(timerStateRecord)) {
    delete timerStateRecord[timerId];
  }
}
