import type { DealRequirementGroup, DealSpace } from '@/engine/config/dealBoard';
import { DEAL_BOARD_SPACES } from '@/engine/config/dealBoard';
import { DEAL_TILES } from '@/engine/config/dealTiles';
import { FAMILY_ORDER, MAX_PLAYERS, type FamilyColor } from '@/engine/config/families';
import type { PublicDeal, PublicOffer, PublicState } from '@/engine/types';
import type { RoomPlayer, RoomPlayers } from '@/net/roomTypes';

import { FAMILY_BY_ID } from '@/ui/common/families';

export interface SeatEntry {
  uid: string;
  player: RoomPlayer;
}

export interface SeatLayout {
  top: SeatEntry[];
  left: SeatEntry | null;
  right: SeatEntry | null;
}

/**
 * Rotates the other players around the table relative to the local player.
 * The next seat clockwise always appears on the left, followed by the top
 * seats, with the previous seat on the right (plan.md 9.1).
 */
export function getSeatLayout(players: RoomPlayers, myUid: string): SeatLayout {
  const entries = Object.entries(players)
    .map(([uid, player]) => ({ uid, player }))
    .sort((a, b) => a.player.seat - b.player.seat);
  const me = entries.find((entry) => entry.uid === myUid);
  const mySeat = me?.player.seat ?? 0;
  const others = entries
    .filter((entry) => entry.uid !== myUid)
    .sort((a, b) => {
      const relativeA = (a.player.seat - mySeat + MAX_PLAYERS) % MAX_PLAYERS;
      const relativeB = (b.player.seat - mySeat + MAX_PLAYERS) % MAX_PLAYERS;
      return relativeA - relativeB;
    });

  if (others.length === 0) return { top: [], left: null, right: null };
  if (others.length === 1) return { top: [], left: others[0], right: null };
  if (others.length === 2) {
    return { top: [], left: others[0], right: others[1] };
  }

  return {
    top: others.slice(1, -1),
    left: others[0],
    right: others[others.length - 1],
  };
}

/** Grid position for the 16-space deal board (clockwise from top-left). */
export function getSpacePosition(space: number): { row: number; col: number } {
  if (space <= 5) return { row: 1, col: space };
  if (space <= 8) return { row: space - 4, col: 5 };
  if (space <= 13) return { row: 5, col: 14 - space };
  return { row: 18 - space, col: 1 };
}

export function getSpaceByIndex(index: number): DealSpace | null {
  return DEAL_BOARD_SPACES.find((space) => space.index === index) ?? null;
}

export function getCurrentSpace(publicState: PublicState): DealSpace | null {
  if (publicState.deal) return publicState.deal.requirements;
  return getSpaceByIndex(publicState.pawnSpace);
}

