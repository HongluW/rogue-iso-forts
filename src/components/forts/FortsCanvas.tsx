'use client';

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useForts } from '@/context/FortsContext';
import { Tile, BuildingType, HexPosition, isDragBuildTool } from '@/games/forts/types';
import {
  hexToScreen,
  screenToHex,
  HEX_SIZE,
  HEX_WIDTH,
  HEX_HEIGHT,
  getHexesInRadius,
  hexToKey,
} from '@/games/forts/lib/hexUtils';
import { useDragBuild } from '@/hooks/useDragBuild';
import { getSpriteCoords, getActiveSpritePack } from '@/lib/renderConfig';
import { getFortsBuildingSprite } from '@/games/forts/lib/renderConfig';

// Draw simple flat hexagon (no 3D effect)
function drawHexagon(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  colors: { top: string; left: string; right: string; stroke: string },
  drawStroke: boolean = true
) {
  const size = HEX_SIZE;
  
  // Calculate hexagon vertices (flat-top orientation)
  ctx.fillStyle = colors.top;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6; // Start at top
    const x = centerX + size * Math.cos(angle);
    const y = centerY + size * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fill();
  
  if (drawStroke) {
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
// Simple image cache for sprites
const imageCache = new Map<string, HTMLImageElement>();

function loadSpriteImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached && cached.complete && cached.naturalWidth > 0) {
    return Promise.resolve(cached);
  }
  
  // Clear failed cache entry
  imageCache.delete(src);
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = (e) => {
      console.error(`Failed to load image: ${src}`, e);
      reject(e);
    };
    img.src = src;
  });
}

function getCachedImage(src: string): HTMLImageElement | null {
  return imageCache.get(src) || null;
}

interface FortsCanvasProps {
  selectedTile: HexPosition | null;
  setSelectedTile: (tile: HexPosition | null) => void;
  isMobile?: boolean;
}

