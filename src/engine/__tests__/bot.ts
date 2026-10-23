import type { DealSpace } from '../config/dealBoard';
import { DEAL_TILES } from '../config/dealTiles';
import type { FamilyColor } from '../config/families';
import { HAND_LIMIT } from '../config/rules';
import { applyAction } from '../reducer';
import { normalizeSeed, randomInt } from '../rng';
import { createInitialState } from '../setup';
import type { FullGameState, GameAction, GameEvent, PlayerState } from '../types';
import {
  countAcceptedDividends,
  getAllowedColors,
  getParticipatingColors,
  isColorRequired,
  isDealComplete,
  requireDealSpace,
} from '../validators';

export interface SimulationSummary {
  seed: number;
  steps: number;
  deals: number;
  totalPaid: number;
  finalScores: Record<string, number>;
  endReason: 'endCheck' | 'fifteenDeals';
}

interface BotRng {
  state: number;
}

interface InternalSummary {
  totalPaid: number;
  deals: number;
  expectedTile: number;
  spaces: Set<number>;
  gameOverEvents: number;
  winners: string[];
  endReason: SimulationSummary['endReason'] | null;
}

interface ActResult {
  state: FullGameState;
  events: GameEvent[];
}

class Clock {
  private value = 1000;

  next(state: FullGameState): number {
    if (state.window) return Math.max(this.value, state.window.deadline - 10);
    this.value += 10;
    return this.value;
  }

  commit(at: number): void {
    if (at > this.value) this.value = at;
  }
}

function botInt(rng: BotRng, min: number, max: number): number {
  const step = randomInt(rng.state, min, max);
  rng.state = step.state;
  return step.value;
}

function getPlayer(state: FullGameState, uid: string): PlayerState {
  const player = state.players.find((candidate) => candidate.uid === uid);
  if (!player) throw new Error(`Unknown player ${uid}`);
  return player;
}

function mustAct(state: FullGameState, action: GameAction, clock: Clock): ActResult {
  const at = clock.next(state);
  const result = applyAction(state, action, at);
  if ('error' in result) {
    throw new Error(`Bot action ${action.type} rejected: ${result.error}`);
  }
  clock.commit(at);
  return result;
}

function assertCards(state: FullGameState): void {
  const ids = new Set<string>();
  const add = (id: string): void => {
    if (ids.has(id)) throw new Error(`Duplicate card ${id}`);
    ids.add(id);
  };

  for (const player of state.players) {
    for (const card of player.hand) add(card.id);
  }
  for (const card of state.deck) add(card.id);
  for (const card of state.discardPile) add(card.id);

  if (state.deal) {
    for (const card of state.deal.actionCards) add(card.id);
    for (const card of state.deal.bossClanCards) add(card.id);
    for (const byColor of Object.values(state.deal.offers)) {
      if (!byColor) continue;
      for (const offer of Object.values(byColor)) {
        if (offer?.card) add(offer.card.id);
      }
    }
  }

  if (ids.size !== 98) {
    throw new Error(`Card conservation failed: ${ids.size} cards in play`);
  }
}

function assertMoney(state: FullGameState, expected: number): void {
  const total = state.players.reduce((sum, player) => sum + player.money, 0);
  if (total !== expected) {
    throw new Error(`Money conservation failed: ${total} != ${expected}`);
  }
}

function openDealAction(state: FullGameState): GameAction {
  const bossUid = state.bossUid;
  if (!bossUid) throw new Error('No boss for OPEN_DEAL');
  const requirements: DealSpace = requireDealSpace(state.pawnSpace);
  const boss = getPlayer(state, bossUid);
  const allowed = getAllowedColors(requirements);
  const autoJoin = boss.investors.filter(
    (color) => allowed.has(color) && !state.onVacation.includes(color),
  );

  const excludeColors: FamilyColor[] = [];
  for (const group of requirements.groups) {
    const inGroup = autoJoin.filter((color) => group.colors.includes(color));
    const excess = inGroup.length - group.pick;
    if (excess > 0) excludeColors.push(...inGroup.slice(-excess));
  }

  return { type: 'OPEN_DEAL', uid: bossUid, excludeColors };
}

