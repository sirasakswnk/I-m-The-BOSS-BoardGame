import { motion } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

import { th } from '@/i18n/th';
import { matchesQuery, PHONE_QUERY } from '@/ui/common/useMediaQuery';

import { getPawnWalk, type DiceRollEvent, type PawnWalkState } from './diceRollUtils';
import { DiePips } from './TableBits';
import { getSpaceByIndex } from './tableUtils';

const THROW_MS = 900;
const FIRST_STEP_DELAY_MS = 140;
const STEP_MS = 210;
const SKIP_MS = 150;
const LANDED_HOLD_MS = 1_000;
const REDUCED_HOLD_MS = 1_800;
const EDGE_PX = 40;
const CAPTION_GAP_PX = 14;
const CAPTION_MIN_WIDTH_PX = 170;
const DIE_PX = { desktop: 58, phone: 46 } as const;

/** Cube rotation that turns each face toward the viewer (opposite faces sum to 7). */
const FACE_ROTATION: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: -90 },
  3: { x: -90, y: 0 },
  4: { x: 90, y: 0 },
  5: { x: 0, y: 90 },
  6: { x: 0, y: 180 },
};

const CUBE_FACES = [
  { value: 1, transform: 'rotateY(0deg)' },
  { value: 2, transform: 'rotateY(90deg)' },
  { value: 3, transform: 'rotateX(90deg)' },
  { value: 4, transform: 'rotateX(-90deg)' },
  { value: 5, transform: 'rotateY(-90deg)' },
  { value: 6, transform: 'rotateY(180deg)' },
] as const;

type Stage = 'rolling' | 'walking' | 'landed';

interface Point {
  x: number;
  y: number;
}

interface Geometry {
  size: number;
  origin: Point;
  target: Point;
  caption: CSSProperties;
  captionBelow: boolean;
}

interface DiceRollOverlayProps {
  event: DiceRollEvent;
  playerName: string;
  closedSpaces: readonly number[];
  /** Board drawing state while the pawn walks; null hands back to live state. */
  onWalk: (walk: PawnWalkState | null) => void;
  onDone: () => void;
}

function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function visibleRect(selector: string): DOMRect | null {
  for (const element of document.querySelectorAll(selector)) {
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return rect;
  }
  return null;
}

function centerOf(rect: DOMRect): Point {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/** Viewport area not covered by the phone/tablet hand dock. */
function visibleBottom(): number {
  const dock = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--mdock-h'),
  );
  return window.innerHeight - (Number.isFinite(dock) ? dock : 0);
}

function clampToViewport(point: Point): Point {
  return {
    x: Math.min(Math.max(point.x, EDGE_PX), window.innerWidth - EDGE_PX),
    y: Math.min(Math.max(point.y, EDGE_PX), visibleBottom() - EDGE_PX),
  };
}

function isFullyVisible(rect: DOMRect): boolean {
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= visibleBottom() &&
    rect.right <= window.innerWidth
  );
}

/**
 * The die flies from the roller's seat to the middle of the board (or of the
 * phone mini map). Off-screen seats and targets are pulled onto the viewport.
 */
