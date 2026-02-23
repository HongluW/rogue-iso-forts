/**
 * Forts Render Configuration
 * Sprite system configuration for forts game
 */

import { getSpritePack, DEFAULT_SPRITE_PACK_ID, SpritePack } from '@/lib/renderConfig';
import { BuildingType } from '../types';

// Map building types to sprite keys
// Currently minimal - only base tiles that don't need sprites
export const FORT_BUILDING_TO_SPRITE: Partial<Record<BuildingType, string>> = {
  // Base tiles don't need sprites - they're drawn as colored diamonds
};

export function getFortsSpritePack(): SpritePack {
  return getSpritePack(DEFAULT_SPRITE_PACK_ID);
}

export function getFortsBuildingSprite(buildingType: BuildingType): string | null {
  return FORT_BUILDING_TO_SPRITE[buildingType] || null;
}
