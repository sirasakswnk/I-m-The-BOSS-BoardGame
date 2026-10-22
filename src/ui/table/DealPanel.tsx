import { Handshake, Loader2 } from 'lucide-react';
import type { CSSProperties } from 'react';

import { DEAL_BOARD_SPACES } from '@/engine/config/dealBoard';
import type { FamilyColor } from '@/engine/config/families';
import type { PrivateState, PublicState } from '@/engine/types';
import { th } from '@/i18n/th';
import type { RoomPlayers } from '@/net/roomTypes';
import { Button } from '@/ui/common/Button';
import { FAMILY_BY_ID } from '@/ui/common/families';

import { getDiscardNeed } from './endgameUtils';
import { DiceFace, FamilyChip, GroupSymbols } from './TableBits';
import { PendingQueue } from './PendingQueue';
import {
  getBossAutoJoinColors,
  getCurrentSpace,
  getDealParticipation,
  getDealSegments,
  getDealTileValue,
  getExclusionCandidates,
  getGroupProgress,
  getOverfilledGroups,
  getPlayerName,
  getRemainingExclusionNeed,
  getSpaceStripe,
  isDealComplete,
  isExclusionPlanValid,
} from './tableUtils';

interface DealPanelProps {
  uid: string;
  players: RoomPlayers;
  publicState: PublicState;
  privateState: PrivateState;
  pendingAction: string | null;
  exclusions: FamilyColor[];
  onToggleExclusion: (color: FamilyColor) => void;
  onOpenDeal: () => void;
  onFailDeal: () => void;
  onRollDice: () => void;
  onDrawCards: () => void;
  onPickStart: (space: number) => void;
  onLockDeal: () => void;
  onPlaceClan: () => void;
  canPlaceClan: boolean;
}

