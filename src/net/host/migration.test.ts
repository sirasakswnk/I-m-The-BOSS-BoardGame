import { describe, expect, it } from 'vitest';

import type { RoomPlayers } from '../roomTypes';
import { findHostCandidate, isHostOffline } from './migration';

function players(
  entries: Array<[string, number, boolean]>,
): RoomPlayers {
  return Object.fromEntries(
    entries.map(([uid, seat, connected], index) => [
      uid,
      {
        name: uid,
        seat,
        connected,
        lastSeen: 1_000,
        joinedAt: 1_000 + index,
      },
    ]),
  );
}

describe('findHostCandidate', () => {
  it('picks the lowest connected seat and skips disconnected players', () => {
    const room = players([
      ['host', 0, false],
      ['p2', 2, true],
      ['p1', 1, false],
      ['p3', 3, true],
    ]);
    expect(findHostCandidate(room)).toBe('p2');
  });

  it('breaks equal seats by joinedAt', () => {
    const room = players([
      ['late', 1, true],
      ['early', 1, true],
    ]);
    expect(findHostCandidate(room)).toBe('late');
  });

  it('returns null when nobody is connected', () => {
    expect(findHostCandidate(players([['p1', 0, false]]))).toBeNull();
  });
});

describe('isHostOffline', () => {
  it('is true only for an unfinished room with an offline host', () => {
    expect(
      isHostOffline({
        hostUid: 'host',
        hostConnected: false,
        status: 'playing',
        createdAt: 1,
        schemaVersion: 1,
      }),
    ).toBe(true);
    expect(
      isHostOffline({
        hostUid: 'host',
        hostConnected: true,
        status: 'playing',
        createdAt: 1,
        schemaVersion: 1,
      }),
    ).toBe(false);
    expect(
      isHostOffline({
        hostUid: 'host',
        hostConnected: false,
        status: 'finished',
        createdAt: 1,
        schemaVersion: 1,
      }),
    ).toBe(false);
  });
});
