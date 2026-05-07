import { usePathname } from 'expo-router';

import { useGameStore } from '@/store/useGameStore';

export type OnboardingGateStatus = 'loading' | 'redirect' | 'ok';

export function useOnboardingGate(): OnboardingGateStatus {
  const hydrated = useGameStore((s) => s.cloudSaveHydrated);
  const complete = useGameStore((s) => s.onboardingComplete);
  const pathname = usePathname();

  if (!hydrated) return 'loading';
  if (pathname.includes('onboarding')) return 'ok';
  if (!complete) return 'redirect';
  return 'ok';
}