function text(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function LoadingLabel({ loading, label }: { loading: boolean; label: string }) {
  if (!loading) return <>{label}</>;
  return (
    <>
      <Loader2 size={17} className="animate-spin" aria-hidden="true" />
      {th.common.loading}
    </>
  );
}

function phaseLabel(publicState: PublicState): string {
  return th.game.phases[publicState.phase];
}

function StartPickerPanel({
  uid,
  players,
  publicState,
  pendingAction,
  onPickStart,
}: Pick<DealPanelProps, 'uid' | 'players' | 'publicState' | 'pendingAction' | 'onPickStart'>) {
  const canPick = publicState.startPickerUid === uid;
  const pickerName = getPlayerName(players, publicState.startPickerUid);

  return (
    <div className="table-deal-body">
      <p className="table-deal-eyebrow">{phaseLabel(publicState)}</p>
      <h2>{th.game.startSpaceTitle}</h2>
      {canPick ? (
        <>
          <p className="table-deal-copy">{th.game.startSpaceDescription}</p>
          <div className="table-start-grid" role="group" aria-label={th.game.startSpaceTitle}>
            {DEAL_BOARD_SPACES.map((space) => {
              const loading = pendingAction === `start:${space.index}`;
              return (
                <button
                  key={space.index}
                  type="button"
                  className="table-start-space"
                  style={{ '--st': getSpaceStripe(space) } as CSSProperties}
                  data-testid={`start-space-${space.index}`}
                  disabled={pendingAction !== null}
                  aria-label={text(th.game.startSpaceButton, { space: space.index })}
                  onClick={() => onPickStart(space.index)}
                >
                  <span className="table-start-space-index">{space.index}</span>
                  <span className="table-start-space-dividends">×{space.dividends}</span>
                  {loading && <Loader2 size={14} className="animate-spin" />}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <p className="table-deal-waiting">
          {text(th.game.startSpaceWaiting, { name: pickerName })}
        </p>
      )}
    </div>
  );
}

function ExclusionPicker({
  requirements,
  autoJoin,
  selected,
  onToggle,
}: {
  requirements: NonNullable<ReturnType<typeof getCurrentSpace>>;
  autoJoin: FamilyColor[];
  selected: FamilyColor[];
  onToggle: (color: FamilyColor) => void;
}) {
  const groups = getOverfilledGroups(requirements, autoJoin);
  if (groups.length === 0) return null;
  const candidates = getExclusionCandidates(groups);
  const initialNeed = groups.reduce((sum, group) => sum + group.overflow, 0);
  const remaining = getRemainingExclusionNeed(requirements, autoJoin, selected);

  return (
    <div className="table-exclusions">
      <strong>{th.game.table.excludeTitle}</strong>
      <p>{text(th.game.table.excludeHint, { count: initialNeed })}</p>
      <div className="table-exclusion-chips">
        {candidates.map((color) => (
          <FamilyChip
            key={color}
            color={color}
            selected={selected.includes(color)}
            onClick={() => onToggle(color)}
            title={th.families[color]}
          />
        ))}
      </div>
      {remaining > 0 && (
        <p className="table-exclude-need">
          {text(th.game.table.excludeNeed, { count: remaining })}
        </p>
      )}
    </div>
  );
}

function SpaceSummary({
  space,
  publicState,
}: {
  space: NonNullable<ReturnType<typeof getCurrentSpace>>;
  publicState: PublicState;
}) {
  return (
    <div className="table-space-summary">
      <div className="table-space-summary-head">
        <strong>
          {text(th.game.table.spaceNeeds, {
            space: space.index,
            count: space.requiredInvestors,
          })}
        </strong>
        <span>×{space.dividends}</span>
        <span className="table-space-pawn">
          {text(th.game.pawnSpace, { space: publicState.pawnSpace })}
        </span>
      </div>
      <GroupSymbols groups={space.groups} size={17} />
    </div>
  );
}

function TurnPanel({
  uid,
  players,
  publicState,
  pendingAction,
  exclusions,
  onToggleExclusion,
  onOpenDeal,
  onRollDice,
  onDrawCards,
}: Pick<
  DealPanelProps,
  | 'uid'
  | 'players'
  | 'publicState'
  | 'pendingAction'
  | 'exclusions'
  | 'onToggleExclusion'
  | 'onOpenDeal'
  | 'onRollDice'
  | 'onDrawCards'
>) {
  const space = getCurrentSpace(publicState);
  const isBoss = publicState.bossUid === uid;
  const bossName = getPlayerName(players, publicState.bossUid);
  const autoJoin =
    space && publicState.bossUid
      ? getBossAutoJoinColors(
          publicState.tableInvestors[publicState.bossUid] ?? [],
          space,
          publicState.onVacation,
        )
      : [];
  const canOpen = space ? isExclusionPlanValid(space, autoJoin, exclusions) : false;
  const dice = publicState.lastDice?.[0] ?? null;
  const isAfterMove = publicState.phase === 'afterMove';
  const title =
    publicState.phase === 'afterMove' ? th.game.table.afterMoveTitle : th.game.table.turnTitle;

  if (!space) {
    return (
      <div className="table-deal-body">
        <p className="table-deal-eyebrow">{phaseLabel(publicState)}</p>
        <p className="table-deal-waiting">
          {th.game.table.waitingTurn.replace('{name}', bossName)}
        </p>
      </div>
    );
  }

  return (
    <div className="table-deal-body">
      <p className="table-deal-eyebrow">
        {th.game.turn.replace('{turn}', String(publicState.turnNumber))}
      </p>
      <div className="table-deal-title-row">
        <h2>{title}</h2>
        {isBoss && <span className="table-your-turn">{th.game.table.yourTurn}</span>}
      </div>
      <SpaceSummary space={space} publicState={publicState} />

      {!isBoss ? (
        <p className="table-deal-waiting">
          {th.game.table.waitingTurn.replace('{name}', bossName)}
        </p>
      ) : (
        <>
          <div className="table-dice-row">
            <DiceFace value={isAfterMove ? dice : null} />
            <div className="table-dice-copy">
              <strong>
                {isAfterMove && dice !== null
                  ? th.game.table.diceResult.replace('{face}', String(dice))
                  : th.game.table.diceNotRolled}
              </strong>
              <span>{th.game.table.openDealHint}</span>
            </div>
          </div>

          {getOverfilledGroups(space, autoJoin).length > 0 && (
            <ExclusionPicker
              requirements={space}
              autoJoin={autoJoin}
              selected={exclusions}
              onToggle={onToggleExclusion}
            />
          )}

          <div className="table-turn-actions">
            {!isAfterMove ? (
              <Button
                variant="light"
                className="table-btn"
                data-testid="roll-dice"
                disabled={pendingAction !== null}
                onClick={onRollDice}
              >
                <LoadingLabel loading={pendingAction === 'roll'} label={th.game.table.rollDice} />
              </Button>
            ) : (
              <Button
                variant="light"
                className="table-btn"
                data-testid="draw-cards"
                disabled={pendingAction !== null}
                onClick={onDrawCards}
              >
                <LoadingLabel
                  loading={pendingAction === 'draw'}
                  label={text(th.game.table.drawCards, { count: 3 })}
                />
              </Button>
            )}
            <Button
              variant="dark"
              className="table-btn"
              data-testid="open-deal"
              disabled={pendingAction !== null || !canOpen}
              title={!canOpen ? th.game.table.openDealBlocked : undefined}
              onClick={onOpenDeal}
            >
              <LoadingLabel
                loading={pendingAction === 'open'}
                label={text(th.game.table.openDeal, { space: space.index })}
              />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function DealSegments({
  players,
  segments,
  dividends,
}: {
  players: RoomPlayers;
  segments: ReturnType<typeof getDealSegments>;
  dividends: number;
}) {
  const columns = Math.min(4, Math.max(1, dividends));
  return (
    <div
      className="table-deal-segments"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {segments.map((segment, index) => {
        const isBoss = segment.kind === 'boss';
        const backgroundColor = isBoss
          ? 'var(--gold)'
          : segment.color
            ? `var(${FAMILY_BY_ID[segment.color].cssVar})`
            : 'var(--gold)';
        const color =
          isBoss || segment.color === 'yellow' || !segment.color ? 'var(--ink)' : 'var(--white)';
        return (
          <span
            key={index}
            className={`table-deal-seg is-${segment.kind}`}
            style={{ backgroundColor, color }}
          >
            {segment.kind === 'boss'
              ? th.game.table.bossShare
              : getPlayerName(players, segment.uid)}
          </span>
        );
      })}
    </div>
  );
}

function OpenDealPanel({
  uid,
  players,
  publicState,
  pendingAction,
  onFailDeal,
  onLockDeal,
  onPlaceClan,
  canPlaceClan,
}: Pick<
  DealPanelProps,
  | 'uid'
  | 'players'
  | 'publicState'
  | 'pendingAction'
  | 'onFailDeal'
  | 'onLockDeal'
  | 'onPlaceClan'
  | 'canPlaceClan'
>) {
  const deal = publicState.deal;
  if (!deal) {
    return (
      <div className="table-deal-body">
        <p className="table-deal-waiting">{th.game.table.waitingOffers}</p>
      </div>
    );
  }

  const isBoss = publicState.bossUid === uid;
  const bossName = getPlayerName(players, publicState.bossUid);
  const participation = getDealParticipation(
    deal,
    publicState.bossUid,
    publicState.tableInvestors,
    publicState.onVacation,
  );
  const progress = getGroupProgress(deal.requirements, participation.allColors);
  const value = getDealTileValue(deal.tileNumber);
  const total = value * deal.requirements.dividends;
  const segments = getDealSegments(deal, participation);
  const acceptedTotal = participation.accepted.reduce((sum, entry) => sum + entry.offer.amount, 0);
  const dealComplete = isDealComplete(deal, participation.allColors);
  const offerCount = Object.values(deal.offers).reduce(
    (sum, offers) => sum + Object.keys(offers ?? {}).length,
    0,
  );

  return (
    <div className="table-deal-body">
      <div className="table-deal-head">
        <h2>{text(th.game.table.dealTitle, { space: deal.space })}</h2>
        <div className="table-deal-badges">
          <span>{text(th.game.table.tile, { tile: deal.tileNumber })}</span>
          <span>{text(th.game.table.perDividend, { value })}</span>
        </div>
        {deal.locked && <span className="table-deal-stamp">{th.game.table.lockStamp}</span>}
      </div>

      <div className="table-deal-money">
        <strong>{text(th.game.table.total, { total })}</strong>
        <span>
          {text(th.game.table.totalHint, {
            dividends: deal.requirements.dividends,
            value,
          })}
        </span>
      </div>

      <DealSegments players={players} segments={segments} dividends={deal.requirements.dividends} />

      <p className="table-deal-capacity" data-testid="deal-capacity">
        {text(th.game.table.acceptedDividends, {
          accepted: acceptedTotal,
          total: deal.requirements.dividends,
        })}
      </p>

      <PendingQueue players={players} pendingCards={publicState.pendingCards} />

      {isBoss && offerCount > 0 && !deal.locked && (
        <p className="table-deal-hint">{th.game.table.offerActionHint}</p>
      )}

      <div className="table-deal-req-list">
        {progress.map((entry, index) => (
          <div key={index} className={`table-deal-req-row is-${entry.status}`}>
            <GroupSymbols groups={[entry.group]} size={17} />
            <span className="table-deal-choose">
              {text(th.game.table.groupPick, { count: entry.group.pick })}
            </span>
            <span className={`table-deal-status is-${entry.status}`}>
              {entry.status === 'complete' && th.game.table.groupComplete}
              {entry.status === 'missing' &&
                text(th.game.table.groupNeed, { count: entry.missing })}
              {entry.status === 'over' && text(th.game.table.groupOver, { count: entry.over })}
            </span>
          </div>
        ))}
      </div>

      <div className="table-deal-participants">
        {participation.bossInvestorFree.map((color) => (
          <FamilyChip key={`boss-${color}`} color={color} suffix={th.game.table.bossShare} />
        ))}
        {participation.bossClanFree.map((color) => (
          <FamilyChip key={`clan-${color}`} color={color} suffix={th.card.clanTag} />
        ))}
        {participation.accepted.map((entry) => (
          <FamilyChip
            key={`offer-${entry.uid}-${entry.color}`}
            color={entry.color}
            suffix={`${getPlayerName(players, entry.uid)} · ${entry.offer.amount} ${th.game.table.parts}`}
          />
        ))}
        {participation.bossFree.length === 0 && participation.accepted.length === 0 && (
          <span className="table-empty-note">{th.game.table.noParticipants}</span>
        )}
      </div>

      {deal.excludedColors.length > 0 && (
        <div className="table-deal-excluded">
          <span>{th.game.table.excluded.replace('{colors}', '').trim()}</span>
          {deal.excludedColors.map((color) => (
            <FamilyChip key={`excluded-${color}`} color={color} muted />
          ))}
        </div>
      )}

      {offerCount === 0 && !deal.locked && !publicState.window && (
        <div className="table-deal-pending">
          <Handshake size={20} strokeWidth={2} aria-hidden="true" />
          <span>{th.game.table.waitingOffers}</span>
          <span className="table-deal-pending-chip">{th.game.table.waitingChip}</span>
        </div>
      )}

      {publicState.window ? (
        <p className="table-deal-waiting">{th.game.table.windowOpen}</p>
      ) : deal.locked ? (
        <p className="table-deal-waiting">{th.game.table.lockedWaiting}</p>
      ) : isBoss ? (
        <>
          <div className="table-deal-actions is-three">
            <Button
              variant="light"
              className="table-btn"
              data-testid="place-clan-open"
              disabled={pendingAction !== null || !canPlaceClan}
              title={!canPlaceClan ? th.game.table.placeClanEmpty : th.game.table.placeClanHint}
              onClick={onPlaceClan}
            >
              {th.game.table.placeClan}
            </Button>
            <Button
              variant="light"
              className="table-btn"
              data-testid="fail-deal"
              disabled={pendingAction !== null}
              title={th.game.table.failDealHint}
              onClick={onFailDeal}
            >
              <LoadingLabel loading={pendingAction === 'fail'} label={th.game.table.failDeal} />
            </Button>
            <Button
              variant="dark"
              className="table-btn"
              data-testid="lock-deal"
              disabled={pendingAction !== null || !dealComplete}
              title={!dealComplete ? th.game.table.lockIncomplete : undefined}
              onClick={onLockDeal}
            >
              <LoadingLabel loading={pendingAction === 'lock'} label={th.game.table.lock} />
            </Button>
          </div>
        </>
      ) : (
        <p className="table-deal-waiting">
          {th.game.table.waitingOffersBoss.replace('{name}', bossName)}
        </p>
      )}
    </div>
  );
}

function DiscardPanel({
  uid,
  publicState,
  players,
  privateState,
}: Pick<DealPanelProps, 'uid' | 'publicState' | 'players' | 'privateState'>) {
  const isPending = publicState.pendingDiscardUids.includes(uid);
  const need = getDiscardNeed(privateState.hand.length);
  const otherNames = publicState.pendingDiscardUids
    .filter((discardUid) => discardUid !== uid)
    .map((discardUid) => getPlayerName(players, discardUid))
    .join(', ');

  return (
    <div className="table-deal-body table-discard-panel" data-testid="discard-panel">
      <p className="table-deal-eyebrow">{phaseLabel(publicState)}</p>
      <h2>{th.game.table.discardTitle}</h2>
      <p className="table-deal-copy">{th.game.table.discardDescription}</p>
      {isPending && need > 0 ? (
        <p className="table-discard-your-turn" data-testid="discard-your-turn">
          {text(th.game.table.discardYourTurn, { count: need })}
        </p>
      ) : publicState.pendingDiscardUids.length > 0 ? (
        <p className="table-deal-waiting">
          {isPending
            ? th.game.table.discardYourTurnDone
            : text(th.game.table.discardWaiting, { names: otherNames })}
        </p>
      ) : null}
      <ul className="table-discard-list">
        {publicState.pendingDiscardUids.map((discardUid) => (
          <li key={discardUid} className={discardUid === uid ? 'is-me' : ''}>
            <span>{getPlayerName(players, discardUid)}</span>
            <strong>{publicState.handCounts[discardUid] ?? 0}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GameOverPanel({ publicState, players }: Pick<DealPanelProps, 'publicState' | 'players'>) {
  const scores = Object.entries(publicState.finalScores ?? {});
  const best = scores.reduce((max, [, score]) => Math.max(max, score), Number.NEGATIVE_INFINITY);

  return (
    <div className="table-deal-body">
      <p className="table-deal-eyebrow">{phaseLabel(publicState)}</p>
      <h2>{th.game.table.gameOverTitle}</h2>
      <p className="table-deal-copy">{th.game.table.finalScores}</p>
      {scores.length === 0 ? (
        <p className="table-deal-waiting">{th.game.table.noFinalScores}</p>
      ) : (
        <ul className="table-final-scores">
          {scores
            .sort(([, a], [, b]) => b - a)
            .map(([scoreUid, score]) => (
              <li key={scoreUid} className={score === best ? 'is-winner' : ''}>
                <span>{getPlayerName(players, scoreUid)}</span>
                <strong>
                  {score} {th.game.million}
                </strong>
                {score === best && <em>{th.game.table.winner}</em>}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

export function DealPanel({
  uid,
  players,
  publicState,
  privateState,
  pendingAction,
  exclusions,
  onToggleExclusion,
  onOpenDeal,
  onFailDeal,
  onRollDice,
  onDrawCards,
  onPickStart,
  onLockDeal,
  onPlaceClan,
  canPlaceClan,
}: DealPanelProps) {
  return (
    <section
      className="table-deal"
      data-testid="deal-panel"
      aria-label={th.game.table.dealPanelAria}
    >
      {publicState.phase === 'setupPickStart' && (
        <StartPickerPanel
          uid={uid}
          players={players}
          publicState={publicState}
          pendingAction={pendingAction}
          onPickStart={onPickStart}
        />
      )}
      {(publicState.phase === 'turnStart' || publicState.phase === 'afterMove') && (
        <TurnPanel
          uid={uid}
          players={players}
          publicState={publicState}
          pendingAction={pendingAction}
          exclusions={exclusions}
          onToggleExclusion={onToggleExclusion}
          onOpenDeal={onOpenDeal}
          onRollDice={onRollDice}
          onDrawCards={onDrawCards}
        />
      )}
      {publicState.phase === 'dealOpen' && (
        <OpenDealPanel
          uid={uid}
          players={players}
          publicState={publicState}
          pendingAction={pendingAction}
          onFailDeal={onFailDeal}
          onLockDeal={onLockDeal}
          onPlaceClan={onPlaceClan}
          canPlaceClan={canPlaceClan}
        />
      )}
      {publicState.phase === 'turnEndDiscard' && (
        <DiscardPanel
          uid={uid}
          publicState={publicState}
          players={players}
          privateState={privateState}
        />
      )}
      {publicState.phase === 'gameOver' && (
        <GameOverPanel publicState={publicState} players={players} />
      )}
      {publicState.phase === 'lobby' && (
        <div className="table-deal-body">
          <p className="table-deal-waiting">{th.game.waitingTitle}</p>
        </div>
      )}
    </section>
  );
}
