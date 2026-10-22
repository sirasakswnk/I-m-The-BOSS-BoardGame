import type { FullGameState } from '@/engine/types';
import type { RoomPlayers } from '@/net/roomTypes';

export interface RematchPreparation {
  state: FullGameState;
  removedUids: string[];
}

/**
 * Rematch reuses the room and seats, but players whose presence is offline are
 * not carried into the next game. The host is always kept even if its presence
 * flag is briefly stale while it processes the action.
 */
export function prepareRematchState(
  state: FullGameState,
  players: RoomPlayers,
  hostUid: string,
): RematchPreparation {
  const present = new Set(
    Object.entries(players)
      .filter(([uid, player]) => uid === hostUid || player.connected !== false)
      .map(([uid]) => uid),
  );
  const removedUids = state.players
    .filter((player) => !present.has(player.uid))
    .map((player) => player.uid);

  if (removedUids.length === 0) {
    return { state, removedUids };
  }

  const next = structuredClone(state);
  next.players = next.players.filter((player) => present.has(player.uid));
  return { state: next, removedUids };
}
