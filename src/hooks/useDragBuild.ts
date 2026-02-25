'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { GridPosition } from '@/games/forts/types';
import { isDragBuildTool } from '@/games/forts/types';
import { gridLineBetween, gridToKey } from '@/games/forts/lib/gridUtils';

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

  const [dragBuildStart, setDragBuildStart] = useState<GridPosition | null>(null);
  const [dragBuildCurrent, setDragBuildCurrent] = useState<GridPosition | null>(null);
  const [dragBuildPreview, setDragBuildPreview] = useState<GridPosition[]>([]);
  const isDragBuildingRef = useRef(false);

  const cancelDragBuild = useCallback(() => {
    if (!isDragBuildingRef.current) return;
    isDragBuildingRef.current = false;
    setDragBuildStart(null);
    setDragBuildCurrent(null);
    setDragBuildPreview([]);
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
    if (e.button === 0 && isDragBuildTool(selectedTool)) {
      const pos = mouseToGrid(e);
      if (pos) {
        isDragBuildingRef.current = true;
        setDragBuildStart(pos);
        setDragBuildCurrent(pos);
        setDragBuildPreview([pos]);
        return true;
      }
    }
    return false;
  }, [selectedTool, mouseToGrid, cancelDragBuild]);

  const onMouseMove = useCallback((e: React.MouseEvent): boolean => {
    if (!isDragBuildingRef.current || !dragBuildStart) return false;
    const pos = mouseToGrid(e);
    if (!pos || (pos.x === dragBuildCurrent?.x && pos.y === dragBuildCurrent?.y)) return true;
    setDragBuildCurrent(pos);
    const line = gridLineBetween(dragBuildStart.x, dragBuildStart.y, pos.x, pos.y);
    const valid = line.filter(p => grid.has(gridToKey(p.x, p.y)));
    setDragBuildPreview(valid);
    return true;
  }, [dragBuildStart, dragBuildCurrent, mouseToGrid, grid]);

  const onMouseUp = useCallback((e: React.MouseEvent): boolean => {
    if (e.button !== 0) return false;
    if (!isDragBuildingRef.current) return false;
    if (dragBuildPreview.length > 0) placeMultipleTiles(dragBuildPreview);
    isDragBuildingRef.current = false;
    setDragBuildStart(null);
    setDragBuildCurrent(null);
    setDragBuildPreview([]);
    onCancel();
    return true;
  }, [dragBuildPreview, placeMultipleTiles, onCancel]);

  const onMouseLeave = useCallback(() => {
    if (isDragBuildingRef.current) cancelDragBuild();
  }, [cancelDragBuild]);

  return { dragBuildPreview, isDragBuildingRef, cancelDragBuild, onMouseDown, onMouseMove, onMouseUp, onMouseLeave };
}
