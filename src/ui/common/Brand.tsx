import { Link } from 'react-router-dom';

import { APP_NAME } from '@/config/app';

import { FAMILY_PRESENTATION } from './families';

/** Brand mark + wordmark from design/home.html. */
export function Brand() {
  return (
    <Link to="/" className="flex items-center gap-3 text-ink no-underline">
      <span
        className="grid grid-cols-3 gap-[3px] rounded-md border-2 border-ink bg-white p-1 shadow-hard-sm"
        aria-hidden="true"
      >
        {FAMILY_PRESENTATION.map((family) => (
          <span
            key={family.id}
            className="h-[11px] w-[11px] rounded-[2px]"
            style={{ backgroundColor: `var(${family.cssVar})` }}
          />
        ))}
      </span>
      <span className="font-display text-[28px] font-extrabold leading-none max-md:text-[22px]">
        {APP_NAME}
      </span>
    </Link>
  );
}
