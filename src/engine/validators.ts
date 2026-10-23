import { DEAL_SPACE_COUNT, getDealSpace } from './config/dealBoard';
import type { DealSpace } from './config/dealBoard';
import { isFamilyColor } from './config/families';
import type { FamilyColor } from './config/families';
import type { InfluenceCard, InfluenceCardKind } from './config/influenceCards';
import type {
  DealState,
  FullGameState,
  OfferCardInput,
  OfferCardState,
  OfferSource,
  OfferState,
  PlayerState,
  RejectReason,
  TravelTarget,
} from './types';

/**
 * All game-rule checks live in this module (plan.md section 4.2).
 * A violated rule throws RuleError; applyAction turns it into a rejection.
 */
export class RuleError extends Error {
  readonly reason: RejectReason;

  constructor(reason: RejectReason) {
    super(reason);
    this.name = 'RuleError';
    this.reason = reason;
  }
}

export function reject(reason: RejectReason): never {
  throw new RuleError(reason);
}

/* ------------------------------------------------------------------ */
/* Players & phases                                                    */
/* ------------------------------------------------------------------ */

export function orderedPlayers(state: FullGameState): PlayerState[] {
  return [...state.players].sort((a, b) => a.seat - b.seat);
}

export function findPlayer(state: FullGameState, uid: string): PlayerState | undefined {
  return state.players.find((player) => player.uid === uid);
}

export function requirePlayer(state: FullGameState, uid: string): PlayerState {
  const player = findPlayer(state, uid);
  if (!player) reject('PLAYER_NOT_FOUND');
  return player;
}

export function requirePhase(state: FullGameState, ...phases: FullGameState['phase'][]): void {
  if (!phases.includes(state.phase)) reject('WRONG_PHASE');
}

export function requireBoss(state: FullGameState, uid: string): PlayerState {
  const player = requirePlayer(state, uid);
  if (state.bossUid !== uid) reject('NOT_BOSS');
  return player;
}

export function requireDeal(state: FullGameState): DealState {
  if (!state.deal) reject('NO_OPEN_DEAL');
  return state.deal;
}

export function requireNoWindow(state: FullGameState): void {
  if (state.window) reject('WINDOW_OPEN');
}

export function leftOf(state: FullGameState, uid: string): PlayerState {
  const players = orderedPlayers(state);
  const index = players.findIndex((player) => player.uid === uid);
  if (index < 0) reject('PLAYER_NOT_FOUND');
  return players[(index + 1) % players.length];
}

/* ------------------------------------------------------------------ */
/* Cards                                                               */
/* ------------------------------------------------------------------ */

export function findCard(player: PlayerState, cardId: string): InfluenceCard | undefined {
  return player.hand.find((card) => card.id === cardId);
}

export function requireCard(
  player: PlayerState,
  cardId: string,
  kind?: InfluenceCardKind,
): InfluenceCard {
  const card = findCard(player, cardId);
  if (!card) reject('CARD_NOT_IN_HAND');
  if (kind && card.kind !== kind) reject('WRONG_CARD_KIND');
  return card;
}

export function requireDistinctCards(cards: string[]): void {
  if (new Set(cards).size !== cards.length) reject('INVALID_ACTION');
}

/* ------------------------------------------------------------------ */
/* Board                                                               */
/* ------------------------------------------------------------------ */

export function isValidSpace(space: number): boolean {
  return Number.isInteger(space) && space >= 1 && space <= DEAL_SPACE_COUNT;
}

export function requireSpaceOpen(state: FullGameState, space: number): void {
  if (!isValidSpace(space)) reject('INVALID_SPACE');
  if (state.closedSpaces.includes(space)) reject('SPACE_CLOSED');
}

export function getAllowedColors(space: DealSpace): Set<FamilyColor> {
  const colors = new Set<FamilyColor>();
  for (const group of space.groups) {
    for (const color of group.colors) colors.add(color);
  }
  return colors;
}

export function isColorRequired(space: DealSpace, color: FamilyColor): boolean {
  return space.groups.some((group) => group.colors.includes(color));
}

/**
 * Boss overfill rule (plan.md 3.4 + ASSUMPTION 1): investors that auto-join
 * must not exceed a group's pick; the boss may only exclude families from a
 * group that is actually overfilled. Vacationing investors do not auto-join.
 */
