/** Programmatic TD battlefield palette (grass + dirt road). */

export const BattleTheme = {
  grassField: '#A5D6A7',
  grassFieldDeep: '#8BC48A',
  grassPad: '#C8E6C9',
  grassPadBorder: 'rgba(27, 94, 32, 0.35)',
  grassLabel: '#1B5E20',

  roadBase: '#6D4C41',
  roadEdge: '#4E342E',
  roadLaneSurface: '#5D4037',
  roadCenterStripe: '#A1887F',

  roadMinHeight: 102,
  roadRadius: 14,
  roadHorizontalMargin: 6,
  laneInsetHorizontal: 12,
  laneInsetVertical: 10,
  canvasRadius: 16,

  grassPadMinSize: 68,
} as const;
