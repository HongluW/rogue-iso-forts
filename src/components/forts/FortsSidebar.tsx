'use client';

import React from 'react';
import { useForts } from '@/context/FortsContext';
import { Tool, TOOL_INFO } from '@/games/forts/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X } from 'lucide-react';

const TOOL_CATEGORIES: Record<string, Tool[]> = {
  tools: ['select', 'bulldoze'],
  terrain: ['zone_water', 'zone_land'],
};

export function FortsSidebar({ onExit }: { onExit?: () => void }) {
  const { state, setTool } = useForts();
  const { selectedTool, stats } = state;

  return (
    <div className="w-56 h-full bg-slate-900 border-r border-slate-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-white font-semibold">IsoForts</h2>
        {onExit && (
          <button
            onClick={onExit}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="p-4 border-b border-slate-800 space-y-2">
        <div className="text-white/60 text-xs">Money</div>
        <div className="text-white text-lg font-semibold">${stats.money.toLocaleString()}</div>
        <div className="text-white/60 text-xs">Population</div>
        <div className="text-white text-lg font-semibold">{stats.population.toLocaleString()}</div>
        <div className="text-white/60 text-xs">Defense</div>
        <div className="text-white text-lg font-semibold">{stats.defense.toLocaleString()}</div>
      </div>

      {/* Tools */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
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
                      onClick={() => setTool(tool)}
                      variant={isSelected ? 'default' : 'ghost'}
                      className={`w-full justify-start text-left ${
                        isSelected ? 'bg-blue-600 hover:bg-blue-700' : ''
                      }`}
                      disabled={toolInfo.cost > stats.money && tool !== 'select' && tool !== 'bulldoze'}
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
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
