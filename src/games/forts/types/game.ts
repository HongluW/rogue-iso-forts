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
  | 'bulldoze_all'
  // Terrain
  | 'zone_moat'
  | 'zone_land'
  | 'zone_wall'
  // Buildings
  | 'build_tower'
  | 'build_barbican'
  | 'build_gate'
  // Utils
  | 'build_bridge'
  // Embrasure (walls defense)
  | 'build_machicolations'
  | 'build_balistraria'
  | 'build_crossbow_slit'
  | 'build_longbow_slit';

// =============================================================================
// TOOL INFO
// =============================================================================

export type ToolTier = 'basic' | 'unlock';

export interface ToolInfo {
  name: string;
  cost: number;
  description: string;
  size?: { width: number; height: number };
  category: ToolCategory;
  tier: ToolTier;
}

export type ToolCategory =
  | 'tools'
  | 'terrain'
  | 'wall'
  | 'walls_defense'
  | 'buildings'
  | 'utils';

export const TOOL_INFO: Record<Tool, ToolInfo> = {
  // Basic tier
  select: { name: 'Select', cost: 0, description: 'Select tiles', category: 'tools', tier: 'basic' },
  bulldoze: { name: 'Bulldoze', cost: 0, description: 'Remove structures', category: 'tools', tier: 'basic' },
  bulldoze_all: { name: 'Bulldoze All', cost: 0, description: 'Clear everything except main home (Free Builder only)', category: 'tools', tier: 'basic' },
  zone_wall: { name: 'Wall', cost: 3, description: 'Stone wall (drag to draw line)', category: 'wall', tier: 'basic' },
  build_tower: { name: 'Tower', cost: 15, description: 'Defense tower', category: 'buildings', tier: 'basic' },
  build_gate: { name: 'Gate', cost: 10, description: 'Fortified entrance', category: 'buildings', tier: 'basic' },
  // Unlock tier
  zone_moat: { name: 'Moat', cost: 5, description: 'Dig a moat (drag to draw line)', category: 'terrain', tier: 'unlock' },
  zone_land: { name: 'Land', cost: 0, description: 'Place land (drag to draw line)', category: 'terrain', tier: 'unlock' },
  build_barbican: { name: 'Barbican', cost: 25, description: 'Gatehouse defense', category: 'buildings', tier: 'unlock' },
  build_bridge: { name: 'Bridge', cost: 8, description: 'Bridge over moat', category: 'utils', tier: 'unlock' },
  build_machicolations: { name: 'Machicolations', cost: 12, description: 'Wall defense', category: 'walls_defense', tier: 'unlock' },
  build_balistraria: { name: 'Balistraria', cost: 10, description: 'Ballista opening', category: 'walls_defense', tier: 'unlock' },
  build_crossbow_slit: { name: 'Cross bow slit', cost: 6, description: 'Crossbow opening', category: 'walls_defense', tier: 'unlock' },
  build_longbow_slit: { name: 'Longbow slit', cost: 6, description: 'Longbow opening', category: 'walls_defense', tier: 'unlock' },
};

// =============================================================================
// TILE & BUILDING
// =============================================================================

export interface Tile {
  building: Building;
  zone: 'none' | 'moat' | 'land' | 'wall' | 'start';
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
