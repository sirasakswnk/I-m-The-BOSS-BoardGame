import { Check, Crown, KeyRound, Lock } from 'lucide-react';

import type { FamilyColor } from '@/engine/config/families';
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
  offers?: Partial<Record<FamilyColor, PublicOffer>>;
  acceptedOffers?: Partial<Record<FamilyColor, string>>;
  valuePerDividend?: number;
  variant: 'top' | 'side';
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

function OfferBubbles({
  offers,
  acceptedOffers,
  uid,
  valuePerDividend,
}: {
  offers?: Partial<Record<FamilyColor, PublicOffer>>;
  acceptedOffers?: Partial<Record<FamilyColor, string>>;
  uid: string;
  valuePerDividend?: number;
}) {
  const entries = Object.entries(offers ?? {}) as Array<[FamilyColor, PublicOffer]>;
  if (entries.length === 0) return null;

  return (
    <div className="table-offers">
      {entries.map(([color, offer]) => {
        const accepted = acceptedOffers?.[color] === uid;
        const value =
          valuePerDividend !== undefined
            ? th.game.table.offerValue.replace(
                '{amount}',
                String(offer.amount * valuePerDividend),
              )
            : null;
        return (
          <div key={color} className={`table-offer ${accepted ? 'is-accepted' : ''}`}>
            <FamilySymbol
              shape={FAMILY_BY_ID[color].symbol}
              size={13}
              style={{ color: `var(${FAMILY_BY_ID[color].cssVar})` }}
            />
            <span>{th.game.table.offerBubble.replace('{amount}', String(offer.amount))}</span>
            {offer.source === 'hand' && <em>{th.game.table.fromHand}</em>}
            {value && <small>{value}</small>}
            {accepted && <Check size={12} strokeWidth={3} aria-hidden="true" />}
          </div>
        );
      })}
    </div>
  );
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
  offers,
  acceptedOffers,
  valuePerDividend,
  variant,
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
        <CardBacks count={handCount} />
        <OfferBubbles
          offers={offers}
          acceptedOffers={acceptedOffers}
          uid={uid}
          valuePerDividend={valuePerDividend}
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
        <strong>
          {money} {th.game.million}
        </strong>
        <span className="table-private-chip">
          <Lock size={12} strokeWidth={2.2} aria-hidden="true" />
          {th.game.myHandPrivate}
        </span>
      </div>
    </div>
  );
}
