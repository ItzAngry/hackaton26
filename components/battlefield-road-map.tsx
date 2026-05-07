import React from 'react';
import { StyleSheet, View } from 'react-native';

import { IosUi } from '@/constants/iosUi';
import { AppText } from '@/components/ui/app-text';

import { pathProgressToLayoutPx } from '@/lib/tileMap';
import type { Enemy } from '@/store/useGameStore';

type Props = {
  enemies: Enemy[];
  enemyEmoji: (e: Enemy) => string;
  width: number;
  height: number;
};

export function BattlefieldRoadMap({ enemies, enemyEmoji, width, height }: Props) {
  if (width < 8 || height < 8) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {enemies.map((e) => {
        const p = Math.max(0, Math.min(1, e.pathProgress));
        const { x, y } = pathProgressToLayoutPx(p, width, height);
        const hpRatio = e.maxHp > 0 ? e.hp / e.maxHp : 0;
        return (
          <View key={e.id} pointerEvents="none" style={[styles.enemyToken, { left: x - 28, top: y - 36 }]}>
            <AppText variant="title3">{enemyEmoji(e)}</AppText>
            <View style={styles.enemyHpBar}>
              <View style={[styles.enemyHpFill, { width: `${Math.round(hpRatio * 100)}%` }]} />
            </View>
            <AppText variant="caption1" style={styles.enemyHpText}>
              {Math.max(0, Math.ceil(e.hp))}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  enemyToken: {
    position: 'absolute',
    width: 56,
    alignItems: 'center',
    gap: 2,
  },
  enemyHpBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.25)',
    overflow: 'hidden',
  },
  enemyHpFill: {
    height: '100%',
    backgroundColor: IosUi.destructive,
    borderRadius: 3,
  },
  enemyHpText: {
    fontSize: 10,
    color: '#FFF8E1',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 0.5 },
    textShadowRadius: 2,
  },
});
