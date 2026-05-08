import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { GamePersistSlice, Quest } from '@/store/useGameStore';
import { migrateUnitsFromPersist, useGameStore } from '@/store/useGameStore';
import type { PathCell, PlacementPad } from '@/store/useMapLayoutStore';
import { DEFAULT_PATH_HALF_WIDTH_NORM, useMapLayoutStore } from '@/store/useMapLayoutStore';

const SAVE_DEBOUNCE_MS = 650;
export const CLOUD_SAVE_SCHEMA_VERSION = 3;

export const SHARED_BATTLE_MAP_ID = 'global' as const;

export type OnboardingCloudSlice = {
  avatarId: string | null;
  struggleIds: string[];
  completed: boolean;
};

/** Same fields as `useMapLayoutStore` persist slice — stored in `shared_battle_map.layout` for everyone. */
export type MapLayoutCloudSlice = {
  pathPolylineNorm: { x: number; y: number }[];
  pathHalfWidthNorm: number;
  placementPolygonNorm: { x: number; y: number }[];
  placementPads: { c: number; r: number; rock: number }[];
  pathCellOrder: { c: number; r: number }[];
  placementCellKeys: string[];
};

export type CloudSaveDocument = {
  schemaVersion: number;
  game: GamePersistSlice;
  onboarding: OnboardingCloudSlice;
};

/** Strip local device URIs before upload (privacy + paths are not portable). */
function sanitizeQuestsForCloud(quests: Quest[]): Quest[] {
  return quests.map((q) => ({ ...q, proofUri: null }));
}

/** After pull, keep local proof thumbnails when the cloud payload omits them. Append quests that exist only locally (e.g. custom tasks). */
function mergeQuestsPreservingLocalProof(remote: unknown, localQuests: Quest[]): Quest[] {
  if (!Array.isArray(remote)) return localQuests;
  const localById = new Map(localQuests.map((q) => [q.id, q]));
  const merged = remote.map((item): Quest => {
    const rq = item as Quest;
    const prev = localById.get(rq.id);
    const proofUri =
      rq.completed && prev?.proofUri?.trim() ? prev.proofUri! : (rq.proofUri ?? null);
    return { ...rq, proofUri: proofUri ?? null };
  });
  const remoteIds = new Set(merged.map((q) => q.id));
  const localOnly = localQuests.filter((q) => !remoteIds.has(q.id));
  return [...merged, ...localOnly];
}

const GAME_KEYS: (keyof GamePersistSlice)[] = [
  'gold',
  'energy',
  'dayStreak',
  'dayPhase',
  'eveningEndsAtMs',
  'fortressHp',
  'fortressMaxHp',
  'units',
  'enemies',
  'spawnRemaining',
  'spawnTimerMs',
  'waveCooldownUntil',
  'waveRewardEligible',
  'quests',
  'boostInventory',
];

/** Build JSON for `shared_battle_map.layout` (and callers like /admin after local save). */
export function buildMapLayoutCloudSliceFromStore(): MapLayoutCloudSlice {
  const m = useMapLayoutStore.getState();
  return {
    pathPolylineNorm: m.pathPolylineNorm.map((p) => ({ x: p.x, y: p.y })),
    pathHalfWidthNorm: m.pathHalfWidthNorm,
    placementPolygonNorm: m.placementPolygonNorm.map((p) => ({ x: p.x, y: p.y })),
    placementPads: m.placementPads.map((p) => ({ c: p.c, r: p.r, rock: p.rock })),
    pathCellOrder: m.pathCellOrder.map((p) => ({ c: p.c, r: p.r })),
    placementCellKeys: [...m.placementCellKeys],
  };
}

