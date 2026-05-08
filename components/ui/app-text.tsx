import React from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { AppFonts } from '@/constants/appFonts';
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

/** Press Start 2P is dense — sizes are stepped down vs SF defaults. */
const variantStyles = StyleSheet.create({
  largeTitle: {
    fontFamily: AppFonts.pixelDisplay,
    fontSize: 26,
    fontWeight: '400',
    lineHeight: 34,
    letterSpacing: 0.5,
  },
  title1: {
    fontFamily: AppFonts.pixelDisplay,
    fontSize: 22,
    fontWeight: '400',
    lineHeight: 28,
    letterSpacing: 0.5,
  },
  title2: {
    fontFamily: AppFonts.pixelDisplay,
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 24,
    letterSpacing: 0.5,
  },
  title3: {
    fontFamily: AppFonts.pixelDisplay,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 20,
    letterSpacing: 0.5,
  },
  headline: {
    fontFamily: AppFonts.pixelBody,
    fontSize: 19,
    fontWeight: '400',
    lineHeight: 22,
  },
  body: {
    fontFamily: AppFonts.pixelBody,
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 22,
  },
  callout: {
    fontFamily: AppFonts.pixelBody,
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 21,
  },
  subhead: {
    fontFamily: AppFonts.pixelBody,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 20,
  },
  footnote: {
    fontFamily: AppFonts.pixelBody,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 19,
  },
  caption1: {
    fontFamily: AppFonts.pixelBody,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 17,
  },
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
