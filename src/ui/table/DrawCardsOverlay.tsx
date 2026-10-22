import { motion } from 'framer-motion';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { InfluenceCard as InfluenceCardData } from '@/engine/types';
import { th } from '@/i18n/th';
import { CardBack, InfluenceCard } from '@/ui/common/influence';

import type { DrawEvent } from './drawUtils';
import {
  centerOf,
  clampToViewport,
  isFullyVisible,
  prefersReducedMotion,
  visibleBottom,
  visibleRect,
  type Point,
} from './overlayGeometry';

const RESHUFFLE_MS = 850;
const STAGGER_MS = 120;
const FLIGHT_MS = 520;
const FLIP_DELAY_MS = 120;
const FLIP_MS = 340;
const SETTLE_MS = 150;
const OVERFLOW_MS = 1_000;
const SAFETY_MS = 2_000;
const DECK_CARD = { width: 42, height: 59 };
const GRID_CARD = { width: 78, height: 111 };
const SEAT_SCALE = 0.5;
const DOCK_SCALE = 0.4;

type Stage = 'reshuffle' | 'flying' | 'overflow';

interface Flight {
  card: InfluenceCardData | null;
  from: Point;
  to: Point;
  width: number;
  height: number;
  startScale: number;
  endScale: number;
}

interface Geometry {
  deck: Point;
  flights: Flight[];
  hand: Point;
}

interface DrawCardsOverlayProps {
  event: DrawEvent;
  playerName: string;
  /** My newly drawn cards in fan order; empty when someone else drew. */
  cards: InfluenceCardData[];
  reshuffle: boolean;
  /** Cards over the hand limit after this draw (mine only). */
  overflowCount: number;
  /** Cards landed so far, and whether the over-the-limit warning is showing. */
  onProgress: (landed: number, warning: boolean) => void;
  onDone: () => void;
}

function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function topCenter(): Point {
  return clampToViewport({ x: window.innerWidth / 2, y: 0 });
}

/**
 * Cards leave the deck pile (or drop in from the top when the deck is off
 * screen). Mine fly into their exact slots in the hand fan, or into the
 * collapsed phone dock; anyone else's shrink into that player's seat.
 */
function measure(uid: string, count: number, cards: InfluenceCardData[]): Geometry {
  const deckRect = visibleRect('[data-testid="deck-pile"]');
  const deck = deckRect && isFullyVisible(deckRect) ? centerOf(deckRect) : topCenter();
  const dockRect = visibleRect('[data-testid="hand-dock-toggle"]');
  const handRect = visibleRect('[data-testid="my-hand"]');
  const hand = handRect
    ? clampToViewport(centerOf(handRect))
    : dockRect
      ? centerOf(dockRect)
      : { x: window.innerWidth / 2, y: visibleBottom() - 40 };

  const seatRect =
    visibleRect(`[data-testid="game-player-${uid}"] .table-back-stack`) ??
    visibleRect(`[data-testid="game-player-${uid}"]`);

  const flights = Array.from({ length: count }, (_, index): Flight => {
    const card = cards[index] ?? null;
    if (card) {
      const slot = document.querySelector<HTMLElement>(
        `[data-testid="my-hand"] [data-card-id="${card.id}"]`,
      );
      const slotRect = slot?.getBoundingClientRect();
      if (slot && slotRect && slotRect.width > 0) {
        return {
          card,
          from: deck,
          to: centerOf(slotRect),
          width: slot.offsetWidth,
          height: slot.offsetHeight,
          startScale: DECK_CARD.width / slot.offsetWidth,
          endScale: 1,
        };
      }
      return {
        card,
        from: deck,
        to: dockRect ? centerOf(dockRect) : hand,
        ...GRID_CARD,
        startScale: DECK_CARD.width / GRID_CARD.width,
        endScale: DOCK_SCALE,
      };
    }
    return {
      card: null,
      from: deck,
      to: seatRect ? clampToViewport(centerOf(seatRect), 24) : topCenter(),
      ...DECK_CARD,
      startScale: 1,
      endScale: SEAT_SCALE,
    };
  });

  return { deck, flights, hand };
}

/**
 * DRAW_CARDS animation shown to every player. Others only ever see card backs
 * (the hand stays secret); the drawer sees each card flip face-up on its way
 * into the hand. A reshuffle of the discard pile plays first when the deck ran
 * out, and drawing past the hand limit ends on a warning before the forced
 * discard opens. Any tap or Escape skips ahead without swallowing the tap.
 */
