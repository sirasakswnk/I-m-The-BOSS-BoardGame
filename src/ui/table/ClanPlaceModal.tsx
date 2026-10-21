import { FAMILY_ORDER, type FamilyColor } from '@/engine/config/families';
import type { ClanCard as ClanCardData } from '@/engine/config/influenceCards';
import type { PrivateState, PublicState } from '@/engine/types';
import { th } from '@/i18n/th';
import { Button } from '@/ui/common/Button';
import { Modal } from '@/ui/common/Modal';
import { ClanCard } from '@/ui/common/influence';
import { FAMILY_BY_ID } from '@/ui/common/families';
import { FamilySymbol } from '@/ui/common/FamilySymbol';

interface ClanPlaceModalProps {
  uid: string;
  publicState: PublicState;
  privateState: PrivateState;
  pendingAction: string | null;
  onClose: () => void;
  onPlace: (cardId: string) => void;
}

export function ClanPlaceModal({
  uid,
  publicState,
  privateState,
  pendingAction,
  onClose,
  onPlace,
}: ClanPlaceModalProps) {
  const deal = publicState.deal;
  if (!deal) return null;

  const allowed = new Set(deal.requirements.groups.flatMap((group) => group.colors));
  const bossInvestors = publicState.tableInvestors[uid] ?? [];
  const acceptedColors = new Set(
    (Object.keys(deal.acceptedOffers) as FamilyColor[]).filter(
      (color) => Boolean(deal.acceptedOffers[color]),
    ),
  );
  const placedColors = new Set(deal.bossClans);
  const cards = privateState.hand
    .filter((card): card is ClanCardData => card.kind === 'clan')
    .filter((card) => allowed.has(card.color))
    .filter((card) => !placedColors.has(card.color))
    .filter((card) => !acceptedColors.has(card.color))
    .filter(
      (card) =>
        !bossInvestors.includes(card.color) || publicState.onVacation.includes(card.color),
    )
    .sort(
      (left, right) =>
        FAMILY_ORDER.indexOf(left.color) - FAMILY_ORDER.indexOf(right.color),
    );
  const busy = pendingAction !== null;

  return (
    <Modal
      title={th.game.table.placeClanTitle}
      eyebrow={th.game.table.placeClanEyebrow.replace('{space}', String(deal.space))}
      onClose={onClose}
      testId="clan-modal"
      className="clan-modal"
    >
      <p className="table-modal-hint">{th.game.table.placeClanHint}</p>

      {deal.bossClans.length > 0 && (
        <div className="table-placed-clans">
          <span>{th.game.table.placedClans}</span>
          {deal.bossClans.map((color) => (
            <span key={color} className="table-placed-clan">
              <FamilySymbol
                shape={FAMILY_BY_ID[color].symbol}
                size={13}
                style={{ color: `var(${FAMILY_BY_ID[color].cssVar})` }}
              />
              {th.families[color]}
            </span>
          ))}
        </div>
      )}

      {cards.length > 0 ? (
        <div className="table-offer-grid table-offer-grid-cards" data-testid="clan-grid">
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              className="table-offer-pick table-offer-pick-card"
              aria-label={th.game.table.placeClanCard.replace(
                '{color}',
                th.families[card.color],
              )}
              data-testid={`place-clan-${card.id}`}
              data-family={card.color}
              disabled={busy}
              onClick={() => {
                onPlace(card.id);
                onClose();
              }}
            >
              <ClanCard color={card.color} width={86} height={120} />
            </button>
          ))}
        </div>
      ) : (
        <p className="table-offer-empty">{th.game.table.placeClanEmpty}</p>
      )}

      <div className="app-modal-actions">
        <Button variant="light" className="table-btn" disabled={busy} onClick={onClose}>
          {th.common.close}
        </Button>
      </div>
    </Modal>
  );
}
