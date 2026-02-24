'use client';

import React, { createContext, useCallback, useContext, useEffect, useState, useRef } from 'react';
import {
  GameState,
  Tool,
  Tile,
  BuildingType,
  FortStats,
  TOOL_INFO,
} from '@/games/forts/types';
import {
  createInitialGameState,
  placeBuilding,
  bulldozeTile,
  simulateTick,
  calculateFortStats,
} from '@/games/forts/lib/simulation';
import {
  FORTS_AUTOSAVE_KEY,
  FORTS_SAVED_FORT_PREFIX,
  buildSavedFortMeta,
  loadFortsStateFromStorage,
  readSavedFortsIndex,
  saveFortsStateToStorage,
  saveFortsStateToStorageAsync,
  upsertSavedFortMeta,
  writeSavedFortsIndex,
} from '@/games/forts/saveUtils';

// =============================================================================
// CONSTANTS
// =============================================================================

const SPEED_TICK_INTERVALS = [0, 500, 300, 200] as const; // ms per tick for 0x-3x

// =============================================================================
// CONTEXT TYPE
// =============================================================================

type FortsContextValue = {
  state: GameState;
  latestStateRef: React.RefObject<GameState>;
  setTool: (tool: Tool) => void;
  setSpeed: (speed: 0 | 1 | 2 | 3) => void;
  setActivePanel: (panel: GameState['activePanel']) => void;
  placeAtTile: (x: number, y: number) => void;
  newGame: (name?: string, size?: number) => void;
  hasExistingGame: boolean;
  isStateReady: boolean;
  isSaving: boolean;
  addMoney: (amount: number) => void;
};

const FortsContext = createContext<FortsContextValue | null>(null);

export function useForts() {
  const context = useContext(FortsContext);
  if (!context) {
    throw new Error('useForts must be used within FortsProvider');
  }
  return context;
}

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

