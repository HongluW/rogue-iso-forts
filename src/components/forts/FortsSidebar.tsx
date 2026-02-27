'use client';

import React from 'react';
import { useForts } from '@/context/FortsContext';
import { Tool, TOOL_INFO } from '@/games/forts/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExpandableCategoryPanel, type ExpandableCategoryItem } from '@/components/ui/expandable-category-panel';
import { X, LogOut } from 'lucide-react';
import { CARD_DEFINITIONS, type CardDefinition } from '@/games/forts/types/cards';

const MOAT_CARD_IDS = ['terrain_moat_common', 'terrain_moat_unique', 'terrain_moat_rare'] as const;
const MOAT_CARDS: CardDefinition[] = MOAT_CARD_IDS.map((id) => CARD_DEFINITIONS[id]);

const RESOURCE_BUILDING_IDS = ['building_stone_mason', 'building_carpenter', 'building_mess_hall'] as const;
const RESOURCE_BUILDINGS: CardDefinition[] = RESOURCE_BUILDING_IDS.map((id) => CARD_DEFINITIONS[id]);

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
  onClose,
}: {
  onExit?: () => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { state, setTool, freeBuilderMode, activeCardId, remainingBuildBlocksFromCard, playMoatCard } = useForts();
  const { selectedTool, stats } = state;
  const roundBonusWood = state.roundBonusWood ?? 5;
  const roundBonusStone = state.roundBonusStone ?? 5;
  const roundBonusFood = state.roundBonusFood ?? 5;
   const wallBlocksAvailable = state.wallBlocksAvailable ?? 0;

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

      {/* Stats — Wood, Stone, Food */}
      <div className="p-4 border-b border-slate-800 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-amber-600" aria-hidden>🪵</span>
          <span className="text-white/60 text-xs">Wood</span>
          <span className={`text-lg font-semibold ml-auto ${freeBuilderMode ? 'text-yellow-400' : 'text-white'}`}>
            {freeBuilderMode ? '∞' : stats.wood.toLocaleString()}
          </span>
          {!freeBuilderMode && (
            <span className="text-xs text-emerald-400/90" title="Per round">+{roundBonusWood}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500" aria-hidden>🪨</span>
          <span className="text-white/60 text-xs">Stone</span>
          <span className={`text-lg font-semibold ml-auto ${freeBuilderMode ? 'text-yellow-400' : 'text-white'}`}>
            {freeBuilderMode ? '∞' : stats.stone.toLocaleString()}
          </span>
          {!freeBuilderMode && (
            <span className="text-xs text-emerald-400/90" title="Per round">+{roundBonusStone}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-amber-500" aria-hidden>🌾</span>
          <span className="text-white/60 text-xs">Food</span>
          <span className={`text-lg font-semibold ml-auto ${freeBuilderMode ? 'text-yellow-400' : 'text-white'}`}>
            {freeBuilderMode ? '∞' : stats.food.toLocaleString()}
          </span>
          {!freeBuilderMode && (
            <span className="text-xs text-emerald-400/90" title="Per round">+{roundBonusFood}</span>
          )}
        </div>
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
                  const isWallTool = tool === 'zone_wall';
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
                      disabled={tool === 'bulldoze_all' ? !freeBuilderMode : false}
                    >
                      <div className="flex-1">
                        <div className="text-sm">{toolInfo.name}</div>
                        {isWallTool ? (
                          <div className="text-xs text-white/60">
                            {freeBuilderMode ? 'Blocks: ∞' : `Blocks left: ${wallBlocksAvailable}`}
                          </div>
                        ) : (
                          toolInfo.cost > 0 && (
                            <div className="text-xs text-white/60">Cost: —</div>
                          )
                        )}
                      </div>
                    </Button>
                  );
                })}
                {/* Embrasure: under Wall only, collapsible panel to the right */}
                {category === 'wall' && (
                  <ExpandableCategoryPanel
                    title="Wall Additions"
                    items={EMBRASURE_ITEMS.map((item) => ({ ...item, disabled: false }))}
                    selectedId={selectedTool}
                    onSelectItem={(id) => setTool(id as Tool)}
                  />
                )}
              </div>
            </div>
          ))}
          {/* Resources — Stone Mason, Carpenter, Mess Hall */}
          <div className="mt-4 space-y-2">
            <h3 className="text-white/40 text-xs uppercase tracking-wider">
              Resources
            </h3>
            <div className="space-y-1">
              {RESOURCE_BUILDINGS.map((card) => {
                const wood = card.woodCost ?? 0;
                const stone = card.stoneCost ?? 0;
                const food = card.foodCost ?? 0;
                const costParts = [
                  wood > 0 && `🪵 ${wood}`,
                  stone > 0 && `🪨 ${stone}`,
                  food > 0 && `🌾 ${food}`,
                ].filter(Boolean) as string[];
                const canAfford =
                  freeBuilderMode ||
                  (stats.wood >= wood && stats.stone >= stone && stats.food >= food);
                const tool = card.id === 'building_stone_mason' ? 'build_stone_mason' : card.id === 'building_carpenter' ? 'build_carpenter' : 'build_mess_hall';
                const isSelected = selectedTool === tool;
                return (
                  <Button
                    key={card.id}
                    variant={isSelected ? 'default' : 'ghost'}
                    size="sm"
                    className={`w-full justify-start text-left ${isSelected ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                    disabled={!canAfford}
                    onClick={() => {
                      if (isSelected) setTool('select');
                      else setTool(tool as Tool);
                    }}
                  >
                    <div className="flex flex-col items-start w-full">
                      <span className="text-xs font-medium">{card.name}</span>
                      <span className="text-[11px] text-white/60">
                        Cost: {costParts.join(', ')}
                      </span>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Moat Cards */}
          <div className="mt-4 space-y-2">
            <h3 className="text-white/40 text-xs uppercase tracking-wider">
              Moat Cards
            </h3>
            <div className="space-y-1">
              {MOAT_CARDS.map((card) => {
                const isActive = activeCardId === card.id;
                const foodCost = card.foodCost ?? 0;
                const canAfford = freeBuilderMode || stats.food >= foodCost;
                return (
                  <Button
                    key={card.id}
                    variant={isActive ? 'default' : 'ghost'}
                    size="sm"
                    className={`w-full justify-between ${isActive ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                    disabled={!canAfford}
                    onClick={() => playMoatCard(card.id)}
                  >
                    <div className="flex flex-col items-start">
                      <span className="text-xs font-medium">
                        {card.name} ({card.rarity})
                      </span>
                      <span className="text-[11px] text-white/60">
                        Segments: {card.buildBlocks ?? 0} · Food: {foodCost}
                      </span>
                    </div>
                  </Button>
                );
              })}
              {activeCardId && remainingBuildBlocksFromCard !== null && (
                <div className="text-[11px] text-white/50 pt-1">
                  Active card: {CARD_DEFINITIONS[activeCardId].name} — Remaining segments: {remainingBuildBlocksFromCard}
                </div>
              )}
            </div>
          </div>
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
