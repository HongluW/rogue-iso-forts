'use client';

import React from 'react';
import { useForts } from '@/context/FortsContext';

// Simple resource icons (emoji) — replace with custom SVGs later if desired
const WoodIcon = () => <span className="text-amber-600" aria-hidden>🪵</span>;
const StoneIcon = () => <span className="text-slate-500" aria-hidden>🪨</span>;
const FoodIcon = () => <span className="text-amber-500" aria-hidden>🌾</span>;

function ResourceRow({
  icon,
  label,
  value,
  freeBuilder,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  freeBuilder: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-white/60 text-xs">{label}:</span>
      <span className={`font-semibold ${freeBuilder ? 'text-yellow-400' : 'text-white'}`}>
        {freeBuilder ? '∞' : value.toLocaleString()}
      </span>
    </div>
  );
}

export function FortsStatsPanel() {
  const { state, freeBuilderMode } = useForts();
  const { stats } = state;

  return (
    <div className="h-12 bg-slate-800/50 border-b border-slate-800 flex items-center gap-6 px-4 text-sm">
      <ResourceRow
        icon={<WoodIcon />}
        label="Wood"
        value={stats.wood}
        freeBuilder={freeBuilderMode}
      />
      <ResourceRow
        icon={<StoneIcon />}
        label="Stone"
        value={stats.stone}
        freeBuilder={freeBuilderMode}
      />
      <ResourceRow
        icon={<FoodIcon />}
        label="Food"
        value={stats.food}
        freeBuilder={freeBuilderMode}
      />
      {freeBuilderMode && (
        <span className="text-xs text-yellow-400/60">(Free Builder)</span>
      )}
      <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-700">
        <span className="text-white/60">Pop:</span>
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
