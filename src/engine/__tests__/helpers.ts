import type { FamilyColor } from '../config/families';
import type { InfluenceCard } from '../config/influenceCards';
import { applyAction } from '../reducer';
import { createInitialState } from '../setup';
import type { FullGameState, GameAction, GameEvent, PlayerState } from '../types';

export const PLAYER_UIDS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'] as const;

export interface OkResult {
  state: FullGameState;
  events: GameEvent[];
}

export function makeLobby(playerCount = 3, seed = 1): FullGameState {
  return createInitialState(
    seed,
    PLAYER_UIDS.slice(0, playerCount).map((uid) => ({ uid, name: uid.toUpperCase() })),
  );
}

export function ok(state: FullGameState, action: GameAction, now: number): OkResult {
  const result = applyAction(state, action, now);
  if ('error' in result) {
    throw new Error(`Action ${action.type} was rejected: ${result.error}`);
  }
  return result;
}

export function rejected(state: FullGameState, action: GameAction, now: number): string {
  const result = applyAction(state, action, now);
  if (!('error' in result)) {
    throw new Error(`Action ${action.type} unexpectedly succeeded`);
  }
  return result.error;
}

/** Starts a game and lets the start picker choose space 1. */
export function startGame(playerCount = 3, seed = 1): FullGameState {
  let state = ok(makeLobby(playerCount, seed), { type: 'START_GAME', uid: 'p1' }, 1000).state;
  const picker = state.startPickerUid;
  if (!picker) throw new Error('No start picker');
  state = ok(state, { type: 'SET_START_SPACE', uid: picker, space: 1 }, 2000).state;
  return state;
}

export function getPlayer(state: FullGameState, uid: string): PlayerState {
  const player = state.players.find((candidate) => candidate.uid === uid);
  if (!player) throw new Error(`Unknown player ${uid}`);
  return player;
}

export function setInvestors(state: FullGameState, uid: string, colors: FamilyColor[]): void {
  getPlayer(state, uid).investors = [...colors];
}

/** Replaces the whole investor distribution (useful to make deals deterministic). */
export function setTableInvestors(
  state: FullGameState,
  mapping: Record<string, FamilyColor[]>,
  unclaimed: FamilyColor[] = [],
): void {
  for (const player of state.players) player.investors = [];
  for (const uid of Object.keys(mapping)) setInvestors(state, uid, mapping[uid]);
  state.unclaimedInvestors = [...unclaimed];
}

export function setHand(state: FullGameState, uid: string, cards: InfluenceCard[]): void {
  getPlayer(state, uid).hand = [...cards];
}

/** Puts a player on turn at `space` with no window or deal. */
export function arrangeTurn(state: FullGameState, uid: string, space: number): void {
  state.phase = 'turnStart';
  state.bossUid = uid;
  state.pawnSpace = space;
  state.startPickerUid = null;
  state.deal = null;
  state.window = null;
  state.pendingCards = [];
  state.nextTurnUid = null;
  state.pendingDiscardUids = [];
}

/** Puts a player in the post-roll phase at `space`. */
export function arrangeAfterMove(state: FullGameState, uid: string, space: number): void {
  arrangeTurn(state, uid, space);
  state.phase = 'afterMove';
}

let testCardSequence = 0;

function nextTestCardId(prefix: string): string {
  testCardSequence += 1;
  return `test-${prefix}-${testCardSequence}`;
}

export function clanCard(color: FamilyColor): InfluenceCard {
  return { id: nextTestCardId(`clan-${color}`), kind: 'clan', color };
}

export function travelCard(color: FamilyColor | 'wild'): InfluenceCard {
  return { id: nextTestCardId(`travel-${color}`), kind: 'travel', color };
}

export function recruitmentCard(): InfluenceCard {
  return { id: nextTestCardId('recruitment'), kind: 'recruitment' };
}

export function stopCard(): InfluenceCard {
  return { id: nextTestCardId('stop'), kind: 'stop' };
}

export function imTheBossCard(): InfluenceCard {
  return { id: nextTestCardId('imTheBoss'), kind: 'imTheBoss' };
}

/** Applies PASS_WINDOW for every player except the current window trigger. */
export function passWindowAll(state: FullGameState, startAt = 5000): FullGameState {
  let current = state;
  let at = startAt;
  for (const player of current.players) {
    const window = current.window;
    if (!window) break;
    if (player.uid === window.triggeredBy) continue;
    current = ok(current, { type: 'PASS_WINDOW', uid: player.uid }, at).state;
    at += 10;
  }
  return current;
}

export function openDealAt(
  state: FullGameState,
  uid: string,
  space: number,
  extras: { clanCardIds?: string[]; excludeColors?: FamilyColor[] } = {},
): FullGameState {
  arrangeAfterMove(state, uid, space);
  return ok(state, { type: 'OPEN_DEAL', uid, ...extras }, 3000).state;
}

export function lockAndResolve(state: FullGameState, uid: string, at = 4000): FullGameState {
  const locked = ok(state, { type: 'LOCK_DEAL', uid }, at).state;
  return passWindowAll(locked, at + 10);
}
