import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { IosUi } from '@/constants/iosUi';

import { AppText } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/primary-button';

import { useGameStore } from '@/store/useGameStore';

export default function OnboardingIntro() {
  const router = useRouter();
  const markOnboardingComplete = useGameStore((s) => s.markOnboardingComplete);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <AppText variant="title1" style={styles.emoji}>
          🏰
        </AppText>

        <AppText variant="largeTitle" style={styles.title}>
          Defend your fortress
        </AppText>
        <AppText variant="body" color="secondary" style={styles.description}>
          {`Use preparation time to place defenders on the lane, finish Today's plan tasks for bonus gold, and equip boosts. When you're ready, one timed evening defense carries the streak — this build focuses on the loop and layout.`}
        </AppText>

        <PrimaryButton
          title="Enter battlefield"
          onPress={() => {
            markOnboardingComplete();
            router.replace('/');
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: IosUi.secondarySystemGroupedBackground,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 16,
  },
  emoji: {
    fontSize: 72,
    lineHeight: 80,
    marginBottom: 8,
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 460,
    marginBottom: 12,
  },
});
