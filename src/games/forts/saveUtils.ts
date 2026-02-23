import { compressToUTF16, decompressFromUTF16 } from 'lz-string';
import { GameState } from './types';
import { serializeAndCompressAsync } from '@/lib/saveWorkerManager';

export type SavedFortMeta = {
  id: string;
  fortName: string;
  population: number;
  defense: number;
  money: number;
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
    population: state.stats.population,
    defense: state.stats.defense,
    money: state.stats.money,
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
      return parsed as GameState;
    }
  } catch {
    return null;
  }
  return null;
}

export function saveFortsStateToStorage(key: string, state: GameState): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const compressed = compressToUTF16(JSON.stringify(state));
    localStorage.setItem(key, compressed);
    return true;
  } catch {
    return false;
  }
}

export async function saveFortsStateToStorageAsync(key: string, state: GameState): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const compressed = await serializeAndCompressAsync(state);
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
