import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
} from 'react-native';
import { Redirect } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HERO_BY_ID, getHeroIdForUnit } from '@/constants/heroDefinitions';
import { BattleTheme } from '@/constants/battleTheme';
import { IosUi } from '@/constants/iosUi';

import { isBerlinEveningHour } from '@/lib/europeTime';
import { tileCenterLayoutPx, tryTilePlacementTap } from '@/lib/tileMap';
import { useOnboardingGate } from '@/lib/useOnboardingGate';

import { AttackRangeOverlay } from '@/components/attack-range-overlay';
import { BattleShopSidebar } from '@/components/battle-shop-sidebar';
import { BattlefieldMapBackground } from '@/components/battlefield-map-background';
import { BattlefieldRoadMap } from '@/components/battlefield-road-map';
import { DraggablePlacedUnitChip } from '@/components/draggable-placed-unit-chip';
import { HeroSprite, IdleHeroBob } from '@/components/hero-sprite';
import { TileGridOverlay } from '@/components/tile-grid-overlay';
import { QuestBookDock } from '@/components/quest-book-dock';
import { GameModal } from '@/components/game-modal';
import { UnitStatsRail } from '@/components/unit-stats-rail';
import { AppText } from '@/components/ui/app-text';
import { SecondaryButton } from '@/components/ui/secondary-button';

import { type Enemy, useGameStore } from '@/store/useGameStore';

const PAD = BattleTheme.grassPadMinSize;

function enemyEmoji(_e: Enemy): string {
  return '👾';
}

export default function BattleScreen() {
  const gate = useOnboardingGate();
  if (gate === 'loading') return null;
  if (gate === 'redirect') return <Redirect href="/onboarding/avatar" />;
  return <BattleScreenInner />;
}

