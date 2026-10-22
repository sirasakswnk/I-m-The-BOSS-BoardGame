import { ChevronUp, Lock } from 'lucide-react';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react';

import { HAND_LIMIT } from '@/engine/config/rules';
import { th } from '@/i18n/th';

const SWIPE_PX = 24;
const DOCK_HEIGHT_VAR = '--mdock-h';

interface HandDockProps {
  handCount: number;
  money: number;
  /** Drawn cards are flying into the hand. */
  receiving?: boolean;
  moneyDelta: number | null;
  moneyDeltaKey: number;
  /** My seat details, shown when the sheet is pulled up. */
  seat: ReactNode;
  hand: ReactNode;
  actions: ReactNode;
}

function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

/**
 * Phone/tablet bottom sheet for my hand (plan.md 9.2). The collapsed bar keeps
 * the hand count, my money and the big action buttons on screen; tapping or
 * swiping the handle up reveals my seat and every card.
 */
export function HandDock({
  handCount,
  money,
  receiving = false,
  moneyDelta,
  moneyDeltaKey,
  seat,
  hand,
  actions,
}: HandDockProps) {
  const copy = th.game.table.compact;
  const bodyId = useId();
  const [expanded, setExpanded] = useState(false);
  const [spacer, setSpacer] = useState(0);
  const dockRef = useRef<HTMLElement>(null);
  const dragStartRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);

  // Reserve room under the page content for the collapsed dock so the last
  // panel is never hidden behind it, and publish the height for toasts.
  useLayoutEffect(() => {
    const node = dockRef.current;
    if (!node || expanded) return;
    const measure = () => {
      const height = node.getBoundingClientRect().height;
      setSpacer(height);
      document.documentElement.style.setProperty(DOCK_HEIGHT_VAR, `${height}px`);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [expanded]);

  useEffect(
    () => () => {
      document.documentElement.style.removeProperty(DOCK_HEIGHT_VAR);
    },
    [],
  );

  useEffect(() => {
    if (!expanded) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setExpanded(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [expanded]);

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    dragStartRef.current = event.clientY;
    // Keep receiving the pointer after it leaves the handle mid-swipe.
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePointerUp(event: PointerEvent<HTMLButtonElement>) {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    if (start === null) return;
    const delta = event.clientY - start;
    if (Math.abs(delta) < SWIPE_PX) return;
    suppressClickRef.current = true;
    setExpanded(delta < 0);
  }

  function handleClick() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    setExpanded((current) => !current);
  }

  return (
    <>
      <div className="mdock-spacer" style={{ height: spacer }} aria-hidden="true" />
      {expanded && (
        <div
          className="mdock-backdrop"
          data-testid="hand-dock-backdrop"
          aria-hidden="true"
          onClick={() => setExpanded(false)}
        />
      )}
      <section
        ref={dockRef}
        className={`mdock ${expanded ? 'is-open' : ''}`}
        aria-label={th.game.myHand}
        data-testid="hand-dock"
        data-expanded={expanded}
      >
        <button
          type="button"
          className={`mdock-handle ${receiving ? 'is-receiving' : ''}`}
          data-testid="hand-dock-toggle"
          aria-expanded={expanded}
          aria-controls={bodyId}
          aria-label={expanded ? copy.handClose : copy.handOpen}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            dragStartRef.current = null;
          }}
          onClick={handleClick}
        >
          <span className="mdock-grip" aria-hidden="true" />
          <span className="mdock-title">
            <strong>{th.game.table.handTitle}</strong>
            <span
              key={receiving ? handCount : 'count'}
              className={[receiving ? 'is-bump' : '', handCount > HAND_LIMIT ? 'is-over' : '']
                .filter(Boolean)
                .join(' ')}
              data-testid="dock-hand-count"
            >
              {fill(copy.handSummary, { count: handCount })}
            </span>
          </span>
          <span className="mdock-money" data-testid="dock-money">
            <Lock size={12} strokeWidth={2.4} aria-hidden="true" />
            {money} {th.game.million}
            {moneyDelta !== null && (
              <span
                key={moneyDeltaKey}
                className={`table-money-delta ${moneyDelta < 0 ? 'is-loss' : 'is-gain'}`}
                data-testid="money-delta"
                role="status"
              >
                {moneyDelta < 0
                  ? fill(th.game.table.moneyLoss, { amount: Math.abs(moneyDelta) })
                  : fill(th.game.table.moneyGain, { amount: moneyDelta })}
              </span>
            )}
          </span>
          <ChevronUp className="mdock-chevron" size={22} strokeWidth={3} aria-hidden="true" />
        </button>

        <div id={bodyId} className="mdock-body" hidden={!expanded}>
          {seat}
          {hand}
        </div>

        <div className="mdock-actions">{actions}</div>
      </section>
    </>
  );
}
