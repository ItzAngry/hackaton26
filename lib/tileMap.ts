import {
  PATH_CELL_ORDER,
  TILE_COLS,
  TILE_ROWS,
  isBuildable,
} from '@/constants/mapTileGrid';

/** Tower arc width along normalized path (same role as legacy lane band). */
export const ATTACK_RANGE_PATH = 0.12;

export function tileCenterNorm(c: number, r: number): { nx: number; ny: number } {
  return { nx: (c + 0.5) / TILE_COLS, ny: (r + 0.5) / TILE_ROWS };
}

export function tileCenterLayoutPx(c: number, r: number, mapW: number, mapH: number): { x: number; y: number } {
  const { nx, ny } = tileCenterNorm(c, r);
  return { x: nx * mapW, y: ny * mapH };
}

export function pickTileFromLocalPx(
  layoutX: number,
  layoutY: number,
  mapW: number,
  mapH: number
): { c: number; r: number } | null {
  const lx = Number(layoutX);
  const ly = Number(layoutY);
  const w = Number(mapW);
  const h = Number(mapH);
  if (!Number.isFinite(lx) || !Number.isFinite(ly) || !Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return null;
  }
  const nx = lx / w;
  const ny = ly / h;
  let c = Math.floor(nx * TILE_COLS);
  let r = Math.floor(ny * TILE_ROWS);
  c = Math.max(0, Math.min(TILE_COLS - 1, c));
  r = Math.max(0, Math.min(TILE_ROWS - 1, r));
  return { c, r };
}

const pathLen = PATH_CELL_ORDER.length;
const pathArcTotal = Math.max(1, pathLen - 1);

/** pathProgress 1 = spawn (path index 0), 0 = goal (last index). */
export function pathProgressToLayoutPx(
  pathProgress: number,
  mapW: number,
  mapH: number
): { x: number; y: number } {
  if (pathLen < 2) {
    const p = PATH_CELL_ORDER[0];
    return tileCenterLayoutPx(p.c, p.r, mapW, mapH);
  }
  const p = Math.max(0, Math.min(1, pathProgress));
  const fi = (1 - p) * (pathLen - 1);
  const i0 = Math.floor(fi);
  const i1 = Math.min(pathLen - 1, i0 + 1);
  const t = fi - i0;
  const a = PATH_CELL_ORDER[i0];
  const b = PATH_CELL_ORDER[i1];
  const pa = tileCenterLayoutPx(a.c, a.r, mapW, mapH);
  const pb = tileCenterLayoutPx(b.c, b.r, mapW, mapH);
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
export function nearestPathProgressFromTile(c: number, r: number): number {
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

export function tryTilePlacementTap(
  layoutX: number,
  layoutY: number,
  mapW: number,
  mapH: number
): TilePlacementResult {
  const lx = Number(layoutX);
  const ly = Number(layoutY);
  const w = Number(mapW);
  const h = Number(mapH);
  if (!Number.isFinite(lx) || !Number.isFinite(ly) || !Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return { ok: false, reason: 'bad_touch' };
  }
  if (lx < 0 || ly < 0 || lx > w || ly > h) {
    return { ok: false, reason: 'bad_touch' };
  }
  const picked = pickTileFromLocalPx(lx, ly, mapW, mapH);
  if (!picked) {
    return { ok: false, reason: 'bad_touch' };
  }
  const { c, r } = picked;
  if (!isBuildable(c, r)) {
    return { ok: false, reason: 'not_buildable' };
  }
  const { nx, ny } = tileCenterNorm(c, r);
  const pathCover = nearestPathProgressFromTile(c, r);
  return { ok: true, c, r, pathCover, nx, ny };
}
