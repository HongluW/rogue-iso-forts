/**
 * Hexagonal Grid Utilities
 * Flat-top hexagons using axial coordinates (q, r)
 */

// Hex size constants (flat-top orientation)
export const HEX_SIZE = 32; // Radius of hexagon (distance from center to corner)
export const HEX_WIDTH = HEX_SIZE * 2; // Full width of hexagon
export const HEX_HEIGHT = HEX_SIZE * Math.sqrt(3); // Full height of hexagon

// Hex position interface
export interface HexPosition {
  q: number; // Column (horizontal axis)
  r: number; // Row (diagonal axis)
}

// Hex directions for flat-top hexagons (axial coordinates)
export const HEX_DIRECTIONS: HexPosition[] = [
  { q: 1, r: 0 },   // East
  { q: 1, r: -1 },  // Northeast
  { q: 0, r: -1 },  // Northwest
  { q: -1, r: 0 },  // West
  { q: -1, r: 1 },  // Southwest
  { q: 0, r: 1 },   // Southeast
];

/**
 * Convert axial hex coordinates to screen pixel coordinates (flat-top)
 */
export function hexToScreen(
  q: number,
  r: number,
  offsetX: number = 0,
  offsetY: number = 0
): { screenX: number; screenY: number } {
  const x = HEX_SIZE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r) + offsetX;
  const y = HEX_SIZE * ((3 / 2) * r) + offsetY;
  return { screenX: x, screenY: y };
}

/**
 * Convert screen pixel coordinates to axial hex coordinates (flat-top)
 * Uses cube coordinates for rounding to nearest hex
 * Canvas transform: scale(dpr * zoom), translate(offset / zoom), rotate(-30°), scale(1, 0.866)
 */
export function screenToHex(
  screenX: number,
  screenY: number,
  offsetX: number = 0,
  offsetY: number = 0,
  dpr: number = 1,
  zoom: number = 1,
  viewCenterX: number = 0,
  viewCenterY: number = 0
): HexPosition {
  // Reverse the canvas transform: screen -> world
  // Step 1: Reverse scale and translate
  let worldX = screenX / (dpr * zoom) - offsetX / zoom;
  let worldY = screenY / (dpr * zoom) - offsetY / zoom;
  
  // Step 2: Reverse isometric transform (Y-axis compression only, no rotation)
  // Move to center, unscale Y, move back
  worldX = worldX - viewCenterX;
  worldY = worldY - viewCenterY;
  
  // Unscale Y axis (reverse 0.8 compression)
  worldY = worldY / 0.8;
  
  worldX = worldX + viewCenterX;
  worldY = worldY + viewCenterY;
  
  // Convert to hex coordinates (flat-top)
  const q = (Math.sqrt(3) / 3 * worldX - (1 / 3) * worldY) / HEX_SIZE;
  const r = ((2 / 3) * worldY) / HEX_SIZE;
  
  // Round to nearest hex using cube coordinates
  return hexRound(q, r);
}

/**
 * Round fractional hex coordinates to nearest hex
 * Uses cube coordinate system for accurate rounding
 */
function hexRound(q: number, r: number): HexPosition {
  // Convert axial to cube
  let x = q;
  let z = r;
  let y = -x - z;
  
  // Round cube coordinates
  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);
  
  // Calculate differences
  const xDiff = Math.abs(rx - x);
  const yDiff = Math.abs(ry - y);
  const zDiff = Math.abs(rz - z);
  
  // Correct rounding if needed
  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz;
  } else if (yDiff > zDiff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }
  
  // Convert back to axial
  return { q: rx, r: rz };
}

/**
 * Get all 6 neighbors of a hex
 */
export function getHexNeighbors(q: number, r: number): HexPosition[] {
  return HEX_DIRECTIONS.map(dir => ({
    q: q + dir.q,
    r: r + dir.r,
  }));
}

/**
 * Calculate distance between two hexes
 */
export function hexDistance(q1: number, r1: number, q2: number, r2: number): number {
  // Convert to cube coordinates
  const x1 = q1;
  const z1 = r1;
  const y1 = -x1 - z1;
  
  const x2 = q2;
  const z2 = r2;
  const y2 = -x2 - z2;
  
  // Distance in cube coordinates
  return (Math.abs(x1 - x2) + Math.abs(y1 - y2) + Math.abs(z1 - z2)) / 2;
}

/**
 * Get all hexes within a given radius
 */
export function getHexesInRadius(
  centerQ: number,
  centerR: number,
  radius: number
): HexPosition[] {
  const hexes: HexPosition[] = [];
  
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      hexes.push({ q: centerQ + q, r: centerR + r });
    }
  }
  
  return hexes;
}

/**
 * Convert hex position to string key for Map storage
 */
export function hexToKey(q: number, r: number): string {
  return `${q},${r}`;
}

/**
 * Convert string key to hex position
 */
export function keyToHex(key: string): HexPosition {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

/**
 * Check if hex position is within bounds
 */
export function isHexInBounds(
  q: number,
  r: number,
  minQ: number,
  maxQ: number,
  minR: number,
  maxR: number
): boolean {
  return q >= minQ && q <= maxQ && r >= minR && r <= maxR;
}

/**
 * Get all hexes in a rectangular region (for grid initialization)
 * Creates a hex pattern that fits within the bounds
 * Note: For a proper hex grid, use getHexesInRadius instead
 */
export function getHexesInRect(
  minQ: number,
  maxQ: number,
  minR: number,
  maxR: number
): HexPosition[] {
  const hexes: HexPosition[] = [];
  
  for (let r = minR; r <= maxR; r++) {
    for (let q = minQ; q <= maxQ; q++) {
      hexes.push({ q, r });
    }
  }
  
  return hexes;
}
