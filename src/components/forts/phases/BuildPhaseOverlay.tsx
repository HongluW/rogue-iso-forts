'use client';

import React, { useEffect, useState } from 'react';

interface BuildPhaseOverlayProps {
  phaseEndsAt: number;
  onTimeUp: () => void;
}

export function BuildPhaseOverlay({ phaseEndsAt, onTimeUp }: BuildPhaseOverlayProps) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const left = Math.max(0, Math.ceil((phaseEndsAt - now) / 1000));
      setRemaining(left);
      if (left <= 0) onTimeUp();
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [phaseEndsAt, onTimeUp]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded bg-slate-900/90 border border-slate-700">
      <span className="text-white font-mono text-sm">
        Build: {mins}:{secs.toString().padStart(2, '0')}
      </span>
    </div>
  );
}
