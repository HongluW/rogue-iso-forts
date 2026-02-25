/**
 * Forts Simulation Logic
 */

import { GameState, Tile, Building, BuildingType, Tool, FortStats, BUILDING_STATS } from '../types';
import { isMobile } from 'react-device-detect';
import { hexToKey, getHexesInRadius } from './hexUtils';

export const DEFAULT_GRID_SIZE = isMobile ? 8 : 10; // Half the previous size

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
  
  // Create hex grid within radius
  const hexes = getHexesInRadius(0, 0, size);
  for (const hex of hexes) {
    const key = hexToKey(hex.q, hex.r);
    grid.set(key, {
      building: {
        type: 'grass',
        constructionProgress: 100,
        powered: false,
        watered: false,
      },
      zone: 'none',
    });
  }
  
  return {
    id: `fort-${Date.now()}`,
    fortName: fortName || 'New Fort',
    grid,
    walls: new Set<string>(), // Initialize empty walls set
    gridSize: size,
    selectedTool: 'select',
    activePanel: 'none',
    speed: 1,
    stats: {
      population: 0,
      defense: 0,
      capacity: 0,
      money: 10000,
      income: 0,
      expenses: 0,
    },
    tick: 0,
    day: 1,
    month: 1,
    year: 1000,
    hour: 12,
    gameVersion: 3, // Increment version for edge-based walls
  };
}

// Place building at hex tile
export function placeBuilding(
  grid: Map<string, Tile>,
  gridSize: number,
  q: number,
  r: number,
  buildingType: BuildingType
): boolean {
  const key = hexToKey(q, r);
  const tile = grid.get(key);
  
  if (!tile) return false; // Hex doesn't exist
  
  if (tile.building.type !== 'empty' && tile.building.type !== 'grass') {
    return false; // Can't place on existing buildings
  }
  
  tile.building = {
    type: buildingType,
    constructionProgress: 0,
    powered: false,
    watered: false,
  };
  
  return true;
}

// Bulldoze hex tile
export function bulldozeTile(
  grid: Map<string, Tile>,
  gridSize: number,
  q: number,
  r: number
): boolean {
  const key = hexToKey(q, r);
  const tile = grid.get(key);
  
  if (!tile) return false; // Hex doesn't exist
  
  if (tile.building.type === 'empty' || tile.building.type === 'moat') {
    return false; // Can't bulldoze empty or moat
  }
  
  tile.building = {
    type: 'grass',
    constructionProgress: 100,
    powered: false,
    watered: false,
  };
  tile.zone = 'none';
  tile.wallSegments = [];
  return true;
}

// Calculate fort stats
export function calculateFortStats(grid: Map<string, Tile>, gridSize: number): FortStats {
  // Simplified stats calculation - iterate over hex grid
  let population = 0;
  let defense = 0;
  let capacity = 0;
  
  for (const tile of grid.values()) {
    // Add stats based on building type if needed
    // For now, all zeros as no buildings have stats yet
  }
  
  return {
    population,
    defense,
    capacity,
    money: 0, // Will be set from state
    income: 0,
    expenses: 0,
  };
}

// Simulate tick
export function simulateTick(state: GameState): GameState {
  // Create new grid map with updated tiles
  const newGrid = new Map<string, Tile>();
  
  // Update construction progress for all hexes
  for (const [key, tile] of state.grid.entries()) {
    const newTile = { ...tile, building: { ...tile.building } };
    if (newTile.building.constructionProgress < 100) {
      newTile.building.constructionProgress = Math.min(
        100,
        newTile.building.constructionProgress + 2 // 2% per tick
      );
    }
    newGrid.set(key, newTile);
  }
  
  // Calculate stats
  const stats = calculateFortStats(newGrid, state.gridSize);
  stats.money = state.stats.money;
  stats.income = state.stats.income;
  stats.expenses = state.stats.expenses;
  
  // Update time
  let newTick = state.tick + 1;
  let newDay = state.day;
  let newMonth = state.month;
  let newYear = state.year;
  let newHour = state.hour;
  
  if (newTick >= 30) {
    newTick = 0;
    newDay++;
    // Weekly income/expense
    if (newDay % 7 === 0) {
      stats.money += Math.floor((stats.income - stats.expenses) / 4);
    }
  }
  
  if (newDay > 30) {
    newDay = 1;
    newMonth++;
  }
  
  if (newMonth > 12) {
    newMonth = 1;
    newYear++;
  }
  
  // Update hour (slower visual cycle)
  const totalTicks = ((newYear - 1000) * 12 * 30 * 30) + ((newMonth - 1) * 30 * 30) + ((newDay - 1) * 30) + newTick;
  const cycleLength = 450; // ticks per visual day
  newHour = Math.floor((totalTicks % cycleLength) / cycleLength * 24);
  
  return {
    ...state,
    grid: newGrid,
    stats,
    tick: newTick,
    day: newDay,
    month: newMonth,
    year: newYear,
    hour: newHour,
  };
}
