import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { HERO_BY_ID } from '@/constants/heroDefinitions';

import { isRnAsyncStorageLinked } from '@/lib/nativeStorageSupport';
import { useMapLayoutStore } from '@/store/useMapLayoutStore';
import { ATTACK_RANGE_PATH, nearestPathProgressFromTile } from '@/lib/tileMap';

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

/** Avoid uncaught rejections when RN AsyncStorage native module is missing (broken dev client / odd embeds). */
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
        /* Gameplay continues; persistence disabled until native module is available. */
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

const gamePersistStorage = createJSONStorage(() => {
  if (Platform.OS === 'web') return webLocalStorageAdapter();
  if (!isRnAsyncStorageLinked()) return memoryStateStorage();
  return nativeAsyncStorageSafe();
});

export type UnitType = 'Ground' | 'Air' | 'Aquatic' | 'Hybrid';
export type AttackType = 'Physical' | 'Magic';

export type DayPhase = 'morning' | 'evening';

const BOOST_IDS = ['meat', 'energy', 'fortified'] as const;
export type BoostId = (typeof BOOST_IDS)[number];

export interface ActiveBuff {
  id: string;
  label: string;
  statHint: string;
  expiresAt: number;
  /** Set for shop boosts; omitted on older saves → no combat modifier. */
  boostId?: BoostId;
}

/** Hearty meal — multiplies damage per hit. */
const BOOST_DAMAGE_MULT_MEAT = 1.28;
/** Energy drink — multiplies attack interval in seconds (lower = faster). */
const BOOST_ATTACK_INTERVAL_MULT_ENERGY = 0.78;
/** Fortified meal — each placed defender with this buff reduces leak damage to fortress. */
const BOOST_FORTRESS_MITIGATION_PER_DEFENDER = 0.08;
const BOOST_FORTRESS_MITIGATION_CAP = 0.24;

export interface GameUnit {
  id: string;
  name: string;
  /** Sprite / balance identity from `HERO_DEFINITIONS`; older saves may omit. */
  heroId?: string;
  unitType: UnitType;
  hp: number;
  maxHp: number;
  damage: number;
  attackType: AttackType;
  attackSpeed: number;
  attackRange: number;
  buffs: ActiveBuff[];
  placedTile: { c: number; r: number } | null;
  placedPathCover: number | null;
  towerCooldownRemainMs?: number;
  /**
   * True after this hero has been on the map at least once (including drag-recruit).
   * Bench→map placement skips energy when true (recalled / picked up again).
   */
  hasBeenDeployedToMap?: boolean;
  /**
   * Legacy: recall waiver from older builds; kept for cloud saves.
   * Prefer `hasBeenDeployedToMap`.
   */
  freeNextMapPlacement?: boolean;
}

/** First bench placement costs energy; redeploying a hero you recalled does not. */
export function benchPlacementWaivesEnergy(u: GameUnit): boolean {
  return u.hasBeenDeployedToMap === true || u.freeNextMapPlacement === true;
}

/** Normalize older saves so redeploy-after-recall stays free across persistence. */
export function migrateUnitsFromPersist(units: unknown): GameUnit[] {
  if (!Array.isArray(units)) return [];
  return units.map((raw) => {
    const u = raw as GameUnit;
    if (u.hasBeenDeployedToMap === true) return u;
    if (u.freeNextMapPlacement === true) return { ...u, hasBeenDeployedToMap: true };
    if (u.placedTile != null) return { ...u, hasBeenDeployedToMap: true };
    return u;
  });
}

export interface Quest {
  id: string;
  title: string;
  completed: boolean;
  /** Local file URI from camera proof; omitted on older saves. */
  proofUri?: string | null;
  /** Player-authored task; cleared with preset quests on each new morning after a survived evening. */
  userDefined?: boolean;
}

export interface Enemy {
  id: string;
  hp: number;
  maxHp: number;
  damage: number;
  pathProgress: number;
  goldValue: number;
}

export interface BoostDefinition {
  id: string;
  name: string;
  description: string;
  goldCost: number;
  durationLabel: string;
  durationMs: number;
  statHint: string;
}

