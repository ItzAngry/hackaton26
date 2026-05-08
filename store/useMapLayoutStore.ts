import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { SHIPPED_PLACEMENT_PADS } from '@/constants/shippedBattleLayout';
import {
  DEFAULT_PATH_CELL_ORDER,
  GRID_COLS,
  GRID_ROWS,
  cellKey,
  type TileKind,
} from '@/constants/mapTileGrid';

import { distPxToPolylinePx, pointInPolygon, type NormPt } from '@/lib/mapGeometry';
import { fullBleedMapPlayLayout, type MapPlayLayout } from '@/lib/mapPlayMetrics';

import { isRnAsyncStorageLinked } from '@/lib/nativeStorageSupport';

export type PathCell = { c: number; r: number };

/** Defender slot on the tile grid; `rock` is 1–4 for art variant (picked when pad is placed in admin). */
export type PlacementPad = { c: number; r: number; rock: 1 | 2 | 3 | 4 };

export const DEFAULT_PATH_HALF_WIDTH_NORM = 0.022;

export function polylineFromGridPath(path: PathCell[]): NormPt[] {
  return path.map((p) => ({
    x: (p.c + 0.5) / GRID_COLS,
    y: (p.r + 0.5) / GRID_ROWS,
  }));
}

function webLocalStorageAdapter(): StateStorage {
  if (typeof window !== 'undefined') {
    return {
      getItem: (name) => Promise.resolve(window.localStorage.getItem(name)),
      setItem: (name, value) => {
        window.localStorage.setItem(name, value);
        return Promise.resolve();
      },
      removeItem: (name) => {
        window.localStorage.removeItem(name);
        return Promise.resolve();
      },
    };
  }
  const memory = new Map<string, string>();
  return {
    getItem: (name) => Promise.resolve(memory.get(name) ?? null),
    setItem: (name, value) => {
      memory.set(name, value);
      return Promise.resolve();
    },
    removeItem: (name) => {
      memory.delete(name);
      return Promise.resolve();
    },
  };
}

function memoryStateStorage(): StateStorage {
  const memory = new Map<string, string>();
  return {
    getItem: (name) => Promise.resolve(memory.get(name) ?? null),
    setItem: (name, value) => {
      memory.set(name, value);
      return Promise.resolve();
    },
    removeItem: (name) => {
      memory.delete(name);
      return Promise.resolve();
    },
  };
}

function nativeAsyncStorageSafe(): StateStorage {
  return {
    getItem: async (name) => {
      try {
        return await AsyncStorage.getItem(name);
      } catch {
        return null;
      }
    },
    setItem: async (name, value) => {
      try {
        await AsyncStorage.setItem(name, value);
      } catch {
        /* noop */
      }
    },
    removeItem: async (name) => {
      try {
        await AsyncStorage.removeItem(name);
      } catch {
        /* noop */
      }
    },
  };
}

const mapLayoutPersistStorage = createJSONStorage(() => {
  if (Platform.OS === 'web') return webLocalStorageAdapter();
  if (!isRnAsyncStorageLinked()) return memoryStateStorage();
  return nativeAsyncStorageSafe();
});

export function deriveBlockedKeysFromPath(path: PathCell[]): string[] {
  const s = new Set<string>();
  for (const p of path) {
    s.add(cellKey(p.c, p.r));
  }
  return [...s];
}

function cloneDefaultPath(): PathCell[] {
  return DEFAULT_PATH_CELL_ORDER.map((p) => ({ c: p.c, r: p.r }));
}

function buildShippedLayoutState() {
  const path = cloneDefaultPath();
  return buildFullLayout(path, [], {
    pathPolylineNorm: polylineFromGridPath(path),
    pathHalfWidthNorm: DEFAULT_PATH_HALF_WIDTH_NORM,
    placementPolygonNorm: [],
    placementPads: SHIPPED_PLACEMENT_PADS.map((p) => ({ c: p.c, r: p.r, rock: p.rock })),
  });
}

/** Path tint + optional defender pads. Empty placement → legacy rule: any non-path tile is buildable. */
export function computeTilesMatrix(blocked: Set<string>, placementKeys: string[]): TileKind[][] {
  const placement = new Set(placementKeys);
  const usePads = placement.size > 0;
  const rows: TileKind[][] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    rows[r] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      const k = cellKey(c, r);
      if (blocked.has(k)) {
        rows[r][c] = 'path';
      } else if (usePads) {
        rows[r][c] = placement.has(k) ? 'buildable' : 'blocked';
      } else {
        rows[r][c] = 'buildable';
      }
    }
  }
  return rows;
}

function buildFullLayout(
  path: PathCell[],
  placementKeys: string[],
  overrides: Partial<{
    pathPolylineNorm: NormPt[];
    pathHalfWidthNorm: number;
    placementPolygonNorm: NormPt[];
    placementPads: PlacementPad[];
  }>
): Omit<
  MapLayoutState,
  | 'setBattleMapLayout'
  | 'setFreehandLayout'
  | 'setPathCellOrder'
  | 'setPlacementCellKeys'
  | 'setMapLayout'
  | 'resetToDefaults'
  | 'isBuildableTile'
  | 'battleMapLayout'
