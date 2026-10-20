import { Loader2, X } from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { th } from '@/i18n/th';
import {
  findRejoinRoom,
  joinRoom,
  peekRoom,
  createRoom,
  RoomServiceError,
} from '@/net/rooms';
import {
  dedupeNickname,
  isValidNickname,
  isValidRoomCode,
  normalizeNickname,
  normalizeRoomCode,
  NICKNAME_MAX_LENGTH,
  ROOM_CODE_LENGTH,
} from '@/net/roomCode';
import { ROOM_MAX_PLAYERS, type RoomErrorCode } from '@/net/roomTypes';
import {
  getLastNickname,
  setLastNickname,
  setLastRoomCode,
} from '@/net/storage';
import { useAnonymousAuth } from '@/net/useAnonymousAuth';
import { useUiStore } from '@/store/uiStore';
import { Brand } from '@/ui/common/Brand';
import { Button } from '@/ui/common/Button';
import { Chip } from '@/ui/common/Chip';
import { FamilyCard } from '@/ui/common/FamilyCard';
import { FAMILY_PRESENTATION } from '@/ui/common/families';
import { Pawn } from '@/ui/common/Pawn';
import { TextInput } from '@/ui/common/TextInput';

type Preview =
  | { kind: 'idle' }
  | { kind: 'ok'; name: string }
  | { kind: 'notFound' }
  | { kind: 'full' }
  | { kind: 'started' }
  | { kind: 'finished' }
  | { kind: 'member'; name: string }
  | { kind: 'error' };

function errorCodeOf(error: unknown): RoomErrorCode {
  return error instanceof RoomServiceError ? error.code : 'UNKNOWN';
}

function errorTextOf(error: unknown): string {
  return th.errors[errorCodeOf(error)];
}

