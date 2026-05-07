import { create } from 'zustand';

export interface Hero {
  id: string;
  species: 'fox' | 'bear' | 'owl' | 'rabbit' | 'wolf';
  name: string;
  bondXp: number;
  rarity: 'Common' | 'Rare' | 'Legendary';
  abilities: string[];
  dialogue: {
    level1: string;
    level2: string;
    level3: string;
    level4: string;
  };
}

interface HeroStore {
  heroes: Hero[];
  activeHeroId: string | null;
  addHero: (hero: Hero) => void;
  increaseBond: (id: string, amount: number) => void;
  setActiveHero: (id: string) => void;
}

export const useHeroStore = create<HeroStore>((set) => ({
  heroes: [
    {
      id: 'hero-1',
      species: 'fox',
      name: 'Finnegan',
      bondXp: 10,
      rarity: 'Common',
      abilities: ['Rapid Shot'],
      dialogue: {
        level1: "The forest grows stronger with you.",
        level2: "I can feel our bond deepening.",
        level3: "Your discipline is inspiring, Guardian.",
        level4: "Together, we are the shield of the Bastion."
      }
    }
  ],
  activeHeroId: 'hero-1',
  addHero: (hero) => set((state) => ({ heroes: [...state.heroes, hero] })),
  increaseBond: (id, amount) => set((state) => ({
    heroes: state.heroes.map(h => h.id === id ? { ...h, bondXp: h.bondXp + amount } : h),
  })),
  setActiveHero: (id) => set({ activeHeroId: id }),
}));
