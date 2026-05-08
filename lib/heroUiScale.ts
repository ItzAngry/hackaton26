import { Platform } from 'react-native';

/** Desktop browser layouts where fixed layout px feels tiny vs the viewport. */
function webWide(windowWidth: number): boolean {
  return Platform.OS === 'web' && windowWidth > 480;
}

const WEB_DESKTOP_SPRITE_SCALE = 1.5;

/** Shop / battle sidebar hero cards — larger on desktop web. */
export function heroCardSpritePx(compact: boolean, windowWidth: number): number {
  const base = compact ? 44 : 56;
  return webWide(windowWidth) ? Math.round(base * WEB_DESKTOP_SPRITE_SCALE) : base;
}

/** Bottom bench roster chips in battle. */
export function benchRosterSpritePx(windowWidth: number): number {
  const base = 36;
  return webWide(windowWidth) ? Math.round(base * WEB_DESKTOP_SPRITE_SCALE) : base;
}

/** Selected defender stats sheet header. */
export function unitStatsHeroSpritePx(windowWidth: number): number {
  const base = 44;
  return webWide(windowWidth) ? Math.round(base * WEB_DESKTOP_SPRITE_SCALE) : base;
}
