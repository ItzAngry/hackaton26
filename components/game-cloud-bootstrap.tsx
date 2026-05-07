import { useEffect } from 'react';

import { pullUserSave, subscribeCloudPush } from '@/lib/gameCloudSync';
import { useGameStore } from '@/store/useGameStore';

export function GameCloudBootstrap({ userId }: { userId: string }) {
  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;
    void (async () => {
      useGameStore.setState({ cloudSaveHydrated: false });
      await pullUserSave(userId);
      if (cancelled) return;
      useGameStore.setState({ cloudSaveHydrated: true });
      unsub = subscribeCloudPush(userId);
    })();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [userId]);

  return null;
}
