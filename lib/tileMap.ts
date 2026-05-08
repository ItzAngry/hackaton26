import { TILE_COLS, TILE_ROWS } from '@/constants/mapTileGrid';
import { interpolateAlongPolylinePx, nearestPathProgressFromCellCenter } from '@/lib/mapGeometry';
import { fullBleedMapPlayLayout, type MapPlayLayout } from '@/lib/mapPlayMetrics';

import { useMapLayoutStore } from '@/store/useMapLayoutStore';

/** Tower arc width along normalized path (same role as legacy lane band). */
export const ATTACK_RANGE_PATH = 0.12;

export function tileCenterNorm(c: number, r: number): { nx: number; ny: number } {
  return { nx: (c + 0.5) / TILE_COLS, ny: (r + 0.5) / TILE_ROWS };
}

export function tileCenterLayoutPx(c: number, r: number, layout: MapPlayLayout): { x: number; y: number } {
  const { nx, ny } = tileCenterNorm(c, r);
  return {
    x: layout.originX + nx * layout.playW,
    y: layout.originY + ny * layout.playH,
  };
}

export function pickTileFromLocalPx(
  layoutX: number,
  layoutY: number,
  layout: MapPlayLayout
): { c: number; r: number } | null {
  const lx = Number(layoutX);
  const ly = Number(layoutY);
  const pw = Number(layout.playW);
  const ph = Number(layout.playH);
  if (!Number.isFinite(lx) || !Number.isFinite(ly) || !Number.isFinite(pw) || !Number.isFinite(ph) || pw <= 0 || ph <= 0) {
    return null;
  }
  const nx = (lx - layout.originX) / pw;
  const ny = (ly - layout.originY) / ph;
  if (nx < 0 || nx > 1 || ny < 0 || ny > 1) {
    return null;
  }
  let c = Math.floor(nx * TILE_COLS);
  let r = Math.floor(ny * TILE_ROWS);
  c = Math.max(0, Math.min(TILE_COLS - 1, c));
  r = Math.max(0, Math.min(TILE_ROWS - 1, r));
  return { c, r };
}

function pathCellOrderLive() {
  return useMapLayoutStore.getState().pathCellOrder;
}

function pathPolylineLive() {
  return useMapLayoutStore.getState().pathPolylineNorm;
}

function battleMapLayoutLive(): MapPlayLayout {
  const st = useMapLayoutStore.getState();
  return st.battleMapLayout ?? fullBleedMapPlayLayout(400, 225);
}

/** pathProgress 1 = spawn (path index 0), 0 = goal (last index). */
export function pathProgressToLayoutPx(pathProgress: number, layout: MapPlayLayout): { x: number; y: number } {
  const poly = pathPolylineLive();
  if (poly.length >= 2) {
    return interpolateAlongPolylinePx(pathProgress, poly, layout);
  }

  const PATH_CELL_ORDER = pathCellOrderLive();
  const pathLen = PATH_CELL_ORDER.length;
  if (pathLen < 2) {
    const p = PATH_CELL_ORDER[0];
    return tileCenterLayoutPx(p.c, p.r, layout);
  }
  const p = Math.max(0, Math.min(1, pathProgress));
  const fi = (1 - p) * (pathLen - 1);
  const i0 = Math.floor(fi);
  const i1 = Math.min(pathLen - 1, i0 + 1);
  const t = fi - i0;
  const a = PATH_CELL_ORDER[i0];
  const b = PATH_CELL_ORDER[i1];
  const pa = tileCenterLayoutPx(a.c, a.r, layout);
  const pb = tileCenterLayoutPx(b.c, b.r, layout);
  return {
    x: pa.x * (1 - t) + pb.x * t,
    y: pa.y * (1 - t) + pb.y * t,
  };
}

type Pt = { x: number; y: number };

function cellCenterPt(cell: { c: number; r: number }): Pt {
  return { x: cell.c + 0.5, y: cell.r + 0.5 };
}

function closestOnSegment(h: Pt, a: Pt, b: Pt): { q: Pt; segT: number } {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  if (len2 < 1e-12) return { q: { ...a }, segT: 0 };
  let t = ((h.x - a.x) * abx + (h.y - a.y) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  return { q: { x: a.x + abx * t, y: a.y + aby * t }, segT: t };
}

/**
 * Path coverage scalar for a buildable tile: maps hero tile to [0,1] path axis
 * using closest point on path polyline (grid cell center space).
 */
export function nearestPathProgressFromTile(c: number, r: number, layout?: MapPlayLayout): number {
  const L = layout ?? battleMapLayoutLive();
  const poly = pathPolylineLive();
  if (poly.length >= 2) {
    return nearestPathProgressFromCellCenter(c, r, poly, L, TILE_COLS, TILE_ROWS);
  }

  const PATH_CELL_ORDER = pathCellOrderLive();
  const pathLen = PATH_CELL_ORDER.length;
  const pathArcTotal = Math.max(1, pathLen - 1);
  const h = cellCenterPt({ c, r });
  let bestDistSq = Infinity;
  let bestArc = 0;

  for (let i = 0; i < pathLen - 1; i++) {
    const a = cellCenterPt(PATH_CELL_ORDER[i]);
    const b = cellCenterPt(PATH_CELL_ORDER[i + 1]);
    const { q, segT } = closestOnSegment(h, a, b);
    const dx = q.x - h.x;
    const dy = q.y - h.y;
    const d = dx * dx + dy * dy;
    if (d < bestDistSq) {
      bestDistSq = d;
      bestArc = i + segT;
    }
  }

  return 1 - bestArc / pathArcTotal;
}

export function pathAttackBand(pathCover: number): { lo: number; hi: number } {
  const pos = Math.max(0, Math.min(1, pathCover));
  return {
    lo: Math.max(0, pos - 0.05),
    hi: Math.min(1, pos + ATTACK_RANGE_PATH + 0.38),
  };
}

export type TilePlacementResult =
  | { ok: true; c: number; r: number; pathCover: number; nx: number; ny: number }
  | { ok: false; reason: 'not_buildable' | 'bad_touch' };

export function tryTilePlacementTap(layoutX: number, layoutY: number, layout: MapPlayLayout): TilePlacementResult {
  const lx = Number(layoutX);
  const ly = Number(layoutY);
  const vw = layout.viewW;
  const vh = layout.viewH;
  if (!Number.isFinite(lx) || !Number.isFinite(ly) || !Number.isFinite(vw) || !Number.isFinite(vh) || vw <= 0 || vh <= 0) {
    return { ok: false, reason: 'bad_touch' };
  }
  if (lx < 0 || ly < 0 || lx > vw || ly > vh) {
    return { ok: false, reason: 'bad_touch' };
  }
  const picked = pickTileFromLocalPx(lx, ly, layout);
  if (!picked) {
    return { ok: false, reason: 'bad_touch' };
  }
  const { c, r } = picked;
  if (!useMapLayoutStore.getState().isBuildableTile(c, r)) {
    return { ok: false, reason: 'not_buildable' };
  }
  const { nx, ny } = tileCenterNorm(c, r);
  const pathCover = nearestPathProgressFromTile(c, r, layout);
  return { ok: true, c, r, pathCover, nx, ny };
}
