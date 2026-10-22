import { useState, type ReactNode } from 'react';

import { th } from '@/i18n/th';
import { Button } from '@/ui/common/Button';
import { Modal } from '@/ui/common/Modal';

export interface HowToPlayButtonProps {
  className?: string;
  children?: ReactNode;
}

/**
 * The same rules reference is available from the home header, lobby header and
 * table top bar. It is a modal so players can open it without leaving a game.
 */
export function HowToPlayButton({ className, children }: HowToPlayButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={className ?? 'nav-link'}
        data-testid="how-to-play-trigger"
        onClick={() => setOpen(true)}
      >
        {children ?? th.howToPlay.trigger}
      </button>
      {open && <HowToPlayModal onClose={() => setOpen(false)} />}
    </>
  );
}

export function HowToPlayModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title={th.howToPlay.title}
      eyebrow={th.howToPlay.eyebrow}
      onClose={onClose}
      testId="how-to-play"
      className="how-to-play-modal"
    >
      <p className="text-[16px] leading-relaxed text-ink-soft">{th.howToPlay.intro}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {th.howToPlay.sections.map((section) => (
          <section
            key={section.title}
            className="rounded-btn border-2 border-ink bg-paper p-3.5 shadow-hard-sm"
          >
            <h3 className="mb-1.5 font-display text-[18px] font-extrabold">{section.title}</h3>
            <p className="text-[15px] leading-relaxed text-ink-soft">{section.body}</p>
          </section>
        ))}
      </div>
      <div className="rounded-btn border-2 border-dashed border-line bg-white p-3.5">
        <h3 className="mb-1 font-display text-[17px] font-bold">{th.howToPlay.reminderTitle}</h3>
        <p className="text-[15px] leading-relaxed text-ink-soft">{th.howToPlay.reminder}</p>
      </div>
      <div className="app-modal-actions">
        <Button variant="dark" onClick={onClose}>
          {th.howToPlay.close}
        </Button>
      </div>
    </Modal>
  );
}
