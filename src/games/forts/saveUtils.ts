import { compressToUTF16, decompressFromUTF16 } from 'lz-string';
import { GameState, Tile } from './types';
import { serializeAndCompressAsync } from '@/lib/saveWorkerManager';

export type SavedFortMeta = {
  id: string;
  fortName: string;
  defense: number;
  wood: number;
  stone: number;
  food: number;
  year: number;
  month: number;
  gridSize: number;
  savedAt: number;
  roomCode?: string;
};

export const FORTS_AUTOSAVE_KEY = 'forts-state';
export const FORTS_SAVED_FORTS_INDEX_KEY = 'forts-saved-forts-index';
export const FORTS_SAVED_FORT_PREFIX = 'forts-fort-';

export function buildSavedFortMeta(state: GameState, savedAt: number = Date.now(), roomCode?: string): SavedFortMeta {
  return {
    id: state.id,
    fortName: state.fortName || 'Unnamed Fort',
    defense: state.stats.defense,
    wood: state.stats.wood,
    stone: state.stats.stone,
    food: state.stats.food,
    year: state.year,
    month: state.month,
    gridSize: state.gridSize,
    savedAt,
    roomCode,
  };
}

export function readSavedFortsIndex(): SavedFortMeta[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(FORTS_SAVED_FORTS_INDEX_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as SavedFortMeta[]) : [];
  } catch {
    return [];
  }
}

export function writeSavedFortsIndex(forts: SavedFortMeta[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FORTS_SAVED_FORTS_INDEX_KEY, JSON.stringify(forts));
  } catch {
    // Ignore storage failures (quota, privacy mode, etc.)
  }
}

export function saveFortToIndex(state: GameState, roomCode?: string, savedAt: number = Date.now()): void {
  if (typeof window === 'undefined') return;
  try {
    const meta = buildSavedFortMeta(state, savedAt, roomCode);
    const updated = upsertSavedFortMeta(meta, readSavedFortsIndex());
    writeSavedFortsIndex(updated);
  } catch (e) {
    console.error('Failed to save fort to index:', e);
  }
}

export function upsertSavedFortMeta(meta: SavedFortMeta, forts?: SavedFortMeta[]): SavedFortMeta[] {
  const list = forts ? [...forts] : readSavedFortsIndex();
  const existingIndex = list.findIndex((fort) => fort.id === meta.id || (meta.roomCode && fort.roomCode === meta.roomCode));
  if (existingIndex >= 0) {
    const existing = list[existingIndex];
    list[existingIndex] = {
      ...meta,
      roomCode: meta.roomCode ?? existing.roomCode,
    };
  } else {
    list.push(meta);
  }
  list.sort((a, b) => b.savedAt - a.savedAt);
  return list;
}

export function removeSavedFortMeta(id: string, forts?: SavedFortMeta[]): SavedFortMeta[] {
  const list = forts ? [...forts] : readSavedFortsIndex();
  return list.filter((fort) => fort.id !== id);
}

// Convert Map to serializable format
function gridMapToArray(grid: Map<string, Tile>): Array<[string, Tile]> {
  return Array.from(grid.entries());
}

// Convert serialized format back to Map
function gridArrayToMap(gridArray: Array<[string, Tile]> | Tile[][] | Map<string, Tile>): Map<string, Tile> {
  // Handle new hex grid format (array of [key, tile] pairs)
  if (Array.isArray(gridArray) && gridArray.length > 0) {
    if (Array.isArray(gridArray[0]) && gridArray[0].length === 2 && typeof gridArray[0][0] === 'string') {
      // New format: Array<[string, Tile]>
      return new Map(gridArray as Array<[string, Tile]>);
    }
    // Old format: Tile[][] - migrate to hex grid
    // This is a legacy format, create empty hex grid
    const newGrid = new Map<string, Tile>();
    // For migration, we'll create a basic hex grid
    // In practice, old saves would need more sophisticated migration
    return newGrid;
  }
  // Already a Map
  if (gridArray instanceof Map) {
    return gridArray;
  }
  return new Map<string, Tile>();
}

export function loadFortsStateFromStorage(key: string): GameState | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return null;
    let jsonString = decompressFromUTF16(saved);
    if (!jsonString || !jsonString.startsWith('{')) {
      if (saved.startsWith('{')) {
        jsonString = saved;
      } else {
        return null;
      }
    }
    const parsed = JSON.parse(jsonString);
    if (parsed?.grid && parsed?.gridSize) {
      // Convert grid array back to Map
      const grid = gridArrayToMap(parsed.grid);
      // Migrate old saves: money -> wood, stone, food
      const stats = parsed.stats ?? {};
      if (stats.money !== undefined && stats.wood === undefined) {
        stats.wood = 100;
        stats.stone = 100;
        stats.food = 100;
        delete stats.money;
        delete stats.income;
        delete stats.expenses;
      }
      return {
        ...parsed,
        grid,
        stats: { ...parsed.stats, ...stats },
      } as GameState;
    }
  } catch {
    return null;
  }
  return null;
}

export function saveFortsStateToStorage(key: string, state: GameState): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // Convert Map to serializable format
    const serializableState = {
      ...state,
      grid: gridMapToArray(state.grid),
    };
    const compressed = compressToUTF16(JSON.stringify(serializableState));
    localStorage.setItem(key, compressed);
    return true;
  } catch {
    return false;
  }
}

export async function saveFortsStateToStorageAsync(key: string, state: GameState): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    // Convert Map to serializable format before serialization
    const serializableState = {
      ...state,
      grid: gridMapToArray(state.grid),
    };
    const compressed = await serializeAndCompressAsync(serializableState);
    localStorage.setItem(key, compressed);
    return true;
  } catch {
    return false;
  }
}

export function deleteFortsStateFromStorage(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage failures
  }
}
