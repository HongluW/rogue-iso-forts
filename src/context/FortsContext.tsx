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
  CardId,
  DEFAULT_RESOURCE_CAP,
} from '@/games/forts/types';
import {
  createInitialGameState,
  placeBuilding,
  placeUndergroundBuilding,
  bulldozeTile,
  calculateFortStats,
  runSiegeDamage,
  repairTile as repairTileSim,
} from '@/games/forts/lib/simulation';
import { getFortBuildableKeys } from '@/games/forts/lib/fortBoundary';
import { CARD_DEFINITIONS } from '@/games/forts/types/cards';
import { BUILDING_STATS } from '@/games/forts/types/buildings';
import {
  BUILD_PHASE_DURATION_MS,
  ROUND_END_DURATION_MS,
  REPAIR_COST_WOOD,
  REPAIR_COST_STONE,
} from '@/games/forts/types/phases';
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
// CONTEXT TYPE
// =============================================================================

type FortsContextValue = {
  state: GameState;
  latestStateRef: React.RefObject<GameState>;
  setTool: (tool: Tool) => void;
  setActivePanel: (panel: GameState['activePanel']) => void;
  placeAtTile: (x: number, y: number) => void;
  placeMultipleTiles: (tiles: GridPosition[]) => void;
  newGame: (name?: string, size?: number) => void;
  hasExistingGame: boolean;
  isStateReady: boolean;
  isSaving: boolean;
  addResources: (amounts: { wood?: number; stone?: number; food?: number }) => void;
  freeBuilderMode: boolean;
  toggleFreeBuilder: () => void;
  activeCardId: CardId | null;
  remainingBuildBlocksFromCard: number | null;
  playMoatCard: (cardId: CardId) => void;
  advanceFromNameEntry: (fortName: string) => void;
  advanceFromCardDraw: () => void;
  advanceFromBuildTimeUp: () => void;
  advanceFromDefenseComplete: () => void;
  advanceFromRepairToNextRound: () => void;
  repairTile: (key: string) => void;
  selectedDamagedKey: string | null;
  setSelectedDamagedKey: (key: string | null) => void;
  showUnderground: boolean;
  setShowUnderground: (show: boolean) => void;
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
  const [selectedDamagedKey, setSelectedDamagedKey] = useState<string | null>(null);
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
      if (parsed && parsed.grid && parsed.gridSize) {
        const toLoad = parsed.phase
          ? parsed
          : { ...parsed, phase: 'build' as const, phaseEndsAt: Date.now() + BUILD_PHASE_DURATION_MS, round: parsed.round ?? 1, damagedTiles: parsed.damagedTiles ?? [] };
        setState(toLoad);
        setHasSavedGame(true);
        persistFortsSave(toLoad);
      }
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

  // Save current state (including phase) when user leaves or hides tab so load restores the correct phase
  useEffect(() => {
    if (typeof window === 'undefined' || !isStateReady) return;
    const saveNow = () => persistFortsSave(latestStateRef.current);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveNow();
    };
    window.addEventListener('pagehide', saveNow);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', saveNow);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isStateReady, persistFortsSave]);

  // Save when leaving the game screen (e.g. exit to fort list) so build phase etc. is restored on re-entry
  useEffect(() => {
    return () => {
      if (isStateReady && latestStateRef.current) {
        persistFortsSave(latestStateRef.current);
      }
    };
  }, [isStateReady, persistFortsSave]);

  // Tools that can place underground (derived from BuildingStats.undergroundAllowed)
  const UNDERGROUND_TOOLS: Tool[] = (
    [
      ['build_stone_mason', 'stone_mason'],
      ['build_carpenter', 'carpenter'],
      ['build_mess_hall', 'mess_hall'],
    ] as const
  )
    .filter(([, type]) => BUILDING_STATS[type]?.undergroundAllowed)
    .map(([t]) => t as Tool);

  const setTool = useCallback((tool: Tool) => {
    setState(prev => {
      const next = {
        ...prev,
        selectedTool: tool,
        // When switching away from terrain tools, clear any active card effects
        ...(tool !== 'zone_moat'
          ? { activeCardId: null, remainingBuildBlocksFromCard: null }
          : {}),
      };
      // Auto-switch to underground view when selecting an underground-allowed building
      if (UNDERGROUND_TOOLS.includes(tool)) {
        return { ...next, showUnderground: true };
      }
      return next;
    });
  }, []);
  const setActivePanel = useCallback((panel: GameState['activePanel']) => { setState(prev => ({ ...prev, activePanel: panel })); }, []);
  const setShowUnderground = useCallback((show: boolean) => {
    setState(prev => ({ ...prev, showUnderground: show }));
  }, []);

  const advanceFromNameEntry = useCallback((fortName: string) => {
    const trimmed = fortName.trim() || 'Unnamed Fort';
    setState(prev => {
      const next = { ...prev, fortName: trimmed, phase: 'card_draw' as const };
      queueMicrotask(() => persistFortsSave(next));
      return next;
    });
  }, [persistFortsSave]);

  const advanceFromCardDraw = useCallback(() => {
    setState(prev => {
      const next: GameState = {
        ...prev,
        phase: 'build',
        phaseEndsAt: Date.now() + BUILD_PHASE_DURATION_MS,
      };
      // Persist immediately so "chosen cards → build phase" is saved before user exits
      queueMicrotask(() => persistFortsSave(next));
      return next;
    });
  }, [persistFortsSave]);

  const advanceFromBuildTimeUp = useCallback(() => {
    setState(prev => ({ ...prev, phase: 'defense' }));
  }, []);

  const advanceFromDefenseComplete = useCallback(() => {
    setState(prev => {
      const { grid, damagedKeys } = runSiegeDamage(prev.grid, prev.gridSize);
      return { ...prev, grid, phase: 'repair', damagedTiles: damagedKeys };
    });
  }, []);

  const advanceFromRepairToNextRound = useCallback(() => {
    setState(prev => ({
      ...prev,
      phase: 'round_end',
      phaseEndsAt: Date.now() + ROUND_END_DURATION_MS,
    }));
    setTimeout(() => {
      setState(s => {
        const wood = s.roundBonusWood ?? 5;
        const stone = s.roundBonusStone ?? 5;
        const food = s.roundBonusFood ?? 5;
        const capW = s.resourceCapWood ?? DEFAULT_RESOURCE_CAP;
        const capS = s.resourceCapStone ?? DEFAULT_RESOURCE_CAP;
        const capF = s.resourceCapFood ?? DEFAULT_RESOURCE_CAP;
        return {
          ...s,
          phase: 'card_draw',
          round: (s.round ?? 1) + 1,
          damagedTiles: [],
          stats: {
            ...s.stats,
            wood: Math.min(s.stats.wood + wood, capW),
            stone: Math.min(s.stats.stone + stone, capS),
            food: Math.min(s.stats.food + food, capF),
          },
        };
      });
    }, ROUND_END_DURATION_MS);
  }, []);

  const repairTile = useCallback((key: string) => {
    setState(prev => {
      if (prev.phase !== 'repair') return prev;
      const woodCost = freeBuilderMode ? 0 : REPAIR_COST_WOOD;
      const stoneCost = freeBuilderMode ? 0 : REPAIR_COST_STONE;
      if (!freeBuilderMode && (prev.stats.wood < woodCost || prev.stats.stone < stoneCost)) return prev;
      const { grid, success } = repairTileSim(prev.grid, key, woodCost, stoneCost);
      if (!success) return prev;
      const stats = calculateFortStats(grid, prev.gridSize);
      const newDamaged = (prev.damagedTiles ?? []).filter(k => k !== key);
      return {
        ...prev,
        grid,
        stats: { ...prev.stats, ...stats, wood: prev.stats.wood - woodCost, stone: prev.stats.stone - stoneCost },
        damagedTiles: newDamaged,
      };
    });
  }, [freeBuilderMode]);

  const placeAtTile = useCallback((x: number, y: number) => {
    const key = `${x},${y}`;
    const prev = latestStateRef.current;
    const phase = prev.phase ?? 'build';
    if (phase === 'repair') {
      const tile = prev.grid.get(key);
      if (tile?.building?.damaged) {
        setSelectedDamagedKey(k => (k === key ? null : key));
        return;
      }
      return;
    }
    if (phase === 'card_draw' || phase === 'defense' || phase === 'round_end') return;
    setState(prev => {
      const newGrid = new Map<string, Tile>();
      for (const [key, tile] of prev.grid.entries()) {
        newGrid.set(key, { ...tile, building: { ...tile.building } });
      }
      const tool = prev.selectedTool;
      const key = `${x},${y}`;
      if (tool === 'bulldoze') {
        if (bulldozeTile(newGrid, prev.gridSize, x, y)) {
          const stats = calculateFortStats(newGrid, prev.gridSize);
          return { ...prev, grid: newGrid, stats: { ...prev.stats, ...stats, wood: prev.stats.wood, stone: prev.stats.stone, food: prev.stats.food } };
        }
      } else if (tool === 'bulldoze_all' && freeBuilderMode) {
        for (const [k, tile] of newGrid.entries()) {
          if (tile.zone === 'start') continue;
          const t = newGrid.get(k)!;
          t.building = { type: 'grass', constructionProgress: 100, powered: false, watered: false };
          t.zone = 'none';
        }
        const stats = calculateFortStats(newGrid, prev.gridSize);
        return { ...prev, grid: newGrid, stats: { ...prev.stats, ...stats, wood: prev.stats.wood, stone: prev.stats.stone, food: prev.stats.food } };
      } else if (tool === 'zone_moat') {
        const tile = newGrid.get(key);
        if (tile) {
          const isStart = tile.zone === 'start';
          const isBuildable = tile.building.type === 'grass' || tile.building.type === 'empty';
          if (isStart || !isBuildable) return prev;

          const hadCardBlocks = prev.remainingBuildBlocksFromCard ?? null;
          if (hadCardBlocks !== null && hadCardBlocks <= 0) {
            return prev;
          }

          tile.building = { type: 'moat', constructionProgress: 100, powered: false, watered: false };
          tile.zone = 'moat';

          let nextActiveCardId = prev.activeCardId ?? null;
          let nextRemainingBlocks = hadCardBlocks;
          if (nextRemainingBlocks !== null) {
            nextRemainingBlocks -= 1;
            if (nextRemainingBlocks <= 0) {
              nextActiveCardId = null;
              nextRemainingBlocks = null;
            }
          }

          const stats = calculateFortStats(newGrid, prev.gridSize);
          return {
            ...prev,
            grid: newGrid,
            stats: { ...prev.stats, ...stats, wood: prev.stats.wood, stone: prev.stats.stone, food: prev.stats.food },
            activeCardId: nextActiveCardId,
            remainingBuildBlocksFromCard: nextRemainingBlocks,
          };
        }
      } else if (tool === 'zone_land') {
        const tile = newGrid.get(key);
        if (tile) {
          tile.building = { type: 'grass', constructionProgress: 100, powered: false, watered: false };
          tile.zone = 'land';
          const stats = calculateFortStats(newGrid, prev.gridSize);
          return { ...prev, grid: newGrid, stats: { ...prev.stats, ...stats, wood: prev.stats.wood, stone: prev.stats.stone, food: prev.stats.food } };
        }
      } else if (tool === 'zone_wall') {
        const tile = newGrid.get(key);
        if (tile) {
          // In normal play, drawing a wall consumes one wall block from the
          // persistent starter pool. In Free Builder mode, walls are unlimited.
          const currentBlocks = prev.wallBlocksAvailable ?? 0;
          const wallType = prev.currentWallType ?? 'palisade';
          if (!freeBuilderMode) {
            if (tile.zone === 'wall') {
              // Already a wall here; no additional cost.
              const stats = calculateFortStats(newGrid, prev.gridSize);
              return {
                ...prev,
                grid: newGrid,
                stats: { ...prev.stats, ...stats, wood: prev.stats.wood, stone: prev.stats.stone, food: prev.stats.food },
              };
            }
            if (currentBlocks <= 0) return prev;
            tile.zone = 'wall';
            tile.wallType = wallType;
            const stats = calculateFortStats(newGrid, prev.gridSize);
            return {
              ...prev,
              grid: newGrid,
              stats: { ...prev.stats, ...stats, wood: prev.stats.wood, stone: prev.stats.stone, food: prev.stats.food },
              wallBlocksAvailable: currentBlocks - 1,
            };
          }
          // Free Builder: do not consume from the pool.
          tile.zone = 'wall';
          tile.wallType = wallType;
          const stats = calculateFortStats(newGrid, prev.gridSize);
          return {
            ...prev,
            grid: newGrid,
            stats: { ...prev.stats, ...stats, wood: prev.stats.wood, stone: prev.stats.stone, food: prev.stats.food },
          };
        }
      } else if (
        tool === 'build_tower' || tool === 'build_barbican' || tool === 'build_gate' || tool === 'build_bridge' ||
        tool === 'build_machicolations' || tool === 'build_balistraria' || tool === 'build_crossbow_slit' || tool === 'build_longbow_slit' ||
        tool === 'build_stone_mason' || tool === 'build_carpenter' || tool === 'build_mess_hall'
      ) {
        const buildingType: BuildingType =
          tool === 'build_tower' ? 'tower' : tool === 'build_barbican' ? 'barbican' : tool === 'build_gate' ? 'gate' : tool === 'build_bridge' ? 'bridge'
          : tool === 'build_machicolations' ? 'machicolations' : tool === 'build_balistraria' ? 'balistraria' : tool === 'build_crossbow_slit' ? 'crossbow_slit' : tool === 'build_longbow_slit' ? 'longbow_slit'
          : tool === 'build_stone_mason' ? 'stone_mason' : tool === 'build_carpenter' ? 'carpenter' : 'mess_hall';
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
            return { ...prev, grid: newGrid, stats: { ...prev.stats, ...stats, wood: prev.stats.wood, stone: prev.stats.stone, food: prev.stats.food } };
          }
        }
        if (tool === 'build_bridge') {
          const tile = newGrid.get(key);
          if (!tile || tile.building.type !== 'moat') return prev;
          tile.building = { type: 'bridge', constructionProgress: 100, powered: false, watered: false };
          const stats = calculateFortStats(newGrid, prev.gridSize);
          return { ...prev, grid: newGrid, stats: { ...prev.stats, ...stats, wood: prev.stats.wood, stone: prev.stats.stone, food: prev.stats.food } };
        }
        if (tool === 'build_machicolations' || tool === 'build_balistraria' || tool === 'build_crossbow_slit' || tool === 'build_longbow_slit') {
          const tile = newGrid.get(key);
          if (!tile || tile.zone !== 'wall') return prev;
        }
        if (tool === 'build_stone_mason' || tool === 'build_carpenter' || tool === 'build_mess_hall') {
          const tile = newGrid.get(key);
          if (!tile) return prev;
          const isUnderground = (prev.showUnderground ?? false) && UNDERGROUND_TOOLS.includes(tool);
          const fortBuildable = getFortBuildableKeys(newGrid, prev.gridSize);
          const keyStr = `${x},${y}`;
          if (isUnderground) {
            // Underground: must be within fort boundary; place in underground layer
            if (!fortBuildable.has(keyStr)) return prev;
            const existing = tile.undergroundBuilding;
            if (existing && existing.type !== 'empty' && existing.type !== 'grass') return prev;
          } else {
            // Surface: existing validation (not start, grass/empty)
            if (tile.zone === 'start') return prev;
            if (tile.building.type !== 'grass' && tile.building.type !== 'empty') return prev;
          }
          const cardId = tool === 'build_stone_mason' ? 'building_stone_mason' : tool === 'build_carpenter' ? 'building_carpenter' : 'building_mess_hall';
          const card = CARD_DEFINITIONS[cardId];
          const woodCost = card?.woodCost ?? 0;
          const stoneCost = card?.stoneCost ?? 0;
          const foodCost = card?.foodCost ?? 0;
          if (!freeBuilderMode && (prev.stats.wood < woodCost || prev.stats.stone < stoneCost || prev.stats.food < foodCost)) return prev;
          const placed = isUnderground
            ? placeUndergroundBuilding(newGrid, prev.gridSize, x, y, buildingType)
            : placeBuilding(newGrid, prev.gridSize, x, y, buildingType);
          if (placed) {
            const stats = calculateFortStats(newGrid, prev.gridSize);
            return {
              ...prev,
              grid: newGrid,
              stats: {
                ...prev.stats,
                ...stats,
                wood: freeBuilderMode ? prev.stats.wood : prev.stats.wood - woodCost,
                stone: freeBuilderMode ? prev.stats.stone : prev.stats.stone - stoneCost,
                food: freeBuilderMode ? prev.stats.food : prev.stats.food - foodCost,
              },
            };
          }
          return prev;
        }
        if (placeBuilding(newGrid, prev.gridSize, x, y, buildingType)) {
          const stats = calculateFortStats(newGrid, prev.gridSize);
          return { ...prev, grid: newGrid, stats: { ...prev.stats, ...stats, wood: prev.stats.wood, stone: prev.stats.stone, food: prev.stats.food } };
        }
      }
      return prev;
    });
  }, [freeBuilderMode]);

  const placeMultipleTiles = useCallback((tiles: GridPosition[]) => {
    if (tiles.length === 0) return;
    setState(prev => {
      const phase = prev.phase ?? 'build';
      if (phase !== 'build') return prev;
      const newGrid = new Map<string, Tile>();
      for (const [key, tile] of prev.grid.entries()) {
        newGrid.set(key, { ...tile, building: { ...tile.building } });
      }
      let changed = false;
      const tool = prev.selectedTool;
      let remainingFromCard = prev.remainingBuildBlocksFromCard ?? null;
      let activeCardId = prev.activeCardId ?? null;
      let wallBlocks = prev.wallBlocksAvailable ?? 0;

      for (const pos of tiles) {
        const key = `${pos.x},${pos.y}`;
        if (tool === 'bulldoze') {
          if (bulldozeTile(newGrid, prev.gridSize, pos.x, pos.y)) changed = true;
        } else if (tool === 'zone_moat') {
          if (remainingFromCard !== null && remainingFromCard <= 0) break;
          const tile = newGrid.get(key);
          if (tile) {
            const isStart = tile.zone === 'start';
            const isBuildable = tile.building.type === 'grass' || tile.building.type === 'empty';
            if (!isStart && isBuildable) {
              tile.building = { type: 'moat', constructionProgress: 100, powered: false, watered: false };
              tile.zone = 'moat';
              changed = true;
              if (remainingFromCard !== null) {
                remainingFromCard -= 1;
                if (remainingFromCard <= 0) {
                  activeCardId = null;
                }
              }
            }
          }
        } else if (tool === 'zone_land') {
          const tile = newGrid.get(key);
          if (tile) { tile.building = { type: 'grass', constructionProgress: 100, powered: false, watered: false }; tile.zone = 'land'; changed = true; }
        } else if (tool === 'zone_wall') {
          const tile = newGrid.get(key);
          if (tile) {
            const wallType = prev.currentWallType ?? 'palisade';
            if (!freeBuilderMode) {
              if (tile.zone === 'wall') {
                // Dragging over an existing wall is free.
                tile.zone = 'wall';
                if (!tile.wallType) tile.wallType = wallType;
                changed = true;
              } else {
                if (wallBlocks <= 0) {
                  // No more wall blocks to place; stop consuming.
                  continue;
                }
                tile.zone = 'wall';
                tile.wallType = wallType;
                wallBlocks -= 1;
                changed = true;
              }
            } else {
              // Free Builder: unlimited walls.
              tile.zone = 'wall';
              tile.wallType = wallType;
              changed = true;
            }
          }
        }
      }

      if (!changed) return prev;
      const stats = calculateFortStats(newGrid, prev.gridSize);
      return {
        ...prev,
        grid: newGrid,
        stats: { ...prev.stats, ...stats, wood: prev.stats.wood, stone: prev.stats.stone, food: prev.stats.food },
        activeCardId,
        remainingBuildBlocksFromCard: remainingFromCard,
        wallBlocksAvailable: freeBuilderMode ? prev.wallBlocksAvailable : wallBlocks,
      };
    });
  }, [freeBuilderMode]);

  const playMoatCard = useCallback((cardId: CardId) => {
    const card = CARD_DEFINITIONS[cardId];
    if (!card || card.effectKey !== 'moat') return;
    const foodCost = card.foodCost ?? 0;

    setState(prev => {
      if (!prev) return prev;

      const sameCardActive =
        prev.activeCardId === card.id &&
        prev.remainingBuildBlocksFromCard != null &&
        prev.remainingBuildBlocksFromCard > 0;

      if (sameCardActive) {
        return { ...prev, selectedTool: 'zone_moat' };
      }

      if (!freeBuilderMode && foodCost > 0 && prev.stats.food < foodCost) {
        return prev;
      }

      return {
        ...prev,
        selectedTool: 'zone_moat',
        stats: {
          ...prev.stats,
          food: freeBuilderMode ? prev.stats.food : prev.stats.food - foodCost,
        },
        activeCardId: card.id,
        remainingBuildBlocksFromCard: card.buildBlocks ?? null,
      };
    });
  }, [freeBuilderMode]);

  const newGame = useCallback((name?: string, size?: number) => {
    const newState = createInitialGameState(name, size);
    setState(newState);
    latestStateRef.current = newState;
    setHasSavedGame(false);
  }, []);

  const addResources = useCallback((amounts: { wood?: number; stone?: number; food?: number }) => {
    setState(prev => {
      const capW = prev.resourceCapWood ?? DEFAULT_RESOURCE_CAP;
      const capS = prev.resourceCapStone ?? DEFAULT_RESOURCE_CAP;
      const capF = prev.resourceCapFood ?? DEFAULT_RESOURCE_CAP;
      return {
        ...prev,
        stats: {
          ...prev.stats,
          wood: Math.min(prev.stats.wood + (amounts.wood ?? 0), capW),
          stone: Math.min(prev.stats.stone + (amounts.stone ?? 0), capS),
          food: Math.min(prev.stats.food + (amounts.food ?? 0), capF),
        },
      };
    });
  }, []);

  const toggleFreeBuilder = useCallback(() => {
    setFreeBuilderMode(prev => {
      const newMode = !prev;
      if (newMode) setState(prevState => ({
        ...prevState,
        stats: { ...prevState.stats, wood: 999999, stone: 999999, food: 999999 },
      }));
      return newMode;
    });
  }, []);

  const value: FortsContextValue = {
    state,
    latestStateRef,
    setTool,
    setActivePanel,
    placeAtTile,
    placeMultipleTiles,
    newGame,
    hasExistingGame: hasSavedGame,
    isStateReady,
    isSaving,
    addResources,
    freeBuilderMode,
    toggleFreeBuilder,
    activeCardId: state.activeCardId ?? null,
    remainingBuildBlocksFromCard: state.remainingBuildBlocksFromCard ?? null,
    playMoatCard,
    advanceFromNameEntry,
    advanceFromCardDraw,
    advanceFromBuildTimeUp,
    advanceFromDefenseComplete,
    advanceFromRepairToNextRound,
    repairTile,
    selectedDamagedKey,
    setSelectedDamagedKey,
    showUnderground: state.showUnderground ?? false,
    setShowUnderground,
  };

  return <FortsContext.Provider value={value}>{children}</FortsContext.Provider>;
}
