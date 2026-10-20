import { useState, type CSSProperties, type ReactNode } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom';

import { DEAL_BOARD_SPACES } from '@/engine/config/dealBoard';
import type { FamilyColor } from '@/engine/config/families';
import { project } from '@/engine/project';
import { applyAction } from '@/engine/reducer';
import { createInitialState } from '@/engine/setup';
import type { FullGameState } from '@/engine/types';
import { th } from '@/i18n/th';
import {
  NICKNAME_MAX_LENGTH,
  ROOM_CODE_LENGTH,
  isValidNickname,
  normalizeRoomCode,
} from '@/net/roomCode';
import type { RoomPlayers } from '@/net/roomTypes';
import { getRoomUrl } from '@/net/rooms';
import { useUiStore } from '@/store/uiStore';
import { Brand } from '@/ui/common/Brand';
import { Button } from '@/ui/common/Button';
import { Chip } from '@/ui/common/Chip';
import { FamilyCard } from '@/ui/common/FamilyCard';
import { FAMILY_PRESENTATION } from '@/ui/common/families';
import { Panel } from '@/ui/common/Panel';
import { Pawn } from '@/ui/common/Pawn';
import { TextInput } from '@/ui/common/TextInput';
import { GameRoom } from '@/ui/pages/GameRoom';
import { JoinRoomView, LobbyView } from '@/ui/room/LobbyView';

const PREVIEW_SCREEN_IDS = ['home', 'join', 'lobby', 'game', 'setup', 'status'] as const;
type PreviewScreenId = (typeof PREVIEW_SCREEN_IDS)[number];

const PREVIEW_NOW = Date.UTC(2026, 9, 20, 12, 0, 0);
const PREVIEW_HOST = 'p1';
const PREVIEW_VIEWER = 'p2';
const PREVIEW_OFFLINE = 'p4';

const PREVIEW_PLAYERS = [
  { uid: PREVIEW_HOST, name: th.preview.mockPlayers.host },
  { uid: PREVIEW_VIEWER, name: th.preview.mockPlayers.guest },
  { uid: 'p3', name: th.preview.mockPlayers.third },
  { uid: PREVIEW_OFFLINE, name: th.preview.mockPlayers.fourth },
];

function previewExclusions(state: FullGameState): FamilyColor[] {
  const space = DEAL_BOARD_SPACES.find((entry) => entry.index === state.pawnSpace);
  const boss = state.players.find((player) => player.uid === state.bossUid);
  if (!space || !boss) return [];

  const colors: FamilyColor[] = [];
  for (const group of space.groups) {
    const participants = boss.investors.filter(
      (color) => group.colors.includes(color) && !state.onVacation.includes(color),
    );
    if (participants.length > group.pick) {
      colors.push(...participants.slice(0, participants.length - group.pick));
    }
  }
  return colors;
}

function buildPreviewGame(): {
  setup: FullGameState;
  turn: FullGameState;
  afterMove: FullGameState;
  dealOpen: FullGameState;
  bossUid: string;
  pickerUid: string;
} {
  const started = applyAction(
    createInitialState(66, PREVIEW_PLAYERS),
    { type: 'START_GAME', uid: PREVIEW_HOST },
    PREVIEW_NOW,
  );
  if ('error' in started) {
    throw new Error(`Preview START_GAME failed: ${started.error}`);
  }

  const pickerUid = started.state.startPickerUid;
  if (!pickerUid) {
    throw new Error('Preview START_GAME did not select a start picker');
  }

  const picked = applyAction(
    started.state,
    { type: 'SET_START_SPACE', uid: pickerUid, space: 7 },
    PREVIEW_NOW + 1_000,
  );
  if ('error' in picked) {
    throw new Error(`Preview SET_START_SPACE failed: ${picked.error}`);
  }

  const bossUid = picked.state.bossUid;
  if (!bossUid) {
    throw new Error('Preview SET_START_SPACE did not select a boss');
  }

  const rolled = applyAction(
    picked.state,
    { type: 'ROLL_DICE', uid: bossUid },
    PREVIEW_NOW + 2_000,
  );
  if ('error' in rolled) {
    throw new Error(`Preview ROLL_DICE failed: ${rolled.error}`);
  }

  const opened = applyAction(
    rolled.state,
    {
      type: 'OPEN_DEAL',
      uid: bossUid,
      excludeColors: previewExclusions(rolled.state),
    },
    PREVIEW_NOW + 3_000,
  );
  if ('error' in opened) {
    throw new Error(`Preview OPEN_DEAL failed: ${opened.error}`);
  }

  return {
    setup: started.state,
    turn: picked.state,
    afterMove: rolled.state,
    dealOpen: opened.state,
    bossUid,
    pickerUid,
  };
}

