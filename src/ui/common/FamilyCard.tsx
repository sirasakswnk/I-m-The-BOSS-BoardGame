import { th } from '@/i18n/th';

import { FAMILY_BY_ID, type FamilyId } from './families';
import { FamilySymbol } from './FamilySymbol';

type FamilyCardVariant = 'investor' | 'clan';

interface FamilyCardProps {
  family: FamilyId;
  variant?: FamilyCardVariant;
  className?: string;
}

/**
 * Family card face (plan.md section 9.4): 104x146 desktop, 58x84 mobile,
 * white inner border, diagonal stripes, family symbol + Thai name.
 */
export function FamilyCard({ family, variant = 'investor', className }: FamilyCardProps) {
  const meta = FAMILY_BY_ID[family];
  const textClass = meta.textOnFace === 'ink' ? 'text-ink' : 'text-white';

  return (
    <div
      className={`relative h-[146px] w-[104px] shrink-0 overflow-hidden rounded-card border-2 border-ink shadow-hard max-md:h-[84px] max-md:w-[58px] ${className ?? ''}`}
      style={{ backgroundColor: `var(${meta.cssVar})` }}
    >
      <div className="stripes absolute inset-0" aria-hidden="true" />
      <div
        className="absolute inset-[5px] rounded-[9px] border-2 border-white/80"
        aria-hidden="true"
      />

      {variant === 'clan' && (
        <span className="absolute left-0 top-0 z-10 rounded-br-md border-b-2 border-r-2 border-ink bg-ink px-1.5 py-0.5 font-display text-[10px] font-bold leading-none text-paper max-md:px-1 max-md:text-[8px]">
          {th.card.clanTag}
        </span>
      )}

      <div className="relative flex h-full flex-col items-center justify-center gap-2 max-md:gap-1">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink bg-white max-md:h-7 max-md:w-7">
          <FamilySymbol
            shape={meta.symbol}
            size={26}
            className="max-md:h-4 max-md:w-4"
            style={{ color: `var(${meta.cssVar})` }}
          />
        </span>
        <span className={`font-display text-sm font-bold ${textClass} max-md:text-[10px]`}>
          {th.families[family]}
        </span>
      </div>
    </div>
  );
}
