'use client';

import React from 'react';
import { useForts } from '@/context/FortsContext';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

export function FortsTopBar() {
  const { state, freeBuilderMode, toggleFreeBuilder } = useForts();
  const { fortName } = state;

  return (
    <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <h1 className="text-white text-xl font-semibold">{fortName}</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={toggleFreeBuilder}
          variant={freeBuilderMode ? 'default' : 'ghost'}
          size="sm"
          className={freeBuilderMode ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : ''}
          title="Toggle Free Builder Mode (unlimited resources for testing)"
        >
          <Sparkles className="w-4 h-4 mr-1.5" />
          Free Builder
          {freeBuilderMode && <span className="ml-1 text-xs">ON</span>}
        </Button>
      </div>
    </div>
  );
}
