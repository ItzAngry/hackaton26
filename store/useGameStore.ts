import { create } from 'zustand';
import { supabase } from '../lib/supabase/client';

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
  addGold: (amount: number) => Promise<void>;
  spendGold: (amount: number) => Promise<void>;
  updateTowerHealth: (amount: number) => Promise<void>;
  setActiveHero: (id: string) => void;
  syncFromDb: () => Promise<void>;
}

export const useGameStore = create<GameState>((set, get) => ({
  username: '',
  level: 1,
  streak: 0,
  gold: 0,
  energy: 100,
  spellDust: 0,
  wallDurability: 100,
  activeHeroId: null,

  setUsername: (name) => set({ username: name }),

  addGold: async (amount) => {
    const { gold } = get();
    const newGold = gold + amount;
    set({ gold: newGold });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ gold: newGold })
          .eq('id', user.id);
      }
    } catch (e) {
      console.error('Error syncing gold to DB:', e);
    }
  },

  spendGold: async (amount) => {
    const { gold } = get();
    const newGold = gold - amount;
    set({ gold: newGold });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ gold: newGold })
          .eq('id', user.id);
      }
    } catch (e) {
      console.error('Error syncing gold to DB:', e);
    }
  },

  updateTowerHealth: async (amount) => {
    const { wallDurability } = get();
    const newDurability = Math.max(0, wallDurability + amount);
    set({ wallDurability: newDurability });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('tower')
          .update({ wall_durability: newDurability })
          .eq('user_id', user.id);
      }
    } catch (e) {
      console.error('Error syncing tower health to DB:', e);
    }
  },

  setActiveHero: (id) => set({ activeHeroId: id }),

  syncFromDb: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Fetch tower
      const { data: tower } = await supabase
        .from('tower')
        .select('wall_durability')
        .eq('user_id', user.id)
        .single();

      if (profile && tower) {
        set({
          username: profile.username,
          gold: profile.gold,
          spellDust: profile.spell_dust,
          wallDurability: tower.wall_durability,
        });
      }
    } catch (e) {
      console.error('Error syncing state from DB:', e);
    }
  },
}));
