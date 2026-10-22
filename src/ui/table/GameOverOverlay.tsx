import { Eye, Loader2, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { PublicState } from '@/engine/types';
import { th } from '@/i18n/th';
import type { RoomPlayers } from '@/net/roomTypes';
import { Button } from '@/ui/common/Button';
import { Modal } from '@/ui/common/Modal';

import { buildFinalScoreRows } from './endgameUtils';

interface GameOverOverlayProps {
  uid: string;
  hostUid: string | null;
  players: RoomPlayers;
  publicState: PublicState;
  pendingAction: string | null;
  isHost: boolean;
  onRematch: () => void;
}

function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function GameOverOverlay({
  uid,
  hostUid,
  players,
  publicState,
  pendingAction,
  isHost,
  onRematch,
}: GameOverOverlayProps) {
  const rows = useMemo(
    () => buildFinalScoreRows(publicState.finalScores, players),
    [publicState.finalScores, players],
  );
  const [revealed, setRevealed] = useState(0);
  const [reducedMotion] = useState(
    () =>
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const total = rows.length;
  const allRevealed = total === 0 || revealed >= total;
  const busy = pendingAction !== null;
  const winners = rows.filter((row) => row.winner);
  const displayRows = allRevealed
    ? [...rows].sort((left, right) => left.rank - right.rank || left.seat - right.seat)
    : rows;

  useEffect(() => {
    if (total === 0 || reducedMotion) {
      setRevealed(total);
      return;
    }
    if (revealed >= total) return;

    const timer = window.setTimeout(
      () => setRevealed((current) => Math.min(total, current + 1)),
      revealed === 0 ? 500 : 700,
    );
    return () => window.clearTimeout(timer);
  }, [revealed, reducedMotion, total]);

  const winnerNames = winners.map((row) => row.name).join(', ');

  return (
    <Modal
      title={th.game.table.gameOver.title}
      eyebrow={th.game.table.gameOver.eyebrow}
      onClose={() => undefined}
      dismissible={false}
      testId="gameover-overlay"
      className="gameover-modal"
    >
      <div className="gameover-banner">
        <Trophy size={28} strokeWidth={2.4} aria-hidden="true" />
        <div>
          <strong>{th.game.table.gameOver.revealTitle}</strong>
          <span>{th.game.table.gameOver.revealHint}</span>
        </div>
      </div>

      {total === 0 ? (
        <p className="table-modal-hint">{th.game.table.noFinalScores}</p>
      ) : (
        <>
          <div className="gameover-progress">
            <span>
              {fill(th.game.table.gameOver.revealedCount, {
                revealed,
                total,
              })}
            </span>
            {!allRevealed && (
              <button
                type="button"
                className="gameover-reveal-all"
                data-testid="gameover-reveal-all"
                onClick={() => setRevealed(total)}
              >
                <Eye size={14} strokeWidth={2.7} aria-hidden="true" />
                {th.game.table.gameOver.revealAll}
              </button>
            )}
          </div>

          <ul className="gameover-list" data-revealed={allRevealed}>
            {displayRows.map((row, index) => {
              const shown = allRevealed || index < revealed;
              return (
                <li
                  key={row.uid}
                  className={`gameover-row ${shown ? 'is-revealed' : ''} ${
                    allRevealed && row.winner ? 'is-winner' : ''
                  }`}
                  data-testid={`final-score-${row.uid}`}
                  data-revealed={shown}
                >
                  <span
                    className="gameover-rank"
                    aria-label={
                      allRevealed
                        ? fill(th.game.table.gameOver.rankLabel, { rank: row.rank })
                        : undefined
                    }
                  >
                    {allRevealed ? row.rank : '·'}
                  </span>
                  <span className="gameover-name">
                    {row.name}
                    {row.uid === uid && (
                      <em className="gameover-you">{th.game.table.gameOver.you}</em>
                    )}
                  </span>
                  <strong className="gameover-score">
                    {shown ? `${row.score} ${th.game.million}` : th.game.table.gameOver.hidden}
                  </strong>
                  {allRevealed && row.winner && (
                    <span className="gameover-crown" aria-hidden="true">
                      <Trophy size={15} strokeWidth={2.6} />
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          {allRevealed && (
            <div className="gameover-winner" data-testid="gameover-winner">
              <span>
                {winners.length > 1
                  ? th.game.table.gameOver.jointWinners
                  : th.game.table.gameOver.winnerLabel}
              </span>
              <strong>{winnerNames || th.game.table.noWinner}</strong>
            </div>
          )}
        </>
      )}

      <div className="gameover-actions">
        {isHost ? (
          <>
            <Button
              variant="dark"
              className="table-btn"
              data-testid="rematch"
              disabled={busy}
              onClick={onRematch}
            >
              {busy && <Loader2 size={17} className="animate-spin" aria-hidden="true" />}
              {th.game.table.gameOver.rematch}
            </Button>
            <p>{th.game.table.gameOver.rematchHint}</p>
          </>
        ) : (
          <p className="gameover-waiting">
            {fill(th.game.table.gameOver.waitingHost, {
              name: players[hostUid ?? '']?.name ?? 'host',
            })}
          </p>
        )}
      </div>
    </Modal>
  );
}
