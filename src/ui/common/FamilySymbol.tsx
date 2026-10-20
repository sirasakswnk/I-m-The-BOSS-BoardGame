import type { CSSProperties } from 'react';

import type { FamilySymbolShape } from './families';

interface FamilySymbolProps {
  shape: FamilySymbolShape;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function FamilySymbol({ shape, size = 28, className, style }: FamilySymbolProps) {
  const svgProps = {
    width: size,
    height: size,
    viewBox: '0 0 32 32',
    className,
    style,
    'aria-hidden': true,
  } as const;

  switch (shape) {
    case 'circle':
      return (
        <svg {...svgProps}>
          <circle cx="16" cy="16" r="12" fill="currentColor" />
        </svg>
      );
    case 'square':
      return (
        <svg {...svgProps}>
          <rect x="5" y="5" width="22" height="22" rx="3" fill="currentColor" />
        </svg>
      );
    case 'triangle':
      return (
        <svg {...svgProps}>
          <path d="M16 4 30 28H2Z" fill="currentColor" />
        </svg>
      );
    case 'diamond':
      return (
        <svg {...svgProps}>
          <path d="M16 3 29 16 16 29 3 16Z" fill="currentColor" />
        </svg>
      );
    case 'star':
      return (
        <svg {...svgProps}>
          <path
            d="M16 2l3.9 7.9 8.7 1.3-6.3 6.1 1.5 8.6L16 21.8l-7.8 4.1 1.5-8.6-6.3-6.1 8.7-1.3Z"
            fill="currentColor"
          />
        </svg>
      );
    case 'hex':
      return (
        <svg {...svgProps}>
          <path d="M16 2l12 7v14l-12 7-12-7V9Z" fill="currentColor" />
        </svg>
      );
  }
}
