import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import { VT323_400Regular } from '@expo-google-fonts/vt323';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BackgroundMusic } from '@/components/background-music';
import { PortraitRotationPrompt } from '@/components/portrait-rotation-prompt';

import { IosUi } from '@/constants/iosUi';

import { AuthProvider } from '@/lib/auth-context';

import { isExpoGo } from '@/lib/runtime-env';

import { GameStoreProvider } from '../store/GameStoreProvider';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Delay lets the root window settle before locking; avoids iOS churn during Expo/host startup. */
const LANDSCAPE_LOCK_DELAY_MS = 450;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    VT323_400Regular,
    PressStart2P_400Regular,
  });
  const fontsReady = fontsLoaded || fontError;

  useEffect(() => {
    if (fontsReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsReady]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(IosUi.secondarySystemGroupedBackground).catch(() => {});

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

  if (!fontsReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <GameStoreProvider>
          <BackgroundMusic />
          <StatusBar style="dark" />
          <PortraitRotationPrompt />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: IosUi.secondarySystemGroupedBackground },
            }}
          />
        </GameStoreProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
