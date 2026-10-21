import type { ReactNode } from 'react';

import { FAMILY_ORDER, type FamilyColor } from '@/engine/config/families';
import type { InfluenceCard as InfluenceCardData } from '@/engine/config/influenceCards';
import { th } from '@/i18n/th';
import { CardBack, InfluenceCard } from '@/ui/common/influence';

const CLAN_CARDS: InfluenceCardData[] = FAMILY_ORDER.map((color) => ({
  id: `clan-${color}-1`,
  kind: 'clan',
  color,
}));

const TRAVEL_COLORS: ReadonlyArray<FamilyColor | 'wild'> = [...FAMILY_ORDER, 'wild'];
const TRAVEL_CARDS: InfluenceCardData[] = TRAVEL_COLORS.map((color) => ({
  id: `travel-${color}-1`,
  kind: 'travel',
  color,
}));

const RECRUITMENT_CARDS: InfluenceCardData[] = [1, 2, 3].map((part) => ({
  id: `recruitment-${part}`,
  kind: 'recruitment',
}));

const STOP_CARD: InfluenceCardData = { id: 'stop-1', kind: 'stop' };
const BOSS_CARD: InfluenceCardData = { id: 'imTheBoss-1', kind: 'imTheBoss' };
const FAN_CARDS: InfluenceCardData[] = [
  CLAN_CARDS[0],
  TRAVEL_CARDS[1],
  RECRUITMENT_CARDS[0],
  STOP_CARD,
  BOSS_CARD,
];

function CardSection({
  title,
  id,
  testId,
  children,
}: {
  title: string;
  id: string;
  testId: string;
  children: ReactNode;
}) {
  return (
    <section className="cards-gallery-section" aria-labelledby={id} data-testid={testId}>
      <h2 id={id}>{title}</h2>
      <div className="cards-gallery-row">{children}</div>
    </section>
  );
}

/** Development gallery for comparing the React card set with design/cards.html. */
export function CardsPreview() {
  return (
    <div className="cards-gallery" data-testid="cards-gallery">
      <p className="cards-gallery-note">{th.preview.cardsNote}</p>

      <CardSection title={th.card.clan} id="gallery-clan" testId="cards-clan">
        {CLAN_CARDS.map((card) => (
          <InfluenceCard key={card.id} card={card} />
        ))}
      </CardSection>

      <CardSection title={th.card.travel} id="gallery-travel" testId="cards-travel">
        {TRAVEL_CARDS.map((card) => (
          <InfluenceCard key={card.id} card={card} />
        ))}
      </CardSection>

      <CardSection title={th.card.recruitment} id="gallery-recruitment" testId="cards-recruitment">
        {RECRUITMENT_CARDS.map((card, index) => (
          <InfluenceCard key={card.id} card={card} part={(index + 1) as 1 | 2 | 3} />
        ))}
      </CardSection>

      <CardSection
        title={`${th.card.stop} / ${th.card.imTheBoss}`}
        id="gallery-action"
        testId="cards-action"
      >
        <InfluenceCard card={STOP_CARD} />
        <InfluenceCard card={BOSS_CARD} />
      </CardSection>

      <CardSection title={th.card.backTitle} id="gallery-back" testId="cards-back">
        <CardBack />
      </CardSection>

      <section className="cards-gallery-section" aria-labelledby="gallery-fan">
        <h2 id="gallery-fan">{th.preview.cardsFanTitle}</h2>
        <div className="cards-gallery-fan">
          {FAN_CARDS.map((card, index) => (
            <InfluenceCard
              key={card.id}
              card={card}
              width={112}
              height={160}
              part={card.kind === 'recruitment' ? 1 : undefined}
              style={{ zIndex: index + 1 }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
