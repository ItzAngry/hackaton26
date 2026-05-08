import React, { useEffect } from 'react';
import {
  Image as RNImage,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type ImageStyle,
} from 'react-native';
import { Image } from 'expo-image';
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

import { QUEST_BOOK_IMAGE } from '@/constants/battlefieldAssets';
import { type Quest } from '@/store/useGameStore';

const PEEK_HEIGHT = 112;
const SPRING = { damping: 22, stiffness: 220, mass: 0.85 };

const WEB_PEEK_BUTTON_RESET =
  Platform.OS === 'web'
    ? ({
        borderWidth: 0,
        outlineWidth: 0,
        cursor: 'pointer',
        backgroundColor: 'transparent',
        WebkitAppearance: 'none',
        appearance: 'none',
      } as Record<string, unknown>)
    : null;

/**
 * Native uses Image.resolveAssetSource; react-native-web omits it.
 * Match `assets/images/book.png` IHDR so aspect ratio is identical on web.
 */
const BOOK_NATURAL_FALLBACK = { width: 1280, height: 1280 };

function getBookNaturalDimensions(): { width: number; height: number } {
  const img = RNImage as typeof RNImage & {
    resolveAssetSource?: (src: object) => { width?: number; height?: number } | null;
  };
  if (typeof img.resolveAssetSource === 'function') {
    const meta = img.resolveAssetSource(QUEST_BOOK_IMAGE as object);
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
  const maxBookH = Math.round(windowH * 0.88);
  const maxW = Math.min(720, Math.max(260, Math.round(windowW * 0.92)));

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
  onCompleteQuest: (id: string, proofUri: string) => void;
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
  const peekSheetW = bookBaseW + 32;
  /** Cap book art when open so Today's plan (task list) gets more of the sheet. */
  const bookHeaderMaxH = Math.round(Math.min(bookImgH, windowH * 0.22));

  useEffect(() => {
    progress.value = withSpring(visible ? 1 : 0, SPRING);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    height: interpolate(progress.value, [0, 1], [PEEK_HEIGHT, windowH]),
    width: interpolate(progress.value, [0, 1], [peekSheetW, windowW]),
  }));

  const panelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.38, 1], [0, 0, 1]),
    maxHeight: interpolate(progress.value, [0, 1], [0, Math.max(windowH, 800)]),
    marginTop: interpolate(progress.value, [0, 1], [0, 8]),
  }));

  const bookImgStyle: ImageStyle[] = [
    styles.bookImg,
    {
      width: bookBaseW,
      height: bookImgH,
      maxHeight: visible ? bookHeaderMaxH : bookImgH,
    },
  ];

  return (
    <View
      style={[
        styles.root,
        Platform.OS === 'web' &&
          ({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- react-native-web supports fixed overlays
            position: 'fixed' as any,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
          } as const),
      ]}
      pointerEvents="box-none">
      <Animated.View
        style={[styles.backdrop, backdropStyle]}
        pointerEvents={visible ? 'auto' : 'none'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close today's plan" />
      </Animated.View>

      <View style={styles.dockColumn} pointerEvents="box-none">
        <Animated.View style={[styles.sheet, sheetStyle, !visible && styles.sheetPeekCollapsed]}>
          <View
            style={[
              styles.sheetInner,
              visible && {
                paddingTop: Math.max(insets.top, 10),
                paddingBottom: Math.max(insets.bottom, 12),
                paddingHorizontal: 14,
              },
            ]}>
            {/** Collapsed: fixed-height overflow clips everything below — only top band of book.png is visible. */}
            <View
              style={[
                styles.bookHeader,
                visible ? { maxHeight: bookHeaderMaxH } : styles.bookPeekCrop,
              ]}>
              <Image
                source={QUEST_BOOK_IMAGE}
                style={bookImgStyle}
                contentFit="contain"
                transition={0}
                accessibilityIgnoresInvertColors
                pointerEvents="none"
              />
            </View>

            <Animated.View
              style={[styles.taskPanelColumn, panelStyle]}
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
                  Bonus gold counts when tasks are completed with a proof photo during preparation (before defense starts).
                </AppText>
              </View>
            </Animated.View>
          </View>

          {!visible ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open today's tasks"
              onPress={onRequestOpen}
              style={styles.peekTap}
              hitSlop={{ bottom: 8, top: 0, left: 20, right: 20 }}
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
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  dockColumn: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  /** Bottom-centered shell; collapsed height only shows top band (peek). */
  sheet: {
    overflow: 'hidden',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    backgroundColor: 'rgba(252, 250, 245, 0.97)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderColor: 'rgba(101, 67, 33, 0.14)',
  },
  /** Peek-only: no opaque panel behind art so book.png reads clearly at the bottom strip. */
  sheetPeekCollapsed: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  sheetInner: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    flexDirection: 'column',
    alignItems: 'center',
  },
  bookHeader: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexShrink: 0,
  },
  /** Hard clip to peek height — shows top of asset; everything below is cropped off. */
  bookPeekCrop: {
    height: PEEK_HEIGHT,
    width: '100%',
    overflow: 'hidden',
    alignItems: 'center',
  },
  bookImg: {
    marginBottom: 0,
  },
  taskPanelColumn: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    overflow: 'hidden',
  },
  peekTap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: PEEK_HEIGHT,
    zIndex: 4,
    backgroundColor: 'transparent',
    ...(WEB_PEEK_BUTTON_RESET ?? {}),
  },
  taskPanelInner: {
    flex: 1,
    minHeight: 0,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: 'rgba(245, 232, 210, 0.96)',
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
