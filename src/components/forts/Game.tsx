'use client';

import React, { useState, useEffect } from 'react';
import { useForts } from '@/context/FortsContext';
import { Tool, HexPosition } from '@/games/forts/types';
import { useMobile } from '@/hooks/useMobile';
import { FortsCanvas } from './FortsCanvas';
import { FortsSidebar } from './FortsSidebar';
import { FortsTopBar } from './FortsTopBar';
import { FortsStatsPanel } from './FortsStatsPanel';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

export default function FortsGame({ onExit }: { onExit?: () => void }) {
  const { state, setTool, setActivePanel, placeAtTile, toggleFreeBuilder } = useForts();
  const [selectedTile, setSelectedTile] = useState<HexPosition | null>(null);
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

  // Desktop layout
  return (
    <div className="w-full h-full min-h-[720px] overflow-hidden bg-background flex relative">
      {/* Sidebar positioned absolutely so it doesn't affect canvas centering */}
      <div className={`absolute left-0 top-0 h-full z-40 transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <FortsSidebar 
          onExit={onExit} 
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>
      
      {/* Hamburger menu button when sidebar is closed */}
      {!sidebarOpen && (
        <Button
          onClick={() => setSidebarOpen(true)}
          className="absolute top-4 left-4 z-50 bg-slate-900 hover:bg-slate-800 text-white border border-slate-700"
          size="icon"
        >
          <Menu className="w-5 h-5" />
        </Button>
      )}
      
      {/* Main content area - always centered, not affected by sidebar */}
      <div className="w-full h-full flex flex-col">
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