const PREVIEW_GAME = buildPreviewGame();

function isPreviewScreen(value: string | undefined): value is PreviewScreenId {
  return value !== undefined && (PREVIEW_SCREEN_IDS as readonly string[]).includes(value);
}

function roomPlayersFromState(state: FullGameState): RoomPlayers {
  const players: RoomPlayers = {};
  for (const player of state.players) {
    players[player.uid] = {
      name: player.name,
      seat: player.seat,
      connected: player.uid !== PREVIEW_OFFLINE,
      lastSeen: player.uid === PREVIEW_OFFLINE ? PREVIEW_NOW - 60_000 : PREVIEW_NOW,
      joinedAt: PREVIEW_NOW + player.seat,
    };
  }
  return players;
}

function PreviewToolbar() {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper">
      <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <Brand />
        <Chip tone="gold" className="px-2.5 py-1 text-[11px]">
          {th.preview.badge}
        </Chip>
        <Link
          to="/"
          className="order-2 ml-auto rounded-full border-2 border-ink bg-accent px-3.5 py-2 font-display text-[14px] font-bold text-white no-underline shadow-hard-sm md:order-4 md:ml-0"
        >
          {th.preview.openApp}
        </Link>
        <nav
          className="order-3 flex w-full flex-wrap gap-1.5 md:ml-auto md:w-auto"
          aria-label={th.preview.navAria}
          data-testid="preview-nav"
        >
          {PREVIEW_SCREEN_IDS.map((id) => (
            <NavLink
              key={id}
              to={`/preview/${id}`}
              className={({ isActive }) =>
                `rounded-full border-2 border-ink px-3 py-1.5 font-display text-[14px] font-bold no-underline shadow-hard-sm transition-colors ${
                  isActive ? 'bg-ink text-paper' : 'bg-white text-ink hover:bg-gold'
                }`
              }
            >
              {th.preview.screens[id]}
            </NavLink>
          ))}
        </nav>
      </div>
      <p className="border-t-2 border-line bg-white/60 px-4 py-1.5 text-center text-[12px] text-ink-soft">
        {th.preview.note}
      </p>
    </header>
  );
}

function PreviewFrame({ screen, children }: { screen: PreviewScreenId; children: ReactNode }) {
  return (
    <div className="min-h-dvh" data-testid={`preview-${screen}`}>
      <div className="grain-overlay" aria-hidden="true" />
      <PreviewToolbar />
      <div className="relative mx-auto w-full max-w-[1200px] px-4 pt-3">
        <p className="text-center text-[13px] text-ink-soft">
          {th.preview.descriptions[screen]}
        </p>
      </div>
      <main className="relative mx-auto w-full max-w-[1200px] px-4 pb-16">{children}</main>
    </div>
  );
}

const HOW_TO = [
  {
    color: '--blue',
    number: '1',
    title: th.home.howCreateTitle,
    text: th.home.howCreateText,
  },
  {
    color: '--purple',
    number: '2',
    title: th.home.howShareTitle,
    text: th.home.howShareText,
  },
  {
    color: '--red',
    number: '3',
    title: th.home.howPlayTitle,
    text: th.home.howPlayText,
  },
] as const;

