import type { GameEvent } from '@/engine/types';
import { th } from '@/i18n/th';
import type { RoomPlayers } from '@/net/roomTypes';

import { getPlayerName } from './tableUtils';

function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function formatLogEvent(event: GameEvent, players: RoomPlayers): string {
  const name = (uid: string | null | undefined) => getPlayerName(players, uid);
  const color = (value: keyof typeof th.families) => th.families[value];
  const log = th.game.table.log;

  switch (event.type) {
    case 'gameStarted':
      return fill(log.gameStarted, { count: event.playerCount });
    case 'playerJoined':
      return fill(log.playerJoined, { name: event.name, seat: event.seat + 1 });
    case 'playerLeft':
      return log.playerLeft;
    case 'seatReassigned':
      return fill(log.seatReassigned, { name: name(event.uid), seat: event.seat + 1 });
    case 'turnStarted':
      return fill(log.turnStarted, {
        name: name(event.uid),
        turn: event.turnNumber,
      });
    case 'startSpacePicked':
      return fill(log.startSpacePicked, { name: name(event.uid), space: event.space });
    case 'dealOpened':
      return fill(log.dealOpened, {
        name: name(event.uid),
        space: event.space,
        tile: event.tileNumber,
      });
    case 'diceRolled':
      return fill(log.diceRolled, {
        name: name(event.uid),
        face: event.face,
        from: event.from,
        to: event.to,
      });
    case 'cardsDrawn':
      return fill(log.cardsDrawn, { name: name(event.uid), count: event.count });
    case 'offerSubmitted':
      return fill(log.offerSubmitted, {
        name: name(event.uid),
        color: color(event.color),
        amount: event.amount,
      });
    case 'offerWithdrawn':
      return fill(log.offerWithdrawn, {
        name: name(event.uid),
        color: color(event.color),
      });
    case 'offerAccepted':
      return fill(log.offerAccepted, {
        name: name(event.uid),
        color: color(event.color),
        amount: event.amount,
      });
    case 'offerUnaccepted':
      return fill(log.offerUnaccepted, { color: color(event.color) });
    case 'clanAdded':
      return fill(log.clanAdded, {
        name: name(event.uid),
        color: color(event.color),
      });
    case 'excludedColorsSet':
      return fill(log.excludedColorsSet, {
        name: name(event.uid),
        colors: event.colors.map(color).join(', '),
      });
    case 'dealLocked':
      return fill(log.dealLocked, { name: name(event.uid) });
    case 'lockCancelled':
      return fill(log.lockCancelled, { name: name(event.uid) });
    case 'dealUnlocked':
      return log.dealUnlocked;
    case 'cardPlayed': {
      const template = event.targetColor ? log.cardPlayedTarget : log.cardPlayed;
      return fill(template, {
        name: name(event.uid),
        card: th.game.cards[event.kind],
        color: event.targetColor ? color(event.targetColor) : '',
      });
    }
    case 'cardStopped':
      return fill(log.cardStopped, {
        by: name(event.byUid),
        name: name(event.uid),
      });
    case 'cardResolved':
      return fill(log.cardResolved, { name: name(event.uid) });
    case 'cardFizzled':
      return fill(log.cardFizzled, { name: name(event.uid) });
    case 'bossStolen':
      return fill(log.bossStolen, {
        to: name(event.toUid),
        from: name(event.fromUid),
      });
    case 'dealResolved':
      return fill(log.dealResolved, {
        name: name(event.bossUid),
        space: event.space,
        tile: event.tileNumber,
      });
    case 'dealFailed':
      return fill(log.dealFailed, { name: name(event.uid), space: event.space });
    case 'pawnsMoved':
      return fill(log.pawnsMoved, { from: event.from, to: event.to });
    case 'endCheckRolled':
      return fill(event.ends ? log.endCheckEnds : log.endCheckRolled, {
        face: event.face,
      });
    case 'gameOver':
      return log.gameOver;
    case 'discardRequired':
      return log.discardRequired;
    case 'cardsDiscarded':
      return fill(log.cardsDiscarded, { name: name(event.uid), count: event.count });
    case 'bossSkipped':
      return fill(log.bossSkipped, { name: name(event.uid) });
    default:
      return log.unknown;
  }
}