const MIN_DEFENDER_TILE_SEP = 1;

/** Wall-clock length of one evening defense session. */
export const EVENING_DEFENSE_DURATION_MS = 20 * 60 * 1000;

const INITIAL_GOLD = 120;
export const QUEST_GOLD_REWARD = 15;

const INITIAL_ENERGY = 0;
/** Energy granted per completed daily task (proof photo during preparation). */
export const QUEST_ENERGY_REWARD = 1;
/** Max player-added tasks per preparation day (preset quests do not count). */
export const MAX_USER_DEFINED_QUESTS = 16;
/** Max characters for a custom task title. */
export const MAX_QUEST_TITLE_LEN = 120;
/** Spent when a defender is placed on the map (drag-drop recruit or bench placement). */
export const PLACE_DEFENDER_ENERGY_COST = 1;

function tileManhattan(a: { c: number; r: number }, b: { c: number; r: number }): number {
  return Math.abs(a.c - b.c) + Math.abs(a.r - b.r);
}

function waveSpawnBudget(difficultyDay: number): number {
  return Math.min(28, 3 + Math.floor(difficultyDay * 2));
}

function createEnemyForDifficultyDay(difficultyDay: number): Enemy {
  const maxHp = 32 + difficultyDay * 16;
  return {
    id: makeId(),
    hp: maxHp,
    maxHp,
    damage: Math.round(5 + difficultyDay * 2.5),
    pathProgress: 1,
    goldValue: Math.round(6 + difficultyDay * 4),
  };
}

export const BOOST_DEFINITIONS: BoostDefinition[] = [
  {
    id: 'meat',
    name: 'Hearty meal',
    description: 'Extra punch for your defender.',
    goldCost: 40,
    durationLabel: '30 min',
    durationMs: 30 * 60 * 1000,
    statHint: '+Attack damage',
  },
  {
    id: 'energy',
    name: 'Energy drink',
    description: 'Quick reflexes in battle.',
    goldCost: 55,
    durationLabel: '1 hr',
    durationMs: 60 * 60 * 1000,
    statHint: '+Attack speed',
  },
  {
    id: 'fortified',
    name: 'Fortified meal',
    description: 'Hold the line longer.',
    goldCost: 50,
    durationLabel: '45 min',
    durationMs: 45 * 60 * 1000,
    statHint: '+Defense',
  },
];

/** Damage per tower hit — buffs stacked multiplicatively. */
export function effectiveUnitDamage(unit: GameUnit, nowMs: number = Date.now()): number {
  let mult = 1;
  for (const b of unit.buffs) {
    if (b.expiresAt <= nowMs) continue;
    if (b.boostId === 'meat') mult *= BOOST_DAMAGE_MULT_MEAT;
  }
  return Math.max(1, Math.floor(unit.damage * mult));
}

/** Seconds between attacks (lower is faster); energy reduces this. */
export function effectiveUnitAttackIntervalSec(unit: GameUnit, nowMs: number = Date.now()): number {
  let intervalMult = 1;
  for (const b of unit.buffs) {
    if (b.expiresAt <= nowMs) continue;
    if (b.boostId === 'energy') intervalMult *= BOOST_ATTACK_INTERVAL_MULT_ENERGY;
  }
  return Math.max(0.12, unit.attackSpeed * intervalMult);
}

