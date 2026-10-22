import { describe, expect, it } from 'vitest';

import type { RoomPlayers } from './roomTypes';
import { ROOM_MAX_AGE_MS, shouldCleanupOldRoom } from './roomCleanup';

const NOW = 10 * ROOM_MAX_AGE_MS;

function players(connected: boolean): RoomPlayers {
  return {
    p1: {
      name: 'หนึ่ง',
      seat: 0,
      connected,
      lastSeen: NOW,
      joinedAt: NOW,
    },
  };
}

describe('shouldCleanupOldRoom', () => {
  it('removes a room older than 24 hours when everyone is offline', () => {
    expect(
      shouldCleanupOldRoom(
        { createdAt: NOW - ROOM_MAX_AGE_MS - 1 },
        players(false),
        NOW,
      ),
    ).toBe(true);
  });

  it('keeps fresh rooms and rooms with a connected player', () => {
    expect(
      shouldCleanupOldRoom({ createdAt: NOW - 1_000 }, players(false), NOW),
    ).toBe(false);
    expect(
      shouldCleanupOldRoom(
        { createdAt: NOW - ROOM_MAX_AGE_MS - 1 },
        players(true),
        NOW,
      ),
    ).toBe(false);
  });
});
