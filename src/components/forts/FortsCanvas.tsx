'use client';

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useForts } from '@/context/FortsContext';
import { Tile, GridPosition, isDragBuildTool } from '@/games/forts/types';
import {
  gridToScreen,
  screenToGrid,
  TILE_WIDTH,
  TILE_HEIGHT,
  gridToKey,
} from '@/games/forts/lib/gridUtils';
import { useDragBuild } from '@/hooks/useDragBuild';
import { getSpriteCoords, getActiveSpritePack } from '@/lib/renderConfig';
import { getFortsBuildingSprite } from '@/games/forts/lib/renderConfig';

// Draw isometric diamond tile
function drawDiamond(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  colors: { top: string; stroke: string },
  drawStroke: boolean = true
) {
  const hw = TILE_WIDTH / 2;
  const hh = TILE_HEIGHT / 2;
  ctx.fillStyle = colors.top;
  ctx.beginPath();
  ctx.moveTo(cx, cy - hh);      // top
  ctx.lineTo(cx + hw, cy);      // right
  ctx.lineTo(cx, cy + hh);      // bottom
  ctx.lineTo(cx - hw, cy);      // left
  ctx.closePath();
  ctx.fill();
  if (drawStroke) {
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

// Simple image cache
const imageCache = new Map<string, HTMLImageElement>();

function loadSpriteImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached && cached.complete && cached.naturalWidth > 0) return Promise.resolve(cached);
  imageCache.delete(src);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { imageCache.set(src, img); resolve(img); };
    img.onerror = reject;
    img.src = src;
  });
}

function getCachedImage(src: string): HTMLImageElement | null {
  return imageCache.get(src) || null;
}

interface FortsCanvasProps {
  selectedTile: GridPosition | null;
  setSelectedTile: (tile: GridPosition | null) => void;
  isMobile?: boolean;
}

