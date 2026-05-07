import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { IosUi } from '@/constants/iosUi';

import { GameModal } from '@/components/game-modal';
import { QuestTaskList, QuestTaskListHeader } from '@/components/quest-task-list';

import { type Quest } from '@/store/useGameStore';

type Props = {
  visible: boolean;
  onClose: () => void;
  quests: Quest[];
  onCompleteQuest: (id: string) => void;
};

const DRAWER_FRACTION = 0.33;

export function QuestDrawer({ visible, onClose, quests, onCompleteQuest }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const drawerWidth = Math.min(windowWidth * DRAWER_FRACTION, 420);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, { duration: 280 });
    // progress is a stable Reanimated shared value; do not list as dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(progress.value, [0, 1], [-drawerWidth, 0]),
      },
    ],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }));

  return (
    <GameModal visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.fill} pointerEvents="box-none">
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close today's plan" />
        </Animated.View>
        <Animated.View
          style={[styles.drawer, { width: drawerWidth }, drawerStyle]}
          accessibilityViewIsModal>
          <QuestTaskListHeader />
          <QuestTaskList quests={quests} onCompleteQuest={onCompleteQuest} />
        </Animated.View>
      </View>
    </GameModal>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: IosUi.systemBackground,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: IosUi.separator,
    paddingTop: 16,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
});
