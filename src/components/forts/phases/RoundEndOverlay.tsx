'use client';

import React from 'react';

interface RoundEndOverlayProps {
  round: number;
}

export function RoundEndOverlay({ round }: RoundEndOverlayProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-white">Round {round} complete</h2>
        <p className="text-white/60 text-sm mt-2">Preparing next round...</p>
      </div>
    </div>
  );
}
