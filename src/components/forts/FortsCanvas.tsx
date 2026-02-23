'use client';

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useForts } from '@/context/FortsContext';
import { Tile, BuildingType } from '@/games/forts/types';
// Isometric tile constants
const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;

// Convert grid coordinates to screen coordinates (isometric)
function gridToScreen(x: number, y: number, offsetX: number, offsetY: number): { screenX: number; screenY: number } {
  const screenX = (x - y) * (TILE_WIDTH / 2) + offsetX;
  const screenY = (x + y) * (TILE_HEIGHT / 2) + offsetY;
  return { screenX, screenY };
}

// Convert screen coordinates to grid coordinates
function screenToGrid(screenX: number, screenY: number, offsetX: number, offsetY: number): { gridX: number; gridY: number } {
  const adjustedX = screenX - offsetX - TILE_WIDTH / 2;
  const adjustedY = screenY - offsetY - TILE_HEIGHT / 2;
  const gridX = (adjustedX / (TILE_WIDTH / 2) + adjustedY / (TILE_HEIGHT / 2)) / 2;
  const gridY = (adjustedY / (TILE_HEIGHT / 2) - adjustedX / (TILE_WIDTH / 2)) / 2;
  return { gridX: Math.round(gridX), gridY: Math.round(gridY) };
}
// Simple drawing helpers for forts
function drawIsometricDiamond(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colors: { top: string; left: string; right: string; stroke: string },
  drawStroke: boolean = true
) {
  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;
  
  // Top face
  ctx.fillStyle = colors.top;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w, y + h / 2);
  ctx.lineTo(x + w / 2, y + h);
  ctx.lineTo(x, y + h / 2);
  ctx.closePath();
  ctx.fill();
  
  // Left face (darker)
  ctx.fillStyle = colors.left;
  ctx.beginPath();
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w / 2, y + h);
  ctx.lineTo(x + w / 2, y + h + h / 4);
  ctx.lineTo(x, y + h / 2 + h / 4);
  ctx.closePath();
  ctx.fill();
  
  // Right face (lighter)
  ctx.fillStyle = colors.right;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + h);
  ctx.lineTo(x + w, y + h / 2);
  ctx.lineTo(x + w, y + h / 2 + h / 4);
  ctx.lineTo(x + w / 2, y + h + h / 4);
  ctx.closePath();
  ctx.fill();
  
  if (drawStroke) {
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w, y + h / 2);
    ctx.lineTo(x + w / 2, y + h);
    ctx.lineTo(x, y + h / 2);
    ctx.closePath();
    ctx.stroke();
  }
}
import { getSpriteCoords, getActiveSpritePack } from '@/lib/renderConfig';
import { getFortsBuildingSprite } from '@/games/forts/lib/renderConfig';
// Simple image cache for sprites
const imageCache = new Map<string, HTMLImageElement>();

function loadSpriteImage(src: string): Promise<HTMLImageElement> {
  if (imageCache.has(src)) {
    return Promise.resolve(imageCache.get(src)!);
  }
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}

function getCachedImage(src: string): HTMLImageElement | null {
  return imageCache.get(src) || null;
}

interface FortsCanvasProps {
  selectedTile: { x: number; y: number } | null;
  setSelectedTile: (tile: { x: number; y: number } | null) => void;
  isMobile?: boolean;
}

