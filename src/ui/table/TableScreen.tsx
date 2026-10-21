import { useEffect, useRef, useState } from 'react';

import { HAND_LIMIT } from '@/engine/config/rules';
import type { FamilyColor } from '@/engine/config/families';
import type { PrivateState, PublicOffer, PublicState } from '@/engine/types';
import { th } from '@/i18n/th';
import type { ActionIntent } from '@/net/actions';
import { sendAction } from '@/net/actions';
import { RoomServiceError } from '@/net/rooms';
import type { RoomPlayers } from '@/net/roomTypes';
import { useUiStore } from '@/store/uiStore';
import { Button } from '@/ui/common/Button';
import { CardBack } from '@/ui/common/influence';

import { ClanPlaceModal } from './ClanPlaceModal';
import { DealBoard } from './DealBoard';
import { DealPanel } from './DealPanel';
import { GameLog } from './GameLog';
import { HandFan } from './HandFan';
import { OfferModal, type OfferInput } from './OfferModal';
import { InvestorTile } from './TableBits';
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
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [clanModalOpen, setClanModalOpen] = useState(false);
  const [moneyDelta, setMoneyDelta] = useState<number | null>(null);
  const [moneyDeltaKey, setMoneyDeltaKey] = useState(0);
  const previousMoneyRef = useRef(privateState.money);

  useEffect(() => {
    setExclusions([]);
  }, [
    publicState.phase,
    publicState.turnNumber,
    publicState.bossUid,
    publicState.deal?.space,
  ]);

  useEffect(() => {
    setPendingAction(null);
  }, [
    publicState.phase,
    publicState.turnNumber,
    publicState.bossUid,
    publicState.deal?.space,
    publicState.deal?.locked,
    publicState.deal?.offers,
    publicState.deal?.acceptedOffers,
    publicState.deal?.bossClans,
    publicState.window,
    privateState.hand.length,
    privateState.money,
  ]);

  useEffect(() => {
    if (!pendingAction) return;
    const timer = window.setTimeout(() => setPendingAction(null), 6000);
    return () => window.clearTimeout(timer);
  }, [pendingAction]);

  useEffect(() => {
    if (
      publicState.phase !== 'dealOpen' ||
      !publicState.deal ||
      publicState.deal.locked ||
      publicState.window
    ) {
      setOfferModalOpen(false);
      setClanModalOpen(false);
    }
  }, [publicState.phase, publicState.deal, publicState.window]);

  useEffect(() => {
    const previous = previousMoneyRef.current;
    previousMoneyRef.current = privateState.money;
    if (previous === privateState.money) return;

    setMoneyDelta(privateState.money - previous);
    setMoneyDeltaKey((current) => current + 1);
    const timer = window.setTimeout(() => setMoneyDelta(null), 2800);
    return () => window.clearTimeout(timer);
  }, [privateState.money]);

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

  function handleSubmitOffer(offer: OfferInput): void {
    void act(`offer:${offer.color}`, {
      type: 'SUBMIT_OFFER',
      color: offer.color,
      source: offer.source,
      cardId: offer.cardId,
      amount: offer.amount,
    });
  }

  function handleWithdrawOffer(color: FamilyColor): void {
    void act(`offer:withdraw:${color}`, {
      type: 'WITHDRAW_OFFER',
      color,
    });
  }

  function handleAcceptOffer(targetUid: string, color: FamilyColor): void {
    void act(`offer:accept:${color}`, {
      type: 'ACCEPT_OFFER',
      color,
      targetUid,
    });
  }

  function handleUnacceptOffer(color: FamilyColor): void {
    void act(`offer:unaccept:${color}`, {
      type: 'UNACCEPT_OFFER',
      color,
    });
  }

  function handlePlaceClan(cardId: string): void {
    void act(`clan:${cardId}`, {
      type: 'BOSS_ADD_CLAN',
      cardId,
    });
  }

  function handleLockDeal(): void {
    if (publicState.bossUid !== uid) return;
    void act('lock', { type: 'LOCK_DEAL' });
  }

  const closedTiles = getClosedTileMap(publicState.log);
  const layout = getSeatLayout(players, uid);
  const hasTop = layout.top.length > 0;
  const mainRow = hasTop ? 2 : 1;
  const me = players[uid];
  const myName = me?.name ?? th.common.you;
  const mySeat = me?.seat ?? 0;
  const myInvestors = publicState.tableInvestors[uid] ?? [];
  const deal = publicState.deal;
  const dealValue = deal ? getDealTileValue(deal.tileNumber) : undefined;
  const dealParticipation = deal
    ? getDealParticipation(
        deal,
        publicState.bossUid,
        publicState.tableInvestors,
        publicState.onVacation,
      )
    : null;
  const requiredColors = deal
    ? new Set<FamilyColor>(
        deal.requirements.groups.flatMap((group) => group.colors),
      )
    : new Set<FamilyColor>();
  const neededColors = new Set<FamilyColor>();
  if (deal && dealParticipation) {
    for (const color of requiredColors) {
      if (
        !dealParticipation.allColors.has(color) &&
        !deal.excludedColors.includes(color) &&
        !publicState.onVacation.includes(color)
      ) {
        neededColors.add(color);
      }
    }
  }

  const canManageOffers = Boolean(
    deal &&
      publicState.bossUid === uid &&
      publicState.phase === 'dealOpen' &&
      !deal.locked &&
      !publicState.window,
  );
  const acceptedTotal =
    dealParticipation?.accepted.reduce((sum, entry) => sum + entry.offer.amount, 0) ?? 0;
  const offerActionState =
    canManageOffers && deal && dealParticipation
      ? (color: FamilyColor, offer: PublicOffer): { disabled: boolean; title: string } => {
          if (!requiredColors.has(color)) {
            return { disabled: true, title: th.game.table.offerNotRequired };
          }
          if (dealParticipation.bossFree.includes(color)) {
            return { disabled: true, title: th.game.table.offerColorTaken };
          }
          const currentUid = deal.acceptedOffers[color];
          const currentAmount = currentUid
            ? (deal.offers[currentUid]?.[color]?.amount ?? 0)
            : 0;
          const capacity = deal.requirements.dividends - (acceptedTotal - currentAmount);
          if (offer.amount > capacity) {
            return { disabled: true, title: th.game.table.offerTooLarge };
          }
          return { disabled: false, title: th.game.table.acceptOffer };
        }
      : undefined;
  const canOffer =
    publicState.phase === 'dealOpen' &&
    Boolean(deal) &&
    !deal?.locked &&
    !publicState.window &&
    publicState.bossUid !== uid;
  let offerDisabledTitle: string | undefined;
  if (publicState.bossUid === uid) {
    offerDisabledTitle = th.game.table.bossCannotOffer;
  } else if (!deal || publicState.phase !== 'dealOpen') {
    offerDisabledTitle = th.game.table.offerNoDeal;
  } else if (deal.locked || publicState.window) {
    offerDisabledTitle = th.game.table.offerLocked;
  }
  const acceptedOfferColors = new Set<FamilyColor>(
    (Object.keys(deal?.acceptedOffers ?? {}) as FamilyColor[]).filter((color) =>
      Boolean(deal?.acceptedOffers[color]),
    ),
  );
  const bossInvestors = publicState.bossUid
    ? (publicState.tableInvestors[publicState.bossUid] ?? [])
    : [];
  const canPlaceClan = Boolean(
    deal &&
      privateState.hand.some(
        (card) =>
          card.kind === 'clan' &&
          requiredColors.has(card.color) &&
          !deal.bossClans.includes(card.color) &&
          !acceptedOfferColors.has(card.color) &&
          !(
            bossInvestors.includes(card.color) &&
            !publicState.onVacation.includes(card.color)
          ),
      ),
  );

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
        canManageOffers={canManageOffers}
        offersPending={pendingAction !== null}
        offerActionState={offerActionState}
        onAcceptOffer={handleAcceptOffer}
        onUnacceptOffer={handleUnacceptOffer}
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
                onLockDeal={handleLockDeal}
                onPlaceClan={() => setClanModalOpen(true)}
                canPlaceClan={canPlaceClan}
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
          moneyDelta={moneyDelta}
          moneyDeltaKey={moneyDeltaKey}
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
            data-testid="offer-open"
            disabled={!canOffer || pendingAction !== null}
            title={offerDisabledTitle}
            onClick={() => setOfferModalOpen(true)}
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

      {offerModalOpen &&
        deal &&
        !deal.locked &&
        !publicState.window &&
        publicState.bossUid !== uid && (
          <OfferModal
            uid={uid}
            publicState={publicState}
            privateState={privateState}
            pendingAction={pendingAction}
            onClose={() => setOfferModalOpen(false)}
            onSubmit={handleSubmitOffer}
            onWithdraw={handleWithdrawOffer}
          />
        )}

      {clanModalOpen &&
        deal &&
        publicState.bossUid === uid &&
        !deal.locked &&
        !publicState.window && (
          <ClanPlaceModal
            uid={uid}
            publicState={publicState}
            privateState={privateState}
            pendingAction={pendingAction}
            onClose={() => setClanModalOpen(false)}
            onPlace={handlePlaceClan}
          />
        )}
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
            <InvestorTile key={color} color={color} vacation={onVacation.includes(color)} />
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
      <div className="table-deck-body">
        <CardBack width={42} height={59} className="table-deck-back" />
        <div className="table-deck-chips">
          <span>{tableReplace(th.game.table.drawCount, { count: deckCount })}</span>
          <span>{tableReplace(th.game.table.discardCountShort, { count: discardCount })}</span>
        </div>
      </div>
    </section>
  );
}