function BattleScreenInner() {
  const insets = useSafeAreaInsets();
  const { width: windowW } = useWindowDimensions();
  const landscapeUi = windowW > 480;
  const mobilePortrait = windowW < 560 && !landscapeUi;
  const SIDEBAR_OVERLAY_WIDTH = 120;

  const gold = useGameStore((s) => s.gold);
  const dayStreak = useGameStore((s) => s.dayStreak);
  const dayPhase = useGameStore((s) => s.dayPhase);
  const eveningEndsAtMs = useGameStore((s) => s.eveningEndsAtMs);
  const fortressHp = useGameStore((s) => s.fortressHp);
  const fortressMaxHp = useGameStore((s) => s.fortressMaxHp);
  const units = useGameStore((s) => s.units);
  const enemies = useGameStore((s) => s.enemies);
  const spawnRemaining = useGameStore((s) => s.spawnRemaining);
  const tickCombat = useGameStore((s) => s.tickCombat);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(72, Math.max(0, now - last));
      last = now;
      tickCombat(dt);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [tickCombat]);

  const quests = useGameStore((s) => s.quests);
  const completeQuest = useGameStore((s) => s.completeQuest);
  const placeUnit = useGameStore((s) => s.placeUnit);
  const recruitHeroAndPlaceAt = useGameStore((s) => s.recruitHeroAndPlaceAt);
  const movePlacedUnit = useGameStore((s) => s.movePlacedUnit);
  const startEveningDefense = useGameStore((s) => s.startEveningDefense);
  const debugCompleteEveningSuccess = useGameStore((s) => s.debugCompleteEveningSuccess);
  const resetAfterDefeatDemo = useGameStore((s) => s.resetAfterDefeatDemo);

  const [questOpen, setQuestOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedFieldUnitId, setSelectedFieldUnitId] = useState<string | null>(null);
  const [mapLayout, setMapLayout] = useState<{ width: number; height: number } | null>(null);
  const mapPlayRef = useRef<View>(null);
  const [, setClockTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setClockTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const unplaced = useMemo(() => units.filter((u) => u.placedPathCover === null), [units]);

  const placedOnField = useMemo(
    () => units.filter((u) => u.placedTile !== null && u.placedPathCover !== null),
    [units]
  );

  const selectedFieldUnit = useMemo(() => {
    if (!selectedFieldUnitId) return null;
    const u = units.find((x) => x.id === selectedFieldUnitId);
    if (!u || u.placedPathCover === null || !u.placedTile) return null;
    return u;
  }, [units, selectedFieldUnitId]);

  const eveningDifficultyDay = Math.max(1, dayStreak + 1);
  const berlinEvening = isBerlinEveningHour();

  const eveningRemainingSec =
    dayPhase === 'evening' && eveningEndsAtMs != null
      ? Math.max(0, Math.ceil((eveningEndsAtMs - Date.now()) / 1000))
      : 0;
  const mm = Math.floor(eveningRemainingSec / 60);
  const ss = eveningRemainingSec % 60;
  const countdownLabel = `${mm}:${ss.toString().padStart(2, '0')}`;

  const phaseLabel =
    dayPhase === 'morning'
      ? `Preparation · Streak ${dayStreak}`
      : `Evening defense · ${countdownLabel} left`;

  const phaseSub =
    dayPhase === 'morning'
      ? `Place defenders · open Today's plan for tasks · next defense is difficulty day ${eveningDifficultyDay}`
      : `${enemies.length} on field · ${spawnRemaining} incoming`;

  const battleMenu = useMemo(
    () => ({
      onOpenQuests: () => setQuestOpen(true),
      onStartDefense: () => startEveningDefense(),
      onDebugSkipPrepPhase: () => debugCompleteEveningSuccess(),
      onDebugReset: () => resetAfterDefeatDemo(),
      showPrepPhaseActions: dayPhase === 'morning',
      berlinEvening,
    }),
    [dayPhase, berlinEvening, startEveningDefense, debugCompleteEveningSuccess, resetAfterDefeatDemo]
  );

  const hpPct = fortressMaxHp > 0 ? Math.round((fortressHp / fortressMaxHp) * 100) : 0;

  const statsOverlayVisible = selectedFieldUnit !== null;
  const pathCoverForRange =
    selectedFieldUnit && selectedFieldUnit.placedPathCover !== null
      ? selectedFieldUnit.placedPathCover
      : undefined;

  const attemptPlaceAt = (e: GestureResponderEvent) => {
    if (!selectedPlaceId || !mapLayout) return;
    const ne = e.nativeEvent as GestureResponderEvent['nativeEvent'] & {
      offsetX?: number;
      offsetY?: number;
    };
    const lxRaw =
      typeof ne.locationX === 'number'
        ? ne.locationX
        : typeof ne.offsetX === 'number'
          ? ne.offsetX
          : undefined;
    const lyRaw =
      typeof ne.locationY === 'number'
        ? ne.locationY
        : typeof ne.offsetY === 'number'
          ? ne.offsetY
          : undefined;
    const hit = tryTilePlacementTap(
      lxRaw ?? Number.NaN,
      lyRaw ?? Number.NaN,
      mapLayout.width,
      mapLayout.height
    );
    if (!hit.ok) {
      if (hit.reason === 'bad_touch') {
        Alert.alert('Try again', 'Could not read tap position. Tap directly on the map.');
        return;
      }
      Alert.alert('Invalid tile', 'Place defenders only on green tiles — not on the brown path.');
      return;
    }
    const ok = placeUnit(selectedPlaceId, hit.c, hit.r, hit.pathCover);
    if (!ok) {
      Alert.alert('Cannot place', 'Too close to another defender or unit already on the field.');
      return;
    }
    setSelectedPlaceId(null);
  };

  const heroDragPlacement = useCallback(
    (absoluteX: number, absoluteY: number, heroId: string) => {
      const ml = mapLayout;
      const node = mapPlayRef.current;
      if (!ml || !node) return;
      node.measureInWindow((mx, my, mw, mh) => {
        const mapW = mw > 0 ? mw : ml.width;
        const mapH = mh > 0 ? mh : ml.height;
        const lx = absoluteX - mx;
        const ly = absoluteY - my;
        const hit = tryTilePlacementTap(lx, ly, mapW, mapH);
        if (!hit.ok) return;
        const ok = recruitHeroAndPlaceAt(heroId, hit.c, hit.r, hit.pathCover);
        if (!ok) {
          Alert.alert(
            'Cannot recruit here',
            'Pick another empty green tile — not the path, and not too close to another defender.'
          );
        }
      });
    },
    [mapLayout, recruitHeroAndPlaceAt]
  );

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.overlay}>
        <View style={styles.body}>
          <View style={[styles.battleStage, !mobilePortrait && styles.mainRow]}>
            <View style={styles.mapColumn}>
              <View style={styles.mapStackOuter}>
                <View
                  ref={mapPlayRef}
                  style={styles.mapPlay}
                  onLayout={(e) => {
                    const { width, height } = e.nativeEvent.layout;
                    if (width > 0 && height > 0) setMapLayout({ width, height });
                  }}>
                  {mapLayout ? (
                    <>
                      <View style={styles.mapGestureRoot}>
                        <BattlefieldMapBackground width={mapLayout.width} height={mapLayout.height} />
                        <TileGridOverlay width={mapLayout.width} height={mapLayout.height} />
                        {statsOverlayVisible && pathCoverForRange !== undefined ? (
                          <AttackRangeOverlay
                            mapWidth={mapLayout.width}
                            mapHeight={mapLayout.height}
                            pathCover={pathCoverForRange}
                            visible
                          />
                        ) : null}
                        <BattlefieldRoadMap
                          enemies={enemies}
                          enemyEmoji={enemyEmoji}
                          width={mapLayout.width}
                          height={mapLayout.height}
                        />
                        {selectedPlaceId ? (
                          <Pressable
                            accessibilityLabel="Place defender on buildable tile"
                            style={StyleSheet.absoluteFillObject}
                            onPress={attemptPlaceAt}
                          />
                        ) : null}
                        {placedOnField.map((u) => {
                          const tile = u.placedTile!;
                          const { x: tcx, y: tcy } = tileCenterLayoutPx(
                            tile.c,
                            tile.r,
                            mapLayout.width,
                            mapLayout.height
                          );
                          const cx = tcx - PAD / 2;
                          const cy = tcy - PAD / 2;
                          const selHere = statsOverlayVisible && selectedFieldUnit?.id === u.id;
                          return (
                            <DraggablePlacedUnitChip
                              key={u.id}
                              cx={cx}
                              cy={cy}
                              pad={PAD}
                              mapW={mapLayout.width}
                              mapH={mapLayout.height}
                              unitId={u.id}
                              selected={selHere}
                              onTapSelect={() => {
                                setSelectedFieldUnitId(u.id);
                                setSelectedPlaceId(null);
                              }}
                              movePlacedUnit={movePlacedUnit}>
                              <IdleHeroBob>
                                {(() => {
                                  const def = HERO_BY_ID[getHeroIdForUnit(u)];
                                  return def ? (
                                    <HeroSprite
                                      sheet={def.sheet}
                                      sheetW={def.sheetW}
                                      sheetH={def.sheetH}
                                      frames={def.frames}
                                      size={Math.round(PAD * 0.78)}
                                    />
                                  ) : null;
                                })()}
                              </IdleHeroBob>
                              <AppText variant="caption1" numberOfLines={1}>
                                {u.hp}/{u.maxHp}
                              </AppText>
                            </DraggablePlacedUnitChip>
                          );
                        })}
                      </View>
                      <View style={styles.fortHud} pointerEvents="none">
                        <AppText variant="title3">🏰</AppText>
                        <View style={styles.fortHudText}>
                          <AppText variant="caption1">Fortress</AppText>
                          <View style={styles.hpTrack}>
                            <View style={[styles.hpFill, { width: `${hpPct}%` }]} />
                          </View>
                        </View>
                        <AppText variant="caption1" color="secondary">
                          {fortressHp}/{fortressMaxHp}
                        </AppText>
                      </View>
                      {selectedFieldUnit ? (
                        <View
                          pointerEvents="box-none"
                          style={[
                            styles.unitHudWrap,
                            mobilePortrait ? styles.unitHudWrapMobile : styles.unitHudWrapRail,
                          ]}>
                          <View
                            style={[
                              styles.unitHudInner,
                              {
                                paddingTop: Math.max(insets.top, 6),
                                paddingBottom: Math.max(insets.bottom, 6),
                              },
                            ]}>
                            <UnitStatsRail
                              unit={selectedFieldUnit}
                              floatingOverlay
                              onClose={() => setSelectedFieldUnitId(null)}
                            />
                          </View>
                        </View>
                      ) : null}
                    </>
                  ) : null}
                </View>
              </View>
            </View>

            {mobilePortrait ? (
              <View pointerEvents="box-none" style={styles.sidebarOverlayHost}>
                <View
                  style={[
                    styles.sidebarOverlayPane,
                    {
                      width: SIDEBAR_OVERLAY_WIDTH,
                    },
                  ]}>
                  <BattleShopSidebar
                    variant="overlay"
                    gold={gold}
                    phaseTitle={phaseLabel}
                    phaseSub={phaseSub}
                    menu={battleMenu}
                    heroDragPlacement={heroDragPlacement}
                    onTipsPress={() => setTipsOpen(true)}
                  />
                </View>
              </View>
            ) : (
              <BattleShopSidebar
                variant="rail"
                gold={gold}
                phaseTitle={phaseLabel}
                phaseSub={phaseSub}
                menu={battleMenu}
                heroDragPlacement={heroDragPlacement}
                onTipsPress={() => setTipsOpen(true)}
                landscapeCompact={landscapeUi}
              />
            )}
          </View>

          {unplaced.length > 0 ? (
            <View style={styles.bottomDock}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.rosterScrollHost}
                contentContainerStyle={styles.rosterScroll}>
                {unplaced.map((u) => {
                  const sel = selectedPlaceId === u.id;
                  return (
                    <Pressable
                      key={u.id}
                      onPress={() => {
                        setSelectedPlaceId(sel ? null : u.id);
                        setSelectedFieldUnitId(null);
                      }}
                      style={[styles.rosterChip, sel && styles.rosterChipSel]}>
                      {(() => {
                        const def = HERO_BY_ID[getHeroIdForUnit(u)];
                        return def ? (
                          <HeroSprite
                            sheet={def.sheet}
                            sheetW={def.sheetW}
                            sheetH={def.sheetH}
                            frames={def.frames}
                            size={36}
                          />
                        ) : null;
                      })()}
                      <AppText variant="caption1" numberOfLines={1}>
                        {u.name}
                      </AppText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </View>

      <QuestBookDock
        visible={questOpen}
        onRequestOpen={() => setQuestOpen(true)}
        onClose={() => setQuestOpen(false)}
        quests={quests}
        onCompleteQuest={(id) => completeQuest(id)}
        canCompleteTasks={dayPhase === 'morning'}
      />

      <GameModal visible={tipsOpen} onRequestClose={() => setTipsOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setTipsOpen(false)}>
          <Pressable style={styles.tipsCard} onPress={(e) => e.stopPropagation()}>
            <AppText variant="title3">Tips</AppText>
            <AppText variant="footnote" color="secondary">
              Preparation only: recruit and place defenders (long-press a hero onto a green tile, or tap roster chips).
              Open the book at bottom center or the menu Today&apos;s plan for bonus-gold tasks before you defend. Evening is the
              only combat phase — start timed defense when ready (~20 min; Berlin cues often ~18:00). Survive with your
              fortress standing for streak progression; fortress loss resets your run. Recall defenders from their stats card.
              Today&apos;s plan is optional support, not a gate.
            </AppText>
            <SecondaryButton title="Close" onPress={() => setTipsOpen(false)} />
          </Pressable>
        </Pressable>
      </GameModal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: IosUi.secondarySystemGroupedBackground,
  },
  overlay: {
    flex: 1,
  },
  body: {
    flex: 1,
    minHeight: 0,
    gap: 2,
  },
  battleStage: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 0,
  },
  sidebarOverlayHost: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 48,
    elevation: 24,
  },
  sidebarOverlayPane: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 24,
    elevation: 12,
  },
  mapColumn: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  mapStackOuter: {
    flex: 1,
    minHeight: 0,
  },
  fortHud: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    maxWidth: '78%',
    zIndex: 12,
    elevation: 4,
  },
  fortHudText: {
    flex: 1,
    gap: 4,
    minWidth: 0,
    maxWidth: 160,
  },
  unitHudWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    zIndex: 40,
    elevation: 14,
  },
  unitHudWrapRail: {
    right: 0,
    width: '42%',
    maxWidth: 320,
  },
  unitHudWrapMobile: {
    left: 0,
    right: 0,
  },
  unitHudInner: {
    flex: 1,
  },
  bottomDock: {
    gap: 4,
    paddingTop: 4,
  },
  rosterScrollHost: {
    flexGrow: 0,
    maxHeight: 52,
  },
  hpTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: IosUi.systemGray5,
    overflow: 'hidden',
  },
  hpFill: {
    height: '100%',
    backgroundColor: IosUi.systemBlue,
    borderRadius: 4,
  },
  rosterScroll: {
    gap: 6,
    alignItems: 'center',
    paddingVertical: 2,
    minHeight: 38,
  },
  rosterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: IosUi.systemBackground,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: IosUi.separator,
    marginRight: 8,
    alignItems: 'center',
    maxWidth: 92,
  },
  rosterChipSel: {
    borderColor: IosUi.systemBlue,
    borderWidth: 2,
  },
  mapPlay: {
    flex: 1,
    minHeight: 100,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#2E3440',
    borderWidth: 0,
  },
  mapGestureRoot: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  tipsCard: {
    backgroundColor: IosUi.systemBackground,
    borderRadius: 16,
    padding: 18,
    gap: 12,
    width: '100%',
    maxWidth: 380,
  },
});
