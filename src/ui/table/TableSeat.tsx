import { Check, Crown, KeyRound, Lock, Undo2 } from 'lucide-react';

import { FAMILY_ORDER, type FamilyColor } from '@/engine/config/families';
import type { PublicOffer } from '@/engine/types';
import { th } from '@/i18n/th';
import { FAMILY_BY_ID } from '@/ui/common/families';
import { FamilySymbol } from '@/ui/common/FamilySymbol';

import { CardBacks, InvestorTile } from './TableBits';

interface TableSeatProps {
  uid: string;
  name: string;
  seat: number;
  connected: boolean;
  isBoss: boolean;
  isHost: boolean;
  isMe: boolean;
  investors: FamilyColor[];
  onVacation: FamilyColor[];
  handCount: number;
  offer?: PublicOffer;
  acceptedOffers?: Partial<Record<FamilyColor, string>>;
  valuePerDividend?: number;
  canManageOffers?: boolean;
  offersPending?: boolean;
  offerActionState?: (offer: PublicOffer) => { disabled: boolean; title: string };
  onAcceptOffer?: (uid: string) => void;
  onUnacceptOffer?: (uid: string) => void;
  /** `strip` is the compact card in the phone/tablet player strip. */
  variant: 'top' | 'side' | 'strip';
  /** Drawn cards are landing on this seat. */
  receiving?: boolean;
}

