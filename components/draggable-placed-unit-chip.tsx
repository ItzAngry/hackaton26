import React, { useCallback, useMemo } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { IosUi } from '@/constants/iosUi';

import { pickTileFromLocalPx } from '@/lib/tileMap';

type Props = {
  cx: number;
  cy: number;
  pad: number;
  mapW: number;
  mapH: number;
  unitId: string;
  selected: boolean;
  onTapSelect: () => void;
  movePlacedUnit: (unitId: string, c: number, r: number) => boolean;
  styleSelected?: object;
  styleBase?: object;
  children: React.ReactNode;
};

/** Tap vs drag: small movement selects; drag drops onto tile centers via pickTileFromLocalPx. */
export function DraggablePlacedUnitChip({
  cx,
  cy,
  pad,
  mapW,
  mapH,
  unitId,
  selected,
  onTapSelect,
  movePlacedUnit,
  styleSelected,
  styleBase,
  children,
}: Props) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  /** After a real drag, if the move cannot be applied, still open stats for small accidental pans. */
  const finishMove = useCallback(
    (translationX: number, translationY: number) => {
      const d = Math.hypot(translationX, translationY);
      const cxChip = cx + pad / 2 + translationX;
      const cyChip = cy + pad / 2 + translationY;
      const picked = pickTileFromLocalPx(cxChip, cyChip, mapW, mapH);
      if (!picked) {
        if (d < 36) onTapSelect();
        return;
      }
      const ok = movePlacedUnit(unitId, picked.c, picked.r);
      if (!ok) {
        if (d < 36) onTapSelect();
        else {
          Alert.alert('Cannot move', 'Choose another empty green tile (not the path).');
        }
      }
    },
    [cx, cy, pad, mapW, mapH, unitId, movePlacedUnit, onTapSelect]
  );

  const tapOnly = useCallback(() => {
    onTapSelect();
  }, [onTapSelect]);

  const CHIP_TAP_MAX_DIST = 14;
  const PAN_ACTIVATE_PX = 12;

  const chipGesture = useMemo(() => {
    const tap = Gesture.Tap()
      .maxDistance(CHIP_TAP_MAX_DIST)
      .onEnd(() => {
        runOnJS(tapOnly)();
      });

    const pan = Gesture.Pan()
      .activeOffsetX([-PAN_ACTIVATE_PX, PAN_ACTIVATE_PX])
      .activeOffsetY([-PAN_ACTIVATE_PX, PAN_ACTIVATE_PX])
      .onUpdate((e) => {
        tx.value = e.translationX;
        ty.value = e.translationY;
      })
      .onEnd((e) => {
        runOnJS(finishMove)(e.translationX, e.translationY);
        tx.value = withTiming(0);
        ty.value = withTiming(0);
      });

    return Gesture.Exclusive(tap, pan);
  }, [tapOnly, finishMove]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  return (
    <GestureDetector gesture={chipGesture}>
      <Animated.View
        style={[
          styles.chip,
          styleBase,
          { left: cx, top: cy, width: pad, height: pad },
          selected && styles.selected,
          selected && styles.selectedLift,
          selected && styleSelected,
          animatedStyle,
        ]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  chip: {
    position: 'absolute',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: IosUi.systemBlue,
    backgroundColor: 'rgba(255,255,255,0.92)',
    zIndex: 10,
    elevation: 8,
  },
  selected: {
    borderColor: '#34C759',
    borderWidth: 3,
  },
  selectedLift: {
    zIndex: 24,
    elevation: 16,
  },
});
