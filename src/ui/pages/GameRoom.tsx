import { Crown, Loader2, RefreshCw, ShieldCheck, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

import { DEAL_SPACE_COUNT } from '@/engine/config/dealBoard';
import { DEAL_TILE_COUNT } from '@/engine/config/rules';
import type {
  FamilyColor,
  InfluenceCard,
  PrivateState,
  PublicState,
} from '@/engine/types';
import { th } from '@/i18n/th';
import { sendAction } from '@/net/actions';
import { RoomServiceError } from '@/net/rooms';
import type { RoomErrorCode, RoomPlayer, RoomPlayers } from '@/net/roomTypes';
import { useUiStore } from '@/store/uiStore';
import { Button } from '@/ui/common/Button';
import { Chip } from '@/ui/common/Chip';
import { FamilyCard } from '@/ui/common/FamilyCard';
import { FAMILY_BY_ID } from '@/ui/common/families';
import { FamilySymbol } from '@/ui/common/FamilySymbol';
import { Panel } from '@/ui/common/Panel';

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
}

function errorCodeOf(error: unknown): RoomErrorCode {
  return error instanceof RoomServiceError ? error.code : 'UNKNOWN';
}

function FamilyPill({ color, muted = false }: { color: FamilyColor; muted?: boolean }) {
  const meta = FAMILY_BY_ID[color];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-white px-2 py-1 text-[13px] font-semibold ${
        muted ? 'opacity-45 line-through' : ''
      }`}
      title={muted ? th.game.onVacation : th.families[color]}
    >
      <FamilySymbol
        shape={meta.symbol}
        size={13}
        style={{ color: `var(${meta.cssVar})` }}
      />
      {th.families[color]}
    </span>
  );
}

function HandCard({ card }: { card: InfluenceCard }) {
  if (card.kind === 'clan') {
    return (
      <div data-card-id={card.id}>
        <FamilyCard family={card.color} variant="clan" />
      </div>
    );
  }

  const label = th.card[card.kind];
  const colorLabel =
    card.kind === 'travel'
      ? card.color === 'wild'
        ? th.card.wildColor
        : th.families[card.color]
      : null;
  const faceClass =
    card.kind === 'stop'
      ? 'bg-family-red text-white'
      : card.kind === 'imTheBoss'
        ? 'bg-gold text-ink'
        : card.kind === 'recruitment'
          ? 'bg-family-blue text-white'
          : 'bg-paper-deep text-ink';

  return (
    <div
      className="relative h-[146px] w-[104px] shrink-0 overflow-hidden rounded-card border-2 border-ink bg-white p-1.5 shadow-card max-md:h-[84px] max-md:w-[58px] max-md:rounded-[9px] max-md:p-[3px]"
      data-card-id={card.id}
    >
      <div
        className={`stripes flex h-full flex-col items-center justify-center gap-2 rounded-[9px] p-2 text-center max-md:gap-1 max-md:rounded-[7px] max-md:p-1 ${faceClass}`}
      >
        <span className="font-display text-[15px] font-bold leading-tight max-md:text-[9px]">
          {label}
        </span>
        {colorLabel && (
          <span className="rounded-full border-2 border-ink bg-white px-2 py-0.5 font-display text-[12px] font-bold leading-none text-ink max-md:px-1 max-md:text-[8px]">
            {colorLabel}
          </span>
        )}
        {card.kind === 'recruitment' && (
          <span className="font-mono text-[18px] font-semibold leading-none max-md:text-[12px]">
            ×3
          </span>
        )}
      </div>
    </div>
  );
}

interface PlayerRowProps {
  uid: string;
  player: RoomPlayer;
  isMe: boolean;
  isBoss: boolean;
  isHost: boolean;
  publicState: PublicState;
  privateState: PrivateState;
}

function PlayerRow({
  uid,
  player,
  isMe,
  isBoss,
  isHost,
  publicState,
  privateState,
}: PlayerRowProps) {
  const investors = publicState.tableInvestors[uid] ?? [];
  const handCount = publicState.handCounts[uid] ?? 0;

  return (
    <li
      className={`rounded-card border-2 border-ink bg-paper p-3 ${
        isMe ? 'bg-gold/40' : ''
      }`}
      data-testid={`game-player-${uid}`}
      data-connected={player.connected ? 'true' : 'false'}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-ink bg-white font-mono text-[13px] font-semibold">
          {player.seat + 1}
        </span>
        <span className="min-w-0 flex-1 truncate font-display text-[17px] font-bold">
          {player.name}
        </span>
        {isBoss && (
          <Chip tone="gold" className="px-2 py-1 text-[12px]">
            <Crown size={13} strokeWidth={2.5} aria-hidden="true" />
            {th.game.boss}
          </Chip>
        )}
        {isHost && (
          <Chip tone="paper" className="px-2 py-1 text-[12px]">
            {th.game.hostBadge}
          </Chip>
        )}
        {isMe && (
          <Chip tone="ink" className="px-2 py-1 text-[12px]">
            {th.common.you}
          </Chip>
        )}
        <span className="inline-flex items-center gap-1 text-[12px] text-ink-soft">
          {player.connected ? (
            <span className="h-2 w-2 rounded-full bg-family-green" aria-hidden="true" />
          ) : (
            <WifiOff size={13} aria-hidden="true" />
          )}
          {player.connected ? th.game.connected : th.game.disconnected}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {investors.length === 0 ? (
          <span className="text-[13px] text-ink-soft">{th.game.noInvestors}</span>
        ) : (
          investors.map((color) => (
            <FamilyPill
              key={color}
              color={color}
              muted={publicState.onVacation.includes(color)}
            />
          ))
        )}
        <span className="ml-auto font-mono text-[12px] text-ink-soft">
          {th.game.handCount.replace('{count}', String(handCount))}
        </span>
        {isMe && (
          <span className="font-mono text-[12px] font-semibold">
            {privateState.money} {th.game.million}
          </span>
        )}
      </div>
    </li>
  );
}

interface StartSpacePickerProps {
  code: string;
  uid: string;
  pickerName: string;
  canPick: boolean;
}

function StartSpacePicker({
  code,
  uid,
  pickerName,
  canPick,
}: StartSpacePickerProps) {
  const [sendingSpace, setSendingSpace] = useState<number | null>(null);
  const showToast = useUiStore((state) => state.showToast);

  useEffect(() => {
    if (!canPick) setSendingSpace(null);
  }, [canPick]);

  useEffect(() => {
    if (sendingSpace === null) return;
    const timer = window.setTimeout(() => setSendingSpace(null), 6000);
    return () => window.clearTimeout(timer);
  }, [sendingSpace]);

  async function pick(space: number) {
    if (sendingSpace !== null) return;
    setSendingSpace(space);
    try {
      await sendAction(code, uid, { type: 'SET_START_SPACE', space });
    } catch (error) {
      setSendingSpace(null);
      showToast(th.errors[errorCodeOf(error)], 'error');
    }
  }

  return (
    <Panel title={th.game.startSpaceTitle}>
      {!canPick ? (
        <p className="text-[15px] text-ink-soft">
          {th.game.startSpaceWaiting.replace('{name}', pickerName)}
        </p>
      ) : (
        <>
          <p className="text-[15px] text-ink-soft">{th.game.startSpaceDescription}</p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {Array.from({ length: DEAL_SPACE_COUNT }, (_, index) => index + 1).map(
              (space) => (
                <button
                  key={space}
                  type="button"
                  className={`grid h-12 place-items-center rounded-btn border-2 border-ink bg-white font-mono text-[16px] font-semibold shadow-hard-sm transition-colors hover:bg-gold disabled:cursor-not-allowed disabled:opacity-45 ${
                    sendingSpace === space ? 'bg-gold' : ''
                  }`}
                  aria-label={th.game.startSpaceButton.replace('{space}', String(space))}
                  data-testid={`start-space-${space}`}
                  disabled={sendingSpace !== null}
                  onClick={() => void pick(space)}
                >
                  {sendingSpace === space ? (
                    <Loader2 size={17} className="animate-spin" aria-hidden="true" />
                  ) : (
                    space
                  )}
                </button>
              ),
            )}
          </div>
          {sendingSpace !== null && (
            <p className="mt-3 text-[14px] text-ink-soft" aria-live="polite">
              {th.game.startSpaceSelected.replace('{space}', String(sendingSpace))}
            </p>
          )}
        </>
      )}
    </Panel>
  );
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
}: GameRoomProps) {
  if (errorCode) {
    return (
      <Panel className="mx-auto mt-8 max-w-xl">
        <Chip tone="gold" className="mb-3">
          {th.game.kicker}
        </Chip>
        <h1 className="font-display text-[30px] font-extrabold">{th.game.errorTitle}</h1>
        <p className="mt-2 text-ink-soft">{th.errors[errorCode]}</p>
        <Button variant="dark" className="mt-5" onClick={onRetry}>
          <RefreshCw size={17} strokeWidth={2.5} aria-hidden="true" />
          {th.common.retry}
        </Button>
      </Panel>
    );
  }

  if (loading) {
    return (
      <Panel className="mx-auto mt-10 max-w-xl text-center">
        <Loader2 size={30} className="mx-auto mb-3 animate-spin text-accent" aria-hidden="true" />
        <h1 className="font-display text-2xl font-extrabold">{th.game.loadingTitle}</h1>
        <p className="mt-2 text-ink-soft">{th.game.loadingDescription}</p>
      </Panel>
    );
  }

  if (!publicState || !privateState) {
    return (
      <Panel className="mx-auto mt-10 max-w-xl">
        <Chip tone="gold" className="mb-3">
          {th.game.kicker}
        </Chip>
        <h1 className="font-display text-[30px] font-extrabold">{th.game.waitingTitle}</h1>
        <p className="mt-2 text-ink-soft">{th.game.waitingDescription}</p>
        <Button variant="light" className="mt-5" onClick={onRetry}>
          <RefreshCw size={17} strokeWidth={2.5} aria-hidden="true" />
          {th.common.retry}
        </Button>
      </Panel>
    );
  }

  const playerEntries = Object.entries(players).sort(
    (a, b) => a[1].seat - b[1].seat || a[1].joinedAt - b[1].joinedAt,
  );
  const bossName = publicState.bossUid ? players[publicState.bossUid]?.name : null;
  const pickerName = publicState.startPickerUid
    ? (players[publicState.startPickerUid]?.name ?? '')
    : '';
  const canPickStart =
    publicState.phase === 'setupPickStart' && publicState.startPickerUid === uid;

  return (
    <div className="mt-6 flex flex-col gap-5" data-testid="game-room">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Chip tone="gold">{th.game.kicker}</Chip>
          <h1 className="mt-2 font-display text-[clamp(30px,5vw,48px)] font-extrabold leading-tight">
            {th.game.title.replace('{code}', code)}
          </h1>
          <p className="mt-1 text-ink-soft">{th.game.privacyNote}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip tone="paper">{th.game.phases[publicState.phase]}</Chip>
          <Chip tone="paper">
            {th.game.dealsClosed
              .replace('{closed}', String(publicState.dealsClosed))
              .replace('{total}', String(DEAL_TILE_COUNT))}
          </Chip>
          <Chip tone="gold">
            <Crown size={15} strokeWidth={2.5} aria-hidden="true" />
            {bossName ?? '—'}
          </Chip>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <div className="flex flex-col gap-5">
          <Panel title={th.game.publicPlayers}>
            <ul className="flex flex-col gap-2.5" aria-label={th.game.publicPlayers}>
              {playerEntries.map(([playerUid, player]) => (
                <PlayerRow
                  key={playerUid}
                  uid={playerUid}
                  player={player}
                  isMe={playerUid === uid}
                  isBoss={playerUid === publicState.bossUid}
                  isHost={playerUid === hostUid}
                  publicState={publicState}
                  privateState={privateState}
                />
              ))}
            </ul>
          </Panel>

          {publicState.phase === 'setupPickStart' && (
            <StartSpacePicker
              code={code}
              uid={uid}
              pickerName={pickerName}
              canPick={canPickStart}
            />
          )}

          <Panel
            title={
              <span className="flex flex-wrap items-center gap-2">
                {th.game.myHand}
                <Chip tone="ink" className="px-2 py-1 text-[12px]">
                  <ShieldCheck size={13} strokeWidth={2.5} aria-hidden="true" />
                  {th.game.myHandPrivate}
                </Chip>
              </span>
            }
          >
            <div className="flex flex-wrap gap-2.5" data-testid="my-hand">
              {privateState.hand.length === 0 ? (
                <p className="text-ink-soft">{th.game.noCards}</p>
              ) : (
                privateState.hand.map((card) => <HandCard key={card.id} card={card} />)
              )}
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-5">
          <Panel title={th.game.yourSeat}>
            <p className="font-display text-[20px] font-bold">{players[uid]?.name}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Chip tone="paper">
                {th.game.money}: {privateState.money} {th.game.million}
              </Chip>
              <Chip tone="paper">
                {th.game.handCount.replace('{count}', String(privateState.hand.length))}
              </Chip>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(publicState.tableInvestors[uid] ?? []).length === 0 ? (
                <span className="text-[13px] text-ink-soft">{th.game.noInvestors}</span>
              ) : (
                (publicState.tableInvestors[uid] ?? []).map((color) => (
                  <FamilyPill
                    key={color}
                    color={color}
                    muted={publicState.onVacation.includes(color)}
                  />
                ))
              )}
            </div>
          </Panel>

          <Panel title={th.game.boardStatus}>
            <dl className="flex flex-col gap-2 text-[14px]">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft">{th.game.turnLabel}</dt>
                <dd className="font-mono font-semibold">{publicState.turnNumber}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft">
                  {th.game.pawnSpace.replace(
                    '{space}',
                    publicState.pawnSpace > 0 ? String(publicState.pawnSpace) : '—',
                  )}
                </dt>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft">{th.game.closedSpacesLabel}</dt>
                <dd className="font-mono font-semibold">
                  {publicState.closedSpaces.length}/{DEAL_SPACE_COUNT}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft">{th.game.deckLabel}</dt>
                <dd className="font-mono font-semibold">{publicState.deckCount}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft">{th.game.discardLabel}</dt>
                <dd className="font-mono font-semibold">{publicState.discardCount}</dd>
              </div>
            </dl>

            {publicState.unclaimedInvestors.length > 0 && (
              <div className="mt-4 border-t-2 border-dashed border-line pt-3">
                <p className="mb-2 text-[13px] font-semibold">
                  {th.game.unclaimedInvestors}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {publicState.unclaimedInvestors.map((color) => (
                    <FamilyPill key={color} color={color} />
                  ))}
                </div>
              </div>
            )}
          </Panel>

          <p className="rounded-card border-2 border-dashed border-line bg-white/55 p-3 text-[13px] text-ink-soft">
            {th.game.phaseM4Hint}
          </p>
        </div>
      </div>
    </div>
  );
}