> {
  const blockedCellKeys = deriveBlockedKeysFromPath(path);
  const blockedCellKeySet = new Set(blockedCellKeys);

  const padsOverride = overrides.placementPads;
  const placementPads: PlacementPad[] =
    padsOverride !== undefined
      ? padsOverride.filter((p) => !blockedCellKeySet.has(cellKey(p.c, p.r)))
      : [];

  const sanitizedPlacement =
    placementPads.length > 0
      ? placementPads.map((p) => cellKey(p.c, p.r))
      : placementKeys.filter((k) => !blockedCellKeySet.has(k));
  const placementCellKeySet = new Set(sanitizedPlacement);
  const tiles = computeTilesMatrix(blockedCellKeySet, sanitizedPlacement);
  const pathPoly =
    overrides.pathPolylineNorm ??
    (path.length >= 2 ? polylineFromGridPath(path) : polylineFromGridPath(cloneDefaultPath()));

  return {
    pathPolylineNorm: pathPoly,
    pathHalfWidthNorm: overrides.pathHalfWidthNorm ?? DEFAULT_PATH_HALF_WIDTH_NORM,
    placementPolygonNorm: overrides.placementPolygonNorm ?? [],
    placementPads,
    pathCellOrder: path,
    blockedCellKeys,
    blockedCellKeySet,
    placementCellKeys: sanitizedPlacement,
    placementCellKeySet,
    tiles,
  };
}

function computePlaceableForTile(
  c: number,
  r: number,
  layout: MapPlayLayout,
  st: Pick<
    MapLayoutState,
    | 'pathPolylineNorm'
    | 'pathHalfWidthNorm'
    | 'placementPolygonNorm'
    | 'blockedCellKeySet'
    | 'placementCellKeySet'
    | 'placementPads'
  >
): boolean {
  /** Rock pads define exact legal tiles — must win over the path corridor distance test so art aligns 1:1 with gameplay. */
  if (st.placementPads.length > 0) {
    return st.placementPads.some((p) => p.c === c && p.r === r);
  }

  const nx = (c + 0.5) / GRID_COLS;
  const ny = (r + 0.5) / GRID_ROWS;
  const px = layout.originX + nx * layout.playW;
  const py = layout.originY + ny * layout.playH;
  const halfW = st.pathHalfWidthNorm * Math.min(layout.playW, layout.playH);
  const onPath = distPxToPolylinePx(px, py, st.pathPolylineNorm, layout) < halfW;
  if (onPath) return false;

  if (st.placementPolygonNorm.length >= 3) {
    return pointInPolygon({ x: nx, y: ny }, st.placementPolygonNorm);
  }
  if (st.placementCellKeySet.size > 0) {
    return st.placementCellKeySet.has(cellKey(c, r));
  }
  return !st.blockedCellKeySet.has(cellKey(c, r));
}

export interface MapLayoutState {
  pathPolylineNorm: NormPt[];
  pathHalfWidthNorm: number;
  placementPolygonNorm: NormPt[];
  placementPads: PlacementPad[];
  pathCellOrder: PathCell[];
  blockedCellKeys: string[];
  blockedCellKeySet: Set<string>;
  placementCellKeys: string[];
  placementCellKeySet: Set<string>;
  tiles: TileKind[][];
  battleMapLayout: MapPlayLayout | null;

  setBattleMapLayout: (layout: MapPlayLayout) => void;
  setFreehandLayout: (layout: {
    pathPolylineNorm: NormPt[];
    pathHalfWidthNorm: number;
    placementPolygonNorm: NormPt[];
    pathCellOrder: PathCell[];
    placementCellKeys: string[];
    placementPads: PlacementPad[];
  }) => void;
  setPathCellOrder: (path: PathCell[]) => void;
  setPlacementCellKeys: (keys: string[]) => void;
  setMapLayout: (path: PathCell[], placementKeys: string[]) => void;
  resetToDefaults: () => void;
  isBuildableTile: (c: number, r: number) => boolean;
}

