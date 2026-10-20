/**
 * Deal tiles - plan.md section 3.3.
 *
 * Tile #n is used when the n-th deal is closed. The value per dividend grows
 * with the deal count; tiles #10-#14 may end the game on a die face, and #15
 * always ends the game.
 */
export interface DealTile {
  number: number;
  valuePerDividend: number;
  endCheckFaces: number[];
  autoEnd?: boolean;
}

export const DEAL_TILES: DealTile[] = [
  { number: 1, valuePerDividend: 2, endCheckFaces: [] },
  { number: 2, valuePerDividend: 2, endCheckFaces: [] },
  { number: 3, valuePerDividend: 2, endCheckFaces: [] },
  { number: 4, valuePerDividend: 3, endCheckFaces: [] },
  { number: 5, valuePerDividend: 3, endCheckFaces: [] },
  { number: 6, valuePerDividend: 3, endCheckFaces: [] },
  { number: 7, valuePerDividend: 4, endCheckFaces: [] },
  { number: 8, valuePerDividend: 4, endCheckFaces: [] },
  { number: 9, valuePerDividend: 4, endCheckFaces: [] },
  { number: 10, valuePerDividend: 5, endCheckFaces: [1] },
  { number: 11, valuePerDividend: 5, endCheckFaces: [1, 2] },
  { number: 12, valuePerDividend: 5, endCheckFaces: [1, 2, 3] },
  { number: 13, valuePerDividend: 5, endCheckFaces: [1, 2, 3, 4] },
  { number: 14, valuePerDividend: 5, endCheckFaces: [1, 2, 3, 4, 5] },
  { number: 15, valuePerDividend: 5, endCheckFaces: [], autoEnd: true },
];

export function getDealTile(number: number): DealTile {
  const tile = DEAL_TILES[number - 1];
  if (!tile) {
    throw new Error(`Unknown deal tile: ${number}`);
  }
  return tile;
}
