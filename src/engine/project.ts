import type { DealRequirementGroup } from './config/dealBoard';
import { PUBLIC_LOG_LIMIT } from './config/rules';
import type {
  FamilyColor,
  FullGameState,
  PrivateState,
  ProjectedState,
  PublicDeal,
  PublicOffer,
  PublicPendingCard,
  PublicState,
} from './types';

function copyGroups(groups: DealRequirementGroup[]): DealRequirementGroup[] {
  return groups.map((group) => ({ pick: group.pick, colors: [...group.colors] }));
}

function projectDeal(state: FullGameState): PublicDeal | null {
  const deal = state.deal;
  if (!deal) return null;

  const offers: Record<string, PublicOffer> = {};
  for (const uid of Object.keys(deal.offers)) {
    const offer = deal.offers[uid];
    if (!offer || offer.cards.length === 0) continue;
    offers[uid] = {
      cards: offer.cards.map((card) => ({ color: card.color, source: card.source })),
      amount: offer.amount,
      submittedAt: offer.submittedAt,
    };
  }

  return {
    space: deal.space,
    requirements: {
      index: deal.requirements.index,
      requiredInvestors: deal.requirements.requiredInvestors,
      dividends: deal.requirements.dividends,
      groups: copyGroups(deal.requirements.groups),
    },
    tileNumber: deal.tileNumber,
    bossClans: deal.bossClanCards.map((card) => card.color),
    offers,
    acceptedOffers: { ...deal.accepted },
    excludedColors: [...deal.excludedColors],
    locked: deal.locked,
  };
}

/**
 * Splits the full game state into a public projection and per-player private
 * states. Public state never contains hands, money, deck contents or card ids
 * (plan.md 4.4 and 5).
 */
export function project(state: FullGameState): ProjectedState {
  const tableInvestors: Record<string, FamilyColor[]> = {};
  const handCounts: Record<string, number> = {};
  const privateState: Record<string, PrivateState> = {};

  for (const player of state.players) {
    tableInvestors[player.uid] = [...player.investors];
    handCounts[player.uid] = player.hand.length;
    privateState[player.uid] = {
      hand: player.hand.map((card) => ({ ...card })),
      money: player.money,
    };
  }

  const pendingCards: PublicPendingCard[] = state.pendingCards.map((pending) => {
    // RTDB rejects writes that contain `undefined`, so optional fields must be
    // omitted rather than carried as keys with undefined values.
    const publicPending: PublicPendingCard = {
      id: pending.id,
      kind: pending.kind,
      playerUid: pending.playerUid,
    };
    if (pending.target) publicPending.target = pending.target;
    if (pending.stoppedBy) publicPending.stoppedBy = pending.stoppedBy;
    return publicPending;
  });

  const publicState: PublicState = {
    phase: state.phase,
    turnNumber: state.turnNumber,
    bossUid: state.bossUid,
    pawnSpace: state.pawnSpace,
    closedSpaces: [...state.closedSpaces],
    dealsClosed: state.dealsClosed,
    tableInvestors,
    unclaimedInvestors: [...state.unclaimedInvestors],
    onVacation: [...state.onVacation],
    handCounts,
    deckCount: state.deck.length,
    discardCount: state.discardPile.length,
    deal: projectDeal(state),
    pendingCards,
    window: state.window
      ? {
          reason: state.window.reason,
          triggeredBy: state.window.triggeredBy,
          deadline: state.window.deadline,
          passed: [...state.window.passed],
        }
      : null,
    lastDice: state.lastDice ? [...state.lastDice] : null,
    log: state.log.slice(-PUBLIC_LOG_LIMIT),
    finalScores: state.finalScores ? { ...state.finalScores } : null,
    pendingDiscardUids: [...state.pendingDiscardUids],
  };

  return { public: publicState, private: privateState };
}
