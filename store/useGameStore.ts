import { create } from 'zustand';

interface GameState {
  // User Profile
  username: string;
  level: number;
  streak: number;
  gold: number;
  energy: number;
  spellDust: number;
  
  // Tower
  wallDurability: number;
  
  // Active Hero
  activeHeroId: string | null;
  
  // Actions
  setUsername: (name: string) => void;
  addGold: (amount: number) => void;
  spendGold: (amount: number) => void;
  updateTowerHealth: (amount: number) => void;
  setActiveHero: (id: string) => void;
}

export const useGameStore = create<GameState>((set) => ({
  username: '',
  level: 1,
  streak: 0,
  gold: 0,
  energy: 100,
  spellDust: 0,
  wallDurability: 100,
  activeHeroId: null,

  setUsername: (name) => set({ username: name }),
  addGold: (amount) => set((state) => ({ gold: state.gold + amount })),
  spendGold: (amount) => set((state) => ({ gold: state.gold - amount })),
  updateTowerHealth: (amount) => set((state) => ({ wallDurability: state.wallDurability + amount })),
  setActiveHero: (id) => set({ activeHeroId: id }),
}));
