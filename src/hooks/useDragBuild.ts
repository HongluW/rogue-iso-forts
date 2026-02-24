'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { HexPosition } from '@/games/forts/types';
import { isDragBuildTool } from '@/games/forts/types';
import { hexLineBetween, hexToKey } from '@/games/forts/lib/hexUtils';

export interface UseDragBuildOptions {
  /** Current grid keys to filter valid hexes in the line */
  grid: Map<string, unknown>;
  /** Active tool; only line tools start drag-build */
  selectedTool: string;
  /** Resolve mouse event to hex position (or null if off grid) */
  mouseToHex: (e: React.MouseEvent | { clientX: number; clientY: number }) => HexPosition | null;
  /** Commit the preview line (place tiles) */
  placeMultipleTiles: (hexes: HexPosition[]) => void;
  /** Called when drag-build is cancelled (Escape, right-click, mouse leave); caller should clear global drag state */
  onCancel: () => void;
}

export interface UseDragBuildResult {
  /** Hexes currently in the preview line */
  dragBuildPreview: HexPosition[];
  /** Whether a drag-build is in progress (for canvas to know if it should delegate move/up) */
  isDragBuildingRef: React.MutableRefObject<boolean>;
  /** Cancel current drag-build without placing; calls onCancel */
  cancelDragBuild: () => void;
  /** Call from mouse down: returns true if drag-build started (left on line tool) or was cancelled (right-click) and caller should skip other handling */
  onMouseDown: (e: React.MouseEvent) => boolean;
  /** Call from mouse move: returns true if drag-build is active and event was consumed (caller should skip pan) */
  onMouseMove: (e: React.MouseEvent) => boolean;
  /** Call from mouse up: returns true if drag-build was active (placed or cleared); caller should skip single-click placement when true */
  onMouseUp: (e: React.MouseEvent) => boolean;
  /** Call from mouse leave to cancel drag-build if active */
  onMouseLeave: () => void;
}

/**
 * Encapsulates drag-build (line-draw) input: start, update preview, commit or cancel.
 * Lives alongside other cursor/input logic (e.g. future usePan, useWheelZoom).
 */
export function useDragBuild(options: UseDragBuildOptions): UseDragBuildResult {
  const {
    grid,
    selectedTool,
    mouseToHex,
    placeMultipleTiles,
    onCancel,
  } = options;

  const [dragBuildStart, setDragBuildStart] = useState<HexPosition | null>(null);
  const [dragBuildCurrent, setDragBuildCurrent] = useState<HexPosition | null>(null);
  const [dragBuildPreview, setDragBuildPreview] = useState<HexPosition[]>([]);
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
      if (isDragBuildingRef.current) {
        cancelDragBuild();
        return true;
      }
      return false;
    }
    if (e.button === 0 && isDragBuildTool(selectedTool)) {
      const hexPos = mouseToHex(e);
      if (hexPos) {
        isDragBuildingRef.current = true;
        setDragBuildStart(hexPos);
        setDragBuildCurrent(hexPos);
        setDragBuildPreview([hexPos]);
        return true;
      }
    }
    return false;
  }, [selectedTool, mouseToHex, cancelDragBuild]);

  const onMouseMove = useCallback((e: React.MouseEvent): boolean => {
    if (!isDragBuildingRef.current || !dragBuildStart) return false;
    const hexPos = mouseToHex(e);
    if (!hexPos || (hexPos.q === dragBuildCurrent?.q && hexPos.r === dragBuildCurrent?.r)) return true;
    setDragBuildCurrent(hexPos);
    const lineHexes = hexLineBetween(dragBuildStart.q, dragBuildStart.r, hexPos.q, hexPos.r);
    const validHexes = lineHexes.filter((h) => grid.has(hexToKey(h.q, h.r)));
    setDragBuildPreview(validHexes);
    return true;
  }, [dragBuildStart, dragBuildCurrent, mouseToHex, grid]);

  const onMouseUp = useCallback((e: React.MouseEvent): boolean => {
    if (e.button !== 0) return false;
    if (!isDragBuildingRef.current) return false;
    if (dragBuildPreview.length > 0) {
      placeMultipleTiles(dragBuildPreview);
    }
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

  return {
    dragBuildPreview,
    isDragBuildingRef,
    cancelDragBuild,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
  };
}
