import type { GameEvent } from '@/engine/types';
import { th } from '@/i18n/th';
import type { RoomPlayers } from '@/net/roomTypes';

import { formatLogEvent } from './gameLogFormat';

interface GameLogProps {
  events: GameEvent[];
  players: RoomPlayers;
}

/** Public event log; newest event first, like the table.html side panel. */
export function GameLog({ events, players }: GameLogProps) {
  const visible = events.slice(-7).reverse();

  return (
    <section className="table-panel table-log">
      <h3>{th.game.table.logTitle}</h3>
      {visible.length === 0 ? (
        <p className="table-empty-note">{th.game.table.logEmpty}</p>
      ) : (
        <ol data-testid="game-log" aria-live="polite">
          {visible.map((event, index) => (
            <li key={`${event.type}-${event.at}-${index}`}>
              {formatLogEvent(event, players)}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
