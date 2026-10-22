import { useRef, type CSSProperties, type KeyboardEvent } from 'react';

import type { FamilyColor } from '@/engine/config/families';
import type { Phase, InfluenceCard as InfluenceCardData } from '@/engine/types';
import { th } from '@/i18n/th';
import { InfluenceCard, getRecruitmentPartMap, type RecruitmentPart } from '@/ui/common/influence';

interface HandFanProps {
  cards: InfluenceCardData[];
  phase: Phase;
  windowOpen: boolean;
  neededColors: Set<FamilyColor>;
  /** `grid` lays smaller cards out in rows for the phone/tablet hand sheet. */
  layout?: 'fan' | 'grid';
}

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
}: {
  card: InfluenceCardData;
  index: number;
  count: number;
  phase: Phase;
  windowOpen: boolean;
  neededColors: Set<FamilyColor>;
  part?: RecruitmentPart;
  layout: 'fan' | 'grid';
}) {
  const step = count > 1 ? Math.min(4.2, 40 / (count - 1)) : 0;
  const rotation = layout === 'fan' ? (index - (count - 1) / 2) * step : 0;
  const stateClass = cardStateClass(card, phase, windowOpen, neededColors);
  const style = { '--r': `${rotation}deg` } as CSSProperties;

  return (
    <InfluenceCard
      card={card}
      width={CARD_SIZE[layout].width}
      height={CARD_SIZE[layout].height}
      part={part}
      className={`table-hand-card ${stateClass}`}
      style={style}
      data-card-id={card.id}
      role="listitem"
      tabIndex={0}
    />
  );
}

const HAND_KIND_ORDER: Record<InfluenceCardData['kind'], number> = {
  clan: 0,
  travel: 1,
  stop: 2,
  recruitment: 3,
  imTheBoss: 4,
};

export function HandFan({ cards, phase, windowOpen, neededColors, layout = 'fan' }: HandFanProps) {
  const handRef = useRef<HTMLDivElement>(null);
  const overlap = 52;
  const orderedCards = [...cards].sort(
    (left, right) => HAND_KIND_ORDER[left.kind] - HAND_KIND_ORDER[right.kind],
  );
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
          />
        ))
      )}
    </div>
  );
}
