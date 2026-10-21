import { describe, expect, it } from 'vitest';

import { normalizeHostState } from '../gameState';

describe('host state normalization', () => {
  it('omits optional pending fields that RTDB rejects when written back', () => {
    const state = normalizeHostState({
      pendingCards: [
        {
          id: 'p1',
          seq: 1,
          kind: 'imTheBoss',
          playerUid: 'p2',
          cards: [],
          ts: 1000,
        },
      ],
    });

    expect(state).not.toBeNull();
    const pending = state!.pendingCards[0];
    expect(pending).toBeDefined();
    expect(pending).not.toHaveProperty('target');
    expect(pending).not.toHaveProperty('stoppedBy');
  });

  it('keeps a normalized travel target and stoppedBy marker', () => {
    const state = normalizeHostState({
      pendingCards: [
        {
          id: 'p2',
          seq: 2,
          kind: 'travel',
          playerUid: 'p2',
          cards: [],
          target: { kind: 'investor', uid: 'p3', color: 'red' },
          stoppedBy: 'p1',
          ts: 2000,
        },
      ],
    });

    expect(state?.pendingCards[0].target).toEqual({
      kind: 'investor',
      uid: 'p3',
      color: 'red',
    });
    expect(state?.pendingCards[0].stoppedBy).toBe('p1');
  });
});
