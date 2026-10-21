import { Ban, Coins, Crown, Plane } from 'lucide-react';
import { useRef, type CSSProperties, type KeyboardEvent } from 'react';

import { FAMILY_ORDER, type FamilyColor } from '@/engine/config/families';
import type { Phase, InfluenceCard } from '@/engine/types';
import { th } from '@/i18n/th';
import { FAMILY_BY_ID } from '@/ui/common/families';
import { FamilySymbol } from '@/ui/common/FamilySymbol';

const WILD_GRADIENT = (() => {
  const step = 100 / FAMILY_ORDER.length;
  const stops = FAMILY_ORDER.map((color, index) => {
    const start = index * step;
    const end = (index + 1) * step;
    return `var(${FAMILY_BY_ID[color].cssVar}) ${start}% ${end}%`;
  });
  return `linear-gradient(90deg, ${stops.join(', ')})`;
})();

interface HandFanProps {
  cards: InfluenceCard[];
  phase: Phase;
  windowOpen: boolean;
  neededColors: Set<FamilyColor>;
}

function cardAriaLabel(card: InfluenceCard): string {
  switch (card.kind) {
    case 'clan':
      return th.game.table.cardAriaClan.replace('{color}', th.families[card.color]);
    case 'travel':
      return th.game.table.cardAriaTravel.replace(
        '{color}',
        card.color === 'wild' ? th.card.wildColor : th.families[card.color],
      );
    case 'recruitment':
      return th.game.table.cardAriaRecruitment;
    case 'stop':
      return th.game.table.cardAriaStop;
    case 'imTheBoss':
      return th.game.table.cardAriaBoss;
  }
}

function ActionIcon({ kind, size = 46 }: { kind: InfluenceCard['kind']; size?: number }) {
  switch (kind) {
    case 'travel':
      return <Plane size={size} strokeWidth={2.2} />;
    case 'recruitment':
      return <Coins size={size} strokeWidth={2.2} />;
    case 'stop':
      return <Ban size={size} strokeWidth={2.5} />;
    case 'imTheBoss':
      return <Crown size={size} strokeWidth={2.2} />;
    case 'clan':
      return null;
  }
}

function shortLabel(card: InfluenceCard): string {
  switch (card.kind) {
    case 'clan':
      return th.families[card.color];
    case 'travel':
      return th.game.table.handShortTravel;
    case 'recruitment':
      return th.game.table.handShortRecruitment;
    case 'stop':
      return th.game.table.handShortStop;
    case 'imTheBoss':
      return th.game.table.handShortBoss;
  }
}

function actionStripStyle(card: InfluenceCard): CSSProperties {
  if (card.kind === 'travel') {
    return card.color === 'wild'
      ? { backgroundImage: WILD_GRADIENT }
      : { backgroundColor: `var(${FAMILY_BY_ID[card.color].cssVar})` };
  }
  if (card.kind === 'recruitment') return { backgroundColor: 'var(--ink)' };
  if (card.kind === 'stop') return { backgroundColor: 'var(--red)' };
  if (card.kind === 'imTheBoss') return { backgroundColor: 'var(--gold)' };
  return {};
}

