/**
 * Deterministic seeded RNG (mulberry32) - plan.md section 4.2.
 *
 * The generator state lives in FullGameState so that shuffles and die rolls are
 * reproducible and a new host can continue from the same state.
 */
export interface RngStep<T> {
  value: T;
  state: number;
}

export function normalizeSeed(seed: number): number {
  return Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 1;
}

/** Advances the generator and returns a uint32. */
export function nextUint32(state: number): RngStep<number> {
  const nextState = (state + 0x6d2b79f5) >>> 0;
  let t = nextState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = (t ^ (t >>> 14)) >>> 0;
  return { value, state: nextState };
}

/** Uniform float in [0, 1). */
export function randomFloat(state: number): RngStep<number> {
  const step = nextUint32(state);
  return { value: step.value / 0x1_0000_0000, state: step.state };
}

/** Uniform integer in [min, max] (inclusive). */
export function randomInt(state: number, min: number, max: number): RngStep<number> {
  if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
    throw new Error(`randomInt: invalid range ${min}..${max}`);
  }
  const step = randomFloat(state);
  const range = max - min + 1;
  return { value: min + Math.floor(step.value * range), state: step.state };
}

/** Fisher-Yates shuffle; returns a new array and the advanced RNG state. */
export function shuffle<T>(items: readonly T[], state: number): RngStep<T[]> {
  const result = [...items];
  let rngState = state;

  for (let i = result.length - 1; i > 0; i -= 1) {
    const picked = randomInt(rngState, 0, i);
    rngState = picked.state;
    const swap = result[i];
    result[i] = result[picked.value];
    result[picked.value] = swap;
  }

  return { value: result, state: rngState };
}
