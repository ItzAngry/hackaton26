import { Platform } from 'react-native';
import type { GestureResponderEvent } from 'react-native';

type LayoutBox = { measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void };

/** Prefer event-local coords when valid (native + most web). */
export function localCoordsFromMapGesture(
  nativeEvent: GestureResponderEvent['nativeEvent']
): { lx: number; ly: number } | null {
  const ne = nativeEvent as unknown as Record<string, number | undefined>;
  const lx = ne.locationX ?? ne.offsetX;
  const ly = ne.locationY ?? ne.offsetY;
  if (typeof lx === 'number' && typeof ly === 'number' && Number.isFinite(lx) && Number.isFinite(ly)) {
    return { lx, ly };
  }
  return null;
}

/**
 * Map-local pixel coords inside the battlefield/editor map view.
 * On web, `locationX`/`locationY` can be inconsistent for full-bleed Pressables — use window coords minus measureInWindow.
 */
export function resolveLocalMapCoordsAsync(
  nativeEvent: GestureResponderEvent['nativeEvent'],
  mapContainer: LayoutBox | null,
  done: (coords: { lx: number; ly: number } | null) => void
): void {
  const ne = nativeEvent as unknown as Record<string, number | undefined>;

  if (
    Platform.OS === 'web' &&
    mapContainer &&
    typeof ne.pageX === 'number' &&
    typeof ne.pageY === 'number' &&
    Number.isFinite(ne.pageX) &&
    Number.isFinite(ne.pageY)
  ) {
    mapContainer.measureInWindow((mx, my) => {
      done({ lx: ne.pageX! - mx, ly: ne.pageY! - my });
    });
    return;
  }

  const sync = localCoordsFromMapGesture(nativeEvent);
  if (sync) {
    done(sync);
    return;
  }

  if (
    mapContainer &&
    typeof ne.pageX === 'number' &&
    typeof ne.pageY === 'number' &&
    Number.isFinite(ne.pageX) &&
    Number.isFinite(ne.pageY)
  ) {
    mapContainer.measureInWindow((mx, my) => {
      done({ lx: ne.pageX! - mx, ly: ne.pageY! - my });
    });
    return;
  }

  done(null);
}