function groupCount(
  state: FullGameState,
  deal: NonNullable<FullGameState['deal']>,
  group: DealSpace['groups'][number],
): number {
  const participating = getParticipatingColors(state, deal);
  return group.colors.filter((color) => participating.has(color)).length;
}

/** An offer is blocked when accepting it would be invalid or overfill a group. */
function offerIsBlocked(
  deal: NonNullable<FullGameState['deal']>,
  offer: NonNullable<FullGameState['deal']>['offers'][string],
  ownUid: string,
  participating: Set<FamilyColor>,
): boolean {
  const colors = offer.cards.map((card) => card.color);
  if (colors.length === 0) return true;
  if (colors.some((color) => !isColorRequired(deal.requirements, color))) return true;

  // Editing an offer revokes its own acceptance, so ignore those colors when
  // deciding whether it can be extended and accepted again.
  const effective = new Set(participating);
  for (const color of colors) {
    if (deal.accepted[color] === ownUid) effective.delete(color);
  }
  if (colors.some((color) => effective.has(color))) return true;

  const ownAccepted = colors.some((color) => deal.accepted[color] === ownUid);
  const acceptedTotal =
    countAcceptedDividends(deal) - (ownAccepted ? offer.amount : 0);
  if (acceptedTotal + offer.amount > deal.requirements.dividends) return true;

  for (const group of deal.requirements.groups) {
    const current = group.colors.filter((color) => effective.has(color)).length;
    const adding = colors.filter((color) => group.colors.includes(color)).length;
    if (current + adding > group.pick) return true;
  }
  return false;
}

function offerCardsWith(
  offer: NonNullable<FullGameState['deal']>['offers'][string] | undefined,
  input: { color: FamilyColor; source: 'table' | 'hand'; cardId?: string },
  amount: number,
): { cards: Array<{ color: FamilyColor; source: 'table' | 'hand'; cardId?: string }>; amount: number } {
  if (!offer) return { cards: [input], amount };
  return {
    cards: [
      ...offer.cards.map((card) => ({ color: card.color, source: card.source })),
      input,
    ],
    amount: offer.amount,
  };
}

