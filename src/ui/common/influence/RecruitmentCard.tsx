import { th } from '@/i18n/th';

import { CardFrame, type CardComponentProps } from './CardFrame';
import { CardIcon, DealArt } from './CardSymbols';

interface RecruitmentCardProps extends CardComponentProps {
  part?: 1 | 2 | 3;
}

export function RecruitmentCard({ part = 1, ...rest }: RecruitmentCardProps) {
  const safePart = Math.max(1, Math.min(3, part)) as 1 | 2 | 3;
  const label = th.card.aria.recruitment
    .replace('{part}', String(safePart))
    .replace('{total}', '3');

  return (
    <CardFrame
      {...rest}
      label={label}
      faceClassName="is-recruitment"
      cornerIcon={<CardIcon name="coin" />}
      cornerLabel={th.card.short.recruitment}
    >
      <span className="influence-recruit-strip" aria-hidden="true" />
      <DealArt part={(safePart - 1) as 0 | 1 | 2} className="influence-recruit-art" />
      <div className="influence-recruit-title-row">
        <b>{th.card.recruitment}</b>
        <span className="influence-recruit-part">
          {th.card.partShort.replace('{part}', String(safePart)).replace('{total}', '3')}
        </span>
      </div>
      <small>{th.card.hint.recruitment}</small>
    </CardFrame>
  );
}
