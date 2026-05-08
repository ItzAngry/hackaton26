import type { HeroFrame } from '@/constants/heroDefinitions';

/** LibreSprite horizontal strip: 8×64×64 frames on a 512×64 sheet (all four walk directions match). */
export const SLIME_FRAME_SIZE = 64;
export const SLIME_SHEET_W = 512;
export const SLIME_SHEET_H = 64;
export const SLIME_FRAME_COUNT = 8;
export const SLIME_FRAME_MS = 100;

/** On-map enemy slime sprite (LibreSprite strip scales to this square). Min size; actual token scales up on large map views. */
export const SLIME_DISPLAY_SIZE = 80;

export function slimeWalkFrames(): HeroFrame[] {
  return Array.from({ length: SLIME_FRAME_COUNT }, (_, i) => ({
    x: i * SLIME_FRAME_SIZE,
    y: 0,
    w: SLIME_FRAME_SIZE,
    h: SLIME_FRAME_SIZE,
    d: SLIME_FRAME_MS,
  }));
}

export const SLIME_WALK_FRAMES = slimeWalkFrames();

export const SLIME_WALK_SHEETS = {
  front: require('../assets/images/enemies/Slime1_Walk_front.png'),
  back: require('../assets/images/enemies/Slime1_Walk_back.png'),
  left: require('../assets/images/enemies/Slime1_Walk_left.png'),
  right: require('../assets/images/enemies/Slime1_Walk_right.png'),
} as const;

export type SlimeFacing = keyof typeof SLIME_WALK_SHEETS;
