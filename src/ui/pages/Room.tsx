import { Copy, Crown, Loader2, LogOut, Users, WifiOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { th } from '@/i18n/th';
import { sendStartGame } from '@/net/actions';
import {
  copyText,
  ensurePresence,
  getRoomUrl,
  joinRoom,
  leaveRoom,
  markRoomOffline,
  RoomServiceError,
} from '@/net/rooms';
import {
  isValidNickname,
  isValidRoomCode,
  normalizeNickname,
  normalizeRoomCode,
  NICKNAME_MAX_LENGTH,
} from '@/net/roomCode';
import {
  ROOM_MAX_PLAYERS,
  type RoomErrorCode,
  type RoomPlayer,
} from '@/net/roomTypes';
import {
  clearLastRoomCode,
  getLastNickname,
  setLastNickname,
  setLastRoomCode,
} from '@/net/storage';
import { useActionFeedback, useGameState } from '@/net/useGameState';
import { useHostLoop } from '@/net/useHostLoop';
import { useRoom } from '@/net/useRoom';
import { useUiStore } from '@/store/uiStore';
import { Brand } from '@/ui/common/Brand';
import { Button } from '@/ui/common/Button';
import { Chip } from '@/ui/common/Chip';
import { Panel } from '@/ui/common/Panel';
import { TextInput } from '@/ui/common/TextInput';
import { GameRoom } from '@/ui/pages/GameRoom';

function errorCodeOf(error: unknown): RoomErrorCode {
  return error instanceof RoomServiceError ? error.code : 'UNKNOWN';
}

function errorTitleFor(code: RoomErrorCode): string {
  switch (code) {
    case 'INVALID_CODE':
      return th.room.invalidCodeTitle;
    case 'ROOM_NOT_FOUND':
      return th.room.notFoundTitle;
    case 'ROOM_FULL':
      return th.room.fullTitle;
    case 'GAME_STARTED':
      return th.room.startedTitle;
    case 'ROOM_FINISHED':
      return th.room.finishedTitle;
    case 'AUTH_FAILED':
      return th.room.authTitle;
    default:
      return th.room.statusTitle;
  }
}

function errorDescriptionFor(code: RoomErrorCode): string {
  switch (code) {
    case 'INVALID_CODE':
      return th.errors.INVALID_CODE;
    case 'ROOM_NOT_FOUND':
      return th.room.notFoundDescription;
    case 'ROOM_FULL':
      return th.room.fullDescription;
    case 'GAME_STARTED':
      return th.room.startedDescription;
    case 'ROOM_FINISHED':
      return th.room.finishedDescription;
    case 'AUTH_FAILED':
      return th.room.authDescription;
    default:
      return th.errors[code];
  }
}

interface RoomStatusProps {
  title: string;
  description: string;
  code?: string;
  onBack: () => void;
  onRetry?: () => void;
}

function RoomStatus({ title, description, code, onBack, onRetry }: RoomStatusProps) {
  return (
    <Panel className="mx-auto mt-10 max-w-xl">
      <div className="flex flex-col gap-4">
        <Chip tone="gold" className="self-start">
          {th.room.statusTitle}
        </Chip>
        <h1
          className="font-display text-[32px] font-extrabold leading-tight"
          data-testid="room-status-title"
        >
          {title}
        </h1>
        {code && (
          <p className="font-mono text-[15px] text-ink-soft">
            {th.common.roomCode}{' '}
            <strong className="tracking-[0.15em]">{code}</strong>
          </p>
        )}
        <p className="text-ink-soft" aria-live="polite">
          {description}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="dark" onClick={onBack}>
            {th.common.backToHome}
          </Button>
          {onRetry && (
            <Button variant="light" onClick={onRetry}>
              {th.common.retry}
            </Button>
          )}
        </div>
      </div>
    </Panel>
  );
}

interface PlayerCardProps {
  player: RoomPlayer;
  isHost: boolean;
  isMe: boolean;
}

function PlayerCard({ player, isHost, isMe }: PlayerCardProps) {
  return (
    <div className="flex h-full min-h-[76px] items-center gap-3 rounded-card border-2 border-ink bg-white p-3 shadow-hard-sm">
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-ink bg-paper font-mono text-sm font-semibold"
        aria-label={th.room.seatLabel.replace('{seat}', String(player.seat + 1))}
      >
        {player.seat + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[17px] font-bold">{player.name}</p>
        <p className="flex items-center gap-1.5 text-[13px] text-ink-soft">
          <span
            className={`h-2 w-2 rounded-full ${
              player.connected ? 'bg-family-green' : 'bg-line'
            }`}
            aria-hidden="true"
          />
          {player.connected ? th.common.online : th.common.offline}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {isHost && (
          <Crown
            size={17}
            className="text-family-yellow"
            role="img"
            aria-label={th.room.hostBadge}
          />
        )}
        {isMe && (
          <Chip tone="gold" className="px-2 py-1 text-[12px]">
            {th.room.youBadge}
          </Chip>
        )}
      </div>
    </div>
  );
}

export function Room() {
  const { code: rawCode = '' } = useParams();
  const code = normalizeRoomCode(rawCode);
  const codeIsValid = rawCode.trim() === code && isValidRoomCode(code);
  const navigate = useNavigate();
  const room = useRoom(codeIsValid ? code : '');
  const showToast = useUiStore((state) => state.showToast);

  const [nickname, setNickname] = useState(() =>
    normalizeNickname(getLastNickname()).slice(0, NICKNAME_MAX_LENGTH),
  );
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const offlineTimer = useRef<number | null>(null);

  const uid = room.uid;
  const me = uid ? room.players[uid] : undefined;
  const isMember = Boolean(uid && me);
  const isHost = Boolean(uid && room.meta?.hostUid === uid);
  const playerEntries = Object.entries(room.players).sort(
    (a, b) => a[1].seat - b[1].seat || a[1].joinedAt - b[1].joinedAt,
  );
  const playerCount = playerEntries.length;
  const nicknameValid = isValidNickname(nickname);
  const normalizedNickname = normalizeNickname(nickname);
  const hostUid = room.meta?.hostUid;
  const inviteUrl = code ? getRoomUrl(code) : '';
  const isLoading =
    room.loading || (!room.meta && !room.errorCode && !room.authErrorCode);

  useHostLoop(codeIsValid ? code : '', room.uid, Boolean(room.uid && isHost && room.meta));

  const game = useGameState(
    codeIsValid ? code : '',
    room.uid,
    Boolean(room.uid && isMember && room.meta?.status === 'playing'),
  );

  useActionFeedback(
    codeIsValid ? code : '',
    room.uid,
    isMember,
    (reason) => {
      setStarting(false);
      showToast(th.rejections[reason] ?? th.rejections.INVALID_ACTION, 'error');
    },
  );

  useEffect(() => {
    if (room.meta?.status === 'playing') setStarting(false);
  }, [room.meta?.status]);

  useEffect(() => {
    if (!starting) return;
    const timer = window.setTimeout(() => setStarting(false), 10000);
    return () => window.clearTimeout(timer);
  }, [starting]);

  useEffect(() => {
    if (nicknameValid) setLastNickname(normalizedNickname);
  }, [nicknameValid, normalizedNickname]);

  useEffect(() => {
    if (!isMember) return;
    setLastRoomCode(code);
  }, [isMember, code]);

  useEffect(() => {
    if (!uid || !isMember) return;

    if (offlineTimer.current !== null) {
      window.clearTimeout(offlineTimer.current);
      offlineTimer.current = null;
    }
    void ensurePresence(code, uid).catch(() => undefined);

    return () => {
      // Defer the offline write so React StrictMode's mount/unmount probe does
      // not cancel the onDisconnect handler registered by the committed mount.
      offlineTimer.current = window.setTimeout(() => {
        offlineTimer.current = null;
        void markRoomOffline(code, uid);
      }, 150);
    };
  }, [code, uid, isMember, hostUid]);

  function reload() {
    window.location.reload();
  }

  async function handleJoin() {
    if (!nicknameValid || joining) return;
    setJoining(true);
    try {
      const result = await joinRoom(code, nickname);
      setLastNickname(result.name);
      setLastRoomCode(code);
      showToast(result.alreadyMember ? th.room.joinAlready : th.room.joinSuccess);
    } catch (error) {
      showToast(th.errors[errorCodeOf(error)], 'error');
    } finally {
      setJoining(false);
    }
  }

  async function handleLeave() {
    if (!uid || leaving) return;
    setLeaving(true);
    try {
      await leaveRoom(code, uid);
      clearLastRoomCode();
      showToast(th.room.leftRoom);
      navigate('/');
    } catch (error) {
      showToast(th.errors[errorCodeOf(error)], 'error');
    } finally {
      setLeaving(false);
    }
  }

  async function handleStart() {
    if (!uid || !isHost || starting || playerCount < 3) return;
    setStarting(true);
    try {
      await sendStartGame(code, uid);
    } catch (error) {
      setStarting(false);
      showToast(th.errors[errorCodeOf(error)], 'error');
    }
  }

  async function handleCopy() {
    const copied = await copyText(inviteUrl);
    showToast(copied ? th.room.copiedLink : th.room.copyFailed, copied ? 'info' : 'error');
  }

  function renderContent() {
    if (room.authErrorCode) {
      return (
        <RoomStatus
          title={errorTitleFor(room.authErrorCode)}
          description={errorDescriptionFor(room.authErrorCode)}
          onBack={() => navigate('/')}
          onRetry={reload}
        />
      );
    }

    if (room.errorCode === 'INVALID_CODE') {
      return (
        <RoomStatus
          title={errorTitleFor('INVALID_CODE')}
          description={errorDescriptionFor('INVALID_CODE')}
          code={rawCode}
          onBack={() => navigate('/')}
        />
      );
    }

    if (room.errorCode === 'ROOM_NOT_FOUND') {
      return (
        <RoomStatus
          title={errorTitleFor('ROOM_NOT_FOUND')}
          description={errorDescriptionFor('ROOM_NOT_FOUND')}
          code={code}
          onBack={() => navigate('/')}
        />
      );
    }

    if (room.errorCode) {
      return (
        <RoomStatus
          title={errorTitleFor(room.errorCode)}
          description={errorDescriptionFor(room.errorCode)}
          code={code}
          onBack={() => navigate('/')}
          onRetry={reload}
        />
      );
    }

    if (isLoading) {
      return (
        <Panel className="mx-auto mt-10 max-w-xl text-center">
          <Loader2
            size={30}
            className="mx-auto mb-3 animate-spin text-accent"
            aria-hidden="true"
          />
          <h1 className="font-display text-2xl font-extrabold">{th.room.loadingTitle}</h1>
          <p className="mt-2 text-ink-soft">{th.room.loadingDescription}</p>
        </Panel>
      );
    }

    if (!room.meta) {
      return (
        <RoomStatus
          title={errorTitleFor('ROOM_NOT_FOUND')}
          description={errorDescriptionFor('ROOM_NOT_FOUND')}
          code={code}
          onBack={() => navigate('/')}
        />
      );
    }

    if (room.meta.status === 'finished') {
      return (
        <RoomStatus
          title={th.room.finishedTitle}
          description={th.room.finishedDescription}
          code={code}
          onBack={() => navigate('/')}
        />
      );
    }

    if (room.meta.status === 'playing') {
      if (!isMember || !uid) {
        return (
          <RoomStatus
            title={th.room.startedTitle}
            description={th.room.startedDescription}
            code={code}
            onBack={() => navigate('/')}
          />
        );
      }

      return (
        <GameRoom
          code={code}
          uid={uid}
          hostUid={hostUid ?? null}
          players={room.players}
          publicState={game.publicState}
          privateState={game.privateState}
          loading={game.loading}
          errorCode={game.errorCode}
          onRetry={reload}
        />
      );
    }

    if (!isMember) {
      if (playerCount >= ROOM_MAX_PLAYERS) {
        return (
          <RoomStatus
            title={th.room.fullTitle}
            description={th.room.fullDescription}
            code={code}
            onBack={() => navigate('/')}
          />
        );
      }

      return (
        <Panel className="mx-auto mt-8 max-w-xl">
          <div className="flex flex-col gap-4">
            <Chip tone="gold" className="self-start">
              {th.room.lobbyKicker}
            </Chip>
            <h1 className="font-display text-[30px] font-extrabold leading-tight">
              {th.room.joinTitle.replace('{code}', code)}
            </h1>
            <p className="text-ink-soft">{th.room.joinDescription}</p>
            <div className="rounded-btn border-2 border-ink bg-paper px-3 py-2 text-center font-mono text-[30px] font-semibold tracking-[0.28em]">
              {code}
            </div>
            <div>
              <label className="field-label" htmlFor="join-nickname">
                {th.home.nicknameLabel}
              </label>
              <TextInput
                id="join-nickname"
                data-testid="join-nickname-input"
                name="nickname"
                type="text"
                maxLength={NICKNAME_MAX_LENGTH}
                autoComplete="nickname"
                value={nickname}
                placeholder={th.home.nicknamePlaceholder}
                onChange={(event) => setNickname(event.target.value)}
                aria-describedby="join-nickname-hint"
              />
              <p className="hint" id="join-nickname-hint" aria-live="polite">
                {nickname.length > 0 && !nicknameValid
                  ? th.home.nicknameTooShort
                  : th.room.duplicateHint}
              </p>
            </div>
            <Button
              variant="dark"
              className="w-full"
              data-testid="join-room-invite"
              disabled={!nicknameValid || joining}
              aria-busy={joining}
              onClick={() => void handleJoin()}
            >
              {joining && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
              {joining ? th.room.joining : th.room.joinButton}
            </Button>
          </div>
        </Panel>
      );
    }

    const emptySeats = Math.max(0, ROOM_MAX_PLAYERS - playerCount);

    return (
      <div className="mt-6 flex flex-col gap-5" data-testid="lobby">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Chip tone="gold">{th.room.lobbyKicker}</Chip>
            <h1 className="mt-2 font-display text-[clamp(32px,6vw,52px)] font-extrabold leading-tight">
              {th.room.lobbyTitle.replace('{code}', code)}
            </h1>
            <p className="mt-1 text-ink-soft">{th.room.lobbySubtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="paper">
              <Users size={15} strokeWidth={2.5} aria-hidden="true" />
              {th.room.playersCount.replace('{count}', String(playerCount))}
            </Chip>
            {!room.meta.hostConnected && (
              <Chip tone="accent">
                <WifiOff size={15} strokeWidth={2.5} aria-hidden="true" />
                {th.room.hostOffline}
              </Chip>
            )}
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <Panel
            title={
              <span className="flex items-center gap-2">
                <Users size={20} strokeWidth={2.5} aria-hidden="true" />
                {th.room.playersTitle}
              </span>
            }
          >
            <ul className="grid gap-3 sm:grid-cols-2" aria-label={th.room.lobbyAria}>
              {playerEntries.map(([playerUid, player]) => (
                <li
                  key={playerUid}
                  data-testid={`player-${playerUid}`}
                  data-connected={player.connected ? 'true' : 'false'}
                >
                  <PlayerCard
                    player={player}
                    isHost={playerUid === room.meta?.hostUid}
                    isMe={playerUid === uid}
                  />
                </li>
              ))}
              {Array.from({ length: emptySeats }, (_, index) => (
                <li key={`empty-${index}`}>
                  <div className="grid min-h-[76px] place-items-center rounded-card border-2 border-dashed border-line bg-white/50 p-3 text-[14px] text-ink-soft">
                    {th.room.emptySeat}
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex flex-col gap-2 border-t-2 border-dashed border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <Button
                  variant="gold"
                  className="self-start"
                  data-testid="start-game"
                  aria-busy={starting}
                  disabled={!isHost || playerCount < 3 || starting}
                  onClick={() => void handleStart()}
                >
                  {starting && (
                    <Loader2 size={17} className="animate-spin" aria-hidden="true" />
                  )}
                  {starting ? th.room.starting : th.common.startGame}
                </Button>
                <p className="text-[14px] text-ink-soft">
                  {!isHost
                    ? th.room.startWaitingHint
                    : playerCount < 3
                      ? th.room.startNeedPlayers
                      : th.room.startReadyHint}
                </p>
              </div>
              <Button
                variant="light"
                className="self-start"
                data-testid="leave-room"
                disabled={leaving}
                aria-busy={leaving}
                onClick={() => void handleLeave()}
              >
                {leaving ? (
                  <Loader2 size={17} className="animate-spin" aria-hidden="true" />
                ) : (
                  <LogOut size={17} strokeWidth={2.5} aria-hidden="true" />
                )}
                {leaving ? th.room.leaving : th.common.leaveRoom}
              </Button>
            </div>
            <p className="mt-2 text-[13px] text-ink-soft">{th.room.leaveNote}</p>
          </Panel>

          <div className="flex flex-col gap-5">
            <Panel title={th.room.inviteTitle}>
              <p className="text-[15px] text-ink-soft">{th.room.inviteDescription}</p>
              <div className="mt-4 rounded-btn border-2 border-ink bg-paper px-3 py-2 text-center font-mono text-[28px] font-semibold tracking-[0.24em]" data-testid="room-code">
                {code}
              </div>
              <div className="mt-3 flex gap-2">
                <TextInput
                  readOnly
                  value={inviteUrl}
                  aria-label={th.room.inviteLinkLabel}
                  className="h-12 font-body text-[14px]"
                  onFocus={(event) => event.currentTarget.select()}
                />
              </div>
              <Button
                variant="light"
                className="mt-3 w-full"
                data-testid="copy-invite"
                onClick={() => void handleCopy()}
              >
                <Copy size={17} strokeWidth={2.5} aria-hidden="true" />
                {th.room.copyLink}
              </Button>
            </Panel>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh" data-testid="room-page">
      <div className="grain-overlay" aria-hidden="true" />
      <header className="mx-auto flex w-full max-w-[1100px] flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-[22px]">
        <Brand />
        <Link
          to="/"
          className="font-display font-bold text-accent underline underline-offset-4"
        >
          {th.common.backToHome}
        </Link>
      </header>
      <main className="mx-auto w-full max-w-[1100px] px-4 pb-16">{renderContent()}</main>
    </div>
  );
}
