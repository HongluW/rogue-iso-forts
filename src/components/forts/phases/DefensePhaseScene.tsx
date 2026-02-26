'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface DefensePhaseSceneProps {
  round: number;
  onSiegeComplete: () => void;
}

export function DefensePhaseScene({ round, onSiegeComplete }: DefensePhaseSceneProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 3000;
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(100, (elapsed / duration) * 100));
      if (elapsed >= duration) {
        clearInterval(id);
        onSiegeComplete();
      }
    }, 100);
    return () => clearInterval(id);
  }, [onSiegeComplete]);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/95">
      <div className="max-w-md mx-auto p-8 text-center space-y-6">
        <h2 className="text-2xl font-semibold text-white">Siege — Round {round}</h2>
        <p className="text-white/70 text-sm">
          Enemy attack in progress — placeholder.
        </p>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-600 transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-white/50 text-xs">Simulating siege...</p>
      </div>
    </div>
  );
}
