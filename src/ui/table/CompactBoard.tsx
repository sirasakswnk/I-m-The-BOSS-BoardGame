import { Check, Maximize2 } from 'lucide-react';
import { useEffect, useRef, type CSSProperties } from 'react';

import { DEAL_BOARD_SPACES } from '@/engine/config/dealBoard';
import { DEAL_TILE_COUNT } from '@/engine/config/rules';
import { th } from '@/i18n/th';
import { Modal } from '@/ui/common/Modal';
import { Pawn } from '@/ui/common/Pawn';

import { GroupSymbols } from './TableBits';
import { getSpacePosition, getSpaceStripe } from './tableUtils';

function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

interface CompactBoardProps {
  closedTiles: Map<number, number>;
  pawnSpace: number;
}

/**
 * Small 5x5 ring of the 16 deal spaces for phones and tablets (plan.md 9.2).
 * The whole map is one button that opens the full board sheet.
 */
export function MiniBoardMap({
  closedTiles,
  pawnSpace,
  onOpen,
}: CompactBoardProps & { onOpen: () => void }) {
  const closed = closedTiles.size;
  const label = fill(th.game.table.compact.mapAria, {
    space: pawnSpace > 0 ? pawnSpace : '—',
    closed,
    total: DEAL_TILE_COUNT,
  });

  return (
    <button
      type="button"
      className="mtable-map"
      data-testid="mini-board"
      aria-label={label}
      aria-haspopup="dialog"
      onClick={onOpen}
    >
      <span className="mtable-map-grid" aria-hidden="true">
        {DEAL_BOARD_SPACES.map((space) => {
          const { row, col } = getSpacePosition(space.index);
          const isClosed = closedTiles.has(space.index);
          const isCurrent = pawnSpace === space.index;
          return (
            <i
              key={space.index}
              className={`${isClosed ? 'is-closed' : ''} ${isCurrent ? 'is-current' : ''}`}
              style={
                { gridArea: `${row} / ${col}`, '--st': getSpaceStripe(space) } as CSSProperties
              }
              data-space={space.index}
            >
              {isCurrent ? '$' : space.index}
            </i>
          );
        })}
      </span>
      <span className="mtable-map-copy">
        <strong>{th.game.table.compact.mapTitle}</strong>
        <span>
          {pawnSpace > 0
            ? fill(th.game.table.compact.mapPawn, { space: pawnSpace })
            : th.game.table.compact.mapPawnNone}
        </span>
        <span>{fill(th.game.table.compact.mapClosed, { closed, total: DEAL_TILE_COUNT })}</span>
        <span className="mtable-map-open">
          <Maximize2 size={14} strokeWidth={2.6} aria-hidden="true" />
          {th.game.table.compact.mapOpen}
        </span>
      </span>
    </button>
  );
}

/** Full 16-space list in a bottom sheet: requirements, pawn and closed tiles. */
export function BoardSheet({
  closedTiles,
  pawnSpace,
  onClose,
}: CompactBoardProps & { onClose: () => void }) {
  const copy = th.game.table.compact;
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const current = listRef.current?.querySelector<HTMLElement>('.is-current');
    current?.scrollIntoView?.({ block: 'center' });
  }, []);

  return (
    <Modal
      title={copy.boardTitle}
      eyebrow={fill(copy.boardEyebrow, { closed: closedTiles.size, total: DEAL_TILE_COUNT })}
      onClose={onClose}
      testId="board-sheet"
      className="mtable-board-sheet"
    >
      <p className="mtable-board-hint">{copy.boardHint}</p>
      <ol ref={listRef} className="mtable-board-list">
        {DEAL_BOARD_SPACES.map((space) => {
          const tile = closedTiles.get(space.index);
          const isCurrent = pawnSpace === space.index;
          const status =
            tile !== undefined
              ? fill(copy.spaceClosed, { tile })
              : isCurrent
                ? copy.spacePawn
                : copy.spaceOpen;
          return (
            <li
              key={space.index}
              className={`mtable-board-row ${tile !== undefined ? 'is-closed' : ''} ${
                isCurrent ? 'is-current' : ''
              }`}
              data-space={space.index}
              aria-label={fill(copy.spaceRowAria, { space: space.index, status })}
            >
              <span
                className="mtable-board-index"
                style={{ '--st': getSpaceStripe(space) } as CSSProperties}
              >
                {space.index}
              </span>
              <span className="mtable-board-req">
                <span className="mtable-board-meta">
                  <b>×{space.dividends}</b>
                  {fill(copy.spaceNeeds, { count: space.requiredInvestors })}
                </span>
                <GroupSymbols groups={space.groups} size={15} />
              </span>
              <span className="mtable-board-status">
                {tile !== undefined ? (
                  <>
                    <Check size={14} strokeWidth={3} aria-hidden="true" />#{tile}
                  </>
                ) : isCurrent ? (
                  <Pawn className="mtable-board-pawn" title={copy.spacePawn} />
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </Modal>
  );
}
