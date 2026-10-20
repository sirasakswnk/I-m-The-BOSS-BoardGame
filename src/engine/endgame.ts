import { DEAL_TILES } from './config/dealTiles';
import { DEAL_TILE_COUNT, END_CHECK_FIRST_DEAL } from './config/rules';
import { randomInt } from './rng';
import type { FullGameState, GameEvent } from './types';

/**
 * Ends the game and freezes the final scores. Money stays private until this
 * point; from here on it is copied into the public projection (plan.md 4.4).
 */
export function finishGame(state: FullGameState, now: number): GameEvent[] {
  const finalScores: Record<string, number> = {};
  for (const player of state.players) finalScores[player.uid] = player.money;

  const bestScore = Math.max(...Object.values(finalScores));
  const winners = Object.keys(finalScores).filter((uid) => finalScores[uid] === bestScore);

  state.finalScores = finalScores;
  state.phase = 'gameOver';
  state.deal = null;
  state.window = null;
  state.pendingCards = [];
  state.onVacation = [];
  state.pendingDiscardUids = [];
  state.nextTurnUid = null;

  return [{ type: 'gameOver', at: now, finalScores, winners }];
}

/**
 * END_CHECK - plan.md section 3.4.
 * Returns the events produced; may set phase to gameOver.
 */
export function runEndCheck(state: FullGameState, now: number): GameEvent[] {
  if (state.dealsClosed >= DEAL_TILE_COUNT) {
    return finishGame(state, now);
  }

  if (state.dealsClosed < END_CHECK_FIRST_DEAL) return [];

  const tile = DEAL_TILES[state.dealsClosed - 1];
  if (!tile) return [];

  const roll = randomInt(state.rngState, 1, 6);
  state.rngState = roll.state;
  state.lastDice = [roll.value];

  const ends = tile.endCheckFaces.includes(roll.value);
  const events: GameEvent[] = [
    { type: 'endCheckRolled', at: now, tileNumber: tile.number, face: roll.value, ends },
  ];

  if (ends) events.push(...finishGame(state, now));
  return events;
}
