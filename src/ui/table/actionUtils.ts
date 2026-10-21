import { FAMILY_ORDER, type FamilyColor } from '@/engine/config/families';
import type { InfluenceCard } from '@/engine/config/influenceCards';
import { RECRUITMENT_PLAY_COUNT } from '@/engine/config/rules';
import type {
  PublicPendingCard,
  PublicState,
  TravelTarget,
} from '@/engine/types';

export type ActionCardKind = 'travel' | 'recruitment' | 'stop' | 'imTheBoss';
export type ActionCard = Extract<InfluenceCard, { kind: ActionCardKind }>;

export type ActionBlockReason =
  | 'no-deal'
  | 'no-travel-target'
  | 'need-recruitment-cards'
  | 'no-recruitment-target'
  | 'stop-no-window'
  | 'stop-no-target'
  | 'already-boss';

export interface TravelTargetOption {
  target: TravelTarget;
  color: FamilyColor;
  ownerUid: string;
  placement: 'investor' | 'bossClan' | 'offer';
}

export interface RecruitmentTargetOption {
  color: FamilyColor;
  from: 'unclaimed' | 'player';
  ownerUid: string | null;
}

export interface StopTargetOption {
  pendingId: string;
  pending: PublicPendingCard;
}

export interface WindowPassInfo {
  triggeredBy: string;
  eligibleUids: string[];
  passedUids: string[];
  total: number;
  passed: number;
}

const ACTION_KIND_ORDER: Record<ActionCardKind, number> = {
  travel: 0,
  recruitment: 1,
  stop: 2,
  imTheBoss: 3,
};

export function isActionCard(card: InfluenceCard): card is ActionCard {
  return card.kind !== 'clan';
}

/** Action cards in a stable hand order: kind first, then id. */
export function getActionCards(hand: readonly InfluenceCard[]): ActionCard[] {
  return hand
    .filter(isActionCard)
    .sort(
      (left, right) =>
        ACTION_KIND_ORDER[left.kind] - ACTION_KIND_ORDER[right.kind] ||
        left.id.localeCompare(right.id, 'en', { numeric: true }),
    );
}

export function travelTargetKey(target: TravelTarget): string {
  return target.kind === 'investor'
    ? `investor-${target.uid}-${target.color}`
    : `clan-${target.placement}-${target.uid}-${target.color}`;
}

function colorIndex(color: FamilyColor): number {
  return FAMILY_ORDER.indexOf(color);
}

function matchesTravelColor(card: ActionCard, color: FamilyColor): boolean {
  return card.kind === 'travel' && (card.color === 'wild' || card.color === color);
}

/**
 * Travel targets visible in the public projection. Only other players'
 * investors, the boss's placed clan cards, and hand offers can be hit.
 * Table offers have no clan card on the table, so they are never targets.
 */
export function getTravelTargets(
  state: PublicState,
  uid: string,
  card: ActionCard,
): TravelTargetOption[] {
  if (card.kind !== 'travel') return [];
  const options: TravelTargetOption[] = [];

  for (const [ownerUid, colors] of Object.entries(state.tableInvestors)) {
    if (ownerUid === uid) continue;
    for (const color of colors) {
      if (!matchesTravelColor(card, color)) continue;
      if (state.onVacation.includes(color)) continue;
      options.push({
        target: { kind: 'investor', color, uid: ownerUid },
        color,
        ownerUid,
        placement: 'investor',
      });
    }
  }

  const deal = state.deal;
  if (deal && state.bossUid) {
    for (const color of deal.bossClans) {
      if (!matchesTravelColor(card, color)) continue;
      options.push({
        target: {
          kind: 'clan',
          color,
          uid: state.bossUid,
          placement: 'bossClan',
        },
        color,
        ownerUid: state.bossUid,
        placement: 'bossClan',
      });
    }

    for (const [ownerUid, offers] of Object.entries(deal.offers)) {
      for (const color of FAMILY_ORDER) {
        const offer = offers?.[color];
        if (offer?.source !== 'hand') continue;
        if (!matchesTravelColor(card, color)) continue;
        options.push({
          target: {
            kind: 'clan',
            color,
            uid: ownerUid,
            placement: 'offer',
          },
          color,
          ownerUid,
          placement: 'offer',
        });
      }
    }
  }

  return options.sort(
    (left, right) =>
      colorIndex(left.color) - colorIndex(right.color) ||
      left.placement.localeCompare(right.placement) ||
      left.ownerUid.localeCompare(right.ownerUid),
  );
}

