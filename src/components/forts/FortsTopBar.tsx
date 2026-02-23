'use client';

import React from 'react';
import { useForts } from '@/context/FortsContext';
import { Button } from '@/components/ui/button';
import { Play, Pause, FastForward } from 'lucide-react';

export function FortsTopBar() {
  const { state, setSpeed } = useForts();
  const { speed, fortName, year, month, day } = state;

  return (
    <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <h1 className="text-white text-xl font-semibold">{fortName}</h1>
        <div className="text-white/60 text-sm">
          Year {year}, Month {month}, Day {day}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          onClick={() => setSpeed(0)}
          variant={speed === 0 ? 'default' : 'ghost'}
          size="sm"
        >
          <Pause className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => setSpeed(1)}
          variant={speed === 1 ? 'default' : 'ghost'}
          size="sm"
        >
          <Play className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => setSpeed(2)}
          variant={speed === 2 ? 'default' : 'ghost'}
          size="sm"
        >
          <FastForward className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => setSpeed(3)}
          variant={speed === 3 ? 'default' : 'ghost'}
          size="sm"
        >
          <FastForward className="w-4 h-4" />
          <FastForward className="w-4 h-4 -ml-2" />
        </Button>
      </div>
    </div>
  );
}
