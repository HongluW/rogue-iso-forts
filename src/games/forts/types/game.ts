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

/** Edge between two hexes - represented as normalized hex coordinates */
export interface HexEdge {
  q1: number;
  r1: number;
  q2: number;
  r2: number;
}

/** Normalize an edge so it always has a consistent representation (smaller hex first) */
export function normalizeEdge(q1: number, r1: number, q2: number, r2: number): HexEdge {
  // Sort by r first, then q, so the same edge always has the same representation
  if (r1 < r2 || (r1 === r2 && q1 < q2)) {
    return { q1, r1, q2, r2 };
  }
  return { q1: q2, r1: r2, q2: q1, r2: r1 };
}

/** Convert edge to string key for Map storage */
export function edgeToKey(edge: HexEdge): string {
  return `${edge.q1},${edge.r1}-${edge.q2},${edge.r2}`;
}

/** Get all edges between consecutive hexes in a line */
export function getEdgesBetweenHexes(hexes: HexPosition[]): HexEdge[] {
  const edges: HexEdge[] = [];
  for (let i = 0; i < hexes.length - 1; i++) {
    const hex1 = hexes[i];
    const hex2 = hexes[i + 1];
    edges.push(normalizeEdge(hex1.q, hex1.r, hex2.q, hex2.r));
  }
  return edges;
}

export interface Tile {
  building: Building;
  zone: 'none' | 'moat' | 'land';
  // Removed wallSegments - walls are now stored on edges in GameState
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
  walls: Set<string>; // Wall edges using edgeToKey() as key
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
