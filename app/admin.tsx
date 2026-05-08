import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import Svg, { Polyline } from 'react-native-svg';
import { Stack, useRouter } from 'expo-router';

import { BATTLEFIELD_MAP_ASPECT, BATTLEFIELD_MAP_IMAGE } from '@/constants/battlefieldAssets';
import { PLACEMENT_PAD_ROCKS } from '@/constants/placementPadAssets';
import {
  DEFAULT_PATH_CELL_ORDER,
  GRID_COLS,
  GRID_ROWS,
  cellKey,
} from '@/constants/mapTileGrid';
import { IosRadius, IosUi } from '@/constants/iosUi';
import { buildMapLayoutCloudSliceFromStore, upsertSharedMapLayout } from '@/lib/gameCloudSync';
import { isSupabaseConfigured } from '@/lib/supabase';

import type { NormPt } from '@/lib/mapGeometry';

import { computeMapPlayLayout, type MapPlayLayout } from '@/lib/mapPlayMetrics';
import { resolveLocalMapCoordsAsync } from '@/lib/mapPointerCoords';
import { pickTileFromLocalPx, tileCenterLayoutPx } from '@/lib/tileMap';

import { AppText } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SecondaryButton } from '@/components/ui/secondary-button';

import type { PathCell, PlacementPad } from '@/store/useMapLayoutStore';
import {
  DEFAULT_PATH_HALF_WIDTH_NORM,
  deriveBlockedKeysFromPath,
  polylineFromGridPath,
  useMapLayoutStore,
} from '@/store/useMapLayoutStore';

/** Optional gate: set `EXPO_PUBLIC_ADMIN_SECRET` in env for deploys; leave unset for open local dev. */
const ADMIN_SECRET = process.env.EXPO_PUBLIC_ADMIN_SECRET ?? '';

type EditMode = 'path' | 'placement';

function randomRockVariant(): 1 | 2 | 3 | 4 {
  return (Math.floor(Math.random() * 4) + 1) as 1 | 2 | 3 | 4;
}

function samplePolylineToPathCells(poly: NormPt[]): PathCell[] {
  if (poly.length < 2) return [];
  const seen = new Set<string>();
  const out: PathCell[] = [];
  const push = (nx: number, ny: number) => {
    const c = Math.min(GRID_COLS - 1, Math.max(0, Math.floor(nx * GRID_COLS)));
    const r = Math.min(GRID_ROWS - 1, Math.max(0, Math.floor(ny * GRID_ROWS)));
    const k = cellKey(c, r);
    if (!seen.has(k)) {
      seen.add(k);
      out.push({ c, r });
    }
  };
  for (let i = 0; i < poly.length - 1; i++) {
    const a = poly[i];
    const b = poly[i + 1];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(12, Math.ceil(segLen * 160));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      push(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
    }
  }
  return out;
}

