import { useEffect, useRef, useState } from 'react';

import { th } from '@/i18n/th';
import { matchesQuery } from '@/ui/common/useMediaQuery';

import { getPawnPath, type DiceRollEvent } from './diceRollUtils';
import { DiceFace } from './TableBits';

const ROLL_MS = 800;
const FIRST_STEP_DELAY_MS = 180;
const STEP_MS = 240;
const RESULT_HOLD_MS = 1_100;
const REDUCED_HOLD_MS = 1_600;
const FACE_FLICKER_MS = 90;

interface DiceRollOverlayProps {
  event: DiceRollEvent;
  playerName: string;
  closedSpaces: readonly number[];
  /** Pawn position to draw while the walk plays; null hands back to live state. */
  onPawnStep: (space: number | null) => void;
  onDone: () => void;
}

function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

/**
 * Turn-start dice roll shown to every player: the die tumbles, settles on the
 * rolled face, then the pawn walks one space per pip (closed spaces skipped).
 * It never blocks input and plays only for rolls that arrive while the table
 * is open, so a refresh does not replay an old roll.
 */
export function DiceRollOverlay({
  event,
  playerName,
  closedSpaces,
  onPawnStep,
  onDone,
}: DiceRollOverlayProps) {
  const [rolling, setRolling] = useState(true);
  const [displayFace, setDisplayFace] = useState(1);
  const walk = getPawnPath(event.from, event.face, closedSpaces);
  const path = walk.at(-1) === event.to ? walk : [event.to];
  const pathRef = useRef(path);
  const onPawnStepRef = useRef(onPawnStep);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    pathRef.current = path;
    onPawnStepRef.current = onPawnStep;
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    const timers: number[] = [];
    const later = (callback: () => void, delay: number) => {
      timers.push(window.setTimeout(callback, delay));
    };
    const finish = () => {
      onPawnStepRef.current(null);
      onDoneRef.current();
    };

    if (matchesQuery('(prefers-reduced-motion: reduce)')) {
      setDisplayFace(event.face);
      setRolling(false);
      onPawnStepRef.current(null);
      later(() => onDoneRef.current(), REDUCED_HOLD_MS);
      return () => timers.forEach((timer) => window.clearTimeout(timer));
    }

    setRolling(true);
    onPawnStepRef.current(event.from);
    const flicker = window.setInterval(() => {
      setDisplayFace(1 + Math.floor(Math.random() * 6));
    }, FACE_FLICKER_MS);

    later(() => {
      window.clearInterval(flicker);
      setDisplayFace(event.face);
      setRolling(false);

      const steps = pathRef.current;
      steps.forEach((space, index) => {
        later(() => onPawnStepRef.current(space), FIRST_STEP_DELAY_MS + index * STEP_MS);
      });
      later(finish, FIRST_STEP_DELAY_MS + steps.length * STEP_MS + RESULT_HOLD_MS);
    }, ROLL_MS);

    return () => {
      window.clearInterval(flicker);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [event.at, event.uid, event.from, event.face]);

  const copy = th.game.table.diceRoll;

  return (
    <div
      className="dice-roll"
      role="status"
      aria-live="polite"
      aria-label={copy.aria}
      data-testid="dice-roll"
      data-rolling={rolling}
      data-face={rolling ? '' : event.face}
    >
      <div className={`dice-roll-die ${rolling ? 'is-rolling' : 'is-settled'}`}>
        <DiceFace value={displayFace} testId="dice-roll-face" />
      </div>
      <div className="dice-roll-copy">
        <strong>
          {rolling
            ? fill(copy.rolling, { name: playerName })
            : fill(copy.result, { name: playerName, face: event.face })}
        </strong>
        {!rolling && <span>{fill(copy.move, { from: event.from, to: event.to })}</span>}
      </div>
    </div>
  );
}
