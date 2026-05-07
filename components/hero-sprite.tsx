import React, { useEffect, useState } from 'react';
import { Image, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import type { HeroFrame } from '@/constants/heroDefinitions';

type Props = {
  sheet: ImageSourcePropType;
  sheetW: number;
  sheetH: number;
  frames: HeroFrame[];
  /** Outer box (sprite scales to fit this square). */
  size: number;
  style?: StyleProp<ViewStyle>;
  running?: boolean;
};

/**
 * LibreSprite / Aseprite-style horizontal strip: clips one frame and advances by `duration`.
 */
export function HeroSprite({ sheet, sheetW, sheetH, frames, size, style, running = true }: Props) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!running || frames.length === 0) return;
    let cancelled = false;
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      if (cancelled) return;
      const fr = frames[i % frames.length];
      t = setTimeout(() => {
        i = (i + 1) % frames.length;
        setIdx(i);
        next();
      }, fr.d);
    };
    setIdx(0);
    next();
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [frames, running]);

  const fr = frames[idx] ?? frames[0];
  if (!fr) {
    return <View style={[{ width: size, height: size }, style]} />;
  }

  const scale = size / Math.max(fr.w, fr.h);

  return (
    <View style={[{ width: size, height: size, overflow: 'hidden' }, style]}>
      <Image
        accessibilityIgnoresInvertColors
        source={sheet}
        resizeMode="stretch"
        style={{
          width: sheetW * scale,
          height: sheetH * scale,
          transform: [{ translateX: -fr.x * scale }, { translateY: -fr.y * scale }],
        }}
      />
    </View>
  );
}

/** Subtle vertical bob on placed map heroes (idle breathe). */
export function IdleHeroBob({ children }: { children: React.ReactNode }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(
      withSequence(withTiming(-2.5, { duration: 700 }), withTiming(0, { duration: 700 })),
      -1,
      true
    );
  }, [y]);
  const bobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));
  return <Animated.View style={bobStyle}>{children}</Animated.View>;
}