export function validateExclusions(
  requirements: DealSpace,
  investors: readonly FamilyColor[],
  onVacation: readonly FamilyColor[],
  excluded: readonly FamilyColor[],
): void {
  const allowed = getAllowedColors(requirements);
  const autoJoin = investors.filter((color) => allowed.has(color) && !onVacation.includes(color));

  for (const color of excluded) {
    if (!autoJoin.includes(color)) reject('INVALID_EXCLUSION');
    const group = requirements.groups.find((candidate) => candidate.colors.includes(color));
    if (!group) reject('INVALID_EXCLUSION');
    const before = autoJoin.filter((candidate) => group.colors.includes(candidate)).length;
    if (before <= group.pick) reject('INVALID_EXCLUSION');
  }

  for (const group of requirements.groups) {
    const after = autoJoin.filter(
      (color) => group.colors.includes(color) && !excluded.includes(color),
    ).length;
    if (after > group.pick) reject('INVALID_EXCLUSION');
  }
}

export function requireDealSpace(index: number): DealSpace {
  if (!isValidSpace(index)) reject('INVALID_SPACE');
  return getDealSpace(index);
}

/** Next open space clockwise (1 step, skipping closed spaces). */
export function nextOpenSpace(from: number, closedSpaces: readonly number[]): number {
  for (let step = 1; step <= DEAL_SPACE_COUNT; step += 1) {
    const candidate = ((from - 1 + step) % DEAL_SPACE_COUNT) + 1;
    if (!closedSpaces.includes(candidate)) return candidate;
  }
  return from;
}

/** Moves `steps` open spaces clockwise; closed spaces do not count as steps. */
export function movePawn(from: number, steps: number, closedSpaces: readonly number[]): number {
  let position = from;
  let moved = 0;
  while (moved < steps) {
    position = (position % DEAL_SPACE_COUNT) + 1;
    if (!closedSpaces.includes(position)) moved += 1;
  }
  return position;
}

/* ------------------------------------------------------------------ */
/* Vacation                                                            */
/* ------------------------------------------------------------------ */

export function isColorOnVacation(state: FullGameState, color: FamilyColor): boolean {
  return state.onVacation.includes(color);
}

/* ------------------------------------------------------------------ */
/* Offers                                                              */
/* ------------------------------------------------------------------ */

export function findOffer(deal: DealState, uid: string): OfferState | undefined {
  return deal.offers[uid];
}

export function findOfferCard(
  offer: OfferState | undefined,
  color: FamilyColor,
  source?: OfferSource,
): OfferCardState | undefined {
  return offer?.cards.find(
    (card) => card.color === color && (source === undefined || card.source === source),
  );
}

export interface AcceptedOffer {
  uid: string;
  /** Every family in the accepted offer. */
  colors: FamilyColor[];
  offer: OfferState;
}

/** Accepted offers are grouped by player, so payout happens once per offer. */
export function getAcceptedOffers(deal: DealState): AcceptedOffer[] {
  const result: AcceptedOffer[] = [];
  for (const uid of Object.keys(deal.offers)) {
    const offer = deal.offers[uid];
    if (!offer) continue;
    const colors = offer.cards
      .map((card) => card.color)
      .filter((color) => deal.accepted[color] === uid);
    if (colors.length === 0) continue;
    result.push({ uid, colors, offer });
  }
  return result;
}

export function countAcceptedDividends(deal: DealState): number {
  return getAcceptedOffers(deal).reduce((total, entry) => total + entry.offer.amount, 0);
}

export interface ValidatedOffer {
  cards: OfferCardState[];
  amount: number;
  existing?: OfferState;
}

/**
 * Validates SUBMIT_OFFER as an upsert of the player's single offer. Sending a
 * different card list edits the offer; removed hand cards return to hand and an
 * accepted offer loses its acceptance automatically.
 */
