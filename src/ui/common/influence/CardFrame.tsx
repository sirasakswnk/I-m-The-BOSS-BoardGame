import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

export interface CardComponentProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'aria-label' | 'part'
> {
  width?: number;
  height?: number;
}

interface CardFrameProps extends CardComponentProps {
  label: string;
  faceClassName: string;
  faceStyle?: CSSProperties;
  cornerIcon?: ReactNode;
  cornerLabel?: string;
  children: ReactNode;
}

/**
 * Shared 150x210 card frame. Every visual measurement inside the card is
 * expressed in `--u` (rendered width / 150), so the same design works in the
 * hand, in the gallery, and as a tiny card back.
 */
export function CardFrame({
  label,
  faceClassName,
  faceStyle,
  cornerIcon,
  cornerLabel,
  children,
  width = 150,
  height,
  className,
  style,
  ...rest
}: CardFrameProps) {
  const cardHeight = height ?? Math.round(width * 1.4);
  const cardStyle = {
    ...style,
    '--u': width / 150,
    '--card-w': `${width}px`,
    '--card-h': `${cardHeight}px`,
  } as CSSProperties;

  return (
    <div
      {...rest}
      role={rest.role ?? 'img'}
      aria-label={label}
      className={`influence-card ${className ?? ''}`}
      style={cardStyle}
    >
      {cornerLabel && (
        <>
          <span className="influence-corner-icon" aria-hidden="true">
            {cornerIcon}
          </span>
          <span className="influence-corner-label" aria-hidden="true">
            {cornerLabel}
          </span>
        </>
      )}
      <div className={`influence-face ${faceClassName}`} style={faceStyle}>
        {children}
      </div>
    </div>
  );
}