function cardStateClass(
  card: InfluenceCard,
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
  registerRef,
}: {
  card: InfluenceCard;
  index: number;
  count: number;
  phase: Phase;
  windowOpen: boolean;
  neededColors: Set<FamilyColor>;
  registerRef: (index: number, node: HTMLDivElement | null) => void;
}) {
  const step = count > 1 ? Math.min(4.2, 40 / (count - 1)) : 0;
  const rotation = (index - (count - 1) / 2) * step;
  const stateClass = cardStateClass(card, phase, windowOpen, neededColors);
  const isClan = card.kind === 'clan';
  const meta = isClan ? FAMILY_BY_ID[card.color] : null;
  const clanStyle = meta
    ? ({ '--c': `var(${meta.cssVar})` } as CSSProperties)
    : undefined;
  const style = { '--r': `${rotation}deg` } as CSSProperties;

  return (
    <div
      ref={(node) => registerRef(index, node)}
      className={`table-hand-card ${stateClass}`}
      style={style}
      data-card-id={card.id}
      role="listitem"
      tabIndex={0}
      aria-label={cardAriaLabel(card)}
    >
      <span className={`table-hand-cn is-${card.kind}`} aria-hidden="true">
        {isClan ? (
          <FamilySymbol
            shape={meta!.symbol}
            size={20}
            style={{ color: `var(${meta!.cssVar})` }}
          />
        ) : (
          <ActionIcon kind={card.kind} size={20} />
        )}
      </span>
      <span className="table-hand-cl" aria-hidden="true">
        {shortLabel(card)}
      </span>
      <div
        className={`table-card-face ${isClan ? 'is-clan stripes' : 'is-action'}`}
        style={clanStyle}
      >
        {isClan ? (
          <>
            <span className="table-card-clan-tag">{th.card.clanTag}</span>
            <span className="table-card-clan-emblem">
              <FamilySymbol
                shape={meta!.symbol}
                size={32}
                style={{ color: `var(${meta!.cssVar})` }}
              />
            </span>
            <span
              className={`table-card-clan-name ${
                card.color === 'yellow' ? 'is-light' : ''
              }`}
            >
              {th.families[card.color]}
            </span>
          </>
        ) : (
          <>
            <span className="table-card-strip" style={actionStripStyle(card)} aria-hidden="true" />
            <span className={`table-card-icon is-${card.kind}`}>
              <ActionIcon kind={card.kind} />
            </span>
            <span className="table-card-name">{th.card[card.kind]}</span>
            {card.kind === 'travel' && (
              <span
                className={`table-card-family-pill ${
                  card.color === 'wild' ? 'is-wild' : ''
                }`}
                style={
                  card.color === 'wild'
                    ? undefined
                    : { backgroundColor: 'var(--ink)' }
                }
              >
                {card.color !== 'wild' && (
                  <FamilySymbol
                    shape={FAMILY_BY_ID[card.color].symbol}
                    size={11}
                    style={{ color: `var(${FAMILY_BY_ID[card.color].cssVar})` }}
                  />
                )}
                <span>
                  {card.color === 'wild' ? th.card.wildColor : th.families[card.color]}
                </span>
              </span>
            )}
            {card.kind === 'recruitment' && (
              <span className="table-card-sub">{th.game.table.recruitSub}</span>
            )}
            {card.kind === 'stop' && (
              <span className="table-card-sub">{th.game.table.stopSub}</span>
            )}
            {card.kind === 'imTheBoss' && (
              <span className="table-card-sub">{th.game.table.bossSub}</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const HAND_KIND_ORDER: Record<InfluenceCard['kind'], number> = {
  clan: 0,
  travel: 1,
  stop: 2,
  recruitment: 3,
  imTheBoss: 4,
};

export function HandFan({ cards, phase, windowOpen, neededColors }: HandFanProps) {
  const refs = useRef<Array<HTMLDivElement | null>>([]);
  const overlap = 52;
  const orderedCards = [...cards].sort(
    (left, right) => HAND_KIND_ORDER[left.kind] - HAND_KIND_ORDER[right.kind],
  );

  function registerRef(index: number, node: HTMLDivElement | null) {
    refs.current[index] = node;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const current = refs.current.findIndex((node) => node === document.activeElement);
    if (current === -1) return;
    const next =
      event.key === 'ArrowLeft'
        ? (current - 1 + orderedCards.length) % orderedCards.length
        : (current + 1) % orderedCards.length;
    refs.current[next]?.focus();
    event.preventDefault();
  }

  return (
    <div
      className="table-hand"
      data-testid="my-hand"
      role="list"
      aria-label={th.game.myHand}
      style={{ '--hand-overlap': `-${overlap}px` } as CSSProperties}
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
            registerRef={registerRef}
          />
        ))
      )}
    </div>
  );
}