function buildDocumentFromStore(): CloudSaveDocument {
  const s = useGameStore.getState();
  const game = {} as GamePersistSlice;
  for (const k of GAME_KEYS) {
    if (k === 'quests') {
      (game as unknown as Record<string, unknown>).quests = sanitizeQuestsForCloud(s.quests);
    } else {
      (game as unknown as Record<string, unknown>)[k] = s[k];
    }
  }
  return {
    schemaVersion: CLOUD_SAVE_SCHEMA_VERSION,
    game,
    onboarding: {
      avatarId: s.onboardingAvatarId,
      struggleIds: s.onboardingStruggleIds,
      completed: s.onboardingComplete,
    },
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function applyMapLayoutCloudSlice(raw: unknown) {
  if (!isRecord(raw)) return;
  const rawPath = raw.pathCellOrder;
  if (!Array.isArray(rawPath) || rawPath.length < 2) return;

  const pathCellOrder: PathCell[] = rawPath.map((x) => ({
    c: Number((x as PathCell).c),
    r: Number((x as PathCell).r),
  }));

  let pathPoly: { x: number; y: number }[] = [];
  if (Array.isArray(raw.pathPolylineNorm)) {
    pathPoly = raw.pathPolylineNorm.map((x) => ({
      x: Number((x as { x: unknown }).x),
      y: Number((x as { y: unknown }).y),
    }));
  }
  if (pathPoly.length < 2) return;

  const pathHalfRaw = raw.pathHalfWidthNorm;
  const pathHalf =
    typeof pathHalfRaw === 'number' && Number.isFinite(pathHalfRaw) && pathHalfRaw > 0 && pathHalfRaw < 0.2
      ? pathHalfRaw
      : DEFAULT_PATH_HALF_WIDTH_NORM;

  const placementPoly = Array.isArray(raw.placementPolygonNorm)
    ? raw.placementPolygonNorm.map((x) => ({
        x: Number((x as { x: unknown }).x),
        y: Number((x as { y: unknown }).y),
      }))
    : [];

  const rawPl = raw.placementCellKeys;
  const placementKeys = Array.isArray(rawPl) ? rawPl.map((x) => String(x)) : [];

  let placementPads: PlacementPad[] = [];
  if (Array.isArray(raw.placementPads)) {
    placementPads = raw.placementPads.map((x) => {
      const rockN = Math.min(4, Math.max(1, Math.round(Number((x as PlacementPad).rock)) || 1));
      return {
        c: Number((x as PlacementPad).c),
        r: Number((x as PlacementPad).r),
        rock: rockN as PlacementPad['rock'],
      };
    });
  }

  useMapLayoutStore.getState().setFreehandLayout({
    pathPolylineNorm: pathPoly,
    pathHalfWidthNorm: pathHalf,
    placementPolygonNorm: placementPoly,
    pathCellOrder,
    placementCellKeys: placementKeys,
    placementPads,
  });
}

function applyCloudDoc(raw: unknown) {
  if (!isRecord(raw)) return;

  const gameRaw = raw.game;
  if (isRecord(gameRaw)) {
    const patch: Partial<GamePersistSlice> = {};
    const localQuests = useGameStore.getState().quests;
    for (const k of GAME_KEYS) {
      if (k in gameRaw) {
        if (k === 'quests') {
          (patch as Record<string, unknown>).quests = mergeQuestsPreservingLocalProof(
            gameRaw.quests,
            localQuests
          );
        } else if (k === 'units') {
          (patch as Record<string, unknown>)[k] = migrateUnitsFromPersist(gameRaw[k as string]);
        } else {
          (patch as Record<string, unknown>)[k] = gameRaw[k as string];
        }
      }
    }
    useGameStore.setState(patch);
  }

  const ob = raw.onboarding;
  if (isRecord(ob)) {
    useGameStore.setState({
      onboardingAvatarId: typeof ob.avatarId === 'string' ? ob.avatarId : null,
      onboardingStruggleIds: Array.isArray(ob.struggleIds)
        ? ob.struggleIds.filter((x): x is string => typeof x === 'string')
        : [],
      onboardingComplete: Boolean(ob.completed),
    });
  }
}

function formatSaveError(e: {
  message?: string;
  details?: string | null;
  hint?: string | null;
}): string {
  return [e.message, e.details, e.hint].filter((x) => x && String(x).trim()).join(' · ');
}

async function getAuthenticatedUserId(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error:
        'Supabase env missing (EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY). Add them to .env and restart `expo start`.',
    };
  }
  const { data, error } = await supabase.auth.getUser();
  if (error) return { ok: false, error: `Auth: ${error.message}` };
  const id = data.user?.id;
  if (!id) {
    return {
      ok: false,
      error: 'No Supabase session. Sign in on the Login screen, then save again.',
    };
  }
  return { ok: true, userId: id };
}

