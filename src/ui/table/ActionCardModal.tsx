import { Ban, Check, Loader2 } from 'lucide-react';
import { useState } from 'react';

import type { FamilyColor } from '@/engine/config/families';
import { RECRUITMENT_PLAY_COUNT } from '@/engine/config/rules';
import type { PrivateState, PublicState, TravelTarget } from '@/engine/types';
import { th } from '@/i18n/th';
import type { ActionIntent } from '@/net/actions';
import type { RoomPlayers } from '@/net/roomTypes';
import { Button } from '@/ui/common/Button';
import { Modal } from '@/ui/common/Modal';
import { FAMILY_BY_ID } from '@/ui/common/families';
import { FamilySymbol } from '@/ui/common/FamilySymbol';
import { InfluenceCard, getRecruitmentPartMap } from '@/ui/common/influence';

import { actionBlockText, fillText, pendingTargetText } from './actionCopy';
import {
  getActionBlockReason,
  getActionCards,
  getRecruitmentTargets,
  getStopTargets,
  getTravelTargets,
  travelTargetKey,
  type ActionCard,
  type RecruitmentTargetOption,
  type StopTargetOption,
  type TravelTargetOption,
} from './actionUtils';
import { getPlayerName } from './tableUtils';

interface ActionCardModalProps {
  uid: string;
  players: RoomPlayers;
  publicState: PublicState;
  privateState: PrivateState;
  pendingAction: string | null;
  onClose: () => void;
  onSubmit: (intent: ActionIntent) => void;
}

function travelColorText(color: FamilyColor | 'wild'): string {
  return color === 'wild' ? th.game.cards.wild : th.families[color];
}

function actionCardLabel(card: ActionCard): string {
  const name = th.game.cards[card.kind];
  return card.kind === 'travel'
    ? `${name} ${travelColorText(card.color)}`
    : name;
}

function TargetSymbol({ color }: { color: FamilyColor }) {
  const family = FAMILY_BY_ID[color];
  return (
    <span className="action-card-target-symbol" style={{ color: `var(${family.cssVar})` }}>
      <FamilySymbol shape={family.symbol} size={17} />
    </span>
  );
}

/**
 * One modal handles every action-card flow: card selection, the target needed
 * by the card, and a single submit that sends the engine action. Recruitment
 * cards are selected as a triptych and submitted together.
 */
