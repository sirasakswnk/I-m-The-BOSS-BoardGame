import { useUiStore } from '@/store/uiStore';

type SoundName = 'dice' | 'draw' | 'win' | 'toggle';

let audioContext: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    const AudioConstructor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioConstructor) return null;
    audioContext = new AudioConstructor();
  }
  if (audioContext.state === 'suspended') {
    void audioContext.resume();
  }
  return audioContext;
}

function tone(
  ctx: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  type: OscillatorType,
  volume: number,
): void {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

/**
 * Small synthesized effects; no audio assets are shipped. The toggle is off by
 * default, and all failures are silent so audio can never block the game.
 */
export function playSound(name: SoundName): void {
  if (!useUiStore.getState().soundEnabled) return;
  try {
    const ctx = context();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (name === 'toggle') {
      tone(ctx, 523.25, now, 0.09, 'sine', 0.035);
      tone(ctx, 783.99, now + 0.075, 0.12, 'sine', 0.03);
      return;
    }
    if (name === 'dice') {
      tone(ctx, 170, now, 0.065, 'square', 0.025);
      tone(ctx, 240, now + 0.085, 0.06, 'square', 0.02);
      tone(ctx, 130, now + 0.16, 0.08, 'triangle', 0.025);
      return;
    }
    if (name === 'draw') {
      tone(ctx, 440, now, 0.1, 'triangle', 0.025);
      tone(ctx, 660, now + 0.07, 0.12, 'triangle', 0.02);
      return;
    }

    tone(ctx, 523.25, now, 0.16, 'sine', 0.03);
    tone(ctx, 659.25, now + 0.09, 0.18, 'sine', 0.028);
    tone(ctx, 783.99, now + 0.18, 0.3, 'sine', 0.03);
  } catch {
    // Audio is an enhancement; browsers may block it until a user gesture.
  }
}
