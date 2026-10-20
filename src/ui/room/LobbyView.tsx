import { Crown, Loader2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { th } from '@/i18n/th';
import { NICKNAME_MAX_LENGTH } from '@/net/roomCode';
import { ROOM_MAX_PLAYERS, type RoomPlayer, type RoomPlayers } from '@/net/roomTypes';
import { Brand } from '@/ui/common/Brand';
import { Button } from '@/ui/common/Button';
import { Chip } from '@/ui/common/Chip';
import { TextInput } from '@/ui/common/TextInput';

const CODE_COLORS = ['--red', '--blue', '--green', '--yellow', '--purple', '--black'] as const;
const CODE_ROTATIONS = ['-2.5deg', '1.5deg', '-1deg', '2.5deg', '-1.5deg'] as const;

interface RoomHeaderProps {
  canLeave: boolean;
  leaving: boolean;
  onLeave: () => void;
}

/** Header shared by the join and lobby views. */
export function RoomHeader({ canLeave, leaving, onLeave }: RoomHeaderProps) {
  return (
    <header className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-[22px]">
      <Brand />
      <nav className="flex flex-wrap items-center gap-2.5" aria-label={th.room.headerNavAria}>
        <a href="/#how" className="nav-link">
          {th.home.navHowTo}
        </a>
        <Link to="/" className="nav-link">
          {th.common.backToHome}
        </Link>
        {canLeave && (
          <button
            type="button"
            className="nav-link"
            data-testid="leave-room"
            disabled={leaving}
            aria-busy={leaving}
            onClick={onLeave}
          >
            {leaving && <Loader2 size={17} className="animate-spin" aria-hidden="true" />}
            {leaving ? th.room.leaving : th.common.leaveRoom}
          </button>
        )}
      </nav>
    </header>
  );
}

function RoomHero({ before, stamp, lead }: { before: string; stamp: string; lead: string }) {
  return (
    <section className="flex flex-col items-center gap-2.5 pt-3.5 text-center">
      <h1 className="font-display text-[clamp(32px,6.5vw,52px)] font-extrabold leading-[1.15]">
        <span className="whitespace-nowrap">
          {before}
          <span className="stamp">{stamp}</span>
        </span>
      </h1>
      <p className="max-w-[560px] text-[18px] text-ink-soft max-md:text-[16px]">{lead}</p>
    </section>
  );
}

function WaitDots({ label }: { label: string }) {
  return (
    <span className="seat-status wait-dots">
      {label}
      <span aria-hidden="true">.</span>
      <span aria-hidden="true">.</span>
      <span aria-hidden="true">.</span>
    </span>
  );
}

interface RoomCodePanelProps {
  code: string;
  inviteUrl: string;
  onCopyLink: () => void;
  onCopyCode: () => void;
}

function RoomCodePanel({ code, inviteUrl, onCopyLink, onCopyCode }: RoomCodePanelProps) {
  return (
    <section className="rounded-panel border-2 border-ink bg-white px-[22px] py-5 shadow-hard max-md:p-4">
      <span className="field-label">{th.room.codePanelLabel}</span>
      <span className="sr-only" data-testid="room-code">
        {code}
      </span>
      <div
        className="code-tiles"
        role="img"
        aria-label={th.room.codeAria.replace('{code}', code.split('').join(' '))}
      >
        {code.split('').map((digit, index) => (
          <div
            key={`${digit}-${index}`}
            className="code-tile"
            style={
              {
                '--c': `var(${CODE_COLORS[index % CODE_COLORS.length]})`,
                '--r': CODE_ROTATIONS[index % CODE_ROTATIONS.length],
              } as CSSProperties
            }
            aria-hidden="true"
          >
            {digit}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-stretch gap-3">
        <div className="link-box" aria-label={th.room.inviteLinkLabel}>
          <span className="min-w-0 truncate">{inviteUrl}</span>
        </div>
        <Button
          variant="dark"
          data-testid="copy-invite"
          className="max-md:flex-1 max-md:basis-[140px]"
          onClick={onCopyLink}
        >
          {th.room.copyInviteLink}
        </Button>
        <Button
          variant="light"
          data-testid="copy-code"
          className="max-md:flex-1 max-md:basis-[140px]"
          onClick={onCopyCode}
        >
          {th.room.copyCode}
        </Button>
      </div>
    </section>
  );
}

function playerInitial(name: string): string {
  const chars = Array.from(name.trim());
  const firstConsonant = chars.find((char) => /[A-Za-zก-ฮ]/.test(char));
  return (firstConsonant ?? chars[0] ?? '?').toUpperCase();
}

interface SeatCardProps {
  playerUid: string;
  player: RoomPlayer;
  isHost: boolean;
  isMe: boolean;
}

function SeatCard({ playerUid, player, isHost, isMe }: SeatCardProps) {
  const classes = [
    'seat-card',
    isMe ? 'is-me' : '',
    player.connected ? '' : 'is-off',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      data-testid={`player-${playerUid}`}
      data-connected={player.connected ? 'true' : 'false'}
    >
      <span className="seat-no">
        {th.room.seatNumber.replace('{seat}', String(player.seat + 1))}
      </span>
      {isHost && (
        <Crown
          size={22}
          className="seat-crown text-ink"
          fill="var(--gold)"
          strokeWidth={2}
          role="img"
          aria-label={th.room.hostBadge}
        />
      )}
      <span className="seat-avatar" aria-hidden="true">
        {playerInitial(player.name)}
      </span>
      <p className="seat-name">{player.name}</p>
      <div className="seat-tags">
        {isHost && <span className="seat-tag">{th.room.hostBadge}</span>}
        {isMe && <span className="seat-tag seat-tag-you">{th.room.youBadge}</span>}
      </div>
      <span className="seat-status">
        <span className="seat-dot" aria-hidden="true" />
        {player.connected ? th.common.online : th.room.disconnected}
      </span>
    </div>
  );
}

function EmptySeat({ seat, showWaiting }: { seat: number; showWaiting: boolean }) {
  return (
    <div className="seat-card is-empty">
      <span className="seat-no">
        {th.room.seatNumber.replace('{seat}', String(seat))}
      </span>
      <span className="seat-empty-ghost" aria-hidden="true">
        +
      </span>
      <span className="seat-empty-label">{th.room.emptySeat}</span>
      {showWaiting && <WaitDots label={th.room.waitingForFriend} />}
    </div>
  );
}

interface SeatGridProps {
  players: RoomPlayers;
  hostUid: string | null;
  viewerUid: string | null;
}

function SeatGrid({ players, hostUid, viewerUid }: SeatGridProps) {
  const bySeat = new Map<number, { uid: string; player: RoomPlayer }>();
  for (const [uid, player] of Object.entries(players)) {
    if (
      Number.isInteger(player.seat) &&
      player.seat >= 0 &&
      player.seat < ROOM_MAX_PLAYERS &&
      !bySeat.has(player.seat)
    ) {
      bySeat.set(player.seat, { uid, player });
    }
  }

  const firstEmptySeat = Array.from({ length: ROOM_MAX_PLAYERS }, (_, seat) => seat).find(
    (seat) => !bySeat.has(seat),
  );

  return (
    <ul className="seat-grid" aria-label={th.room.lobbyAria}>
      {Array.from({ length: ROOM_MAX_PLAYERS }, (_, seat) => {
        const entry = bySeat.get(seat);
        return (
          <li key={seat} className="min-w-0">
            {entry ? (
              <SeatCard
                playerUid={entry.uid}
                player={entry.player}
                isHost={entry.uid === hostUid}
                isMe={entry.uid === viewerUid}
              />
            ) : (
              <EmptySeat seat={seat + 1} showWaiting={seat === firstEmptySeat} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function SeatSection({
  players,
  hostUid,
  viewerUid,
}: {
  players: RoomPlayers;
  hostUid: string | null;
  viewerUid: string | null;
}) {
  const count = Object.keys(players).length;

  return (
    <section>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
        <h2 className="font-display text-[26px] font-bold leading-tight max-md:text-[22px]">
          {th.room.seatsTitle}
        </h2>
        <Chip tone="gold" className="font-mono font-semibold">
          {th.room.playersCount.replace('{count}', String(count))}
        </Chip>
      </div>
      <SeatGrid players={players} hostUid={hostUid} viewerUid={viewerUid} />
    </section>
  );
}

function investorFact(count: number): string {
  if (count <= 3) return th.room.factsInvestors3;
  if (count === 4) return th.room.factsInvestors4;
  if (count === 5) return th.room.factsInvestors5;
  return th.room.factsInvestors6;
}

function LobbyFacts({ count, title }: { count: number; title?: string }) {
  const effectiveCount = Math.max(3, Math.min(ROOM_MAX_PLAYERS, count));

  return (
    <>
      <h2>{title ?? (count <= 3 ? th.room.factsTitleWaiting : th.room.factsTitleReady.replace('{count}', String(count)))}</h2>
      <ul className="lobby-facts">
        <li>
          <span className="k">{th.room.factsInvestors}</span>
          <span>{investorFact(effectiveCount)}</span>
        </li>
        <li>
          <span className="k">{th.room.factsInfluence}</span>
          <span>{th.room.factsInfluenceValue}</span>
        </li>
        <li>
          <span className="k">{th.room.factsMoney}</span>
          <span>{th.room.factsMoneyValue}</span>
        </li>
      </ul>
    </>
  );
}

function LobbyFooter() {
  return (
    <div className="flex flex-wrap justify-center gap-2.5 py-6">
      <Chip tone="paper">{th.home.footerReconnect}</Chip>
      <Chip tone="paper">{th.room.lobbyFooterLeave}</Chip>
      <Chip tone="paper">{th.room.lobbyFooterStarted}</Chip>
    </div>
  );
}

export interface LobbyViewProps {
  code: string;
  inviteUrl: string;
  players: RoomPlayers;
  hostUid: string | null;
  uid: string;
  isHost: boolean;
  starting: boolean;
  onCopyLink: () => void;
  onCopyCode: () => void;
  onStart: () => void;
}

export function LobbyView({
  code,
  inviteUrl,
  players,
  hostUid,
  uid,
  isHost,
  starting,
  onCopyLink,
  onCopyCode,
  onStart,
}: LobbyViewProps) {
  const count = Object.keys(players).length;
  const hostName = hostUid ? (players[hostUid]?.name ?? '') : '';
  const lead = !isHost
    ? th.room.lobbyLeadGuest
    : count < 3
      ? th.room.lobbyLeadWaiting
      : th.room.lobbyLeadReady;
  const startHint = starting
    ? th.room.starting
    : count < 3
      ? th.room.startNeedMore.replace('{count}', String(3 - count))
      : th.room.startReadyWithCount.replace('{count}', String(count));

  return (
    <div data-testid="lobby">
      <RoomHero before={th.room.lobbyHeroBefore} stamp={th.room.lobbyHeroStamp} lead={lead} />

      <section className="room-board" aria-label={th.room.lobbyBoardAria}>
        <div className="room-board-inner">
          <RoomCodePanel
            code={code}
            inviteUrl={inviteUrl}
            onCopyLink={onCopyLink}
            onCopyCode={onCopyCode}
          />

          <SeatSection players={players} hostUid={hostUid} viewerUid={uid} />

          <div className="lobby-actions">
            {isHost ? (
              <div className="lobby-action-card lobby-action-start">
                <span className="lobby-ribbon">{th.room.hostBadge}</span>
                <h2>{th.common.startGame}</h2>
                <p>{th.room.startCardDescription}</p>
                <Button
                  variant="light"
                  className="w-full"
                  data-testid="start-game"
                  aria-busy={starting}
                  disabled={count < 3 || starting}
                  onClick={onStart}
                >
                  {starting && <Loader2 size={17} className="animate-spin" aria-hidden="true" />}
                  {starting ? th.room.starting : th.common.startGame}
                </Button>
                <p className="hint">{startHint}</p>
              </div>
            ) : (
              <div className="lobby-action-card">
                <h2>{th.room.guestStartTitle}</h2>
                <p>{th.room.guestStartDescription.replace('{name}', hostName)}</p>
                <WaitDots label={th.room.guestStartWaiting} />
              </div>
            )}

            <div className="lobby-action-card">
              <LobbyFacts count={count} />
            </div>
          </div>
        </div>
      </section>

      <LobbyFooter />
    </div>
  );
}

export interface JoinRoomViewProps {
  code: string;
  inviteUrl: string;
  players: RoomPlayers;
  hostUid: string | null;
  nickname: string;
  nicknameValid: boolean;
  joining: boolean;
  onNicknameChange: (value: string) => void;
  onJoin: () => void;
  onCopyLink: () => void;
  onCopyCode: () => void;
}

export function JoinRoomView({
  code,
  inviteUrl,
  players,
  hostUid,
  nickname,
  nicknameValid,
  joining,
  onNicknameChange,
  onJoin,
  onCopyLink,
  onCopyCode,
}: JoinRoomViewProps) {
  const count = Object.keys(players).length;
  const projectedCount = Math.min(ROOM_MAX_PLAYERS, count + 1);

  return (
    <div data-testid="join-room-view">
      <RoomHero before={th.room.joinHeroBefore} stamp={th.room.joinHeroStamp} lead={th.room.joinLead} />

      <section className="room-board" aria-label={th.room.joinBoardAria}>
        <div className="room-board-inner">
          <RoomCodePanel
            code={code}
            inviteUrl={inviteUrl}
            onCopyLink={onCopyLink}
            onCopyCode={onCopyCode}
          />

          <SeatSection players={players} hostUid={hostUid} viewerUid={null} />

          <div className="lobby-actions">
            <div className="lobby-action-card lobby-action-start">
              <span className="lobby-ribbon">{th.room.joinCardRibbon}</span>
              <h2>{th.room.joinCardTitle}</h2>
              <p>{th.room.joinCardDescription}</p>
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
                  onChange={(event) => onNicknameChange(event.target.value)}
                  aria-describedby="join-nickname-hint"
                />
                <p className="hint" id="join-nickname-hint" aria-live="polite">
                  {nickname.length > 0 && !nicknameValid
                    ? th.home.nicknameTooShort
                    : th.room.duplicateHint}
                </p>
              </div>
              <Button
                variant="light"
                className="w-full"
                data-testid="join-room-invite"
                disabled={!nicknameValid || joining}
                aria-busy={joining}
                onClick={onJoin}
              >
                {joining && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
                {joining ? th.room.joining : th.room.joinButton}
              </Button>
            </div>

            <div className="lobby-action-card">
              <LobbyFacts
                count={projectedCount}
                title={
                  projectedCount <= 3
                    ? th.room.factsTitleWaiting
                    : th.room.factsTitleReady.replace('{count}', String(projectedCount))
                }
              />
            </div>
          </div>
        </div>
      </section>

      <LobbyFooter />
    </div>
  );
}
