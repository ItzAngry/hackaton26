import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { IosShadow, IosUi } from '@/constants/iosUi';

import { AppText } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/primary-button';

import { useGameStore } from '@/store/useGameStore';

const struggles = [
  { id: 'starting', label: 'Getting started', icon: '🚀' },
  { id: 'procrastination', label: 'Putting things off', icon: '⏳' },
  { id: 'sleep', label: 'Sleep', icon: '🌙' },
  { id: 'exercise', label: 'Moving my body', icon: '💪' },
  { id: 'focus', label: 'Staying focused', icon: '🎯' },
  { id: 'hydration', label: 'Drinking water', icon: '💧' },
];

export default function StruggleSelection() {
  const router = useRouter();
  const selected = useGameStore((s) => s.onboardingStruggleIds);
  const setOnboardingStruggles = useGameStore((s) => s.setOnboardingStruggles);

  const toggleStruggle = (id: string) => {
    setOnboardingStruggles(
      selected.includes(id) ? selected.filter((i) => i !== id) : [...selected, id]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppText variant="largeTitle" style={styles.title}>
          What feels hardest lately?
        </AppText>
        <AppText variant="body" color="secondary" style={styles.subtitle}>
          Daily quests will stay gentle—we only use this to tune copy later.
        </AppText>

        <View style={styles.grid}>
          {struggles.map((s) => (
            <TouchableOpacity
              key={s.id}
              activeOpacity={0.85}
              style={[styles.chip, selected.includes(s.id) && styles.chipSelected]}
              onPress={() => toggleStruggle(s.id)}>
              <AppText variant="callout">{s.icon}</AppText>
              <AppText
                variant="callout"
                style={[styles.chipText, selected.includes(s.id) && styles.chipTextSelected]}>
                {s.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        <PrimaryButton
          title="Continue"
          disabled={selected.length === 0}
          style={styles.cta}
          onPress={() => router.push('/onboarding/intro')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: IosUi.secondarySystemGroupedBackground,
  },
  content: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 28,
    maxWidth: 400,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 32,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: IosUi.systemBackground,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: IosUi.separator,
    gap: 8,
    ...IosShadow.card,
  },
  chipSelected: {
    borderColor: IosUi.systemBlue,
    borderWidth: 2,
  },
  chipText: {
    fontWeight: '500',
  },
  chipTextSelected: {
    fontWeight: '600',
  },
  cta: {
    minWidth: 200,
  },
});
