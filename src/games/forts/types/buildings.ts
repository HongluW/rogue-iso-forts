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
  | 'bridge'
  // Embrasure (walls defense)
  | 'machicolations'
  | 'balistraria'
  | 'crossbow_slit'
  | 'longbow_slit'
  // Resource buildings
  | 'stone_mason'
  | 'carpenter'
  | 'mess_hall';

// =============================================================================
// BUILDING STATS
// =============================================================================

export type BuildingTier = 'basic' | 'unlock';

export interface BuildingStats {
  cost: number;
  defense?: number;
  capacity?: number;
  description: string;
  size?: { width: number; height: number };
  tier: BuildingTier;
  /** If true, this building can be placed underground (e.g. resource buildings). */
  undergroundAllowed?: boolean;
}

export const BUILDING_STATS: Record<BuildingType, BuildingStats> = {
  // Basic tier
  empty: { cost: 0, description: 'Empty space', tier: 'basic' },
  grass: { cost: 0, description: 'Grass', tier: 'basic' },
  tower: { cost: 15, defense: 3, description: 'Defense tower', tier: 'basic' },
  gate: { cost: 10, defense: 1, description: 'Gate - fortified entrance', tier: 'basic' },
  gatehouse: { cost: 10, defense: 3, description: 'Gate on top of tower', tier: 'basic' },
  // Unlock tier
  moat: { cost: 5, description: 'Moat - water defense', tier: 'unlock' },
  barbican: { cost: 25, defense: 5, description: 'Barbican - gatehouse defense', tier: 'unlock' },
  bridge: { cost: 8, description: 'Bridge over moat', tier: 'unlock' },
  machicolations: { cost: 12, defense: 2, description: 'Machicolations', tier: 'unlock' },
  balistraria: { cost: 10, defense: 2, description: 'Balistraria', tier: 'unlock' },
  crossbow_slit: { cost: 6, defense: 1, description: 'Cross bow slit', tier: 'unlock' },
  longbow_slit: { cost: 6, defense: 1, description: 'Longbow slit', tier: 'unlock' },
  stone_mason: { cost: 10, description: 'Stone Mason workshop', tier: 'unlock' },
  carpenter: { cost: 10, description: 'Carpenter workshop', tier: 'unlock' },
  mess_hall: { cost: 10, description: 'Mess Hall', tier: 'unlock' },
};
