import type { PendingTarget } from '@/engine/types';
import { th } from '@/i18n/th';
import type { RoomPlayers } from '@/net/roomTypes';

import type { ActionBlockReason } from './actionUtils';
import { getPlayerName } from './tableUtils';

export function fillText(
  template: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function actionBlockText(reason: ActionBlockReason | null): string | undefined {
  const text = th.game.table.actions;
  switch (reason) {
    case 'no-deal':
      return text.blockNoDeal;
    case 'no-travel-target':
      return text.blockTravel;
    case 'need-recruitment-cards':
      return text.blockRecruitmentCards;
    case 'no-recruitment-target':
      return text.blockRecruitmentTarget;
    case 'stop-no-window':
      return text.blockStopWindow;
    case 'stop-no-target':
      return text.blockStopTarget;
    case 'already-boss':
      return text.blockAlreadyBoss;
    default:
      return undefined;
  }
}

export function pendingTargetText(
  target: PendingTarget | undefined,
  players: RoomPlayers,
): string {
  if (!target) return '';
  const text = th.game.table.actions;

  if (target.kind === 'investor') {
    return fillText(text.targetInvestor, {
      name: getPlayerName(players, target.uid),
    });
  }

  if (target.kind === 'recruit') {
    return fillText(text.targetRecruit, { color: th.families[target.color] });
  }

  if (target.placement === 'bossClan') {
    return fillText(text.targetBossClan, { color: th.families[target.color] });
  }

  return fillText(text.targetOffer, {
    name: getPlayerName(players, target.uid),
  });
}
