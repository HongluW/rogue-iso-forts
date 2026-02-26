/**
 * IsoForts Building Types
 * Defines all placeable fort structures and buildings
 */

// =============================================================================
// BUILDING TYPE UNION
// =============================================================================

export type BuildingType =
  // Base tiles
  | 'empty'
  | 'grass'
  | 'moat'
  // Buildings
  | 'tower'
  | 'barbican'
  | 'gate'
  | 'gatehouse'
  | 'bridge';

// =============================================================================
// BUILDING STATS
// =============================================================================

export interface BuildingStats {
  cost: number;
  defense?: number; // Defense value for walls/towers
  capacity?: number; // Capacity for barracks, storage, etc.
  description: string;
  size?: { width: number; height: number };
}

export const BUILDING_STATS: Record<BuildingType, BuildingStats> = {
  empty: { cost: 0, description: 'Empty space' },
  grass: { cost: 0, description: 'Grass' },
  moat: { cost: 5, description: 'Moat - water defense' },
  tower: { cost: 15, defense: 3, description: 'Defense tower' },
  barbican: { cost: 25, defense: 5, description: 'Barbican - gatehouse defense' },
  gate: { cost: 10, defense: 1, description: 'Gate - fortified entrance' },
  gatehouse: { cost: 10, defense: 3, description: 'Gate on top of tower' },
  bridge: { cost: 8, description: 'Bridge over moat' },
};