function format(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function avatarLetter(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

function StatusDot({ connected }: { connected: boolean }) {
  return (
    <span
      className={`table-dot ${connected ? 'is-online' : 'is-offline'}`}
      title={connected ? th.common.online : th.common.offline}
      aria-label={connected ? th.common.online : th.common.offline}
    />
  );
}

function OfferBubble({
  offer,
  acceptedOffers,
  uid,
  name,
  valuePerDividend,
  canManageOffers = false,
  offersPending = false,
  offerActionState,
  onAcceptOffer,
  onUnacceptOffer,
}: {
  offer?: PublicOffer;
  acceptedOffers?: Partial<Record<FamilyColor, string>>;
  uid: string;
  name: string;
  valuePerDividend?: number;
  canManageOffers?: boolean;
  offersPending?: boolean;
  offerActionState?: (offer: PublicOffer) => { disabled: boolean; title: string };
  onAcceptOffer?: (uid: string) => void;
  onUnacceptOffer?: (uid: string) => void;
}) {
  if (!offer || offer.cards.length === 0) return null;

  const cards = [...offer.cards].sort(
    (left, right) => FAMILY_ORDER.indexOf(left.color) - FAMILY_ORDER.indexOf(right.color),
  );
  const colors = cards.map((card) => card.color);
  const accepted =
    cards.length > 0 && cards.every((card) => acceptedOffers?.[card.color] === uid);
  const hasHand = cards.some((card) => card.source === 'hand');
  const value =
    valuePerDividend !== undefined
      ? th.game.table.offerValue.replace(
          '{amount}',
          String(offer.amount * valuePerDividend),
        )
      : null;
  const actionState = canManageOffers && !accepted ? offerActionState?.(offer) : undefined;
  const colorNames = colors.map((color) => th.families[color]).join(', ');
  const content = (
    <>
      <span className="table-offer-colors" aria-hidden="true">
        {colors.map((color) => (
          <FamilySymbol
            key={color}
            shape={FAMILY_BY_ID[color].symbol}
            size={13}
            style={{ color: `var(${FAMILY_BY_ID[color].cssVar})` }}
          />
        ))}
      </span>
      <span>{th.game.table.offerBubble.replace('{amount}', String(offer.amount))}</span>
      {hasHand && <em>{th.game.table.fromHand}</em>}
      {value && <small>{value}</small>}
      {accepted && !canManageOffers && (
        <Check size={12} strokeWidth={3} aria-hidden="true" />
      )}
      {canManageOffers &&
        (accepted ? (
          <Undo2 size={12} strokeWidth={3} aria-hidden="true" />
        ) : (
          <Check size={12} strokeWidth={3} aria-hidden="true" />
        ))}
    </>
  );

  if (
    canManageOffers &&
    (accepted ? Boolean(onUnacceptOffer) : Boolean(onAcceptOffer))
  ) {
    return (
      <button
        type="button"
        className={`table-offer is-action ${accepted ? 'is-accepted' : ''}`}
        data-testid={accepted ? `unaccept-offer-${uid}` : `accept-offer-${uid}`}
        data-offer-uid={uid}
        disabled={offersPending || (!accepted && Boolean(actionState?.disabled))}
        title={
          accepted
            ? th.game.table.unacceptOffer
            : (actionState?.title ?? th.game.table.acceptOffer)
        }
        aria-label={
          accepted
            ? format(th.game.table.unacceptOfferAria, { colors: colorNames, name })
            : format(th.game.table.acceptOfferAria, {
                colors: colorNames,
                name,
                amount: offer.amount,
              })
        }
        onClick={() => {
          if (accepted) onUnacceptOffer?.(uid);
          else onAcceptOffer?.(uid);
        }}
      >
        {content}
      </button>
    );
  }

  return <div className={`table-offer ${accepted ? 'is-accepted' : ''}`}>{content}</div>;
}

export function TableSeat({
  uid,
  name,
  seat,
  connected,
  isBoss,
  isHost,
  isMe,
  investors,
  onVacation,
  handCount,
  offer,
  acceptedOffers,
  valuePerDividend,
  canManageOffers,
  offersPending,
  offerActionState,
  onAcceptOffer,
  onUnacceptOffer,
  variant,
  receiving = false,
}: TableSeatProps) {
  const seatLabel = th.game.table.seatAria.replace('{seat}', String(seat + 1));

  return (
    <div
      className={`table-seat is-${variant} ${isBoss ? 'is-boss' : ''}`}
      data-testid={`game-player-${uid}`}
      data-connected={connected}
      aria-label={seatLabel}
    >
      {isBoss && (
        <span className="table-crown" title={th.game.boss} aria-label={th.game.boss}>
          <Crown size={22} fill="var(--gold)" strokeWidth={2.5} />
        </span>
      )}

      <div className="table-seat-head">
        <span className="table-avatar" aria-hidden="true">
          {avatarLetter(name)}
          <span className="table-seat-no">{seat + 1}</span>
        </span>
        <span className="table-seat-name">{name}</span>
        {isMe && <span className="table-you">{th.common.you}</span>}
        {isHost && (
          <span className="table-host-mark" title={th.game.hostBadge}>
            <KeyRound
              size={13}
              className="table-host-key"
              aria-label={th.game.hostBadge}
            />
          </span>
        )}
        <StatusDot connected={connected} />
      </div>

      <div className="table-seat-investors">
        {investors.length > 0 ? (
          investors.map((color) => (
            <InvestorTile key={color} color={color} vacation={onVacation.includes(color)} />
          ))
        ) : (
          <span className="table-empty-note">{th.game.noInvestors}</span>
        )}
      </div>

      <div className="table-seat-foot">
        <CardBacks count={handCount} bump={receiving} />
        <OfferBubble
          offer={offer}
          acceptedOffers={acceptedOffers}
          uid={uid}
          name={name}
          valuePerDividend={valuePerDividend}
          canManageOffers={canManageOffers}
          offersPending={offersPending}
          offerActionState={offerActionState}
          onAcceptOffer={onAcceptOffer}
          onUnacceptOffer={onUnacceptOffer}
        />
      </div>
    </div>
  );
}

interface MySeatProps {
  uid: string;
  name: string;
  seat: number;
  connected: boolean;
  isBoss: boolean;
  isHost: boolean;
  investors: FamilyColor[];
  onVacation: FamilyColor[];
  money: number;
  moneyDelta?: number | null;
  moneyDeltaKey?: number;
}

export function MySeat({
  uid,
  name,
  seat,
  connected,
  isBoss,
  isHost,
  investors,
  onVacation,
  money,
  moneyDelta = null,
  moneyDeltaKey,
}: MySeatProps) {
  const seatLabel = th.game.table.seatAria.replace('{seat}', String(seat + 1));

  return (
    <div
      className="table-mine-seat"
      data-testid={`game-player-${uid}`}
      data-connected={connected}
      aria-label={seatLabel}
    >
      <div className="table-seat-head">
        <span className="table-avatar" aria-hidden="true">
          {avatarLetter(name)}
          <span className="table-seat-no">{seat + 1}</span>
        </span>
        <span className="table-seat-name">{name}</span>
        <span className="table-you">{th.common.you}</span>
        {isBoss && (
          <Crown
            size={17}
            fill="var(--gold)"
            className="table-mine-crown"
            aria-label={th.game.boss}
          />
        )}
        {isHost && (
          <span className="table-host-mark" title={th.game.hostBadge}>
            <KeyRound
              size={13}
              className="table-host-key"
              aria-label={th.game.hostBadge}
            />
          </span>
        )}
        <StatusDot connected={connected} />
      </div>

      <div className="table-seat-investors">
        {investors.length > 0 ? (
          investors.map((color) => (
            <InvestorTile key={color} color={color} vacation={onVacation.includes(color)} />
          ))
        ) : (
          <span className="table-empty-note">{th.game.noInvestors}</span>
        )}
      </div>

      <div className="table-my-money">
        <span>{th.game.money}</span>
        <strong data-testid="my-money">
          {money} {th.game.million}
        </strong>
        {moneyDelta !== null && (
          <span
            key={moneyDeltaKey}
            className={`table-money-delta ${moneyDelta < 0 ? 'is-loss' : 'is-gain'}`}
            data-testid="money-delta"
            role="status"
          >
            {moneyDelta < 0
              ? format(th.game.table.moneyLoss, { amount: Math.abs(moneyDelta) })
              : format(th.game.table.moneyGain, { amount: moneyDelta })}
          </span>
        )}
        <span className="table-private-chip">
          <Lock size={12} strokeWidth={2.2} aria-hidden="true" />
          {th.game.myHandPrivate}
        </span>
      </div>
    </div>
  );
}
