import React, { useEffect } from 'react';
import { Audio } from 'expo-av';

/** Bundled looping ambience (`assets/Course_Select_By_Zane_Little.mp3`). */
const BGM_SOURCE = require('../assets/Course_Select_By_Zane_Little.mp3');

/**
 * Starts looping background music for the whole app. Renders nothing.
 * Failures are swallowed so builds without native audio still run (e.g. odd web hosts).
 */
export function BackgroundMusic() {
  useEffect(() => {
    let cancelled = false;
    const soundRef: { current: Audio.Sound | null } = { current: null };

    void (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        const { sound } = await Audio.Sound.createAsync(
          BGM_SOURCE,
          {
            shouldPlay: true,
            isLooping: true,
            volume: 0.38,
          },
          undefined,
          true
        );

        if (cancelled) {
          await sound.unloadAsync();
          return;
        }

        soundRef.current = sound;
        await sound.playAsync();
      } catch {
        /* Web / missing codec — ignore */
      }
    })();

    return () => {
      cancelled = true;
      void (async () => {
        const s = soundRef.current;
        soundRef.current = null;
        try {
          if (!s) return;
          await s.stopAsync();
          await s.unloadAsync();
        } catch {
          /* noop */
        }
      })();
    };
  }, []);

  return null;
}
