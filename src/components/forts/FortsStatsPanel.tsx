'use client';

import React from 'react';
import { useForts } from '@/context/FortsContext';

export function FortsStatsPanel() {
  const { state } = useForts();
  const { stats } = state;

  return (
    <div className="h-12 bg-slate-800/50 border-b border-slate-800 flex items-center gap-6 px-4 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-white/60">Money:</span>
        <span className="text-white font-semibold">${stats.money.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-white/60">Population:</span>
        <span className="text-white font-semibold">{stats.population.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-white/60">Defense:</span>
        <span className="text-white font-semibold">{stats.defense.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-white/60">Capacity:</span>
        <span className="text-white font-semibold">{stats.capacity.toLocaleString()}</span>
      </div>
    </div>
  );
}
