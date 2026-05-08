import React, { useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { IosUi } from '@/constants/iosUi';

import { ShopHeroGrid } from '@/components/shop-panels';
import { AppText } from '@/components/ui/app-text';
import { HUDChip } from '@/components/ui/hud-chip';
import { SecondaryButton } from '@/components/ui/secondary-button';

import { PLACE_DEFENDER_ENERGY_COST } from '@/store/useGameStore';

export type BattleMenuActionsProps = {
  onOpenQuests: () => void;
  onStartDefense: () => void;
  onDebugSkipPrepPhase: () => void;
  onDebugReset: () => void;
  /** Preparation: show timed-defense starters. Hidden during active defense. */
  showPrepPhaseActions: boolean;
  berlinEvening: boolean;
};

type Props = {
  gold: number;
  energy: number;
  phaseTitle: string;
  phaseSub: string;
  onInstructionPress: () => void;
  landscapeCompact?: boolean;
  /** Sidebar beside map (tablet/desktop). */
  variant?: 'rail' | 'overlay';
  menu?: BattleMenuActionsProps;
  /** Long-press a hero, drag onto the map; recruit only if dropped on a legal green tile. */
  heroDragPlacement?: (absoluteX: number, absoluteY: number, heroId: string) => void;
};

export function BattleShopSidebar({
  gold,
  energy,
  phaseTitle,
  phaseSub,
  onInstructionPress,
  landscapeCompact,
  variant = 'rail',
  menu,
  heroDragPlacement,
}: Props) {
  const { width: windowW } = useWindowDimensions();
  const phonePortrait = !landscapeCompact && windowW < 560;
  const overlay = variant === 'overlay';
  const denseUi = phonePortrait || overlay;

  const sidebarWidth = overlay
    ? undefined
    : phonePortrait
      ? Math.round(Math.min(168, Math.max(146, windowW * 0.262)))
      : undefined;

  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const wrapStyles = [
    overlay ? styles.wrapOverlay : styles.wrap,
    !overlay && landscapeCompact && styles.wrapLandscape,
    !overlay && phonePortrait && styles.wrapPhone,
    !overlay &&
      phonePortrait &&
      sidebarWidth != null && { width: sidebarWidth, maxWidth: sidebarWidth, minWidth: sidebarWidth },
  ];

  const menuBtnStyle = overlay ? styles.menuItemBtnOverlay : styles.menuItemBtn;

  return (
    <View style={wrapStyles}>
      {overlay ? (
        <View style={styles.menuBarOverlay}>
          <View style={styles.menuOverlayChipColumn}>
            <HUDChip
              icon="🪙"
              label="Gold"
              value={gold}
              dense={denseUi}
              style={styles.overlayHudChip}
            />
            <HUDChip
              icon="⚡"
              label="Energy"
              value={energy}
              dense={denseUi}
              style={styles.overlayHudChip}
            />
          </View>
          {menu ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={menuOpen ? 'Close battle menu' : 'Open battle menu'}
              hitSlop={14}
              style={[styles.menuTrigger, styles.menuTriggerOverlayRail]}
              onPress={() => setMenuOpen((o) => !o)}>
              <AppText variant="headline" style={styles.menuTriggerGlyph}>
                ⋯
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={[styles.menuBar, denseUi && styles.menuBarDense]}>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.menuBarScroll}
            contentContainerStyle={styles.menuBarScrollContent}>
            <HUDChip icon="🪙" label="Gold" value={gold} dense={denseUi} />
            <HUDChip icon="⚡" label="Energy" value={energy} dense={denseUi} />
          </ScrollView>
          {menu ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={menuOpen ? 'Close battle menu' : 'Open battle menu'}
              hitSlop={14}
              style={styles.menuTrigger}
              onPress={() => setMenuOpen((o) => !o)}>
              <AppText variant="headline" style={styles.menuTriggerGlyph}>
                ⋯
              </AppText>
            </Pressable>
          ) : null}
        </View>
      )}

      {menuOpen && menu ? (
        <View style={[styles.menuSheet, overlay && styles.menuSheetOverlay]}>
          <SecondaryButton
            title="Today's plan"
            style={menuBtnStyle}
            onPress={() => {
              menu.onOpenQuests();
              closeMenu();
            }}
          />
          {menu.showPrepPhaseActions ? (
            <>
              <SecondaryButton
                title={menu.berlinEvening ? 'Evening defense · Berlin ~18:00' : 'Start evening defense'}
                style={menuBtnStyle}
                onPress={() => {
                  menu.onStartDefense();
                  closeMenu();
                }}
              />
              <SecondaryButton
                title="Start demo defense (20 min)"
                style={menuBtnStyle}
                onPress={() => {
                  menu.onStartDefense();
                  closeMenu();
                }}
              />
            </>
          ) : null}
          <SecondaryButton
            title="Skip prep · dbg"
            style={menuBtnStyle}
            onPress={() => {
              menu.onDebugSkipPrepPhase();
              closeMenu();
            }}
          />
          <SecondaryButton
            title="Full reset · dbg"
            style={menuBtnStyle}
            onPress={() => {
              menu.onDebugReset();
              closeMenu();
            }}
          />
        </View>
      ) : null}

      <AppText
        variant={denseUi ? 'subhead' : 'title3'}
        style={denseUi ? styles.phaseTitleDense : undefined}
        numberOfLines={overlay ? 3 : 2}>
        {phaseTitle}
      </AppText>
      <AppText variant="footnote" color="secondary" numberOfLines={overlay ? 4 : denseUi ? 2 : 4}>
        {phaseSub}
      </AppText>

      {!denseUi ? (
        <AppText variant="footnote" color="secondary" style={styles.sectionLabel}>
          Heroes
        </AppText>
      ) : null}

      <ScrollView
        style={[styles.shopScroll, denseUi && styles.shopScrollDense]}
        contentContainerStyle={[styles.shopScrollContent, denseUi && styles.shopScrollContentDense]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled>
        {!denseUi ? (
          <AppText variant="footnote" color="secondary" style={styles.intro}>
            Hold, drag to a green tile. {PLACE_DEFENDER_ENERGY_COST} energy to place (Today&apos;s plan). Valid drop
            only.
          </AppText>
        ) : (
          <AppText variant="caption1" color="secondary" style={styles.introDense} numberOfLines={overlay ? 4 : 3}>
            {overlay
              ? 'Hold hero → drag to green map tile (adds only on valid drop). ⋯ menu.'
              : 'Hold hero → drag to green tile; adds only on valid drop.'}
          </AppText>
        )}
        <ShopHeroGrid compact={denseUi} heroDragPlacement={heroDragPlacement} />
      </ScrollView>

      <Pressable accessibilityRole="button" accessibilityLabel="Open instruction" hitSlop={10} onPress={onInstructionPress}>
        <AppText variant="caption1" color="tint">
          Instruction
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignSelf: 'stretch',
    minWidth: 188,
    maxWidth: 300,
    width: '31%',
    flexShrink: 0,
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: IosUi.separator,
  },
  wrapOverlay: {
    flex: 1,
    width: '100%',
    minWidth: 0,
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 6,
    paddingBottom: 8,
    backgroundColor: 'rgba(252,252,253,0.94)',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: IosUi.separator,
  },
  wrapLandscape: {
    width: '28%',
    maxWidth: 280,
  },
  wrapPhone: {
    gap: 5,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 0,
    maxWidth: 168,
    width: undefined,
  },
  phaseTitleDense: {
    fontWeight: '600',
  },
  menuBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },
  /** Portrait overlay: stack Gold / Energy so chips are readable in a narrow rail. */
  menuBarOverlay: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    width: '100%',
  },
  menuOverlayChipColumn: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  overlayHudChip: {
    width: '100%',
    alignSelf: 'stretch',
  },
  menuBarDense: {
    gap: 4,
  },
  menuBarScroll: {
    flex: 1,
    minWidth: 0,
    maxHeight: 52,
  },
  menuBarScrollContent: {
    gap: 6,
    alignItems: 'center',
    paddingRight: 4,
  },
  menuTrigger: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: IosUi.systemGray6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: IosUi.separator,
  },
  menuTriggerOverlay: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  /** Align ⋯ with top chip when currencies are stacked (overlay rail). */
  menuTriggerOverlayRail: {
    flexShrink: 0,
    paddingHorizontal: 7,
    paddingVertical: 7,
    marginTop: 1,
  },
  menuTriggerGlyph: {
    color: IosUi.systemBlue,
    lineHeight: 20,
  },
  menuSheet: {
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(242,242,247,0.96)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: IosUi.separator,
  },
  menuSheetOverlay: {
    paddingHorizontal: 4,
  },
  menuItemBtn: {
    minHeight: 38,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  menuItemBtnOverlay: {
    minHeight: 36,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  sectionLabel: {
    marginTop: 4,
    fontWeight: '600',
  },
  shopScroll: {
    flex: 1,
    minHeight: 120,
  },
  shopScrollDense: {
    minHeight: 80,
  },
  shopScrollContent: {
    paddingBottom: 12,
    gap: 12,
  },
  shopScrollContentDense: {
    paddingBottom: 8,
    gap: 8,
  },
  intro: {
    marginBottom: 2,
  },
  introDense: {
    marginBottom: 0,
  },
});
