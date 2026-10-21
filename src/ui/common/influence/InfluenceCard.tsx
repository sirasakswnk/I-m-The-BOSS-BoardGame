import type { InfluenceCard as InfluenceCardData } from '@/engine/config/influenceCards';

import { BossCard } from './BossCard';
import { CardBack } from './CardBack';
import type { CardComponentProps } from './CardFrame';
import { ClanCard } from './ClanCard';
import { RecruitmentCard } from './RecruitmentCard';
import type { RecruitmentPart } from './recruitmentParts';
import { StopCard } from './StopCard';
import { TravelCard } from './TravelCard';

interface InfluenceCardProps extends CardComponentProps {
  card: InfluenceCardData;
  faceDown?: boolean;
  /** Only used by recruitment cards. HandFan computes this from the hand. */
  part?: RecruitmentPart;
}

/**
 * Single entry point for influence-card faces. Investors keep using FamilyCard;
 * clan cards use ClanCard here and are visually distinct with the gold tag.
 */
export function InfluenceCard({ card, faceDown = false, part, ...rest }: InfluenceCardProps) {
  if (faceDown) {
    return <CardBack {...rest} />;
  }

  switch (card.kind) {
    case 'clan':
      return <ClanCard {...rest} color={card.color} data-card-kind="clan" />;
    case 'travel':
      return <TravelCard {...rest} color={card.color} data-card-kind="travel" />;
    case 'recruitment':
      return <RecruitmentCard {...rest} part={part} data-card-kind="recruitment" />;
    case 'stop':
      return <StopCard {...rest} data-card-kind="stop" />;
    case 'imTheBoss':
      return <BossCard {...rest} data-card-kind="imTheBoss" />;
  }
}
