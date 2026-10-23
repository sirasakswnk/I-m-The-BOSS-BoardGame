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
  return card.source === 'hand'
    ? th.game.table.fromHand
    : th.game.table.offerFromTableShort;
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

  const participation = getDealParticipation(
    deal,
    publicState.bossUid,
    publicState.tableInvestors,
    publicState.onVacation,
  );
  const acceptedOffers = deal.acceptedOffers;
  const value = getDealTileValue(deal.tileNumber);
  const dividends = deal.requirements.dividends;
  const acceptedTotal = participation.accepted.reduce(
    (sum, entry) => sum + entry.offer.amount,
    0,
  );
  const bossLeft = Math.max(0, dividends - acceptedTotal) * value;
  const progress = getGroupProgress(deal.requirements, participation.allColors);
  const requiredColors = new Set<FamilyColor>(
    deal.requirements.groups.flatMap((group) => group.colors),
  );

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
        getPlayerName(players, left.offerUid).localeCompare(
          getPlayerName(players, right.offerUid),
        ),
    );
  const acceptedEntries = entries.filter((entry) =>
    isOfferAccepted(entry.offer, entry.offerUid, acceptedOffers),
  );
  const pendingEntries = entries.filter(
    (entry) => !isOfferAccepted(entry.offer, entry.offerUid, acceptedOffers),
  );

  function issuesFor(offer: PublicOffer, offerUid: string): OfferIssue[] {
    const colors = [...new Set(offer.cards.map((card) => card.color))];
    const issues: OfferIssue[] = [];

    const notRequired = colors.filter((color) => !requiredColors.has(color));
    if (notRequired.length > 0) {
      issues.push({
        key: 'required',
        label: format(th.game.table.offerReviewNotRequired, {
          colors: colorNames(notRequired),
        }),
      });
    }

    const bossTaken = colors.filter((color) => participation.bossFree.includes(color));
    if (bossTaken.length > 0) {
      issues.push({
        key: 'boss',
        label: format(th.game.table.offerReviewColorTakenByBoss, {
          colors: colorNames(bossTaken),
        }),
      });
    }

    const takenBy = new Map<string, FamilyColor[]>();
    for (const color of colors) {
      const owner = acceptedOffers[color];
      if (!owner || owner === offerUid) continue;
      takenBy.set(owner, [...(takenBy.get(owner) ?? []), color]);
    }
    for (const [owner, ownerColors] of takenBy) {
      issues.push({
        key: `taken-${owner}`,
        label: format(th.game.table.offerReviewColorConflict, {
          colors: colorNames(ownerColors),
          names: getPlayerName(players, owner),
        }),
      });
    }

    if (acceptedTotal + offer.amount > dividends) {
      issues.push({ key: 'capacity', label: th.game.table.offerReviewOverCapacity });
    }

    return issues;
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
          <ul className="table-review-issues">
            {issues.map((issue) => (
              <li key={issue.key}>
                <TriangleAlert size={13} strokeWidth={2.6} aria-hidden="true" />
                {issue.label}
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          className={`table-review-action ${accepted ? 'is-undo' : ''}`}
          data-testid={`${action}-offer-${offerUid}`}
          disabled={busy || issues.length > 0}
          title={issues[0]?.label ?? actionLabel}
          aria-label={actionLabel}
          onClick={() =>
            accepted ? onUnacceptOffer(offerUid) : onAcceptOffer(offerUid)
          }
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
      <div className="table-review-summary">
        <div className="table-review-stat is-capacity">
          <span>{th.game.table.offerReviewCapacity}</span>
          <strong data-testid="offer-review-capacity">
            {acceptedTotal}/{dividends}
          </strong>
        </div>
        <div className="table-review-stat">
          <span>{th.game.table.offerReviewPayout}</span>
          <strong data-testid="offer-review-payout">
            {acceptedTotal * value} {th.game.million}
          </strong>
          <em>{th.game.table.offerReviewPayoutHint}</em>
        </div>
        <div className="table-review-stat">
          <span>{th.game.table.offerReviewBossLeft}</span>
          <strong data-testid="offer-review-boss-left">
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
