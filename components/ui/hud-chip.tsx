import React from 'react';
import { StyleSheet, View } from 'react-native';

import { IosRadius, IosUi } from '@/constants/iosUi';

import { AppText } from '@/components/ui/app-text';

type Props = {
  icon?: string;
  label: string;
  value: string | number;
  dense?: boolean;
};

export function HUDChip({ icon, label, value, dense }: Props) {
  return (
    <View style={[styles.wrap, dense && styles.wrapDense]}>
      {icon ? (
        <AppText variant="caption1" style={[styles.icon, dense && styles.iconDense]}>
          {icon}
        </AppText>
      ) : null}
      <View>
        <AppText variant="caption1" color="secondary" style={dense ? styles.labelDense : undefined}>
          {label}
        </AppText>
        <AppText variant={dense ? 'subhead' : 'headline'}>{value}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: IosUi.systemBackground,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: IosRadius.hud,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: IosUi.separator,
  },
  icon: {
    fontSize: 16,
  },
  iconDense: {
    fontSize: 14,
  },
  wrapDense: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
  },
  labelDense: {
    fontSize: 11,
    lineHeight: 14,
  },
});
