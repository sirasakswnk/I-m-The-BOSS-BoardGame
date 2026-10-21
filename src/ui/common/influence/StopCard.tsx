import { th } from '@/i18n/th';

import { CardFrame, type CardComponentProps } from './CardFrame';
import { CardIcon } from './CardSymbols';

type StopCardProps = CardComponentProps;

export function StopCard(props: StopCardProps) {
  return (
    <CardFrame
      {...props}
      label={th.card.aria.stop}
      faceClassName="is-stop"
      cornerIcon={<CardIcon name="stop" />}
      cornerLabel={th.card.short.stop}
    >
      <div className="influence-stop-inner">
        <svg className="influence-stop-sign" viewBox="0 0 100 100" aria-hidden="true">
          <path
            d="M30 3h40l27 27v40L70 97H30L3 70V30z"
            fill="var(--stop)"
            stroke="var(--ink)"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <text
            x="50"
            y="62"
            textAnchor="middle"
            fontFamily="Kanit"
            fontWeight="800"
            fontSize="30"
            fill="var(--white)"
          >
            {th.card.stop}
          </text>
        </svg>
        <small>{th.card.hint.stop}</small>
      </div>
    </CardFrame>
  );
}
