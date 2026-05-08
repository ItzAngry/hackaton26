import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Platform,
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

import { BATTLEFIELD_MAP_ASPECT } from '@/constants/battlefieldAssets';
import { cellKey } from '@/constants/mapTileGrid';
import { HERO_BY_ID, getHeroIdForUnit } from '@/constants/heroDefinitions';
import { BattleTheme } from '@/constants/battleTheme';
import { IosUi } from '@/constants/iosUi';

import { isBerlinEveningHour } from '@/lib/europeTime';
import { computeMapPlayLayout } from '@/lib/mapPlayMetrics';
import { resolveLocalMapCoordsAsync } from '@/lib/mapPointerCoords';
import { tileCenterLayoutPx, tryTilePlacementTap } from '@/lib/tileMap';
import { useOnboardingGate } from '@/lib/useOnboardingGate';

import { AttackRangeOverlay } from '@/components/attack-range-overlay';
import { BattleShopSidebar } from '@/components/battle-shop-sidebar';
import { BattlefieldMapBackground } from '@/components/battlefield-map-background';
import { BattlefieldPathTrackOverlay } from '@/components/battlefield-path-track-overlay';
import { BattlefieldRoadMap } from '@/components/battlefield-road-map';
import { DraggablePlacedUnitChip } from '@/components/draggable-placed-unit-chip';
import { HeroSprite, IdleHeroBob } from '@/components/hero-sprite';
import { PlacementPadsLayer } from '@/components/placement-pads-layer';
import { PlacementPathHoverOverlay } from '@/components/placement-path-hover-overlay';
import { QuestBookDock } from '@/components/quest-book-dock';
import { GameModal } from '@/components/game-modal';
import { UnitStatsRail } from '@/components/unit-stats-rail';
import { AppText } from '@/components/ui/app-text';
import { SecondaryButton } from '@/components/ui/secondary-button';

import { PLACE_DEFENDER_ENERGY_COST, benchPlacementWaivesEnergy, useGameStore } from '@/store/useGameStore';
import { useMapLayoutStore } from '@/store/useMapLayoutStore';

