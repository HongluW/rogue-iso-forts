'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { GridPosition, Tool } from '@/games/forts/types';
import { isDragBuildTool } from '@/games/forts/types';
import { gridLineBetween, gridToKey, areAdjacent } from '@/games/forts/lib/gridUtils';

export interface UseDragBuildOptions {
  grid: Map<string, unknown>;
  selectedTool: string;
  mouseToGrid: (e: React.MouseEvent | { clientX: number; clientY: number }) => GridPosition | null;
  placeMultipleTiles: (tiles: GridPosition[]) => void;
  onCancel: () => void;
}

export interface UseDragBuildResult {
  dragBuildPreview: GridPosition[];
  isDragBuildingRef: React.MutableRefObject<boolean>;
  cancelDragBuild: () => void;
  onMouseDown: (e: React.MouseEvent) => boolean;
  onMouseMove: (e: React.MouseEvent) => boolean;
  onMouseUp: (e: React.MouseEvent) => boolean;
  onMouseLeave: () => void;
}

export function useDragBuild(options: UseDragBuildOptions): UseDragBuildResult {
  const { grid, selectedTool, mouseToGrid, placeMultipleTiles, onCancel } = options;

  const [dragBuildPath, setDragBuildPath] = useState<GridPosition[]>([]);
  const pathRef = useRef<GridPosition[]>([]);
  const isDragBuildingRef = useRef(false);

  const cancelDragBuild = useCallback(() => {
    if (!isDragBuildingRef.current) return;
    isDragBuildingRef.current = false;
    pathRef.current = [];
    setDragBuildPath([]);
    onCancel();
  }, [onCancel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDragBuildingRef.current) {
        e.preventDefault();
        cancelDragBuild();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelDragBuild]);

  const onMouseDown = useCallback((e: React.MouseEvent): boolean => {
    if (e.button === 2) {
      if (isDragBuildingRef.current) { cancelDragBuild(); return true; }
      return false;
    }
    if (e.button === 0 && isDragBuildTool(selectedTool as Tool)) {
      const pos = mouseToGrid(e);
      if (pos && grid.has(gridToKey(pos.x, pos.y))) {
        isDragBuildingRef.current = true;
        const start = [pos];
        pathRef.current = start;
        setDragBuildPath(start);
        return true;
      }
    }
    return false;
  }, [selectedTool, mouseToGrid, cancelDragBuild, grid]);

  const onMouseMove = useCallback((e: React.MouseEvent): boolean => {
    if (!isDragBuildingRef.current) return false;
    const pos = mouseToGrid(e);
    if (!pos || !grid.has(gridToKey(pos.x, pos.y))) return true;

    setDragBuildPath((prev) => {
      if (prev.length === 0) {
        const next = [pos];
        pathRef.current = next;
        return next;
      }
      const last = prev[prev.length - 1];
      if (last.x === pos.x && last.y === pos.y) return prev;

      // Retract: cursor moved back onto the path → truncate to that cell
      const backIdx = prev.findIndex((p) => p.x === pos.x && p.y === pos.y);
      if (backIdx >= 0) {
        const next = prev.slice(0, backIdx + 1);
        pathRef.current = next;
        return next;
      }

      let next: GridPosition[];
      if (areAdjacent(last.x, last.y, pos.x, pos.y)) {
        next = [...prev, pos];
      } else {
        const segment = gridLineBetween(last.x, last.y, pos.x, pos.y);
        const inGrid = segment.slice(1).filter((p) => grid.has(gridToKey(p.x, p.y)));
        const seen = new Set(prev.map((p) => gridToKey(p.x, p.y)));
        const tail = inGrid.filter((p) => !seen.has(gridToKey(p.x, p.y)));
        next = [...prev, ...tail];
      }
      pathRef.current = next;
      return next;
    });
    return true;
  }, [mouseToGrid, grid]);

  const onMouseUp = useCallback((e: React.MouseEvent): boolean => {
    if (e.button !== 0) return false;
    if (!isDragBuildingRef.current) return false;
    const toPlace = pathRef.current;
    if (toPlace.length > 0) placeMultipleTiles(toPlace);
    pathRef.current = [];
    setDragBuildPath([]);
    isDragBuildingRef.current = false;
    onCancel();
    return true;
  }, [placeMultipleTiles, onCancel]);

  const onMouseLeave = useCallback(() => {
    if (isDragBuildingRef.current) cancelDragBuild();
  }, [cancelDragBuild]);

  return {
    dragBuildPreview: dragBuildPath,
    isDragBuildingRef,
    cancelDragBuild,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
  };
}
