/**
 * IsoForts Game State Types
 */

import { Building, BuildingType } from './buildings';
import { GridPosition } from '../lib/gridUtils';

// =============================================================================
// TOOL TYPES
// =============================================================================

export type Tool =
  // Basic tools
  | 'select'
  | 'bulldoze'
  
  // Terrain
  | 'zone_moat'
  | 'zone_land'
  | 'zone_wall';

// =============================================================================
// TOOL INFO
// =============================================================================

export interface ToolInfo {
  name: string;
  cost: number;
  description: string;
  size?: { width: number; height: number };
  category: ToolCategory;
}

export type ToolCategory =
  | 'tools'
  | 'terrain';

export const TOOL_INFO: Record<Tool, ToolInfo> = {
  select: { name: 'Select', cost: 0, description: 'Select tiles', category: 'tools' },
  bulldoze: { name: 'Bulldoze', cost: 0, description: 'Remove structures', category: 'tools' },
  zone_moat: { name: 'Moat', cost: 5, description: 'Dig a moat (drag to draw line)', category: 'terrain' },
  zone_land: { name: 'Land', cost: 0, description: 'Place land (drag to draw line)', category: 'terrain' },
  zone_wall: { name: 'Wall', cost: 3, description: 'Stone wall (drag to draw line)', category: 'terrain' },
};

// =============================================================================
// TILE & BUILDING
// =============================================================================

export interface Tile {
  building: Building;
  zone: 'none' | 'moat' | 'land' | 'wall';
}

export interface Building {
  type: BuildingType;
  constructionProgress: number; // 0-100
  powered: boolean;
  watered: boolean;
}

// =============================================================================
// FORT STATS
// =============================================================================

export interface FortStats {
  population: number;
  defense: number;
  capacity: number;
  money: number;
  income: number;
  expenses: number;
}

// =============================================================================
// GRID POSITION
// =============================================================================

export type { GridPosition } from '../lib/gridUtils';

// =============================================================================
// GAME STATE
// =============================================================================

export interface GameState {
  id: string;
  fortName: string;
  grid: Map<string, Tile>; // Square grid using "x,y" as key
  gridSize: number; // Width/height of square grid
  selectedTool: Tool;
  activePanel: 'none' | 'budget' | 'statistics' | 'settings';
  speed: 0 | 1 | 2 | 3;
  stats: FortStats;
  tick: number;
  day: number;
  month: number;
  year: number;
  hour: number;
  gameVersion: number;
}

// =============================================================================
// DRAG-BUILD TOOLS
// =============================================================================

export const DRAG_BUILD_TOOLS: Set<Tool> = new Set([
  'zone_moat',
  'zone_land',
  'zone_wall',
]);

export function isDragBuildTool(tool: Tool): boolean {
  return DRAG_BUILD_TOOLS.has(tool);
}

// SavedFortMeta is defined in saveUtils.ts
