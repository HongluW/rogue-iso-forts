/**
 * IsoForts Game State Types
 */

import { Building, BuildingType } from './buildings';
import { HexPosition } from '../lib/hexUtils';

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

/** Wall segment on a hex: left_up = connects to NW neighbor, right_up = connects to NE, middle = horizontal (placeholder) */
export type WallSegmentType = 'left_up' | 'right_up' | 'middle';

/** Get wall segment type for direction from current hex to neighbor (dq, dr). NE=(1,-1)=right_up, NW=(0,-1)=left_up, E/W=middle. */
export function getWallSegmentType(dq: number, dr: number): WallSegmentType {
  if (dq === 1 && dr === -1) return 'right_up';
  if (dq === 0 && dr === -1) return 'left_up';
  if ((dq === 1 && dr === 0) || (dq === -1 && dr === 0)) return 'middle';
  return 'middle'; // SW, SE fallback
}

export interface Tile {
  building: Building;
  zone: 'none' | 'moat' | 'land' | 'wall';
  /** Wall segments on this hex (left-leaning, right-leaning, or horizontal placeholder) */
  wallSegments?: WallSegmentType[];
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
  population: number; // Total garrison size
  defense: number; // Total defense value
  capacity: number; // Total capacity
  money: number;
  income: number;
  expenses: number;
}

// =============================================================================
// HEX POSITION
// =============================================================================

// Re-export HexPosition for convenience
export type { HexPosition } from '../lib/hexUtils';

// =============================================================================
// GAME STATE
// =============================================================================

export interface GameState {
  id: string;
  fortName: string;
  grid: Map<string, Tile>; // Hex grid using "q,r" as key
  gridSize: number; // Approximate radius/size of hex grid
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
// Tools that support click-and-drag line building
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