export function getSpaceStripe(space: DealSpace): string {
  const colors = [...new Set(space.groups.flatMap((group) => group.colors))];
  if (colors.length === 0) return 'var(--line)';
  const step = 100 / colors.length;
  const stops = colors.map((color, index) => {
    const start = index * step;
    const end = (index + 1) * step;
    return `var(${FAMILY_BY_ID[color].cssVar}) ${start}% ${end}%`;
  });
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

/**
 * Space -> deal tile number. Tiles are placed in order (#1, #2, ...) and the
 * engine appends each covered space to `closedSpaces`, so the position is the
 * tile number. The public log is trimmed and must not be used for this.
 */
export function getClosedTileMap(closedSpaces: readonly number[]): Map<number, number> {
  return new Map(closedSpaces.map((space, index) => [space, index + 1]));
}

export function getDealTileValue(tileNumber: number): number {
  return DEAL_TILES[tileNumber - 1]?.valuePerDividend ?? 0;
}

export function getPlayerName(players: RoomPlayers, uid: string | null | undefined): string {
  if (!uid) return '—';
  return players[uid]?.name ?? '—';
}

export function getBossAutoJoinColors(
  investors: readonly FamilyColor[],
  requirements: DealSpace,
  onVacation: readonly FamilyColor[],
): FamilyColor[] {
  const allowed = new Set(requirements.groups.flatMap((group) => group.colors));
  return [
    ...new Set(
      investors.filter((color) => allowed.has(color) && !onVacation.includes(color)),
    ),
  ];
}

export interface OverfilledGroup {
  group: DealRequirementGroup;
  participants: FamilyColor[];
  overflow: number;
}

export function getOverfilledGroups(
  requirements: DealSpace,
  autoJoin: readonly FamilyColor[],
): OverfilledGroup[] {
  return requirements.groups
    .map((group) => {
      const participants = autoJoin.filter((color) => group.colors.includes(color));
      return {
        group,
        participants,
        overflow: Math.max(0, participants.length - group.pick),
      };
    })
    .filter((entry) => entry.overflow > 0);
}

export function getExclusionCandidates(groups: OverfilledGroup[]): FamilyColor[] {
  return [...new Set(groups.flatMap((entry) => entry.participants))];
}

export function getRemainingExclusionNeed(
  requirements: DealSpace,
  autoJoin: readonly FamilyColor[],
  selected: readonly FamilyColor[],
): number {
  let remaining = 0;
  for (const group of requirements.groups) {
    const participants = autoJoin.filter((color) => group.colors.includes(color));
    const after = participants.filter((color) => !selected.includes(color)).length;
    remaining += Math.max(0, after - group.pick);
  }
  return remaining;
}

export function isExclusionPlanValid(
  requirements: DealSpace,
  autoJoin: readonly FamilyColor[],
  selected: readonly FamilyColor[],
): boolean {
  if (selected.some((color) => !autoJoin.includes(color))) return false;
  return getRemainingExclusionNeed(requirements, autoJoin, selected) === 0;
}

export interface DealParticipation {
  bossInvestorFree: FamilyColor[];
  bossClanFree: FamilyColor[];
  bossFree: FamilyColor[];
  accepted: Array<{ color: FamilyColor; uid: string; offer: PublicOffer }>;
  allColors: Set<FamilyColor>;
}

export function getDealParticipation(
  deal: PublicDeal,
  bossUid: string | null,
  tableInvestors: Record<string, FamilyColor[]>,
  onVacation: readonly FamilyColor[],
): DealParticipation {
  const allowed = new Set(deal.requirements.groups.flatMap((group) => group.colors));
  const bossInvestors = bossUid ? (tableInvestors[bossUid] ?? []) : [];
  const bossInvestorFree = [
    ...new Set(
      bossInvestors.filter(
        (color) =>
          allowed.has(color) &&
          !deal.excludedColors.includes(color) &&
          !onVacation.includes(color),
      ),
    ),
  ];
  const bossClanFree = [
    ...new Set(
      deal.bossClans.filter(
        (color) => allowed.has(color) && !onVacation.includes(color),
      ),
    ),
  ];
  const accepted: DealParticipation['accepted'] = [];
  for (const color of FAMILY_ORDER) {
    const uid = deal.acceptedOffers[color];
    if (!uid) continue;
    const offer = deal.offers[uid]?.[color];
    if (offer) accepted.push({ color, uid, offer });
  }
  const bossFree = [...new Set([...bossInvestorFree, ...bossClanFree])];
  const allColors = new Set<FamilyColor>([
    ...bossFree,
    ...accepted.map((entry) => entry.color),
  ]);

  return { bossInvestorFree, bossClanFree, bossFree, accepted, allColors };
}

export type GroupStatus = 'complete' | 'missing' | 'over';

export interface GroupProgress {
  group: DealRequirementGroup;
  count: number;
  missing: number;
  over: number;
  status: GroupStatus;
}

export function getGroupProgress(
  requirements: DealSpace,
  participating: ReadonlySet<FamilyColor>,
): GroupProgress[] {
  return requirements.groups.map((group) => {
    const count = group.colors.filter((color) => participating.has(color)).length;
    const missing = Math.max(0, group.pick - count);
    const over = Math.max(0, count - group.pick);
    const status: GroupStatus = missing > 0 ? 'missing' : over > 0 ? 'over' : 'complete';
    return { group, count, missing, over, status };
  });
}

export function isDealComplete(
  deal: PublicDeal,
  participating: ReadonlySet<FamilyColor>,
): boolean {
  if (participating.size !== deal.requirements.requiredInvestors) return false;
  const allowed = new Set(deal.requirements.groups.flatMap((group) => group.colors));
  for (const color of participating) {
    if (!allowed.has(color)) return false;
  }
  return deal.requirements.groups.every((group) => {
    const count = group.colors.filter((color) => participating.has(color)).length;
    return count === group.pick;
  });
}

export interface DealSegment {
  kind: 'accepted' | 'boss';
  color: FamilyColor | null;
  uid?: string;
}

export function getDealSegments(
  deal: PublicDeal,
  participation: DealParticipation,
): DealSegment[] {
  const segments: DealSegment[] = [];
  for (const entry of participation.accepted) {
    for (let index = 0; index < entry.offer.amount; index += 1) {
      segments.push({ kind: 'accepted', color: entry.color, uid: entry.uid });
    }
  }
  const acceptedTotal = segments.length;
  const bossCount = Math.max(0, deal.requirements.dividends - acceptedTotal);
  for (let index = 0; index < bossCount; index += 1) {
    const color =
      participation.bossFree.length > 0
        ? participation.bossFree[index % participation.bossFree.length]
        : null;
    segments.push({ kind: 'boss', color });
  }
  return segments;
}