function measure(uid: string): Geometry {
  const size = matchesQuery(PHONE_QUERY) ? DIE_PX.phone : DIE_PX.desktop;
  const viewportCenter = { x: window.innerWidth / 2, y: visibleBottom() / 2 };

  const seat =
    visibleRect(`[data-testid="game-player-${uid}"]`) ?? visibleRect('[data-testid="hand-dock"]');
  const origin = clampToViewport(seat ? centerOf(seat) : { x: viewportCenter.x, y: 0 });

  const board =
    visibleRect('[data-testid="mini-board"] .mtable-map-grid') ?? visibleRect('.table-deal-slot');
  // Land on the board only while it is fully on screen; otherwise land in the
  // middle of what the player is looking at.
  const target = clampToViewport(board && isFullyVisible(board) ? centerOf(board) : viewportCenter);

  const half = size / 2;
  const rightSpace = window.innerWidth - (target.x + half + CAPTION_GAP_PX) - 12;
  const leftSpace = target.x - half - CAPTION_GAP_PX - 12;
  let caption: CSSProperties;
  if (rightSpace >= CAPTION_MIN_WIDTH_PX) {
    caption = { left: target.x + half + CAPTION_GAP_PX, top: target.y, maxWidth: rightSpace };
  } else if (leftSpace >= CAPTION_MIN_WIDTH_PX) {
    caption = {
      right: window.innerWidth - (target.x - half - CAPTION_GAP_PX),
      top: target.y,
      maxWidth: leftSpace,
    };
  } else {
    caption = { left: 12, right: 12, top: target.y + half + CAPTION_GAP_PX };
  }

  return {
    size,
    origin,
    target,
    caption,
    captionBelow: rightSpace < CAPTION_MIN_WIDTH_PX && leftSpace < CAPTION_MIN_WIDTH_PX,
  };
}