export function FortsCanvas({ selectedTile, setSelectedTile, isMobile = false }: FortsCanvasProps) {
  const { state, latestStateRef, placeAtTile } = useForts();
  const { grid, gridSize, selectedTool } = state;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderPendingRef = useRef<number | null>(null);
  const [offset, setOffset] = useState({ x: isMobile ? 200 : 620, y: isMobile ? 100 : 160 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const mouseButtonRef = useRef<number | null>(null); // Track which button was pressed
  const keysPressedRef = useRef<Set<string>>(new Set());
  const panSpeed = 5; // Pixels per frame for WASD movement
  const spritePack = useMemo(() => getActiveSpritePack(), []);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  
  // Load sprite images
  useEffect(() => {
    if (!spritePack?.src) return;
    
    const loadImages = async () => {
      try {
        await loadSpriteImage(spritePack.src);
        setImagesLoaded(true);
      } catch (e) {
        console.error('Failed to load sprite image:', e);
        setImagesLoaded(true); // Still render even if image fails
      }
    };
    
    loadImages();
  }, [spritePack]);

  // Update canvas size
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const container = containerRef.current;
      const canvas = canvasRef.current;
      const dpr = window.devicePixelRatio || 1;
      
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // WASD keyboard movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(key)) {
        e.preventDefault();
        keysPressedRef.current.add(key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressedRef.current.delete(key);
    };

    const handleMovement = () => {
      if (keysPressedRef.current.size === 0) {
        requestAnimationFrame(handleMovement);
        return;
      }

      // WASD movement - A=left, D=right, W=up, S=down
      // Reverse the signs to fix opposite direction issue
      const moveX = (keysPressedRef.current.has('a') ? panSpeed : 0) - (keysPressedRef.current.has('d') ? panSpeed : 0);
      const moveY = (keysPressedRef.current.has('w') ? panSpeed : 0) - (keysPressedRef.current.has('s') ? panSpeed : 0);

      if (moveX !== 0 || moveY !== 0) {
        setOffset(prev => ({
          x: prev.x + moveX,
          y: prev.y + moveY,
        }));
      }

      requestAnimationFrame(handleMovement);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    handleMovement();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      keysPressedRef.current.clear();
    };
  }, []);

  // Mouse/touch handlers - Right click for panning, left click for placement only
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    mouseButtonRef.current = e.button;
    
    if (e.button === 2) {
      // Right click - start panning
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      isPanningRef.current = true;
    } else if (e.button === 0) {
      // Left click - only for tile selection/placement, NEVER panning
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      isPanningRef.current = false; // Explicitly set to false, never allow panning
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    
    // CRITICAL: Only pan if it's a right-click drag (button 2)
    // Left click (button 0) should NEVER pan, regardless of movement
    if (mouseButtonRef.current !== 2) {
      // Left click or other button - do nothing, just track position
      return;
    }
    
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    // Only pan on right click drag
    if (isPanningRef.current && mouseButtonRef.current === 2) {
      setOffset(prev => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    
    // Right click - just stop panning
    if (e.button === 2 || mouseButtonRef.current === 2) {
      setIsDragging(false);
      isPanningRef.current = false;
      mouseButtonRef.current = null;
      return;
    }
    
    // Left click - handle tile selection/placement (never pans)
    if ((e.button === 0 || mouseButtonRef.current === 0) && canvasRef.current && containerRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const dpr = window.devicePixelRatio || 1;
      const gridPos = screenToGrid(
        x * dpr / zoom,
        y * dpr / zoom,
        offset.x,
        offset.y
      );
      
      const tileX = Math.floor(gridPos.gridX);
      const tileY = Math.floor(gridPos.gridY);
      
      if (tileX >= 0 && tileX < gridSize && tileY >= 0 && tileY < gridSize) {
        if (selectedTool === 'select') {
          setSelectedTile({ x: tileX, y: tileY });
        } else {
          placeAtTile(tileX, tileY);
        }
      }
    }
    
    setIsDragging(false);
    isPanningRef.current = false;
    mouseButtonRef.current = null;
  }, [isDragging, selectedTool, gridSize, offset, zoom, placeAtTile, setSelectedTile]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    // Reduced zoom sensitivity - smaller delta for smoother zooming
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    setZoom(prev => Math.max(0.5, Math.min(2, prev * delta)));
  }, []);

  // Touch handlers for trackpad/touchscreen support
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single touch - treat as potential pan (like right-click)
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
      setIsDragging(true);
      setDragStart({ x: touch.clientX, y: touch.clientY });
      isPanningRef.current = true;
      mouseButtonRef.current = 2; // Treat as right-click equivalent
    } else if (e.touches.length === 2) {
      // Two-finger pinch - zoom (handled separately if needed)
      e.preventDefault();
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !touchStartRef.current) return;
    
    if (e.touches.length === 1) {
      // Single touch drag - pan
      const touch = e.touches[0];
      const dx = touch.clientX - dragStart.x;
      const dy = touch.clientY - dragStart.y;
      
      setOffset(prev => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      setDragStart({ x: touch.clientX, y: touch.clientY });
    }
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    // Check if it was a tap (not a drag) - treat as left click
    const touch = e.changedTouches[0];
    const timeDiff = Date.now() - touchStartRef.current.time;
    const dx = Math.abs(touch.clientX - touchStartRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);
    
    // If it was a quick tap with minimal movement, treat as left click
    if (timeDiff < 300 && dx < 10 && dy < 10 && canvasRef.current && containerRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      const dpr = window.devicePixelRatio || 1;
      const gridPos = screenToGrid(
        x * dpr / zoom,
        y * dpr / zoom,
        offset.x,
        offset.y
      );
      
      const tileX = Math.floor(gridPos.gridX);
      const tileY = Math.floor(gridPos.gridY);
      
      if (tileX >= 0 && tileX < gridSize && tileY >= 0 && tileY < gridSize) {
        if (selectedTool === 'select') {
          setSelectedTile({ x: tileX, y: tileY });
        } else {
          placeAtTile(tileX, tileY);
        }
      }
    }
    
    setIsDragging(false);
    isPanningRef.current = false;
    touchStartRef.current = null;
    mouseButtonRef.current = null;
  }, [selectedTool, gridSize, offset, zoom, placeAtTile, setSelectedTile]);

  // Main render function
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    if (renderPendingRef.current !== null) {
      cancelAnimationFrame(renderPendingRef.current);
    }
    
    renderPendingRef.current = requestAnimationFrame(() => {
      renderPendingRef.current = null;
      
      if (!imagesLoaded) return; // Wait for images to load
      
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#0f1419');
      gradient.addColorStop(0.5, '#141c24');
      gradient.addColorStop(1, '#1a2a1f');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.save();
      ctx.scale(dpr * zoom, dpr * zoom);
      ctx.translate(offset.x / zoom, offset.y / zoom);
      ctx.imageSmoothingEnabled = false;
      
      // Calculate visible tile range
      const viewWidth = canvas.width / (dpr * zoom);
      const viewHeight = canvas.height / (dpr * zoom);
      const viewLeft = -offset.x / zoom - TILE_WIDTH;
      const viewTop = -offset.y / zoom - TILE_HEIGHT * 2;
      const viewRight = viewWidth - offset.x / zoom + TILE_WIDTH;
      const viewBottom = viewHeight - offset.y / zoom + TILE_HEIGHT * 2;
      
      const visibleMinSum = Math.max(0, Math.floor((viewTop - TILE_HEIGHT * 6) * 2 / TILE_HEIGHT));
      const visibleMaxSum = Math.min(gridSize * 2 - 2, Math.ceil((viewBottom + TILE_HEIGHT) * 2 / TILE_HEIGHT));
      
      // Build render queue (sorted by depth)
      type RenderItem = { x: number; y: number; tile: Tile; depth: number };
      const renderQueue: RenderItem[] = [];
      
      for (let sum = visibleMinSum; sum <= visibleMaxSum; sum++) {
        for (let x = 0; x < gridSize; x++) {
          const y = sum - x;
          if (y < 0 || y >= gridSize) continue;
          
          const tile = latestStateRef.current?.grid[y]?.[x] || grid[y][x];
          if (!tile) continue;
          
          const { screenX, screenY } = gridToScreen(x, y, 0, 0);
          
          // Skip if outside viewport
          if (screenX + TILE_WIDTH < viewLeft || screenX > viewRight ||
              screenY + TILE_HEIGHT < viewTop || screenY > viewBottom) {
            continue;
          }
          
          renderQueue.push({
            x,
            y,
            tile,
            depth: x + y, // Depth for sorting
          });
        }
      }
      
      // Sort by depth
      renderQueue.sort((a, b) => a.depth - b.depth);
      
      // Render tiles
      for (const item of renderQueue) {
        const { x, y, tile } = item;
        const { screenX, screenY } = gridToScreen(x, y, 0, 0);
        
        const building = tile.building;
        const isSelected = selectedTile?.x === x && selectedTile?.y === y;
        
        // Draw base tile
        if (building.type === 'water') {
          drawIsometricDiamond(ctx, screenX, screenY, {
            top: '#2563eb',
            left: '#1e3a8a',
            right: '#3b82f6',
            stroke: '#1e40af',
          }, zoom >= 0.6);
        } else if (building.type === 'grass' || building.type === 'empty') {
          drawIsometricDiamond(ctx, screenX, screenY, {
            top: '#4a7c3f',
            left: '#3d6634',
            right: '#5a8f4f',
            stroke: '#2d4a26',
          }, zoom >= 0.6);
        } else {
          // Grey base for buildings
          drawIsometricDiamond(ctx, screenX, screenY, {
            top: '#6b7280',
            left: '#4b5563',
            right: '#9ca3af',
            stroke: '#374151',
          }, zoom >= 0.6);
        }
        
        // Draw building sprite if not empty/grass/water
        if (building.type !== 'empty' && building.type !== 'grass' && building.type !== 'water') {
          const spriteKey = getFortsBuildingSprite(building.type);
          if (spriteKey) {
            const spriteImage = getCachedImage(spritePack.src);
            if (spriteImage) {
              const coords = getSpriteCoords(
                spriteKey,
                spriteImage.width,
                spriteImage.height,
                spritePack
              );
              
              if (coords) {
                const progress = building.constructionProgress / 100;
                const alpha = progress < 1 ? 0.5 : 1;
                
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.drawImage(
                  spriteImage,
                  coords.sx, coords.sy, coords.sw, coords.sh,
                  screenX, screenY - coords.sh * 0.3, // Offset for isometric
                  coords.sw, coords.sh
                );
                ctx.restore();
              }
            }
          } else {
            // Fallback: draw simple colored rectangle
            ctx.fillStyle = building.constructionProgress < 100 ? '#888' : '#654321';
            ctx.beginPath();
            ctx.moveTo(screenX + TILE_WIDTH / 2, screenY);
            ctx.lineTo(screenX + TILE_WIDTH, screenY + TILE_HEIGHT / 2);
            ctx.lineTo(screenX + TILE_WIDTH / 2, screenY + TILE_HEIGHT);
            ctx.lineTo(screenX, screenY + TILE_HEIGHT / 2);
            ctx.closePath();
            ctx.fill();
          }
        }
        
        // Draw selection highlight
        if (isSelected) {
          ctx.strokeStyle = '#ffff00';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(screenX + TILE_WIDTH / 2, screenY);
          ctx.lineTo(screenX + TILE_WIDTH, screenY + TILE_HEIGHT / 2);
          ctx.lineTo(screenX + TILE_WIDTH / 2, screenY + TILE_HEIGHT);
          ctx.lineTo(screenX, screenY + TILE_HEIGHT / 2);
          ctx.closePath();
          ctx.stroke();
        }
      }
      
      ctx.restore();
    });
  }, [grid, gridSize, selectedTile, offset, zoom, latestStateRef, spritePack]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full max-w-full max-h-full relative overflow-hidden mx-auto"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setIsDragging(false);
        isPanningRef.current = false;
        mouseButtonRef.current = null;
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => e.preventDefault()} // Prevent right-click context menu
      onWheel={handleWheel}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}
