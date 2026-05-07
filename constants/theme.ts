/**
 * Theme tokens; app runs in forced light mode — dark entries kept for ThemedText/ThemedView compatibility.
 */

import { Platform } from 'react-native';

import { IosUi } from '@/constants/iosUi';

const tintColorLight = IosUi.systemBlue;
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: IosUi.label,
    background: IosUi.secondarySystemGroupedBackground,
    tint: tintColorLight,
    icon: IosUi.secondaryLabel,
    tabIconDefault: IosUi.secondaryLabel,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
