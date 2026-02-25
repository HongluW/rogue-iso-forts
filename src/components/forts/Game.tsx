'use client';

import React, { useState, useEffect } from 'react';
import { useForts } from '@/context/FortsContext';
import { Tool, GridPosition } from '@/games/forts/types';
import { useMobile } from '@/hooks/useMobile';
import { FortsCanvas } from './FortsCanvas';
import { FortsSidebar } from './FortsSidebar';
import { FortsTopBar } from './FortsTopBar';
import { FortsStatsPanel } from './FortsStatsPanel';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

export default function FortsGame({ onExit }: { onExit?: () => void }) {
  const { state, setTool, setActivePanel, placeAtTile, toggleFreeBuilder } = useForts();
  const [selectedTile, setSelectedTile] = useState<GridPosition | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        toggleFreeBuilder();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.activePanel, state.selectedTool, selectedTile, setActivePanel, setTool, toggleFreeBuilder]);

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

  // Desktop layout: sidebar in flow so it pushes header and content
  return (
    <div className="w-full h-full min-h-[720px] overflow-hidden bg-background flex flex-row">
      {/* Sidebar: fixed width when open, 0 when collapsed so header/content push back */}
      <div
        className={`flex-shrink-0 h-full overflow-hidden transition-[width] duration-300 ease-in-out ${
          sidebarOpen ? 'w-56' : 'w-0'
        }`}
      >
        {sidebarOpen && (
          <FortsSidebar
            onExit={onExit}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        )}
      </div>

      {/* Main content: takes remaining space, pushed right when sidebar is open */}
      <div className="flex-1 min-w-0 h-full flex flex-col relative">
        {!sidebarOpen && (
          <Button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-28 left-4 z-50 bg-slate-900 hover:bg-slate-800 text-white border border-slate-700"
            size="icon"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}
        <FortsTopBar />
        <FortsStatsPanel />
        <div className="flex-1 relative overflow-hidden flex items-center justify-center">
          <FortsCanvas
            selectedTile={selectedTile}
            setSelectedTile={setSelectedTile}
          />
        </div>
      </div>
    </div>
  );
}
