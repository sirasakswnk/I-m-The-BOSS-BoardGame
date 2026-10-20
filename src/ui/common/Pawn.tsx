interface PawnProps {
  className?: string;
  title?: string;
}

/** The gold `$` pawn from design/home.html. */
export function Pawn({ className, title }: PawnProps) {
  return (
    <svg
      width="20"
      height="24"
      viewBox="0 0 20 24"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <circle cx="10" cy="6" r="4.5" fill="#FFE08A" stroke="#1D1B2E" strokeWidth="2" />
      <path
        d="M4 22c0-6 2.5-9 6-9s6 3 6 9z"
        fill="#FFE08A"
        stroke="#1D1B2E"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
