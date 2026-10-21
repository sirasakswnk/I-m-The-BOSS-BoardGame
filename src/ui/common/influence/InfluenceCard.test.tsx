import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { buildInfluenceDeck } from '@/engine/config/influenceCards';
import { th } from '@/i18n/th';
import { CardBack, InfluenceCard, getRecruitmentPartMap } from '@/ui/common/influence';

const DECK = buildInfluenceDeck();

describe('InfluenceCard', () => {
  it('renders every card in the section 3.2 deck with an aria-label', () => {
    for (const card of DECK) {
      const html = renderToStaticMarkup(
        <InfluenceCard card={card} part={card.kind === 'recruitment' ? 1 : undefined} />,
      );

      expect(html, card.id).toContain('influence-card');
      expect(html, card.id).toMatch(/aria-label="[^"]+"/);
      expect(html, card.id).toContain(`data-card-kind="${card.kind}"`);
    }
  });

  it('labels the recruitment triptych part', () => {
    const card = DECK.find((entry) => entry.kind === 'recruitment');
    expect(card).toBeDefined();
    const html = renderToStaticMarkup(<InfluenceCard card={card!} part={2} />);
    expect(html).toContain('ใบที่ 2 จาก 3');
    expect(html).toContain('2/3');
  });

  it('renders a labelled card back when faceDown', () => {
    const html = renderToStaticMarkup(<InfluenceCard card={DECK[0]} faceDown />);
    expect(html).toContain(th.card.aria.back);
    expect(html).toContain('influence-back-mark');
    expect(html).toContain('data-card-kind="back"');
  });

  it('renders a standalone card back', () => {
    const html = renderToStaticMarkup(<CardBack />);
    expect(html).toContain('aria-label="หลังการ์ด"');
    expect(html).toContain('influence-back-name');
  });

  it('maps recruitment cards to 1/3, 2/3, 3/3, 1/3 by numeric id', () => {
    const cards = [
      { id: 'recruitment-10', kind: 'recruitment' as const },
      { id: 'recruitment-2', kind: 'recruitment' as const },
      { id: 'clan-red-1', kind: 'clan' as const, color: 'red' as const },
      { id: 'recruitment-1', kind: 'recruitment' as const },
      { id: 'recruitment-3', kind: 'recruitment' as const },
    ];

    const parts = getRecruitmentPartMap(cards);
    expect(parts.get('recruitment-1')).toBe(1);
    expect(parts.get('recruitment-2')).toBe(2);
    expect(parts.get('recruitment-3')).toBe(3);
    expect(parts.get('recruitment-10')).toBe(1);
    expect(parts.get('clan-red-1')).toBeUndefined();
  });
});
