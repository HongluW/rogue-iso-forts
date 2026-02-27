/**
 * IsoForts Round-Based Phase System
 * Defines game phases and their flow within each round.
 */

// =============================================================================
// GAME PHASES
// =============================================================================

export type GamePhase =
  | 'name_entry'  // New game only: player names their fort before first card draw
  | 'card_draw'   // Draw cards at start of round
  | 'build'       // ~3 min to build/fortify
  | 'defense'     // Siege / enemy attack
  | 'repair'      // Option to repair damaged structures
  | 'round_end';  // Brief transition before next round

export const PHASE_ORDER: GamePhase[] = ['name_entry', 'card_draw', 'build', 'defense', 'repair', 'round_end'];

// =============================================================================
// PHASE DURATIONS (ms)
// =============================================================================

export const BUILD_PHASE_DURATION_MS = 3 * 60 * 1000; // 3 minutes
export const CARD_DRAW_DURATION_MS = 15 * 1000;       // 15 sec placeholder (manual advance for now)
export const DEFENSE_PHASE_DURATION_MS = 30 * 1000;   // 30 sec placeholder for siege
export const REPAIR_PHASE_DURATION_MS = 60 * 1000;   // 1 min to repair (or manual advance)
export const ROUND_END_DURATION_MS = 5 * 1000;        // 5 sec transition

// =============================================================================
// REPAIR COSTS (placeholder)
// =============================================================================

export const REPAIR_COST_WOOD = 2;
export const REPAIR_COST_STONE = 2;