export const useMapLayoutStore = create<MapLayoutState>()(
  persist(
    (set, get) => ({
      ...buildShippedLayoutState(),
      battleMapLayout: null,
      setBattleMapLayout: (layout) =>
        set({
          battleMapLayout:
            Number.isFinite(layout.viewW) &&
            layout.viewW > 0 &&
            Number.isFinite(layout.viewH) &&
            layout.viewH > 0 &&
            Number.isFinite(layout.playW) &&
            layout.playW > 0 &&
            Number.isFinite(layout.playH) &&
            layout.playH > 0
              ? layout
              : null,
        }),
      setFreehandLayout: (layout) =>
        set((prev) => {
          const pathCells = layout.pathCellOrder.map((p) => ({ c: Number(p.c), r: Number(p.r) }));
          const pathPoly = layout.pathPolylineNorm.map((p) => ({
            x: Number(p.x),
            y: Number(p.y),
          }));
          const keys = layout.placementCellKeys.map(String);
          const pads = layout.placementPads.map((p) => ({
            c: Number(p.c),
            r: Number(p.r),
            rock: Math.min(4, Math.max(1, Math.round(Number(p.rock)) || 1)) as PlacementPad['rock'],
          }));
          return {
            ...buildFullLayout(pathCells, keys, {
              pathPolylineNorm: pathPoly,
              pathHalfWidthNorm: layout.pathHalfWidthNorm,
              placementPolygonNorm: layout.placementPolygonNorm.map((q) => ({ x: Number(q.x), y: Number(q.y) })),
              placementPads: pads,
            }),
            battleMapLayout: prev.battleMapLayout,
          };
        }),
      setPathCellOrder: (path) =>
        set((prev) => {
          const blocked = new Set(deriveBlockedKeysFromPath(path));
          const keysSansBlocked = prev.placementCellKeys.filter((k) => !blocked.has(k));
          const nextPads = prev.placementPads.filter((p) => !blocked.has(cellKey(p.c, p.r)));
          return {
            ...buildFullLayout(path, keysSansBlocked, {
              pathPolylineNorm: polylineFromGridPath(path),
              pathHalfWidthNorm: prev.pathHalfWidthNorm,
              placementPolygonNorm: prev.placementPolygonNorm,
              placementPads: nextPads,
            }),
            battleMapLayout: prev.battleMapLayout,
          };
        }),
      setPlacementCellKeys: (keys) =>
        set((prev) => ({
          ...buildFullLayout(prev.pathCellOrder, keys, {
            pathPolylineNorm: prev.pathPolylineNorm,
            pathHalfWidthNorm: prev.pathHalfWidthNorm,
            placementPolygonNorm: prev.placementPolygonNorm,
            placementPads: [],
          }),
          battleMapLayout: prev.battleMapLayout,
        })),
      setMapLayout: (path, placementKeys) =>
        set((prev) => ({
          ...buildFullLayout(path, placementKeys, {
            pathPolylineNorm: polylineFromGridPath(path),
            pathHalfWidthNorm: prev.pathHalfWidthNorm,
            placementPolygonNorm: prev.placementPolygonNorm,
            placementPads: [],
          }),
          battleMapLayout: prev.battleMapLayout,
        })),
      resetToDefaults: () =>
        set((prev) => ({
          ...buildShippedLayoutState(),
          battleMapLayout: prev.battleMapLayout,
        })),
      isBuildableTile: (c, r) => {
        const st = get();
        const L = st.battleMapLayout ?? fullBleedMapPlayLayout(400, 225);
        return computePlaceableForTile(c, r, L, st);
      },
    }),
    {
      name: 'map-layout-v7',
      storage: mapLayoutPersistStorage,
      partialize: (s) => ({
        pathPolylineNorm: s.pathPolylineNorm,
        pathHalfWidthNorm: s.pathHalfWidthNorm,
        placementPolygonNorm: s.placementPolygonNorm,
        placementPads: s.placementPads,
        pathCellOrder: s.pathCellOrder,
        placementCellKeys: s.placementCellKeys,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<MapLayoutState> | undefined;
        const rawPath = p?.pathCellOrder;
        const path =
          Array.isArray(rawPath) && rawPath.length >= 2
            ? rawPath.map((x) => ({ c: Number(x.c), r: Number(x.r) }))
            : cloneDefaultPath();

        let pathPoly = Array.isArray(p?.pathPolylineNorm)
          ? p!.pathPolylineNorm!.map((x) => ({ x: Number(x.x), y: Number(x.y) }))
          : [];
        if (pathPoly.length < 2) pathPoly = polylineFromGridPath(path);

        const pathHalf =
          typeof p?.pathHalfWidthNorm === 'number' ? p!.pathHalfWidthNorm : DEFAULT_PATH_HALF_WIDTH_NORM;

        const placementPoly = Array.isArray(p?.placementPolygonNorm)
          ? p!.placementPolygonNorm!.map((x) => ({ x: Number(x.x), y: Number(x.y) }))
          : [];

        const rawPl = p?.placementCellKeys;
        const placementKeys = Array.isArray(rawPl) ? rawPl.map(String) : [];

        let placementPads: PlacementPad[] = [];
        if (Array.isArray(p?.placementPads)) {
          placementPads = p.placementPads!.map((x) => {
            const rockN = Math.min(4, Math.max(1, Math.round(Number((x as PlacementPad).rock)) || 1));
            return {
              c: Number((x as PlacementPad).c),
              r: Number((x as PlacementPad).r),
              rock: rockN as 1 | 2 | 3 | 4,
            };
          });
        }

        return {
          ...current,
          ...buildFullLayout(path, placementKeys, {
            pathPolylineNorm: pathPoly,
            pathHalfWidthNorm: pathHalf,
            placementPolygonNorm: placementPoly,
            placementPads,
          }),
          battleMapLayout: current.battleMapLayout,
        };
      },
    }
  )
);
