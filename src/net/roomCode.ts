import { MAX_PLAYERS } from '@/engine/config/families';

/** Room codes are exactly five digits and never start with 0 (plan.md 8.1). */
export const ROOM_CODE_LENGTH = 5;
export const NICKNAME_MAX_LENGTH = 16;
export const NICKNAME_MIN_LENGTH = 1;

const FIVE_DIGIT_MIN = 10_000;
const FIVE_DIGIT_SPAN = 90_000;

export function normalizeRoomCode(input: string): string {
  return input.replace(/\D/g, '').slice(0, ROOM_CODE_LENGTH);
}

export function isValidRoomCode(input: string): boolean {
  return /^[1-9]\d{4}$/.test(input);
}

export function normalizeNickname(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

export function isValidNickname(input: string): boolean {
  const normalized = normalizeNickname(input);
  return (
    normalized.length >= NICKNAME_MIN_LENGTH && normalized.length <= NICKNAME_MAX_LENGTH
  );
}

/**
 * Generates a five-digit room code with crypto.getRandomValues, rejecting
 * values that would introduce modulo bias. A tiny fake source is accepted for
 * tests.
 */
export function generateRoomCode(
  randomValues?: (array: Uint32Array) => Uint32Array,
): string {
  const source =
    randomValues ??
    ((array: Uint32Array) => {
      if (typeof globalThis.crypto?.getRandomValues !== 'function') {
        throw new Error('crypto.getRandomValues is unavailable');
      }
      return globalThis.crypto.getRandomValues(array as Uint32Array<ArrayBuffer>);
    });

  const limit = Math.floor(0x1_0000_0000 / FIVE_DIGIT_SPAN) * FIVE_DIGIT_SPAN;
  const buffer = new Uint32Array(1);
  for (let attempt = 0; attempt < 64; attempt += 1) {
    source(buffer);
    if (buffer[0] < limit) {
      return String(FIVE_DIGIT_MIN + (buffer[0] % FIVE_DIGIT_SPAN));
    }
  }

  // Practically unreachable; still return a valid code rather than looping.
  return String(FIVE_DIGIT_MIN + (buffer[0] % FIVE_DIGIT_SPAN));
}

/**
 * Appends " 2", " 3", ... when a nickname is already taken (case-insensitive),
 * keeping the 16-character limit from plan.md 8.1.
 */
export function dedupeNickname(
  rawNickname: string,
  existingNames: readonly string[],
): string {
  const base = normalizeNickname(rawNickname);
  if (!base) return base;

  const used = new Set(existingNames.map((name) => normalizeNickname(name).toLowerCase()));
  if (!used.has(base.toLowerCase())) return base;

  for (let suffixNumber = 2; suffixNumber <= 99; suffixNumber += 1) {
    const suffix = ` ${suffixNumber}`;
    const stem = base.slice(0, NICKNAME_MAX_LENGTH - suffix.length).trimEnd();
    const candidate = `${stem}${suffix}`;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }

  return base.slice(0, NICKNAME_MAX_LENGTH - 3) + ' 99';
}

/** Lowest free seat in 0..5, or null when the room is full. */
export function chooseFreeSeat(
  players: Record<string, { seat: number }> | null | undefined,
): number | null {
  const used = new Set(
    Object.values(players ?? {})
      .map((player) => player.seat)
      .filter((seat) => Number.isInteger(seat)),
  );

  for (let seat = 0; seat < MAX_PLAYERS; seat += 1) {
    if (!used.has(seat)) return seat;
  }
  return null;
}
