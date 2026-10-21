import { Check, Minus, Pencil, Plus, Undo2 } from 'lucide-react';
import { useState } from 'react';

import { FAMILY_ORDER, type FamilyColor } from '@/engine/config/families';
import type { ClanCard as ClanCardData } from '@/engine/config/influenceCards';
import type { PrivateState, PublicOffer, PublicState } from '@/engine/types';
import { th } from '@/i18n/th';
import { Button } from '@/ui/common/Button';
import { Modal } from '@/ui/common/Modal';
import { ClanCard } from '@/ui/common/influence';
import { FAMILY_BY_ID } from '@/ui/common/families';
import { FamilySymbol } from '@/ui/common/FamilySymbol';

import { InvestorTile } from './TableBits';

export interface OfferInput {
  color: FamilyColor;
  source: 'table' | 'hand';
  cardId?: string;
  amount: number;
}

interface OfferModalProps {
  uid: string;
  publicState: PublicState;
  privateState: PrivateState;
  pendingAction: string | null;
  onClose: () => void;
  onSubmit: (offer: OfferInput) => void;
  onWithdraw: (color: FamilyColor) => void;
}

function text(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function clampAmount(value: number, max: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(max, Math.max(1, Math.round(value)));
}

export function OfferModal({
  uid,
  publicState,
  privateState,
  pendingAction,
  onClose,
  onSubmit,
  onWithdraw,
}: OfferModalProps) {
  const deal = publicState.deal;
  const [source, setSource] = useState<'table' | 'hand'>('table');
  const [selectedColor, setSelectedColor] = useState<FamilyColor | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>();
  const [amount, setAmount] = useState(1);
  const [error, setError] = useState<string | null>(null);

  if (!deal) return null;

  const allowed = new Set(deal.requirements.groups.flatMap((group) => group.colors));
  const myOffers = deal.offers[uid] ?? {};
  const myTableInvestors = (publicState.tableInvestors[uid] ?? []).filter((color) =>
    allowed.has(color),
  );
  const myClanCards = privateState.hand.filter(
    (card): card is ClanCardData => card.kind === 'clan' && allowed.has(card.color),
  );
  const offerEntries = (
    Object.entries(myOffers) as Array<[FamilyColor, PublicOffer | undefined]>
  )
    .filter((entry): entry is [FamilyColor, PublicOffer] => Boolean(entry[1]))
    .sort(([left], [right]) => FAMILY_ORDER.indexOf(left) - FAMILY_ORDER.indexOf(right));
  const selectedOffer = selectedColor ? myOffers[selectedColor] : undefined;
  const selectedAccepted = Boolean(
    selectedColor && deal.acceptedOffers[selectedColor] === uid,
  );
  const busy = pendingAction !== null;
  const maxAmount = deal.requirements.dividends;

  function selectTableColor(color: FamilyColor): void {
    const existing = myOffers[color];
    setSource('table');
    setSelectedColor(color);
    setSelectedCardId(undefined);
    setAmount(existing?.amount ?? 1);
    setError(null);
  }

  function selectClanCard(cardId: string, color: FamilyColor): void {
    const existing = myOffers[color];
    setSource('hand');
    setSelectedColor(color);
    setSelectedCardId(cardId);
    setAmount(existing?.amount ?? 1);
    setError(null);
  }

  function changeSource(next: 'table' | 'hand'): void {
    if (next === source) return;
    setSource(next);
    setSelectedColor(null);
    setSelectedCardId(undefined);
    setAmount(1);
    setError(null);
  }

  function handleSubmit(): void {
    if (!selectedColor) {
      setError(th.game.table.offerPickColor);
      return;
    }
    if (selectedAccepted) {
      setError(th.game.table.offerAcceptedLocked);
      return;
    }
    if (source === 'hand' && !selectedCardId) {
      setError(th.game.table.offerPickCard);
      return;
    }

    const clamped = clampAmount(amount, maxAmount);
    setAmount(clamped);
    onSubmit({
      color: selectedColor,
      source,
      cardId: source === 'hand' ? selectedCardId : undefined,
      amount: clamped,
    });
    onClose();
  }

  return (
    <Modal
      title={th.game.table.offerModalTitle}
      eyebrow={text(th.game.table.offerModalEyebrow, {
        space: deal.space,
        tile: deal.tileNumber,
      })}
      onClose={onClose}
      testId="offer-modal"
      className="offer-modal"
    >
      <p className="table-modal-hint">{th.game.table.offerModalHint}</p>

      <div className="table-source-tabs" role="group" aria-label={th.game.table.offerSource}>
        <button
          type="button"
          className={`table-source-tab ${source === 'table' ? 'is-active' : ''}`}
          aria-pressed={source === 'table'}
          data-testid="offer-source-table"
          disabled={busy}
          onClick={() => changeSource('table')}
        >
          {th.game.table.offerFromTable}
        </button>
        <button
          type="button"
          className={`table-source-tab ${source === 'hand' ? 'is-active' : ''}`}
          aria-pressed={source === 'hand'}
          data-testid="offer-source-hand"
          disabled={busy}
          onClick={() => changeSource('hand')}
        >
          {th.game.table.offerFromHand}
        </button>
      </div>

      {source === 'table' ? (
        myTableInvestors.length > 0 ? (
          <div className="table-offer-grid" data-testid="offer-investor-grid">
            {myTableInvestors.map((color) => {
              const existing = myOffers[color];
              const onVacation = publicState.onVacation.includes(color);
              return (
                <button
                  key={color}
                  type="button"
                  className={`table-offer-pick ${selectedColor === color ? 'is-selected' : ''}`}
                  aria-pressed={selectedColor === color}
                  aria-label={text(th.game.table.offerPickInvestor, {
                    color: th.families[color],
                  })}
                  data-testid={`offer-investor-${color}`}
                  data-family={color}
                  disabled={busy || (onVacation && !existing)}
                  onClick={() => selectTableColor(color)}
                >
                  <InvestorTile color={color} vacation={onVacation} />
                </button>
              );
            })}
          </div>
        ) : (
          <p className="table-offer-empty">{th.game.table.offerNoTable}</p>
        )
      ) : myClanCards.length > 0 ? (
        <div className="table-offer-grid table-offer-grid-cards" data-testid="offer-clan-grid">
          {myClanCards.map((card) => {
            const disabled = busy || Boolean(myOffers[card.color]);
            return (
              <button
                key={card.id}
                type="button"
                className={`table-offer-pick table-offer-pick-card ${
                  selectedCardId === card.id ? 'is-selected' : ''
                }`}
                aria-pressed={selectedCardId === card.id}
                aria-label={text(th.game.table.offerPickClan, {
                  color: th.families[card.color],
                })}
                data-testid={`offer-clan-${card.id}`}
                data-family={card.color}
                disabled={disabled}
                title={
                  myOffers[card.color] ? th.game.table.offerColorAlreadyOffered : undefined
                }
                onClick={() => selectClanCard(card.id, card.color)}
              >
                <ClanCard color={card.color} width={76} height={106} />
              </button>
            );
          })}
        </div>
      ) : (
        <p className="table-offer-empty">{th.game.table.offerNoHand}</p>
      )}

      <div className="table-offer-form">
        <div className="table-offer-selection">
          <span className="table-offer-selection-label">
            {th.game.table.offerSelectedColor}
          </span>
          {selectedColor ? (
            <span className="table-offer-selected">
              <FamilySymbol
                shape={FAMILY_BY_ID[selectedColor].symbol}
                size={17}
                style={{ color: `var(${FAMILY_BY_ID[selectedColor].cssVar})` }}
              />
              <strong>{th.families[selectedColor]}</strong>
              {selectedAccepted && (
                <em>
                  <Check size={12} strokeWidth={3} aria-hidden="true" />
                  {th.game.table.accepted}
                </em>
              )}
            </span>
          ) : (
            <span className="table-offer-selection-empty">
              {th.game.table.offerNothingSelected}
            </span>
          )}
        </div>

        <div className="table-offer-amount">
          <label htmlFor="offer-amount">{th.game.table.offerAmount}</label>
          <div className="table-amount-stepper">
            <button
              type="button"
              className="table-icon-btn"
              aria-label={th.game.table.decreaseAmount}
              data-testid="offer-amount-minus"
              disabled={busy || amount <= 1}
              onClick={() => setAmount((current) => clampAmount(current - 1, maxAmount))}
            >
              <Minus size={16} strokeWidth={3} aria-hidden="true" />
            </button>
            <input
              id="offer-amount"
              type="number"
              min={1}
              max={maxAmount}
              step={1}
              value={amount}
              data-testid="offer-amount"
              disabled={busy}
              onChange={(event) => {
                const next = Number(event.target.value);
                setAmount(Number.isFinite(next) ? next : 1);
              }}
              onBlur={() => setAmount((current) => clampAmount(current, maxAmount))}
            />
            <button
              type="button"
              className="table-icon-btn"
              aria-label={th.game.table.increaseAmount}
              data-testid="offer-amount-plus"
              disabled={busy || amount >= maxAmount}
              onClick={() => setAmount((current) => clampAmount(current + 1, maxAmount))}
            >
              <Plus size={16} strokeWidth={3} aria-hidden="true" />
            </button>
          </div>
          <p className="table-offer-amount-hint">
            {text(th.game.table.offerAmountHint, { count: maxAmount })}
          </p>
        </div>
      </div>

      {selectedOffer?.source === 'table' && !selectedAccepted && !deal.locked && (
        <p className="table-offer-edit-hint">{th.game.table.offerEditHint}</p>
      )}

      {offerEntries.length > 0 && (
        <section className="table-my-offers" aria-label={th.game.table.myOffersTitle}>
          <h3>{th.game.table.myOffersTitle}</h3>
          <ul>
            {offerEntries.map(([color, offer]) => {
              const accepted = deal.acceptedOffers[color] === uid;
              return (
                <li
                  key={color}
                  className={`table-my-offer ${accepted ? 'is-accepted' : ''}`}
                  data-testid={`my-offer-${color}`}
                >
                  <FamilySymbol
                    shape={FAMILY_BY_ID[color].symbol}
                    size={15}
                    style={{ color: `var(${FAMILY_BY_ID[color].cssVar})` }}
                  />
                  <strong>{th.families[color]}</strong>
                  <span>×{offer.amount}</span>
                  <em>
                    {offer.source === 'hand'
                      ? th.game.table.fromHand
                      : th.game.table.offerFromTableShort}
                  </em>
                  {accepted && (
                    <span className="table-my-offer-state">
                      <Check size={12} strokeWidth={3} aria-hidden="true" />
                      {th.game.table.accepted}
                    </span>
                  )}
                  {!accepted && (
                    <span className="table-my-offer-actions">
                      {offer.source === 'table' && (
                        <button
                          type="button"
                          className="table-icon-btn"
                          aria-label={text(th.game.table.editOffer, {
                            color: th.families[color],
                          })}
                          data-testid={`edit-offer-${color}`}
                          disabled={busy}
                          onClick={() => selectTableColor(color)}
                        >
                          <Pencil size={13} strokeWidth={2.7} aria-hidden="true" />
                        </button>
                      )}
                      <button
                        type="button"
                        className="table-icon-btn is-danger"
                        aria-label={text(th.game.table.withdrawOffer, {
                          color: th.families[color],
                        })}
                        data-testid={`withdraw-offer-${color}`}
                        disabled={busy}
                        onClick={() => onWithdraw(color)}
                      >
                        <Undo2 size={13} strokeWidth={2.7} aria-hidden="true" />
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="table-my-offers-note">{th.game.table.offerWithdrawHint}</p>
        </section>
      )}

      <div className="app-modal-actions">
        <Button variant="light" className="table-btn" disabled={busy} onClick={onClose}>
          {th.game.table.offerCancel}
        </Button>
        <Button
          variant="dark"
          className="table-btn"
          data-testid="offer-submit"
          disabled={busy || !selectedColor || selectedAccepted}
          onClick={handleSubmit}
        >
          {selectedOffer?.source === 'table'
            ? th.game.table.updateOffer
            : th.game.table.submitOffer}
        </Button>
      </div>
      <p className="table-modal-error" role="status" aria-live="polite">
        {error}
      </p>
    </Modal>
  );
}
