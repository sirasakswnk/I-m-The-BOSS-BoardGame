import { Check, Plane } from 'lucide-react';
import type { CSSProperties } from 'react';

import type { DealRequirementGroup } from '@/engine/config/dealBoard';
import type { FamilyColor } from '@/engine/config/families';
import { th } from '@/i18n/th';
import { FAMILY_BY_ID } from '@/ui/common/families';
import { FamilySymbol } from '@/ui/common/FamilySymbol';
import { CardBack } from '@/ui/common/influence';

interface FamilyChipProps {
  color: FamilyColor;
  suffix?: string;
  muted?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
}

/**
 * Compact family chip used in the deal panel. Family-name text stays white;
 * yellow gets an ink backdrop because white on yellow is not readable.
 */
export function FamilyChip({
  color,
  suffix,
  muted = false,
  selected = false,
  disabled = false,
  onClick,
  title,
}: FamilyChipProps) {
  const meta = FAMILY_BY_ID[color];
  const isLight = color === 'yellow';
  const className = [
    'table-family-chip',
    isLight ? 'is-light' : '',
    muted ? 'is-muted' : '',
    selected ? 'is-selected' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const style = isLight
    ? undefined
    : ({ backgroundColor: `var(${meta.cssVar})` } satisfies CSSProperties);
  const content = (
    <>
      <FamilySymbol
        shape={meta.symbol}
        size={14}
        style={{ color: isLight ? `var(${meta.cssVar})` : 'var(--white)' }}
      />
      <span className="table-family-chip-name">{th.families[color]}</span>
      {suffix && <span className="table-family-chip-suffix">{suffix}</span>}
      {selected && <Check size={13} strokeWidth={3} aria-hidden="true" />}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        style={style}
        aria-pressed={selected}
        disabled={disabled}
        title={title}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={className} style={style} title={title}>
      {content}
    </span>
  );
}

interface InvestorTileProps {
  color: FamilyColor;
  vacation?: boolean;
}

/** 40x54 investor card used on seats and beside the board. */
export function InvestorTile({ color, vacation = false }: InvestorTileProps) {
  const meta = FAMILY_BY_ID[color];
  const title = `${th.families[color]}${vacation ? ` · ${th.game.onVacation}` : ''}`;

  return (
    <div
      className={`table-investor ${vacation ? 'is-vacation' : ''}`}
      style={
        {
          '--c': `var(${meta.cssVar})`,
          '--on': color === 'yellow' ? 'var(--ink)' : 'var(--white)',
        } as CSSProperties
      }
      title={title}
      aria-label={title}
      data-family={color}
    >
      <div className="table-investor-face stripes">
        <span className="table-investor-symbol">
          <FamilySymbol shape={meta.symbol} size={17} style={{ color: `var(${meta.cssVar})` }} />
        </span>
        <span className="table-investor-name">{th.families[color]}</span>
        {vacation && (
          <span className="table-investor-vacation" aria-hidden="true">
            <Plane size={11} strokeWidth={3} />
          </span>
        )}
      </div>
    </div>
  );
}

interface CardBacksProps {
  count: number;
}

/** A small stack of face-down influence cards. */
export function CardBacks({ count }: CardBacksProps) {
  const label = th.game.handCount.replace('{count}', String(count));
  const shown = Math.min(6, count);
  return (
    <div className="table-backs" title={label} aria-label={label}>
      <div
        className="table-back-stack"
        style={{ width: `${20 + Math.max(0, shown - 1) * 8}px` }}
        aria-hidden="true"
      >
        {Array.from({ length: shown }).map((_, index) => (
          <CardBack
            key={index}
            width={20}
            height={28}
            className="table-back"
            style={{ left: `${index * 8}px` }}
          />
        ))}
      </div>
      <span className="table-backs-count">
        {count > 6 ? `+${count - 6} ` : ''}×{count}
      </span>
    </div>
  );
}

interface DiceFaceProps {
  value: number | null;
  testId?: string;
}

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export function DiceFace({ value, testId = 'dice-face' }: DiceFaceProps) {
  const pips = value ? (PIPS[value] ?? []) : [];
  const label = value
    ? th.game.table.diceResult.replace('{face}', String(value))
    : th.game.table.diceNotRolled;

  return (
    <div
      className={`table-die ${value ? '' : 'is-empty'}`}
      data-testid={testId}
      data-face={value ?? ''}
      role="img"
      aria-label={label}
    >
      {value ? (
        Array.from({ length: 9 }).map((_, index) => (
          <span
            key={index}
            className={`table-die-cell ${pips.includes(index) ? 'has-pip' : ''}`}
            aria-hidden="true"
          />
        ))
      ) : (
        <span className="table-die-question" aria-hidden="true">
          ?
        </span>
      )}
    </div>
  );
}

interface GroupSymbolsProps {
  groups: DealRequirementGroup[];
  size?: number;
  showPick?: boolean;
  className?: string;
}

/** Requirement groups, e.g. "choose 2 of red/blue". */
export function GroupSymbols({
  groups,
  size = 16,
  showPick = true,
  className,
}: GroupSymbolsProps) {
  const label = groups
    .map((group) =>
      th.game.table.groupAria
        .replace('{pick}', String(group.pick))
        .replace('{colors}', group.colors.map((color) => th.families[color]).join(', ')),
    )
    .join(' / ');

  return (
    <span className={`table-req-groups ${className ?? ''}`} aria-label={label}>
      {groups.map((group, index) => {
        const isPick = group.pick < group.colors.length;
        return (
          <span key={index} className={`table-req-group ${isPick ? 'is-pick' : ''}`}>
            {showPick && isPick && <span className="table-req-pick">{group.pick}</span>}
            {group.colors.map((color) => (
              <FamilySymbol
                key={color}
                shape={FAMILY_BY_ID[color].symbol}
                size={size}
                style={{ color: `var(${FAMILY_BY_ID[color].cssVar})` }}
              />
            ))}
          </span>
        );
      })}
    </span>
  );
}
