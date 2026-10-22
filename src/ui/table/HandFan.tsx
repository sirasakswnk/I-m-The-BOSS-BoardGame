import { useRef, type CSSProperties, type KeyboardEvent } from 'react';

import type { FamilyColor } from '@/engine/config/families';
import type { Phase, InfluenceCard as InfluenceCardData } from '@/engine/types';
import { th } from '@/i18n/th';
import { InfluenceCard, getRecruitmentPartMap, type RecruitmentPart } from '@/ui/common/influence';

import { sortHandForDisplay } from './drawUtils';

interface HandFanProps {
  cards: InfluenceCardData[];
  phase: Phase;
  windowOpen: boolean;
  neededColors: Set<FamilyColor>;
  /** `grid` lays smaller cards out in rows for the phone/tablet hand sheet. */
  layout?: 'fan' | 'grid';
  /** Just-drawn cards still flying in: their slot is kept but hidden. */
  arrivingIds?: ReadonlySet<string>;
  /** Just-drawn cards that show the "new" ribbon until looked at. */
  newIds?: ReadonlySet<string>;
  /** Cards flagged by the over-the-hand-limit warning. */
  warnIds?: ReadonlySet<string>;
  onSeen?: (cardId: string) => void;
}

const NO_IDS: ReadonlySet<string> = new Set();

const CARD_SIZE = {
  fan: { width: 112, height: 160 },
  grid: { width: 78, height: 111 },
} as const;

function cardStateClass(
  card: InfluenceCardData,
  phase: Phase,
  windowOpen: boolean,
  neededColors: Set<FamilyColor>,
): string {
  if (windowOpen) {
    if (card.kind === 'clan') return 'is-down';
    return card.kind === 'stop' ? 'is-hot' : 'is-up';
  }
  if (phase === 'dealOpen' && card.kind === 'clan') {
    return neededColors.has(card.color) ? 'is-up' : 'is-down';
  }
  return '';
}

function HandCard({
  card,
  index,
  count,
  phase,
  windowOpen,
  neededColors,
  part,
  layout,
  arriving,
  isNew,
  warn,
  onSeen,
}: {
  card: InfluenceCardData;
  index: number;
  count: number;
  phase: Phase;
  windowOpen: boolean;
  neededColors: Set<FamilyColor>;
  part?: RecruitmentPart;
  layout: 'fan' | 'grid';
  arriving: boolean;
  isNew: boolean;
  warn: boolean;
  onSeen?: (cardId: string) => void;
}) {
  const step = count > 1 ? Math.min(4.2, 40 / (count - 1)) : 0;
  const rotation = layout === 'fan' ? (index - (count - 1) / 2) * step : 0;
  const stateClass = cardStateClass(card, phase, windowOpen, neededColors);
  const style = { '--r': `${rotation}deg` } as CSSProperties;
  const markSeen = isNew && onSeen ? () => onSeen(card.id) : undefined;
  const classes = [
    'table-hand-card',
    stateClass,
    arriving ? 'is-arriving' : '',
    isNew ? 'is-new' : '',
    warn ? 'is-warn' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <InfluenceCard
      card={card}
      width={CARD_SIZE[layout].width}
      height={CARD_SIZE[layout].height}
      part={part}
      className={classes}
      style={style}
      data-card-id={card.id}
      data-new-label={isNew ? th.game.table.draw.newBadge : undefined}
      aria-description={isNew ? th.game.table.draw.newAria : undefined}
      role="listitem"
      tabIndex={0}
      onPointerEnter={markSeen}
      onFocus={markSeen}
      onClick={markSeen}
    />
  );
}

export function HandFan({
  cards,
  phase,
  windowOpen,
  neededColors,
  layout = 'fan',
  arrivingIds = NO_IDS,
  newIds = NO_IDS,
  warnIds = NO_IDS,
  onSeen,
}: HandFanProps) {
  const handRef = useRef<HTMLDivElement>(null);
  const overlap = 52;
  const orderedCards = sortHandForDisplay(cards);
  const recruitmentParts = getRecruitmentPartMap(cards);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const nodes = Array.from(
      handRef.current?.querySelectorAll<HTMLElement>('[data-card-id]') ?? [],
    );
    const current = nodes.indexOf(document.activeElement as HTMLElement);
    if (current === -1) return;
    const next =
      event.key === 'ArrowLeft'
        ? (current - 1 + nodes.length) % nodes.length
        : (current + 1) % nodes.length;
    nodes[next]?.focus();
    event.preventDefault();
  }

  return (
    <div
      ref={handRef}
      className={layout === 'grid' ? 'table-hand is-grid' : 'table-hand'}
      data-testid="my-hand"
      role="list"
      aria-label={th.game.myHand}
      style={
        layout === 'fan' ? ({ '--hand-overlap': `-${overlap}px` } as CSSProperties) : undefined
      }
      onKeyDown={handleKeyDown}
    >
      {orderedCards.length === 0 ? (
        <span className="table-hand-empty">{th.game.noCards}</span>
      ) : (
        orderedCards.map((card, index) => (
          <HandCard
            key={card.id}
            card={card}
            index={index}
            count={orderedCards.length}
            phase={phase}
            windowOpen={windowOpen}
            neededColors={neededColors}
            part={card.kind === 'recruitment' ? recruitmentParts.get(card.id) : undefined}
            layout={layout}
            arriving={arrivingIds.has(card.id)}
            isNew={newIds.has(card.id)}
            warn={warnIds.has(card.id)}
            onSeen={onSeen}
          />
        ))
      )}
    </div>
  );
}
