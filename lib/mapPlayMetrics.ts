/**
 * Letterboxed "play" rectangle inside the map view: matches `contentFit="contain"` for the battlefield image.
 * Normalized grid/path coords (0–1) map to [originX, originX+playW] × [originY, originY+playH].
 */

export type MapPlayLayout = {
  viewW: number;
  viewH: number;
  originX: number;
  originY: number;
  playW: number;
  playH: number;
};

/** Gameplay fills the entire view (admin 16:9 preview, or fallback before layout runs). */
export function fullBleedMapPlayLayout(viewW: number, viewH: number): MapPlayLayout {
  const w = Math.max(1, viewW);
  const h = Math.max(1, viewH);
  return { viewW: w, viewH: h, originX: 0, originY: 0, playW: w, playH: h };
}

/**
 * @param imageAspectWOverH intrinsic width / height of the map bitmap
 */
export function computeMapPlayLayout(viewW: number, viewH: number, imageAspectWOverH: number): MapPlayLayout {
  const vw = Math.max(1, viewW);
  const vh = Math.max(1, viewH);
  const imgAspect = Number.isFinite(imageAspectWOverH) && imageAspectWOverH > 0 ? imageAspectWOverH : 16 / 9;
  const viewAspect = vw / vh;

  if (viewAspect > imgAspect) {
    const playH = vh;
    const playW = vh * imgAspect;
    return {
      viewW: vw,
      viewH: vh,
      originX: (vw - playW) / 2,
      originY: 0,
      playW,
      playH,
    };
  }

  const playW = vw;
  const playH = vw / imgAspect;
  return {
    viewW: vw,
    viewH: vh,
    originX: 0,
    originY: (vh - playH) / 2,
    playW,
    playH,
  };
}
