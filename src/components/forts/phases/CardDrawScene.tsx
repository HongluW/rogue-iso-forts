'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

interface CardDrawSceneProps {
  round: number;
  onAdvance: () => void;
}

export function CardDrawScene({ round, onAdvance }: CardDrawSceneProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/95">
      <div className="max-w-md mx-auto p-8 text-center space-y-6">
        <h2 className="text-2xl font-semibold text-white">Round {round}</h2>
        <p className="text-white/70 text-sm">
          Card draw phase — placeholder. Draw cards here.
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {/* Placeholder card slots */}
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-20 h-28 rounded border border-white/20 bg-white/5 flex items-center justify-center text-white/40 text-xs"
            >
              Card {i}
            </div>
          ))}
        </div>
        <Button
          onClick={onAdvance}
          className="mt-6"
        >
          Continue to Build Phase
        </Button>
      </div>
    </div>
  );
}
