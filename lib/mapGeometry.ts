/** Normalized map coords: x,y in [0,1], origin top-left. */

import type { MapPlayLayout } from '@/lib/mapPlayMetrics';

export type NormPt = { x: number; y: number };

function normToPx(pt: NormPt, L: MapPlayLayout): { x: number; y: number } {
  return { x: L.originX + pt.x * L.playW, y: L.originY + pt.y * L.playH };
}

export function pointInPolygon(pt: NormPt, polygon: NormPt[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect =
      yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function distPointToSegmentPx(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  if (len2 < 1e-12) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * abx + (py - ay) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + abx * t;
  const qy = ay + aby * t;
  return Math.hypot(px - qx, py - qy);
}

type PxPt = { x: number; y: number };

function closestOnSegmentPx(h: PxPt, a: PxPt, b: PxPt): { q: PxPt; segT: number } {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  if (len2 < 1e-12) return { q: { ...a }, segT: 0 };
  let t = ((h.x - a.x) * abx + (h.y - a.y) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  return { q: { x: a.x + abx * t, y: a.y + aby * t }, segT: t };
}

export function distPxToPolylinePx(
  px: number,
  py: number,
  polyNorm: NormPt[],
  layout: MapPlayLayout
): number {
  if (polyNorm.length < 2) return Infinity;
  let best = Infinity;
  for (let i = 0; i < polyNorm.length - 1; i++) {
    const a = normToPx(polyNorm[i], layout);
    const b = normToPx(polyNorm[i + 1], layout);
    best = Math.min(best, distPointToSegmentPx(px, py, a.x, a.y, b.x, b.y));
  }
  return best;
}

/** Closest point on the polyline (pixel space) and distance to (px, py). */
export function closestPointOnPolylinePx(
  px: number,
  py: number,
  polyNorm: NormPt[],
  layout: MapPlayLayout
): { x: number; y: number; dist: number } {
  if (polyNorm.length < 1) return { x: px, y: py, dist: Infinity };
  if (polyNorm.length < 2) {
    const q = normToPx(polyNorm[0], layout);
    return { x: q.x, y: q.y, dist: Math.hypot(px - q.x, py - q.y) };
  }
  let bestDist = Infinity;
  let bestX = px;
  let bestY = py;
  for (let i = 0; i < polyNorm.length - 1; i++) {
    const a = normToPx(polyNorm[i], layout);
    const b = normToPx(polyNorm[i + 1], layout);
    const { q } = closestOnSegmentPx({ x: px, y: py }, { x: a.x, y: a.y }, { x: b.x, y: b.y });
    const d = Math.hypot(px - q.x, py - q.y);
    if (d < bestDist) {
      bestDist = d;
      bestX = q.x;
      bestY = q.y;
    }
  }
  return { x: bestX, y: bestY, dist: bestDist };
}

export function polylineArcLengthPx(polyNorm: NormPt[], layout: MapPlayLayout): number {
  let len = 0;
  for (let i = 0; i < polyNorm.length - 1; i++) {
    const a = polyNorm[i];
    const b = polyNorm[i + 1];
    const dx = (b.x - a.x) * layout.playW;
    const dy = (b.y - a.y) * layout.playH;
    len += Math.hypot(dx, dy);
  }
  return Math.max(len, 1e-6);
}

export function interpolateAlongPolylinePx(
  pathProgress: number,
  polyNorm: NormPt[],
  layout: MapPlayLayout
): { x: number; y: number } {
  const p = Math.max(0, Math.min(1, pathProgress));
  if (polyNorm.length < 1) {
    return { x: layout.originX + layout.playW / 2, y: layout.originY + layout.playH / 2 };
  }
  if (polyNorm.length < 2) {
    return normToPx(polyNorm[0], layout);
  }
  const total = polylineArcLengthPx(polyNorm, layout);
  let target = (1 - p) * total;
  for (let i = 0; i < polyNorm.length - 1; i++) {
    const a = normToPx(polyNorm[i], layout);
    const b = normToPx(polyNorm[i + 1], layout);
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    if (target <= segLen || i === polyNorm.length - 2) {
      const t = segLen < 1e-6 ? 0 : Math.min(1, target / segLen);
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      };
    }
    target -= segLen;
  }
  return normToPx(polyNorm[polyNorm.length - 1], layout);
}

/** pathCover: 1 near spawn (poly start), 0 near goal (poly end). */
export function nearestPathProgressFromCellCenter(
  c: number,
  r: number,
  polyNorm: NormPt[],
  layout: MapPlayLayout,
  tileCols: number,
  tileRows: number
): number {
  const nx = (c + 0.5) / tileCols;
  const ny = (r + 0.5) / tileRows;
  const px = layout.originX + nx * layout.playW;
  const py = layout.originY + ny * layout.playH;
  if (polyNorm.length < 2) return 0.5;

  let bestDistSq = Infinity;
  let bestArcFromStart = 0;
  let arcBefore = 0;

  for (let i = 0; i < polyNorm.length - 1; i++) {
    const a = normToPx(polyNorm[i], layout);
    const b = normToPx(polyNorm[i + 1], layout);
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    const { q, segT } = closestOnSegmentPx({ x: px, y: py }, { x: a.x, y: a.y }, { x: b.x, y: b.y });
    const dx = q.x - px;
    const dy = q.y - py;
    const d = dx * dx + dy * dy;
    if (d < bestDistSq) {
      bestDistSq = d;
      bestArcFromStart = arcBefore + segT * segLen;
    }
    arcBefore += segLen;
  }

  const total = arcBefore;
  return total > 1e-6 ? 1 - bestArcFromStart / total : 0.5;
}
