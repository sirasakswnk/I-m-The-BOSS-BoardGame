import { Loader2, WifiOff } from 'lucide-react';

import { th } from '@/i18n/th';
import type { HostMigrationStatus } from '@/net/host/migration';

/** Visible to everyone while the room is waiting for a new host. */
export function HostMigrationNotice({ status }: { status: HostMigrationStatus }) {
  const claiming = status === 'claiming' || status === 'claimed';
  return (
    <div
      className="mx-auto mt-3 flex w-full max-w-[900px] items-center gap-3 rounded-btn border-2 border-ink bg-gold px-4 py-2.5 font-medium shadow-hard-sm"
      role="status"
      aria-live="polite"
      data-testid="host-migration-notice"
    >
      {claiming ? (
        <Loader2 size={19} className="shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        <WifiOff size={19} className="shrink-0" aria-hidden="true" />
      )}
      <span className="min-w-0">
        {claiming ? th.room.hostMigrationClaiming : th.room.hostMigrationWaiting}
      </span>
    </div>
  );
}
