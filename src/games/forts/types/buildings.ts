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
  | 'water';

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
  water: { cost: 0, description: 'Water' },
};
