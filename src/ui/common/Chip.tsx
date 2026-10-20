import type { ReactNode } from 'react';

type ChipTone = 'paper' | 'gold' | 'accent' | 'ink';

interface ChipProps {
  tone?: ChipTone;
  children: ReactNode;
  className?: string;
}

const TONE_CLASSES: Record<ChipTone, string> = {
  paper: 'bg-white text-ink',
  gold: 'bg-gold text-ink',
  accent: 'bg-accent text-white',
  ink: 'bg-ink text-paper',
};

export function Chip({ tone = 'paper', children, className }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1 font-display text-sm font-bold ${TONE_CLASSES[tone]} ${className ?? ''}`}
    >
      {children}
    </span>
  );
}
