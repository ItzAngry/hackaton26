import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BackgroundMusic } from '@/components/background-music';
import { PortraitRotationPrompt } from '@/components/portrait-rotation-prompt';

import { AuthProvider } from '@/lib/auth-context';

import { isExpoGo } from '@/lib/runtime-env';

import { GameStoreProvider } from '../store/GameStoreProvider';

/** Delay lets the root window settle before locking; avoids iOS churn during Expo/host startup. */
const LANDSCAPE_LOCK_DELAY_MS = 450;

export default function RootLayout() {
  useEffect(() => {
    SystemUI.setBackgroundColorAsync('#F2F2F7').catch(() => {});

    if (Platform.OS === 'web') return undefined;

    // Expo Go stays portrait-capable; forcing landscape here fights the shell and can crash on iOS.
    if (isExpoGo()) return undefined;

    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
      }
    }, LANDSCAPE_LOCK_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      ScreenOrientation.unlockAsync().catch(() => {});
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <GameStoreProvider>
          <BackgroundMusic />
          <StatusBar style="dark" />
          <PortraitRotationPrompt />
          <Stack
            screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F2F2F7' } }}
          />
        </GameStoreProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
