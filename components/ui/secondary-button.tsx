import React from 'react';
import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { IosRadius, IosUi } from '@/constants/iosUi';

import { AppText } from '@/components/ui/app-text';

type Props = Omit<PressableProps, 'style'> & {
  title: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function SecondaryButton({ title, disabled, style, ...rest }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) =>
        StyleSheet.flatten([
          styles.base,
          disabled && styles.disabled,
          pressed && !disabled && styles.pressed,
          style,
        ])
      }
      {...rest}>
      <AppText variant="headline" style={styles.label}>
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: IosUi.systemGray6,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: IosRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    color: IosUi.systemBlue,
  },
});
