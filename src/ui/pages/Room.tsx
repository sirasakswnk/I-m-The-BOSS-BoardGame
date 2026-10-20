import { Link, useParams } from 'react-router-dom';

import { th } from '@/i18n/th';
import { Panel } from '@/ui/common/Panel';

export function Room() {
  const { code = '' } = useParams();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-extrabold">
          {th.room.placeholderTitle.replace('{code}', code)}
        </h1>
        <Link to="/" className="font-display font-bold text-accent underline underline-offset-4">
          {th.common.backToHome}
        </Link>
      </header>

      <Panel title={th.common.development}>
        <p className="font-body text-ink-soft">{th.room.placeholderNote}</p>
      </Panel>
    </main>
  );
}
