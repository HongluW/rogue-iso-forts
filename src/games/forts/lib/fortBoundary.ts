/**
 * Fort boundary utilities for underground building placement.
 * Underground buildings can only be placed:
 * - Within the walls (fort interior) if walls exist, or
 * - Within 2 blocks of the main base (start zone) otherwise.
 */

import type { Tile } from '../types';
import { gridToKey } from './gridUtils';

/** Returns the set of grid keys where underground building is allowed. */
export function getFortBuildableKeys(
  grid: Map<string, Tile>,
  gridSize: number
): Set<string> {
  const hasWalls = [...grid.values()].some((t) => t.zone === 'wall');
  if (hasWalls) {
    return getFortInteriorKeys(grid, gridSize);
  }
  return getTilesWithinTwoOfStart(grid, gridSize);
}

/**
 * Fort interior: tiles reachable from start by BFS through land/moat/start only.
 * Walls block movement, so this gives the "inside the fort" area.
 */
function getFortInteriorKeys(grid: Map<string, Tile>, gridSize: number): Set<string> {
  const result = new Set<string>();
  const queue: { x: number; y: number }[] = [];
  const visited = new Set<string>();

  // Seed with all start tiles
  for (const [key, tile] of grid.entries()) {
    if (tile.zone === 'start') {
      const [x, y] = key.split(',').map(Number);
      queue.push({ x, y });
      visited.add(key);
      result.add(key);
    }
  }

  const canTraverse = (x: number, y: number): boolean => {
    if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) return false;
    const key = gridToKey(x, y);
    const tile = grid.get(key);
    if (!tile) return false;
    // Can move through start, land, moat (inside the fort)
    return tile.zone === 'start' || tile.zone === 'land' || tile.zone === 'moat' || tile.zone === 'none';
  };

  while (queue.length > 0) {
    const { x, y } = queue.shift()!;
    const neighbors = [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
    ];
    for (const n of neighbors) {
      const key = gridToKey(n.x, n.y);
      if (visited.has(key)) continue;
      if (!canTraverse(n.x, n.y)) continue;
      visited.add(key);
      result.add(key);
      queue.push(n);
    }
  }

  return result;
}

/**
 * Tiles within Manhattan distance 2 of any start zone tile.
 * Used when no walls exist.
 */
function getTilesWithinTwoOfStart(grid: Map<string, Tile>, gridSize: number): Set<string> {
  const startTiles: { x: number; y: number }[] = [];
  for (const [key, tile] of grid.entries()) {
    if (tile.zone === 'start') {
      const [x, y] = key.split(',').map(Number);
      startTiles.push({ x, y });
    }
  }

  const result = new Set<string>();
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      const key = gridToKey(x, y);
      const tile = grid.get(key);
      if (!tile) continue;
      const minDist = Math.min(
        ...startTiles.map((s) => Math.abs(x - s.x) + Math.abs(y - s.y))
      );
      if (minDist <= 2) result.add(key);
    }
  }
  return result;
}
