import React, { useEffect } from 'react';
import { Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { QuestTaskList, QuestTaskListHeader } from '@/components/quest-task-list';
import { AppText } from '@/components/ui/app-text';
import { SecondaryButton } from '@/components/ui/secondary-button';

import { type Quest } from '@/store/useGameStore';

const BOOK_ASSET = require('@/assets/images/Ancient_Open_Book_PNG_Transparent_Clipart.png');

const PEEK_HEIGHT = 78;
const SPRING = { damping: 20, stiffness: 210, mass: 0.9 };

/**
 * Native uses Image.resolveAssetSource; react-native-web omits it.
 * Match this asset’s IHDR so aspect ratio is identical on web.
 */
const BOOK_NATURAL_FALLBACK = { width: 8000, height: 5414 };

function getBookNaturalDimensions(): { width: number; height: number } {
  const img = Image as typeof Image & {
    resolveAssetSource?: (src: object) => { width?: number; height?: number } | null;
  };
  if (typeof img.resolveAssetSource === 'function') {
    const meta = img.resolveAssetSource(BOOK_ASSET as object);
    if (
      meta != null &&
      typeof meta.width === 'number' &&
      typeof meta.height === 'number' &&
      meta.width > 0 &&
      meta.height > 0
    ) {
      return { width: meta.width, height: meta.height };
    }
  }
  return BOOK_NATURAL_FALLBACK;
}

function bookDimensions(windowW: number, windowH: number) {
  const natural = getBookNaturalDimensions();
  const aspect = natural.height / natural.width;
  const maxBookH = Math.round(windowH * 0.86);
  const maxW = Math.min(580, Math.max(300, Math.round(windowW * 0.58)));

  let bookBaseW = maxW;
  let bookImgH = Math.round(bookBaseW * aspect);
  if (bookImgH > maxBookH) {
    bookImgH = maxBookH;
    bookBaseW = Math.round(bookImgH / aspect);
  }
  return { bookBaseW, bookImgH };
}

type Props = {
  /** When true, book is expanded with tasks and backdrop. */
  visible: boolean;
  onRequestOpen: () => void;
  onClose: () => void;
  quests: Quest[];
  onCompleteQuest: (id: string) => void;
  canCompleteTasks: boolean;
};

export function QuestBookDock({
  visible,
  onRequestOpen,
  onClose,
  quests,
  onCompleteQuest,
  canCompleteTasks,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width: windowW, height: windowH } = useWindowDimensions();
  const progress = useSharedValue(0);

  const { bookBaseW, bookImgH } = bookDimensions(windowW, windowH);
  /** Extra room so a slight open-scale doesn’t clip the top edge of the art. */
  const expandedClipH = Math.ceil(bookImgH * 1.04) + 12;

  useEffect(() => {
    progress.value = withSpring(visible ? 1 : 0, SPRING);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }));

  const clipStyle = useAnimatedStyle(() => ({
    height: interpolate(progress.value, [0, 1], [PEEK_HEIGHT, expandedClipH]),
  }));

  /** Pivot at bottom-center so peek/open stays glued to bottom (no drifting to screen center). */
  const bookMotionStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.03]) }],
  }));

  const panelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.45, 1], [0, 0, 1]),
  }));

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Animated.View
        style={[styles.backdrop, backdropStyle]}
        pointerEvents={visible ? 'auto' : 'none'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close today's plan" />
      </Animated.View>

      <View
        style={[styles.dockColumn, { paddingBottom: Math.max(insets.bottom, 8) }]}
        pointerEvents="box-none">
        <Animated.View style={[styles.clip, { width: bookBaseW + 32 }, clipStyle]}>
          <Animated.View
            style={[
              styles.bookStack,
              {
                width: bookBaseW,
                minHeight: bookImgH,
                transformOrigin: '50% 100%',
              },
              bookMotionStyle,
            ]}>
            <Image
              source={BOOK_ASSET}
              style={[styles.bookImg, { width: bookBaseW, height: bookImgH }]}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
            <Animated.View
              style={[styles.taskPanel, panelStyle]}
              pointerEvents={visible ? 'auto' : 'none'}>
              <View style={styles.taskPanelInner}>
                <View style={styles.panelTop}>
                  <View style={styles.headerBlock}>
                    <QuestTaskListHeader compact />
                  </View>
                  <SecondaryButton
                    title="Close"
                    onPress={onClose}
                    style={styles.closeBtn}
                    accessibilityLabel="Close today's tasks"
                  />
                </View>
                <View style={styles.taskListGrow}>
                  <QuestTaskList
                    quests={quests}
                    onCompleteQuest={onCompleteQuest}
                    questCardStyle={styles.parchmentCard}
                    scrollViewStyle={styles.taskScroll}
                    contentContainerStyle={styles.taskScrollContent}
                    canMarkComplete={canCompleteTasks}
                  />
                </View>
                <AppText variant="caption1" color="secondary" style={styles.hint}>
                  Bonus gold counts when tasks are marked during preparation (before defense starts).
                </AppText>
              </View>
            </Animated.View>
          </Animated.View>

          {!visible ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open today's tasks"
              onPress={onRequestOpen}
              style={styles.peekTap}
              hitSlop={{ top: 8, bottom: 0, left: 20, right: 20 }}
            />
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
}

const PARCHMENT = '#F4E8D4';
const PARCHMENT_BORDER = 'rgba(101, 67, 33, 0.22)';

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 52,
    elevation: 26,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.34)',
  },
  dockColumn: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  clip: {
    overflow: 'hidden',
    alignItems: 'center',
    /** Top of book aligns to top of clip — only upper edge peeks above bottom of screen when collapsed. */
    justifyContent: 'flex-start',
  },
  bookStack: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  peekTap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: PEEK_HEIGHT,
    zIndex: 4,
  },
  bookImg: {
    marginBottom: -4,
  },
  taskPanel: {
    position: 'absolute',
    left: '7%',
    right: '7%',
    top: '10%',
    bottom: '26%',
  },
  taskPanelInner: {
    flex: 1,
    minHeight: 0,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 6,
    backgroundColor: 'rgba(245, 232, 210, 0.94)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PARCHMENT_BORDER,
  },
  panelTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  headerBlock: {
    flex: 1,
    minWidth: 0,
  },
  closeBtn: {
    flexShrink: 0,
    marginTop: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 38,
  },
  taskListGrow: {
    flex: 1,
    minHeight: 96,
    marginTop: 2,
  },
  taskScroll: {
    flex: 1,
  },
  taskScrollContent: {
    flexGrow: 1,
    paddingBottom: 8,
    gap: 10,
  },
  parchmentCard: {
    backgroundColor: PARCHMENT,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PARCHMENT_BORDER,
  },
  hint: {
    marginTop: 6,
    opacity: 0.85,
  },
});
