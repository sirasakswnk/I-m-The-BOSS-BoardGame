import { Check, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { InfluenceCard as InfluenceCardData } from '@/engine/config/influenceCards';
import type { PrivateState } from '@/engine/types';
import { th } from '@/i18n/th';
import { Button } from '@/ui/common/Button';
import { Modal } from '@/ui/common/Modal';
import { InfluenceCard, getRecruitmentPartMap, type RecruitmentPart } from '@/ui/common/influence';

import { getDiscardNeed } from './endgameUtils';

interface DiscardModalProps {
  privateState: PrivateState;
  pendingAction: string | null;
  onDiscard: (cardIds: string[]) => void;
}

const HAND_KIND_ORDER: Record<InfluenceCardData['kind'], number> = {
  clan: 0,
  travel: 1,
  stop: 2,
  recruitment: 3,
  imTheBoss: 4,
};

function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function cardAria(card: InfluenceCardData, part: RecruitmentPart | undefined): string {
  switch (card.kind) {
    case 'clan':
      return fill(th.card.aria.clan, { color: th.families[card.color] });
    case 'travel':
      return fill(th.card.aria.travel, {
        color: card.color === 'wild' ? th.card.wildColor : th.families[card.color],
      });
    case 'recruitment':
      return fill(th.card.aria.recruitment, { part: part ?? 1, total: 3 });
    case 'stop':
      return th.card.aria.stop;
    case 'imTheBoss':
      return th.card.aria.boss;
  }
}

export function DiscardModal({ privateState, pendingAction, onDiscard }: DiscardModalProps) {
  const need = getDiscardNeed(privateState.hand.length);
  const [selected, setSelected] = useState<string[]>([]);
  const busy = pendingAction !== null;
  const recruitmentParts = getRecruitmentPartMap(privateState.hand);
  const orderedCards = [...privateState.hand].sort(
    (left, right) =>
      HAND_KIND_ORDER[left.kind] - HAND_KIND_ORDER[right.kind] || left.id.localeCompare(right.id),
  );

  useEffect(() => {
    setSelected((current) => {
      const next = current.filter((id) => privateState.hand.some((card) => card.id === id));
      if (next.length === current.length && next.every((id, index) => id === current[index])) {
        return current;
      }
      return next;
    });
  }, [privateState.hand]);

  function toggle(cardId: string): void {
    if (busy) return;
    setSelected((current) => {
      if (current.includes(cardId)) return current.filter((id) => id !== cardId);
      if (current.length >= need) return current;
      return [...current, cardId];
    });
  }

  return (
    <Modal
      title={th.game.table.discardModalTitle}
      eyebrow={th.game.table.discardModalEyebrow}
      onClose={() => undefined}
      dismissible={false}
      testId="discard-modal"
      className="discard-modal"
    >
      <p className="table-modal-hint">{fill(th.game.table.discardModalHint, { need })}</p>
      <div className="discard-summary">
        <span>{fill(th.game.table.discardHand, { count: privateState.hand.length })}</span>
        <strong data-testid="discard-count" aria-live="polite">
          {fill(th.game.table.discardSelected, {
            selected: selected.length,
            need,
          })}
        </strong>
      </div>

      <div className="discard-grid" role="group" aria-label={th.game.table.discardModalTitle}>
        {orderedCards.map((card) => {
          const isSelected = selected.includes(card.id);
          const part = recruitmentParts.get(card.id);
          return (
            <button
              key={card.id}
              type="button"
              className={`discard-card ${isSelected ? 'is-selected' : ''}`}
              aria-pressed={isSelected}
              aria-label={fill(th.game.table.discardPickCard, {
                card: cardAria(card, part),
              })}
              data-testid={`discard-card-${card.id}`}
              data-card-id={card.id}
              disabled={busy}
              onClick={() => toggle(card.id)}
            >
              <InfluenceCard
                card={card}
                width={92}
                height={129}
                part={card.kind === 'recruitment' ? part : undefined}
              />
              {isSelected && (
                <span className="discard-card-check" aria-hidden="true">
                  <Check size={15} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="app-modal-actions">
        <Button
          variant="dark"
          className="table-btn discard-submit"
          data-testid="discard-submit"
          disabled={busy || selected.length !== need || need <= 0}
          onClick={() => onDiscard(selected)}
        >
          {busy && <Loader2 size={17} className="animate-spin" aria-hidden="true" />}
          {fill(th.game.table.discardSubmit, { count: need })}
        </Button>
      </div>
    </Modal>
  );
}
