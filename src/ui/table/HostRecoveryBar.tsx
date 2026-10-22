import { TimerOff, UserX } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { Phase } from '@/engine/types';
import { th } from '@/i18n/th';
import { serverNow } from '@/net/clock';
import type { RoomPlayers } from '@/net/roomTypes';
import { Button } from '@/ui/common/Button';

const SKIP_MIN_OFFLINE_MS = 60_000;
const RECOVERY_PHASES: ReadonlySet<Phase> = new Set([
  'turnStart',
  'afterMove',
  'dealOpen',
]);

export interface HostRecoveryBarProps {
  uid: string;
  hostUid: string | null;
  players: RoomPlayers;
  bossUid: string | null;
  phase: Phase;
  pending: boolean;
  onSkip: () => void;
}

/**
 * The host's escape hatch for a boss who has been offline for over a minute.
 * Engine validation still decides whether the current phase can be skipped.
 */
export function HostRecoveryBar({
  uid,
  hostUid,
  players,
  bossUid,
  phase,
  pending,
  onSkip,
}: HostRecoveryBarProps) {
  const [now, setNow] = useState(() => serverNow());
  const boss = bossUid ? players[bossUid] : undefined;
  const offline = Boolean(boss && boss.connected === false);
  const offlineFor =
    boss && offline ? Math.max(0, now - (boss.lastSeen || now)) : 0;
  const visible =
    hostUid === uid &&
    offline &&
    offlineFor >= SKIP_MIN_OFFLINE_MS &&
    RECOVERY_PHASES.has(phase);

  useEffect(() => {
    if (!offline) return;
    const timer = window.setInterval(() => setNow(serverNow()), 1_000);
    return () => window.clearInterval(timer);
  }, [offline]);

  if (!visible || !boss) return null;

  return (
    <div
      className="mx-auto mb-4 flex w-full max-w-[1100px] flex-wrap items-center justify-between gap-3 rounded-btn border-2 border-ink bg-gold px-4 py-3 shadow-hard-sm"
      role="status"
      aria-live="polite"
      data-testid="host-recovery-bar"
    >
      <div className="flex min-w-0 items-center gap-3">
        <UserX size={22} className="shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <strong className="block font-display text-[17px]">
            {th.game.table.recovery.title.replace('{name}', boss.name)}
          </strong>
          <span className="flex items-center gap-1.5 text-sm text-ink-soft">
            <TimerOff size={14} aria-hidden="true" />
            {th.game.table.recovery.hint}
          </span>
        </div>
      </div>
      <Button
        variant="dark"
        data-testid="skip-disconnected-boss"
        disabled={pending}
        onClick={onSkip}
      >
        {th.game.table.recovery.skip}
      </Button>
    </div>
  );
}
