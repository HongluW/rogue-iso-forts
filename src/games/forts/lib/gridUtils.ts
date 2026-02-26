/**
 * Square Isometric Grid Utilities
 * Simple (x, y) grid with isometric diamond rendering
 */

// Tile size constants (isometric diamond)
export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

// Grid position interface
export interface GridPosition {
  x: number;
  y: number;
}

/**
 * Convert grid (x, y) to isometric screen pixel coordinates
 */
export function gridToScreen(x: number, y: number): { screenX: number; screenY: number } {
  const screenX = (x - y) * (TILE_WIDTH / 2);
  const screenY = (x + y) * (TILE_HEIGHT / 2);
  return { screenX, screenY };
}

/**
 * Convert screen pixel coordinates back to grid (x, y)
 * Accounts for canvas transforms: scale(dpr*zoom), translate(offset/zoom), scale(1, 0.8)
 */
export function screenToGrid(
  screenX: number,
  screenY: number,
  offsetX: number = 0,
  offsetY: number = 0,
  dpr: number = 1,
  zoom: number = 1,
  viewCenterX: number = 0,
  viewCenterY: number = 0
): GridPosition {
  // Step 1: Reverse scale and translate
  let worldX = screenX / (dpr * zoom) - offsetX / zoom;
  let worldY = screenY / (dpr * zoom) - offsetY / zoom;

  // Step 2: Reverse Y-axis compression (0.9)
  worldX -= viewCenterX;
  worldY -= viewCenterY;
  worldY /= 0.975;
  worldX += viewCenterX;
  worldY += viewCenterY;

  // Step 3: Reverse isometric projection
  // Tile (x,y) center maps to gx=2x, gy=2y, with tile spanning [2x-1, 2x+1].
  // floor((gx+1)/2) correctly maps this range to x (floor(gx/2) was off by one
  // for the upper half of each diamond).
  const gx = worldX / (TILE_WIDTH / 2) + worldY / (TILE_HEIGHT / 2);
  const gy = worldY / (TILE_HEIGHT / 2) - worldX / (TILE_WIDTH / 2);

  return { x: Math.floor((gx + 1) / 2), y: Math.floor((gy + 1) / 2) };
}

/**
 * Convert grid position to string key for Map storage
 */
export function gridToKey(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * Convert string key back to grid position
 */
export function keyToGrid(key: string): GridPosition {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

/**
 * Get all grid cells along a straight line between two positions (Bresenham)
 */
export function gridLineBetween(x0: number, y0: number, x1: number, y1: number): GridPosition[] {
  const results: GridPosition[] = [];
  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let cx = x0;
  let cy = y0;

  while (true) {
    results.push({ x: cx, y: cy });
    if (cx === x1 && cy === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      cx += sx;
    }
    if (e2 < dx) {
      err += dx;
      cy += sy;
    }
  }
  return results;
}

/**
 * Manhattan distance between two grid cells
 */
export function gridDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

/**
 * Whether two grid cells are cardinal-neighbors (share an edge)
 */
export function areAdjacent(x1: number, y1: number, x2: number, y2: number): boolean {
  return gridDistance(x1, y1, x2, y2) === 1;
}

/**
 * Get the 4 cardinal neighbors of a grid cell
 */
export function getNeighbors(x: number, y: number): GridPosition[] {
  return [
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 },
  ];
}
