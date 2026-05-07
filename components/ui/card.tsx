import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { IosRadius, IosShadow, IosUi } from '@/constants/iosUi';

export function Card({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: IosUi.systemBackground,
    borderRadius: IosRadius.card,
    ...IosShadow.card,
  },
});