export function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const showToast = useUiStore((state) => state.showToast);
  const { uid, errorCode: authErrorCode } = useAnonymousAuth();

  const [nickname, setNickname] = useState(() =>
    normalizeNickname(getLastNickname()).slice(0, NICKNAME_MAX_LENGTH),
  );
  const [code, setCode] = useState(() =>
    normalizeRoomCode(searchParams.get('room') ?? ''),
  );
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [preview, setPreview] = useState<Preview>({ kind: 'idle' });
  const [rejoin, setRejoin] = useState<{ code: string; name: string } | null>(null);
  const [rejoinHidden, setRejoinHidden] = useState(false);

  const nicknameValid = isValidNickname(nickname);
  const codeComplete = isValidRoomCode(code);
  const normalizedNickname = normalizeNickname(nickname);

  useEffect(() => {
    if (nicknameValid) setLastNickname(normalizedNickname);
  }, [nicknameValid, normalizedNickname]);

  useEffect(() => {
    if (!uid) {
      setRejoin(null);
      return;
    }

    let active = true;
    void findRejoinRoom(uid).then((info) => {
      if (active) setRejoin(info);
    });

    return () => {
      active = false;
    };
  }, [uid]);

  useEffect(() => {
    if (!uid || !codeComplete || !nicknameValid) {
      setPreview({ kind: 'idle' });
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      void peekRoom(code)
        .then((room) => {
          if (!active) return;
          if (!room) {
            setPreview({ kind: 'notFound' });
            return;
          }
          if (room.meta.status === 'finished') {
            setPreview({ kind: 'finished' });
            return;
          }
          if (room.meta.status !== 'lobby') {
            setPreview({ kind: 'started' });
            return;
          }
          if (room.players[uid]) {
            setPreview({ kind: 'member', name: room.players[uid].name });
            return;
          }
          if (Object.keys(room.players).length >= ROOM_MAX_PLAYERS) {
            setPreview({ kind: 'full' });
            return;
          }
          setPreview({
            kind: 'ok',
            name: dedupeNickname(
              nickname,
              Object.values(room.players).map((player) => player.name),
            ),
          });
        })
        .catch(() => {
          if (active) setPreview({ kind: 'error' });
        });
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [uid, codeComplete, code, nicknameValid, nickname]);

  let codeHint: string = th.home.codeHint;
  if (code.length > 0 && code.length < ROOM_CODE_LENGTH) {
    codeHint = th.home.codeRemaining.replace('{count}', String(ROOM_CODE_LENGTH - code.length));
  } else if (code.length === ROOM_CODE_LENGTH && !nicknameValid) {
    codeHint = th.home.codeNeedNickname;
  } else if (preview.kind === 'notFound') {
    codeHint = th.home.codeNotFound;
  } else if (preview.kind === 'full') {
    codeHint = th.home.codeFull;
  } else if (preview.kind === 'started') {
    codeHint = th.home.codeStarted;
  } else if (preview.kind === 'finished') {
    codeHint = th.errors.ROOM_FINISHED;
  } else if (preview.kind === 'member') {
    codeHint = `${th.home.codeMember} — ${preview.name}`;
  } else if (preview.kind === 'ok') {
    codeHint = th.home.codePreview.replace('{name}', preview.name);
    if (preview.name.toLowerCase() !== normalizedNickname.toLowerCase()) {
      codeHint = `${codeHint} · ${th.home.codeDuplicate}`;
    }
  }

  const joinBlocked =
    !nicknameValid ||
    !codeComplete ||
    busy !== null ||
    preview.kind === 'notFound' ||
    preview.kind === 'full' ||
    preview.kind === 'started' ||
    preview.kind === 'finished';

  async function handleCreate() {
    if (!nicknameValid || busy) return;
    setBusy('create');
    try {
      const room = await createRoom(nickname);
      setLastNickname(room.name);
      setLastRoomCode(room.code);
      navigate(`/${room.code}`);
    } catch (error) {
      showToast(errorTextOf(error), 'error');
    } finally {
      setBusy(null);
    }
  }

  async function handleJoin() {
    if (joinBlocked) return;
    setBusy('join');
    try {
      const room = await joinRoom(code, nickname);
      setLastNickname(room.name);
      setLastRoomCode(code);
      navigate(`/${code}`);
    } catch (error) {
      showToast(errorTextOf(error), 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-dvh" data-testid="home-page">
      <div className="grain-overlay" aria-hidden="true" />

      <header className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-[22px]">
        <Brand />
        <a
          href="#how"
          className="rounded-full border-2 border-ink bg-white px-3.5 py-2.5 font-display text-[17px] font-medium text-ink no-underline shadow-hard-sm transition-colors hover:bg-gold hover:text-ink max-md:px-3 max-md:py-2 max-md:text-[15px]"
        >
          {th.home.navHowTo}
        </a>
      </header>

      <main className="mx-auto w-full max-w-[1200px] px-4">
        <section className="flex flex-col items-center gap-5 pt-[18px] text-center">
          {rejoin && !rejoinHidden && (
            <div
              role="status"
              data-testid="rejoin-banner"
              className="flex flex-wrap items-center justify-center gap-2.5 rounded-full border-2 border-ink bg-gold py-1.5 pl-[18px] pr-1.5 font-medium shadow-hard max-md:justify-between max-md:gap-2 max-md:rounded-panel max-md:p-2.5 max-md:text-left"
            >
              <span className="max-md:basis-full">
                {th.home.rejoinRoom}{' '}
                <code className="font-mono font-semibold tracking-[0.06em]">{rejoin.code}</code>{' '}
                {th.home.rejoinWaiting} <strong>{rejoin.name}</strong> {th.home.rejoinSuffix}
              </span>
              <Button
                variant="dark"
                className="h-11 rounded-full px-[18px] text-[16px]"
                onClick={() => navigate(`/${rejoin.code}`)}
              >
                {th.home.rejoinButton}
              </Button>
              <button
                type="button"
                aria-label={th.home.rejoinClose}
                className="grid h-11 w-11 place-items-center rounded-full text-ink hover:bg-ink/10"
                onClick={() => setRejoinHidden(true)}
              >
                <X size={18} strokeWidth={2.5} aria-hidden="true" />
              </button>
            </div>
          )}

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
              <label className="field-label" htmlFor="nickname">
                {th.home.nicknameLabel}
              </label>
              <TextInput
                id="nickname"
                data-testid="nickname-input"
                name="nickname"
                type="text"
                maxLength={NICKNAME_MAX_LENGTH}
                placeholder={th.home.nicknamePlaceholder}
                autoComplete="nickname"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                aria-describedby="nickname-hint"
              />
              <p className="hint" id="nickname-hint" aria-live="polite">
                {nickname.length > 0 && !nicknameValid
                  ? th.home.nicknameTooShort
                  : th.home.nicknameHint}
              </p>
            </form>

            {authErrorCode && (
              <p
                role="alert"
                className="rounded-btn border-2 border-family-red bg-white px-4 py-3 text-[15px] text-ink"
              >
                {th.errors[authErrorCode]}
              </p>
            )}

            <div className="flex flex-wrap gap-[18px]">
              <div className="stripes relative flex min-w-0 flex-1 basis-[280px] flex-col gap-2.5 overflow-hidden rounded-panel border-2 border-ink bg-accent p-[22px] text-white shadow-hard max-md:p-[18px]">
                <span className="absolute -right-[34px] top-3.5 rotate-[35deg] border-y-2 border-ink bg-gold px-10 py-[2px] font-display text-[13px] font-bold text-ink">
                  {th.home.createTag}
                </span>
                <h2 className="font-display text-[26px] font-bold leading-tight max-md:text-[22px]">
                  {th.home.createTitle}
                </h2>
                <p className="flex-grow text-[16px] text-[#EAF0FF]">{th.home.createDescription}</p>
                <Button
                  variant="light"
                  className="mt-1 self-start"
                  data-testid="create-room"
                  disabled={!nicknameValid || busy !== null}
                  aria-busy={busy === 'create'}
                  onClick={() => void handleCreate()}
                >
                  {busy === 'create' && (
                    <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                  )}
                  {busy === 'create' ? th.home.creating : th.common.createRoom}
                </Button>
              </div>

              <div className="flex min-w-0 flex-1 basis-[280px] flex-col gap-2.5 rounded-panel border-2 border-ink bg-white p-[22px] shadow-hard max-md:p-[18px]">
                <label
                  className="font-display text-[26px] font-bold leading-tight max-md:text-[22px]"
                  htmlFor="room-code"
                >
                  {th.home.joinTitle}
                </label>
                <div className="flex flex-col gap-2.5">
                  <TextInput
                    id="room-code"
                    data-testid="room-code-input"
                    name="code"
                    code
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={ROOM_CODE_LENGTH}
                    placeholder={th.home.codePlaceholder}
                    autoComplete="off"
                    value={code}
                    onChange={(event) => setCode(normalizeRoomCode(event.target.value))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void handleJoin();
                      }
                    }}
                    aria-describedby="code-hint"
                  />
                  <Button
                    variant="dark"
                    className="w-full"
                    data-testid="join-room"
                    disabled={joinBlocked}
                    aria-busy={busy === 'join'}
                    onClick={() => void handleJoin()}
                  >
                    {busy === 'join' && (
                      <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                    )}
                    {busy === 'join' ? th.home.joining : th.common.joinRoom}
                  </Button>
                </div>
                <p className="hint" id="code-hint" data-testid="code-hint" aria-live="polite">
                  {codeHint}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="flex flex-col items-center gap-[22px] pb-7 pt-14">
          <h2 className="font-display text-[34px] font-extrabold">{th.home.howTitle}</h2>
          <div className="flex w-full flex-wrap justify-center gap-[18px]">
            {[
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
            ].map((rule) => (
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
      </main>

      <footer className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-center gap-2.5 px-4 pb-14 pt-6">
        <svg
          className="mr-1.5"
          width="40"
          height="40"
          viewBox="0 0 40 40"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="32" height="32" rx="7" fill="#1D1B2E" />
          <rect
            x="1.5"
            y="1.5"
            width="32"
            height="32"
            rx="7"
            fill="#FFFFFF"
            stroke="#1D1B2E"
            strokeWidth="2.5"
          />
          <circle cx="10" cy="10" r="2.6" fill="#1D1B2E" />
          <circle cx="25" cy="10" r="2.6" fill="#1D1B2E" />
          <circle cx="17.5" cy="17.5" r="2.6" fill="#C8382D" />
          <circle cx="10" cy="25" r="2.6" fill="#1D1B2E" />
          <circle cx="25" cy="25" r="2.6" fill="#1D1B2E" />
        </svg>
        <Chip tone="paper">{th.home.footerNoSignup}</Chip>
        <Chip tone="paper">{th.home.footerReconnect}</Chip>
        <Chip tone="paper">{th.home.footerPrivacy}</Chip>
      </footer>
    </div>
  );
}
