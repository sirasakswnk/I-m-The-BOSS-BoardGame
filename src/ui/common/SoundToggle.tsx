import { Volume2, VolumeX } from 'lucide-react';

import { th } from '@/i18n/th';
import { useUiStore } from '@/store/uiStore';

import { playSound } from './sound';

/**
 * Opt-in Web Audio effects. Uses aria-pressed so the current state is exposed
 * without relying on the icon alone.
 */
export function SoundToggle({ className }: { className?: string }) {
  const soundEnabled = useUiStore((state) => state.soundEnabled);
  const toggleSound = useUiStore((state) => state.toggleSound);

  function handleToggle(): void {
    toggleSound();
    if (!soundEnabled) playSound('toggle');
  }

  return (
    <button
      type="button"
      className={className ?? 'table-top-btn'}
      data-testid="sound-toggle"
      aria-pressed={soundEnabled}
      aria-label={soundEnabled ? th.game.table.soundOff : th.game.table.soundOn}
      title={soundEnabled ? th.game.table.soundOff : th.game.table.soundOn}
      onClick={handleToggle}
    >
      {soundEnabled ? (
        <Volume2 size={18} aria-hidden="true" />
      ) : (
        <VolumeX size={18} aria-hidden="true" />
      )}
    </button>
  );
}
