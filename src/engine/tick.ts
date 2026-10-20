import { GRACE_MS, HOST_CLOSE_BUFFER_MS, STORED_LOG_LIMIT } from './config/rules';
import { closeWindow } from './reducer';
import type { FullGameState, GameEvent, TickResult } from './types';

/**
 * Host tick - closes an interrupt window once it is safely past its deadline
 * (plan.md 7.2: deadline + GRACE_MS + a small buffer for in-flight actions).
 * Pure function: returns a new state, never mutates the argument.
 */
export function tick(state: FullGameState, now: number): TickResult {
  if (!state.window) return { state, events: [] };
  if (now < state.window.deadline + GRACE_MS + HOST_CLOSE_BUFFER_MS) {
    return { state, events: [] };
  }

  const next = structuredClone(state);
  const events: GameEvent[] = [];
  closeWindow(next, now, events);

  if (events.length > 0) {
    next.log.push(...events);
    if (next.log.length > STORED_LOG_LIMIT) {
      next.log = next.log.slice(-STORED_LOG_LIMIT);
    }
  }

  return { state: next, events };
}
