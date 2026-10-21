import type { CSSProperties } from 'react';

export type CardIconName = 'bag' | 'coin' | 'stop' | 'crown';

interface CardIconProps {
  name: CardIconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * One shared SVG sprite for every influence-card glyph. The sprite is mounted
 * once in App, so cards only reference symbols instead of copying SVG paths.
 */
export function CardSymbolSprite() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
    >
      <defs>
        <symbol id="card-em-circle" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8" fill="currentColor" stroke="var(--ink)" strokeWidth="2" />
        </symbol>
        <symbol id="card-em-square" viewBox="0 0 24 24">
          <rect
            x="4.5"
            y="4.5"
            width="15"
            height="15"
            rx="2"
            fill="currentColor"
            stroke="var(--ink)"
            strokeWidth="2"
          />
        </symbol>
        <symbol id="card-em-triangle" viewBox="0 0 24 24">
          <path
            d="M12 3.5 21 19.5H3z"
            fill="currentColor"
            stroke="var(--ink)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </symbol>
        <symbol id="card-em-diamond" viewBox="0 0 24 24">
          <path
            d="M12 2.5 21.5 12 12 21.5 2.5 12z"
            fill="currentColor"
            stroke="var(--ink)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </symbol>
        <symbol id="card-em-star" viewBox="0 0 24 24">
          <path
            d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"
            fill="currentColor"
            stroke="var(--ink)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </symbol>
        <symbol id="card-em-hex" viewBox="0 0 24 24">
          <path
            d="M12 2.5 20.2 7.2v9.6L12 21.5 3.8 16.8V7.2z"
            fill="currentColor"
            stroke="var(--ink)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </symbol>

        <symbol id="card-i-bag" viewBox="0 0 24 24">
          <rect
            x="3"
            y="8"
            width="18"
            height="12"
            rx="2.5"
            fill="var(--gold)"
            stroke="var(--ink)"
            strokeWidth="2"
          />
          <path
            d="M9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18"
            fill="none"
            stroke="var(--ink)"
            strokeWidth="2"
          />
        </symbol>
        <symbol id="card-i-coin" viewBox="0 0 24 24">
          <circle cx="8.5" cy="12" r="6" fill="var(--gold)" stroke="var(--ink)" strokeWidth="2" />
          <circle cx="15.5" cy="12" r="6" fill="var(--gold)" stroke="var(--ink)" strokeWidth="2" />
          <path d="M8.5 9.5v5" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
        </symbol>
        <symbol id="card-i-stop" viewBox="0 0 24 24">
          <path
            d="M8 2h8l6 6v8l-6 6H8l-6-6V8z"
            fill="var(--stop)"
            stroke="var(--ink)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M7 12h10" stroke="var(--white)" strokeWidth="3" strokeLinecap="round" />
        </symbol>
        <symbol id="card-i-crown" viewBox="0 0 24 24">
          <path
            d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"
            fill="var(--gold)"
            stroke="var(--ink)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </symbol>

        {/* Reference: design/cards.html #deal. Kept as one image so the three
            recruitment cards can reveal consecutive viewBox slices. */}
        <g id="card-deal-art" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round">
          <path d="M-5 72h112v50H-5z" fill="var(--black)" />
          <rect x="96" y="68" width="16" height="58" rx="3" fill="var(--white)" />
          <path d="M343 72h112v50H343z" fill="var(--blue)" />
          <rect x="338" y="68" width="16" height="58" rx="3" fill="var(--white)" />
          <rect x="112" y="78" width="126" height="40" rx="18" fill="var(--gold)" />
          <rect x="212" y="78" width="126" height="40" rx="18" fill="var(--gold)" />
          <path d="M222 88v22M231 88v22M240 88v22" fill="none" />
          <ellipse cx="225" cy="76" rx="20" ry="8" fill="var(--gold)" />
          <circle cx="225" cy="30" r="24" fill="var(--gold)" />
          <circle cx="225" cy="30" r="17" fill="none" strokeWidth="2.5" />
          <text
            x="225"
            y="40"
            textAnchor="middle"
            fontFamily="Kanit"
            fontWeight="800"
            fontSize="24"
            fill="var(--ink)"
            stroke="none"
          >
            $
          </text>
          <path
            d="M150 0V130M300 0V130"
            fill="none"
            strokeWidth="2"
            strokeDasharray="5 5"
            opacity=".35"
          />
        </g>
      </defs>
    </svg>
  );
}

export function CardIcon({ name, size = 24, className, style }: CardIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <use href={`#card-i-${name}`} />
    </svg>
  );
}

interface DealArtProps {
  part: 0 | 1 | 2;
  className?: string;
}

/** One handshake/coin illustration, sliced into the recruitment triptych. */
export function DealArt({ part, className }: DealArtProps) {
  const safePart = Math.max(0, Math.min(2, part)) as 0 | 1 | 2;
  return (
    <svg
      className={className}
      viewBox={`${safePart * 150} 4 150 126`}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <use href="#card-deal-art" />
    </svg>
  );
}