function PreviewHome() {
  const [nickname, setNickname] = useState<string>(th.preview.mockNickname);
  const [code, setCode] = useState('');
  const showToast = useUiStore((state) => state.showToast);
  const notInteractive = () => showToast(th.preview.nonInteractive, 'info');

  return (
    <div className="flex flex-col">
      <section className="flex flex-col items-center gap-5 pt-6 text-center">
        <div className="flex w-full items-center justify-between gap-3">
          <Chip tone="gold">{th.preview.screens.home}</Chip>
          <a
            href="#preview-how"
            className="rounded-full border-2 border-ink bg-white px-3.5 py-2.5 font-display text-[16px] font-medium text-ink no-underline shadow-hard-sm transition-colors hover:bg-gold max-md:px-3 max-md:py-2 max-md:text-[14px]"
          >
            {th.home.navHowTo}
          </a>
        </div>

        <h1 className="mt-1 font-display text-[clamp(36px,8vw,68px)] font-extrabold leading-[1.12] tracking-[-0.01em]">
          <span className="whitespace-nowrap">
            {th.home.heroBefore}
            <span className="stamp">{th.home.heroStamp}</span>
          </span>{' '}
          <span className="whitespace-nowrap">{th.home.heroAfter}</span>
          <br />
          <span className="whitespace-nowrap">{th.home.heroTail}</span>
        </h1>

        <p className="max-w-[620px] text-[19px] text-ink-soft max-md:text-[17px]">
          {th.home.heroLead}
        </p>
        <div className="fan" aria-hidden="true">
          {FAMILY_PRESENTATION.map((family) => (
            <div key={family.id} className="fan-card">
              <FamilyCard family={family.id} />
            </div>
          ))}
        </div>
      </section>

      <section
        aria-label={th.home.boardAria}
        className="mx-auto mt-7 max-w-[860px] rounded-board border-[3px] border-ink bg-board p-3.5 shadow-[6px_7px_0_#1D1B2E] max-md:rounded-[18px] max-md:p-2 max-md:shadow-[4px_5px_0_#1D1B2E]"
      >
        <div className="flex flex-col gap-5 rounded-2xl border-2 border-dashed border-ink/35 px-[22px] pb-[26px] pt-[22px] max-md:px-3 max-md:pb-[18px] max-md:pt-[18px]">
          <div className="track" aria-hidden="true">
            {Array.from({ length: 15 }, (_, index) => {
              const space = index + 1;
              const family = FAMILY_PRESENTATION[index % FAMILY_PRESENTATION.length];
              return (
                <div
                  key={space}
                  className={`space ${space === 15 ? 'end' : ''}`}
                  style={{ '--c': `var(${family.cssVar})` } as CSSProperties}
                >
                  <span>{space}</span>
                  {space === 7 && <Pawn className="pawn" />}
                </div>
              );
            })}
          </div>
          <p className="-mt-2 text-center text-[14px] text-ink-soft">
            {th.home.boardCaption}
          </p>

          <form
            className="rounded-panel border-2 border-ink bg-white px-[22px] py-5 shadow-hard"
            onSubmit={(event) => event.preventDefault()}
          >
            <label className="field-label" htmlFor="preview-nickname">
              {th.home.nicknameLabel}
            </label>
            <TextInput
              id="preview-nickname"
              name="preview-nickname"
              type="text"
              maxLength={NICKNAME_MAX_LENGTH}
              placeholder={th.home.nicknamePlaceholder}
              autoComplete="off"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              aria-describedby="preview-nickname-hint"
            />
            <p className="hint" id="preview-nickname-hint">
              {nickname.trim().length > 0
                ? th.home.nicknameHint
                : th.home.nicknameTooShort}
            </p>
          </form>

          <div className="flex flex-wrap gap-[18px]">
            <div className="stripes relative flex min-w-0 flex-1 basis-[280px] flex-col gap-2.5 overflow-hidden rounded-panel border-2 border-ink bg-accent p-[22px] text-white shadow-hard max-md:p-[18px]">
              <span className="absolute -right-[34px] top-3.5 rotate-[35deg] border-y-2 border-ink bg-gold px-10 py-[2px] font-display text-[13px] font-bold text-ink">
                {th.home.createTag}
              </span>
              <h2 className="font-display text-[26px] font-bold leading-tight max-md:text-[22px]">
                {th.home.createTitle}
              </h2>
              <p className="flex-grow text-[16px] text-[#EAF0FF]">{th.home.createDescription}</p>
              <Button variant="light" className="mt-1 self-start" onClick={notInteractive}>
                {th.common.createRoom}
              </Button>
            </div>

            <div className="flex min-w-0 flex-1 basis-[280px] flex-col gap-2.5 rounded-panel border-2 border-ink bg-white p-[22px] shadow-hard max-md:p-[18px]">
              <label
                className="font-display text-[26px] font-bold leading-tight max-md:text-[22px]"
                htmlFor="preview-code"
              >
                {th.home.joinTitle}
              </label>
              <div className="flex flex-col gap-2.5">
                <TextInput
                  id="preview-code"
                  name="preview-code"
                  code
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={ROOM_CODE_LENGTH}
                  placeholder={th.home.codePlaceholder}
                  autoComplete="off"
                  value={code}
                  onChange={(event) => setCode(normalizeRoomCode(event.target.value))}
                  aria-describedby="preview-code-hint"
                />
                <Button variant="dark" className="w-full" onClick={notInteractive}>
                  {th.common.joinRoom}
                </Button>
              </div>
              <p className="hint" id="preview-code-hint">
                {th.home.codeHint}
              </p>
            </div>
          </div>

          <p className="text-center text-[13px] text-ink-soft">{th.preview.homeNote}</p>
        </div>
      </section>

      <section id="preview-how" className="flex flex-col items-center gap-[22px] pb-7 pt-14">
        <h2 className="font-display text-[34px] font-extrabold">{th.home.howTitle}</h2>
        <div className="flex w-full flex-wrap justify-center gap-[18px]">
          {HOW_TO.map((rule) => (
            <article
              key={rule.number}
              className="flex max-w-[330px] flex-1 basis-[240px] flex-col overflow-hidden rounded-card border-2 border-ink bg-white shadow-hard"
            >
              <div
                className="stripes flex items-center gap-3 border-b-2 border-ink px-4 py-3 text-white"
                style={{ backgroundColor: `var(${rule.color})` }}
              >
                <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full border-2 border-ink bg-white font-display text-[18px] font-extrabold text-ink">
                  {rule.number}
                </span>
                <span className="font-display text-[20px] font-bold">{rule.title}</span>
              </div>
              <p className="px-4 pb-[18px] pt-3.5 text-[16px] text-ink-soft">{rule.text}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-center gap-2.5 pb-14 pt-6">
        <Chip tone="paper">{th.home.footerNoSignup}</Chip>
        <Chip tone="paper">{th.home.footerReconnect}</Chip>
        <Chip tone="paper">{th.home.footerPrivacy}</Chip>
      </footer>
    </div>
  );
}

function PreviewJoin() {
  const [nickname, setNickname] = useState<string>(th.preview.mockNickname);
  const showToast = useUiStore((state) => state.showToast);
  const notInteractive = () => showToast(th.preview.nonInteractive, 'info');

  return (
    <JoinRoomView
      code={th.preview.mockRoomCode}
      inviteUrl={getRoomUrl(th.preview.mockRoomCode)}
      players={roomPlayersFromState(PREVIEW_GAME.turn)}
      hostUid={PREVIEW_HOST}
      nickname={nickname}
      nicknameValid={isValidNickname(nickname)}
      joining={false}
      onNicknameChange={setNickname}
      onJoin={notInteractive}
      onCopyLink={notInteractive}
      onCopyCode={notInteractive}
    />
  );
}

function PreviewLobby() {
  const showToast = useUiStore((state) => state.showToast);
  const notInteractive = () => showToast(th.preview.nonInteractive, 'info');

  return (
    <LobbyView
      code={th.preview.mockRoomCode}
      inviteUrl={getRoomUrl(th.preview.mockRoomCode)}
      players={roomPlayersFromState(PREVIEW_GAME.turn)}
      hostUid={PREVIEW_HOST}
      uid={PREVIEW_HOST}
      isHost
      starting={false}
      onCopyLink={notInteractive}
      onCopyCode={notInteractive}
      onStart={() => showToast(th.preview.lobbyNote, 'info')}
    />
  );
}

function PreviewStatus() {
  const navigate = useNavigate();
  const showToast = useUiStore((state) => state.showToast);

  return (
    <Panel className="mx-auto mt-10 max-w-xl">
      <div className="flex flex-col gap-4">
        <Chip tone="gold" className="self-start">
          {th.room.statusTitle}
        </Chip>
        <h1 className="font-display text-[32px] font-extrabold leading-tight">
          {th.room.notFoundTitle}
        </h1>
        <p className="font-mono text-[15px] text-ink-soft">
          {th.common.roomCode}{' '}
          <strong className="tracking-[0.15em]">{th.preview.mockRoomCode}</strong>
        </p>
        <p className="text-ink-soft">{th.room.notFoundDescription}</p>
        <div className="flex flex-wrap gap-3">
          <Button variant="dark" onClick={() => navigate('/')}>
            {th.common.backToHome}
          </Button>
          <Button
            variant="light"
            onClick={() => showToast(th.preview.nonInteractive, 'info')}
          >
            {th.common.retry}
          </Button>
        </div>
      </div>
    </Panel>
  );
}

const PREVIEW_TABLE_STATES = ['turnStart', 'dealOpen', 'afterMove'] as const;
type PreviewTableState = (typeof PREVIEW_TABLE_STATES)[number];

function PreviewGame({ mode }: { mode: 'game' | 'setup' }) {
  const showToast = useUiStore((state) => state.showToast);
  const [tableState, setTableState] = useState<PreviewTableState>('turnStart');
  const state =
    mode === 'setup'
      ? PREVIEW_GAME.setup
      : tableState === 'afterMove'
        ? PREVIEW_GAME.afterMove
        : tableState === 'dealOpen'
          ? PREVIEW_GAME.dealOpen
          : PREVIEW_GAME.turn;
  const viewerUid =
    mode === 'setup'
      ? (state.startPickerUid ?? PREVIEW_GAME.pickerUid)
      : (state.bossUid ?? PREVIEW_GAME.bossUid);
  const projected = project(state);
  const privateState = projected.private[viewerUid] ?? null;

  return (
    <div>
      <p className="mt-3 text-center text-[13px] text-ink-soft">{th.preview.gameNote}</p>
      {mode === 'game' && (
        <div
          className="mx-auto mb-3 flex w-fit flex-wrap items-center justify-center gap-1.5 rounded-full border-2 border-ink bg-white/70 p-1.5"
          role="group"
          aria-label={th.preview.gameStates.label}
        >
          {PREVIEW_TABLE_STATES.map((id) => (
            <button
              key={id}
              type="button"
              className={`rounded-full border-2 border-ink px-3 py-1.5 font-display text-[13px] font-bold transition-colors ${
                tableState === id
                  ? 'bg-ink text-paper'
                  : 'bg-white text-ink hover:bg-gold'
              }`}
              data-testid={`preview-state-${id}`}
              aria-pressed={tableState === id}
              onClick={() => setTableState(id)}
            >
              {th.preview.gameStates[id]}
            </button>
          ))}
        </div>
      )}
      <GameRoom
        code={th.preview.mockRoomCode}
        uid={viewerUid}
        hostUid={PREVIEW_HOST}
        players={roomPlayersFromState(state)}
        publicState={projected.public}
        privateState={privateState}
        loading={false}
        errorCode={null}
        onRetry={() => undefined}
        onAction={() => showToast(th.preview.nonInteractive, 'info')}
        showChrome={false}
      />
    </div>
  );
}

export function PreviewPage() {
  const { screen: rawScreen } = useParams<{ screen?: string }>();
  const screen = isPreviewScreen(rawScreen) ? rawScreen : 'home';

  let content: ReactNode;
  switch (screen) {
    case 'join':
      content = <PreviewJoin />;
      break;
    case 'lobby':
      content = <PreviewLobby />;
      break;
    case 'game':
      content = <PreviewGame mode="game" />;
      break;
    case 'setup':
      content = <PreviewGame mode="setup" />;
      break;
    case 'status':
      content = <PreviewStatus />;
      break;
    default:
      content = <PreviewHome />;
      break;
  }

  return <PreviewFrame screen={screen}>{content}</PreviewFrame>;
}
