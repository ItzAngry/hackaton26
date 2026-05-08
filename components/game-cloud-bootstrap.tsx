import { useEffect } from 'react';

import { fetchSharedMapLayout, pullUserSave, subscribeCloudPush } from '@/lib/gameCloudSync';
import { useGameStore } from '@/store/useGameStore';

export function GameCloudBootstrap({ userId }: { userId: string }) {
  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;
    void (async () => {
      useGameStore.setState({ cloudSaveHydrated: false });
      await pullUserSave(userId);
      if (cancelled) return;
      await fetchSharedMapLayout();
      if (cancelled) return;
      useGameStore.setState({ cloudSaveHydrated: true });
      unsub = subscribeCloudPush();
    })();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [userId]);

  return null;
}
