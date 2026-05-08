import React from 'react';
import { StyleSheet, View } from 'react-native';

import {
  SLIME_DISPLAY_SIZE,
  SLIME_SHEET_H,
  SLIME_SHEET_W,
  SLIME_WALK_FRAMES,
  SLIME_WALK_SHEETS,
} from '@/constants/enemySlimeSprite';
import { IosUi } from '@/constants/iosUi';

import { HeroSprite } from '@/components/hero-sprite';
import { AppText } from '@/components/ui/app-text';

import { slimeFacingFromPathProgress } from '@/lib/enemyWalkFacing';
import type { MapPlayLayout } from '@/lib/mapPlayMetrics';
import { pathProgressToLayoutPx } from '@/lib/tileMap';
import type { Enemy } from '@/store/useGameStore';

type Props = {
  enemies: Enemy[];
  mapPlay: MapPlayLayout;
};

export function BattlefieldRoadMap({ enemies, mapPlay }: Props) {
  if (mapPlay.viewW < 8 || mapPlay.viewH < 8) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {enemies.map((e) => {
        const p = Math.max(0, Math.min(1, e.pathProgress));
        const { x, y } = pathProgressToLayoutPx(p, mapPlay);
        const hpRatio = e.maxHp > 0 ? e.hp / e.maxHp : 0;
        const facing = slimeFacingFromPathProgress(p, mapPlay);
        const sheet = SLIME_WALK_SHEETS[facing];

        return (
          <View
            key={e.id}
            pointerEvents="none"
            style={[styles.enemyToken, { left: x - SLIME_DISPLAY_SIZE / 2, top: y - SLIME_DISPLAY_SIZE / 2 - 10 }]}>
            <HeroSprite
              key={`${e.id}-${facing}`}
              sheet={sheet}
              sheetW={SLIME_SHEET_W}
              sheetH={SLIME_SHEET_H}
              frames={SLIME_WALK_FRAMES}
              size={SLIME_DISPLAY_SIZE}
              running
            />
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
    width: SLIME_DISPLAY_SIZE + 12,
    alignItems: 'center',
    gap: 2,
  },
  enemyHpBar: {
    width: 50,
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