const PAD = BattleTheme.grassPadMinSize;

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
  /** Portrait overlay rail: wide enough for stacked currency chips + menu (was 120 — too tight). */
  const SIDEBAR_OVERLAY_WIDTH = 138;

  const gold = useGameStore((s) => s.gold);
  const energy = useGameStore((s) => s.energy);
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
  const [instructionOpen, setInstructionOpen] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedFieldUnitId, setSelectedFieldUnitId] = useState<string | null>(null);
  const [mapLayout, setMapLayout] = useState<{ width: number; height: number } | null>(null);
  const [pathHoverLocal, setPathHoverLocal] = useState<{ x: number; y: number } | null>(null);
  const mapPlayRef = useRef<View>(null);
  const [, setClockTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setClockTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const mapPlay = useMemo(
    () =>
      mapLayout && mapLayout.width > 0 && mapLayout.height > 0
        ? computeMapPlayLayout(mapLayout.width, mapLayout.height, BATTLEFIELD_MAP_ASPECT)
        : null,
    [mapLayout]
  );

  useEffect(() => {
    if (mapPlay) {
      useMapLayoutStore.getState().setBattleMapLayout(mapPlay);
    }
  }, [mapPlay]);

  const unplaced = useMemo(
    () => units.filter((u) => u.placedTile == null && u.placedPathCover == null),
    [units]
  );

  const placedOnField = useMemo(
    () => units.filter((u) => u.placedTile !== null && u.placedPathCover !== null),
    [units]
  );

  const occupiedTileKeys = useMemo(() => {
    const s = new Set<string>();
    for (const u of units) {
      if (u.placedTile) s.add(cellKey(u.placedTile.c, u.placedTile.r));
    }
    return s;
  }, [units]);

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
      ? `Place defenders · open Today's plan for tasks · evening defense starts 18:00 every day · difficulty day ${eveningDifficultyDay}`
      : `${enemies.length} on field · ${spawnRemaining} incoming`;

  const rockPadSlots = useMapLayoutStore((s) => s.placementPads.length);

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
    const unitId = selectedPlaceId;
    const play = mapPlay;
    if (!unitId || !play) return;
    resolveLocalMapCoordsAsync(e.nativeEvent, mapPlayRef.current, (coords) => {
      if (!coords) {
        Alert.alert('Try again', 'Could not read tap position. Tap directly on the map.');
        return;
      }
      const hit = tryTilePlacementTap(coords.lx, coords.ly, play);
      if (!hit.ok) {
        if (hit.reason === 'bad_touch') {
          Alert.alert('Try again', 'Could not read tap position. Tap directly on the map.');
          return;
        }
        Alert.alert(
          'Invalid tile',
          rockPadSlots > 0
            ? 'Place defenders only on rock pads — not on the path.'
            : 'Place defenders only on buildable grass — not on the brown path.'
        );
        return;
      }
      const ok = placeUnit(unitId, hit.c, hit.r, hit.pathCover);
      if (!ok) {
        const st = useGameStore.getState();
        const u = st.units.find((x) => x.id === unitId);
        const onBench = u != null && u.placedTile == null && u.placedPathCover == null;
        const freePlace = u != null && benchPlacementWaivesEnergy(u);
        if (u && !onBench) {
          Alert.alert('Cannot place', 'This defender is already on the map.');
        } else if (!freePlace && st.energy < PLACE_DEFENDER_ENERGY_COST) {
          Alert.alert(
            'Not enough energy',
            'Complete tasks in Today\'s plan during preparation to earn energy for placing defenders.'
          );
        } else {
          Alert.alert('Cannot place', 'Too close to another defender or another placement rule blocked this tile.');
        }
        return;
      }
      setSelectedPlaceId(null);
    });
  };

  const heroDragPlacement = useCallback(
    (absoluteX: number, absoluteY: number, heroId: string) => {
      const ml = mapLayout;
      const node = mapPlayRef.current;
      if (!ml || !node) return;
      node.measureInWindow((mx, my, mw, mh) => {
        const vw = mw > 0 ? mw : ml.width;
        const vh = mh > 0 ? mh : ml.height;
        const play = computeMapPlayLayout(vw, vh, BATTLEFIELD_MAP_ASPECT);
        const lx = absoluteX - mx;
        const ly = absoluteY - my;
        const hit = tryTilePlacementTap(lx, ly, play);
        if (!hit.ok) return;
        const ok = recruitHeroAndPlaceAt(heroId, hit.c, hit.r, hit.pathCover);
        if (!ok) {
          if (useGameStore.getState().energy < PLACE_DEFENDER_ENERGY_COST) {
            Alert.alert(
              'Not enough energy',
              'Complete tasks in Today\'s plan during preparation to earn energy for placing defenders.'
            );
          } else {
            Alert.alert(
              'Cannot recruit here',
              rockPadSlots > 0
                ? 'Drop on an empty rock pad — not the path, and not too close to another defender.'
                : 'Pick another empty grass tile — not the path, and not too close to another defender.'
            );
          }
        }
      });
    },
    [mapLayout, recruitHeroAndPlaceAt, rockPadSlots]
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
                  {mapLayout && mapPlay ? (
                    <>
                      <View style={styles.mapGestureRoot}>
                        <BattlefieldMapBackground width={mapLayout.width} height={mapLayout.height} />
                        <BattlefieldPathTrackOverlay mapPlay={mapPlay} />
                        <PlacementPadsLayer mapPlay={mapPlay} occupiedTileKeys={occupiedTileKeys} />
                        {statsOverlayVisible && pathCoverForRange !== undefined ? (
                          <AttackRangeOverlay mapPlay={mapPlay} pathCover={pathCoverForRange} visible />
                        ) : null}
                        <BattlefieldRoadMap enemies={enemies} mapPlay={mapPlay} />
                        {selectedPlaceId ? (
                          <>
                            <PlacementPathHoverOverlay
                              mapPlay={mapPlay}
                              layoutX={pathHoverLocal?.x ?? null}
                              layoutY={pathHoverLocal?.y ?? null}
                            />
                            <View
                              accessibilityLabel="Place defender on buildable tile"
                              style={StyleSheet.absoluteFillObject}
                              onTouchMove={(e) => {
                                const { locationX, locationY } = e.nativeEvent;
                                setPathHoverLocal({ x: locationX, y: locationY });
                              }}
                              onTouchEnd={(e) => {
                                attemptPlaceAt(e);
                                setPathHoverLocal(null);
                              }}
                              onTouchCancel={() => setPathHoverLocal(null)}
                              {...(Platform.OS === 'web'
                                ? {
                                    onPointerMove: (e: { nativeEvent: { offsetX?: number; offsetY?: number; locationX?: number; locationY?: number } }) => {
                                      const ne = e.nativeEvent;
                                      const lx = typeof ne.offsetX === 'number' ? ne.offsetX : ne.locationX;
                                      const ly = typeof ne.offsetY === 'number' ? ne.offsetY : ne.locationY;
                                      if (typeof lx === 'number' && typeof ly === 'number') {
                                        setPathHoverLocal({ x: lx, y: ly });
                                      }
                                    },
                                    onPointerLeave: () => setPathHoverLocal(null),
                                  }
                                : {})}
                            />
                          </>
                        ) : null}
                        {placedOnField.map((u) => {
                          const tile = u.placedTile!;
                          const { x: tcx, y: tcy } = tileCenterLayoutPx(tile.c, tile.r, mapPlay);
                          const cx = tcx - PAD / 2;
                          const cy = tcy - PAD / 2;
                          const selHere = statsOverlayVisible && selectedFieldUnit?.id === u.id;
                          return (
                            <DraggablePlacedUnitChip
                              key={u.id}
                              cx={cx}
                              cy={cy}
                              pad={PAD}
                              mapPlay={mapPlay}
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
                                      size={Math.round(PAD * 0.92)}
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
                      <View
                        style={[styles.fortHud, { top: Math.max(insets.top, 8) }]}
                        pointerEvents="none">
                        <AppText variant="title3" style={styles.fortHudEmoji}>
                          🏰
                        </AppText>
                        <View style={styles.fortHudText}>
                          <AppText variant="caption1" style={styles.fortHudLabel}>
                            Fortress
                          </AppText>
                          <View style={styles.hpTrack}>
                            <View style={[styles.hpFill, { width: `${hpPct}%` }]} />
                          </View>
                        </View>
                        <AppText variant="caption1" color="secondary" style={styles.fortHudHp}>
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
                    energy={energy}
                    phaseTitle={phaseLabel}
                    phaseSub={phaseSub}
                    menu={battleMenu}
                    heroDragPlacement={heroDragPlacement}
                    onInstructionPress={() => setInstructionOpen(true)}
                  />
                </View>
              </View>
            ) : (
              <BattleShopSidebar
                variant="rail"
                gold={gold}
                energy={energy}
                phaseTitle={phaseLabel}
                phaseSub={phaseSub}
                menu={battleMenu}
                heroDragPlacement={heroDragPlacement}
                onInstructionPress={() => setInstructionOpen(true)}
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
        onCompleteQuest={(id, proofUri) => completeQuest(id, proofUri)}
        canCompleteTasks={dayPhase === 'morning'}
      />

      <GameModal visible={instructionOpen} onRequestClose={() => setInstructionOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setInstructionOpen(false)}>
          <Pressable style={styles.instructionCard} onPress={(e) => e.stopPropagation()}>
            <AppText variant="title3">Instruction</AppText>
            <AppText variant="footnote" color="secondary">
              {`1. Complete tasks in real life to get energy.\n\n2. Use that energy to build your own tower defence.\n\n3. Survive the day and get a streak.`}
            </AppText>
            <SecondaryButton title="Close" onPress={() => setInstructionOpen(false)} />
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
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(60,60,67,0.12)',
    maxWidth: '72%',
    zIndex: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  fortHudEmoji: {
    lineHeight: 26,
  },
  fortHudLabel: {
    fontWeight: '600',
    opacity: 0.92,
  },
  fortHudHp: {
    fontVariant: ['tabular-nums'],
  },
  fortHudText: {
    flex: 1,
    gap: 5,
    minWidth: 0,
    maxWidth: 140,
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
  instructionCard: {
    backgroundColor: IosUi.systemBackground,
    borderRadius: 16,
    padding: 18,
    gap: 12,
    width: '100%',
    maxWidth: 380,
  },
});
