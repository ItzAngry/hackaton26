import React, { useCallback } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { HERO_BY_ID, type HeroDefinition } from '@/constants/heroDefinitions';
import { IosUi } from '@/constants/iosUi';
import { heroCardSpritePx } from '@/lib/heroUiScale';

import { AppText } from '@/components/ui/app-text';
import { HeroSprite, IdleHeroBob } from '@/components/hero-sprite';

type Props = {
  heroId: string;
  compact?: boolean;
  onDragEndScreen: (absoluteX: number, absoluteY: number, heroId: string) => void;
  /** Shown under subtitle when recruiting/placing costs energy (e.g. battlefield shop grid). */
  placeCostHint?: string;
};

/** Long-press, then drag toward the map; recruit is applied only when drop resolves on a legal tile (parent). */
export function DraggableHeroCard({ heroId, compact, onDragEndScreen, placeCostHint }: Props) {
  const def = HERO_BY_ID[heroId];
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  const finish = useCallback(
    (absoluteX: number, absoluteY: number) => {
      onDragEndScreen(absoluteX, absoluteY, heroId);
    },
    [onDragEndScreen, heroId]
  );

  const pan = Gesture.Pan()
    .activateAfterLongPress(280)
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd((e) => {
      runOnJS(finish)(e.absoluteX, e.absoluteY);
      tx.value = withTiming(0);
      ty.value = withTiming(0);
    })
    .onFinalize(() => {
      tx.value = withTiming(0);
      ty.value = withTiming(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
    zIndex: Math.abs(tx.value) + Math.abs(ty.value) > 2 ? 50 : 1,
    elevation: Math.abs(tx.value) + Math.abs(ty.value) > 2 ? 16 : 2,
  }));

  if (!def) return null;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.shell, compact && styles.shellCompact, animatedStyle]}>
        <HeroCardFace def={def} compact={compact} placeCostHint={placeCostHint} />
      </Animated.View>
    </GestureDetector>
  );
}

export function HeroCardFace({
  def,
  compact,
  placeCostHint,
}: {
  def: HeroDefinition;
  compact?: boolean;
  placeCostHint?: string;
}) {
  const { width: windowW } = useWindowDimensions();
  const spriteSize = heroCardSpritePx(!!compact, windowW);
  return (
    <View style={styles.faceInner}>
      <IdleHeroBob>
        <HeroSprite
          sheet={def.sheet}
          sheetW={def.sheetW}
          sheetH={def.sheetH}
          frames={def.frames}
          size={spriteSize}
        />
      </IdleHeroBob>
      <AppText variant={compact ? 'caption1' : 'subhead'} numberOfLines={2} style={styles.title}>
        {def.name}
      </AppText>
      <AppText variant="caption1" color="secondary" numberOfLines={2} style={styles.sub}>
        {def.subtitle}
      </AppText>
      {placeCostHint ? (
        <AppText variant="footnote" color="tint" numberOfLines={1} style={styles.placeHint}>
          {placeCostHint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: IosUi.separator,
  },
  shellCompact: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    gap: 4,
  },
  faceInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  title: {
    fontWeight: '600',
    textAlign: 'center',
  },
  sub: {
    textAlign: 'center',
  },
  placeHint: {
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '600',
  },
});