/** Unclaimed investors must be recruited first (plan.md 3.5). */
export function getRecruitmentTargets(
  state: PublicState,
  uid: string,
): RecruitmentTargetOption[] {
  if (state.unclaimedInvestors.length > 0) {
    return [...state.unclaimedInvestors]
      .sort((left, right) => colorIndex(left) - colorIndex(right))
      .map((color) => ({ color, from: 'unclaimed', ownerUid: null }));
  }

  const options: RecruitmentTargetOption[] = [];
  const seen = new Set<FamilyColor>();
  for (const [ownerUid, colors] of Object.entries(state.tableInvestors)) {
    if (ownerUid === uid) continue;
    for (const color of colors) {
      // PLAY_RECRUITMENT only carries a color; the engine recruits from the
      // first owner. Show that color once so the picker cannot imply a choice
      // between identical colors.
      if (seen.has(color)) continue;
      seen.add(color);
      options.push({ color, from: 'player', ownerUid });
    }
  }

  return options.sort(
    (left, right) =>
      colorIndex(left.color) - colorIndex(right.color) ||
      (left.ownerUid ?? '').localeCompare(right.ownerUid ?? ''),
  );
}

export function getStopTargets(
  state: PublicState,
  uid: string,
): StopTargetOption[] {
  if (!state.window) return [];
  return state.pendingCards
    .filter((pending) => !pending.stoppedBy && pending.playerUid !== uid)
    .map((pending) => ({ pendingId: pending.id, pending }));
}

export function getActionBlockReason(
  card: ActionCard,
  state: PublicState,
  uid: string,
  hand: readonly InfluenceCard[],
): ActionBlockReason | null {
  if (state.phase !== 'dealOpen' || !state.deal) return 'no-deal';

  switch (card.kind) {
    case 'travel':
      return getTravelTargets(state, uid, card).length > 0
        ? null
        : 'no-travel-target';
    case 'recruitment': {
      const count = hand.filter((held) => held.kind === 'recruitment').length;
      if (count < RECRUITMENT_PLAY_COUNT) return 'need-recruitment-cards';
      return getRecruitmentTargets(state, uid).length > 0
        ? null
        : 'no-recruitment-target';
    }
    case 'stop':
      if (!state.window) return 'stop-no-window';
      return getStopTargets(state, uid).length > 0 ? null : 'stop-no-target';
    case 'imTheBoss':
      return state.bossUid === uid ? 'already-boss' : null;
  }
}

export function hasPlayableAction(
  state: PublicState,
  uid: string,
  hand: readonly InfluenceCard[],
): boolean {
  return getActionCards(hand).some(
    (card) => getActionBlockReason(card, state, uid, hand) === null,
  );
}

/**
 * Pass progress ignores the player who opened the window, matching
 * closeIfAllPassed in the engine. A disconnected player is not auto-passed in
 * M6; that resilience work belongs to M9.
 */
export function getWindowPassInfo(state: PublicState): WindowPassInfo | null {
  const window = state.window;
  if (!window) return null;

  const eligibleUids = Object.keys(state.tableInvestors).filter(
    (uid) => uid !== window.triggeredBy,
  );
  const passedUids = eligibleUids.filter((uid) => window.passed.includes(uid));

  return {
    triggeredBy: window.triggeredBy,
    eligibleUids,
    passedUids,
    total: eligibleUids.length,
    passed: passedUids.length,
  };
}
