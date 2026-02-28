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

export const CARD_DEFINITIONS: Record<CardId, CardDefinition> = {};

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
