import type { CSSProperties } from 'react';

import type { FamilyColor } from '@/engine/config/families';
import { th } from '@/i18n/th';
import { FAMILY_BY_ID } from '@/ui/common/families';
import { FamilySymbol } from '@/ui/common/FamilySymbol';

import { CardFrame, type CardComponentProps } from './CardFrame';

interface ClanCardProps extends CardComponentProps {
  color: FamilyColor;
}

export function ClanCard({ color, ...rest }: ClanCardProps) {
  const meta = FAMILY_BY_ID[color];

  return (
    <CardFrame
      {...rest}
      label={th.card.aria.clan.replace('{color}', th.families[color])}
      faceClassName="is-clan stripes"
      faceStyle={
        {
          '--c': `var(${meta.cssVar})`,
          '--on': meta.textOnFace === 'ink' ? 'var(--ink)' : 'var(--white)',
        } as CSSProperties
      }
      cornerIcon={<FamilySymbol shape={meta.symbol} style={{ color: `var(${meta.cssVar})` }} />}
      cornerLabel={th.families[color]}
    >
      <span className="influence-clan-tag">{th.card.clanTag}</span>
      <span className="influence-clan-emblem">
        <FamilySymbol shape={meta.symbol} style={{ color: `var(${meta.cssVar})` }} />
      </span>
      <span className="influence-clan-name">{th.families[color]}</span>
    </CardFrame>
  );
}
