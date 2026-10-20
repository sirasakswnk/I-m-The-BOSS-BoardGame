import { describe, expect, it } from 'vitest';

import { APP_NAME } from '@/config/app';
import { th } from '@/i18n/th';
import { FAMILY_BY_ID, FAMILY_PRESENTATION } from '@/ui/common/families';

describe('app config', () => {
  it('uses the game name from the spec', () => {
    expect(APP_NAME).toBe('โต๊ะเจรจาดีล');
  });

  it('has a Thai label for every family', () => {
    for (const family of FAMILY_PRESENTATION) {
      expect(th.families[family.id]).toBeTruthy();
    }
    expect(FAMILY_PRESENTATION).toHaveLength(6);
  });

  it('defines a CSS color variable and a unique symbol for every family', () => {
    const symbols = new Set<string>();

    for (const family of FAMILY_PRESENTATION) {
      expect(family.cssVar).toMatch(/^--(red|blue|green|yellow|purple|black)$/);
      expect(FAMILY_BY_ID[family.id]).toBe(family);
      symbols.add(family.symbol);
    }

    expect(symbols.size).toBe(6);
  });
});
