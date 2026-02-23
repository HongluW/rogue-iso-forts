/**
 * Forts Simulation Logic
 */

import { GameState, Tile, Building, BuildingType, Tool, FortStats, BUILDING_STATS } from '../types';
import { isMobile } from 'react-device-detect';

export const DEFAULT_GRID_SIZE = isMobile ? 50 : 70;

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
  const grid: Tile[][] = [];
  
  for (let y = 0; y < size; y++) {
    grid[y] = [];
    for (let x = 0; x < size; x++) {
      grid[y][x] = {
        building: {
          type: 'grass',
          constructionProgress: 100,
          powered: false,
          watered: false,
        },
        zone: 'none',
      };
    }
  }
  
  return {
    id: `fort-${Date.now()}`,
    fortName: fortName || 'New Fort',
    grid,
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
    gameVersion: 1,
  };
}

// Place building at tile
export function placeBuilding(
  grid: Tile[][],
  gridSize: number,
  x: number,
  y: number,
  buildingType: BuildingType
): boolean {
  if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) return false;
  
  const tile = grid[y][x];
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

// Bulldoze tile
export function bulldozeTile(
  grid: Tile[][],
  gridSize: number,
  x: number,
  y: number
): boolean {
  if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) return false;
  
  const tile = grid[y][x];
  if (tile.building.type === 'empty' || tile.building.type === 'water') {
    return false; // Can't bulldoze empty or water
  }
  
  tile.building = {
    type: 'grass',
    constructionProgress: 100,
    powered: false,
    watered: false,
  };
  
  return true;
}

// Calculate fort stats
export function calculateFortStats(grid: Tile[][], gridSize: number): FortStats {
  // Simplified stats calculation - no buildings yet, so all zeros
  return {
    population: 0,
    defense: 0,
    capacity: 0,
    money: 0, // Will be set from state
    income: 0,
    expenses: 0,
  };
}

// Simulate tick
export function simulateTick(state: GameState): GameState {
  const newGrid = state.grid.map(row => row.map(tile => ({ ...tile })));
  
  // Update construction progress
  for (let y = 0; y < state.gridSize; y++) {
    for (let x = 0; x < state.gridSize; x++) {
      const tile = newGrid[y][x];
      if (tile.building.constructionProgress < 100) {
        tile.building.constructionProgress = Math.min(
          100,
          tile.building.constructionProgress + 2 // 2% per tick
        );
      }
    }
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
