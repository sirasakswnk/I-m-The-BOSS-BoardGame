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
    <main className="relative mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center gap-8 px-4 py-12">
      <div className="grain-overlay" aria-hidden="true" />

      <header className="flex flex-col items-center gap-4 text-center">
        <h1 className="stamp text-3xl max-md:text-2xl">{APP_NAME}</h1>
        <p className="font-display text-lg font-medium text-ink-soft">{th.app.slogan}</p>
        <Chip tone="gold">
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
        className="flex flex-wrap items-center justify-center gap-4"
      >
        {FAMILY_PRESENTATION.map((family) => (
          <FamilyCard key={family.id} family={family.id} variant="clan" />
        ))}
      </section>
    </main>
  );
}
