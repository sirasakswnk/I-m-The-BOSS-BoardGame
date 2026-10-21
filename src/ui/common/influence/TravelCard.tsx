import type { CSSProperties } from 'react';

import type { FamilyColor } from '@/engine/config/families';
import { th } from '@/i18n/th';
import { FAMILY_BY_ID } from '@/ui/common/families';
import { FamilySymbol } from '@/ui/common/FamilySymbol';

import { CardFrame, type CardComponentProps } from './CardFrame';
import { CardIcon } from './CardSymbols';

interface TravelCardProps extends CardComponentProps {
  color: FamilyColor | 'wild';
}

export function TravelCard({ color, ...rest }: TravelCardProps) {
  const isWild = color === 'wild';
  const meta = isWild ? null : FAMILY_BY_ID[color];
  const colorName = isWild ? th.card.wildColor : th.families[color];
  const faceStyle = meta
    ? ({
        '--c': `var(${meta.cssVar})`,
        '--on': meta.textOnFace === 'ink' ? 'var(--ink)' : 'var(--white)',
      } as CSSProperties)
    : undefined;

  return (
    <CardFrame
      {...rest}
      label={th.card.aria.travel.replace('{color}', colorName)}
      faceClassName="is-travel"
      faceStyle={faceStyle}
      cornerIcon={<CardIcon name="bag" />}
      cornerLabel={th.card.short.travel}
    >
      <div className="influence-travel-header">{th.card.travel}</div>
      <div className="influence-travel-body">
        <CardIcon name="bag" />
        <small>{th.card.hint.travel}</small>
      </div>
      <div className={`influence-travel-stub ${isWild ? 'is-wild' : ''}`}>
        {isWild ? (
          <span className="influence-travel-stub-name is-wild">{th.card.wildColor}</span>
        ) : (
          <>
            <span className="influence-travel-stub-emblem">
              <FamilySymbol shape={meta!.symbol} style={{ color: `var(${meta!.cssVar})` }} />
            </span>
            <span className="influence-travel-stub-name">{th.families[color]}</span>
          </>
        )}
      </div>
    </CardFrame>
  );
}
