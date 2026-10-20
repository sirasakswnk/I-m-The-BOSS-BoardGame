import { describe, expect, it } from 'vitest';

import { GRACE_MS, HOST_CLOSE_BUFFER_MS, INTERRUPT_MS } from '../config/rules';
import { tick } from '../tick';
import { finishGame } from '../endgame';
import { isDealComplete } from '../validators';
import {
  clanCard,
  getPlayer,
  lockAndResolve,
  ok,
  openDealAt,
  passWindowAll,
  rejected,
  setHand,
  setTableInvestors,
  startGame,
  travelCard,
} from './helpers';

function completeDeal(seed = 110) {
  const state = startGame(4, seed);
  setTableInvestors(state, { p1: ['green', 'yellow'] });
  setHand(state, 'p1', []);
  return openDealAt(state, 'p1', 8);
}

describe('interrupt windows', () => {
  it('stays open until every non-trigger has passed', () => {
    const opened = completeDeal();
    const locked = ok(opened, { type: 'LOCK_DEAL', uid: 'p1' }, 5000).state;
    expect(locked.window?.triggeredBy).toBe('p1');
    expect(locked.window?.reason).toBe('dealLocked');
    expect(isDealComplete(locked)).toBe(true);

    const p2 = ok(locked, { type: 'PASS_WINDOW', uid: 'p2' }, 5010).state;
    expect(p2.window?.passed).toEqual(['p2']);
    expect(p2.deal).not.toBeNull();
    const p3 = ok(p2, { type: 'PASS_WINDOW', uid: 'p3' }, 5020).state;
    expect(p3.deal).not.toBeNull();
    const p4 = ok(p3, { type: 'PASS_WINDOW', uid: 'p4' }, 5030).state;
    expect(p4.window).toBeNull();
    expect(p4.deal).toBeNull();
    expect(p4.dealsClosed).toBe(1);
    expect(getPlayer(p4, 'p1').money).toBe(6);
  });

  it('cancels a lock and allows the boss to fail the deal', () => {
    const opened = completeDeal(111);
    const locked = ok(opened, { type: 'LOCK_DEAL', uid: 'p1' }, 5000).state;
    const cancelled = ok(locked, { type: 'CANCEL_LOCK', uid: 'p1' }, 5010).state;
    expect(cancelled.window).toBeNull();
    expect(cancelled.deal?.locked).toBe(false);
    expect(cancelled.phase).toBe('dealOpen');

    const failed = ok(cancelled, { type: 'FAIL_DEAL', uid: 'p1' }, 5020).state;
    expect(failed.deal).toBeNull();
    expect(failed.phase).toBe('turnStart');
    expect(failed.bossUid).toBe('p2');
  });

  it('keeps a card window open after cancelling a lock with pending cards', () => {
    const opened = completeDeal(112);
    const locked = ok(opened, { type: 'LOCK_DEAL', uid: 'p1' }, 5000).state;
    const travel = travelCard('green');
    setHand(locked, 'p2', [travel]);
    const played = ok(
      locked,
      {
        type: 'PLAY_TRAVEL',
        uid: 'p2',
        cardId: travel.id,
        target: { kind: 'investor', uid: 'p1', color: 'green' },
      },
      5010,
    ).state;
    expect(played.window?.reason).toBe('cardPlayed');

    const cancelled = ok(played, { type: 'CANCEL_LOCK', uid: 'p1' }, 5020).state;
    expect(cancelled.deal?.locked).toBe(false);
    expect(cancelled.window?.reason).toBe('cardPlayed');
    expect(cancelled.window?.triggeredBy).toBe('p2');

    const closed = passWindowAll(cancelled, 5030);
    expect(closed.window).toBeNull();
    expect(closed.deal).not.toBeNull();
    expect(closed.onVacation).toEqual(['green']);
    expect(closed.phase).toBe('dealOpen');
    expect(closed.dealsClosed).toBe(0);
  });

  it('rejects late actions but accepts them inside the grace period', () => {
    const opened = completeDeal(113);
    const locked = ok(opened, { type: 'LOCK_DEAL', uid: 'p1' }, 5000).state;
    const deadline = locked.window?.deadline ?? 0;
    expect(deadline).toBe(5000 + INTERRUPT_MS);

    const justInTime = ok(
      locked,
      { type: 'PASS_WINDOW', uid: 'p2' },
      deadline + GRACE_MS,
    ).state;
    expect(justInTime.window?.passed).toContain('p2');

    expect(
      rejected(locked, { type: 'PASS_WINDOW', uid: 'p2' }, deadline + GRACE_MS + 1),
    ).toBe('TOO_LATE');
  });

  it('ignores a duplicate pass', () => {
    const locked = ok(completeDeal(114), { type: 'LOCK_DEAL', uid: 'p1' }, 5000).state;
    const once = ok(locked, { type: 'PASS_WINDOW', uid: 'p2' }, 5010).state;
    const twice = ok(once, { type: 'PASS_WINDOW', uid: 'p2' }, 5020).state;
    expect(twice.window?.passed).toEqual(['p2']);
  });

  it('rejects pass without a window and lock/fail interactions', () => {
    const state = startGame(4, 115);
    expect(rejected(state, { type: 'PASS_WINDOW', uid: 'p1' }, 3000)).toBe('NO_WINDOW');

    const opened = completeDeal(116);
    expect(rejected(opened, { type: 'CANCEL_LOCK', uid: 'p1' }, 3100)).toBe('NOT_LOCKED');
    const locked = ok(opened, { type: 'LOCK_DEAL', uid: 'p1' }, 5000).state;
    expect(rejected(locked, { type: 'LOCK_DEAL', uid: 'p1' }, 5010)).toBe('WINDOW_OPEN');
    expect(rejected(locked, { type: 'FAIL_DEAL', uid: 'p1' }, 5010)).toBe('WINDOW_OPEN');
  });
});

