import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import type { MapPlayLayout } from '@/lib/mapPlayMetrics';
import { pathProgressToLayoutPx } from '@/lib/tileMap';

/** Matches march sampling in `slimeFacingFromPathProgress` — vector from spawn toward goal. */
const DIR_EPS = 0.05;

const SIZE = 30;

type Props = {
  mapPlay: MapPlayLayout;
  visible?: boolean;
};

export function EnemySpawnIndicator({ mapPlay, visible = true }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.22,
          duration: 480,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 480,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible, opacity]);

  const layout = useMemo(() => {
    const spawn = pathProgressToLayoutPx(1, mapPlay);
    const towardGoal = pathProgressToLayoutPx(Math.max(0, 1 - DIR_EPS), mapPlay);
    const dx = towardGoal.x - spawn.x;
    const dy = towardGoal.y - spawn.y;
    /** Tip points along travel (toward lower pathProgress); atan2(dx,-dy) maps screen coords with tip default “up”. */
    const rotationDeg = (Math.atan2(dx, -dy) * 180) / Math.PI;
    return {
      left: spawn.x - SIZE / 2,
      top: spawn.y - SIZE / 2,
      rotationDeg,
    };
  }, [mapPlay]);

  if (!visible || mapPlay.viewW < 8 || mapPlay.viewH < 8) return null;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityRole="image"
      accessibilityLabel="Enemy spawn — waves enter here"
      style={[
        styles.wrap,
        {
          left: layout.left,
          top: layout.top,
          opacity,
          transform: [{ rotate: `${layout.rotationDeg}deg` }],
        },
      ]}>
      <View style={styles.shadowPlate}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Polygon
            points={`${SIZE / 2},3 ${SIZE - 4},${SIZE - 5} 4,${SIZE - 5}`}
            fill="#FFFFFF"
            stroke="#1a1520"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
  },
  shadowPlate: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 4,
    elevation: 8,
  },
});
