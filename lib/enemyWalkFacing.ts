import type { SlimeFacing } from '@/constants/enemySlimeSprite';

import type { MapPlayLayout } from '@/lib/mapPlayMetrics';
import { pathProgressToLayoutPx } from '@/lib/tileMap';

/**
 * Instantaneous march direction on screen (enemy advances toward lower pathProgress).
 * Maps screen delta to top-down slime facing assets.
 */
export function slimeFacingFromPathProgress(pathProgress: number, layout: MapPlayLayout): SlimeFacing {
  const p = Math.max(0, Math.min(1, pathProgress));
  const EPS = 0.04;
  const here = pathProgressToLayoutPx(p, layout);
  const towardGoal = pathProgressToLayoutPx(Math.max(0, p - EPS), layout);
  let dx = towardGoal.x - here.x;
  let dy = towardGoal.y - here.y;

  if (Math.hypot(dx, dy) < 0.75) {
    const higher = pathProgressToLayoutPx(Math.min(1, p + EPS), layout);
    dx = here.x - higher.x;
    dy = here.y - higher.y;
  }

  if (Math.hypot(dx, dy) < 1e-6) {
    return 'left';
  }

  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax >= ay) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'front' : 'back';
}
