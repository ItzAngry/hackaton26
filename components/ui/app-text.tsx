import React from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { IosUi } from '@/constants/iosUi';

type Variant =
  | 'largeTitle'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'headline'
  | 'body'
  | 'callout'
  | 'subhead'
  | 'footnote'
  | 'caption1';

type Props = TextProps & {
  variant?: Variant;
  color?: 'primary' | 'secondary' | 'tertiary' | 'tint';
};

const variantStyles = StyleSheet.create({
  largeTitle: { fontSize: 34, fontWeight: '700', lineHeight: 41 },
  title1: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
  title2: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
  title3: { fontSize: 20, fontWeight: '600', lineHeight: 25 },
  headline: { fontSize: 17, fontWeight: '600', lineHeight: 22 },
  body: { fontSize: 17, fontWeight: '400', lineHeight: 22 },
  callout: { fontSize: 16, fontWeight: '400', lineHeight: 21 },
  subhead: { fontSize: 15, fontWeight: '400', lineHeight: 20 },
  footnote: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  caption1: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
});

export function AppText({ variant = 'body', color = 'primary', style, ...rest }: Props) {
  const colorValue =
    color === 'primary'
      ? IosUi.label
      : color === 'secondary'
        ? IosUi.secondaryLabel
        : color === 'tertiary'
          ? IosUi.tertiaryLabel
          : IosUi.systemBlue;

  return (
    <Text style={[variantStyles[variant], { color: colorValue }, style]} {...rest} />
  );
}
