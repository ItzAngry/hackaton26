/** iOS-style semantic colors for light mode (Human Interface Guidelines–aligned). */

export const IosUi = {
  systemBackground: '#FFFFFF',
  secondarySystemGroupedBackground: '#F2F2F7',
  tertiarySystemGroupedBackground: '#FFFFFF',
  separator: 'rgba(60, 60, 67, 0.29)',
  opaqueSeparator: '#C6C6C8',
  label: '#000000',
  secondaryLabel: 'rgba(60, 60, 67, 0.6)',
  tertiaryLabel: 'rgba(60, 60, 67, 0.3)',
  systemBlue: '#007AFF',
  systemGray5: '#E5E5EA',
  systemGray6: '#F2F2F7',
  destructive: '#FF3B30',
} as const;

export const IosRadius = {
  card: 12,
  button: 12,
  chip: 10,
  hud: 14,
} as const;

export const IosShadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
} as const;
