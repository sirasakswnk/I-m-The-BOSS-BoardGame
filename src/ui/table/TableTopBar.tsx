import { Crown } from 'lucide-react';
import { Link } from 'react-router-dom';

import { DEAL_TILE_COUNT } from '@/engine/config/rules';
import type { Phase } from '@/engine/types';
import { th } from '@/i18n/th';
import { Brand } from '@/ui/common/Brand';

interface TableTopBarProps {
  code: string;
  phase: Phase | null;
  dealsClosed: number;
  bossName: string | null;
  turnNumber: number;
  showChrome: boolean;
}

export function TableTopBar({
  code,
  phase,
  dealsClosed,
  bossName,
  turnNumber,
  showChrome,
}: TableTopBarProps) {
  return (
    <header className="table-topbar">
      {showChrome && <Brand />}

      <div className={`table-topbar-chips ${showChrome ? 'is-pushed' : ''}`}>
        <span className="table-chip">
          <span className="table-chip-label">{th.common.roomCode}</span>
          <b className="table-chip-code" data-testid="game-room-code">
            {code}
          </b>
        </span>

        <span className="table-chip table-deals-chip" title={th.game.table.dealsPipsHint}>
          <span>{th.game.dealsClosed.replace('{closed}', String(dealsClosed)).replace('{total}', String(DEAL_TILE_COUNT))}</span>
          <span className="table-pips" aria-hidden="true">
            {Array.from({ length: DEAL_TILE_COUNT }, (_, index) => {
              const number = index + 1;
              return (
                <i
                  key={number}
                  className={[
                    number <= dealsClosed ? 'is-done' : '',
                    number >= 10 ? 'is-check' : '',
                    number === DEAL_TILE_COUNT ? 'is-last' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                />
              );
            })}
          </span>
        </span>

        <span className="table-chip">
          <Crown size={18} fill="var(--gold)" strokeWidth={2.4} aria-hidden="true" />
          <span className="table-chip-label">{th.game.boss}</span>
          <b>{bossName ?? '—'}</b>
        </span>

        {phase && (
          <span className="table-chip" data-testid="game-phase">
            <span>{th.game.phases[phase]}</span>
            {turnNumber > 0 && (
              <span className="table-chip-muted">
                {th.game.turn.replace('{turn}', String(turnNumber))}
              </span>
            )}
          </span>
        )}
      </div>

      {showChrome && (
        <nav className="table-topbar-nav" aria-label={th.room.headerNavAria}>
          <Link to="/#how" className="table-top-btn">
            {th.home.navHowTo}
          </Link>
          <Link to="/" className="table-top-btn">
            {th.common.backToHome}
          </Link>
        </nav>
      )}
    </header>
  );
}
