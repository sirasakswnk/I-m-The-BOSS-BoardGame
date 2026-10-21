import { Loader2, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

import { INTERRUPT_MS } from '@/engine/config/rules';
import type { PublicState } from '@/engine/types';
import { th } from '@/i18n/th';
import { serverNow } from '@/net/clock';
import type { RoomPlayers } from '@/net/roomTypes';
import { Button } from '@/ui/common/Button';

import { fillText } from './actionCopy';
import { getWindowPassInfo } from './actionUtils';
import { getPlayerName } from './tableUtils';

interface InterruptBarProps {
  uid: string;
  players: RoomPlayers;
  publicState: PublicState;
  pendingAction: string | null;
  canPlayCard: boolean;
  playDisabledTitle?: string;
  canCancelLock: boolean;
  onPlayCard: () => void;
  onPass: () => void;
  onCancelLock: () => void;
}

function useRemainingMs(deadline: number): number {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, deadline - serverNow()),
  );

  useEffect(() => {
    function update() {
      setRemaining(Math.max(0, deadline - serverNow()));
    }

    update();
    const timer = window.setInterval(update, 100);
    return () => window.clearInterval(timer);
  }, [deadline]);

  return remaining;
}

/**
 * Sticky interrupt bar. The deadline comes from the server; the local
 * countdown re-reads the RTDB server-time offset every tick (plan.md 7.2).
 */
export function InterruptBar({
  uid,
  players,
  publicState,
  pendingAction,
  canPlayCard,
  playDisabledTitle,
  canCancelLock,
  onPlayCard,
  onPass,
  onCancelLock,
}: InterruptBarProps) {
  const activeWindow = publicState.window;
  const remaining = useRemainingMs(activeWindow?.deadline ?? 0);
  if (!activeWindow) return null;

  const seconds = Math.ceil(remaining / 1000);
  const percent = Math.max(
    0,
    Math.min(100, (remaining / INTERRUPT_MS) * 100),
  );
  const urgent = remaining > 0 && remaining <= 1500;
  const expired = remaining <= 0;
  const passInfo = getWindowPassInfo(publicState);
  const isTrigger = activeWindow.triggeredBy === uid;
  const hasPassed = passInfo?.passedUids.includes(uid) ?? false;
  const busy = pendingAction !== null;
  const triggerName = getPlayerName(players, activeWindow.triggeredBy);
  const copy = th.game.table.interrupt;
  const message =
    activeWindow.reason === 'dealLocked'
      ? fillText(copy.locked, { name: triggerName })
      : fillText(copy.played, { name: triggerName });
  const passTitle = isTrigger
    ? copy.triggerPassHint
    : hasPassed
      ? copy.passed
      : undefined;

  return (
    <section
      className="table-interrupt"
      role="status"
      aria-live="polite"
      aria-label={copy.aria}
      data-testid="interrupt-bar"
    >
      <span className="table-interrupt-icon" aria-hidden="true">
        <Zap size={20} strokeWidth={2.8} />
      </span>

      <div className="table-interrupt-copy">
        <span className="table-interrupt-eyebrow">{copy.eyebrow}</span>
        <strong>{message}</strong>
      </div>

      <div className="table-interrupt-timer">
        <div
          className="table-interrupt-track"
          role="progressbar"
          aria-label={copy.timerAria}
          aria-valuemin={0}
          aria-valuemax={INTERRUPT_MS}
          aria-valuenow={remaining}
          aria-valuetext={
            expired
              ? copy.expired
              : fillText(copy.timeLeft, { seconds })
          }
        >
          <div
            className={`table-interrupt-fill ${urgent ? 'is-urgent' : ''}`}
            style={{ width: `${percent}%` }}
            data-testid="interrupt-fill"
          />
        </div>
        <div className="table-interrupt-meta">
          <span
            className={`table-interrupt-time ${expired ? 'is-expired' : ''}`}
            data-testid="interrupt-countdown"
            data-deadline={activeWindow.deadline}
            data-remaining-ms={remaining}
          >
            {expired
              ? copy.expired
              : fillText(copy.timeLeft, { seconds })}
          </span>
          <span className="table-interrupt-pass-count" data-testid="interrupt-pass-count">
            {fillText(copy.passedCount, {
              passed: passInfo?.passed ?? 0,
              total: passInfo?.total ?? 0,
            })}
          </span>
        </div>
      </div>

      <div className="table-interrupt-actions">
        <Button
          variant="dark"
          className="table-btn table-interrupt-btn"
          data-testid="interrupt-play"
          disabled={busy || !canPlayCard}
          title={!canPlayCard ? playDisabledTitle : copy.playHint}
          onClick={onPlayCard}
        >
          {copy.playCard}
        </Button>
        <Button
          variant="light"
          className="table-btn table-interrupt-btn"
          data-testid="interrupt-pass"
          disabled={busy || isTrigger || hasPassed}
          title={passTitle}
          onClick={onPass}
        >
          {pendingAction === 'pass' && (
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          )}
          {hasPassed ? copy.passed : copy.pass}
        </Button>
        {canCancelLock && (
          <Button
            variant="light"
            className="table-btn table-interrupt-btn table-interrupt-cancel"
            data-testid="interrupt-cancel-lock"
            disabled={busy}
            title={copy.cancelLockHint}
            onClick={onCancelLock}
          >
            {pendingAction === 'cancel-lock' && (
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
            )}
            {copy.cancelLock}
          </Button>
        )}
      </div>
    </section>
  );
}
