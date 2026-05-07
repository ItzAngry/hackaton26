import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { IosRadius, IosShadow, IosUi } from '@/constants/iosUi';

import { AppText } from '@/components/ui/app-text';

import { useGameStore } from '@/store/useGameStore';

const avatars = [
  { id: 'fox', name: 'Fox', emoji: '🦊', color: IosUi.systemBlue },
  { id: 'bear', name: 'Bear', emoji: '🐻', color: '#8E8E93' },
  { id: 'owl', name: 'Owl', emoji: '🦉', color: '#5856D6' },
];

export default function AvatarSelection() {
  const router = useRouter();
  const setOnboardingAvatar = useGameStore((s) => s.setOnboardingAvatar);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <AppText variant="largeTitle" style={styles.title}>
          Pick your style
        </AppText>
        <AppText variant="body" color="secondary" style={styles.subtitle}>
          Choose a look for your commander—it&apos;s just for fun on this screen.
        </AppText>

        <View style={styles.grid}>
          {avatars.map((avatar) => (
            <TouchableOpacity
              key={avatar.id}
              activeOpacity={0.85}
              style={[styles.card, { borderColor: avatar.color }]}
              onPress={() => {
                setOnboardingAvatar(avatar.id);
                router.push('/onboarding/struggles');
              }}>
              <AppText variant="title1">{avatar.emoji}</AppText>
              <AppText variant="headline">{avatar.name}</AppText>
            </TouchableOpacity>
          ))}
        </View>
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
    padding: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 36,
    maxWidth: 360,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  card: {
    width: 104,
    height: 130,
    backgroundColor: IosUi.systemBackground,
    borderRadius: IosRadius.card,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...IosShadow.card,
  },
});