/** 0–1 fraction of fortress leak damage soaked while fortified defenders are on the board. */
export function fortressLeakMitigationFrac(units: GameUnit[], nowMs: number): number {
  let fortifiedPlaced = 0;
  for (const u of units) {
    if (u.hp <= 0) continue;
    if (u.placedPathCover === null) continue;
    const hasFort = u.buffs.some((b) => b.expiresAt > nowMs && b.boostId === 'fortified');
    if (hasFort) fortifiedPlaced++;
  }
  return Math.min(
    BOOST_FORTRESS_MITIGATION_CAP,
    fortifiedPlaced * BOOST_FORTRESS_MITIGATION_PER_DEFENDER,
  );
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createHeroUnit(heroId: string): GameUnit | null {
  const def = HERO_BY_ID[heroId];
  if (!def) return null;
  return {
    id: makeId(),
    name: def.name,
    heroId: def.id,
    unitType: def.unitType as UnitType,
    hp: def.maxHp,
    maxHp: def.maxHp,
    damage: def.damage,
    attackType: def.attackType as AttackType,
    attackSpeed: def.attackSpeed,
    attackRange: def.attackRange,
    buffs: [],
    placedTile: null,
    placedPathCover: null,
    hasBeenDeployedToMap: false,
  };
}

const INITIAL_QUESTS: Quest[] = [
  { id: 'q1', title: 'Brush your teeth', completed: false, proofUri: null },
  { id: 'q2', title: 'Take a 10-minute walk', completed: false, proofUri: null },
  { id: 'q3', title: 'Drink a glass of water', completed: false, proofUri: null },
  { id: 'q4', title: 'Tidy one surface', completed: false, proofUri: null },
];

function freshQuests(): Quest[] {
  return INITIAL_QUESTS.map((q) => ({ ...q }));
}

function fullRunFailState(fortressMaxHp: number) {
  return {
    dayPhase: 'morning' as DayPhase,
    dayStreak: 0,
    gold: INITIAL_GOLD,
    energy: INITIAL_ENERGY,
    units: [] as GameUnit[],
    quests: freshQuests(),
    boostInventory: {} as Record<string, number>,
    fortressHp: fortressMaxHp,
    enemies: [] as Enemy[],
    spawnRemaining: 0,
    spawnTimerMs: 0,
    waveCooldownUntil: 0,
    waveRewardEligible: false,
    eveningEndsAtMs: null as number | null,
  };
}

function freshSignedOutCore(fortressMaxHp: number) {
  return {
    ...fullRunFailState(fortressMaxHp),
    fortressMaxHp,
    fortressHp: fortressMaxHp,
  };
}

export type GamePersistSlice = Pick<
  GameState,
  | 'gold'
  | 'energy'
  | 'dayStreak'
  | 'dayPhase'
  | 'eveningEndsAtMs'
  | 'fortressHp'
  | 'fortressMaxHp'
  | 'units'
  | 'enemies'
  | 'spawnRemaining'
  | 'spawnTimerMs'
  | 'waveCooldownUntil'
  | 'waveRewardEligible'
  | 'quests'
  | 'boostInventory'
>;

interface GameState {
  gold: number;
  /** Earned from daily tasks; spent to place defenders on the map. */
  energy: number;
  /** Successful evenings survived (shown as streak). */
  dayStreak: number;
  dayPhase: DayPhase;
  /**
   * Wall-clock end of the active defense round; null while preparing.
   * `dayPhase`: `morning` = preparation (tasks & layout); `evening` = timed defense combat.
   */
  eveningEndsAtMs: number | null;
  fortressHp: number;
  fortressMaxHp: number;
  units: GameUnit[];
  enemies: Enemy[];
  spawnRemaining: number;
  spawnTimerMs: number;
  waveCooldownUntil: number;
  waveRewardEligible: boolean;
  quests: Quest[];
  boostInventory: Record<string, number>;

  onboardingAvatarId: string | null;
  onboardingStruggleIds: string[];
  onboardingComplete: boolean;
  /** True after cloud pull finishes (success or error) so routing can gate onboarding. */
  cloudSaveHydrated: boolean;

  setOnboardingAvatar: (avatarId: string) => void;
  setOnboardingStruggles: (ids: string[]) => void;
  markOnboardingComplete: () => void;
  /** Clear gameplay + onboarding for the next account; call persist.clearStorage() after this. */
  resetForSignedOutUser: () => void;

  completeQuest: (questId: string, proofUri: string) => void;
  addCustomQuest: (title: string) => void;
  removeCustomQuest: (questId: string) => void;
  recruitHero: (heroId: string) => boolean;
  recruitHeroAndPlaceAt: (heroId: string, c: number, r: number, pathCover: number) => boolean;
  buyBoost: (boostId: string) => boolean;
  applyBoost: (unitId: string, boostId: string) => boolean;
  placeUnit: (unitId: string, c: number, r: number, pathCover: number) => boolean;
  /** Move an already-placed unit to another free buildable tile; recomputes path cover. */
  movePlacedUnit: (unitId: string, c: number, r: number) => boolean;
  clearUnitPlacement: (unitId: string) => void;
  startGracePeriod: () => void;
  /** Start the timed defense round (~20 min). Only callable while preparing (`dayPhase === 'morning'`). */
  startEveningDefense: () => void;
  tickCombat: (deltaMs: number) => void;
  /** Debug: act as if the evening timer finished successfully. */
  debugCompleteEveningSuccess: () => void;
  /** Debug / simulate fortress loss — full run reset. */
  resetAfterDefeatDemo: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      gold: INITIAL_GOLD,
      energy: INITIAL_ENERGY,
      dayStreak: 0,
      dayPhase: 'morning',
      eveningEndsAtMs: null,
      fortressHp: 100,
      fortressMaxHp: 100,
      units: [],
      enemies: [],
      spawnRemaining: 0,
      spawnTimerMs: 0,
      waveCooldownUntil: 0,
      waveRewardEligible: false,
      quests: freshQuests(),
      boostInventory: {},

      onboardingAvatarId: null,
      onboardingStruggleIds: [],
      onboardingComplete: false,
      cloudSaveHydrated: false,

      setOnboardingAvatar: (avatarId) => set({ onboardingAvatarId: avatarId }),

      setOnboardingStruggles: (ids) => set({ onboardingStruggleIds: ids }),

      markOnboardingComplete: () => set({ onboardingComplete: true }),

      resetForSignedOutUser: () =>
        set(() => ({
          ...freshSignedOutCore(100),
          onboardingAvatarId: null,
          onboardingStruggleIds: [],
          onboardingComplete: false,
          cloudSaveHydrated: false,
        })),

      completeQuest: (questId, proofUri) =>
        set((state) => {
          const uri = proofUri.trim();
          if (!uri) return state;
          if (state.dayPhase !== 'morning') return state;
          const q = state.quests.find((x) => x.id === questId);
          if (!q || q.completed) return state;
          return {
            quests: state.quests.map((x) =>
              x.id === questId ? { ...x, completed: true, proofUri: uri } : x
            ),
            gold: state.gold + QUEST_GOLD_REWARD,
            energy: state.energy + QUEST_ENERGY_REWARD,
          };
        }),

      addCustomQuest: (title) =>
        set((state) => {
          if (state.dayPhase !== 'morning') return state;
          const raw = title.trim();
          if (!raw) return state;
          const n = state.quests.filter((q) => q.userDefined === true).length;
          if (n >= MAX_USER_DEFINED_QUESTS) return state;
          const clipped = raw.slice(0, MAX_QUEST_TITLE_LEN);
          const quest: Quest = {
            id: `u-${makeId()}`,
            title: clipped,
            completed: false,
            proofUri: null,
            userDefined: true,
          };
          return { quests: [...state.quests, quest] };
        }),

      removeCustomQuest: (questId) =>
        set((state) => {
          if (state.dayPhase !== 'morning') return state;
          const q = state.quests.find((x) => x.id === questId);
          if (!q || q.userDefined !== true) return state;
          return { quests: state.quests.filter((x) => x.id !== questId) };
        }),

      recruitHero: (heroId) => {
        const unit = createHeroUnit(heroId);
        if (!unit) return false;
        set((state) => ({ units: [...state.units, unit] }));
        return true;
      },

      recruitHeroAndPlaceAt: (heroId, c, r, pathCover) => {
        const state = get();
        if (state.energy < PLACE_DEFENDER_ENERGY_COST) return false;
        if (!useMapLayoutStore.getState().isBuildableTile(c, r)) return false;

        const cover = Math.max(0, Math.min(1, pathCover));

        for (const u of state.units) {
          if (!u.placedTile) continue;
          if (tileManhattan(u.placedTile, { c, r }) < MIN_DEFENDER_TILE_SEP) return false;
        }

        const unit = createHeroUnit(heroId);
        if (!unit) return false;
        set({
          units: [
            ...state.units,
            { ...unit, placedTile: { c, r }, placedPathCover: cover, hasBeenDeployedToMap: true },
          ],
          energy: state.energy - PLACE_DEFENDER_ENERGY_COST,
        });
        return true;
      },

      buyBoost: (boostId) => {
        const def = BOOST_DEFINITIONS.find((b) => b.id === boostId);
        if (!def) return false;
        const state = get();
        if (state.gold < def.goldCost) return false;
        set({
          gold: state.gold - def.goldCost,
          boostInventory: {
            ...state.boostInventory,
            [boostId]: (state.boostInventory[boostId] ?? 0) + 1,
          },
        });
        return true;
      },

      applyBoost: (unitId, boostId) => {
        const def = BOOST_DEFINITIONS.find((b) => b.id === boostId);
        if (!def) return false;
        const state = get();
        const stock = state.boostInventory[boostId] ?? 0;
        if (stock < 1) return false;
        const unit = state.units.find((u) => u.id === unitId);
        if (!unit) return false;

        const buff: ActiveBuff = {
          id: makeId(),
          label: def.name,
          statHint: def.statHint,
          expiresAt: Date.now() + def.durationMs,
          boostId: def.id as BoostId,
        };

        set({
          boostInventory: {
            ...state.boostInventory,
            [boostId]: stock - 1,
          },
          units: state.units.map((u) =>
            u.id === unitId ? { ...u, buffs: [...u.buffs, buff] } : u
          ),
        });
        return true;
      },

      placeUnit: (unitId, c, r, pathCover) => {
        const state = get();
        const unit = state.units.find((u) => u.id === unitId);
        if (!unit) return false;
        /** Must use loose null checks — persisted units may omit fields (undefined). */
        const onBench = unit.placedTile == null && unit.placedPathCover == null;
        if (!onBench) return false;

        const skipEnergy = benchPlacementWaivesEnergy(unit);
        if (!skipEnergy && state.energy < PLACE_DEFENDER_ENERGY_COST) return false;

        const cover = Math.max(0, Math.min(1, pathCover));

        for (const u of state.units) {
          if (u.id === unitId || !u.placedTile) continue;
          if (tileManhattan(u.placedTile, { c, r }) < MIN_DEFENDER_TILE_SEP) return false;
        }

        const nextEnergy = skipEnergy ? state.energy : state.energy - PLACE_DEFENDER_ENERGY_COST;

        set({
          energy: nextEnergy,
          units: state.units.map((u) =>
            u.id === unitId
              ? {
                  ...u,
                  placedTile: { c, r },
                  placedPathCover: cover,
                  hasBeenDeployedToMap: true,
                  freeNextMapPlacement: false,
                }
              : u
          ),
        });
        return true;
      },

      movePlacedUnit: (unitId, c, r) => {
        const state = get();
        const unit = state.units.find((u) => u.id === unitId);
        if (!unit || unit.placedTile === null || unit.placedPathCover === null) return false;
        if (unit.placedTile.c === c && unit.placedTile.r === r) return true;
        if (!useMapLayoutStore.getState().isBuildableTile(c, r)) return false;

        for (const u of state.units) {
          if (u.id === unitId || !u.placedTile) continue;
          if (tileManhattan(u.placedTile, { c, r }) < MIN_DEFENDER_TILE_SEP) return false;
        }

        const pathCover = Math.max(0, Math.min(1, nearestPathProgressFromTile(c, r)));

        set({
          units: state.units.map((u) =>
            u.id === unitId ? { ...u, placedTile: { c, r }, placedPathCover: pathCover } : u
          ),
        });
        return true;
      },

      clearUnitPlacement: (unitId) =>
        set((state) => ({
          units: state.units.map((u) =>
            u.id === unitId
              ? {
                  ...u,
                  placedTile: null,
                  placedPathCover: null,
                  towerCooldownRemainMs: undefined,
                  hasBeenDeployedToMap: true,
                  freeNextMapPlacement: true,
                }
              : u
          ),
        })),

      startGracePeriod: () =>
        set({
          dayPhase: 'morning',
          eveningEndsAtMs: null,
          enemies: [],
          spawnRemaining: 0,
          spawnTimerMs: 0,
          waveCooldownUntil: 0,
          waveRewardEligible: false,
        }),

      startEveningDefense: () => {
        const state = get();
        if (state.dayPhase !== 'morning') return;
        const difficultyDay = Math.max(1, state.dayStreak + 1);
        set({
          dayPhase: 'evening',
          eveningEndsAtMs: Date.now() + EVENING_DEFENSE_DURATION_MS,
          spawnRemaining: waveSpawnBudget(difficultyDay),
          spawnTimerMs: 350,
          waveCooldownUntil: 0,
          waveRewardEligible: false,
        });
      },

      tickCombat: (deltaMs) => {
        const state = get();
        if (state.dayPhase !== 'evening') return;

        const now = Date.now();
        const eveningDifficultyDay = Math.max(1, state.dayStreak + 1);
        const cooledDown = state.waveCooldownUntil <= now;

        let enemies = state.enemies.map((e) => ({ ...e }));
        let units = state.units.map((u) => ({
          ...u,
          buffs: u.buffs.filter((b) => b.expiresAt > now),
        }));
        let fortressHp = state.fortressHp;
        let gold = state.gold;
        let spawnRemaining = state.spawnRemaining;
        let spawnTimerMs = cooledDown ? state.spawnTimerMs - deltaMs : state.spawnTimerMs;
        let waveCooldownUntil = state.waveCooldownUntil;
        let waveRewardEligible: boolean = state.waveRewardEligible;

        const dt = Math.min(48, Math.max(1, deltaMs));
        const waveMoveScale = 0.000019 * (1 + eveningDifficultyDay * 0.055);

        if (cooledDown && spawnRemaining > 0 && spawnTimerMs <= 0) {
          enemies.push(createEnemyForDifficultyDay(eveningDifficultyDay));
          spawnRemaining--;
          spawnTimerMs = Math.max(520, 2050 - eveningDifficultyDay * 105);
          waveRewardEligible = true;
        }

        for (let ui = 0; ui < units.length; ui++) {
          const u = units[ui];
          if (u.placedPathCover === null || u.hp <= 0) continue;
          const pos = u.placedPathCover;

          let targetId: string | null = null;
          for (const e of enemies) {
            if (e.hp <= 0) continue;
            if (e.pathProgress > pos - 0.04 && e.pathProgress < pos + ATTACK_RANGE_PATH + 0.38) {
              targetId = e.id;
              break;
            }
          }

          if (!targetId) continue;

          let cd = u.towerCooldownRemainMs ?? 0;
          cd -= dt;
          const towerIntervalMs = Math.max(
            350,
            effectiveUnitAttackIntervalSec(u, now) * 1000,
          );

          while (cd <= 0) {
            let hitId: string | null = null;
            for (const e of enemies) {
              if (e.hp <= 0) continue;
              if (e.pathProgress > pos - 0.04 && e.pathProgress < pos + ATTACK_RANGE_PATH + 0.38) {
                hitId = e.id;
                break;
              }
            }
            if (!hitId) {
              cd = 0;
              break;
            }
            const ei = enemies.findIndex((x) => x.id === hitId);
            if (ei < 0) break;
            const hit = effectiveUnitDamage(u, now);
            enemies[ei] = {
              ...enemies[ei],
              hp: Math.max(0, Math.floor(enemies[ei].hp - hit)),
            };
            cd += towerIntervalMs;
          }

          units[ui] = { ...u, towerCooldownRemainMs: cd };
        }

        for (const e of enemies) {
          if (e.hp <= 0) gold += e.goldValue;
        }
        enemies = enemies.filter((e) => e.hp > 0);

        const survivors: Enemy[] = [];

        const leakMitigation = fortressLeakMitigationFrac(units, now);
        const leakFactor = Math.max(0.15, 1 - leakMitigation);

        for (const e of enemies) {
          const np = e.pathProgress - waveMoveScale * dt;
          if (np <= 0) {
            fortressHp = Math.max(
              0,
              fortressHp -
                Math.max(1, Math.round(e.damage * 0.38 * leakFactor)),
            );
            continue;
          }
          survivors.push({ ...e, pathProgress: np });
        }

        enemies = survivors;

        if (fortressHp <= 0) {
          set({
            ...fullRunFailState(state.fortressMaxHp),
          });
          return;
        }

        if (
          state.eveningEndsAtMs !== null &&
          now >= state.eveningEndsAtMs &&
          fortressHp > 0
        ) {
          const bonus = 12 + eveningDifficultyDay * 12;
          set({
            dayStreak: state.dayStreak + 1,
            gold: gold + bonus,
            dayPhase: 'morning',
            eveningEndsAtMs: null,
            fortressHp: state.fortressMaxHp,
            enemies: [],
            spawnRemaining: 0,
            spawnTimerMs: 0,
            waveCooldownUntil: 0,
            waveRewardEligible: false,
            units,
            quests: freshQuests(),
          });
          return;
        }

        if (
          cooledDown &&
          waveRewardEligible &&
          enemies.length === 0 &&
          spawnRemaining === 0
        ) {
          spawnRemaining = waveSpawnBudget(eveningDifficultyDay);
          spawnTimerMs = 850;
          waveCooldownUntil = now + 950;
          waveRewardEligible = false;
        }

        set({
          enemies,
          units,
          fortressHp,
          gold,
          spawnRemaining,
          spawnTimerMs,
          waveCooldownUntil,
          waveRewardEligible,
        });
      },

      debugCompleteEveningSuccess: () => {
        const state = get();
        if (state.dayPhase !== 'evening' || state.eveningEndsAtMs === null) return;
        const eveningDifficultyDay = Math.max(1, state.dayStreak + 1);
        const bonus = 12 + eveningDifficultyDay * 12;
        set({
          dayStreak: state.dayStreak + 1,
          gold: state.gold + bonus,
          dayPhase: 'morning',
          eveningEndsAtMs: null,
          fortressHp: state.fortressMaxHp,
          enemies: [],
          spawnRemaining: 0,
          spawnTimerMs: 0,
          waveCooldownUntil: 0,
          waveRewardEligible: false,
          quests: freshQuests(),
        });
      },

      resetAfterDefeatDemo: () =>
        set((state) => ({
          ...fullRunFailState(state.fortressMaxHp),
        })),
    }),
    {
      name: 'hackaton-game-day-v1',
      storage: gamePersistStorage,
      skipHydration: Platform.OS === 'web',
      merge: (persistedState, currentState) => {
        const p = persistedState as Partial<GameState> | undefined;
        const c = currentState as GameState;
        if (!p) return c;
        return {
          ...c,
          ...p,
          units: migrateUnitsFromPersist(p.units !== undefined ? p.units : c.units),
        };
      },
      partialize: (s) => ({
        gold: s.gold,
        energy: s.energy,
        dayStreak: s.dayStreak,
        dayPhase: s.dayPhase,
        eveningEndsAtMs: s.eveningEndsAtMs,
        fortressHp: s.fortressHp,
        fortressMaxHp: s.fortressMaxHp,
        units: s.units,
        enemies: s.enemies,
        spawnRemaining: s.spawnRemaining,
        spawnTimerMs: s.spawnTimerMs,
        waveCooldownUntil: s.waveCooldownUntil,
        waveRewardEligible: s.waveRewardEligible,
        quests: s.quests,
        boostInventory: s.boostInventory,
        onboardingAvatarId: s.onboardingAvatarId,
        onboardingStruggleIds: s.onboardingStruggleIds,
        onboardingComplete: s.onboardingComplete,
      }),
    }
  )
);
