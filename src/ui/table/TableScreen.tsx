import { useEffect, useState } from 'react';

import { HAND_LIMIT } from '@/engine/config/rules';
import type { FamilyColor } from '@/engine/config/families';
import type { PrivateState, PublicState } from '@/engine/types';
import { th } from '@/i18n/th';
import type { ActionIntent } from '@/net/actions';
import { sendAction } from '@/net/actions';
import { RoomServiceError } from '@/net/rooms';
import type { RoomPlayers } from '@/net/roomTypes';
import { useUiStore } from '@/store/uiStore';
import { Button } from '@/ui/common/Button';

import { DealBoard } from './DealBoard';
import { DealPanel } from './DealPanel';
import { GameLog } from './GameLog';
import { HandFan } from './HandFan';
import { FamilyChip } from './TableBits';
import { MySeat, TableSeat } from './TableSeat';
import {
  getClosedTileMap,
  getDealParticipation,
  getDealTileValue,
  getSeatLayout,
  type SeatEntry,
} from './tableUtils';

interface TableScreenProps {
  code: string;
  uid: string;
  hostUid: string | null;
  players: RoomPlayers;
  publicState: PublicState;
  privateState: PrivateState;
  onAction?: (intent: ActionIntent) => void;
}

function tableReplace(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function TableScreen({
  code,
  uid,
  hostUid,
  players,
  publicState,
  privateState,
  onAction,
}: TableScreenProps) {
  const showToast = useUiStore((state) => state.showToast);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [exclusions, setExclusions] = useState<FamilyColor[]>([]);

  useEffect(() => {
    setPendingAction(null);
    setExclusions([]);
  }, [
    publicState.phase,
    publicState.turnNumber,
    publicState.bossUid,
    publicState.deal?.space,
    publicState.deal?.locked,
  ]);

  useEffect(() => {
    if (!pendingAction) return;
    const timer = window.setTimeout(() => setPendingAction(null), 6000);
    return () => window.clearTimeout(timer);
  }, [pendingAction]);

  async function act(key: string, intent: ActionIntent): Promise<void> {
    if (onAction) {
      onAction(intent);
      return;
    }
    if (pendingAction !== null) return;
    setPendingAction(key);
    try {
      await sendAction(code, uid, intent);
    } catch (error) {
      setPendingAction(null);
      const errorCode = error instanceof RoomServiceError ? error.code : 'UNKNOWN';
      showToast(th.errors[errorCode], 'error');
    }
  }

  function handlePickStart(space: number): void {
    if (publicState.startPickerUid !== uid) return;
    void act(`start:${space}`, { type: 'SET_START_SPACE', space });
  }

  function handleToggleExclusion(color: FamilyColor): void {
    setExclusions((current) =>
      current.includes(color) ? current.filter((item) => item !== color) : [...current, color],
    );
  }

  function handleOpenDeal(): void {
    if (publicState.bossUid !== uid) return;
    void act('open', {
      type: 'OPEN_DEAL',
      excludeColors: exclusions.length > 0 ? exclusions : undefined,
    });
  }

  function handleFailDeal(): void {
    if (publicState.bossUid !== uid) return;
    void act('fail', { type: 'FAIL_DEAL' });
  }

  function handleRollDice(): void {
    if (publicState.bossUid !== uid) return;
    void act('roll', { type: 'ROLL_DICE' });
  }

  function handleDrawCards(): void {
    if (publicState.bossUid !== uid) return;
    void act('draw', { type: 'DRAW_CARDS' });
  }

  const closedTiles = getClosedTileMap(publicState.log);
  const layout = getSeatLayout(players, uid);
  const hasTop = layout.top.length > 0;
  const mainRow = hasTop ? 2 : 1;
  const me = players[uid];
  const myName = me?.name ?? th.common.you;
  const mySeat = me?.seat ?? 0;
  const myInvestors = publicState.tableInvestors[uid] ?? [];
  const dealValue = publicState.deal
    ? getDealTileValue(publicState.deal.tileNumber)
    : undefined;
  const neededColors = new Set<FamilyColor>();
  if (publicState.deal) {
    const participation = getDealParticipation(
      publicState.deal,
      publicState.bossUid,
      publicState.tableInvestors,
      publicState.onVacation,
    );
    const required = new Set(
      publicState.deal.requirements.groups.flatMap((group) => group.colors),
    );
    for (const color of required) {
      if (
        !participation.allColors.has(color) &&
        !publicState.deal.excludedColors.includes(color) &&
        !publicState.onVacation.includes(color)
      ) {
        neededColors.add(color);
      }
    }
  }

  const renderSeat = (entry: SeatEntry, variant: 'top' | 'side') => {
    const player = entry.player;
    return (
      <TableSeat
        key={entry.uid}
        uid={entry.uid}
        name={player.name}
        seat={player.seat}
        connected={player.connected}
        isBoss={publicState.bossUid === entry.uid}
        isHost={entry.uid === hostUid}
        isMe={entry.uid === uid}
        investors={publicState.tableInvestors[entry.uid] ?? []}
        onVacation={publicState.onVacation}
        handCount={publicState.handCounts[entry.uid] ?? 0}
        offers={publicState.deal?.offers[entry.uid]}
        acceptedOffers={publicState.deal?.acceptedOffers}
        valuePerDividend={dealValue}
        variant={variant}
      />
    );
  };

  return (
    <>
      <div className="table-felt">
        <div className="table-layout">
          {hasTop && (
            <div
              className="table-top-seats"
              style={{
                gridColumn: 2,
                gridRow: 1,
                gridTemplateColumns:
                  layout.top.length === 1
                    ? 'minmax(0, 320px)'
                    : `repeat(${layout.top.length}, minmax(0, 1fr))`,
              }}
            >
              {layout.top.map((entry) => renderSeat(entry, 'top'))}
            </div>
          )}

          <aside
            className="table-side table-side-left"
            style={{ gridColumn: 1, gridRow: mainRow }}
          >
            {layout.left && renderSeat(layout.left, 'side')}
            <UnclaimedPanel
              colors={publicState.unclaimedInvestors}
              onVacation={publicState.onVacation}
            />
            <DeckPanel deckCount={publicState.deckCount} discardCount={publicState.discardCount} />
          </aside>

          <div className="table-board-wrap" style={{ gridColumn: 2, gridRow: mainRow }}>
            <DealBoard closedSpaces={closedTiles} pawnSpace={publicState.pawnSpace}>
              <DealPanel
                uid={uid}
                players={players}
                publicState={publicState}
                pendingAction={pendingAction}
                exclusions={exclusions}
                onToggleExclusion={handleToggleExclusion}
                onOpenDeal={handleOpenDeal}
                onFailDeal={handleFailDeal}
                onRollDice={handleRollDice}
                onDrawCards={handleDrawCards}
                onPickStart={handlePickStart}
              />
            </DealBoard>
          </div>

          <aside
            className="table-side table-side-right"
            style={{ gridColumn: 3, gridRow: mainRow }}
          >
            {layout.right && renderSeat(layout.right, 'side')}
            <GameLog events={publicState.log} players={players} />
          </aside>
        </div>
      </div>

      <section className="table-mine">
        <MySeat
          uid={uid}
          name={myName}
          seat={mySeat}
          connected={me?.connected ?? false}
          isBoss={publicState.bossUid === uid}
          isHost={uid === hostUid}
          investors={myInvestors}
          onVacation={publicState.onVacation}
          money={privateState.money}
        />

        <HandFan
          cards={privateState.hand}
          phase={publicState.phase}
          windowOpen={publicState.window !== null}
          neededColors={neededColors}
        />

        <div className="table-lip" aria-hidden="true">
          <div className="table-lip-head">
            <strong>{th.game.table.handTitle}</strong>
            <span>
              {tableReplace(th.game.table.handSlots, {
                count: privateState.hand.length,
              })}
            </span>
          </div>
          <div className="table-slots">
            {Array.from({ length: HAND_LIMIT }, (_, index) => (
              <i key={index} className={index < privateState.hand.length ? 'is-filled' : ''} />
            ))}
          </div>
          <small>{th.game.table.handHint}</small>
        </div>

        <div className="table-actions">
          <Button
            variant="light"
            className="table-btn"
            disabled
            title={th.game.table.offerComingSoon}
          >
            {th.game.table.offer}
          </Button>
          <Button
            variant="dark"
            className="table-btn"
            disabled
            title={th.game.table.playComingSoon}
          >
            {th.game.table.playCard}
          </Button>
        </div>
      </section>
    </>
  );
}

function UnclaimedPanel({
  colors,
  onVacation,
}: {
  colors: FamilyColor[];
  onVacation: FamilyColor[];
}) {
  return (
    <section className="table-panel table-unclaimed">
      <h3>{th.game.unclaimedInvestors}</h3>
      {colors.length > 0 ? (
        <div className="table-unclaimed-investors">
          {colors.map((color) => (
            <FamilyChip
              key={color}
              color={color}
              muted={onVacation.includes(color)}
              suffix={onVacation.includes(color) ? th.game.onVacation : undefined}
            />
          ))}
        </div>
      ) : (
        <p className="table-empty-note">{th.game.table.noUnclaimed}</p>
      )}
      <p className="table-panel-hint">{th.game.table.recruitHint}</p>
    </section>
  );
}

function DeckPanel({ deckCount, discardCount }: { deckCount: number; discardCount: number }) {
  return (
    <section className="table-panel table-deck">
      <h3>{th.game.table.deckTitle}</h3>
      <div className="table-deck-chips">
        <span>{tableReplace(th.game.table.drawCount, { count: deckCount })}</span>
        <span>{tableReplace(th.game.table.discardCountShort, { count: discardCount })}</span>
      </div>
    </section>
  );
}
