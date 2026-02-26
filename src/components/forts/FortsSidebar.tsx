'use client';

import React from 'react';
import { useForts } from '@/context/FortsContext';
import { Tool, TOOL_INFO } from '@/games/forts/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExpandableCategoryPanel, type ExpandableCategoryItem } from '@/components/ui/expandable-category-panel';
import { X, LogOut } from 'lucide-react';

const TOOL_CATEGORIES: Record<string, Tool[]> = {
  tools: ['select', 'bulldoze', 'bulldoze_all'],
  terrain: ['zone_moat', 'zone_land'],
  wall: ['zone_wall'],
  buildings: ['build_tower', 'build_barbican', 'build_gate'],
  utils: ['build_bridge'],
};

const EMBRASURE_ITEMS: ExpandableCategoryItem[] = [
  { id: 'build_machicolations', label: 'Machicolations', cost: 12 },
  { id: 'build_balistraria', label: 'Balistraria', cost: 10 },
  { id: 'build_crossbow_slit', label: 'Cross bow slit', cost: 6 },
  { id: 'build_longbow_slit', label: 'Longbow slit', cost: 6 },
];

export function FortsSidebar({ 
  onExit, 
  isOpen, 
  onClose 
}: { 
  onExit?: () => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { state, setTool, freeBuilderMode } = useForts();
  const { selectedTool, stats } = state;

  if (!isOpen) {
    return null;
  }

  return (
    <div className="w-56 h-full bg-slate-900 border-r border-slate-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-white font-semibold">IsoForts</h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors"
          title="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Stats */}
      <div className="p-4 border-b border-slate-800 space-y-2">
        <div className="text-white/60 text-xs">Money</div>
        <div className={`text-lg font-semibold ${freeBuilderMode ? 'text-yellow-400' : 'text-white'}`}>
          {freeBuilderMode ? '∞ FREE' : `$${stats.money.toLocaleString()}`}
        </div>
        <div className="text-white/60 text-xs">Population</div>
        <div className="text-white text-lg font-semibold">{stats.population.toLocaleString()}</div>
        <div className="text-white/60 text-xs">Defense</div>
        <div className="text-white text-lg font-semibold">{stats.defense.toLocaleString()}</div>
      </div>

      {/* Tools */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6 relative">
          {Object.entries(TOOL_CATEGORIES).map(([category, tools]) => (
            <div key={category}>
              <h3 className="text-white/40 text-xs uppercase tracking-wider mb-2">
                {category}
              </h3>
              <div className="space-y-1">
                {tools.map((tool) => {
                  const toolInfo = TOOL_INFO[tool];
                  const isSelected = selectedTool === tool;
                  return (
                    <Button
                      key={tool}
                      onClick={() => {
                        if (isSelected) setTool('select');
                        else setTool(tool);
                      }}
                      variant={isSelected ? 'default' : 'ghost'}
                      className={`w-full justify-start text-left ${
                        isSelected ? 'bg-blue-600 hover:bg-blue-700' : ''
                      }`}
                      disabled={
                        tool === 'bulldoze_all'
                          ? !freeBuilderMode
                          : !freeBuilderMode && toolInfo.cost > stats.money && tool !== 'select' && tool !== 'bulldoze'
                      }
                    >
                      <div className="flex-1">
                        <div className="text-sm">{toolInfo.name}</div>
                        {toolInfo.cost > 0 && (
                          <div className="text-xs text-white/60">${toolInfo.cost}</div>
                        )}
                      </div>
                    </Button>
                  );
                })}
                {/* Embrasure: under Wall only, collapsible panel to the right */}
                {category === 'wall' && (
                  <ExpandableCategoryPanel
                    title="Embrasure"
                    items={EMBRASURE_ITEMS.map((item) => ({
                      ...item,
                      disabled: !freeBuilderMode && (TOOL_INFO[item.id as Tool]?.cost ?? 0) > stats.money,
                    }))}
                    selectedId={selectedTool}
                    onSelectItem={(id) => setTool(id as Tool)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Exit Button at Bottom */}
      {onExit && (
        <div className="p-4 border-t border-slate-800">
          <Button
            onClick={onExit}
            variant="ghost"
            className="w-full justify-start text-left text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span>Exit Game</span>
          </Button>
        </div>
      )}
    </div>
  );
}