export function DrawCardsOverlay({
  event,
  playerName,
  cards,
  reshuffle,
  overflowCount,
  onProgress,
  onDone,
}: DrawCardsOverlayProps) {
  const [reduced] = useState(prefersReducedMotion);
  const [stage, setStage] = useState<Stage>(reshuffle ? 'reshuffle' : 'flying');
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const [landed, setLanded] = useState(0);
  const cardsRef = useRef(cards);
  const onProgressRef = useRef(onProgress);
  const onDoneRef = useRef(onDone);
  const timersRef = useRef<number[]>([]);
  const finishedRef = useRef(false);
  const landedRef = useRef(0);
  const count = event.count;

  useEffect(() => {
    cardsRef.current = cards;
    onProgressRef.current = onProgress;
    onDoneRef.current = onDone;
  });

  const later = useCallback((callback: () => void, delay: number) => {
    timersRef.current.push(window.setTimeout(callback, delay));
  }, []);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onProgressRef.current(count, false);
    onDoneRef.current();
  }, [count]);

  // Measured once per draw: Firebase snapshots re-create the event object.
  useLayoutEffect(() => {
    setGeometry(measure(event.uid, count, cardsRef.current));
  }, [event.uid, count]);

  useEffect(() => {
    const timers = timersRef.current;
    const skip = (input: Event) => {
      if (input instanceof KeyboardEvent && input.key !== 'Escape') return;
      finish();
    };
    document.addEventListener('pointerdown', skip, { capture: true, passive: true });
    document.addEventListener('keydown', skip, { capture: true });

    if (reduced) {
      later(finish, 0);
    } else {
      const start = reshuffle ? RESHUFFLE_MS : 0;
      if (reshuffle) later(() => setStage('flying'), RESHUFFLE_MS);
      // Fallback in case a flight never reports completion (hidden tab).
      later(
        finish,
        start +
          (count - 1) * STAGGER_MS +
          FLIGHT_MS +
          SAFETY_MS +
          (overflowCount ? OVERFLOW_MS : 0),
      );
    }

    return () => {
      document.removeEventListener('pointerdown', skip, { capture: true });
      document.removeEventListener('keydown', skip, { capture: true });
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [count, finish, later, overflowCount, reduced, reshuffle]);

  function handleLanded() {
    if (finishedRef.current) return;
    landedRef.current += 1;
    const total = landedRef.current;
    setLanded(total);
    onProgressRef.current(total, false);
    if (total < count) return;
    if (overflowCount > 0) {
      setStage('overflow');
      onProgressRef.current(total, true);
      later(finish, OVERFLOW_MS);
    } else {
      later(finish, SETTLE_MS);
    }
  }

  const copy = th.game.table.draw;

  return (
    <div
      className="draw-anim"
      role="status"
      aria-live="polite"
      aria-label={fill(copy.aria, { name: playerName, count })}
      data-testid="draw-anim"
      data-stage={stage}
      data-landed={landed}
    >
      {geometry && stage === 'reshuffle' && (
        <div
          className="draw-reshuffle"
          style={{ left: geometry.deck.x, top: geometry.deck.y }}
          data-testid="draw-reshuffle"
        >
          <span className="draw-reshuffle-pile is-left" aria-hidden="true">
            <CardBack width={34} height={48} />
          </span>
          <span className="draw-reshuffle-pile is-right" aria-hidden="true">
            <CardBack width={34} height={48} />
          </span>
          <span className="draw-reshuffle-label">
            <strong>{copy.reshuffle}</strong>
            <small>{copy.reshuffleHint}</small>
          </span>
        </div>
      )}

      {geometry &&
        !reduced &&
        stage !== 'reshuffle' &&
        geometry.flights.map((flight, index) =>
          index < landed ? null : (
            <motion.div
              key={index}
              className="draw-flight"
              style={{ width: flight.width, height: flight.height }}
              initial={{
                x: flight.from.x - flight.width / 2,
                y: flight.from.y - flight.height / 2,
                scale: flight.startScale,
                rotate: -12,
                opacity: 0,
              }}
              animate={{
                x: flight.to.x - flight.width / 2,
                y: flight.to.y - flight.height / 2,
                scale: flight.endScale,
                rotate: 0,
                opacity: 1,
              }}
              transition={{
                default: {
                  delay: (index * STAGGER_MS) / 1000,
                  duration: FLIGHT_MS / 1000,
                  ease: [0.2, 0.7, 0.3, 1],
                },
                opacity: { delay: (index * STAGGER_MS) / 1000, duration: 0.08 },
              }}
              onAnimationComplete={handleLanded}
            >
              {flight.card ? (
                <motion.div
                  className="draw-flip"
                  initial={{ rotateY: 0 }}
                  animate={{ rotateY: 180 }}
                  transition={{
                    delay: (index * STAGGER_MS + FLIP_DELAY_MS) / 1000,
                    duration: FLIP_MS / 1000,
                  }}
                >
                  <div className="draw-face is-back">
                    <CardBack width={flight.width} height={flight.height} />
                  </div>
                  <div className="draw-face is-front">
                    <InfluenceCard card={flight.card} width={flight.width} height={flight.height} />
                  </div>
                </motion.div>
              ) : (
                <CardBack width={flight.width} height={flight.height} />
              )}
            </motion.div>
          ),
        )}

      {geometry && stage === 'overflow' && (
        <div
          className="draw-overflow"
          style={{ left: geometry.hand.x, top: geometry.hand.y }}
          data-testid="draw-overflow"
        >
          {fill(copy.overflow, { count: overflowCount })}
        </div>
      )}
    </div>
  );
}
