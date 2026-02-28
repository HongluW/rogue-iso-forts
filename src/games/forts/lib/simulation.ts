/**
 * Forts Simulation Logic
 */

import { GameState, Tile, Building, BuildingType, Tool, FortStats, BUILDING_STATS, DEFAULT_BASE_HEALTH, DEFAULT_RESOURCE_CAP } from '../types';
import { isMobile } from 'react-device-detect';
import { gridToKey } from './gridUtils';

export const DEFAULT_GRID_SIZE = isMobile ? 16 : 24;

// Create empty tile
export function createEmptyTile(): Tile {
  return {
    building: {
      type: 'empty',
      constructionProgress: 100,
      powered: false,
      watered: false,
    },
    zone: 'none',
  };
}

// Create empty building
export function createEmptyBuilding(): Building {
  return {
    type: 'empty',
    constructionProgress: 100,
    powered: false,
    watered: false,
  };
}

// Create initial game state
export function createInitialGameState(fortName?: string, gridSize?: number): GameState {
  const size = gridSize || DEFAULT_GRID_SIZE;
  const grid = new Map<string, Tile>();

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      grid.set(gridToKey(x, y), {
        building: {
          type: 'grass',
          constructionProgress: 100,
          powered: false,
          watered: false,
        },
        zone: 'none',
      });
    }
  }

  // Placeholder starting area at center: 3x3 or 2x2 depending on map size
  const startSize = size <= 8 ? 2 : 3;
  const offset = Math.floor((startSize - 1) / 2); // 0 for 2x2, 1 for 3x3
  const cx = Math.floor((size - 1) / 2);
  const cy = Math.floor((size - 1) / 2);
  for (let dy = 0; dy < startSize; dy++) {
    for (let dx = 0; dx < startSize; dx++) {
      const x = cx - offset + dx;
      const y = cy - offset + dy;
      if (x >= 0 && x < size && y >= 0 && y < size) {
        const tile = grid.get(gridToKey(x, y))!;
        tile.zone = 'start';
      }
    }
  }

  const baseStats = calculateFortStats(grid, size);

  return {
    id: `fort-${Date.now()}`,
    fortName: fortName ?? '',
    grid,
    gridSize: size,
    selectedTool: 'select',
    activePanel: 'none',
    speed: 1,
    stats: {
      ...baseStats,
      wood: 5,
      stone: 5,
      food: 5,
    },
    tick: 0,
    day: 1,
    month: 1,
    year: 1000,
    hour: 12,
    gameVersion: 4,
    activeCardId: null,
    remainingBuildBlocksFromCard: null,
    phase: 'name_entry',
    round: 1,
    phaseEndsAt: 0,
    damagedTiles: [],
    roundBonusWood: 5,
    roundBonusStone: 5,
    roundBonusFood: 5,
    baseHealth: DEFAULT_BASE_HEALTH,
    resourceCapWood: DEFAULT_RESOURCE_CAP,
    resourceCapStone: DEFAULT_RESOURCE_CAP,
    resourceCapFood: DEFAULT_RESOURCE_CAP,
    // Starter pool of wall segments the player can place manually.
    wallBlocksAvailable: 24,
    // Default wall variant is a wooden palisade.
    currentWallType: 'palisade',
  };
}

// Place building at tile
export function placeBuilding(
  grid: Map<string, Tile>,
  gridSize: number,
  x: number,
  y: number,
  buildingType: BuildingType
): boolean {
  const key = gridToKey(x, y);
  const tile = grid.get(key);
  if (!tile) return false;
  if (tile.building.type !== 'empty' && tile.building.type !== 'grass') return false;
  tile.building = { type: buildingType, constructionProgress: 0, powered: false, watered: false };
  return true;
}

// Bulldoze tile
export function bulldozeTile(
  grid: Map<string, Tile>,
  gridSize: number,
  x: number,
  y: number
): boolean {
  const key = gridToKey(x, y);
  const tile = grid.get(key);
  if (!tile) return false;
  if (tile.building.type === 'empty' || tile.building.type === 'moat') return false;
  tile.building = { type: 'grass', constructionProgress: 100, powered: false, watered: false };
  tile.zone = 'none';
  tile.wallType = undefined;
  return true;
}

// Calculate fort stats
export function calculateFortStats(grid: Map<string, Tile>, gridSize: number): FortStats {
  let defense = 0;

  for (const tile of grid.values()) {
    if (tile.zone === 'wall') defense += 1;
  }

  return { defense, wood: 0, stone: 0, food: 0 };
}

// Run siege: damage some wall/defense tiles (placeholder logic)
export function runSiegeDamage(grid: Map<string, Tile>, _gridSize: number): { grid: Map<string, Tile>; damagedKeys: string[] } {
  const damagedKeys: string[] = [];
  const newGrid = new Map<string, Tile>();
  const damageableTypes = new Set(['tower', 'barbican', 'gate', 'gatehouse', 'machicolations', 'balistraria', 'crossbow_slit', 'longbow_slit']);
  for (const [key, tile] of grid.entries()) {
    const newTile = { ...tile, building: { ...tile.building } };
    const isWall = tile.zone === 'wall';
    const isDefense = damageableTypes.has(tile.building.type);
    if (tile.zone === 'start') {
      newGrid.set(key, newTile);
      continue;
    }
    if ((isWall || isDefense) && !tile.building.damaged && Math.random() < 0.15) {
      newTile.building.damaged = true;
      damagedKeys.push(key);
    }
    newGrid.set(key, newTile);
  }
  return { grid: newGrid, damagedKeys };
}

// Repair a damaged tile (cost: wood + stone)
export function repairTile(
  grid: Map<string, Tile>,
  key: string,
  woodCost: number,
  stoneCost: number
): { grid: Map<string, Tile>; success: boolean } {
  const tile = grid.get(key);
  if (!tile || !tile.building.damaged) return { grid, success: false };
  const newGrid = new Map<string, Tile>();
  for (const [k, t] of grid.entries()) {
    const nt = { ...t, building: { ...t.building } };
    if (k === key) nt.building.damaged = false;
    newGrid.set(k, nt);
  }
  return { grid: newGrid, success: true };
}

// Simulate tick
export function simulateTick(state: GameState): GameState {
  const newGrid = new Map<string, Tile>();
  for (const [key, tile] of state.grid.entries()) {
    const newTile = { ...tile, building: { ...tile.building } };
    if (newTile.building.constructionProgress < 100) {
      newTile.building.constructionProgress = Math.min(100, newTile.building.constructionProgress + 2);
    }
    newGrid.set(key, newTile);
  }

  const stats = calculateFortStats(newGrid, state.gridSize);
  stats.wood = state.stats.wood;
  stats.stone = state.stats.stone;
  stats.food = state.stats.food;

  let newTick = state.tick + 1;
  let newDay = state.day;
  let newMonth = state.month;
  let newYear = state.year;
  let newHour = state.hour;
  if (newDay > 30) { newDay = 1; newMonth++; }
  if (newMonth > 12) { newMonth = 1; newYear++; }

  const totalTicks = ((newYear - 1000) * 12 * 30 * 30) + ((newMonth - 1) * 30 * 30) + ((newDay - 1) * 30) + newTick;
  newHour = Math.floor((totalTicks % 450) / 450 * 24);

  return { ...state, grid: newGrid, stats, tick: newTick, day: newDay, month: newMonth, year: newYear, hour: newHour };
}
