'use client';

import React, { useState, useEffect } from 'react';
import { useForts } from '@/context/FortsContext';
import { Tool } from '@/games/forts/types';
import { useMobile } from '@/hooks/useMobile';
import { FortsCanvas } from './FortsCanvas';
import { FortsSidebar } from './FortsSidebar';
import { FortsTopBar } from './FortsTopBar';
import { FortsStatsPanel } from './FortsStatsPanel';

export default function FortsGame({ onExit }: { onExit?: () => void }) {
  const { state, setTool, setActivePanel, placeAtTile } = useForts();
  const [selectedTile, setSelectedTile] = useState<{ x: number; y: number } | null>(null);
  const { isMobileDevice, isSmallScreen } = useMobile();
  const isMobile = isMobileDevice || isSmallScreen;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'Escape') {
        if (state.activePanel !== 'none') {
          setActivePanel('none');
        } else if (selectedTile) {
          setSelectedTile(null);
        } else if (state.selectedTool !== 'select') {
          setTool('select');
        }
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        setTool('bulldoze');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.activePanel, state.selectedTool, selectedTile, setActivePanel, setTool]);

  // Mobile layout
  if (isMobile) {
    return (
      <div className="w-full h-full overflow-hidden bg-background flex flex-col">
        <div className="flex-1 relative overflow-hidden">
          <FortsCanvas 
            selectedTile={selectedTile} 
            setSelectedTile={setSelectedTile}
            isMobile={true}
          />
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="w-full h-full min-h-[720px] overflow-hidden bg-background flex">
      <FortsSidebar onExit={onExit} />
      
      <div className="flex-1 flex flex-col ml-56">
        <FortsTopBar />
        <FortsStatsPanel />
        <div className="flex-1 relative overflow-visible">
          <FortsCanvas 
            selectedTile={selectedTile} 
            setSelectedTile={setSelectedTile}
          />
        </div>
      </div>
    </div>
  );
}
