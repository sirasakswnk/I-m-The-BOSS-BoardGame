import { Loader2, Undo2, UserRoundCheck, X } from 'lucide-react';
import { useState } from 'react';

import { th } from '@/i18n/th';
import { sendSeatReclaim } from '@/net/actions';
import type { SeatReclaimRequest, SeatReclaims } from '@/net/host/reclaim';
import {
  cancelSeatReclaim,
  requestSeatReclaim,
} from '@/net/reclaims';
import { RoomServiceError } from '@/net/rooms';
import { NICKNAME_MAX_LENGTH } from '@/net/roomCode';
import type { RoomPlayers } from '@/net/roomTypes';
import { useMySeatReclaim } from '@/net/useSeatReclaims';
import { useUiStore } from '@/store/uiStore';
import { Button } from '@/ui/common/Button';
import { Chip } from '@/ui/common/Chip';
import { Panel } from '@/ui/common/Panel';
import { TextInput } from '@/ui/common/TextInput';

function errorText(error: unknown): string {
  if (error instanceof RoomServiceError) {
    return th.errors[error.code] ?? th.errors.UNKNOWN;
  }
  return th.errors.UNKNOWN;
}

export interface ReclaimSeatViewProps {
  code: string;
  uid: string;
  players: RoomPlayers;
  nickname: string;
  nicknameValid: boolean;
  onNicknameChange: (value: string) => void;
}

/**
 * Shown when a signed-in browser has no player record in a room that is already
 * playing. The guest chooses an offline seat; the host must approve the move.
 */
