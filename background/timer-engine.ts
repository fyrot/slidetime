import { TimerFlagType, type TimerData, type TimerState } from "~timer-types";

export const HANDOFF_GRACE_MS = 2000;

export function handleRegisterTimers(
  timerStateRecord: Record<string, TimerState>,
  timers: TimerData[],
  visibleIds: ReadonlySet<string>,
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
      // Keep every observed slide id as debugging/id-minting metadata.
      for (const slideId of timer.slideIds) {
        if (!timerStateRecord[timer.id].slideIds.includes(slideId)) {
          timerStateRecord[timer.id].slideIds.push(slideId);
        }
      }
    }
  }

  applyVisibleTimers(timerStateRecord, visibleIds, now);
}

export function applyVisibleTimers(
  timerStateRecord: Record<string, TimerState>,
  visibleIds: ReadonlySet<string>,
  now: number
): void {
  for (const timer of Object.values(timerStateRecord)) {
    const isVisible = visibleIds.has(timer.id);
    const shouldRun = isVisible && !timer.paused;
    const wasRunning = timer.startedAt != null;

    if (shouldRun && !wasRunning) {
      timer.startedAt = now;
      // A brief render gap is treated as a seamless handoff. Restoring the
      // stashed value also undoes reset-on-leave zeroing for that brief gap.
      if (timer.pendingHandoff && now - timer.pendingHandoff.atMs <= HANDOFF_GRACE_MS) {
        timer.accumulatedMs = timer.pendingHandoff.accumulatedMs + (now - timer.pendingHandoff.atMs);
      }
      timer.pendingHandoff = null;
    } else if (!shouldRun && wasRunning) {
      timer.accumulatedMs += now - timer.startedAt;
      timer.startedAt = null;
      if (!isVisible) {
        timer.pendingHandoff = { atMs: now, accumulatedMs: timer.accumulatedMs };
        if (timer.flags?.some(f => f.type === TimerFlagType.RESET_ON_SLIDE)) {
          timer.accumulatedMs = 0;
        }
      }
    }

    timer.enabled = isVisible;
  }
}

export function handleToggleVisiblePause(
  timerStateRecord: Record<string, TimerState>,
  visibleIds: ReadonlySet<string>,
  now: number
): boolean {
  const targets = Object.values(timerStateRecord).filter(
    (timer) =>
      visibleIds.has(timer.id) &&
      (timer.timerType === "countdown" || timer.timerType === "stopwatch")
  );
  if (targets.length === 0) { return false; }

  // If any targeted timer is currently running, pause all; otherwise resume all.
  const anyRunning = targets.some((timer) => !timer.paused);
  const nextPaused = anyRunning;

  for (const timer of targets) {
    timer.paused = nextPaused;
  }

  applyVisibleTimers(timerStateRecord, visibleIds, now);
  return true;
}

export function resetTimerStates(timerStateRecord: Record<string, TimerState>): void {
  for (const timerId of Object.keys(timerStateRecord)) {
    delete timerStateRecord[timerId];
  }
}
