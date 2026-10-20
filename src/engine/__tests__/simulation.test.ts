import { describe, expect, it } from 'vitest';

import { playSimulation } from './bot';

describe('engine simulation', () => {
  it(
    'plays 200 seeded games to completion without illegal actions or invariant breaks',
    () => {
      const results = [];
      for (let seed = 1; seed <= 200; seed += 1) {
        try {
          results.push(playSimulation(seed));
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Simulation seed ${seed} failed: ${message}`, { cause: error });
        }
      }

      expect(results).toHaveLength(200);
      for (const result of results) {
        expect(result.deals).toBeGreaterThanOrEqual(10);
        expect(result.deals).toBeLessThanOrEqual(15);
        expect(result.totalPaid).toBeGreaterThan(0);
        expect(Object.keys(result.finalScores)).toHaveLength(3);
      }
    },
    180_000,
  );
});
