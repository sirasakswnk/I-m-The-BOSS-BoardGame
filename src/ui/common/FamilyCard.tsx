import { th } from '@/i18n/th';

import { FAMILY_BY_ID, type FamilyId } from './families';
import { FamilySymbol } from './FamilySymbol';

interface FamilyCardProps {
  family: FamilyId;
  className?: string;
}

/**
 * Investor card based on design/home.html: 104x146 desktop / 58x84 mobile,
 * white frame with ink border, striped family-colored face, emblem in a white
 * circle, name pill and corner labels. Clan cards use ClanCard instead.
 */
export function FamilyCard({ family, className }: FamilyCardProps) {
  const meta = FAMILY_BY_ID[family];
  const isLightFace = meta.textOnFace === 'ink';

  return (
    <div
      className={`relative h-[146px] w-[104px] shrink-0 overflow-hidden rounded-card border-2 border-ink bg-white p-1.5 shadow-card max-md:h-[84px] max-md:w-[58px] max-md:rounded-[9px] max-md:p-[3px] ${className ?? ''}`}
    >
      <div
        className="stripes relative flex h-full flex-col items-center justify-center gap-1.5 rounded-[9px] max-md:gap-1 max-md:rounded-[7px]"
        style={{ backgroundColor: `var(${meta.cssVar})` }}
      >
        <span
          className={`absolute left-2 top-1.5 font-display text-[13px] font-bold leading-none text-white max-md:hidden ${
            isLightFace ? 'rounded bg-ink/[0.45] px-1' : ''
          }`}
        >
          {th.families[family]}
        </span>
        <span
          className={`absolute bottom-1.5 right-2 rotate-180 font-display text-[13px] font-bold leading-none text-white max-md:hidden ${
            isLightFace ? 'rounded bg-ink/[0.45] px-1' : ''
          }`}
        >
          {th.families[family]}
        </span>

        <span className="flex h-[50px] w-[50px] items-center justify-center rounded-full border-2 border-ink bg-white/[0.92] max-md:h-7 max-md:w-7">
          <FamilySymbol
            shape={meta.symbol}
            size={28}
            className="max-md:h-4 max-md:w-4"
            style={{ color: `var(${meta.cssVar})` }}
          />
        </span>

        <span
          className={`rounded-full px-2.5 font-display text-[17px] font-bold text-white max-md:px-1.5 max-md:text-[11px] ${
            isLightFace ? 'bg-ink/[0.45]' : 'bg-ink/[0.18]'
          }`}
        >
          {th.families[family]}
        </span>
      </div>
    </div>
  );
}
