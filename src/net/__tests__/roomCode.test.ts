import { describe, expect, it } from 'vitest';

import {
  chooseFreeSeat,
  dedupeNickname,
  generateRoomCode,
  isValidNickname,
  isValidRoomCode,
  normalizeRoomCode,
  normalizeNickname,
} from '../roomCode';

describe('room codes', () => {
  it('accepts only five digits without a leading zero', () => {
    expect(isValidRoomCode('48213')).toBe(true);
    expect(isValidRoomCode('10000')).toBe(true);
    expect(isValidRoomCode('09999')).toBe(false);
    expect(isValidRoomCode('00000')).toBe(false);
    expect(isValidRoomCode('4821')).toBe(false);
    expect(isValidRoomCode('482130')).toBe(false);
    expect(isValidRoomCode('48a13')).toBe(false);
  });

  it('normalizes pasted codes to five digits', () => {
    expect(normalizeRoomCode(' 48-213 ')).toBe('48213');
    expect(normalizeRoomCode('abc123456')).toBe('12345');
    expect(normalizeRoomCode('')).toBe('');
  });

  it('generates valid codes without modulo bias', () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generateRoomCode();
      expect(code).toMatch(/^[1-9]\d{4}$/);
      expect(isValidRoomCode(code)).toBe(true);
    }
  });

  it('maps a deterministic uint32 into the five-digit range', () => {
    expect(
      generateRoomCode((buffer) => {
        buffer[0] = 0;
        return buffer;
      }),
    ).toBe('10000');

    expect(
      generateRoomCode((buffer) => {
        buffer[0] = 89_999;
        return buffer;
      }),
    ).toBe('99999');
  });
});

describe('nicknames', () => {
  it('trims, collapses spaces and enforces 1-16 characters', () => {
    expect(normalizeNickname('  Fern   F.  ')).toBe('Fern F.');
    expect(isValidNickname('Fern')).toBe(true);
    expect(isValidNickname('   ')).toBe(false);
    expect(isValidNickname('x'.repeat(16))).toBe(true);
    expect(isValidNickname('x'.repeat(17))).toBe(false);
  });

  it('appends a suffix case-insensitively', () => {
    expect(dedupeNickname('Fern', [])).toBe('Fern');
    expect(dedupeNickname('Fern', ['fern', 'Fern 2'])).toBe('Fern 3');
    expect(dedupeNickname(' fern ', ['FERN'])).toBe('fern 2');
  });

  it('keeps suffixed names within 16 characters', () => {
    const longName = 'x'.repeat(16);
    const deduped = dedupeNickname(longName, [longName]);
    expect(deduped).toHaveLength(16);
    expect(deduped.endsWith(' 2')).toBe(true);
  });
});

describe('seats', () => {
  it('picks the lowest free seat and reports full rooms', () => {
    expect(chooseFreeSeat(undefined)).toBe(0);
    expect(chooseFreeSeat({ a: { seat: 0 }, b: { seat: 2 } })).toBe(1);
    expect(
      chooseFreeSeat({
        a: { seat: 0 },
        b: { seat: 1 },
        c: { seat: 2 },
        d: { seat: 3 },
        e: { seat: 4 },
        f: { seat: 5 },
      }),
    ).toBeNull();
  });
});
