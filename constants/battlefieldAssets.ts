import { Asset } from 'expo-asset';

/**
 * Battlefield background. Env: `EXPO_PUBLIC_SHOW_MAP_GRID`, `EXPO_PUBLIC_SHOW_MAP_GRID_LINES` — see tile-grid-overlay.
 */
export const BATTLEFIELD_MAP_IMAGE = require('../assets/images/pathnew.jpg');

/** Metro registry + expo-asset work on native and web; RN `Image.resolveAssetSource` is not available on web. */
const battlefieldAsset = Asset.fromModule(BATTLEFIELD_MAP_IMAGE);
/** Intrinsic pixel width of bundled map art (fallback 1920). */
export const BATTLEFIELD_MAP_PIXEL_W = battlefieldAsset.width ?? 1920;
/** Intrinsic pixel height of bundled map art (fallback 1080). */
export const BATTLEFIELD_MAP_PIXEL_H = battlefieldAsset.height ?? 1080;
/** width / height — used with `contentFit="contain"` so gameplay coords match the undistorted image. */
export const BATTLEFIELD_MAP_ASPECT = BATTLEFIELD_MAP_PIXEL_W / Math.max(1, BATTLEFIELD_MAP_PIXEL_H);

/** Quest dock art — bottom-centered peek / expanded panel in `QuestBookDock`. */
export const QUEST_BOOK_IMAGE = require('../assets/images/book.png');
