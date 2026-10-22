import { useCallback, useEffect, useRef, useState } from 'react';

import { DEAL_TILES } from '@/engine/config/dealTiles';
import { th } from '@/i18n/th';
import { Button } from '@/ui/common/Button';
import { Modal } from '@/ui/common/Modal';

import type { EndCheckEvent } from './endgameUtils';
import { DiceFace } from './TableBits';

interface EndCheckOverlayProps {
  event: EndCheckEvent;
  onDone: () => void;
}

function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

const ROLL_MS = 1_000;
const RESULT_HOLD_MS = 2_200;

export function EndCheckOverlay({ event, onDone }: EndCheckOverlayProps) {
  const [rolling, setRolling] = useState(true);
  const [displayFace, setDisplayFace] = useState(1);
  const finishedRef = useRef(false);
  const onDoneRef = useRef(onDone);
  const tile = DEAL_TILES[event.tileNumber - 1];
  const faces = tile?.endCheckFaces ?? [];
  const facesText = faces.length > 0 ? faces.join(', ') : '—';

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onDoneRef.current();
  }, []);

  useEffect(() => {
    finishedRef.current = false;
    setRolling(true);
    setDisplayFace(1);

    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let rollTimer: number | undefined;
    let resultTimer: number | undefined;
    let faceTimer: number | undefined;

    if (reducedMotion) {
      setDisplayFace(event.face);
      setRolling(false);
      resultTimer = window.setTimeout(finish, 900);
    } else {
      faceTimer = window.setInterval(() => {
        setDisplayFace(1 + Math.floor(Math.random() * 6));
      }, 90);
      rollTimer = window.setTimeout(() => {
        if (faceTimer !== undefined) window.clearInterval(faceTimer);
        setDisplayFace(event.face);
        setRolling(false);
        resultTimer = window.setTimeout(finish, RESULT_HOLD_MS);
      }, ROLL_MS);
    }

    return () => {
      if (faceTimer !== undefined) window.clearInterval(faceTimer);
      if (rollTimer !== undefined) window.clearTimeout(rollTimer);
      if (resultTimer !== undefined) window.clearTimeout(resultTimer);
    };
  }, [event.at, event.face, event.tileNumber, finish]);

  return (
    <Modal
      title={th.game.table.endCheck.title}
      eyebrow={th.game.table.endCheck.eyebrow}
      onClose={() => undefined}
      dismissible={false}
      testId="endcheck-overlay"
      className="endcheck-modal"
    >
      <div className="endcheck-stage">
        <p className="endcheck-tile">
          {fill(th.game.table.endCheck.tile, { tile: event.tileNumber })}
        </p>
        <div
          className={`endcheck-die ${rolling ? 'is-rolling' : 'is-settled'}`}
          data-testid="endcheck-die"
          data-rolling={rolling}
          data-face={rolling ? '' : event.face}
        >
          <DiceFace value={displayFace} />
        </div>
        <p className="endcheck-faces">{fill(th.game.table.endCheck.faces, { faces: facesText })}</p>

        <div
          className={`endcheck-result ${
            rolling ? 'is-rolling' : event.ends ? 'is-ended' : 'is-continues'
          }`}
          role="status"
          aria-live="polite"
          data-testid="endcheck-result"
        >
          {rolling ? (
            th.game.table.endCheck.rolling
          ) : (
            <>
              <strong>{fill(th.game.table.endCheck.result, { face: event.face })}</strong>
              <span>
                {event.ends ? th.game.table.endCheck.ended : th.game.table.endCheck.continues}
              </span>
            </>
          )}
        </div>

        {!rolling && (
          <Button
            variant={event.ends ? 'dark' : 'light'}
            className="table-btn endcheck-continue"
            data-testid="endcheck-continue"
            onClick={finish}
          >
            {event.ends ? th.game.table.endCheck.showScores : th.game.table.endCheck.continueGame}
          </Button>
        )}
      </div>
    </Modal>
  );
}
