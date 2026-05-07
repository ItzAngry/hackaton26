import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IosUi } from '@/constants/iosUi';

import { useOnboardingGate } from '@/lib/useOnboardingGate';

import { AppText } from '@/components/ui/app-text';

export default function ReportPage() {
  const gate = useOnboardingGate();
  if (gate === 'loading') return null;
  if (gate === 'redirect') return <Redirect href="/onboarding/avatar" />;
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <AppText variant="title2">Reports</AppText>
        <AppText variant="body" color="secondary" style={styles.sub}>
          Progress summaries will land here in a future update.
        </AppText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: IosUi.secondarySystemGroupedBackground,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  sub: {
    textAlign: 'center',
    maxWidth: 320,
  },
});
