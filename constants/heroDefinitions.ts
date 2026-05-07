export type HeroUnitType = 'Ground' | 'Air' | 'Aquatic' | 'Hybrid';
export type HeroAttackType = 'Physical' | 'Magic';

export type HeroFrame = { x: number; y: number; w: number; h: number; d: number };

export type HeroDefinition = {
  id: string;
  name: string;
  subtitle: string;
  unitType: HeroUnitType;
  sheet: number;
  sheetW: number;
  sheetH: number;
  frames: HeroFrame[];
  maxHp: number;
  damage: number;
  attackSpeed: number;
  attackRange: number;
  attackType: HeroAttackType;
};

function strip(
  frameW: number,
  frameH: number,
  count: number,
  duration = 100,
  sheetW: number,
  sheetH: number
): Pick<HeroDefinition, 'frames' | 'sheetW' | 'sheetH'> {
  return {
    sheetW,
    sheetH,
    frames: Array.from({ length: count }, (_, i) => ({
      x: i * frameW,
      y: 0,
      w: frameW,
      h: frameH,
      d: duration,
    })),
  };
}

/** Playable heroes from `assets/images/animals` (LibreSprite strip atlases). */
export const HERO_DEFINITIONS: HeroDefinition[] = [
  {
    id: 'fox',
    name: 'Fox',
    subtitle: 'Quick striker',
    unitType: 'Air',
    sheet: require('../assets/images/animals/Fox_Idle_right.png'),
    maxHp: 82,
    damage: 9,
    attackSpeed: 0.72,
    attackRange: 52,
    attackType: 'Physical',
    ...strip(32, 32, 4, 100, 128, 32),
  },
  {
    id: 'boar',
    name: 'Boar',
    subtitle: 'Tough frontline',
    unitType: 'Ground',
    sheet: require('../assets/images/animals/Boar_Idle_right.png'),
    maxHp: 108,
    damage: 11,
    attackSpeed: 0.95,
    attackRange: 40,
    attackType: 'Physical',
    ...strip(32, 32, 4, 100, 128, 32),
  },
  {
    id: 'sheep',
    name: 'Sheep',
    subtitle: 'Balanced support',
    unitType: 'Aquatic',
    sheet: require('../assets/images/animals/Sheep_Idle_right.png'),
    maxHp: 92,
    damage: 8,
    attackSpeed: 0.82,
    attackRange: 48,
    attackType: 'Magic',
    ...strip(32, 32, 4, 100, 128, 32),
  },
  {
    id: 'bull',
    name: 'Bull',
    subtitle: 'Heavy hitter',
    unitType: 'Hybrid',
    sheet: require('../assets/images/animals/Bull_right_Idle.png'),
    maxHp: 118,
    damage: 13,
    attackSpeed: 1.05,
    attackRange: 36,
    attackType: 'Physical',
    ...strip(64, 64, 4, 100, 256, 64),
  },
  {
    id: 'grouse',
    name: 'Black grouse',
    subtitle: 'Skirmisher',
    unitType: 'Air',
    sheet: require('../assets/images/animals/Black_grouse_Idle_Right.png'),
    maxHp: 78,
    damage: 10,
    attackSpeed: 0.68,
    attackRange: 54,
    attackType: 'Magic',
    ...strip(32, 32, 4, 100, 128, 32),
  },
];

export const HERO_BY_ID: Record<string, HeroDefinition> = Object.fromEntries(
  HERO_DEFINITIONS.map((h) => [h.id, h])
);

export const DEFAULT_HERO_ID = 'fox';

export function getHeroIdForUnit(unit: { heroId?: string }): string {
  const id = unit.heroId;
  if (id && HERO_BY_ID[id]) return id;
  return DEFAULT_HERO_ID;
}
