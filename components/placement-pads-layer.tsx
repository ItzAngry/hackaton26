import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { GRID_COLS, GRID_ROWS, cellKey } from '@/constants/mapTileGrid';
import { PLACEMENT_PAD_ROCKS } from '@/constants/placementPadAssets';

import type { MapPlayLayout } from '@/lib/mapPlayMetrics';
import { tileCenterLayoutPx } from '@/lib/tileMap';

import { useMapLayoutStore } from '@/store/useMapLayoutStore';

type Props = {
  mapPlay: MapPlayLayout;
  /** Tile keys (`cellKey`) where a defender stands — rocks render only on occupied pads. */
  occupiedTileKeys: Set<string>;
};

/** Rocks on pad tiles; hidden until a unit occupies that pad (battle). */
export function PlacementPadsLayer({ mapPlay, occupiedTileKeys }: Props) {
  const pads = useMapLayoutStore((s) => s.placementPads);

  if (!pads.length || mapPlay.viewW < 8 || mapPlay.viewH < 8) return null;

  const visiblePads = pads.filter((p) => occupiedTileKeys.has(cellKey(p.c, p.r)));
  if (!visiblePads.length) return null;

  const cellW = mapPlay.playW / GRID_COLS;
  const cellH = mapPlay.playH / GRID_ROWS;
  const size = Math.min(cellW, cellH) * 0.7;

  return (
    <View style={[StyleSheet.absoluteFillObject, styles.host]} pointerEvents="none">
      {visiblePads.map((pad, i) => {
        const { x, y } = tileCenterLayoutPx(pad.c, pad.r, mapPlay);
        const rockIdx = Math.min(3, Math.max(0, pad.rock - 1));
        const src = PLACEMENT_PAD_ROCKS[rockIdx];
        const left = x - size / 2;
        const top = y - size / 2;
        return (
          <Image
            key={`pad-${pad.c}-${pad.r}-${i}`}
            source={src}
            style={[styles.rock, { left, top, width: size, height: size }]}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    zIndex: 1,
  },
  rock: {
    position: 'absolute',
  },
});