export function ActionCardModal({
  uid,
  players,
  publicState,
  privateState,
  pendingAction,
  onClose,
  onSubmit,
}: ActionCardModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [travelKey, setTravelKey] = useState<string | null>(null);
  const [recruitColor, setRecruitColor] = useState<FamilyColor | null>(null);
  const [stopId, setStopId] = useState<string | null>(null);

  const deal = publicState.deal;
  if (!deal) return null;

  const copy = th.game.table.actions;
  const actionCards = getActionCards(privateState.hand);
  const partMap = getRecruitmentPartMap(privateState.hand);
  const selectedCards = actionCards.filter((card) => selectedIds.includes(card.id));
  const selectedCard = selectedCards[0] ?? null;
  const selectedKind = selectedCard?.kind ?? null;
  const busy = pendingAction !== null;

  const travelTargets =
    selectedCard?.kind === 'travel'
      ? getTravelTargets(publicState, uid, selectedCard)
      : [];
  const selectedTravel =
    travelTargets.find((option) => travelTargetKey(option.target) === travelKey) ??
    null;
  const recruitmentTargets =
    selectedKind === 'recruitment'
      ? getRecruitmentTargets(publicState, uid)
      : [];
  const selectedRecruit =
    recruitmentTargets.find((option) => option.color === recruitColor) ?? null;
  const stopTargets =
    selectedKind === 'stop' ? getStopTargets(publicState, uid) : [];
  const selectedStop =
    stopTargets.find((option) => option.pendingId === stopId) ?? null;

  const recruitmentReady =
    selectedKind === 'recruitment' &&
    selectedCards.length === RECRUITMENT_PLAY_COUNT;
  const targetReady =
    selectedKind === 'travel'
      ? selectedTravel !== null
      : selectedKind === 'recruitment'
        ? recruitmentReady && selectedRecruit !== null
        : selectedKind === 'stop'
          ? selectedStop !== null
          : selectedKind === 'imTheBoss';
  const canSubmit = !busy && selectedCard !== null && targetReady;

  let submitNote: string | undefined;
  if (selectedKind === 'recruitment' && selectedCards.length < RECRUITMENT_PLAY_COUNT) {
    submitNote = fillText(copy.recruitmentNeed, {
      count: RECRUITMENT_PLAY_COUNT - selectedCards.length,
    });
  } else if (selectedCard && !targetReady) {
    submitNote = copy.needTarget;
  }

  function resetTarget() {
    setTravelKey(null);
    setRecruitColor(null);
    setStopId(null);
  }

  function toggleCard(card: ActionCard) {
    if (busy) return;
    resetTarget();

    if (card.kind === 'recruitment') {
      setSelectedIds((previous) => {
        if (previous.includes(card.id)) {
          return previous.filter((id) => id !== card.id);
        }
        const previousCards = actionCards.filter((held) =>
          previous.includes(held.id),
        );
        const hasOtherKind = previousCards.some(
          (held) => held.kind !== 'recruitment',
        );
        if (hasOtherKind) return [card.id];
        if (previous.length >= RECRUITMENT_PLAY_COUNT) return previous;
        return [...previous, card.id];
      });
      return;
    }

    setSelectedIds((previous) =>
      previous.length === 1 && previous[0] === card.id ? [] : [card.id],
    );
  }

  function handleSubmit() {
    if (!canSubmit || !selectedCard) return;

    if (selectedCard.kind === 'travel' && selectedTravel) {
      const target: TravelTarget = selectedTravel.target;
      onSubmit({ type: 'PLAY_TRAVEL', cardId: selectedCard.id, target });
    } else if (selectedCard.kind === 'recruitment' && selectedRecruit) {
      onSubmit({
        type: 'PLAY_RECRUITMENT',
        cardIds: selectedCards.map((card) => card.id),
        targetColor: selectedRecruit.color,
      });
    } else if (selectedCard.kind === 'stop' && selectedStop) {
      onSubmit({
        type: 'PLAY_STOP',
        cardId: selectedCard.id,
        targetPendingId: selectedStop.pendingId,
      });
    } else if (selectedCard.kind === 'imTheBoss') {
      onSubmit({ type: 'PLAY_IM_THE_BOSS', cardId: selectedCard.id });
    } else {
      return;
    }

    onClose();
  }

  const allBlocked =
    actionCards.length > 0 &&
    actionCards.every(
      (card) => getActionBlockReason(card, publicState, uid, privateState.hand) !== null,
    );

  return (
    <Modal
      title={copy.title}
      eyebrow={fillText(copy.eyebrow, { space: deal.space })}
      onClose={onClose}
      testId="action-card-modal"
      className="action-card-modal"
    >
      <p className="table-modal-hint">{copy.hint}</p>

      {actionCards.length === 0 ? (
        <p className="action-card-empty" data-testid="action-empty">
          {copy.emptyHand}
        </p>
      ) : (
        <section className="action-card-section" aria-label={copy.pickCard}>
          <div className="action-card-section-head">
            <strong>{copy.pickCard}</strong>
            <span>{fillText(copy.cardCount, { count: actionCards.length })}</span>
          </div>
          <div className="action-card-grid" data-testid="action-card-grid">
            {actionCards.map((card) => {
              const block = getActionBlockReason(
                card,
                publicState,
                uid,
                privateState.hand,
              );
              const selected = selectedIds.includes(card.id);
              const blockText = actionBlockText(block);
              return (
                <button
                  key={card.id}
                  type="button"
                  className={`action-card-choice ${selected ? 'is-selected' : ''}`}
                  data-testid={`action-card-${card.id}`}
                  data-action-kind={card.kind}
                  aria-pressed={selected}
                  aria-label={actionCardLabel(card)}
                  title={blockText}
                  disabled={busy || block !== null}
                  onClick={() => toggleCard(card)}
                >
                  <InfluenceCard
                    card={card}
                    width={84}
                    height={118}
                    part={
                      card.kind === 'recruitment' ? partMap.get(card.id) : undefined
                    }
                  />
                  {selected && (
                    <span className="action-card-check" aria-hidden="true">
                      <Check size={13} strokeWidth={3.4} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="action-card-faded-note">{copy.disabledHint}</p>
          {allBlocked && (
            <p className="table-modal-error" data-testid="action-no-playable">
              {copy.noPlayable}
            </p>
          )}
        </section>
      )}

      {selectedCard && (
        <section className="action-card-section" data-testid="action-targets">
          <div className="action-card-section-head">
            <strong>
              {selectedKind === 'travel'
                ? copy.travelTarget
                : selectedKind === 'recruitment'
                  ? copy.recruitmentTarget
                  : selectedKind === 'stop'
                    ? copy.stopTarget
                    : copy.selectedTitle}
            </strong>
            {selectedKind === 'recruitment' && (
              <span data-testid="action-recruitment-count">
                {fillText(copy.selected, {
                  count: selectedCards.length,
                  total: RECRUITMENT_PLAY_COUNT,
                })}
              </span>
            )}
          </div>

          {selectedKind === 'travel' && (
            <>
              {travelTargets.length === 0 ? (
                <p className="table-modal-error">{copy.travelNoTarget}</p>
              ) : (
                <div className="action-card-targets">
                  {travelTargets.map((option) => (
                    <TravelTargetButton
                      key={travelTargetKey(option.target)}
                      option={option}
                      players={players}
                      selected={selectedTravel?.target === option.target}
                      onSelect={() => setTravelKey(travelTargetKey(option.target))}
                    />
                  ))}
                </div>
              )}
              <p className="action-card-note">{copy.travelSelf}</p>
            </>
          )}

          {selectedKind === 'recruitment' && (
            <>
              {recruitmentTargets.length === 0 ? (
                <p className="table-modal-error">{copy.recruitmentNoTarget}</p>
              ) : (
                <div className="action-card-targets">
                  {recruitmentTargets.map((option) => (
                    <RecruitmentTargetButton
                      key={`${option.from}-${option.ownerUid ?? 'table'}-${option.color}`}
                      option={option}
                      players={players}
                      selected={selectedRecruit?.color === option.color}
                      onSelect={() => setRecruitColor(option.color)}
                    />
                  ))}
                </div>
              )}
              {publicState.unclaimedInvestors.length > 0 && (
                <p className="action-card-note">{copy.recruitmentUnclaimed}</p>
              )}
            </>
          )}

          {selectedKind === 'stop' && (
            <>
              {stopTargets.length === 0 ? (
                <p className="table-modal-error">{copy.stopNoTarget}</p>
              ) : (
                <div className="action-card-targets">
                  {stopTargets.map((option) => (
                    <StopTargetButton
                      key={option.pendingId}
                      option={option}
                      players={players}
                      selected={selectedStop?.pendingId === option.pendingId}
                      onSelect={() => setStopId(option.pendingId)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {selectedKind === 'imTheBoss' && (
            <p className="action-card-note">{copy.noTargetNeeded}</p>
          )}
        </section>
      )}

      <div className="app-modal-actions">
        <Button
          variant="light"
          className="table-btn"
          data-testid="action-cancel"
          disabled={busy}
          onClick={onClose}
        >
          {copy.cancel}
        </Button>
        <Button
          variant="dark"
          className="table-btn"
          data-testid="action-submit"
          disabled={!canSubmit}
          title={submitNote}
          onClick={handleSubmit}
        >
          {busy && <Loader2 size={17} className="animate-spin" aria-hidden="true" />}
          {copy.submit}
        </Button>
      </div>
      {submitNote && (
        <p className="table-modal-error" role="status">
          {submitNote}
        </p>
      )}
    </Modal>
  );
}

function TravelTargetButton({
  option,
  players,
  selected,
  onSelect,
}: {
  option: TravelTargetOption;
  players: RoomPlayers;
  selected: boolean;
  onSelect: () => void;
}) {
  const copy = th.game.table.actions;
  const name = getPlayerName(players, option.ownerUid);
  const detail =
    option.placement === 'investor'
      ? fillText(copy.targetInvestor, { name })
      : option.placement === 'bossClan'
        ? copy.targetBossClan
        : fillText(copy.targetOffer, { name });

  return (
    <button
      type="button"
      className={`action-card-target ${selected ? 'is-selected' : ''}`}
      data-testid={`action-target-${travelTargetKey(option.target)}`}
      data-target-kind={option.placement}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <TargetSymbol color={option.color} />
      <span>
        <strong>{th.families[option.color]}</strong>
        <small>{detail}</small>
      </span>
    </button>
  );
}

function RecruitmentTargetButton({
  option,
  players,
  selected,
  onSelect,
}: {
  option: RecruitmentTargetOption;
  players: RoomPlayers;
  selected: boolean;
  onSelect: () => void;
}) {
  const copy = th.game.table.actions;
  const detail =
    option.from === 'unclaimed'
      ? copy.targetUnclaimed
      : fillText(copy.targetOwner, {
          name: getPlayerName(players, option.ownerUid),
        });

  return (
    <button
      type="button"
      className={`action-card-target ${selected ? 'is-selected' : ''}`}
      data-testid={`action-target-recruit-${option.ownerUid ?? 'table'}-${option.color}`}
      data-target-kind="recruit"
      aria-pressed={selected}
      onClick={onSelect}
    >
      <TargetSymbol color={option.color} />
      <span>
        <strong>{th.families[option.color]}</strong>
        <small>{detail}</small>
      </span>
    </button>
  );
}

function StopTargetButton({
  option,
  players,
  selected,
  onSelect,
}: {
  option: StopTargetOption;
  players: RoomPlayers;
  selected: boolean;
  onSelect: () => void;
}) {
  const pending = option.pending;
  const target = pendingTargetText(pending.target, players);
  return (
    <button
      type="button"
      className={`action-card-target ${selected ? 'is-selected' : ''}`}
      data-testid={`action-target-stop-${option.pendingId}`}
      data-target-kind="stop"
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="action-card-target-symbol is-stop">
        <Ban size={17} strokeWidth={2.8} />
      </span>
      <span>
        <strong>{th.game.cards[pending.kind]}</strong>
        <small>
          {getPlayerName(players, pending.playerUid)}
          {target ? ` · ${target}` : ''}
        </small>
      </span>
    </button>
  );
}