function findGroupAction(
  state: FullGameState,
  deal: NonNullable<FullGameState['deal']>,
  group: DealSpace['groups'][number],
): GameAction | null {
  const bossUid = state.bossUid;
  if (!bossUid) return null;
  const boss = getPlayer(state, bossUid);
  const participating = getParticipatingColors(state, deal);
  const candidates = group.colors.filter((color) => !participating.has(color));

  // 1. Free clan card from the boss.
  for (const color of candidates) {
    const card = boss.hand.find((entry) => entry.kind === 'clan' && entry.color === color);
    if (card) return { type: 'BOSS_ADD_CLAN', uid: bossUid, cardId: card.id };
  }

  // 2. Accept an existing whole offer that helps fill this group.
  for (const uid of Object.keys(deal.offers)) {
    if (uid === bossUid) continue;
    const offer = deal.offers[uid];
    if (!offer) continue;
    const alreadyAccepted = offer.cards.every((card) => deal.accepted[card.color] === uid);
    if (alreadyAccepted) continue;
    if (offerIsBlocked(deal, offer, uid, participating)) continue;
    const helps = offer.cards.some(
      (card) => group.colors.includes(card.color) && !participating.has(card.color),
    );
    if (!helps) continue;
    return { type: 'ACCEPT_OFFER', uid: bossUid, targetUid: uid };
  }

  // 3. Ask a player who can provide the family on the table.
  for (const color of candidates) {
    for (const player of state.players) {
      if (player.uid === bossUid) continue;
      const existing = deal.offers[player.uid];
      if (player.investors.includes(color) && !state.onVacation.includes(color)) {
        if (existing && offerIsBlocked(deal, existing, player.uid, participating)) {
          return { type: 'WITHDRAW_OFFER', uid: player.uid };
        }
        if (existing?.cards.some((card) => card.color === color)) continue;
        const input = { color, source: 'table' as const };
        const merged = offerCardsWith(existing, input, 1);
        return {
          type: 'SUBMIT_OFFER',
          uid: player.uid,
          cards: merged.cards,
          amount: merged.amount,
        };
      }
    }
    for (const player of state.players) {
      if (player.uid === bossUid) continue;
      const existing = deal.offers[player.uid];
      const card = player.hand.find((entry) => entry.kind === 'clan' && entry.color === color);
      if (!card) continue;
      if (existing && offerIsBlocked(deal, existing, player.uid, participating)) {
        return { type: 'WITHDRAW_OFFER', uid: player.uid };
      }
      if (existing?.cards.some((entry) => entry.color === color)) continue;
      const input = { color, source: 'hand' as const, cardId: card.id };
      const merged = offerCardsWith(existing, input, 1);
      return {
        type: 'SUBMIT_OFFER',
        uid: player.uid,
        cards: merged.cards,
        amount: merged.amount,
      };
    }
  }

  // 4. Recruit an unclaimed investor for a missing family.
  for (const color of candidates) {
    if (!state.unclaimedInvestors.includes(color)) continue;
    const recruiters = [boss, ...state.players.filter((player) => player.uid !== bossUid)];
    for (const player of recruiters) {
      const cards = player.hand.filter((entry) => entry.kind === 'recruitment').slice(0, 3);
      if (cards.length === 3) {
        return {
          type: 'PLAY_RECRUITMENT',
          uid: player.uid,
          cardIds: cards.map((card) => card.id),
          targetColor: color,
        };
      }
    }
  }

  return null;
}

function chooseDealAction(
  state: FullGameState,
  deal: NonNullable<FullGameState['deal']>,
): GameAction | null {
  for (const group of deal.requirements.groups) {
    if (groupCount(state, deal, group) >= group.pick) continue;
    const action = findGroupAction(state, deal, group);
    if (action) return action;
  }
  return null;
}

function passWindowBot(
  state: FullGameState,
  clock: Clock,
  record?: (events: GameEvent[]) => void,
): FullGameState {
  let current = state;
  let guard = 0;

  while (current.window) {
    guard += 1;
    if (guard > 20) throw new Error('Interrupt window did not close');
    const window = current.window;
    const candidate = current.players.find(
      (player) => player.uid !== window.triggeredBy && !window.passed.includes(player.uid),
    );
    if (!candidate) throw new Error('No player left to pass the window');
    const result = mustAct(current, { type: 'PASS_WINDOW', uid: candidate.uid }, clock);
    record?.(result.events);
    current = result.state;
  }

  return current;
}

function negotiate(state: FullGameState, clock: Clock): FullGameState {
  let current = state;
  const bossUid = current.bossUid;
  if (!bossUid) throw new Error('No boss during negotiation');

  for (let step = 0; step < 100; step += 1) {
    const deal = current.deal;
    if (!deal) throw new Error('Deal disappeared during negotiation');
    if (current.window) {
      current = passWindowBot(current, clock);
      continue;
    }
    if (deal.locked) return current;

    if (isDealComplete(current)) {
      const locked = mustAct(current, { type: 'LOCK_DEAL', uid: bossUid }, clock);
      return locked.state;
    }

    const action = chooseDealAction(current, deal);
    if (!action) {
      const failed = mustAct(current, { type: 'FAIL_DEAL', uid: bossUid }, clock);
      return failed.state;
    }

    const result = mustAct(current, action, clock);
    current = result.state;
    if (current.window) current = passWindowBot(current, clock);
  }

  throw new Error('Negotiation did not converge');
}

