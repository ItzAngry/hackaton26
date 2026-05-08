import React, { useEffect } from 'react';
import { Platform } from 'react-native';

import { useGameStore } from '@/store/useGameStore';
import { useMapLayoutStore } from '@/store/useMapLayoutStore';

/**
 * Zustand gameplay state uses persist middleware in useGameStore.
 * Web: defer AsyncStorage/localStorage rehydration until after mount (avoids blank first paint).
 */
export function GameStoreProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (Platform.OS === 'web') {
      void useGameStore.persist.rehydrate();
      void useMapLayoutStore.persist.rehydrate();
    }
  }, []);

  return <>{children}</>;
}
