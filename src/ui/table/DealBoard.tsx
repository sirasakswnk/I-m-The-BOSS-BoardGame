import { LayoutGroup, motion } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';

import { DEAL_BOARD_SPACES } from '@/engine/config/dealBoard';
import type { DealSpace } from '@/engine/config/dealBoard';
import { th } from '@/i18n/th';
import { Pawn } from '@/ui/common/Pawn';

import type { PawnWalkState } from './diceRollUtils';
import { GroupSymbols } from './TableBits';
import { getSpacePosition, getSpaceStripe } from './tableUtils';

function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function BoardCell({
  space,
  closedTile,
  isCurrent,
  walk,
}: {
  space: DealSpace;
  closedTile: number | undefined;
  isCurrent: boolean;
  walk: PawnWalkState | null;
}) {
  const step = walk?.steps[space.index];
  const skipped = walk?.skipped.includes(space.index) ?? false;
  const landed = walk?.landed === space.index;
  const { row, col } = getSpacePosition(space.index);
  const isClosed = closedTile !== undefined;
  const classes = [
    'table-cell',
    isCurrent ? 'is-current' : '',
    isClosed ? 'is-closed' : 'is-quiet',
    step !== undefined ? 'is-stepped' : '',
    skipped ? 'is-skipped' : '',
    landed ? 'is-landed' : '',
    col === 1 ? 'is-left' : '',
    col === 5 ? 'is-right' : '',
    row === 1 ? 'is-top' : '',
    row === 5 ? 'is-bottom' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const label = isClosed
    ? fill(th.game.table.closedSpaceAria, {
        space: space.index,
        tile: closedTile ?? '?',
      })
    : isCurrent
      ? fill(th.game.table.currentSpaceAria, {
          space: space.index,
          count: space.requiredInvestors,
        })
      : fill(th.game.table.openSpaceAria, {
          space: space.index,
          count: space.requiredInvestors,
        });

  return (
    <div
      className={classes}
      style={
        {
          gridArea: `${row} / ${col}`,
          '--st': getSpaceStripe(space),
          '--closed-rot': `${space.index % 2 === 0 ? 2 : -2}deg`,
        } as CSSProperties
      }
      data-space={space.index}
      tabIndex={isCurrent ? 0 : isClosed ? undefined : 0}
      aria-label={label}
    >
      {isClosed ? (
        <>
          <span className="table-cell-index">{space.index}</span>
          <span className="table-cell-tile">#{closedTile}</span>
          <span className="table-cell-check">✓</span>
          {skipped && (
            <span
              className="table-cell-skip"
              aria-label={fill(th.game.table.diceRoll.skippedAria, { space: space.index })}
            >
              {th.game.table.diceRoll.skipped}
            </span>
          )}
        </>
      ) : (
        <>
          {step !== undefined && (
            <span
              className="table-cell-step"
              aria-label={fill(th.game.table.diceRoll.stepAria, { step })}
            >
              {step}
            </span>
          )}
          <div className="table-cell-top">
            <b>{space.index}</b>
            <span>×{space.dividends}</span>
          </div>
          {isCurrent ? (
            <div className="table-req">
              <span className="table-space-needs">
                {fill(th.game.table.spaceNeeds, {
                  space: space.index,
                  count: space.requiredInvestors,
                })}
              </span>
              <GroupSymbols groups={space.groups} size={17} />
            </div>
          ) : (
            <div className="table-cell-tooltip" aria-hidden="true">
              <strong>
                {fill(th.game.table.spaceNeeds, {
                  space: space.index,
                  count: space.requiredInvestors,
                })}
              </strong>
              <GroupSymbols groups={space.groups} size={17} />
            </div>
          )}
          {isCurrent && (
            <motion.div
              layoutId="table-pawn"
              layout
              initial={false}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              className="table-pawn"
              data-testid="table-pawn"
            >
              {/* Re-keyed on every walk step so the hop animation replays. */}
              <span key={walk?.hop ?? 0} className={walk ? 'table-pawn-hop' : undefined}>
                <Pawn
                  title={fill(th.game.pawnSpace, { space: space.index })}
                  className="table-pawn-svg"
                />
              </span>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}

interface DealBoardProps {
  closedSpaces: Map<number, number>;
  pawnSpace: number;
  /** Step numbers, skipped spaces and the landing spot of a dice walk. */
  walk?: PawnWalkState | null;
  children: ReactNode;
}

/** 5x5 board with 16 deal spaces around a 3x3 center panel. */
export function DealBoard({ closedSpaces, pawnSpace, walk = null, children }: DealBoardProps) {
  return (
    <section className="table-board" aria-label={th.game.table.boardAria}>
      <LayoutGroup id="table-pawn-group">
        <div className="table-grid">
          {DEAL_BOARD_SPACES.map((space) => (
            <BoardCell
              key={space.index}
              space={space}
              closedTile={closedSpaces.get(space.index)}
              isCurrent={pawnSpace === space.index}
              walk={walk}
            />
          ))}
          <div className="table-deal-slot">{children}</div>
        </div>
      </LayoutGroup>
    </section>
  );
}
