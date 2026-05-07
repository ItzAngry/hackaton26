import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Redirect } from 'expo-router';

import { IosUi } from '@/constants/iosUi';

import { useOnboardingGate } from '@/lib/useOnboardingGate';

import { AppText } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Card } from '@/components/ui/card';

export default function RecoveryScreen() {
  const router = useRouter();
  const gate = useOnboardingGate();
  if (gate === 'loading') return null;
  if (gate === 'redirect') return <Redirect href="/onboarding/avatar" />;

  return (
    <SafeAreaView style={styles.container}>
      <Card style={styles.card}>
        <AppText variant="title2" style={styles.emoji}>
          🌿
        </AppText>
        <AppText variant="title2" style={styles.title}>
          Welcome back
        </AppText>
        <AppText variant="body" color="secondary" style={styles.message}>
          Your defenders waited patiently. You can pick up right where you left off—no guilt, just the next small step.
        </AppText>
        <PrimaryButton title="Return to battlefield" onPress={() => router.replace('/')} />
      </Card>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: IosUi.secondarySystemGroupedBackground,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: 28,
    alignItems: 'center',
    gap: 14,
  },
  emoji: {
    marginBottom: 4,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
});
