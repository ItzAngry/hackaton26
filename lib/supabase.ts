import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { isRnAsyncStorageLinked } from '@/lib/nativeStorageSupport';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

const webAuthStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return Promise.resolve(null);
    return Promise.resolve(window.localStorage.getItem(key));
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return Promise.resolve();
    window.localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return Promise.resolve();
    window.localStorage.removeItem(key);
    return Promise.resolve();
  },
};

function createMemoryAuthStorage() {
  const memory = new Map<string, string>();
  return {
    getItem: async (key: string) => memory.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: async (key: string) => {
      memory.delete(key);
    },
  };
}

/**
 * AsyncStorage throws when the native module is missing (broken dev client, some test envs).
 * Fall back to memory so Supabase auth still runs; session won't survive process kill in that mode.
 */
function createNativeAuthStorage() {
  if (!isRnAsyncStorageLinked()) {
    return createMemoryAuthStorage();
  }

  const memory = new Map<string, string>();
  let preferMemory = false;

  const getItem = async (key: string): Promise<string | null> => {
    if (preferMemory) return memory.get(key) ?? null;
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      preferMemory = true;
      return memory.get(key) ?? null;
    }
  };

  const setItem = async (key: string, value: string): Promise<void> => {
    if (preferMemory) {
      memory.set(key, value);
      return;
    }
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      preferMemory = true;
      memory.set(key, value);
    }
  };

  const removeItem = async (key: string): Promise<void> => {
    if (preferMemory) {
      memory.delete(key);
      return;
    }
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      preferMemory = true;
      memory.delete(key);
    }
  };

  return { getItem, setItem, removeItem };
}

const authStorage = Platform.OS === 'web' ? webAuthStorage : createNativeAuthStorage();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
