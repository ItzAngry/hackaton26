import React from 'react';
import Svg, { Line, Rect } from 'react-native-svg';

import {
  TILE_COLS,
  TILE_ROWS,
  type TileKind,
  tileKindFromTiles,
} from '@/constants/mapTileGrid';

import { useMapLayoutStore } from '@/store/useMapLayoutStore';

/** Strong tint. */
const GRID_DEBUG_STRONG = process.env.EXPO_PUBLIC_SHOW_MAP_GRID === '1';
/** Default: no grid lines on battle (paint path/pads in /admin instead). */
const SHOW_GRID_LINES = process.env.EXPO_PUBLIC_SHOW_MAP_GRID_LINES === '1';

function fillFor(kind: TileKind): string {
  if (GRID_DEBUG_STRONG) {
    switch (kind) {
      case 'path':
        return 'rgba(154, 101, 50, 0.28)';
      case 'buildable':
        return 'rgba(76, 175, 80, 0.12)';
      default:
        return 'rgba(46, 52, 64, 0.35)';
    }
  }
  switch (kind) {
    case 'path':
      return 'rgba(154, 101, 50, 0.11)';
    case 'buildable':
      return 'rgba(76, 175, 80, 0.05)';
    default:
      return 'rgba(46, 52, 64, 0.12)';
  }
}

type Props = {
  width: number;
  height: number;
};

export function TileGridOverlay({ width, height }: Props) {
  const tiles = useMapLayoutStore((s) => s.tiles);

  if (width < 8 || height < 8) return null;

  const cw = width / TILE_COLS;
  const ch = height / TILE_ROWS;

  const rects: React.ReactNode[] = [];
  for (let r = 0; r < TILE_ROWS; r++) {
    for (let c = 0; c < TILE_COLS; c++) {
      const kind = tileKindFromTiles(tiles, c, r);
      rects.push(
        <Rect
          key={`t-${r}-${c}`}
          x={c * cw}
          y={r * ch}
          width={cw}
          height={ch}
          fill={fillFor(kind)}
        />
      );
    }
  }

  const gridLines: React.ReactNode[] = [];
  if (SHOW_GRID_LINES) {
    const stroke = GRID_DEBUG_STRONG ? 'rgba(28, 33, 40, 0.55)' : 'rgba(28, 33, 40, 0.2)';
    const sw = GRID_DEBUG_STRONG ? 0.5 : 0.35;
    for (let c = 0; c <= TILE_COLS; c++) {
      const x = c * cw;
      gridLines.push(<Line key={`v-${c}`} x1={x} y1={0} x2={x} y2={height} stroke={stroke} strokeWidth={sw} />);
    }
    for (let r = 0; r <= TILE_ROWS; r++) {
      const y = r * ch;
      gridLines.push(<Line key={`h-${r}`} x1={0} y1={y} x2={width} y2={y} stroke={stroke} strokeWidth={sw} />);
    }
  }

  return (
    <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
      {rects}
      {gridLines}
    </Svg>
  );
}
