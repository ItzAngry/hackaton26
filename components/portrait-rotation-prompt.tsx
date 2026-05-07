import React from 'react';
import { Modal, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { IosUi } from '@/constants/iosUi';

import { AppText } from '@/components/ui/app-text';

import { isExpoGo } from '@/lib/runtime-env';

/**
 * Full-screen hint when the window is portrait. Skipped in Expo Go so we don't stack a Modal on a
 * rotating Expo shell (common crash source on iOS).
 */
export function PortraitRotationPrompt() {
  const { width, height } = useWindowDimensions();
  const isPortrait = height > width;

  // RN-web Modal often renders as an opaque layer or conflicts with layout; browser users can resize.
  if (Platform.OS === 'web' || isExpoGo() || !isPortrait) return null;

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.icon} accessibilityLabel="">
            🔄
          </Text>
          <AppText variant="title2" style={styles.title}>
            Rotate to landscape
          </AppText>
          <AppText variant="body" color="secondary" style={styles.subtitle}>
            This game is played sideways. Turn your device for the full battlefield view.
          </AppText>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: IosUi.systemBackground,
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 24,
    maxWidth: 340,
    alignItems: 'center',
  },
  icon: {
    fontSize: 44,
    marginBottom: 12,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
  },
});
