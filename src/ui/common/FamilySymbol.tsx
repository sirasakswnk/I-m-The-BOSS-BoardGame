import type { CSSProperties } from 'react';

import type { FamilySymbolShape } from './families';

interface FamilySymbolProps {
  shape: FamilySymbolShape;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Family glyphs live in the shared card sprite (CardSymbols.tsx) so cards,
 * seats, chips, and the home fan all use the same six shapes.
 */
export function FamilySymbol({ shape, size = 28, className, style }: FamilySymbolProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <use href={`#card-em-${shape}`} />
    </svg>
  );
}
