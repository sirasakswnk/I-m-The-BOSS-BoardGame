import type { ReactNode } from 'react';

interface PanelProps {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, children, className }: PanelProps) {
  return (
    <section
      className={`rounded-panel border-2 border-ink bg-white px-[22px] py-5 shadow-hard ${className ?? ''}`}
    >
      {title !== undefined && <h2 className="mb-3 font-display text-xl font-bold">{title}</h2>}
      {children}
    </section>
  );
}
