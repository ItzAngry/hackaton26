import React from 'react';
import Svg, { Circle, Rect } from 'react-native-svg';

import { GRID_COLS, GRID_ROWS } from '@/constants/mapTileGrid';
import { closestPointOnPolylinePx, distPxToPolylinePx } from '@/lib/mapGeometry';
import type { MapPlayLayout } from '@/lib/mapPlayMetrics';

import { pickTileFromLocalPx } from '@/lib/tileMap';

import { useMapLayoutStore } from '@/store/useMapLayoutStore';

type Props = {
  mapPlay: MapPlayLayout;
  layoutX: number | null;
  layoutY: number | null;
};

/**
 * While placing a unit: full-cell green tile when target is valid; path corridor red; invalid amber.
 */
export function PlacementPathHoverOverlay({ mapPlay, layoutX, layoutY }: Props) {
  const pads = useMapLayoutStore((s) => s.placementPads);
  const poly = useMapLayoutStore((s) => s.pathPolylineNorm);
  const halfNorm = useMapLayoutStore((s) => s.pathHalfWidthNorm);

  const { viewW, viewH, originX, originY, playW, playH } = mapPlay;
  if (layoutX == null || layoutY == null || viewW < 8 || viewH < 8) {
    return null;
  }

  const picked = pickTileFromLocalPx(layoutX, layoutY, mapPlay);
  if (!picked) return null;

  const buildable = useMapLayoutStore.getState().isBuildableTile(picked.c, picked.r);

  const cw = playW / GRID_COLS;
  const ch = playH / GRID_ROWS;
  const cellX = originX + picked.c * cw;
  const cellY = originY + picked.r * ch;

  if (buildable) {
    return (
      <Svg width={viewW} height={viewH} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
        <Rect
          x={cellX}
          y={cellY}
          width={cw}
          height={ch}
          rx={5}
          ry={5}
          fill="rgba(52, 199, 89, 0.42)"
          stroke="rgba(22, 130, 55, 0.95)"
          strokeWidth={2.5}
        />
      </Svg>
    );
  }

  if (pads.length > 0) {
    const halfW = halfNorm * Math.min(playW, playH);
    const distPath = distPxToPolylinePx(layoutX, layoutY, poly, mapPlay);
    if (poly.length >= 2 && distPath < halfW) {
      const { x, y, dist } = closestPointOnPolylinePx(layoutX, layoutY, poly, mapPlay);
      if (dist < halfW) {
        const r = Math.max(9, halfW * 1.12);
        return (
          <Svg width={viewW} height={viewH} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
            <Circle cx={x} cy={y} r={r} fill="rgba(224, 52, 52, 0.42)" stroke="rgba(160, 28, 28, 0.95)" strokeWidth={2} />
          </Svg>
        );
      }
    }

    return (
      <Svg width={viewW} height={viewH} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
        <Rect
          x={cellX}
          y={cellY}
          width={cw}
          height={ch}
          rx={4}
          ry={4}
          fill="rgba(255, 149, 0, 0.14)"
          stroke="rgba(200, 90, 0, 0.5)"
          strokeWidth={2}
          strokeDasharray="6 5"
        />
      </Svg>
    );
  }

  if (poly.length < 2) return null;

  const halfW = halfNorm * Math.min(playW, playH);
  const { x, y, dist } = closestPointOnPolylinePx(layoutX, layoutY, poly, mapPlay);
  if (dist < halfW) {
    const r = Math.max(9, halfW * 1.15);
    return (
      <Svg width={viewW} height={viewH} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
        <Circle cx={x} cy={y} r={r} fill="rgba(224, 52, 52, 0.42)" stroke="rgba(160, 28, 28, 0.95)" strokeWidth={2} />
      </Svg>
    );
  }

  return (
    <Svg width={viewW} height={viewH} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
      <Rect
        x={cellX}
        y={cellY}
        width={cw}
        height={ch}
        rx={5}
        ry={5}
        fill="rgba(255, 149, 0, 0.12)"
        stroke="rgba(200, 90, 0, 0.45)"
        strokeWidth={2}
        strokeDasharray="6 5"
      />
    </Svg>
  );
}
