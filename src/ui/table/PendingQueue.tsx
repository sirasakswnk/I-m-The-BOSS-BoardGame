import { Ban, Crown, Handshake, Plane } from 'lucide-react';

import type { PublicPendingCard } from '@/engine/types';
import { th } from '@/i18n/th';
import type { RoomPlayers } from '@/net/roomTypes';
import { FAMILY_BY_ID } from '@/ui/common/families';
import { FamilySymbol } from '@/ui/common/FamilySymbol';

import { fillText, pendingTargetText } from './actionCopy';
import { getPlayerName } from './tableUtils';

interface PendingQueueProps {
  players: RoomPlayers;
  pendingCards: PublicPendingCard[];
}

function PendingIcon({ kind }: { kind: PublicPendingCard['kind'] }) {
  if (kind === 'travel') return <Plane size={15} strokeWidth={2.6} aria-hidden="true" />;
  if (kind === 'recruitment') {
    return <Handshake size={15} strokeWidth={2.6} aria-hidden="true" />;
  }
  return <Crown size={15} strokeWidth={2.6} aria-hidden="true" />;
}

/**
 * Public queue of action cards waiting for the interrupt window to close.
 * Card identities stay hidden; only kind, owner and public target are shown.
 */
export function PendingQueue({ players, pendingCards }: PendingQueueProps) {
  if (pendingCards.length === 0) return null;

  return (
    <section
      className="table-pending-queue"
      data-testid="pending-queue"
      aria-live="polite"
      aria-label={th.game.table.pending.title}
    >
      <div className="table-pending-head">
        <strong>{th.game.table.pending.title}</strong>
        <span data-testid="pending-count">
          {fillText(th.game.table.pending.count, { count: pendingCards.length })}
        </span>
      </div>
      <ul>
        {pendingCards.map((pending) => {
          const target = pendingTargetText(pending.target, players);
          const stoppedBy = pending.stoppedBy
            ? getPlayerName(players, pending.stoppedBy)
            : null;
          return (
            <li
              key={pending.id}
              className={`table-pending-item ${pending.stoppedBy ? 'is-stopped' : ''}`}
              data-testid={`pending-card-${pending.id}`}
              data-pending-kind={pending.kind}
              data-stopped={pending.stoppedBy ? 'true' : 'false'}
            >
              <span className="table-pending-icon">
                <PendingIcon kind={pending.kind} />
              </span>
              <span className="table-pending-main">
                <strong>{th.game.cards[pending.kind]}</strong>
                <small>
                  {getPlayerName(players, pending.playerUid)}
                  {target ? ` · ${target}` : ''}
                </small>
              </span>
              {pending.target && (
                <span
                  className="table-pending-color"
                  title={th.families[pending.target.color]}
                >
                  <FamilySymbol
                    shape={FAMILY_BY_ID[pending.target.color].symbol}
                    size={13}
                    style={{
                      color: `var(${FAMILY_BY_ID[pending.target.color].cssVar})`,
                    }}
                  />
                </span>
              )}
              <span className="table-pending-state">
                {stoppedBy ? (
                  <>
                    <Ban size={11} strokeWidth={3} aria-hidden="true" />
                    {fillText(th.game.table.pending.stoppedBy, { name: stoppedBy })}
                  </>
                ) : (
                  th.game.table.pending.waiting
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