export function FortsProvider({
  children,
  startFresh = false,
  loadFortId = null,
}: {
  children: React.ReactNode;
  startFresh?: boolean;
  loadFortId?: string | null;
}) {
  const [state, setState] = useState<GameState>(() => createInitialGameState());
  const [isStateReady, setIsStateReady] = useState(false);
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const latestStateRef = useRef<GameState>(state);
  const saveInProgressRef = useRef(false);
  
  // Keep ref in sync
  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);
  
  // Async save function
  const persistFortsSaveAsync = useCallback(async (stateToSave: GameState): Promise<boolean> => {
    if (saveInProgressRef.current) return false;
    saveInProgressRef.current = true;
    setIsSaving(true);
    
    try {
      const [autosaveOk, fortOk] = await Promise.all([
        saveFortsStateToStorageAsync(FORTS_AUTOSAVE_KEY, stateToSave),
        saveFortsStateToStorageAsync(`${FORTS_SAVED_FORT_PREFIX}${stateToSave.id}`, stateToSave),
      ]);
      if (!autosaveOk && !fortOk) {
        saveInProgressRef.current = false;
        setIsSaving(false);
        return false;
      }

      const meta = buildSavedFortMeta(stateToSave);
      const updatedIndex = upsertSavedFortMeta(meta, readSavedFortsIndex());
      writeSavedFortsIndex(updatedIndex);
      saveInProgressRef.current = false;
      setIsSaving(false);
      return true;
    } catch (e) {
      console.error('Failed to persist forts save:', e);
      saveInProgressRef.current = false;
      setIsSaving(false);
      return false;
    }
  }, []);
  
  // Sync save function
  const persistFortsSave = useCallback((stateToSave: GameState): boolean => {
    const autosaveOk = saveFortsStateToStorage(FORTS_AUTOSAVE_KEY, stateToSave);
    const fortOk = saveFortsStateToStorage(`${FORTS_SAVED_FORT_PREFIX}${stateToSave.id}`, stateToSave);
    if (!autosaveOk && !fortOk) return false;

    const meta = buildSavedFortMeta(stateToSave);
    const updatedIndex = upsertSavedFortMeta(meta, readSavedFortsIndex());
    writeSavedFortsIndex(updatedIndex);
    return true;
  }, []);

  // Load saved game on mount
  useEffect(() => {
    const checkSaved = () => {
      if (typeof window === 'undefined') return;
      
      if (startFresh) {
        setIsStateReady(true);
        return;
      }
      
      try {
        const preferredKey = loadFortId
          ? `${FORTS_SAVED_FORT_PREFIX}${loadFortId}`
          : FORTS_AUTOSAVE_KEY;
        let parsed = loadFortsStateFromStorage(preferredKey);

        if (!parsed && loadFortId) {
          parsed = loadFortsStateFromStorage(FORTS_AUTOSAVE_KEY);
        }

        if (parsed && parsed.grid && parsed.gridSize) {
          setState(parsed);
          setHasSavedGame(true);
          persistFortsSave(parsed);
        }
      } catch (e) {
        console.error('Failed to load forts game state:', e);
      }
      
      setIsStateReady(true);
    };
    
    checkSaved();
  }, [startFresh, loadFortId, persistFortsSave]);
  
  // Auto-save periodically
  useEffect(() => {
    if (!isStateReady) return;
    
    const saveInterval = setInterval(() => {
      persistFortsSaveAsync(latestStateRef.current).catch((e) => {
        console.error('Failed to auto-save:', e);
      });
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(saveInterval);
  }, [isStateReady, persistFortsSaveAsync]);
  
  // Simulation tick
  useEffect(() => {
    if (!isStateReady || state.speed === 0) return;
    
    const tickInterval = SPEED_TICK_INTERVALS[state.speed];
    
    const interval = setInterval(() => {
      setState(prev => {
        const newState = simulateTick(prev);
        latestStateRef.current = newState;
        return newState;
      });
    }, tickInterval);
    
    return () => clearInterval(interval);
  }, [isStateReady, state.speed]);
  
  const setTool = useCallback((tool: Tool) => {
    setState(prev => ({ ...prev, selectedTool: tool }));
  }, []);
  
  const setSpeed = useCallback((speed: 0 | 1 | 2 | 3) => {
    setState(prev => ({ ...prev, speed }));
  }, []);
  
  const setActivePanel = useCallback((panel: GameState['activePanel']) => {
    setState(prev => ({ ...prev, activePanel: panel }));
  }, []);
  
  const placeAtTile = useCallback((q: number, r: number) => {
    setState(prev => {
      // Create new grid map
      const newGrid = new Map<string, Tile>();
      for (const [key, tile] of prev.grid.entries()) {
        newGrid.set(key, { ...tile, building: { ...tile.building } });
      }
      
      const tool = prev.selectedTool;
      const key = `${q},${r}`;
      
      if (tool === 'bulldoze') {
        if (bulldozeTile(newGrid, prev.gridSize, q, r)) {
          const stats = calculateFortStats(newGrid, prev.gridSize);
          return {
            ...prev,
            grid: newGrid,
            stats: { ...prev.stats, ...stats },
          };
        }
      } else if (tool === 'zone_water') {
        // Place water
        const tile = newGrid.get(key);
        if (tile) {
          tile.building = {
            type: 'water',
            constructionProgress: 100,
            powered: false,
            watered: false,
          };
          tile.zone = 'water';
          const stats = calculateFortStats(newGrid, prev.gridSize);
          return {
            ...prev,
            grid: newGrid,
            stats: { ...prev.stats, ...stats },
          };
        }
      } else if (tool === 'zone_land') {
        // Place grass/land
        const tile = newGrid.get(key);
        if (tile) {
          tile.building = {
            type: 'grass',
            constructionProgress: 100,
            powered: false,
            watered: false,
          };
          tile.zone = 'land';
          const stats = calculateFortStats(newGrid, prev.gridSize);
          return {
            ...prev,
            grid: newGrid,
            stats: { ...prev.stats, ...stats },
          };
        }
      }
      
      return prev;
    });
  }, []);
  
  const newGame = useCallback((name?: string, size?: number) => {
    const newState = createInitialGameState(name, size);
    setState(newState);
    latestStateRef.current = newState;
    setHasSavedGame(false);
  }, []);
  
  const addMoney = useCallback((amount: number) => {
    setState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        money: prev.stats.money + amount,
      },
    }));
  }, []);
  
  const value: FortsContextValue = {
    state,
    latestStateRef,
    setTool,
    setSpeed,
    setActivePanel,
    placeAtTile,
    newGame,
    hasExistingGame: hasSavedGame,
    isStateReady,
    isSaving,
    addMoney,
  };
  
  return <FortsContext.Provider value={value}>{children}</FortsContext.Provider>;
}