export function validateSubmitOffer(
  state: FullGameState,
  player: PlayerState,
  cards: OfferCardInput[],
  amount: number,
): ValidatedOffer {
  const deal = requireDeal(state);
  requirePhase(state, 'dealOpen');
  requireNoWindow(state);
  if (deal.locked) reject('DEAL_LOCKED');
  if (state.bossUid === player.uid) reject('CANNOT_OFFER_AS_BOSS');
  if (!Array.isArray(cards)) reject('INVALID_ACTION');
  if (!Number.isInteger(amount) || amount < 1) reject('INVALID_AMOUNT');

  const existing = findOffer(deal, player.uid);
  if (cards.length === 0) {
    if (!existing) reject('OFFER_NOT_FOUND');
    return { cards: [], amount, existing };
  }

  const colors = new Set<FamilyColor>();
  const selected: OfferCardState[] = [];

  for (const input of cards) {
    if (!input || !isFamilyColor(input.color)) reject('INVALID_ACTION');
    if (input.source !== 'table' && input.source !== 'hand') reject('INVALID_ACTION');
    if (colors.has(input.color)) reject('INVALID_ACTION');
    colors.add(input.color);

    // A color already accepted from another player is a conflict. The boss must
    // cancel that acceptance before this offer can claim the same family.
    const acceptedUid = deal.accepted[input.color];
    if (acceptedUid && acceptedUid !== player.uid) reject('COLOR_ALREADY_IN_DEAL');

    if (input.source === 'table') {
      if (!player.investors.includes(input.color)) reject('INVALID_TARGET');
      if (isColorOnVacation(state, input.color)) reject('COLOR_ON_VACATION');
      selected.push({ color: input.color, source: 'table' });
      continue;
    }

    if (input.cardId) {
      const card = requireCard(player, input.cardId);
      if (card.kind !== 'clan') reject('WRONG_CARD_KIND');
      if (card.color !== input.color) reject('INVALID_TARGET');
      selected.push({ color: input.color, source: 'hand', card });
      continue;
    }

    // Existing hand cards are no longer in the player's hand, so they are
    // identified by family and reused without exposing their id publicly.
    const retained = findOfferCard(existing, input.color, 'hand');
    if (!retained?.card) reject('CARD_NOT_IN_HAND');
    selected.push({ color: input.color, source: 'hand', card: retained.card });
  }

  return { cards: selected, amount, existing };
}

/**
 * Validates ACCEPT_OFFER. One offer is accepted or rejected as a whole: every
 * family in it must be usable and no family may already belong to another
 * accepted offer.
 */
export function validateAcceptOffer(
  state: FullGameState,
  boss: PlayerState,
  targetUid: string,
): { offer: OfferState; deal: DealState; colors: FamilyColor[] } {
  const deal = requireDeal(state);
  requirePhase(state, 'dealOpen');
  requireNoWindow(state);
  if (deal.locked) reject('DEAL_LOCKED');
  if (state.bossUid !== boss.uid) reject('NOT_BOSS');
  if (targetUid === boss.uid) reject('CANNOT_ACCEPT_OWN_OFFER');

  const target = requirePlayer(state, targetUid);
  const offer = findOffer(deal, target.uid);
  if (!offer) reject('OFFER_NOT_FOUND');

  const colors = offer.cards.map((card) => card.color);
  if (colors.length === 0) reject('OFFER_NOT_FOUND');
  if (colors.some((color) => deal.accepted[color] === targetUid)) reject('OFFER_ACCEPTED');

  for (const color of colors) {
    if (!isColorRequired(deal.requirements, color)) reject('COLOR_NOT_REQUIRED');
    if (deal.accepted[color]) reject('COLOR_ALREADY_IN_DEAL');
    if (getBossFreeColors(state, deal).has(color)) reject('COLOR_ALREADY_IN_DEAL');
  }

  if (countAcceptedDividends(deal) + offer.amount > deal.requirements.dividends) {
    reject('DIVIDENDS_EXCEEDED');
  }

  return { offer, deal, colors };
}

/* ------------------------------------------------------------------ */
/* Participants & completeness                                         */
/* ------------------------------------------------------------------ */

/**
 * Colors participating for free because of the boss: their own investors
 * (unless excluded or on vacation) and clan cards they placed in the deal.
 */
export function getBossFreeColors(state: FullGameState, deal: DealState): Set<FamilyColor> {
  const colors = new Set<FamilyColor>();
  const bossUid = state.bossUid;
  const boss = bossUid ? findPlayer(state, bossUid) : undefined;
  const allowed = getAllowedColors(deal.requirements);

  if (boss) {
    for (const color of boss.investors) {
      if (!allowed.has(color)) continue;
      if (deal.excludedColors.includes(color)) continue;
      if (isColorOnVacation(state, color)) continue;
      colors.add(color);
    }
  }

  for (const card of deal.bossClanCards) colors.add(card.color);

  return colors;
}

export function getParticipatingColors(state: FullGameState, deal: DealState): Set<FamilyColor> {
  const colors = getBossFreeColors(state, deal);
  for (const color of Object.keys(deal.accepted) as FamilyColor[]) {
    if (deal.accepted[color]) colors.add(color);
  }
  return colors;
}

/**
 * The deal can be locked only when the participating colors exactly satisfy
 * every requirement group: no missing color, no extra color, exact total.
 * Duplicate representations of one family collapse to one color (the boss
 * investor is preferred over a placed clan card at resolution).
 */
export function isDealComplete(state: FullGameState): boolean {
  const deal = state.deal;
  if (!deal) return false;

  const colors = getParticipatingColors(state, deal);
  if (colors.size !== deal.requirements.requiredInvestors) return false;

  const allowed = getAllowedColors(deal.requirements);
  for (const color of colors) {
    if (!allowed.has(color)) return false;
  }

  for (const group of deal.requirements.groups) {
    let count = 0;
    for (const color of group.colors) {
      if (colors.has(color)) count += 1;
    }
    if (count !== group.pick) return false;
  }

  return true;
}

