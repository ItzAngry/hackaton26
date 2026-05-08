/**
 * Repo-default placement pads (rock slots). Baked from the intended shipped map; empty means “any non-path grass”.
 * To sync from a browser session: copy `placementPads` from localStorage key `map-layout-v7` into this array.
 */
export const SHIPPED_PLACEMENT_PADS: ReadonlyArray<{ c: number; r: number; rock: 1 | 2 | 3 | 4 }> = [];
