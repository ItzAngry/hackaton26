import React, { useMemo } from 'react';
import Svg, { Polyline } from 'react-native-svg';

import type { MapPlayLayout } from '@/lib/mapPlayMetrics';

import { useMapLayoutStore } from '@/store/useMapLayoutStore';

type Props = {
  mapPlay: MapPlayLayout;
};

/**
 * Invisible SVG stroke tracing `pathPolylineNorm` in the same letterboxed frame as the map image.
 * Scales with `mapPlay`; slimes already follow this polyline via `pathProgressToLayoutPx` / store layout.
 */
export function BattlefieldPathTrackOverlay({ mapPlay }: Props) {
  const poly = useMapLayoutStore((s) => s.pathPolylineNorm);
  const halfNorm = useMapLayoutStore((s) => s.pathHalfWidthNorm);

  const pointsAttr = useMemo(() => {
    if (poly.length < 2 || mapPlay.viewW < 8 || mapPlay.viewH < 8) return null;
    const { originX, originY, playW, playH } = mapPlay;
    return poly.map((p) => `${originX + p.x * playW},${originY + p.y * playH}`).join(' ');
  }, [poly, mapPlay]);

  if (!pointsAttr) return null;

  const corridorW = Math.max(4, halfNorm * 2 * Math.min(mapPlay.playW, mapPlay.playH));

  return (
    <Svg
      width={mapPlay.viewW}
      height={mapPlay.viewH}
      style={{ position: 'absolute', left: 0, top: 0, zIndex: 0 }}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Polyline
        points={pointsAttr}
        fill="none"
        stroke="rgba(0,0,0,0)"
        strokeWidth={corridorW}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}