async function upsertSave(doc: CloudSaveDocument): Promise<{ error: string | null }> {
  const auth = await getAuthenticatedUserId();
  if (!auth.ok) return { error: auth.error };
  const userId = auth.userId;

  const { error } = await supabase.from('user_save').upsert(
    {
      user_id: userId,
      state: doc as unknown as Record<string, unknown>,
    },
    { onConflict: 'user_id' }
  );
  if (error) {
    const msg = formatSaveError(error);
    console.warn('[gameCloudSync] user_save upsert', msg);
    return { error: msg };
  }

  return { error: null };
}

/** Load global map from Supabase (anon or authed). Call after pullUserSave so shared layout wins. */
export async function fetchSharedMapLayout(): Promise<void> {
  try {
    if (!isSupabaseConfigured()) return;

    const { data, error } = await supabase
      .from('shared_battle_map')
      .select('layout')
      .eq('id', SHARED_BATTLE_MAP_ID)
      .maybeSingle();

    if (error) {
      console.warn('[gameCloudSync] fetchSharedMapLayout', formatSaveError(error));
      return;
    }
    const layout = data?.layout;
    if (layout !== undefined && layout !== null) {
      applyMapLayoutCloudSlice(layout);
    }
  } catch (e) {
    console.warn('[gameCloudSync] fetchSharedMapLayout', e);
  }
}

/** Upsert global map (anon or authed). Used from /admin — no login required. */
export async function upsertSharedMapLayout(slice: MapLayoutCloudSlice): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) {
    return {
      error:
        'Supabase env missing (EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY). Add them to .env and restart `expo start`.',
    };
  }

  const { error } = await supabase.from('shared_battle_map').upsert(
    {
      id: SHARED_BATTLE_MAP_ID,
      layout: slice as unknown as Record<string, unknown>,
    },
    { onConflict: 'id' }
  );

  if (error) {
    const msg = formatSaveError(error);
    console.warn('[gameCloudSync] upsertSharedMapLayout', msg);
    return { error: msg };
  }
  return { error: null };
}

export async function pullUserSave(expectedUserId: string): Promise<void> {
  try {
    if (!isSupabaseConfigured()) {
      console.warn('[gameCloudSync] pull skipped: Supabase not configured');
      return;
    }
    const auth = await getAuthenticatedUserId();
    if (!auth.ok) {
      console.warn('[gameCloudSync] pull skipped:', auth.error);
      return;
    }
    const userId = auth.userId;
    if (userId !== expectedUserId) {
      console.warn('[gameCloudSync] pull: auth user id differs from bootstrap userId (using auth id)');
    }

    const { data, error } = await supabase
      .from('user_save')
      .select('state')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[gameCloudSync] pull user_save', formatSaveError(error));
      return;
    }

    const state = data?.state;
    if (state !== undefined && state !== null) {
      applyCloudDoc(state as unknown);
    } else {
      await upsertSave(buildDocumentFromStore());
    }
  } catch (e) {
    console.warn('[gameCloudSync] pull', e);
  }
}

export function subscribeCloudPush(): () => void {
  let t: ReturnType<typeof setTimeout> | undefined;
  let lastJson = '';

  const schedule = () => {
    if (!useGameStore.getState().cloudSaveHydrated) return;
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      t = undefined;
      const doc = buildDocumentFromStore();
      const next = JSON.stringify(doc);
      if (next === lastJson) return;
      lastJson = next;
      void upsertSave(doc);
    }, SAVE_DEBOUNCE_MS);
  };

  schedule();
  const unsubGame = useGameStore.subscribe(schedule);
  return () => {
    unsubGame();
    if (t) clearTimeout(t);
  };
}

/** Immediate per-user game save (e.g. debug). Map layout is global — use upsertSharedMapLayout from /admin. */
export async function pushUserSaveNow(): Promise<{ error: string | null }> {
  return upsertSave(buildDocumentFromStore());
}