export function ReclaimSeatView({
  code,
  uid,
  players,
  nickname,
  nicknameValid,
  onNicknameChange,
}: ReclaimSeatViewProps) {
  const showToast = useUiStore((state) => state.showToast);
  const request = useMySeatReclaim(code, uid, true);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const candidates = Object.entries(players)
    .filter(([, player]) => player.connected === false)
    .sort((left, right) => left[1].seat - right[1].seat);

  async function handleRequest(oldUid: string): Promise<void> {
    if (busyUid) return;
    setBusyUid(oldUid);
    try {
      await requestSeatReclaim(code, uid, oldUid, nickname);
      showToast(th.room.reclaimRequested);
    } catch (error) {
      showToast(errorText(error), 'error');
    } finally {
      setBusyUid(null);
    }
  }

  async function handleCancel(): Promise<void> {
    if (busyUid) return;
    setBusyUid('cancel');
    try {
      await cancelSeatReclaim(code, uid);
      showToast(th.room.reclaimCancelled);
    } catch (error) {
      showToast(errorText(error), 'error');
    } finally {
      setBusyUid(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl" data-testid="reclaim-view">
      <section className="flex flex-col items-center gap-2.5 pt-3.5 text-center">
        <Chip tone="gold">{th.room.reclaimKicker}</Chip>
        <h1 className="font-display text-[clamp(30px,6vw,48px)] font-extrabold leading-[1.15]">
          {th.room.reclaimTitle}
        </h1>
        <p className="max-w-[560px] text-[17px] text-ink-soft">{th.room.reclaimLead}</p>
      </section>

      <Panel className="mt-6" title={request ? th.room.reclaimPendingTitle : th.room.reclaimSeatsTitle}>
        {request ? (
          <div className="flex flex-col gap-4">
            <p className="text-ink-soft">
              {th.room.reclaimPendingDescription.replace(
                '{name}',
                players[request.oldUid]?.name ?? request.name,
              )}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-line bg-paper px-3 py-1.5 text-sm">
                <Loader2 size={16} className="animate-spin text-accent" aria-hidden="true" />
                {th.room.reclaimWaitingHost}
              </span>
              <Button
                variant="light"
                data-testid="cancel-reclaim"
                disabled={busyUid !== null}
                onClick={() => void handleCancel()}
              >
                <X size={17} aria-hidden="true" />
                {th.room.reclaimCancel}
              </Button>
            </div>
            <p className="hint">{th.room.reclaimPendingHint}</p>
          </div>
        ) : candidates.length === 0 ? (
          <div className="flex flex-col gap-4">
            <p className="text-ink-soft">{th.room.reclaimNoSeats}</p>
            <Button variant="light" onClick={() => window.history.back()}>
              <Undo2 size={17} aria-hidden="true" />
              {th.common.backToHome}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <p className="text-ink-soft">{th.room.reclaimDescription}</p>
            <div>
              <label className="field-label" htmlFor="reclaim-nickname">
                {th.room.reclaimNicknameLabel}
              </label>
              <TextInput
                id="reclaim-nickname"
                data-testid="reclaim-nickname-input"
                name="nickname"
                type="text"
                maxLength={NICKNAME_MAX_LENGTH}
                autoComplete="nickname"
                value={nickname}
                onChange={(event) => onNicknameChange(event.target.value)}
                aria-describedby="reclaim-nickname-hint"
              />
              <p className="hint" id="reclaim-nickname-hint">
                {nickname.length > 0 && !nicknameValid
                  ? th.home.nicknameTooShort
                  : th.room.reclaimNicknameHint}
              </p>
            </div>
            <ul className="flex flex-col gap-2.5" aria-label={th.room.reclaimSeatsAria}>
              {candidates.map(([oldUid, player]) => (
                <li
                  key={oldUid}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-btn border-2 border-ink bg-white px-4 py-3 shadow-hard-sm"
                >
                  <span className="flex min-w-0 flex-col">
                    <strong className="truncate font-display text-lg">{player.name}</strong>
                    <span className="text-sm text-ink-soft">
                      {th.room.seatLabel.replace('{seat}', String(player.seat + 1))} ·{' '}
                      {th.common.offline}
                    </span>
                  </span>
                  <Button
                    variant="dark"
                    data-testid={`reclaim-seat-${player.seat}`}
                    disabled={!nicknameValid || busyUid !== null}
                    aria-busy={busyUid === oldUid}
                    onClick={() => void handleRequest(oldUid)}
                  >
                    {busyUid === oldUid ? (
                      <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <UserRoundCheck size={17} aria-hidden="true" />
                    )}
                    {th.room.reclaimSeatButton}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>
    </div>
  );
}

export interface HostReclaimPanelProps {
  code: string;
  hostUid: string;
  players: RoomPlayers;
  requests: SeatReclaims;
}

/** Floating approval queue for the host, kept above the table without blocking it. */
export function HostReclaimPanel({
  code,
  hostUid,
  players,
  requests,
}: HostReclaimPanelProps) {
  const showToast = useUiStore((state) => state.showToast);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const entries = Object.entries(requests).sort(
    (left, right) => left[1].requestedAt - right[1].requestedAt,
  );

  if (entries.length === 0) return null;

  async function handleApprove(newUid: string, request: SeatReclaimRequest): Promise<void> {
    if (busyUid) return;
    setBusyUid(newUid);
    try {
      await sendSeatReclaim(code, hostUid, request.oldUid, newUid, request.name);
      showToast(th.room.reclaimApproved);
    } catch (error) {
      showToast(errorText(error), 'error');
    } finally {
      setBusyUid(null);
    }
  }

  async function handleReject(newUid: string): Promise<void> {
    if (busyUid) return;
    setBusyUid(newUid);
    try {
      await cancelSeatReclaim(code, hostUid, newUid);
      showToast(th.room.reclaimRejected);
    } catch (error) {
      showToast(errorText(error), 'error');
    } finally {
      setBusyUid(null);
    }
  }

  return (
    <aside
      className="fixed right-4 top-24 z-[1100] w-[min(360px,calc(100%-2rem))] rounded-panel border-[3px] border-ink bg-paper p-4 shadow-hard max-md:bottom-4 max-md:top-auto"
      aria-label={th.room.reclaimHostPanelAria}
      aria-live="polite"
      data-testid="host-reclaim-panel"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold">{th.room.reclaimHostTitle}</h2>
          <p className="text-sm text-ink-soft">
            {th.room.reclaimHostCount.replace('{count}', String(entries.length))}
          </p>
        </div>
        <Chip tone="gold">{th.common.host}</Chip>
      </div>
      <ul className="flex flex-col gap-2.5">
        {entries.map(([newUid, request]) => (
          <li
            key={newUid}
            className="rounded-btn border-2 border-ink bg-white p-3 shadow-hard-sm"
          >
            <p className="font-display text-[17px] font-bold">{request.name}</p>
            <p className="mb-2 text-sm text-ink-soft">
              {th.room.reclaimWantsSeat.replace(
                '{name}',
                players[request.oldUid]?.name ?? request.oldUid.slice(0, 6),
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="dark"
                className="min-h-[40px] px-3 py-1.5 text-sm"
                data-testid={`approve-reclaim-${request.oldUid}`}
                disabled={busyUid !== null}
                aria-busy={busyUid === newUid}
                onClick={() => void handleApprove(newUid, request)}
              >
                {busyUid === newUid && (
                  <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                )}
                {th.room.reclaimApprove}
              </Button>
              <Button
                variant="light"
                className="min-h-[40px] px-3 py-1.5 text-sm"
                data-testid={`reject-reclaim-${request.oldUid}`}
                disabled={busyUid !== null}
                onClick={() => void handleReject(newUid)}
              >
                {th.room.reclaimReject}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
