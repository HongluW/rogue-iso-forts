'use client';

import React, { createContext, useCallback, useContext, useEffect, useState, useRef } from 'react';
import {
  GameState,
  Tool,
  Tile,
  BuildingType,
  FortStats,
  TOOL_INFO,
  GridPosition,
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

const SPEED_TICK_INTERVALS = [0, 500, 300, 200] as const;

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
  placeMultipleTiles: (tiles: GridPosition[]) => void;
  newGame: (name?: string, size?: number) => void;
  hasExistingGame: boolean;
  isStateReady: boolean;
  isSaving: boolean;
  addMoney: (amount: number) => void;
  freeBuilderMode: boolean;
  toggleFreeBuilder: () => void;
};

const FortsContext = createContext<FortsContextValue | null>(null);

export function useForts() {
  const context = useContext(FortsContext);
  if (!context) throw new Error('useForts must be used within FortsProvider');
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
  const [freeBuilderMode, setFreeBuilderMode] = useState(false);
  const latestStateRef = useRef<GameState>(state);
  const saveInProgressRef = useRef(false);

  useEffect(() => { latestStateRef.current = state; }, [state]);

  const persistFortsSaveAsync = useCallback(async (stateToSave: GameState): Promise<boolean> => {
    if (saveInProgressRef.current) return false;
    saveInProgressRef.current = true;
    setIsSaving(true);
    try {
      const [autosaveOk, fortOk] = await Promise.all([
        saveFortsStateToStorageAsync(FORTS_AUTOSAVE_KEY, stateToSave),
        saveFortsStateToStorageAsync(`${FORTS_SAVED_FORT_PREFIX}${stateToSave.id}`, stateToSave),
      ]);
      if (!autosaveOk && !fortOk) { saveInProgressRef.current = false; setIsSaving(false); return false; }
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

  const persistFortsSave = useCallback((stateToSave: GameState): boolean => {
    const autosaveOk = saveFortsStateToStorage(FORTS_AUTOSAVE_KEY, stateToSave);
    const fortOk = saveFortsStateToStorage(`${FORTS_SAVED_FORT_PREFIX}${stateToSave.id}`, stateToSave);
    if (!autosaveOk && !fortOk) return false;
    const meta = buildSavedFortMeta(stateToSave);
    const updatedIndex = upsertSavedFortMeta(meta, readSavedFortsIndex());
    writeSavedFortsIndex(updatedIndex);
    return true;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (startFresh) { setIsStateReady(true); return; }
    try {
      const preferredKey = loadFortId ? `${FORTS_SAVED_FORT_PREFIX}${loadFortId}` : FORTS_AUTOSAVE_KEY;
      let parsed = loadFortsStateFromStorage(preferredKey);
      if (!parsed && loadFortId) parsed = loadFortsStateFromStorage(FORTS_AUTOSAVE_KEY);
      if (parsed && parsed.grid && parsed.gridSize) { setState(parsed); setHasSavedGame(true); persistFortsSave(parsed); }
    } catch (e) { console.error('Failed to load forts game state:', e); }
    setIsStateReady(true);
  }, [startFresh, loadFortId, persistFortsSave]);

  useEffect(() => {
    if (!isStateReady) return;
    const saveInterval = setInterval(() => {
      persistFortsSaveAsync(latestStateRef.current).catch(e => console.error('Failed to auto-save:', e));
    }, 30000);
    return () => clearInterval(saveInterval);
  }, [isStateReady, persistFortsSaveAsync]);

  useEffect(() => {
    if (!isStateReady || state.speed === 0) return;
    const tickInterval = SPEED_TICK_INTERVALS[state.speed];
    const interval = setInterval(() => {
      setState(prev => { const newState = simulateTick(prev); latestStateRef.current = newState; return newState; });
    }, tickInterval);
    return () => clearInterval(interval);
  }, [isStateReady, state.speed]);

  const setTool = useCallback((tool: Tool) => { setState(prev => ({ ...prev, selectedTool: tool })); }, []);
  const setSpeed = useCallback((speed: 0 | 1 | 2 | 3) => { setState(prev => ({ ...prev, speed })); }, []);
  const setActivePanel = useCallback((panel: GameState['activePanel']) => { setState(prev => ({ ...prev, activePanel: panel })); }, []);

  const placeAtTile = useCallback((x: number, y: number) => {
    setState(prev => {
      const newGrid = new Map<string, Tile>();
      for (const [key, tile] of prev.grid.entries()) {
        newGrid.set(key, { ...tile, building: { ...tile.building } });
      }
      const tool = prev.selectedTool;
      const key = `${x},${y}`;
      const toolInfo = TOOL_INFO[tool];
      const cost = toolInfo?.cost || 0;
      if (!freeBuilderMode && cost > 0 && prev.stats.money < cost) return prev;

      if (tool === 'bulldoze') {
        if (bulldozeTile(newGrid, prev.gridSize, x, y)) {
          const stats = calculateFortStats(newGrid, prev.gridSize);
          return { ...prev, grid: newGrid, stats: { ...prev.stats, ...stats } };
        }
      } else if (tool === 'bulldoze_all' && freeBuilderMode) {
        for (const [k, tile] of newGrid.entries()) {
          if (tile.zone === 'start') continue;
          const t = newGrid.get(k)!;
          t.building = { type: 'grass', constructionProgress: 100, powered: false, watered: false };
          t.zone = 'none';
        }
        const stats = calculateFortStats(newGrid, prev.gridSize);
        return { ...prev, grid: newGrid, stats: { ...prev.stats, ...stats } };
      } else if (tool === 'zone_moat') {
        const tile = newGrid.get(key);
        if (tile) {
          tile.building = { type: 'moat', constructionProgress: 100, powered: false, watered: false };
          tile.zone = 'moat';
          const stats = calculateFortStats(newGrid, prev.gridSize);
          return { ...prev, grid: newGrid, stats: { ...prev.stats, ...stats, money: freeBuilderMode ? prev.stats.money : Math.max(0, prev.stats.money - cost) } };
        }
      } else if (tool === 'zone_land') {
        const tile = newGrid.get(key);
        if (tile) {
          tile.building = { type: 'grass', constructionProgress: 100, powered: false, watered: false };
          tile.zone = 'land';
          const stats = calculateFortStats(newGrid, prev.gridSize);
          return { ...prev, grid: newGrid, stats: { ...prev.stats, ...stats, money: freeBuilderMode ? prev.stats.money : Math.max(0, prev.stats.money - cost) } };
        }
      } else if (tool === 'zone_wall') {
        const tile = newGrid.get(key);
        if (tile) {
          tile.zone = 'wall';
          const stats = calculateFortStats(newGrid, prev.gridSize);
          return { ...prev, grid: newGrid, stats: { ...prev.stats, ...stats, money: freeBuilderMode ? prev.stats.money : Math.max(0, prev.stats.money - cost) } };
        }
      } else if (
        tool === 'build_tower' || tool === 'build_barbican' || tool === 'build_gate' || tool === 'build_bridge' ||
        tool === 'build_machicolations' || tool === 'build_balistraria' || tool === 'build_crossbow_slit' || tool === 'build_longbow_slit'
      ) {
        const buildingType =
          tool === 'build_tower' ? 'tower' : tool === 'build_barbican' ? 'barbican' : tool === 'build_gate' ? 'gate' : tool === 'build_bridge' ? 'bridge'
          : tool === 'build_machicolations' ? 'machicolations' : tool === 'build_balistraria' ? 'balistraria' : tool === 'build_crossbow_slit' ? 'crossbow_slit' : 'longbow_slit';
        if (tool === 'build_tower') {
          const tile = newGrid.get(key);
          if (!tile || tile.zone !== 'wall') return prev;
          const neighbors = [{ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 }];
          for (const n of neighbors) {
            if (n.x < 0 || n.x >= prev.gridSize || n.y < 0 || n.y >= prev.gridSize) continue;
            const t = newGrid.get(`${n.x},${n.y}`);
            if (t?.building?.type === 'tower') return prev;
          }
        }
        if (tool === 'build_gate') {
          const tile = newGrid.get(key);
          if (!tile || tile.zone !== 'wall') return prev;
          if (tile.building.type === 'tower') {
            tile.building = { type: 'gatehouse', constructionProgress: 100, powered: false, watered: false };
            const stats = calculateFortStats(newGrid, prev.gridSize);
            return { ...prev, grid: newGrid, stats: { ...prev.stats, ...stats, money: freeBuilderMode ? prev.stats.money : Math.max(0, prev.stats.money - cost) } };
          }
        }
        if (tool === 'build_bridge') {
          const tile = newGrid.get(key);
          if (!tile || tile.building.type !== 'moat') return prev;
          tile.building = { type: 'bridge', constructionProgress: 100, powered: false, watered: false };
          const stats = calculateFortStats(newGrid, prev.gridSize);
          return { ...prev, grid: newGrid, stats: { ...prev.stats, ...stats, money: freeBuilderMode ? prev.stats.money : Math.max(0, prev.stats.money - cost) } };
        }
        if (tool === 'build_machicolations' || tool === 'build_balistraria' || tool === 'build_crossbow_slit' || tool === 'build_longbow_slit') {
          const tile = newGrid.get(key);
          if (!tile || tile.zone !== 'wall') return prev;
        }
        if (placeBuilding(newGrid, prev.gridSize, x, y, buildingType)) {
          const stats = calculateFortStats(newGrid, prev.gridSize);
          return { ...prev, grid: newGrid, stats: { ...prev.stats, ...stats, money: freeBuilderMode ? prev.stats.money : Math.max(0, prev.stats.money - cost) } };
        }
      }
      return prev;
    });
  }, [freeBuilderMode]);

  const placeMultipleTiles = useCallback((tiles: GridPosition[]) => {
    if (tiles.length === 0) return;
    setState(prev => {
      const tool = prev.selectedTool;
      const toolInfo = TOOL_INFO[tool];
      const costPerTile = toolInfo?.cost || 0;
      const totalCost = costPerTile * tiles.length;
      if (!freeBuilderMode && totalCost > 0 && prev.stats.money < totalCost) return prev;

      const newGrid = new Map<string, Tile>();
      for (const [key, tile] of prev.grid.entries()) {
        newGrid.set(key, { ...tile, building: { ...tile.building } });
      }
      let changed = false;

      for (const pos of tiles) {
        const key = `${pos.x},${pos.y}`;
        if (tool === 'bulldoze') {
          if (bulldozeTile(newGrid, prev.gridSize, pos.x, pos.y)) changed = true;
        } else if (tool === 'zone_moat') {
          const tile = newGrid.get(key);
          if (tile) { tile.building = { type: 'moat', constructionProgress: 100, powered: false, watered: false }; tile.zone = 'moat'; changed = true; }
        } else if (tool === 'zone_land') {
          const tile = newGrid.get(key);
          if (tile) { tile.building = { type: 'grass', constructionProgress: 100, powered: false, watered: false }; tile.zone = 'land'; changed = true; }
        } else if (tool === 'zone_wall') {
          const tile = newGrid.get(key);
          if (tile) { tile.zone = 'wall'; changed = true; }
        }
      }

      if (!changed) return prev;
      const stats = calculateFortStats(newGrid, prev.gridSize);
      return { ...prev, grid: newGrid, stats: { ...prev.stats, ...stats, money: freeBuilderMode ? prev.stats.money : Math.max(0, prev.stats.money - totalCost) } };
    });
  }, [freeBuilderMode]);

  const newGame = useCallback((name?: string, size?: number) => {
    const newState = createInitialGameState(name, size);
    setState(newState);
    latestStateRef.current = newState;
    setHasSavedGame(false);
  }, []);

  const addMoney = useCallback((amount: number) => {
    setState(prev => ({ ...prev, stats: { ...prev.stats, money: prev.stats.money + amount } }));
  }, []);

  const toggleFreeBuilder = useCallback(() => {
    setFreeBuilderMode(prev => {
      const newMode = !prev;
      if (newMode) setState(prevState => ({ ...prevState, stats: { ...prevState.stats, money: 999999 } }));
      return newMode;
    });
  }, []);

  const value: FortsContextValue = {
    state, latestStateRef, setTool, setSpeed, setActivePanel, placeAtTile, placeMultipleTiles,
    newGame, hasExistingGame: hasSavedGame, isStateReady, isSaving, addMoney, freeBuilderMode, toggleFreeBuilder,
  };

  return <FortsContext.Provider value={value}>{children}</FortsContext.Provider>;
}
