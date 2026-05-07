import { supabase } from '@/lib/supabase';
import type { GamePersistSlice } from '@/store/useGameStore';
import { useGameStore } from '@/store/useGameStore';

const SAVE_DEBOUNCE_MS = 650;
export const CLOUD_SAVE_SCHEMA_VERSION = 1;

export type OnboardingCloudSlice = {
  avatarId: string | null;
  struggleIds: string[];
  completed: boolean;
};

export type CloudSaveDocument = {
  schemaVersion: number;
  game: GamePersistSlice;
  onboarding: OnboardingCloudSlice;
};

const GAME_KEYS: (keyof GamePersistSlice)[] = [
  'gold',
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

function buildDocumentFromStore(): CloudSaveDocument {
  const s = useGameStore.getState();
  const game = {} as GamePersistSlice;
  for (const k of GAME_KEYS) {
    (game as unknown as Record<string, unknown>)[k] = s[k];
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

function applyCloudDoc(raw: unknown) {
  if (!isRecord(raw)) return;

  const gameRaw = raw.game;
  if (isRecord(gameRaw)) {
    const patch: Partial<GamePersistSlice> = {};
    for (const k of GAME_KEYS) {
      if (k in gameRaw) {
        (patch as Record<string, unknown>)[k] = gameRaw[k as string];
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

async function upsertSave(userId: string, doc: CloudSaveDocument) {
  const { error } = await supabase.from('user_save').upsert(
    {
      user_id: userId,
      state: doc as unknown as Record<string, unknown>,
    },
    { onConflict: 'user_id' }
  );
  if (error) console.warn('[gameCloudSync] upsert', error.message);
}

export async function pullUserSave(userId: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('user_save')
      .select('state')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[gameCloudSync] pull', error.message);
      return;
    }

    const state = data?.state;
    if (state !== undefined && state !== null) {
      applyCloudDoc(state as unknown);
    } else {
      await upsertSave(userId, buildDocumentFromStore());
    }
  } catch (e) {
    console.warn('[gameCloudSync] pull', e);
  }
}

export function subscribeCloudPush(userId: string): () => void {
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
      void upsertSave(userId, doc);
    }, SAVE_DEBOUNCE_MS);
  };

  schedule();
  const unsub = useGameStore.subscribe(schedule);
  return () => {
    unsub();
    if (t) clearTimeout(t);
  };
}
