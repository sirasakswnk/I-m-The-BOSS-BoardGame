import { describe, expect, it } from 'vitest';

import { applyAction } from '@/engine/reducer';
import { createInitialState } from '@/engine/setup';
import type { RoomPlayers } from '@/net/roomTypes';

import { prepareRematchState } from './rematch';

function startedState() {
  const result = applyAction(
    createInitialState(7, [
      { uid: 'p1', name: 'หนึ่ง' },
      { uid: 'p2', name: 'สอง' },
      { uid: 'p3', name: 'สาม' },
    ]),
    { type: 'START_GAME', uid: 'p1' },
    1_000,
  );
  if ('error' in result) throw new Error(result.error);
  return result.state;
}

function roomPlayers(connected: Record<string, boolean>): RoomPlayers {
  return Object.fromEntries(
    Object.entries(connected).map(([uid, isConnected], seat) => [
      uid,
      {
        name: uid,
        seat,
        connected: isConnected,
        lastSeen: 1_000,
        joinedAt: 1_000 + seat,
      },
    ]),
  );
}

describe('prepareRematchState', () => {
  it('removes offline players before the engine starts a new game', () => {
    const prepared = prepareRematchState(
      startedState(),
      roomPlayers({ p1: true, p2: false, p3: true }),
      'p1',
    );

    expect(prepared.removedUids).toEqual(['p2']);
    expect(prepared.state.players.map((player) => player.uid)).toEqual(['p1', 'p3']);
  });

  it('removes players that no longer have a room seat and keeps the host', () => {
    const prepared = prepareRematchState(
      startedState(),
      roomPlayers({ p1: false, p2: true }),
      'p1',
    );

    expect(prepared.removedUids).toEqual(['p3']);
    expect(prepared.state.players.map((player) => player.uid)).toEqual(['p1', 'p2']);
  });

  it('returns the original state when everybody is present', () => {
    const state = startedState();
    const prepared = prepareRematchState(
      state,
      roomPlayers({ p1: true, p2: true, p3: true }),
      'p1',
    );

    expect(prepared.removedUids).toEqual([]);
    expect(prepared.state).toBe(state);
  });
});
