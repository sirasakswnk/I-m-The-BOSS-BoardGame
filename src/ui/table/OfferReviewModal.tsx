import { Check, Loader2, TriangleAlert, Undo2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { FAMILY_ORDER, type FamilyColor } from '@/engine/config/families';
import type { PublicOffer, PublicState } from '@/engine/types';
import { th } from '@/i18n/th';
import type { RoomPlayers } from '@/net/roomTypes';
import { Modal } from '@/ui/common/Modal';

import { FamilyChip, GroupSymbols } from './TableBits';
import {
  getDealParticipation,
  getDealTileValue,
  getGroupProgress,
  getMissingColors,
  getOfferConflicts,
  getPlayerName,
  isOfferAccepted,
} from './tableUtils';

interface OfferReviewModalProps {
  players: RoomPlayers;
  publicState: PublicState;
  pendingAction: string | null;
  /** Offer row to highlight when the boss opened the panel from a seat bubble. */
  focusUid?: string | null;
  onClose: () => void;
  onAcceptOffer: (uid: string) => void;
  onUnacceptOffer: (uid: string) => void;
}

interface OfferIssue {
  key: string;
  label: string;
  hint?: string;
  resolve?: {
    ownerUid: string;
    label: string;
    ariaLabel: string;
  };
}

interface OfferEntry {
  offerUid: string;
  offer: PublicOffer;
  seat: number;
}

function format(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function colorNames(colors: readonly FamilyColor[]): string {
  return colors.map((color) => th.families[color]).join(', ');
}

function sourceLabel(card: PublicOffer['cards'][number]): string {
  return card.source === 'hand' ? th.game.table.fromHand : th.game.table.offerFromTableShort;
}

/**
 * Central boss review panel for the current deal. It lists every player offer
 * in one place so the small seat bubbles can stay summary-only, and keeps
 * accept/unaccept scoped to a whole offer (plan.md deal offers).
 */
export function OfferReviewModal({
  players,
  publicState,
  pendingAction,
  focusUid = null,
  onClose,
  onAcceptOffer,
  onUnacceptOffer,
}: OfferReviewModalProps) {
  const deal = publicState.deal;
  const rowRefs = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    if (!focusUid) return;
    rowRefs.current.get(focusUid)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [focusUid]);

  if (!deal) return null;

  const activeDeal = deal;
  const participation = getDealParticipation(
    deal,
    publicState.bossUid,
    publicState.tableInvestors,
    publicState.onVacation,
  );
  const acceptedOffers = deal.acceptedOffers;
  const value = getDealTileValue(deal.tileNumber);
  const dividends = deal.requirements.dividends;
  const acceptedTotal = participation.accepted.reduce((sum, entry) => sum + entry.offer.amount, 0);
  const bossLeft = Math.max(0, dividends - acceptedTotal) * value;
  const progress = getGroupProgress(deal.requirements, participation.allColors);
  const missingColors = getMissingColors(deal.requirements, participation.allColors);

  const entries: OfferEntry[] = Object.entries(deal.offers)
    .filter(([, offer]) => offer.cards.length > 0)
    .map(([offerUid, offer]) => ({
      offerUid,
      offer,
      seat: players[offerUid]?.seat ?? Number.MAX_SAFE_INTEGER,
    }))
    .sort(
      (left, right) =>
        left.seat - right.seat ||
        getPlayerName(players, left.offerUid).localeCompare(getPlayerName(players, right.offerUid)),
    );
  const acceptedEntries = entries.filter((entry) =>
    isOfferAccepted(entry.offer, entry.offerUid, acceptedOffers),
  );
  const pendingEntries = entries.filter(
    (entry) => !isOfferAccepted(entry.offer, entry.offerUid, acceptedOffers),
  );

  function issuesFor(offer: PublicOffer, offerUid: string): OfferIssue[] {
    const targetName = getPlayerName(players, offerUid);
    return getOfferConflicts(offer, offerUid, activeDeal, participation).map((conflict) => {
      if (conflict.kind === 'notRequired') {
        return {
          key: 'required',
          label: format(th.game.table.offerReviewNotRequired, {
            colors: colorNames(conflict.colors),
          }),
        };
      }
      if (conflict.kind === 'boss') {
        return {
          key: 'boss',
          label: format(th.game.table.offerReviewColorTakenByBoss, {
            colors: colorNames(conflict.colors),
          }),
        };
      }
      if (conflict.kind === 'capacity') {
        return {
          key: 'capacity',
          label: th.game.table.offerReviewOverCapacity,
          hint: th.game.table.offerReviewCapacityHint,
        };
      }

      const ownerUid = conflict.ownerUid ?? '';
      const ownerName = getPlayerName(players, ownerUid);
      return {
        key: `taken-${ownerUid}`,
        label: format(th.game.table.offerReviewColorConflict, {
          colors: colorNames(conflict.colors),
          names: ownerName,
        }),
        resolve: {
          ownerUid,
          label: format(th.game.table.offerReviewCancelConflict, { name: ownerName }),
          ariaLabel: format(th.game.table.offerReviewCancelConflictAria, {
            name: ownerName,
            target: targetName,
          }),
        },
      };
    });
  }

  function handleResolveConflict(ownerUid: string, pendingUid: string): void {
    onUnacceptOffer(ownerUid);
    rowRefs.current.get(pendingUid)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function renderRow(entry: OfferEntry) {
    const { offer, offerUid, seat } = entry;
    const accepted = isOfferAccepted(offer, offerUid, acceptedOffers);
    const issues = accepted ? [] : issuesFor(offer, offerUid);
    const busy = pendingAction !== null;
    const action = accepted ? 'unaccept' : 'accept';
    const cards = [...offer.cards].sort(
      (left, right) => FAMILY_ORDER.indexOf(left.color) - FAMILY_ORDER.indexOf(right.color),
    );
    const colors = cards.map((card) => card.color);
    const names = colorNames(colors);
    const name = getPlayerName(players, offerUid);
    const focused = focusUid === offerUid;
    const actionPending = pendingAction === `offer:${action}:${offerUid}`;
    const actionLabel = accepted
      ? format(th.game.table.unacceptOfferAria, { colors: names, name })
      : format(th.game.table.acceptOfferAria, {
          colors: names,
          name,
          amount: offer.amount,
        });

    return (
      <article
        key={offerUid}
        ref={(node) => {
          if (node) rowRefs.current.set(offerUid, node);
          else rowRefs.current.delete(offerUid);
        }}
        className={[
          'table-review-row',
          accepted ? 'is-accepted' : 'is-pending',
          focused ? 'is-focused' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-testid={`offer-review-row-${offerUid}`}
        data-accepted={accepted ? 'true' : 'false'}
      >
        <header className="table-review-row-head">
          <span className="table-review-seat" aria-hidden="true">
            {seat + 1}
          </span>
          <strong className="table-review-name">{name}</strong>
          <span className={`table-review-state is-${accepted ? 'accepted' : 'pending'}`}>
            {accepted ? th.game.table.offerAcceptedStatus : th.game.table.offerPending}
          </span>
        </header>

        <div className="table-review-cards">
          {cards.map((card) => (
            <FamilyChip
              key={`${card.color}-${card.source}`}
              color={card.color}
              suffix={sourceLabel(card)}
            />
          ))}
        </div>

        <div className="table-review-numbers">
          <span>
            <em>{th.game.table.offerReviewAsk}</em>
            <strong>{offer.amount}</strong> {th.game.table.parts}
          </span>
          <span>
            <em>{th.game.table.offerReviewPayout}</em>
            <strong>{offer.amount * value}</strong> {th.game.million}
          </span>
        </div>

        {issues.length > 0 && (
          <div
            className="table-review-conflicts"
            data-testid={`offer-review-conflicts-${offerUid}`}
          >
            {issues.map((issue) => {
              const resolve = issue.resolve;
              const resolvePending = Boolean(
                resolve && pendingAction === `offer:unaccept:${resolve.ownerUid}`,
              );
              return (
                <div key={issue.key} className="table-review-conflict" role="note">
                  <TriangleAlert size={14} strokeWidth={2.6} aria-hidden="true" />
                  <div className="table-review-conflict-body">
                    <span>{issue.label}</span>
                    {issue.hint && <span className="table-review-conflict-hint">{issue.hint}</span>}
                    {resolve && (
                      <button
                        type="button"
                        className="table-review-conflict-action"
                        data-testid={`resolve-conflict-${offerUid}-${resolve.ownerUid}`}
                        disabled={busy}
                        title={resolve.ariaLabel}
                        aria-label={resolve.ariaLabel}
                        onClick={() => handleResolveConflict(resolve.ownerUid, offerUid)}
                      >
                        {resolvePending ? (
                          <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                        ) : (
                          <Undo2 size={13} strokeWidth={2.6} aria-hidden="true" />
                        )}
                        {resolve.label}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          className={`table-review-action ${accepted ? 'is-undo' : ''}`}
          data-testid={`${action}-offer-${offerUid}`}
          disabled={busy || issues.length > 0}
          title={issues[0]?.label ?? actionLabel}
          aria-label={actionLabel}
          onClick={() => (accepted ? onUnacceptOffer(offerUid) : onAcceptOffer(offerUid))}
        >
          {actionPending ? (
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          ) : accepted ? (
            <Undo2 size={15} strokeWidth={2.6} aria-hidden="true" />
          ) : (
            <Check size={15} strokeWidth={3} aria-hidden="true" />
          )}
          {accepted ? th.game.table.unacceptOffer : th.game.table.acceptOffer}
        </button>
      </article>
    );
  }

  return (
    <Modal
      title={th.game.table.offerReviewTitle}
      eyebrow={format(th.game.table.offerReviewEyebrow, {
        space: deal.space,
        tile: deal.tileNumber,
      })}
      onClose={onClose}
      testId="offer-review-modal"
      className="offer-review-modal"
    >
      <div
        className="table-review-statusbar"
        data-testid="offer-review-statusbar"
        aria-label={th.game.table.offerReviewTitle}
      >
        <div className="table-review-status is-missing" data-testid="offer-review-missing">
          <span className="table-review-status-label">{th.game.table.offerReviewMissing}</span>
          {missingColors.length > 0 ? (
            <div className="table-review-status-colors">
              {missingColors.map((color) => (
                <span key={color} data-testid={`offer-review-missing-color-${color}`}>
                  <FamilyChip color={color} />
                </span>
              ))}
            </div>
          ) : (
            <strong className="table-review-status-ok">
              <Check size={14} strokeWidth={3} aria-hidden="true" />
              {th.game.table.offerReviewMissingNone}
            </strong>
          )}
        </div>

        <div className="table-review-status is-shares" data-testid="offer-review-shares">
          <span className="table-review-status-label">{th.game.table.offerReviewShares}</span>
          <strong className="table-review-status-value" data-testid="offer-review-capacity">
            {acceptedTotal}/{dividends}
          </strong>
          <span
            className="table-review-meter"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={dividends}
            aria-valuenow={acceptedTotal}
            aria-label={th.game.table.offerReviewShares}
          >
            <i
              style={{
                width: `${Math.min(100, (acceptedTotal / dividends) * 100)}%`,
              }}
            />
          </span>
          <span className="table-review-status-note" data-testid="offer-review-payout">
            {th.game.table.offerReviewPayout} {acceptedTotal * value} {th.game.million}
            <em>{th.game.table.offerReviewPayoutHint}</em>
          </span>
        </div>

        <div className="table-review-status is-money" data-testid="offer-review-money">
          <span className="table-review-status-label">{th.game.table.offerReviewBossMoney}</span>
          <strong className="table-review-status-value" data-testid="offer-review-boss-left">
            {bossLeft} {th.game.million}
          </strong>
        </div>
      </div>

      <div className="table-review-groups" aria-label={th.game.table.offerReviewGroups}>
        <span className="table-review-groups-label">{th.game.table.offerReviewGroups}</span>
        <div className="table-review-group-list">
          {progress.map((entry, index) => (
            <span key={index} className={`table-review-group is-${entry.status}`}>
              <GroupSymbols groups={[entry.group]} size={14} showPick={false} />
              <strong>
                {entry.count}/{entry.group.pick}
              </strong>
            </span>
          ))}
        </div>
      </div>

      <p className="table-modal-hint">{th.game.table.offerReviewHint}</p>

      {entries.length === 0 ? (
        <p className="table-offer-empty">{th.game.table.offerReviewEmpty}</p>
      ) : (
        <>
          <section className="table-review-section">
            <h3 className="table-review-section-title">
              {format(th.game.table.offerReviewPending, { count: pendingEntries.length })}
            </h3>
            {pendingEntries.length > 0 ? (
              pendingEntries.map(renderRow)
            ) : (
              <p className="table-review-none">{th.game.table.offerReviewNoPending}</p>
            )}
          </section>

          {acceptedEntries.length > 0 && (
            <section className="table-review-section">
              <h3 className="table-review-section-title is-accepted">
                {format(th.game.table.offerReviewAccepted, {
                  count: acceptedEntries.length,
                })}
              </h3>
              {acceptedEntries.map(renderRow)}
            </section>
          )}
        </>
      )}
    </Modal>
  );
}