describe('host tick', () => {
  it('does not close before the buffer expires', () => {
    const locked = ok(completeDeal(117), { type: 'LOCK_DEAL', uid: 'p1' }, 5000).state;
    const deadline = locked.window?.deadline ?? 0;
    const early = tick(locked, deadline + GRACE_MS + HOST_CLOSE_BUFFER_MS - 1);
    expect(early.events).toEqual([]);
    expect(early.state).toBe(locked);
  });

  it('closes and resolves a locked deal after the buffer', () => {
    const locked = ok(completeDeal(118), { type: 'LOCK_DEAL', uid: 'p1' }, 5000).state;
    const deadline = locked.window?.deadline ?? 0;
    const result = tick(locked, deadline + GRACE_MS + HOST_CLOSE_BUFFER_MS);
    expect(result.events.some((event) => event.type === 'dealResolved')).toBe(true);
    expect(result.state.deal).toBeNull();
    expect(result.state.phase).toBe('turnStart');
    expect(result.state.dealsClosed).toBe(1);
    expect(getPlayer(result.state, 'p1').money).toBe(6);
    expect(locked.deal).not.toBeNull();
  });

  it('returns the same state when no window is open', () => {
    const state = startGame(4, 119);
    const result = tick(state, 999999);
    expect(result.state).toBe(state);
    expect(result.events).toEqual([]);
  });
});

describe('skipping a disconnected boss', () => {
  it('advances from turn start', () => {
    const state = startGame(3, 120);
    state.bossUid = 'p1';
    const result = ok(state, { type: 'SKIP_DISCONNECTED_BOSS', uid: 'p2' }, 3000).state;
    expect(result.phase).toBe('turnStart');
    expect(result.bossUid).toBe('p2');
    expect(result.turnNumber).toBe(state.turnNumber + 1);
    expect(result.log.some((event) => event.type === 'bossSkipped')).toBe(true);
  });

  it('advances from after move', () => {
    const state = startGame(3, 121);
    state.bossUid = 'p1';
    state.phase = 'afterMove';
    const result = ok(state, { type: 'SKIP_DISCONNECTED_BOSS', uid: 'p2' }, 3000).state;
    expect(result.phase).toBe('turnStart');
    expect(result.bossUid).toBe('p2');
  });

  it('fails an open deal and returns boss clans', () => {
    const state = startGame(4, 122);
    setTableInvestors(state, { p1: ['green'] });
    const clan = clanCard('yellow');
    setHand(state, 'p1', [clan]);
    const opened = openDealAt(state, 'p1', 8, { clanCardIds: [clan.id] });
    expect(isDealComplete(opened)).toBe(true);
    const locked = ok(opened, { type: 'LOCK_DEAL', uid: 'p1' }, 5000).state;

    const skipped = ok(locked, { type: 'SKIP_DISCONNECTED_BOSS', uid: 'p2' }, 5100).state;
    expect(skipped.deal).toBeNull();
    expect(skipped.window).toBeNull();
    expect(skipped.phase).toBe('turnStart');
    expect(skipped.bossUid).toBe('p2');
    expect(getPlayer(skipped, 'p1').hand.some((card) => card.id === clan.id)).toBe(true);
    expect(skipped.log.some((event) => event.type === 'dealFailed')).toBe(true);
  });

  it('rejects skipping at game over or from an unknown player', () => {
    const state = startGame(3, 123);
    finishGame(state, 4000);
    expect(
      rejected(state, { type: 'SKIP_DISCONNECTED_BOSS', uid: 'p1' }, 5000),
    ).toBe('WRONG_PHASE');
    expect(
      rejected(startGame(3, 124), { type: 'SKIP_DISCONNECTED_BOSS', uid: 'ghost' }, 5000),
    ).toBe('PLAYER_NOT_FOUND');
  });
});

describe('locking', () => {
  it('resolves after all pass and pays the boss only', () => {
    const opened = completeDeal(125);
    const resolved = lockAndResolve(opened, 'p1', 6000);
    expect(resolved.deal).toBeNull();
    expect(resolved.dealsClosed).toBe(1);
    expect(getPlayer(resolved, 'p1').money).toBe(6);
  });
});
