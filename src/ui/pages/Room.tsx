import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

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
import { ROOM_MAX_PLAYERS, type RoomErrorCode } from '@/net/roomTypes';
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
import { Button } from '@/ui/common/Button';
import { Chip } from '@/ui/common/Chip';
import { Panel } from '@/ui/common/Panel';
import { GameRoom } from '@/ui/pages/GameRoom';
import { JoinRoomView, LobbyView, RoomHeader } from '@/ui/room/LobbyView';

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
  const playerCount = Object.keys(room.players).length;
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

  async function handleCopyCode() {
    const copied = await copyText(code);
    showToast(
      copied ? th.room.copiedCode.replace('{code}', code) : th.room.copyFailed,
      copied ? 'info' : 'error',
    );
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
        <JoinRoomView
          code={code}
          inviteUrl={inviteUrl}
          players={room.players}
          hostUid={hostUid ?? null}
          nickname={nickname}
          nicknameValid={nicknameValid}
          joining={joining}
          onNicknameChange={setNickname}
          onJoin={() => void handleJoin()}
          onCopyLink={() => void handleCopy()}
          onCopyCode={() => void handleCopyCode()}
        />
      );
    }

    return (
      <LobbyView
        code={code}
        inviteUrl={inviteUrl}
        players={room.players}
        hostUid={hostUid ?? null}
        uid={uid ?? ''}
        isHost={isHost}
        starting={starting}
        onCopyLink={() => void handleCopy()}
        onCopyCode={() => void handleCopyCode()}
        onStart={() => void handleStart()}
      />
    );
  }

  return (
    <div className="min-h-dvh" data-testid="room-page">
      <div className="grain-overlay" aria-hidden="true" />
      <RoomHeader
        canLeave={Boolean(isMember && room.meta?.status === 'lobby')}
        leaving={leaving}
        onLeave={() => void handleLeave()}
      />
      <main className="mx-auto w-full max-w-[1200px] px-4 pb-16">{renderContent()}</main>
    </div>
  );
}
