import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { IosRadius, IosUi } from '@/constants/iosUi';

import { AppText } from '@/components/ui/app-text';

export type SegmentTab = { key: string; label: string };

type Props = {
  tabs: SegmentTab[];
  value: string;
  onChange: (key: string) => void;
};

export function SegmentedTabs({ tabs, value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {tabs.map((tab) => {
        const selected = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.key)}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentSelected,
              pressed && styles.segmentPressed,
            ]}>
            <AppText
              variant="subhead"
              style={[styles.label, selected && styles.labelSelected]}
              color={selected ? 'primary' : 'secondary'}>
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: IosUi.systemGray6,
    borderRadius: IosRadius.button,
    padding: 2,
    gap: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: IosRadius.button - 2,
  },
  segmentSelected: {
    backgroundColor: IosUi.systemBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentPressed: {
    opacity: 0.85,
  },
  label: {
    fontWeight: '600',
  },
  labelSelected: {
    fontWeight: '600',
  },
});
