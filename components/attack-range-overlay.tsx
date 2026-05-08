import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { MapPlayLayout } from '@/lib/mapPlayMetrics';
import { pathAttackBand, pathProgressToLayoutPx } from '@/lib/tileMap';

type Props = {
  mapPlay: MapPlayLayout;
  pathCover: number;
  visible: boolean;
};

const STEPS = 26;
const DOT = 15;

export function AttackRangeOverlay({ mapPlay, pathCover, visible }: Props) {
  if (!visible || mapPlay.viewW < 8 || mapPlay.viewH < 8) return null;

  const { lo, hi } = pathAttackBand(pathCover);
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = lo + ((hi - lo) * i) / STEPS;
    pts.push(pathProgressToLayoutPx(t, mapPlay));
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
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  },
});
