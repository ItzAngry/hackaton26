/**
 * Tactical grid over the battle panel.
 * BLOCKED_CELLS = path / road (cannot place defenders).
 * PATH_CELL_ORDER: spawn-first (pathProgress 1) → goal-last (pathProgress 0).
 */

export type TileKind = 'path' | 'buildable' | 'blocked';

export const GRID_COLS = 16;
export const GRID_ROWS = 9;

/** @deprecated Use GRID_COLS — kept for incremental refactors */
export const TILE_COLS = GRID_COLS;
/** @deprecated Use GRID_ROWS */
export const TILE_ROWS = GRID_ROWS;

/** Cells where the road exists — placement blocked here (same as legacy `path` tiles). */
export const BLOCKED_CELLS = new Set<string>([
  '2,4',
  '3,4',
  '4,4',
  '5,4',
  '6,4',
  '7,4',
  '8,4',
  '9,4',
  '10,4',
  '11,4',
  '5,3',
  '5,5',
  '10,3',
  '10,5',
]);

export type SceneSize = {
  width: number;
  height: number;
};

export type GridCellHit = {
  col: number;
  row: number;
  cellWidth: number;
  cellHeight: number;
};

export function cellKey(col: number, row: number): string {
  return `${col},${row}`;
}

export function getCellFromTouch(x: number, y: number, sceneSize: SceneSize): GridCellHit {
  const cellWidth = sceneSize.width / GRID_COLS;
  const cellHeight = sceneSize.height / GRID_ROWS;
  const col = Math.min(GRID_COLS - 1, Math.max(0, Math.floor(x / cellWidth)));
  const row = Math.min(GRID_ROWS - 1, Math.max(0, Math.floor(y / cellHeight)));
  return { col, row, cellWidth, cellHeight };
}

export function isBuildableCell(col: number, row: number): boolean {
  return !BLOCKED_CELLS.has(cellKey(col, row));
}

/**
 * Enemy march along the road: right spawn → left goal, including vertical spurs off row 4.
 */
export const PATH_CELL_ORDER: { c: number; r: number }[] = [
  { c: 11, r: 4 },
  { c: 10, r: 4 },
  { c: 10, r: 3 },
  { c: 10, r: 4 },
  { c: 10, r: 5 },
  { c: 10, r: 4 },
  { c: 9, r: 4 },
  { c: 8, r: 4 },
  { c: 7, r: 4 },
  { c: 6, r: 4 },
  { c: 5, r: 4 },
  { c: 5, r: 3 },
  { c: 5, r: 4 },
  { c: 5, r: 5 },
  { c: 5, r: 4 },
  { c: 4, r: 4 },
  { c: 3, r: 4 },
  { c: 2, r: 4 },
];

function buildTilesMask(): TileKind[][] {
  const rows: TileKind[][] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    rows[r] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      rows[r][c] = BLOCKED_CELLS.has(cellKey(c, r)) ? 'path' : 'buildable';
    }
  }
  return rows;
}

export const TILES: TileKind[][] = buildTilesMask();

export function tileKindAt(c: number, r: number): TileKind {
  if (!Number.isFinite(c) || !Number.isFinite(r)) return 'blocked';
  const ic = Math.trunc(c);
  const ir = Math.trunc(r);
  if (ir < 0 || ir >= GRID_ROWS || ic < 0 || ic >= GRID_COLS) return 'blocked';
  const row = TILES[ir];
  if (!row) return 'blocked';
  return row[ic] ?? 'blocked';
}

export function isBuildable(c: number, r: number): boolean {
  return tileKindAt(c, r) === 'buildable';
}

export function isPath(c: number, r: number): boolean {
  return tileKindAt(c, r) === 'path';
}