function DieCube({ face, size, animate }: { face: number; size: number; animate: boolean }) {
  const end = FACE_ROTATION[face] ?? FACE_ROTATION[1];
  const final = { rotateX: end.x + 720, rotateY: end.y + 720, rotateZ: 0 };

  return (
    <div className="dice-roll-stage" aria-hidden="true">
      <motion.div
        className="dice-cube"
        initial={animate ? { rotateX: 25, rotateY: -35, rotateZ: -70 } : final}
        animate={final}
        transition={{ duration: animate ? THROW_MS / 1000 : 0, ease: [0.15, 0.6, 0.25, 1] }}
      >
        {CUBE_FACES.map((entry) => (
          <div
            key={entry.value}
            className="dice-cube-face"
            style={{ transform: `${entry.transform} translateZ(${size / 2}px)` }}
          >
            <DiePips value={entry.value} />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/**
 * Turn-start dice roll shown to every player. A 3D die is thrown from the
 * roller's seat, bounces onto the board and settles on the rolled face; the
 * pawn then hops one space per pip with step numbers on the board, closed
 * spaces it jumps are marked, and the destination is highlighted. Any tap or
 * Escape skips ahead. It never blocks input and plays only for rolls that
 * arrive while the table is open, so a refresh does not replay an old roll.
 */
export function DiceRollOverlay({
  event,
  playerName,
  closedSpaces,
  onWalk,
  onDone,
}: DiceRollOverlayProps) {
  const [stage, setStage] = useState<Stage>('rolling');
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const [reduced] = useState(() => matchesQuery('(prefers-reduced-motion: reduce)'));
  const walk = getPawnWalk(event.from, event.face, closedSpaces);
  const lastStep = walk.at(-1);
  const safeWalk =
    lastStep?.kind === 'step' && lastStep.space === event.to
      ? walk
      : [{ kind: 'step' as const, space: event.to, step: event.face }];
  const walkRef = useRef(safeWalk);
  const onWalkRef = useRef(onWalk);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    walkRef.current = safeWalk;
    onWalkRef.current = onWalk;
    onDoneRef.current = onDone;
  });

  useLayoutEffect(() => {
    setGeometry(measure(event.uid));
  }, [event.uid]);

  useEffect(() => {
    const timers: number[] = [];
    let finished = false;
    const later = (callback: () => void, delay: number) => {
      timers.push(window.setTimeout(callback, delay));
    };
    const finish = () => {
      if (finished) return;
      finished = true;
      onWalkRef.current(null);
      onDoneRef.current();
    };
    const skip = (input: Event) => {
      if (input instanceof KeyboardEvent && input.key !== 'Escape') return;
      finish();
    };
    // Listen without capturing the input: the tap still reaches its button.
    document.addEventListener('pointerdown', skip, { capture: true, passive: true });
    document.addEventListener('keydown', skip, { capture: true });

    if (reduced) {
      setStage('landed');
      onWalkRef.current({
        pawn: event.to,
        hop: 0,
        steps: {},
        skipped: [],
        landed: event.to,
      });
      later(finish, REDUCED_HOLD_MS);
    } else {
      setStage('rolling');
      let state: PawnWalkState = {
        pawn: event.from,
        hop: 0,
        steps: {},
        skipped: [],
        landed: null,
      };
      onWalkRef.current(state);

      later(() => {
        setStage('walking');
        let at = FIRST_STEP_DELAY_MS;
        for (const entry of walkRef.current) {
          later(() => {
            state =
              entry.kind === 'step'
                ? {
                    ...state,
                    pawn: entry.space,
                    hop: state.hop + 1,
                    steps: { ...state.steps, [entry.space]: entry.step },
                  }
                : { ...state, skipped: [...state.skipped, entry.space] };
            onWalkRef.current(state);
          }, at);
          at += entry.kind === 'step' ? STEP_MS : SKIP_MS;
        }
        later(() => {
          state = { ...state, pawn: event.to, landed: event.to };
          onWalkRef.current(state);
          setStage('landed');
        }, at);
        later(finish, at + LANDED_HOLD_MS);
      }, THROW_MS);
    }

    return () => {
      document.removeEventListener('pointerdown', skip, { capture: true });
      document.removeEventListener('keydown', skip, { capture: true });
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [event.at, event.uid, event.from, event.face, event.to, reduced]);

  const copy = th.game.table.diceRoll;
  const destination = getSpaceByIndex(event.to);
  const settled = stage !== 'rolling';

  let throwMotion = null;
  if (geometry) {
    const half = geometry.size / 2;
    const from = { x: geometry.origin.x - half, y: geometry.origin.y - half };
    const to = { x: geometry.target.x - half, y: geometry.target.y - half };
    const along = (fraction: number) => ({
      x: from.x + (to.x - from.x) * fraction,
      y: from.y + (to.y - from.y) * fraction,
    });
    const path = [0, 0.62, 0.86, 0.96, 1].map(along);
    throwMotion = reduced ? (
      <motion.div
        className="dice-roll-throw"
        style={{ width: geometry.size, height: geometry.size }}
        initial={false}
        animate={{ x: to.x, y: to.y, scale: 1 }}
      >
        <span className="dice-roll-shadow" />
        <DieCube face={event.face} size={geometry.size} animate={false} />
      </motion.div>
    ) : (
      <motion.div
        className="dice-roll-throw"
        style={{ width: geometry.size, height: geometry.size }}
        initial={{ x: from.x, y: from.y, scale: 1.6 }}
        animate={{
          x: path.map((point) => point.x),
          y: path.map((point) => point.y),
          scale: [1.6, 0.92, 1.12, 0.97, 1],
        }}
        transition={{ duration: THROW_MS / 1000, times: [0, 0.4, 0.65, 0.84, 1], ease: 'easeOut' }}
      >
        <span className="dice-roll-shadow" />
        <DieCube face={event.face} size={geometry.size} animate />
      </motion.div>
    );
  }

  return (
    <div
      className="dice-roll"
      role="status"
      aria-live="polite"
      aria-label={copy.aria}
      data-testid="dice-roll"
      data-rolling={!settled}
      data-face={settled ? event.face : ''}
      data-stage={stage}
    >
      {throwMotion}
      {geometry && (
        <div
          className={`dice-roll-caption is-${stage} ${geometry.captionBelow ? 'is-below' : ''}`}
          style={geometry.caption}
        >
          <strong>
            {settled
              ? fill(copy.result, { name: playerName, face: event.face })
              : fill(copy.rolling, { name: playerName })}
          </strong>
          {stage === 'walking' && (
            <span>{fill(copy.walking, { face: event.face, from: event.from })}</span>
          )}
          {stage === 'landed' && destination && (
            <span className="dice-roll-landed">
              {fill(copy.landed, {
                space: destination.index,
                count: destination.requiredInvestors,
                dividends: destination.dividends,
              })}
            </span>
          )}
          {stage !== 'landed' && <small>{copy.tapToSkip}</small>}
        </div>
      )}
    </div>
  );
}
