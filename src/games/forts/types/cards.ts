/**
 * IsoForts Card Assets
 * Defines card rarities, categories, and card definitions.
 * Cards are a separate line of assets from buildings/tools.
 */

// =============================================================================
// CARD RARITY
// =============================================================================

export type CardRarity = 'common' | 'uncommon' | 'unique' | 'rare' | 'legendary';

export const CARD_RARITIES: CardRarity[] = ['common', 'uncommon', 'unique', 'rare', 'legendary'];

// =============================================================================
// CARD CATEGORY
// =============================================================================

export type CardCategory =
  | 'buildings'   // Unlocks or upgrades structures — barbican, archer tower, machicolations
  | 'terrain'     // Moat extensions, land bridges, earthworks, raised ground
  | 'utilities'   // Drawbridge, portcullis, murder holes, oil cauldrons — attachments to structures
  | 'intel'       // Attacker intel — from direction-only to full composition, timing, special units
  | 'resources'   // Gold, stone, wood — immediate or per-round over time
  | 'tactical';   // One-time effects during attack — reinforced walls, barricade, mercenaries

export interface CardCategoryInfo {
  id: CardCategory;
  name: string;
  description: string;
}

export const CARD_CATEGORIES: Record<CardCategory, CardCategoryInfo> = {
  buildings: {
    id: 'buildings',
    name: 'Buildings',
    description:
      'Unlocks or upgrades a specific structure — place a barbican, upgrade a tower to archer tower, add machicolations to an existing wall. Core strategic cards.',
  },
  terrain: {
    id: 'terrain',
    name: 'Terrain',
    description:
      'Moat extensions, land bridges, earthworks, raised ground. Shapes the battlefield before the attack.',
  },
  utilities: {
    id: 'utilities',
    name: 'Utilities',
    description:
      'Drawbridge, portcullis, murder holes, oil cauldrons. Functional attachments to existing structures rather than standalone buildings.',
  },
  intel: {
    id: 'intel',
    name: 'Intel',
    description:
      'Ranges from vague to precise. A common intel card might reveal attacker direction only. A rare one reveals full composition, timing, and special units.',
  },
  resources: {
    id: 'resources',
    name: 'Resources',
    description:
      'Gold, stone, wood — immediate injection. Could also be "gain X resources per round for 3 rounds" as a rarer variant.',
  },
  tactical: {
    id: 'tactical',
    name: 'Special / Tactical',
    description:
      'One-time effects during the attack phase — reinforced walls for one round, emergency barricade, hired mercenaries to hold a gate. Blur into the defense phase.',
  },
};

// =============================================================================
// CARD PLAY PHASE (when the card can be used)
// =============================================================================

/** Phase during which this card can be played. Build-phase cards are used in the build round; defense-phase cards during the defense/siege round. */
export type CardPlayPhase = 'build' | 'defense';

// =============================================================================
// CARD DEFINITION
// =============================================================================

export type CardId = string;

export interface CardDefinition {
  id: CardId;
  name: string;
  rarity: CardRarity;
  category: CardCategory;
  description: string;
  /** When this card can be played: build round (place/construct) or defense round (tactical/intel effects). */
  playablePhase: CardPlayPhase;
  /** Optional: resource costs when playing the card */
  foodCost?: number;
  woodCost?: number;
  stoneCost?: number;
  /** Optional: for buildings/terrain/utilities, reference a structure or effect key */
  effectKey?: string;
  /** Optional: for terrain (e.g. moat), number of blocks you can build out when this card is used */
  buildBlocks?: number;
}

// =============================================================================
// CARD REGISTRY (add concrete cards here as needed)
// =============================================================================

