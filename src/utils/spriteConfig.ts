export type SpriteAnimState =
  | 'idle'
  | 'walk-right' | 'walk-left' | 'walk-up' | 'walk-down'
  | 'attack' | 'hit' | 'death';

interface AnimDef {
  row: number;
  frames: number;
  startFrame?: number;
  fps?: number;
  freeze?: boolean; // stay on last frame instead of looping
}

export interface SpritesheetConfig {
  sheet: string;
  frameW: number;
  frameH: number;
  cols: number;
  rows: number;
  animations: Record<SpriteAnimState, AnimDef>;
}

// Résout la config spritesheet : DB d'abord, SPRITE_CONFIG en fallback
export function resolveSpriteConfig(
  imageUrl: string | null | undefined,
  dbConfig?: SpritesheetConfig | null,
): SpritesheetConfig | undefined {
  if (dbConfig) return dbConfig;
  if (imageUrl) return SPRITE_CONFIG[imageUrl];
  return undefined;
}

// Clé = imageUrl statique de la race/monstre
export const SPRITE_CONFIG: Record<string, SpritesheetConfig> = {
  '/assets/races/archer-homme.png': {
    sheet: '/assets/races/archer-homme-sheet.png',
    frameW: 256,
    frameH: 384,
    cols: 4,
    rows: 7,
    animations: {
      'walk-right': { row: 0, frames: 4, fps: 8 },
      'walk-left':  { row: 1, frames: 4, fps: 8 },
      'walk-down':  { row: 2, frames: 4, fps: 8 },
      'walk-up':    { row: 3, frames: 4, fps: 8 },
      'idle':       { row: 4, frames: 1, fps: 1 },
      'attack':     { row: 5, frames: 3, fps: 8 },
      'hit':        { row: 5, frames: 1, startFrame: 3, fps: 1 },
      'death':      { row: 6, frames: 3, fps: 4, freeze: true },
    },
  },
  '/assets/races/vampire-homme.png': {
    sheet: '/assets/races/vampire-homme-sheet.png',
    frameW: 256,
    frameH: 384,
    cols: 4,
    rows: 6,
    animations: {
      // col 0 = label source → on démarre à col 1. Col 3 vide → seulement 2 frames valides
      'walk-right': { row: 0, frames: 2, startFrame: 1, fps: 8 },
      'walk-left':  { row: 1, frames: 2, startFrame: 1, fps: 8 },
      'walk-down':  { row: 2, frames: 2, startFrame: 1, fps: 8 },
      'walk-up':    { row: 3, frames: 2, startFrame: 1, fps: 8 },
      // idle : frame dédié row 4 col 0 (pose statique)
      'idle':       { row: 4, frames: 1, fps: 1 },
      'attack':     { row: 4, frames: 2, startFrame: 1, fps: 8 },
      'hit':        { row: 4, frames: 1, startFrame: 3, fps: 1 },
      'death':      { row: 5, frames: 1, fps: 4, freeze: true },
    },
  },
  '/assets/races/archer-femme.png': {
    sheet: '/assets/races/archer-femme-sheet.png',
    frameW: 256,
    frameH: 384,
    cols: 4,
    rows: 7,
    animations: {
      'walk-right': { row: 0, frames: 4, fps: 8 },
      'walk-left':  { row: 1, frames: 4, fps: 8 },
      'walk-down':  { row: 2, frames: 4, fps: 8 },
      'walk-up':    { row: 3, frames: 4, fps: 8 },
      'idle':       { row: 4, frames: 1, fps: 1 },
      'attack':     { row: 5, frames: 4, fps: 8 },
      'hit':        { row: 5, frames: 1, startFrame: 3, fps: 1 },
      'death':      { row: 6, frames: 1, fps: 4, freeze: true },
    },
  },
};