export function FortsCanvas({ selectedTile, setSelectedTile, isMobile = false }: FortsCanvasProps) {
  const { state, latestStateRef, placeAtTile, placeMultipleTiles } = useForts();
  const { grid, gridSize, selectedTool } = state;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderPendingRef = useRef<number | null>(null);
  const [offset, setOffset] = useState({ x: isMobile ? 200 : 500, y: isMobile ? 100 : 100 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const mouseButtonRef = useRef<number | null>(null);
  const keysPressedRef = useRef<Set<string>>(new Set());
  const panSpeed = 5;
  const spritePack = useMemo(() => getActiveSpritePack(), []);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Load sprites
  useEffect(() => {
    if (!spritePack?.src) { setImagesLoaded(true); return; }
    loadSpriteImage(spritePack.src).then(() => setImagesLoaded(true)).catch(() => setImagesLoaded(true));
  }, [spritePack]);

  // Canvas size
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const dpr = window.devicePixelRatio || 1;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      canvasRef.current.width = w * dpr;
      canvasRef.current.height = h * dpr;
      canvasRef.current.style.width = `${w}px`;
      canvasRef.current.style.height = `${h}px`;
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // WASD movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(k)) { e.preventDefault(); keysPressedRef.current.add(k); }
    };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressedRef.current.delete(e.key.toLowerCase()); };
    const loop = () => {
      if (keysPressedRef.current.size > 0) {
        const mx = (keysPressedRef.current.has('a') ? panSpeed : 0) - (keysPressedRef.current.has('d') ? panSpeed : 0);
        const my = (keysPressedRef.current.has('w') ? panSpeed : 0) - (keysPressedRef.current.has('s') ? panSpeed : 0);
        if (mx || my) setOffset(prev => ({ x: prev.x + mx, y: prev.y + my }));
      }
      requestAnimationFrame(loop);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    loop();
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); keysPressedRef.current.clear(); };
  }, []);

  // Mouse → grid helper
  const mouseToGrid = useCallback((e: React.MouseEvent | { clientX: number; clientY: number }): GridPosition | null => {
    if (!canvasRef.current) return null;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const canvasX = (e.clientX - rect.left) * dpr;
    const canvasY = (e.clientY - rect.top) * dpr;
    const vcx = canvas.width / (2 * dpr * zoom);
    const vcy = canvas.height / (2 * dpr * zoom);
    const pos = screenToGrid(canvasX, canvasY, offset.x, offset.y, dpr, zoom, vcx, vcy);
    if (grid.has(gridToKey(pos.x, pos.y))) return pos;
    return null;
  }, [offset, zoom, grid]);

  // Drag build hook
  const dragBuild = useDragBuild({
    grid,
    selectedTool,
    mouseToGrid,
    placeMultipleTiles,
    onCancel: () => { setIsDragging(false); mouseButtonRef.current = null; },
  });

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    mouseButtonRef.current = e.button;
    if (e.button === 2) {
      e.preventDefault();
      if (dragBuild.onMouseDown(e)) return;
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      isPanningRef.current = true;
    } else if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      isPanningRef.current = false;
      dragBuild.onMouseDown(e);
    }
  }, [dragBuild]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    if (dragBuild.onMouseMove(e)) return;
    if (mouseButtonRef.current !== 2) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (isPanningRef.current) {
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, dragStart, dragBuild]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    if (e.button === 2 || mouseButtonRef.current === 2) {
      setIsDragging(false); isPanningRef.current = false; mouseButtonRef.current = null; return;
    }
    if (dragBuild.onMouseUp(e)) return;
    if ((e.button === 0 || mouseButtonRef.current === 0) && canvasRef.current) {
      const pos = mouseToGrid(e);
      if (pos) {
        if (selectedTool === 'select') setSelectedTile(pos);
        else if (!isDragBuildTool(selectedTool)) placeAtTile(pos.x, pos.y);
      }
    }
    setIsDragging(false); isPanningRef.current = false; mouseButtonRef.current = null;
  }, [isDragging, selectedTool, mouseToGrid, placeAtTile, setSelectedTile, dragBuild]);

  // Zoom to cursor
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const canvasX = (e.clientX - rect.left) * dpr;
    const canvasY = (e.clientY - rect.top) * dpr;
    const vcx = canvas.width / (2 * dpr * zoom);
    const vcy = canvas.height / (2 * dpr * zoom);

    let wx = canvasX / (dpr * zoom) - offset.x / zoom - vcx;
    let wy = (canvasY / (dpr * zoom) - offset.y / zoom - vcy) / 0.975;
    wx += vcx; wy += vcy;

    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    const nz = Math.max(0.3, Math.min(3, zoom * delta));
    const nvcx = canvas.width / (2 * dpr * nz);
    const nvcy = canvas.height / (2 * dpr * nz);

    let sx = wx - nvcx;
    let sy = (wy - nvcy) * 0.975;
    sx += nvcx; sy += nvcy;

    setZoom(nz);
    setOffset({ x: (canvasX / (dpr * nz) - sx) * nz, y: (canvasY / (dpr * nz) - sy) * nz });
  }, [zoom, offset]);

  // Touch handlers
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
      setIsDragging(true); setDragStart({ x: t.clientX, y: t.clientY }); isPanningRef.current = true; mouseButtonRef.current = 2;
    }
  }, []);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !touchStartRef.current || e.touches.length !== 1) return;
    const t = e.touches[0];
    setOffset(prev => ({ x: prev.x + t.clientX - dragStart.x, y: prev.y + t.clientY - dragStart.y }));
    setDragStart({ x: t.clientX, y: t.clientY });
  }, [isDragging, dragStart]);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dt = Date.now() - touchStartRef.current.time;
    const dx = Math.abs(t.clientX - touchStartRef.current.x);
    const dy = Math.abs(t.clientY - touchStartRef.current.y);
    if (dt < 300 && dx < 10 && dy < 10 && canvasRef.current) {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvasRef.current.getBoundingClientRect();
      const canvasX = (t.clientX - rect.left) * dpr;
      const canvasY = (t.clientY - rect.top) * dpr;
      const vcx = canvasRef.current.width / (2 * dpr * zoom);
      const vcy = canvasRef.current.height / (2 * dpr * zoom);
      const pos = screenToGrid(canvasX, canvasY, offset.x, offset.y, dpr, zoom, vcx, vcy);
      if (grid.has(gridToKey(pos.x, pos.y))) {
        if (selectedTool === 'select') setSelectedTile(pos);
        else placeAtTile(pos.x, pos.y);
      }
    }
    setIsDragging(false); isPanningRef.current = false; touchStartRef.current = null; mouseButtonRef.current = null;
  }, [selectedTool, offset, zoom, placeAtTile, setSelectedTile, grid]);

  // =========================================================================
  // RENDER
  // =========================================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (renderPendingRef.current !== null) cancelAnimationFrame(renderPendingRef.current);

    renderPendingRef.current = requestAnimationFrame(() => {
      renderPendingRef.current = null;
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#0f1419');
      grad.addColorStop(0.5, '#141c24');
      grad.addColorStop(1, '#1a2a1f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.scale(dpr * zoom, dpr * zoom);
      ctx.translate(offset.x / zoom, offset.y / zoom);

      // Y-axis compression for slight 3D tilt
      const fcx = canvas.width / (2 * dpr * zoom);
      const fcy = canvas.height / (2 * dpr * zoom);
      ctx.translate(fcx, fcy);
      ctx.scale(1, 0.975);
      ctx.translate(-fcx, -fcy);

      ctx.imageSmoothingEnabled = false;

      // Build render queue sorted by depth (y + x for isometric)
      const currentGrid = latestStateRef.current?.grid || grid;
      type RI = { x: number; y: number; tile: Tile; depth: number };
      const rq: RI[] = [];

      for (const [key, tile] of currentGrid.entries()) {
        const [x, y] = key.split(',').map(Number);
        rq.push({ x, y, tile, depth: y * 1000 + x });
      }
      rq.sort((a, b) => a.depth - b.depth);

      // Draw tiles
      for (const item of rq) {
        const { x, y, tile } = item;
        const { screenX, screenY } = gridToScreen(x, y);
        const building = tile.building;
        const isSelected = selectedTile?.x === x && selectedTile?.y === y;

        // Base tile color
        if (building.type === 'moat') {
          drawDiamond(ctx, screenX, screenY, { top: '#2563eb', stroke: '#1e40af' });
        } else if (tile.zone === 'wall') {
          drawDiamond(ctx, screenX, screenY, { top: '#78716c', stroke: '#57534e' });
        } else if (building.type === 'grass' || building.type === 'empty') {
          drawDiamond(ctx, screenX, screenY, { top: '#4a7c3f', stroke: '#2d4a26' });
        } else {
          drawDiamond(ctx, screenX, screenY, { top: '#6b7280', stroke: '#374151' });
        }

        // Sprites for non-base buildings
        if (building.type !== 'empty' && building.type !== 'grass' && building.type !== 'moat') {
          const spriteKey = getFortsBuildingSprite(building.type);
          if (spriteKey) {
            const spriteImage = getCachedImage(spritePack.src);
            if (spriteImage) {
              const coords = getSpriteCoords(spriteKey, spriteImage.width, spriteImage.height, spritePack);
              if (coords) {
                const alpha = building.constructionProgress < 100 ? 0.5 : 1;
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.drawImage(spriteImage, coords.sx, coords.sy, coords.sw, coords.sh, screenX - coords.sw / 2, screenY - coords.sh / 2, coords.sw, coords.sh);
                ctx.restore();
              }
            }
          }
        }

        // Selection highlight
        if (isSelected) {
          ctx.strokeStyle = '#ffff00';
          ctx.lineWidth = 2;
          const hw = TILE_WIDTH / 2;
          const hh = TILE_HEIGHT / 2;
          ctx.beginPath();
          ctx.moveTo(screenX, screenY - hh);
          ctx.lineTo(screenX + hw, screenY);
          ctx.lineTo(screenX, screenY + hh);
          ctx.lineTo(screenX - hw, screenY);
          ctx.closePath();
          ctx.stroke();
        }
      }

      // Drag-build preview
      if (dragBuild.dragBuildPreview.length > 0) {
        let previewColor = '#2563eb';
        let previewStroke = '#60a5fa';
        if (selectedTool === 'zone_moat') { previewColor = '#2563eb'; previewStroke = '#93c5fd'; }
        else if (selectedTool === 'zone_land') { previewColor = '#9C7C3C'; previewStroke = '#C4A574'; }
        else if (selectedTool === 'zone_wall') { previewColor = '#78716c'; previewStroke = '#a8a29e'; }

        for (const pos of dragBuild.dragBuildPreview) {
          const { screenX: px, screenY: py } = gridToScreen(pos.x, pos.y);
          ctx.save();
          ctx.globalAlpha = 0.7;
          drawDiamond(ctx, px, py, { top: previewColor, stroke: previewStroke });
          ctx.restore();
          ctx.save();
          ctx.globalAlpha = 0.9;
          ctx.strokeStyle = previewStroke;
          ctx.lineWidth = 2;
          const hw = TILE_WIDTH / 2;
          const hh = TILE_HEIGHT / 2;
          ctx.beginPath();
          ctx.moveTo(px, py - hh);
          ctx.lineTo(px + hw, py);
          ctx.lineTo(px, py + hh);
          ctx.lineTo(px - hw, py);
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        }
      }

      ctx.restore();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, gridSize, selectedTile, offset, zoom, spritePack, imagesLoaded, dragBuild.dragBuildPreview, selectedTool]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full max-w-full max-h-full relative overflow-hidden mx-auto"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        dragBuild.onMouseLeave();
        if (!dragBuild.isDragBuildingRef.current) { setIsDragging(false); isPanningRef.current = false; mouseButtonRef.current = null; }
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
      onWheel={handleWheel}
    >
      <canvas ref={canvasRef} className="absolute inset-0" style={{ imageRendering: 'pixelated' }} />
    </div>
  );
}
