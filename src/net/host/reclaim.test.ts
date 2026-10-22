import { describe, expect, it } from 'vitest';

import { applyAction } from '@/engine/reducer';
import { createInitialState } from '@/engine/setup';
import type { FullGameState } from '@/engine/types';

import { migratePlayerUid, replaceUids } from './reclaim';

function startedState(): FullGameState {
  const result = applyAction(
    createInitialState(11, [
      { uid: 'p1', name: 'หนึ่ง' },
      { uid: 'p2', name: 'สอง' },
      { uid: 'p3', name: 'สาม' },
    ]),
    { type: 'START_GAME', uid: 'p1' },
    1_000,
  );
  if ('error' in result) throw new Error(result.error);
  result.state.bossUid = 'p2';
  result.state.startPickerUid = 'p3';
  result.state.log.push({ type: 'bossSkipped', uid: 'p2', at: 1_000 });
  result.state.finalScores = { p1: 3, p2: 7, p3: 2 };
  result.state.deal = {
    space: 4,
    requirements: {
      index: 4,
      requiredInvestors: 3,
      dividends: 3,
      groups: [],
    },
    tileNumber: 1,
    bossClanCards: [],
    offers: {
      p2: {
        red: {
          color: 'red',
          source: 'table',
          amount: 2,
          submittedAt: 1_000,
        },
      },
    },
    accepted: { red: 'p2' },
    excludedColors: [],
    locked: false,
    actionCards: [],
  };
  return result.state;
}

describe('replaceUids', () => {
  it('renames object keys and string values at every depth', () => {
    const value = {
      p2: { uid: 'p2', name: 'สอง' },
      log: [{ uid: 'p2', toUid: 'p2' }],
      finalScores: { p2: 7 },
    };

    expect(replaceUids(value, 'p2', 'new-uid')).toEqual({
      'new-uid': { uid: 'new-uid', name: 'สอง' },
      log: [{ uid: 'new-uid', toUid: 'new-uid' }],
      finalScores: { 'new-uid': 7 },
    });
  });
});

describe('migratePlayerUid', () => {
  it('moves the player, their references and their new display name', () => {
    const state = startedState();
    const next = migratePlayerUid(state, 'p2', 'new-uid', 'เครื่องใหม่');

    expect(next).not.toBeNull();
    expect(next?.players.find((player) => player.uid === 'new-uid')?.name).toBe(
      'เครื่องใหม่',
    );
    expect(next?.players.some((player) => player.uid === 'p2')).toBe(false);
    expect(next?.bossUid).toBe('new-uid');
    expect(next?.deal?.offers).toHaveProperty('new-uid');
    expect(next?.deal?.accepted.red).toBe('new-uid');
    expect(next?.log.at(-1)).toMatchObject({ type: 'bossSkipped', uid: 'new-uid' });
    expect(next?.finalScores).toHaveProperty('new-uid');
  });

  it('rejects missing, occupied and identical targets', () => {
    const state = startedState();
    expect(migratePlayerUid(state, 'missing', 'new-uid')).toBeNull();
    expect(migratePlayerUid(state, 'p2', 'p1')).toBeNull();
    expect(migratePlayerUid(state, 'p2', 'p2')).toBeNull();
  });

  it('trims and caps the reclaim display name', () => {
    const next = migratePlayerUid(startedState(), 'p2', 'new-uid', '  ชื่อยาวเกินสิบหกตัวอักษร  ');
    const name = next?.players.find((player) => player.uid === 'new-uid')?.name;
    expect(name).toHaveLength(16);
    expect(name).not.toMatch(/^\s|\s$/);
  });
});
