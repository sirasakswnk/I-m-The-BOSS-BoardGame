import { Loader2, RefreshCw } from 'lucide-react';

import type { PrivateState, PublicState } from '@/engine/types';
import { th } from '@/i18n/th';
import type { ActionIntent } from '@/net/actions';
import type { RoomErrorCode, RoomPlayers } from '@/net/roomTypes';
import { Button } from '@/ui/common/Button';
import { Panel } from '@/ui/common/Panel';
import { TableTopBar } from '@/ui/table/TableTopBar';
import { TableScreen } from '@/ui/table/TableScreen';

interface GameRoomProps {
  code: string;
  uid: string;
  hostUid: string | null;
  players: RoomPlayers;
  publicState: PublicState | null;
  privateState: PrivateState | null;
  loading: boolean;
  errorCode: RoomErrorCode | null;
  onRetry: () => void;
  /** Preview-only override: keeps buttons enabled but avoids Firebase writes. */
  onAction?: (intent: ActionIntent) => void;
  /** The preview page already has its own brand/navigation chrome. */
  showChrome?: boolean;
}

export function GameRoom({
  code,
  uid,
  hostUid,
  players,
  publicState,
  privateState,
  loading,
  errorCode,
  onRetry,
  onAction,
  showChrome = true,
}: GameRoomProps) {
  const bossName = publicState?.bossUid
    ? (players[publicState.bossUid]?.name ?? '—')
    : null;

  return (
    <div className="table-screen" data-testid="game-room">
      <TableTopBar
        code={code}
        phase={publicState?.phase ?? null}
        dealsClosed={publicState?.dealsClosed ?? 0}
        bossName={bossName}
        turnNumber={publicState?.turnNumber ?? 0}
        showChrome={showChrome}
      />

      {errorCode ? (
        <div className="table-state">
          <Panel title={th.game.errorTitle} className="mx-auto max-w-xl">
            <p className="text-ink-soft">{th.errors[errorCode]}</p>
            <Button className="mt-5" variant="dark" onClick={onRetry}>
              <RefreshCw size={18} aria-hidden="true" />
              {th.common.retry}
            </Button>
          </Panel>
        </div>
      ) : loading || !publicState || !privateState ? (
        <div className="table-state">
          <Panel title={th.game.loadingTitle} className="mx-auto max-w-xl">
            <p className="flex items-center gap-3 text-ink-soft">
              <Loader2 size={20} className="animate-spin" aria-hidden="true" />
              {th.game.loadingDescription}
            </p>
          </Panel>
        </div>
      ) : (
        <TableScreen
          code={code}
          uid={uid}
          hostUid={hostUid}
          players={players}
          publicState={publicState}
          privateState={privateState}
          onAction={onAction}
        />
      )}
    </div>
  );
}
