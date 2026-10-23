import { Check, Minus, Plus, Undo2, X } from 'lucide-react';
import { useState } from 'react';

import { FAMILY_ORDER, type FamilyColor } from '@/engine/config/families';
import type { ClanCard as ClanCardData } from '@/engine/config/influenceCards';
import type { OfferCardInput, PrivateState, PublicState } from '@/engine/types';
import { th } from '@/i18n/th';
import { Button } from '@/ui/common/Button';
import { Modal } from '@/ui/common/Modal';
import { ClanCard } from '@/ui/common/influence';
import { FAMILY_BY_ID } from '@/ui/common/families';
import { FamilySymbol } from '@/ui/common/FamilySymbol';

import { InvestorTile } from './TableBits';

export interface OfferInput {
  cards: OfferCardInput[];
  amount: number;
}

interface OfferModalProps {
  uid: string;
  publicState: PublicState;
  privateState: PrivateState;
  pendingAction: string | null;
  onClose: () => void;
  onSubmit: (offer: OfferInput) => void;
  onWithdraw: () => void;
}

interface DraftCard {
  color: FamilyColor;
  source: 'table' | 'hand';
  cardId?: string;
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
  const myOffer = deal?.offers[uid];
  const [selected, setSelected] = useState<DraftCard[]>(() =>
    (myOffer?.cards ?? []).map((card) => ({
      color: card.color,
      source: card.source,
    })),
  );
  const [amount, setAmount] = useState(myOffer?.amount ?? 1);
  const [error, setError] = useState<string | null>(null);

  if (!deal) return null;

  const allowed = new Set(deal.requirements.groups.flatMap((group) => group.colors));
  const tableColors = new Set<FamilyColor>(
    (publicState.tableInvestors[uid] ?? []).filter((color) => allowed.has(color)),
  );
  for (const card of myOffer?.cards ?? []) {
    if (card.source === 'table' && allowed.has(card.color)) tableColors.add(card.color);
  }
  const myTableInvestors = [...tableColors].sort(
    (left, right) => FAMILY_ORDER.indexOf(left) - FAMILY_ORDER.indexOf(right),
  );

  const clanEntries: Array<{ key: string; color: FamilyColor; cardId?: string }> = [];
  const clanColors = new Set<FamilyColor>();
  const myClanCards = privateState.hand.filter(
    (card): card is ClanCardData => card.kind === 'clan' && allowed.has(card.color),
  );
  for (const card of myClanCards) {
    if (clanColors.has(card.color)) continue;
    clanColors.add(card.color);
    clanEntries.push({ key: `hand-${card.id}`, color: card.color, cardId: card.id });
  }
  for (const card of myOffer?.cards ?? []) {
    if (card.source !== 'hand' || !allowed.has(card.color) || clanColors.has(card.color)) {
      continue;
    }
    clanColors.add(card.color);
    clanEntries.push({ key: `existing-${card.color}`, color: card.color });
  }
  clanEntries.sort(
    (left, right) => FAMILY_ORDER.indexOf(left.color) - FAMILY_ORDER.indexOf(right.color),
  );

  const selectedColor = (color: FamilyColor) =>
    selected.find((card) => card.color === color);
  const isSelectedTable = (color: FamilyColor) =>
    selected.some((card) => card.color === color && card.source === 'table');
  const isSelectedHand = (color: FamilyColor) =>
    selected.some((card) => card.color === color && card.source === 'hand');
  const accepted = Boolean(
    myOffer &&
      myOffer.cards.length > 0 &&
      myOffer.cards.every((card) => deal.acceptedOffers[card.color] === uid),
  );
  const busy = pendingAction !== null;
  const maxAmount = deal.requirements.dividends;

  function toggleTable(color: FamilyColor): void {
    setError(null);
    setSelected((current) => {
      if (current.some((card) => card.color === color && card.source === 'table')) {
        return current.filter(
          (card) => !(card.color === color && card.source === 'table'),
        );
      }
      if (current.some((card) => card.color === color)) return current;
      return [...current, { color, source: 'table' }];
    });
  }

  function toggleClan(color: FamilyColor, cardId?: string): void {
    setError(null);
    setSelected((current) => {
      const existing = current.find((card) => card.color === color);
      if (existing?.source === 'hand') {
        return current.filter((card) => card.color !== color);
      }
      if (existing) return current;
      return [...current, { color, source: 'hand', cardId }];
    });
  }

  function removeSelected(color: FamilyColor): void {
    setSelected((current) => current.filter((card) => card.color !== color));
    setError(null);
  }

  function handleSubmit(): void {
    if (selected.length === 0 && !myOffer) {
      setError(th.game.table.offerPickCard);
      return;
    }

    const clamped = clampAmount(amount, maxAmount);
    setAmount(clamped);
    onSubmit({
      cards: selected.map((card) => ({
        color: card.color,
        source: card.source,
        ...(card.source === 'hand' && card.cardId ? { cardId: card.cardId } : {}),
      })),
      amount: clamped,
    });
    onClose();
  }

