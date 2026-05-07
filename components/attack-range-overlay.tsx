import React from 'react';
import { StyleSheet, View } from 'react-native';

import { pathAttackBand, pathProgressToLayoutPx } from '@/lib/tileMap';

type Props = {
  mapWidth: number;
  mapHeight: number;
  pathCover: number;
  visible: boolean;
};

const STEPS = 26;
const DOT = 11;

export function AttackRangeOverlay({ mapWidth, mapHeight, pathCover, visible }: Props) {
  if (!visible || mapWidth < 8 || mapHeight < 8) return null;

  const { lo, hi } = pathAttackBand(pathCover);
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = lo + ((hi - lo) * i) / STEPS;
    pts.push(pathProgressToLayoutPx(t, mapWidth, mapHeight));
  }

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {pts.map((p, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              left: p.x - DOT / 2,
              top: p.y - DOT / 2,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: 'rgba(0, 122, 255, 0.38)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.55)',
  },
});
