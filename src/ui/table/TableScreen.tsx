import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { HAND_LIMIT } from '@/engine/config/rules';
import type { FamilyColor } from '@/engine/config/families';
import type { PrivateState, PublicOffer, PublicState } from '@/engine/types';
import { th } from '@/i18n/th';
import type { ActionIntent } from '@/net/actions';
import { sendAction } from '@/net/actions';
import { startServerClockSync } from '@/net/clock';
import { RoomServiceError } from '@/net/rooms';
import type { RoomPlayers } from '@/net/roomTypes';
import { useUiStore } from '@/store/uiStore';
import { Button } from '@/ui/common/Button';
import { CardBack } from '@/ui/common/influence';
import { COMPACT_TABLE_QUERY, useMediaQuery } from '@/ui/common/useMediaQuery';

import { ActionCardModal } from './ActionCardModal';
import { hasPlayableAction, getWindowPassInfo } from './actionUtils';
import { ClanPlaceModal } from './ClanPlaceModal';
import { BoardSheet, MiniBoardMap } from './CompactBoard';
import { DealBoard } from './DealBoard';
import { DealPanel } from './DealPanel';
import { DiceRollOverlay } from './DiceRollOverlay';
import { diceRollKey, findLatestDiceRoll, type PawnWalkState } from './diceRollUtils';
import { DrawCardsOverlay } from './DrawCardsOverlay';
import { didReshuffle, drawKey, findLatestDraw, getNewCards } from './drawUtils';
import { DiscardModal } from './DiscardModal';
import { EndCheckOverlay } from './EndCheckOverlay';
import { endCheckKey, getDiscardNeed, getEndCheckToShow } from './endgameUtils';
import { GameLog } from './GameLog';
import { GameOverOverlay } from './GameOverOverlay';
import { HandDock } from './HandDock';
import { HandFan } from './HandFan';
import { HostRecoveryBar } from './HostRecoveryBar';
import { InterruptBar } from './InterruptBar';
import { OfferModal, type OfferInput } from './OfferModal';
import { InvestorTile } from './TableBits';
import { MySeat, TableSeat } from './TableSeat';
import {
  getClosedTileMap,
  getDealParticipation,
  getDealTileValue,
  getPlayerName,
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
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [moneyDelta, setMoneyDelta] = useState<number | null>(null);
  const [moneyDeltaKey, setMoneyDeltaKey] = useState(0);
  const [dismissedEndCheckKey, setDismissedEndCheckKey] = useState<string | null>(null);
  const [boardSheetOpen, setBoardSheetOpen] = useState(false);
  // Rolls already in the log when the table opens count as seen, so a refresh
  // never replays them.
  const [seenRollKey, setSeenRollKey] = useState<string | null>(() => {
    const roll = findLatestDiceRoll(publicState.log);
    return roll ? diceRollKey(roll) : null;
  });
  const [walk, setWalk] = useState<{ rollKey: string; state: PawnWalkState } | null>(null);
  // Draws already in the log when the table opens count as seen, like rolls.
  const [seenDrawKey, setSeenDrawKey] = useState<string | null>(() => {
    const draw = findLatestDraw(publicState.log);
    return draw ? drawKey(draw) : null;
  });
  const [drawProgress, setDrawProgress] = useState<{
    key: string;
    landed: number;
    warning: boolean;
  } | null>(null);
  // The hand and piles as they were before the latest draw; kept in sync
  // whenever no draw animation is playing.
  const [beforeDraw, setBeforeDraw] = useState(() => ({
    handIds: privateState.hand.map((card) => card.id),
    deckCount: publicState.deckCount,
    discardCount: publicState.discardCount,
  }));
  const [newCardIds, setNewCardIds] = useState<string[]>([]);
  const compact = useMediaQuery(COMPACT_TABLE_QUERY);
  const previousMoneyRef = useRef(privateState.money);
  const previewMode = onAction !== undefined;

  useEffect(() => {
    if (previewMode) return;
    return startServerClockSync();
  }, [previewMode]);

  useEffect(() => {
    setExclusions([]);
  }, [publicState.phase, publicState.turnNumber, publicState.bossUid, publicState.deal?.space]);

  const handIdsKey = privateState.hand.map((card) => card.id).join(',');
  const pendingDraw = findLatestDraw(publicState.log);
  // Same rule as `showDraw` below (declared later, so recomputed here).
  const drawPending =
    pendingDraw !== null && pendingDraw.count > 0 && drawKey(pendingDraw) !== seenDrawKey;
  useEffect(() => {
    if (drawPending) return;
    setBeforeDraw((current) =>
      current.handIds.join(',') === handIdsKey &&
      current.deckCount === publicState.deckCount &&
      current.discardCount === publicState.discardCount
        ? current
        : {
            handIds: handIdsKey ? handIdsKey.split(',') : [],
            deckCount: publicState.deckCount,
            discardCount: publicState.discardCount,
          },
    );
  }, [drawPending, handIdsKey, publicState.deckCount, publicState.discardCount]);

  // "New" ribbons last until looked at, or until my next turn starts.
  useEffect(() => {
    if (publicState.phase === 'turnStart' && publicState.bossUid === uid) setNewCardIds([]);
  }, [publicState.phase, publicState.bossUid, publicState.turnNumber, uid]);

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
    if (publicState.phase !== 'dealOpen' || !publicState.deal) {
      setActionModalOpen(false);
    }
  }, [publicState.phase, publicState.deal]);

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

  const closedTiles = getClosedTileMap(publicState.closedSpaces);
  const latestRoll = findLatestDiceRoll(publicState.log);
  const latestRollKey = latestRoll ? diceRollKey(latestRoll) : null;
  const showDiceRoll = latestRoll !== null && latestRollKey !== seenRollKey;
  const activeWalk = showDiceRoll && walk?.rollKey === latestRollKey ? walk.state : null;

  const latestDraw = findLatestDraw(publicState.log);
  const latestDrawKey = latestDraw ? drawKey(latestDraw) : null;
  const showDraw = latestDraw !== null && latestDraw.count > 0 && latestDrawKey !== seenDrawKey;
  const drawIsMine = showDraw && latestDraw.uid === uid;
  const drawnCards = drawIsMine ? getNewCards(privateState.hand, beforeDraw.handIds) : [];
  const progress = drawProgress?.key === latestDrawKey ? drawProgress : null;
  const landedCount = progress?.landed ?? 0;
  const arrivingCount = showDraw ? Math.max(0, latestDraw.count - landedCount) : 0;
  const arrivingIds = new Set(drawnCards.slice(landedCount).map((card) => card.id));
  const handIds = new Set(privateState.hand.map((card) => card.id));
  const ribbonIds = new Set(
    [...newCardIds, ...drawnCards.slice(0, landedCount).map((card) => card.id)].filter((id) =>
      handIds.has(id),
    ),
  );
  const warnIds = new Set(progress?.warning ? drawnCards.map((card) => card.id) : []);
  const myHandCount = privateState.hand.length - (drawIsMine ? arrivingCount : 0);
  const seatHandCount = (seatUid: string) =>
    (publicState.handCounts[seatUid] ?? 0) -
    (showDraw && latestDraw.uid === seatUid ? arrivingCount : 0);
  // Until the roll animation reports its walk, keep the pawn on its start
  // space so it never flashes at the destination first.
  const pawnSpace = showDiceRoll ? (activeWalk?.pawn ?? latestRoll.from) : publicState.pawnSpace;
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
    ? new Set<FamilyColor>(deal.requirements.groups.flatMap((group) => group.colors))
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
          const currentAmount = currentUid ? (deal.offers[currentUid]?.[color]?.amount ?? 0) : 0;
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
        !(bossInvestors.includes(card.color) && !publicState.onVacation.includes(card.color)),
    ),
  );

  const canPlayCard = Boolean(
    deal &&
    publicState.phase === 'dealOpen' &&
    hasPlayableAction(publicState, uid, privateState.hand),
  );
  let playDisabledTitle: string | undefined;
  if (!deal || publicState.phase !== 'dealOpen') {
    playDisabledTitle = th.game.table.playNoDeal;
  } else if (!canPlayCard) {
    playDisabledTitle = th.game.table.playNone;
  }

  const passInfo = getWindowPassInfo(publicState);
  const windowTrigger = publicState.window?.triggeredBy === uid;
  const hasPassedWindow = passInfo?.passedUids.includes(uid) ?? false;
  const canPass = Boolean(publicState.window && !windowTrigger && !hasPassedWindow);
  let passDisabledTitle: string | undefined;
  if (!publicState.window) {
    passDisabledTitle = th.game.table.passNoWindow;
  } else if (windowTrigger) {
    passDisabledTitle = th.game.table.passTrigger;
  } else if (hasPassedWindow) {
    passDisabledTitle = th.game.table.passAlready;
  }

  const canCancelLock = Boolean(publicState.window && deal?.locked && publicState.bossUid === uid);

  function handlePlayAction(intent: ActionIntent): void {
    void act(`action:${intent.type}`, intent);
  }

  function handlePassWindow(): void {
    if (!canPass) return;
    void act('pass', { type: 'PASS_WINDOW' });
  }

  function handleCancelLock(): void {
    if (!canCancelLock) return;
    void act('cancel-lock', { type: 'CANCEL_LOCK' });
  }

  const endCheckEvent = getEndCheckToShow(publicState.log, publicState.phase);
  const activeEndCheckKey = endCheckEvent ? endCheckKey(endCheckEvent) : null;
  const showEndCheck = endCheckEvent !== null && activeEndCheckKey !== dismissedEndCheckKey;
  const discardNeed = getDiscardNeed(privateState.hand.length);
  const showDiscard =
    publicState.phase === 'turnEndDiscard' &&
    publicState.pendingDiscardUids.includes(uid) &&
    discardNeed > 0 &&
    !showEndCheck &&
    !drawIsMine;
  const showGameOver = publicState.phase === 'gameOver' && !showEndCheck;

  function handleDiscard(cardIds: string[]): void {
    void act('discard', { type: 'DISCARD', cardIds });
  }

  function handleRematch(): void {
    if (hostUid !== uid || publicState.phase !== 'gameOver') return;
    void act('rematch', { type: 'REMATCH' });
  }

  function handleSkipDisconnectedBoss(): void {
    if (hostUid !== uid) return;
    void act('skip-disconnected-boss', { type: 'SKIP_DISCONNECTED_BOSS' });
  }

  const renderSeat = (entry: SeatEntry, variant: 'top' | 'side' | 'strip') => {
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
        handCount={seatHandCount(entry.uid)}
        receiving={showDraw && latestDraw.uid === entry.uid}
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

  const dealPanel = (
    <DealPanel
      uid={uid}
      players={players}
      publicState={publicState}
      privateState={privateState}
      pendingAction={pendingAction}
      exclusions={exclusions}
      onToggleExclusion={handleToggleExclusion}
      onOpenDeal={handleOpenDeal}
      onFailDeal={handleFailDeal}
      onRollDice={handleRollDice}
      onDrawCards={handleDrawCards}
      onLockDeal={handleLockDeal}
      onPlaceClan={() => setClanModalOpen(true)}
      canPlaceClan={canPlaceClan}
      diceRolling={
        showDiceRoll &&
        (activeWalk === null || (activeWalk.hop === 0 && activeWalk.landed === null))
      }
    />
  );

  const mySeatPanel = (
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
      moneyDelta={compact ? null : moneyDelta}
      moneyDeltaKey={moneyDeltaKey}
    />
  );

  const hand = (
    <HandFan
      cards={privateState.hand}
      phase={publicState.phase}
      windowOpen={publicState.window !== null}
      neededColors={neededColors}
      layout={compact ? 'grid' : 'fan'}
      arrivingIds={arrivingIds}
      newIds={ribbonIds}
      warnIds={warnIds}
      onSeen={(cardId) => setNewCardIds((current) => current.filter((id) => id !== cardId))}
    />
  );

  const actionButtons = (
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
        data-testid="play-card-open"
        disabled={!canPlayCard || pendingAction !== null}
        title={playDisabledTitle ?? th.game.table.playHint}
        onClick={() => setActionModalOpen(true)}
      >
        {th.game.table.playCard}
      </Button>
      <Button
        variant="light"
        className="table-btn"
        data-testid="table-pass"
        disabled={!canPass || pendingAction !== null}
        title={passDisabledTitle}
        onClick={handlePassWindow}
      >
        {pendingAction === 'pass' && (
          <Loader2 size={15} className="animate-spin" aria-hidden="true" />
        )}
        {hasPassedWindow ? th.game.table.interrupt.passed : th.game.table.interrupt.pass}
      </Button>
    </div>
  );

  const others = [
    ...(layout.left ? [layout.left] : []),
    ...layout.top,
    ...(layout.right ? [layout.right] : []),
  ];

  return (
    <>
      <HostRecoveryBar
        uid={uid}
        hostUid={hostUid}
        players={players}
        bossUid={publicState.bossUid}
        phase={publicState.phase}
        pending={pendingAction !== null}
        onSkip={handleSkipDisconnectedBoss}
      />

      {publicState.window && (
        <InterruptBar
          uid={uid}
          players={players}
          publicState={publicState}
          pendingAction={pendingAction}
          canPlayCard={canPlayCard}
          playDisabledTitle={playDisabledTitle}
          canCancelLock={canCancelLock}
          onPlayCard={() => setActionModalOpen(true)}
          onPass={handlePassWindow}
          onCancelLock={handleCancelLock}
        />
      )}

      {showDiceRoll && latestRoll && (
        <DiceRollOverlay
          key={latestRollKey}
          event={latestRoll}
          playerName={getPlayerName(players, latestRoll.uid)}
          closedSpaces={publicState.closedSpaces}
          onWalk={(state) =>
            setWalk(state && latestRollKey ? { rollKey: latestRollKey, state } : null)
          }
          onDone={() => setSeenRollKey(latestRollKey)}
        />
      )}

      {showDraw && latestDraw && latestDrawKey && (
        <DrawCardsOverlay
          key={latestDrawKey}
          event={latestDraw}
          playerName={getPlayerName(players, latestDraw.uid)}
          cards={drawnCards}
          reshuffle={didReshuffle(beforeDraw, latestDraw.count)}
          overflowCount={drawIsMine ? getDiscardNeed(privateState.hand.length) : 0}
          onProgress={(landed, warning) => setDrawProgress({ key: latestDrawKey, landed, warning })}
          onDone={() => {
            setSeenDrawKey(latestDrawKey);
            setDrawProgress(null);
            if (drawIsMine) {
              setNewCardIds((current) => [
                ...new Set([...current, ...drawnCards.map((card) => card.id)]),
              ]);
            }
          }}
        />
      )}

      {compact ? (
        <div className="mtable" data-testid="compact-table">
          <section
            className="mtable-players"
            aria-label={th.game.table.compact.playersAria}
            data-testid="player-strip"
          >
            {others.length > 0 ? (
              others.map((entry) => renderSeat(entry, 'strip'))
            ) : (
              <p className="table-empty-note">{th.game.table.compact.noOthers}</p>
            )}
          </section>

          <MiniBoardMap
            closedTiles={closedTiles}
            pawnSpace={pawnSpace}
            walk={activeWalk}
            onOpen={() => setBoardSheetOpen(true)}
          />

          <div className="mtable-deal">{dealPanel}</div>

          <section className="mtable-info" aria-label={th.game.table.compact.tableInfo}>
            <UnclaimedPanel
              colors={publicState.unclaimedInvestors}
              onVacation={publicState.onVacation}
            />
            <DeckPanel deckCount={publicState.deckCount} discardCount={publicState.discardCount} />
            <GameLog events={publicState.log} players={players} />
          </section>

          <HandDock
            handCount={myHandCount}
            receiving={drawIsMine}
            money={privateState.money}
            moneyDelta={moneyDelta}
            moneyDeltaKey={moneyDeltaKey}
            seat={mySeatPanel}
            hand={hand}
            actions={actionButtons}
          />
        </div>
      ) : (
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
                <DeckPanel
                  deckCount={publicState.deckCount}
                  discardCount={publicState.discardCount}
                />
              </aside>

              <div className="table-board-wrap" style={{ gridColumn: 2, gridRow: mainRow }}>
                <DealBoard closedSpaces={closedTiles} pawnSpace={pawnSpace} walk={activeWalk}>
                  {dealPanel}
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
            {mySeatPanel}
            {hand}

            <div className="table-lip" aria-hidden="true">
              <div className="table-lip-head">
                <strong>{th.game.table.handTitle}</strong>
                <span
                  key={drawIsMine ? myHandCount : 'count'}
                  className={[
                    drawIsMine ? 'is-bump' : '',
                    myHandCount > HAND_LIMIT ? 'is-over' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {tableReplace(th.game.table.handSlots, {
                    count: myHandCount,
                  })}
                </span>
              </div>
              <div className="table-slots">
                {Array.from({ length: HAND_LIMIT }, (_, index) => (
                  <i key={index} className={index < myHandCount ? 'is-filled' : ''} />
                ))}
              </div>
              <small>{th.game.table.handHint}</small>
            </div>

            {actionButtons}
          </section>
        </>
      )}

      {compact && boardSheetOpen && (
        <BoardSheet
          closedTiles={closedTiles}
          pawnSpace={pawnSpace}
          onClose={() => setBoardSheetOpen(false)}
        />
      )}

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

      {actionModalOpen && deal && publicState.phase === 'dealOpen' && (
        <ActionCardModal
          uid={uid}
          players={players}
          publicState={publicState}
          privateState={privateState}
          pendingAction={pendingAction}
          onClose={() => setActionModalOpen(false)}
          onSubmit={handlePlayAction}
        />
      )}

      {showDiscard && (
        <DiscardModal
          privateState={privateState}
          pendingAction={pendingAction}
          onDiscard={handleDiscard}
        />
      )}

      {showEndCheck && endCheckEvent && (
        <EndCheckOverlay
          key={activeEndCheckKey ?? undefined}
          event={endCheckEvent}
          onDone={() => setDismissedEndCheckKey(activeEndCheckKey)}
        />
      )}

      {showGameOver && (
        <GameOverOverlay
          uid={uid}
          hostUid={hostUid}
          players={players}
          publicState={publicState}
          pendingAction={pendingAction}
          isHost={hostUid === uid}
          onRematch={handleRematch}
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
        <CardBack width={42} height={59} className="table-deck-back" data-testid="deck-pile" />
        <div className="table-deck-chips">
          <span>{tableReplace(th.game.table.drawCount, { count: deckCount })}</span>
          <span>{tableReplace(th.game.table.discardCountShort, { count: discardCount })}</span>
        </div>
      </div>
    </section>
  );
}
