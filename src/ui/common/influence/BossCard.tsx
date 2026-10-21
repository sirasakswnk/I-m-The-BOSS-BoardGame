import { th } from '@/i18n/th';

import { CardFrame, type CardComponentProps } from './CardFrame';
import { CardIcon } from './CardSymbols';

type BossCardProps = CardComponentProps;

export function BossCard(props: BossCardProps) {
  return (
    <CardFrame
      {...props}
      label={th.card.aria.boss}
      faceClassName="is-boss"
      cornerIcon={<CardIcon name="crown" />}
      cornerLabel={th.card.short.boss}
    >
      <CardIcon name="crown" className="influence-boss-crown" />
      <span className="influence-boss-stamp">{th.card.imTheBoss}</span>
      <small>{th.card.hint.boss}</small>
    </CardFrame>
  );
}