  function handleWithdraw(): void {
    onWithdraw();
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

      {accepted && (
        <p className="table-offer-accepted-note" data-testid="offer-accepted-note">
          <Check size={14} strokeWidth={3} aria-hidden="true" />
          {th.game.table.offerAcceptedEditHint}
        </p>
      )}

      <section className="table-offer-picker" aria-labelledby="offer-table-heading">
        <h3 id="offer-table-heading">{th.game.table.offerFromTable}</h3>
        {myTableInvestors.length > 0 ? (
          <div className="table-offer-grid" data-testid="offer-investor-grid">
            {myTableInvestors.map((color) => {
              const onVacation = publicState.onVacation.includes(color);
              const selectedTable = isSelectedTable(color);
              const selectedOther = Boolean(selectedColor(color)) && !selectedTable;
              return (
                <button
                  key={color}
                  type="button"
                  className={`table-offer-pick ${selectedTable ? 'is-selected' : ''}`}
                  aria-pressed={selectedTable}
                  aria-label={text(th.game.table.offerPickInvestor, {
                    color: th.families[color],
                  })}
                  data-testid={`offer-investor-${color}`}
                  data-family={color}
                  disabled={busy || selectedOther || (onVacation && !selectedTable)}
                  title={selectedOther ? th.game.table.offerAlreadySelected : undefined}
                  onClick={() => toggleTable(color)}
                >
                  <InvestorTile color={color} vacation={onVacation} />
                </button>
              );
            })}
          </div>
        ) : (
          <p className="table-offer-empty">{th.game.table.offerNoTable}</p>
        )}
      </section>

      <section className="table-offer-picker" aria-labelledby="offer-hand-heading">
        <h3 id="offer-hand-heading">{th.game.table.offerFromHand}</h3>
        {clanEntries.length > 0 ? (
          <div className="table-offer-grid table-offer-grid-cards" data-testid="offer-clan-grid">
            {clanEntries.map((entry) => {
              const selectedHand = isSelectedHand(entry.color);
              const selectedOther = Boolean(selectedColor(entry.color)) && !selectedHand;
              return (
                <button
                  key={entry.key}
                  type="button"
                  className={`table-offer-pick table-offer-pick-card ${
                    selectedHand ? 'is-selected' : ''
                  }`}
                  aria-pressed={selectedHand}
                  aria-label={text(th.game.table.offerPickClan, {
                    color: th.families[entry.color],
                  })}
                  data-testid={
                    entry.cardId
                      ? `offer-clan-${entry.cardId}`
                      : `offer-clan-existing-${entry.color}`
                  }
                  data-family={entry.color}
                  disabled={busy || selectedOther}
                  title={selectedOther ? th.game.table.offerAlreadySelected : undefined}
                  onClick={() => toggleClan(entry.color, entry.cardId)}
                >
                  <ClanCard color={entry.color} width={76} height={106} />
                </button>
              );
            })}
          </div>
        ) : (
          <p className="table-offer-empty">{th.game.table.offerNoHand}</p>
        )}
      </section>

      <div className="table-offer-form">
        <div className="table-offer-selection">
          <span className="table-offer-selection-label">
            {th.game.table.offerSelectedCards}
          </span>
          {selected.length > 0 ? (
            <div className="table-offer-selected-list">
              {[...selected]
                .sort(
                  (left, right) =>
                    FAMILY_ORDER.indexOf(left.color) - FAMILY_ORDER.indexOf(right.color),
                )
                .map((card) => (
                  <span
                    key={card.color}
                    className="table-offer-selected"
                    data-testid={`selected-offer-${card.color}`}
                  >
                    <FamilySymbol
                      shape={FAMILY_BY_ID[card.color].symbol}
                      size={17}
                      style={{ color: `var(${FAMILY_BY_ID[card.color].cssVar})` }}
                    />
                    <strong>{th.families[card.color]}</strong>
                    <em>
                      {card.source === 'hand'
                        ? th.game.table.fromHand
                        : th.game.table.offerFromTableShort}
                    </em>
                    <button
                      type="button"
                      className="table-offer-remove"
                      aria-label={text(th.game.table.removeOfferCard, {
                        color: th.families[card.color],
                      })}
                      data-testid={`remove-offer-card-${card.color}`}
                      disabled={busy}
                      onClick={() => removeSelected(card.color)}
                    >
                      <X size={13} strokeWidth={3} aria-hidden="true" />
                    </button>
                  </span>
                ))}
            </div>
          ) : (
            <span className="table-offer-selection-empty">
              {th.game.table.offerNothingSelected}
            </span>
          )}
          <span className="table-offer-selected-count">
            {text(th.game.table.offerSelectedCount, { count: selected.length })}
          </span>
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

      <p className="table-offer-edit-hint">{th.game.table.offerEditHint}</p>

      {myOffer && (
        <div className="table-my-offers">
          <Button
            variant="light"
            className="table-btn"
            data-testid="withdraw-offer"
            disabled={busy}
            onClick={handleWithdraw}
          >
            <Undo2 size={14} strokeWidth={2.7} aria-hidden="true" />
            {th.game.table.withdrawOffer}
          </Button>
          <p className="table-my-offers-note">{th.game.table.offerWithdrawHint}</p>
        </div>
      )}

      <div className="app-modal-actions">
        <Button variant="light" className="table-btn" disabled={busy} onClick={onClose}>
          {th.game.table.offerCancel}
        </Button>
        <Button
          variant="dark"
          className="table-btn"
          data-testid="offer-submit"
          disabled={busy || (selected.length === 0 && !myOffer)}
          onClick={handleSubmit}
        >
          {myOffer ? th.game.table.updateOffer : th.game.table.submitOffer}
        </Button>
      </div>
      <p className="table-modal-error" role="status" aria-live="polite">
        {error}
      </p>
    </Modal>
  );
}
