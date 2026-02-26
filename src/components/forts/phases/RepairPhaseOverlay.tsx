'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { REPAIR_COST_WOOD, REPAIR_COST_STONE } from '@/games/forts/types/phases';

interface RepairPhaseOverlayProps {
  damagedCount: number;
  onRepairTile: (key: string) => void;
  selectedDamagedKey: string | null;
  setSelectedDamagedKey: (key: string | null) => void;
  damagedKeys: string[];
  canAffordRepair: boolean;
}

export function RepairPhaseOverlay({
  damagedCount,
  onRepairTile,
  selectedDamagedKey,
  setSelectedDamagedKey,
  damagedKeys,
  canAffordRepair,
}: RepairPhaseOverlayProps) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-3">
      <div className="px-4 py-2 rounded bg-slate-900/90 border border-slate-700 text-white text-sm">
        Repair phase — {damagedCount} damaged structure{damagedCount !== 1 ? 's' : ''}
      </div>
      {damagedCount > 0 && (
        <div className="flex gap-2 flex-wrap justify-center max-w-xs">
          <span className="text-white/60 text-xs">Cost per repair: 🪵 {REPAIR_COST_WOOD} 🪨 {REPAIR_COST_STONE}</span>
          {selectedDamagedKey && (
            <Button
              size="sm"
              disabled={!canAffordRepair}
              onClick={() => {
                onRepairTile(selectedDamagedKey);
                setSelectedDamagedKey(null);
              }}
            >
              Repair selected
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
