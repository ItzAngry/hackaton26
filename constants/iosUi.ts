/** Enchanted / parchment UI palette + shared radii (light mode). */

export const IosUi = {
  systemBackground: '#F7F0E4',
  secondarySystemGroupedBackground: '#E8DECF',
  tertiarySystemGroupedBackground: '#F7F0E4',
  separator: 'rgba(60, 42, 28, 0.22)',
  opaqueSeparator: '#C4B6A3',
  label: '#2A1F30',
  secondaryLabel: 'rgba(42, 31, 48, 0.72)',
  tertiaryLabel: 'rgba(42, 31, 48, 0.42)',
  /** Links, secondary actions, HUD tint */
  systemBlue: '#7B52AB',
  /** Filled primary buttons (readable white text) */
  primaryFill: '#4F3D6E',
  systemGray5: '#D9CFC0',
  systemGray6: '#E8DECF',
  destructive: '#A52C2C',
} as const;

export const IosRadius = {
  card: 12,
  button: 12,
  chip: 10,
  hud: 14,
} as const;

export const IosShadow = {
  card: {
    shadowColor: '#1a0f14',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
} as const;
