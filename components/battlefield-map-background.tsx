import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { BATTLEFIELD_MAP_IMAGE } from '@/constants/battlefieldAssets';

type Props = {
  width: number;
  height: number;
};

/** Full-bleed map art; grid and gameplay overlays render above with matching dimensions. */
export function BattlefieldMapBackground({ width, height }: Props) {
  if (width < 8 || height < 8) return null;

  return (
    <View style={[styles.wrap, { width, height }]} pointerEvents="none">
      <Image
        source={BATTLEFIELD_MAP_IMAGE}
        style={StyleSheet.absoluteFillObject}
        contentFit="contain"
        transition={0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
  },
});
