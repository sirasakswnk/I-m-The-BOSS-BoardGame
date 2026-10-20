export type FamilyId = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'black';

export type FamilySymbolShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'star' | 'hex';

export interface FamilyPresentation {
  id: FamilyId;
  /** CSS custom property holding the family color (defined in src/styles/global.css). */
  cssVar: `--${string}`;
  /** Shape used as the family symbol (also helps color-blind players). */
  symbol: FamilySymbolShape;
  /** Text color that reads well on top of the family color. */
  textOnFace: 'white' | 'ink';
}

/** Display order follows the family order in plan.md section 3.1 (A-F). */
export const FAMILY_BY_ID: Record<FamilyId, FamilyPresentation> = {
  red: { id: 'red', cssVar: '--red', symbol: 'circle', textOnFace: 'white' },
  blue: { id: 'blue', cssVar: '--blue', symbol: 'square', textOnFace: 'white' },
  green: { id: 'green', cssVar: '--green', symbol: 'triangle', textOnFace: 'white' },
  yellow: { id: 'yellow', cssVar: '--yellow', symbol: 'diamond', textOnFace: 'ink' },
  purple: { id: 'purple', cssVar: '--purple', symbol: 'star', textOnFace: 'white' },
  black: { id: 'black', cssVar: '--black', symbol: 'hex', textOnFace: 'white' },
};

export const FAMILY_PRESENTATION: readonly FamilyPresentation[] = Object.values(FAMILY_BY_ID);
