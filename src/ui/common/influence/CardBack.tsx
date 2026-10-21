import { APP_NAME } from '@/config/app';
import { th } from '@/i18n/th';
import { FAMILY_PRESENTATION } from '@/ui/common/families';

import { CardFrame, type CardComponentProps } from './CardFrame';

type CardBackProps = CardComponentProps;

export function CardBack({ width = 150, height, className, ...rest }: CardBackProps) {
  // ASSUMPTION: seat-stack/deck backs below 90px keep the six-colour mark and
  // gold frame but hide the game-name line, which is unreadable at that size.
  const compact = width < 90;

  return (
    <CardFrame
      {...rest}
      width={width}
      height={height}
      className={`influence-card-back ${compact ? 'is-compact' : ''} ${className ?? ''}`}
      label={th.card.aria.back}
      faceClassName="is-back stripes"
      data-card-kind="back"
    >
      <span className="influence-back-mark" aria-hidden="true">
        {FAMILY_PRESENTATION.map((family) => (
          <i
            key={family.id}
            className="influence-back-cell"
            style={{ backgroundColor: `var(${family.cssVar})` }}
          />
        ))}
      </span>
      <b className="influence-back-name">{APP_NAME}</b>
    </CardFrame>
  );
}
