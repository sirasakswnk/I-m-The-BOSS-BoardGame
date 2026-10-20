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
      className={`inline-flex items-center gap-2 rounded-full border-2 border-ink px-3.5 py-2 text-[15px] font-medium ${TONE_CLASSES[tone]} ${className ?? ''}`}
    >
      {children}
    </span>
  );
}