/* ------------------------------------------------------------------ */
/* Action-card targets                                                 */
/* ------------------------------------------------------------------ */

export function isTravelTarget(value: unknown): value is TravelTarget {
  if (!value || typeof value !== 'object') return false;
  const target = value as Record<string, unknown>;
  if (target.kind === 'investor') {
    return isFamilyColor(target.color) && typeof target.uid === 'string';
  }
  if (target.kind === 'clan') {
    return (
      isFamilyColor(target.color) &&
      typeof target.uid === 'string' &&
      (target.placement === 'bossClan' || target.placement === 'offer')
    );
  }
  return false;
}

export function travelCardMatches(card: InfluenceCard, color: FamilyColor): boolean {
  return card.kind === 'travel' && (card.color === 'wild' || card.color === color);
}

/** Validates PLAY_TRAVEL and normalizes the target. */
export function validateTravelTarget(
  state: FullGameState,
  player: PlayerState,
  card: InfluenceCard,
  target: TravelTarget,
): TravelTarget {
  const deal = requireDeal(state);
  if (card.kind !== 'travel') reject('WRONG_CARD_KIND');
  if (!isTravelTarget(target)) reject('INVALID_TARGET');
  if (!travelCardMatches(card, target.color)) reject('INVALID_TARGET');

  if (target.kind === 'investor') {
    if (target.uid === player.uid) reject('TARGET_IS_SELF');
    const owner = requirePlayer(state, target.uid);
    if (!owner.investors.includes(target.color)) reject('INVALID_TARGET');
    if (isColorOnVacation(state, target.color)) reject('COLOR_ON_VACATION');
    return target;
  }

  const owner = requirePlayer(state, target.uid);
  if (target.placement === 'bossClan') {
    if (target.uid !== state.bossUid) reject('INVALID_TARGET');
    if (!deal.bossClanCards.some((clan) => clan.color === target.color)) {
      reject('INVALID_TARGET');
    }
    return target;
  }

  const offer = findOffer(deal, owner.uid);
  if (!findOfferCard(offer, target.color, 'hand')) reject('INVALID_TARGET');
  return target;
}

/** Validates PLAY_RECRUITMENT's three-card group and target color. */
export function validateRecruitment(
  state: FullGameState,
  player: PlayerState,
  cardIds: string[],
  targetColor: FamilyColor,
): { cards: InfluenceCard[]; from: 'unclaimed' | 'player'; ownerUid?: string } {
  requireDeal(state);
  if (!isFamilyColor(targetColor)) reject('INVALID_ACTION');
  if (!Array.isArray(cardIds) || cardIds.length !== 3 || new Set(cardIds).size !== 3) {
    reject('INVALID_RECRUITMENT_CARDS');
  }

  const cards = cardIds.map((cardId) => requireCard(player, cardId));
  if (cards.some((card) => card.kind !== 'recruitment')) reject('INVALID_RECRUITMENT_CARDS');

  if (state.unclaimedInvestors.length > 0) {
    if (!state.unclaimedInvestors.includes(targetColor)) reject('UNCLAIMED_INVESTORS_REMAIN');
    return { cards, from: 'unclaimed' };
  }

  if (player.investors.includes(targetColor)) reject('TARGET_IS_SELF');
  const owner = state.players.find(
    (candidate) => candidate.uid !== player.uid && candidate.investors.includes(targetColor),
  );
  if (!owner) reject('NO_INVESTOR_TARGET');
  return { cards, from: 'player', ownerUid: owner.uid };
}

export function validateStopTarget(
  state: FullGameState,
  player: PlayerState,
  targetPendingId: string,
): { pendingIndex: number } {
  if (typeof targetPendingId !== 'string') reject('INVALID_ACTION');
  const pendingIndex = state.pendingCards.findIndex((pending) => pending.id === targetPendingId);
  if (pendingIndex < 0) reject('PENDING_NOT_FOUND');

  const pending = state.pendingCards[pendingIndex];
  if (pending.stoppedBy) reject('STOP_ALREADY_PLAYED');
  if (pending.playerUid === player.uid) reject('CANNOT_STOP_OWN_CARD');
  return { pendingIndex };
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

export function sortPending<T extends { ts: number; seq: number }>(pending: T[]): T[] {
  return [...pending].sort((a, b) => (a.ts === b.ts ? a.seq - b.seq : a.ts - b.ts));
}