export const CARD_DEFINITIONS: Record<CardId, CardDefinition> = {
  // -------------------------------------------------------------------------
  // Buildings — basic set: three core buildings
  // -------------------------------------------------------------------------
  building_stone_mason: {
    id: 'building_stone_mason',
    name: 'Stone Mason',
    rarity: 'common',
    category: 'buildings',
    description: 'Unlocks construction of a Stone Mason workshop for processing stone.',
    playablePhase: 'build',
    effectKey: 'stone_mason',
    woodCost: 5,
    foodCost: 5,
  },
  building_carpenter: {
    id: 'building_carpenter',
    name: 'Carpenter',
    rarity: 'common',
    category: 'buildings',
    description: 'Unlocks construction of a Carpenter workshop for processing wood.',
    playablePhase: 'build',
    effectKey: 'carpenter',
    stoneCost: 5,
    foodCost: 5,
  },
  building_mess_hall: {
    id: 'building_mess_hall',
    name: 'Mess Hall',
    rarity: 'common',
    category: 'buildings',
    description: 'Unlocks construction of a Mess Hall to keep defenders fed and organized.',
    playablePhase: 'build',
    effectKey: 'mess_hall',
    woodCost: 5,
    stoneCost: 5,
  },
  // -------------------------------------------------------------------------
  // Buildings — rare upgrades for core buildings
  // NOTE: These are design-only for now. When implemented, each upgrade
  //       should increase the per-round output of its corresponding resource.
  // -------------------------------------------------------------------------
  building_upgrade_stone_mason: {
    id: 'building_upgrade_stone_mason',
    name: 'Upgrade Stonemason',
    rarity: 'rare',
    category: 'buildings',
    description:
      'Upgrade the Stone Mason. When implemented, this will increase the per-round output of stone from Stone Mason buildings.',
    playablePhase: 'build',
    effectKey: 'upgrade_stone_mason',
  },
  building_upgrade_carpenter: {
    id: 'building_upgrade_carpenter',
    name: 'Upgrade Carpentry',
    rarity: 'rare',
    category: 'buildings',
    description:
      'Upgrade the Carpenter. When implemented, this will increase the per-round output of wood from Carpenter buildings.',
    playablePhase: 'build',
    effectKey: 'upgrade_carpenter',
  },
  building_upgrade_mess_hall: {
    id: 'building_upgrade_mess_hall',
    name: 'Upgrade Mess Hall',
    rarity: 'rare',
    category: 'buildings',
    description:
      'Upgrade the Mess Hall. When implemented, this will increase the per-round output of food (or morale-related food effects) from Mess Halls.',
    playablePhase: 'build',
    effectKey: 'upgrade_mess_hall',
  },
  // -------------------------------------------------------------------------
  // Buildings — uncommon: +output per round (Stonemason+, Workshop+, Mess Hall+)
  // -------------------------------------------------------------------------
  upgrade_stonemason_plus: {
    id: 'upgrade_stonemason_plus',
    name: 'Stonemason+',
    rarity: 'uncommon',
    category: 'buildings',
    description: 'Upgrade: +stone output per round from Stone Mason buildings.',
    playablePhase: 'build',
    effectKey: 'upgrade_stone_mason',
  },
  upgrade_workshop_plus: {
    id: 'upgrade_workshop_plus',
    name: 'Workshop+',
    rarity: 'uncommon',
    category: 'buildings',
    description: 'Upgrade: +wood output per round from Carpenter workshop buildings.',
    playablePhase: 'build',
    effectKey: 'upgrade_carpenter',
  },
  upgrade_mess_hall_plus: {
    id: 'upgrade_mess_hall_plus',
    name: 'Mess Hall+',
    rarity: 'uncommon',
    category: 'buildings',
    description: 'Upgrade: +food output per round from Mess Hall buildings.',
    playablePhase: 'build',
    effectKey: 'upgrade_mess_hall',
  },
  // -------------------------------------------------------------------------
  // Terrain — Moat (full moat by rarity), land bridges, earthworks, raised ground
  // -------------------------------------------------------------------------
  terrain_moat_common: {
    id: 'terrain_moat_common',
    name: 'Small Ditch',
    rarity: 'common',
    category: 'terrain',
    description: 'Build out 4 moat segments. Unused segments stay for later—draw again to use the rest.',
    playablePhase: 'build',
    foodCost: 10,
    effectKey: 'moat',
    buildBlocks: 4,
  },
  terrain_moat_unique: {
    id: 'terrain_moat_unique',
    name: 'Full Moat',
    rarity: 'unique',
    category: 'terrain',
    description: 'Build out 7 moat segments. Unused segments stay for later—draw again to use the rest.',
    playablePhase: 'build',
    foodCost: 18,
    effectKey: 'moat',
    buildBlocks: 7,
  },
  terrain_moat_rare: {
    id: 'terrain_moat_rare',
    name: 'Full Moat',
    rarity: 'rare',
    category: 'terrain',
    description: 'Build out 10 moat segments. Unused segments stay for later—draw again to use the rest.',
    playablePhase: 'build',
    foodCost: 25,
    effectKey: 'moat',
    buildBlocks: 10,
  },
  // Moat Network — separate from Full Moat (common/unique/rare). When implemented:
  // creates a moat directly outside the walls (auto-place moat ring around fort).
  terrain_moat_network: {
    id: 'terrain_moat_network',
    name: 'Moat Network',
    rarity: 'rare',
    category: 'terrain',
    description: 'Create a moat directly outside the walls.',
    playablePhase: 'build',
    effectKey: 'moat_network',
  },
  terrain_land_bridge: {
    id: 'terrain_land_bridge',
    name: 'Land Bridge',
    rarity: 'common',
    category: 'terrain',
    description: 'Place a narrow land bridge across water or moat. Control the crossing.',
    playablePhase: 'build',
    effectKey: 'land',
  },
  terrain_causeway: {
    id: 'terrain_causeway',
    name: 'Causeway',
    rarity: 'rare',
    category: 'terrain',
    description: 'Raised causeway across wet ground. Single chokepoint for defenders to hold.',
    playablePhase: 'build',
    effectKey: 'land',
  },
  // -------------------------------------------------------------------------
  // Walls — unlock stronger wall variants (design-only for now)
  // -------------------------------------------------------------------------
  wall_stone_standard: {
    id: 'wall_stone_standard',
    name: 'Stone Wall',
    rarity: 'common',
    category: 'terrain',
    description: 'Standard defensive stone wall. Unlocks construction of stone walls instead of wooden palisades.',
    playablePhase: 'build',
    effectKey: 'stone_wall',
  },
  wall_reinforced: {
    id: 'wall_reinforced',
    name: 'Reinforced Wall',
    rarity: 'uncommon',
    category: 'terrain',
    description: 'Upgraded stone wall with higher durability. When implemented, this will further improve wall HP/defense.',
    playablePhase: 'build',
    effectKey: 'reinforced_wall',
  },
  terrain_earthworks: {
    id: 'terrain_earthworks',
    name: 'Earthworks',
    rarity: 'common',
    category: 'terrain',
    description: 'Raise earthen berms to block line of advance and shelter defenders.',
    playablePhase: 'build',
  },
  terrain_glacis: {
    id: 'terrain_glacis',
    name: 'Glacis',
    rarity: 'unique',
    category: 'terrain',
    description: 'Sloped earthwork before walls. Exposes attackers to fire and slows assault.',
    playablePhase: 'build',
  },
  terrain_raised_ground: {
    id: 'terrain_raised_ground',
    name: 'Raised Ground',
    rarity: 'common',
    category: 'terrain',
    description: 'Raise a patch of ground for better sight lines or to deny cover.',
    playablePhase: 'build',
    effectKey: 'land',
  },
  terrain_rampart_mound: {
    id: 'terrain_rampart_mound',
    name: 'Rampart Mound',
    rarity: 'rare',
    category: 'terrain',
    description: 'Substantial raised mound behind the line. Command position and fallback height.',
    playablePhase: 'build',
  },
  // -------------------------------------------------------------------------
  // Defense phase — tactical (playable during defense/siege)
  // -------------------------------------------------------------------------
  defense_boiling_oil: {
    id: 'defense_boiling_oil',
    name: 'Boiling Oil',
    rarity: 'uncommon',
    category: 'tactical',
    description: 'One-time area burn at wall base.',
    playablePhase: 'defense',
    effectKey: 'boiling_oil_one_time',
  },
  defense_oil_cauldron: {
    id: 'defense_oil_cauldron',
    name: 'Oil Cauldron',
    rarity: 'rare',
    category: 'tactical',
    description: 'Recharges each round.',
    playablePhase: 'defense',
    effectKey: 'oil_cauldron_recharge',
  },
};

export function getCardsByRarity(rarity: CardRarity): CardDefinition[] {
  return Object.values(CARD_DEFINITIONS).filter((c) => c.rarity === rarity);
}

export function getCardsByCategory(category: CardCategory): CardDefinition[] {
  return Object.values(CARD_DEFINITIONS).filter((c) => c.category === category);
}

/** Returns cards that can be played during the given phase (build round or defense round). */
export function getCardsPlayableInPhase(phase: CardPlayPhase): CardDefinition[] {
  return Object.values(CARD_DEFINITIONS).filter((c) => c.playablePhase === phase);
}
