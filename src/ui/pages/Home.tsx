import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { APP_NAME } from '@/config/app';
import { th } from '@/i18n/th';
import { Button } from '@/ui/common/Button';
import { Chip } from '@/ui/common/Chip';
import { FamilyCard } from '@/ui/common/FamilyCard';
import { FAMILY_PRESENTATION } from '@/ui/common/families';
import { Panel } from '@/ui/common/Panel';

export function Home() {
  const navigate = useNavigate();

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center gap-8 px-4 py-10">
      <div className="grain-overlay" aria-hidden="true" />

      <div className="flex items-center gap-3 self-start">
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
        <span className="font-display text-2xl font-extrabold leading-none max-md:text-[22px]">
          {APP_NAME}
        </span>
      </div>

      <header className="flex flex-col items-center gap-5 text-center">
        <div className="flex flex-col items-center gap-3">
          <h1 className="font-display text-[clamp(36px,8vw,68px)] font-extrabold leading-[1.12] tracking-[-0.01em]">
            {th.home.heroBefore}
            <span className="stamp">{th.home.heroStamp}</span> {th.home.heroAfter}
          </h1>
          <p className="max-w-[620px] text-[19px] text-ink-soft max-md:text-[17px]">
            {th.home.heroLead}
          </p>
        </div>
        <Chip tone="paper">
          <Lock size={15} strokeWidth={2.5} aria-hidden="true" />
          {th.home.privacyChip}
        </Chip>
      </header>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="dark" disabled title={th.common.comingSoon}>
          {th.common.createRoom}
        </Button>
        <Button variant="light" onClick={() => navigate('/48213')}>
          {th.home.demoRoomCta}
        </Button>
      </div>

      <Panel title={th.common.development} className="w-full">
        <ul className="list-inside list-disc space-y-1 font-body text-ink-soft">
          <li>{th.home.scaffoldPanelNote}</li>
          <li>{th.home.nextMilestone}</li>
        </ul>
      </Panel>

      <section
        aria-label={th.home.familiesPreviewAria}
        className="flex flex-wrap items-end justify-center gap-4"
      >
        {FAMILY_PRESENTATION.map((family) => (
          <FamilyCard key={family.id} family={family.id} variant="clan" />
        ))}
      </section>
    </main>
  );
}