export default function AdminMapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowW } = useWindowDimensions();

  const storePathPoly = useMapLayoutStore((s) => s.pathPolylineNorm);
  const storePads = useMapLayoutStore((s) => s.placementPads);
  const storeHalfW = useMapLayoutStore((s) => s.pathHalfWidthNorm);
  const setFreehandLayout = useMapLayoutStore((s) => s.setFreehandLayout);
  const resetToDefaults = useMapLayoutStore((s) => s.resetToDefaults);

  const [mode, setMode] = useState<EditMode>('path');
  const [draftPathPoly, setDraftPathPoly] = useState<NormPt[]>(() =>
    storePathPoly.length >= 2
      ? storePathPoly.map((p) => ({ ...p }))
      : polylineFromGridPath(DEFAULT_PATH_CELL_ORDER.map((p) => ({ c: p.c, r: p.r })))
  );
  const [draftPads, setDraftPads] = useState<PlacementPad[]>(() => storePads.map((p) => ({ ...p })));
  const [halfWidthText, setHalfWidthText] = useState(() => String(storeHalfW));
  const [passInput, setPassInput] = useState('');
  const [unlocked, setUnlocked] = useState(() => ADMIN_SECRET.length === 0);
  const mapWrapRef = useRef<View>(null);

  /** Same UV space as battle: coords are 0–1 over the letterboxed image rect (scales with any viewport). */
  const appendPathPoint = useCallback((lx: number, ly: number, layout: MapPlayLayout) => {
    const nx = (lx - layout.originX) / layout.playW;
    const ny = (ly - layout.originY) / layout.playH;
    if (!Number.isFinite(nx) || !Number.isFinite(ny) || layout.playW <= 0 || layout.playH <= 0) return;
    const cx = Math.max(0, Math.min(1, nx));
    const cy = Math.max(0, Math.min(1, ny));
    setDraftPathPoly((prev) => {
      const last = prev[prev.length - 1];
      if (last) {
        const d = Math.hypot(cx - last.x, cy - last.y);
        if (d < 0.0035) return prev;
      }
      return [...prev, { x: cx, y: cy }];
    });
  }, []);

  useEffect(() => {
    setDraftPads(storePads.map((p) => ({ ...p })));
  }, [storePads]);

  useEffect(() => {
    setHalfWidthText(String(storeHalfW));
  }, [storeHalfW]);

  /** Keep draft path in sync with store when the saved polyline changes (load, reset, save). */
  useEffect(() => {
    setDraftPathPoly(
      storePathPoly.length >= 2
        ? storePathPoly.map((p) => ({ x: p.x, y: p.y }))
        : polylineFromGridPath(DEFAULT_PATH_CELL_ORDER.map((p) => ({ c: p.c, r: p.r })))
    );
  }, [storePathPoly]);

  const mapW = Math.min(560, Math.max(280, windowW - 40));
  const mapH = (mapW * GRID_ROWS) / GRID_COLS;
  const adminMapPlay = useMemo(
    () => computeMapPlayLayout(mapW, mapH, BATTLEFIELD_MAP_ASPECT),
    [mapW, mapH]
  );

  const pathCellsForBlocked = useMemo(
    () => samplePolylineToPathCells(draftPathPoly),
    [draftPathPoly]
  );
  const blockedSet = useMemo(() => new Set(deriveBlockedKeysFromPath(pathCellsForBlocked)), [pathCellsForBlocked]);

  const mapLayoutRef = useRef(adminMapPlay);
  mapLayoutRef.current = adminMapPlay;

  const pathPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => mode === 'path',
        onMoveShouldSetPanResponder: () => mode === 'path',
        onPanResponderGrant: (e) => {
          appendPathPoint(e.nativeEvent.locationX, e.nativeEvent.locationY, mapLayoutRef.current);
        },
        onPanResponderMove: (e) => {
          appendPathPoint(e.nativeEvent.locationX, e.nativeEvent.locationY, mapLayoutRef.current);
        },
      }),
    [mode, appendPathPoint]
  );

  const pathPointsAttr = useMemo(() => {
    const L = adminMapPlay;
    return draftPathPoly.map((p) => `${L.originX + p.x * L.playW},${L.originY + p.y * L.playH}`).join(' ');
  }, [draftPathPoly, adminMapPlay]);

  const placementHint = useMemo(() => {
    const n = draftPads.length;
    if (n === 0) {
      return 'Tap grass tiles to drop rock pads (defender slots). Tap again on a pad to remove it. Each new pad picks rock art 1–4 at random.';
    }
    return `${n} pad${n === 1 ? '' : 's'} on the map. Tap a rock to remove it. Save to use these slots in battle.`;
  }, [draftPads.length]);

  const undoPath = useCallback(() => {
    setDraftPathPoly((prev) => prev.slice(0, -1));
  }, []);

  const clearPath = useCallback(() => setDraftPathPoly([]), []);

  const undoLastPad = useCallback(() => {
    setDraftPads((prev) => prev.slice(0, -1));
  }, []);

  const clearPads = useCallback(() => setDraftPads([]), []);

  const onPlacementTap = useCallback(
    (lx: number, ly: number) => {
      const picked = pickTileFromLocalPx(lx, ly, adminMapPlay);
      if (!picked) return;
      const k = cellKey(picked.c, picked.r);
      if (blockedSet.has(k)) {
        Alert.alert('On the path', 'Place rocks only on grass — not on the enemy route.');
        return;
      }
      setDraftPads((prev) => {
        const idx = prev.findIndex((p) => p.c === picked.c && p.r === picked.r);
        if (idx >= 0) return prev.filter((_, i) => i !== idx);
        return [...prev, { c: picked.c, r: picked.r, rock: randomRockVariant() }];
      });
    },
    [blockedSet, adminMapPlay]
  );

  const resetDraft = useCallback(() => {
    setDraftPathPoly(polylineFromGridPath(DEFAULT_PATH_CELL_ORDER.map((p) => ({ c: p.c, r: p.r }))));
    setDraftPads([]);
    setHalfWidthText(String(DEFAULT_PATH_HALF_WIDTH_NORM));
  }, []);

  const onSave = useCallback(async () => {
    if (draftPathPoly.length < 2) {
      Alert.alert('Path too short', 'Draw a route with at least two points (drag on the map in Pathing mode).');
      return;
    }
    const parsedHalf = Number.parseFloat(halfWidthText.replace(',', '.'));
    const halfNorm =
      Number.isFinite(parsedHalf) && parsedHalf > 0 && parsedHalf < 0.2 ? parsedHalf : DEFAULT_PATH_HALF_WIDTH_NORM;

    const pathCells = samplePolylineToPathCells(draftPathPoly);
    if (pathCells.length < 2) {
      Alert.alert('Path too short', 'Could not derive grid cells from the stroke — draw a longer path.');
      return;
    }

    const keys = draftPads.map((p) => cellKey(p.c, p.r));

    const pathPolySave = draftPathPoly.map((p) => ({ x: p.x, y: p.y }));

    setFreehandLayout({
      pathPolylineNorm: pathPolySave,
      pathHalfWidthNorm: halfNorm,
      placementPolygonNorm: [],
      pathCellOrder: pathCells,
      placementCellKeys: keys,
      placementPads: draftPads.map((p) => ({ c: p.c, r: p.r, rock: p.rock })),
    });

    const savedPoly = useMapLayoutStore.getState().pathPolylineNorm;
    setDraftPathPoly(
      savedPoly.length >= 2
        ? savedPoly.map((p) => ({ x: p.x, y: p.y }))
        : polylineFromGridPath(DEFAULT_PATH_CELL_ORDER.map((p) => ({ c: p.c, r: p.r })))
    );

    let cloudLine: string;
    if (!isSupabaseConfigured()) {
      cloudLine =
        'Supabase is not configured in this build (missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY). The map is still saved on this device only; add env and restart Expo to publish the global map for everyone.';
    } else {
      try {
        const { error } = await upsertSharedMapLayout(buildMapLayoutCloudSliceFromStore());
        cloudLine = error
          ? `Could not publish global map: ${error}`
          : 'Published to Supabase — all players will use this path and pads after they open the game (or pull to refresh).';
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        cloudLine = `Could not publish global map: ${msg}`;
      }
    }

    Alert.alert('Saved', `Path and rock pads are stored on this device.\n\n${cloudLine}`, [
      { text: 'OK' },
      { text: 'Battle', onPress: () => router.replace('/') },
    ]);
  }, [draftPathPoly, draftPads, halfWidthText, router, setFreehandLayout]);

  const onResetStore = useCallback(() => {
    resetToDefaults();
    resetDraft();
  }, [resetToDefaults, resetDraft]);

  const tryUnlock = useCallback(() => {
    if (passInput === ADMIN_SECRET) setUnlocked(true);
    else Alert.alert('Wrong passphrase');
  }, [passInput]);

  const cellW = adminMapPlay.playW / GRID_COLS;
  const cellH = adminMapPlay.playH / GRID_ROWS;
  const rockSize = Math.min(cellW, cellH) * 0.72;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          ...(Platform.OS === 'web' && {
            meta: [{ name: 'robots', content: 'noindex, nofollow' }],
          }),
        }}
      />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(100, insets.bottom + 76) }]}
          keyboardShouldPersistTaps="handled">
          <AppText variant="title2" style={styles.title}>
            Map editor
          </AppText>
          <AppText variant="footnote" style={styles.hint}>
            Pathing: drag on the map image — points are saved in image space (same letterbox scaling as battle). Save
            publishes the path and rock pads to Supabase as the global map for every player. Placement: tap tiles to add
            rock pads (defender slots). Tap again to remove. Each pad gets a random rock 1–4. Empty pad list → any grass
            tile works like before.
          </AppText>

          <View style={styles.halfRow}>
            <AppText variant="caption1" style={styles.halfLabel}>
              Path half-width (norm)
            </AppText>
            <TextInput
              value={halfWidthText}
              onChangeText={setHalfWidthText}
              keyboardType="decimal-pad"
              placeholder={String(DEFAULT_PATH_HALF_WIDTH_NORM)}
              style={styles.inputSmall}
            />
          </View>

          {!unlocked ? (
            <View style={styles.gate}>
              <AppText variant="body">Enter admin passphrase</AppText>
              <TextInput
                value={passInput}
                onChangeText={setPassInput}
                secureTextEntry
                placeholder="Passphrase"
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <PrimaryButton title="Unlock" onPress={tryUnlock} />
            </View>
          ) : (
            <>
              <View
                ref={mapWrapRef}
                style={[
                  styles.mapWrap,
                  { width: mapW, height: mapH },
                  mode === 'placement' && styles.mapWrapPlacementActive,
                ]}>
                <ExpoImage
                  source={BATTLEFIELD_MAP_IMAGE}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="contain"
                  transition={0}
                />
                {mode === 'path' ? (
                  <View style={[StyleSheet.absoluteFillObject, styles.pathModeTint]} pointerEvents="none" />
                ) : null}
                {mode === 'placement' ? (
                  <View style={[StyleSheet.absoluteFillObject, styles.placementModeTint]} pointerEvents="none" />
                ) : null}

                <Svg
                  width={mapW}
                  height={mapH}
                  style={[StyleSheet.absoluteFillObject, { zIndex: 3 }]}
                  pointerEvents="none">
                  {draftPathPoly.length >= 2 ? (
                    <Polyline
                      points={pathPointsAttr}
                      fill="none"
                      stroke={IosUi.systemBlue}
                      strokeWidth={3}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  ) : null}
                </Svg>

                <View style={[StyleSheet.absoluteFillObject, styles.padsVisualLayer]} pointerEvents="none">
                  {draftPads.map((pad, i) => {
                    const { x, y } = tileCenterLayoutPx(pad.c, pad.r, adminMapPlay);
                    const src = PLACEMENT_PAD_ROCKS[pad.rock - 1];
                    return (
                      <Image
                        key={`draft-pad-${pad.c}-${pad.r}-${i}`}
                        source={src}
                        style={{
                          position: 'absolute',
                          left: x - rockSize / 2,
                          top: y - rockSize / 2,
                          width: rockSize,
                          height: rockSize,
                        }}
                        resizeMode="contain"
                        accessibilityLabel={`Placement pad ${i + 1}`}
                      />
                    );
                  })}
                </View>

                {mode === 'placement' ? (
                  <View style={styles.placementTopBanner} pointerEvents="none">
                    <AppText variant="footnote" style={styles.placementTopBannerTitle}>
                      Rock pads · defender slots
                    </AppText>
                    <AppText variant="caption1" style={styles.placementTopBannerSub}>
                      Tap grass to add / tap rock again to remove · {draftPads.length} pad
                      {draftPads.length === 1 ? '' : 's'}
                    </AppText>
                  </View>
                ) : null}

                {mode === 'path' ? (
                  <View style={[StyleSheet.absoluteFillObject, { zIndex: 5 }]} {...pathPan.panHandlers} />
                ) : null}
                {mode === 'placement' ? (
                  <Pressable
                    style={[StyleSheet.absoluteFillObject, styles.placementHitLayer]}
                    onPress={(e) => {
                      resolveLocalMapCoordsAsync(e.nativeEvent, mapWrapRef.current, (c) => {
                        if (!c) return;
                        onPlacementTap(c.lx, c.ly);
                      });
                    }}
                  />
                ) : null}
              </View>

              {mode === 'placement' ? (
                <View style={styles.placementHintCard}>
                  <AppText variant="caption1" style={styles.placementHintText}>
                    {placementHint}
                  </AppText>
                </View>
              ) : null}

              {mode === 'path' ? (
                <View style={styles.row}>
                  <SecondaryButton title="Undo stroke" onPress={undoPath} disabled={draftPathPoly.length === 0} />
                  <SecondaryButton title="Clear path" onPress={clearPath} />
                </View>
              ) : (
                <View style={styles.row}>
                  <SecondaryButton title="Undo last pad" onPress={undoLastPad} disabled={draftPads.length === 0} />
                  <SecondaryButton title="Clear all pads" onPress={clearPads} />
                  <AppText variant="caption1" style={styles.padCount}>
                    Pads: {draftPads.length}
                  </AppText>
                </View>
              )}

              <View style={styles.row}>
                <SecondaryButton title="Reset draft (defaults)" onPress={resetDraft} />
                <SecondaryButton title="Reset saved map" onPress={onResetStore} />
              </View>
              <PrimaryButton title="Save map" onPress={onSave} />
              <AppText variant="caption1" style={styles.footer}>
                Path points: {draftPathPoly.length} · Rock pads:{' '}
                {draftPads.length === 0 ? 'none (any grass)' : `${draftPads.length} slots`}
              </AppText>
            </>
          )}
        </ScrollView>

        {unlocked ? (
          <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <Pressable
              style={[styles.modeBtn, mode === 'path' && styles.modeBtnActive]}
              onPress={() => setMode('path')}>
              <AppText variant="headline" style={mode === 'path' ? styles.modeLabelOn : styles.modeLabelOff}>
                Pathing
              </AppText>
            </Pressable>
            <Pressable
              style={[styles.modeBtn, mode === 'placement' && styles.modeBtnActive]}
              onPress={() => setMode('placement')}>
              <AppText
                variant="headline"
                style={mode === 'placement' ? styles.modeLabelOn : styles.modeLabelOff}>
                Placement
              </AppText>
            </Pressable>
          </View>
        ) : null}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scroll: {
    padding: 20,
    gap: 12,
  },
  title: {
    marginBottom: 4,
  },
  hint: {
    color: IosUi.secondaryLabel,
    marginBottom: 8,
  },
  halfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  halfLabel: {
    color: IosUi.secondaryLabel,
  },
  inputSmall: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: IosUi.separator,
    borderRadius: IosRadius.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF',
    fontSize: 16,
    minWidth: 100,
    maxWidth: 140,
  },
  gate: {
    gap: 12,
    maxWidth: 360,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: IosUi.separator,
    borderRadius: IosRadius.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    fontSize: 16,
  },
  mapWrap: {
    position: 'relative',
    alignSelf: 'center',
    borderRadius: IosRadius.card,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: IosUi.separator,
  },
  mapWrapPlacementActive: {
    borderWidth: 3,
    borderColor: '#34C759',
  },
  pathModeTint: {
    zIndex: 2,
    backgroundColor: 'rgba(0, 122, 255, 0.07)',
  },
  placementModeTint: {
    zIndex: 2,
    backgroundColor: 'rgba(52, 199, 89, 0.18)',
  },
  padsVisualLayer: {
    zIndex: 4,
  },
  placementTopBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(27, 94, 32, 0.94)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.25)',
    gap: 4,
  },
  placementTopBannerTitle: {
    color: '#E8F5E9',
    fontWeight: '700',
    textAlign: 'center',
  },
  placementTopBannerSub: {
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    fontWeight: '600',
  },
  placementHitLayer: {
    zIndex: 6,
  },
  placementHintCard: {
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: IosRadius.card,
    backgroundColor: 'rgba(52, 199, 89, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(27, 94, 32, 0.35)',
  },
  placementHintText: {
    color: '#1B5E20',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  padCount: {
    color: IosUi.secondaryLabel,
  },
  footer: {
    color: IosUi.secondaryLabel,
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: IosUi.separator,
    backgroundColor: 'rgba(242,242,247,0.96)',
    paddingTop: 8,
    paddingHorizontal: 12,
    gap: 10,
    justifyContent: 'center',
  },
  modeBtn: {
    flex: 1,
    maxWidth: 200,
    paddingVertical: 12,
    borderRadius: IosRadius.card,
    backgroundColor: IosUi.systemGray6,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: IosUi.systemBlue,
  },
  modeLabelOn: {
    color: '#fff',
  },
  modeLabelOff: {
    color: IosUi.label,
  },
});