/** Plays one seeded 3-player game to game over, checking invariants. */
export function playSimulation(seed: number): SimulationSummary {
  const rng: BotRng = { state: normalizeSeed(seed ^ 0x85ebca6b) };
  const clock = new Clock();
  const players = ['p1', 'p2', 'p3'].map((uid) => ({ uid, name: uid.toUpperCase() }));
  const playerUids = new Set(players.map((player) => player.uid));

  let state = createInitialState(seed, players);
  const summary: InternalSummary = {
    totalPaid: 0,
    deals: 0,
    expectedTile: 1,
    spaces: new Set<number>(),
    gameOverEvents: 0,
    winners: [],
    endReason: null,
  };

  const record = (events: GameEvent[]): void => {
    for (const event of events) {
      if (event.type === 'dealResolved') {
        const tile = DEAL_TILES[event.tileNumber - 1];
        if (!tile) throw new Error(`Unknown tile ${event.tileNumber}`);
        if (tile.valuePerDividend !== event.valuePerDividend) {
          throw new Error(`Wrong tile value at ${event.tileNumber}`);
        }
        if (event.tileNumber !== summary.expectedTile) {
          throw new Error(`Tile out of order: ${event.tileNumber} != ${summary.expectedTile}`);
        }
        if (summary.spaces.has(event.space)) {
          throw new Error(`Space ${event.space} resolved twice`);
        }
        if (!playerUids.has(event.bossUid)) throw new Error('Unknown boss in deal event');
        const board = requireDealSpace(event.space);
        if (board.dividends !== event.dividends) throw new Error('Dividend snapshot mismatch');
        if (event.totalPaid !== event.dividends * event.valuePerDividend) {
          throw new Error('totalPaid does not match dividends x value');
        }
        const acceptedSum = event.accepted.reduce((sum, entry) => sum + entry.amount, 0);
        if (event.bossDividends + acceptedSum !== event.dividends) {
          throw new Error('Accepted amounts do not add up to dividends');
        }
        const colors = new Set<string>();
        const acceptedUids = new Set<string>();
        for (const entry of event.accepted) {
          if (entry.amount < 1) throw new Error('Accepted amount below 1');
          if (!playerUids.has(entry.uid)) throw new Error('Unknown offer owner');
          if (acceptedUids.has(entry.uid)) throw new Error('Offer paid more than once');
          acceptedUids.add(entry.uid);
          for (const color of entry.colors) {
            if (colors.has(color)) throw new Error('Duplicate accepted color');
            colors.add(color);
          }
        }
        summary.totalPaid += event.totalPaid;
        summary.deals += 1;
        summary.expectedTile += 1;
        summary.spaces.add(event.space);
      }

      if (event.type === 'endCheckRolled') {
        if (event.tileNumber !== summary.deals) {
          throw new Error('End check is not tied to the resolved tile');
        }
        const tile = DEAL_TILES[event.tileNumber - 1];
        if (!tile) throw new Error('End check on unknown tile');
        if (event.face < 1 || event.face > 6) throw new Error('Invalid die face');
        if (event.ends !== tile.endCheckFaces.includes(event.face)) {
          throw new Error('End check result mismatch');
        }
        if (event.ends) summary.endReason = 'endCheck';
      }

      if (event.type === 'gameOver') {
        summary.gameOverEvents += 1;
        summary.winners = [...event.winners];
        summary.endReason ??= 'fifteenDeals';
      }
    }
  };

  let result = mustAct(state, { type: 'START_GAME', uid: 'p1' }, clock);
  record(result.events);
  state = result.state;

  let steps = 0;
  while (state.phase !== 'gameOver') {
    steps += 1;
    if (steps > 20000) {
      throw new Error(`Stalled at phase ${state.phase}, deals ${state.dealsClosed}`);
    }

    if (state.window) {
      state = passWindowBot(state, clock, record);
    } else if (state.phase === 'turnEndDiscard') {
      const uid = state.pendingDiscardUids[0];
      if (!uid) throw new Error('Discard phase without a player');
      const player = getPlayer(state, uid);
      const excess = player.hand.length - HAND_LIMIT;
      if (excess <= 0) throw new Error('Discard phase without excess cards');
      const cardIds = player.hand.slice(0, excess).map((card) => card.id);
      result = mustAct(state, { type: 'DISCARD', uid, cardIds }, clock);
      record(result.events);
      state = result.state;
    } else if (state.phase === 'turnStart') {
      const bossUid = state.bossUid;
      if (!bossUid) throw new Error('No boss at turn start');
      result = mustAct(state, { type: 'ROLL_DICE', uid: bossUid }, clock);
      record(result.events);
      state = result.state;
    } else if (state.phase === 'afterMove') {
      const bossUid = state.bossUid;
      if (!bossUid) throw new Error('No boss after move');
      if (state.pawnSpace < 1 || state.closedSpaces.includes(state.pawnSpace)) {
        result = mustAct(state, { type: 'DRAW_CARDS', uid: bossUid }, clock);
      } else if (botInt(rng, 0, 99) < 35) {
        result = mustAct(state, { type: 'DRAW_CARDS', uid: bossUid }, clock);
      } else {
        result = mustAct(state, openDealAction(state), clock);
      }
      record(result.events);
      state = result.state;
    } else if (state.phase === 'dealOpen') {
      state = negotiate(state, clock);
    } else {
      throw new Error(`Unexpected phase ${state.phase}`);
    }

    if (steps % 25 === 0) {
      assertCards(state);
      assertMoney(state, summary.totalPaid);
    }
  }

  assertCards(state);
  assertMoney(state, summary.totalPaid);

  if (summary.gameOverEvents !== 1) throw new Error('Expected exactly one gameOver event');
  if (state.phase !== 'gameOver') throw new Error('Game did not end');
  if (state.deal || state.window || state.pendingCards.length > 0) {
    throw new Error('Game over left an active deal or window');
  }
  if (state.dealsClosed < 10 || state.dealsClosed > 15) {
    throw new Error(`Invalid deal count ${state.dealsClosed}`);
  }
  if (summary.deals !== state.dealsClosed) throw new Error('Deal count mismatch');
  if (summary.expectedTile !== state.dealsClosed + 1) {
    throw new Error('Tile sequence mismatch');
  }
  if (state.closedSpaces.length !== state.dealsClosed) {
    throw new Error('Closed space count mismatch');
  }
  if (new Set(state.closedSpaces).size !== state.closedSpaces.length) {
    throw new Error('Duplicate closed space');
  }
  for (const space of state.closedSpaces) {
    if (!summary.spaces.has(space)) throw new Error(`Closed space ${space} has no event`);
  }
  if (!state.finalScores) throw new Error('Missing final scores');
  const money: Record<string, number> = {};
  for (const player of state.players) money[player.uid] = player.money;
  for (const uid of Object.keys(money)) {
    if (state.finalScores[uid] !== money[uid]) throw new Error('Final score mismatch');
  }
  if (state.onVacation.length > 0) throw new Error('Vacation left at game over');
  if (state.pendingDiscardUids.length > 0) throw new Error('Pending discard at game over');
  if (state.nextTurnUid) throw new Error('Next turn left at game over');

  const best = Math.max(...Object.values(money));
  const expectedWinners = Object.keys(money)
    .filter((uid) => money[uid] === best)
    .sort();
  const actualWinners = [...summary.winners].sort();
  if (expectedWinners.join(',') !== actualWinners.join(',')) {
    throw new Error('Winner mismatch');
  }

  return {
    seed,
    steps,
    deals: summary.deals,
    totalPaid: summary.totalPaid,
    finalScores: { ...state.finalScores },
    endReason: summary.endReason ?? 'fifteenDeals',
  };
}