export function FortsCanvas({ selectedTile, setSelectedTile, isMobile = false }: FortsCanvasProps) {
  const { state, latestStateRef, placeAtTile, placeMultipleTiles } = useForts();
  const { grid, gridSize, selectedTool } = state;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderPendingRef = useRef<number | null>(null);
  // Initial offset to center hex grid - hex (0,0) should be near center of viewport
  const [offset, setOffset] = useState({ x: isMobile ? 200 : 400, y: isMobile ? 100 : 300 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const mouseButtonRef = useRef<number | null>(null); // Track which button was pressed
  const keysPressedRef = useRef<Set<string>>(new Set());
  const panSpeed = 5; // Pixels per frame for WASD movement
  const spritePack = useMemo(() => getActiveSpritePack(), []);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  
  // Load sprite images (optional - don't block rendering)
  useEffect(() => {
    if (!spritePack?.src) {
      setImagesLoaded(true);
    } else {
      loadSpriteImage(spritePack.src)
        .then(() => setImagesLoaded(true))
        .catch((e) => {
          console.error('Failed to load sprite image:', e);
          setImagesLoaded(true);
        });
    }
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

  // Helper: convert mouse event to hex position
  const mouseToHex = useCallback((e: React.MouseEvent | { clientX: number; clientY: number }): HexPosition | null => {
    if (!canvasRef.current) return null;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dpr = window.devicePixelRatio || 1;
    const canvasX = x * dpr;
    const canvasY = y * dpr;
    const viewCenterX = canvas.width / (2 * dpr * zoom);
    const viewCenterY = canvas.height / (2 * dpr * zoom);
    const hexPos = screenToHex(canvasX, canvasY, offset.x, offset.y, dpr, zoom, viewCenterX, viewCenterY);
    const key = hexToKey(hexPos.q, hexPos.r);
    if (grid.has(key)) return hexPos;
    return null;
  }, [offset, zoom, grid]);

  const dragBuild = useDragBuild({
    grid,
    selectedTool,
    mouseToHex,
    placeMultipleTiles,
    onCancel: () => {
      setIsDragging(false);
      mouseButtonRef.current = null;
    },
  });
  
  // Mouse/touch handlers - Right click for panning, left click for placement only
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
    if (isPanningRef.current && mouseButtonRef.current === 2) {
      setOffset(prev => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, dragStart, dragBuild]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    if (e.button === 2 || mouseButtonRef.current === 2) {
      setIsDragging(false);
      isPanningRef.current = false;
      mouseButtonRef.current = null;
      return;
    }
    if (dragBuild.onMouseUp(e)) return;
    if ((e.button === 0 || mouseButtonRef.current === 0) && canvasRef.current && containerRef.current) {
      const hexPos = mouseToHex(e);
      if (hexPos) {
        if (selectedTool === 'select') {
          setSelectedTile({ q: hexPos.q, r: hexPos.r });
        } else if (!isDragBuildTool(selectedTool)) {
          placeAtTile(hexPos.q, hexPos.r);
        }
      }
    }
    setIsDragging(false);
    isPanningRef.current = false;
    mouseButtonRef.current = null;
  }, [isDragging, selectedTool, mouseToHex, placeAtTile, setSelectedTile, dragBuild]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Get mouse position relative to canvas (in screen pixels)
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const canvasX = mouseX * dpr;
    const canvasY = mouseY * dpr;
    
    // Calculate the view center for transform reversal (fixed point for isometric transform)
    const viewCenterX = canvas.width / (2 * dpr * zoom);
    const viewCenterY = canvas.height / (2 * dpr * zoom);
    
    // Step 1: Convert screen coordinates to world coordinates (before zoom)
    // Reverse the transform chain: scale(dpr*zoom), translate(offset/zoom), translate(center), scale(1,0.8), translate(-center)
    
    // Start with screen coordinates in canvas pixels
    let worldX = canvasX / (dpr * zoom) - offset.x / zoom;
    let worldY = canvasY / (dpr * zoom) - offset.y / zoom;
    
    // Reverse isometric transform (Y-axis compression)
    worldX = worldX - viewCenterX;
    worldY = worldY - viewCenterY;
    worldY = worldY / 0.8; // Reverse Y compression
    worldX = worldX + viewCenterX;
    worldY = worldY + viewCenterY;
    
    // Step 2: Apply zoom
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    const newZoom = Math.max(0.3, Math.min(3, zoom * delta));
    
    // Step 3: Calculate what the offset should be to keep the same world point under cursor
    // We want: after transform, the world point should be at the same screen position
    
    // Calculate new view center with new zoom
    const newViewCenterX = canvas.width / (2 * dpr * newZoom);
    const newViewCenterY = canvas.height / (2 * dpr * newZoom);
    
    // Apply forward isometric transform to get where this world point would be on screen
    let screenWorldX = worldX - newViewCenterX;
    let screenWorldY = worldY - newViewCenterY;
    screenWorldY = screenWorldY * 0.8; // Apply Y compression
    screenWorldX = screenWorldX + newViewCenterX;
    screenWorldY = screenWorldY + newViewCenterY;
    
    // Now calculate offset so that this world point appears at the cursor position
    // We need: canvasX/(dpr*newZoom) = screenWorldX + newOffset.x/newZoom
    // So: newOffset.x = (canvasX/(dpr*newZoom) - screenWorldX) * newZoom
    const newOffsetX = (canvasX / (dpr * newZoom) - screenWorldX) * newZoom;
    const newOffsetY = (canvasY / (dpr * newZoom) - screenWorldY) * newZoom;
    
    setZoom(newZoom);
    setOffset({ x: newOffsetX, y: newOffsetY });
  }, [zoom, offset]);

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
      const canvasX = x * dpr;
      const canvasY = y * dpr;
      // Calculate view center for isometric transform reversal (fixed center, not dependent on offset)
      const viewCenterX = canvas.width / (2 * dpr * zoom);
      const viewCenterY = canvas.height / (2 * dpr * zoom);
      const hexPos = screenToHex(canvasX, canvasY, offset.x, offset.y, dpr, zoom, viewCenterX, viewCenterY);
      
      // Check if hex exists in grid
      const key = hexToKey(hexPos.q, hexPos.r);
      if (grid.has(key)) {
        if (selectedTool === 'select') {
          setSelectedTile({ q: hexPos.q, r: hexPos.r });
        } else {
          placeAtTile(hexPos.q, hexPos.r);
        }
      }
    }
    
    setIsDragging(false);
    isPanningRef.current = false;
    touchStartRef.current = null;
    mouseButtonRef.current = null;
  }, [selectedTool, gridSize, offset, zoom, placeAtTile, setSelectedTile, grid]);

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
      
      // Render even if images aren't loaded - hex grid should always be visible
      // Sprites will just be skipped if images aren't ready
      
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
      // Scale for DPR and zoom
      ctx.scale(dpr * zoom, dpr * zoom);
      // Translate by offset (adjusted for zoom)
      ctx.translate(offset.x / zoom, offset.y / zoom);
      
      // Apply slight tilt for fake 3D feeling (tilt backwards/away from camera)
      // Use fixed center point for transform (not dependent on offset)
      const fixedCenterX = canvas.width / (2 * dpr * zoom);
      const fixedCenterY = canvas.height / (2 * dpr * zoom);
      ctx.translate(fixedCenterX, fixedCenterY);
      // No rotation - just compress Y axis to create backwards tilt effect
      // This makes the grid appear to recede into the distance
      ctx.scale(1, 0.8); // Compress Y axis more for backwards perspective
      ctx.translate(-fixedCenterX, -fixedCenterY);
      
      ctx.imageSmoothingEnabled = false;
      
      // Build render queue (sorted by depth for flat-top hexes: r first, then q)
      type RenderItem = { q: number; r: number; tile: Tile; depth: number };
      const renderQueue: RenderItem[] = [];
      
      // Iterate over all hexes in grid
      const currentGrid = latestStateRef.current?.grid || grid;
      
      // Debug: Check if grid has hexes
      if (currentGrid.size === 0) {
        console.warn('[FortsCanvas] Hex grid is empty!');
      }
      
      // Render all hexes (viewport culling disabled for now to ensure grid is visible)
      // The transform handles the viewport naturally
      for (const [key, tile] of currentGrid.entries()) {
        const [q, r] = key.split(',').map(Number);
        
        // Calculate screen position in world coordinates
        const { screenX, screenY } = hexToScreen(q, r, 0, 0);
        
        // Depth sorting: r first (top to bottom), then q (left to right)
        renderQueue.push({
          q,
          r,
          tile,
          depth: r * 1000 + q, // r is primary, q is secondary
        });
      }
      
      // Debug: Log if no hexes are being rendered
      if (renderQueue.length === 0 && currentGrid.size > 0) {
        console.warn('[FortsCanvas] No hexes in viewport!', {
          gridSize: currentGrid.size,
          offset: { x: offset.x, y: offset.y },
          zoom,
        });
      }
      
      // Sort by depth
      renderQueue.sort((a, b) => a.depth - b.depth);
      
      // Render hexes
      for (const item of renderQueue) {
        const { q, r, tile } = item;
        // Calculate screen position for rendering
        const { screenX, screenY } = hexToScreen(q, r, 0, 0);
        
        const building = tile.building;
        const isSelected = selectedTile?.q === q && selectedTile?.r === r;
        
        // Draw base hex
        if (building.type === 'moat') {
          drawHexagon(ctx, screenX, screenY, {
            top: '#2563eb',
            left: '#1e3a8a',
            right: '#3b82f6',
            stroke: '#1e40af',
          }, true);
        } else if (building.type === 'grass' || building.type === 'empty') {
          drawHexagon(ctx, screenX, screenY, {
            top: '#4a7c3f',
            left: '#3d6634',
            right: '#5a8f4f',
            stroke: '#2d4a26',
          }, true);
        } else {
          // Grey base for buildings
          drawHexagon(ctx, screenX, screenY, {
            top: '#6b7280',
            left: '#4b5563',
            right: '#9ca3af',
            stroke: '#374151',
          }, true);
        }
        
        // Draw building sprite if not empty/grass/water
        if (building.type !== 'empty' && building.type !== 'grass' && building.type !== 'moat') {
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
                // Center sprite on hex
                const spriteX = screenX - coords.sw / 2;
                const spriteY = screenY - coords.sh / 2;
                ctx.drawImage(
                  spriteImage,
                  coords.sx, coords.sy, coords.sw, coords.sh,
                  spriteX, spriteY,
                  coords.sw, coords.sh
                );
                ctx.restore();
              }
            }
          } else {
            // Fallback: draw simple colored hexagon
            ctx.fillStyle = building.constructionProgress < 100 ? '#888' : '#654321';
            const size = HEX_SIZE;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const angle = (Math.PI / 3) * i - Math.PI / 6;
              const x = screenX + size * Math.cos(angle);
              const y = screenY + size * Math.sin(angle);
              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            }
            ctx.closePath();
            ctx.fill();
          }
        }
        
        // Walls are now drawn on edges, not on hexes - see below
        
        // Draw selection highlight (hexagon outline)
        if (isSelected) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.lineWidth = 2;
          const size = HEX_SIZE;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const x = screenX + size * Math.cos(angle);
            const y = screenY + size * Math.sin(angle);
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
      
      // Draw drag-build preview (glowing hexes along the line)
      if (dragBuild.dragBuildPreview.length > 0) {
        let previewColor = '#2563eb';
        let previewStroke = '#60a5fa';
        if (selectedTool === 'zone_moat') {
          previewColor = '#2563eb';
          previewStroke = '#93c5fd';
        } else if (selectedTool === 'zone_land') {
          previewColor = '#9C7C3C';
          previewStroke = '#C4A574';
        } else if (selectedTool === 'zone_wall') {
          previewColor = '#6b7280';
          previewStroke = '#9ca3af';
        }
        
        const previewAlpha = 0.7;
        
        for (const hex of dragBuild.dragBuildPreview) {
          const { screenX: px, screenY: py } = hexToScreen(hex.q, hex.r, 0, 0);
          
          ctx.save();
          ctx.globalAlpha = previewAlpha;
          drawHexagon(ctx, px, py, {
            top: previewColor,
            left: previewColor,
            right: previewColor,
            stroke: previewStroke,
          }, true);
          ctx.restore();
          
          ctx.save();
          ctx.globalAlpha = Math.min(previewAlpha + 0.2, 1);
          ctx.strokeStyle = previewStroke;
          ctx.lineWidth = 2;
          const size = HEX_SIZE;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const x = px + size * Math.cos(angle);
            const y = py + size * Math.sin(angle);
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
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
        if (!dragBuild.isDragBuildingRef.current) {
          setIsDragging(false);
          isPanningRef.current = false;
          mouseButtonRef.current = null;
        }
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
