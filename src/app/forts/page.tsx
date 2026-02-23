'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { FortsProvider } from '@/context/FortsContext';
import { MultiplayerContextProvider } from '@/context/MultiplayerContext';
import FortsGame from '@/components/forts/Game';
import { X } from 'lucide-react';
import {
  buildSavedFortMeta,
  FORTS_AUTOSAVE_KEY,
  FORTS_SAVED_FORT_PREFIX,
  deleteFortsStateFromStorage,
  loadFortsStateFromStorage,
  readSavedFortsIndex,
  removeSavedFortMeta,
  SavedFortMeta,
  saveFortToIndex,
  upsertSavedFortMeta,
  writeSavedFortsIndex,
  saveFortsStateToStorage,
} from '@/games/forts/saveUtils';
import { GameState as FortsGameState } from '@/games/forts/types';

// Saved Fort Card Component
function SavedFortCard({ fort, onLoad, onDelete }: { fort: SavedFortMeta; onLoad: () => void; onDelete?: () => void }) {
  return (
    <div className="relative group">
      <button
        onClick={onLoad}
        className="w-full text-left p-3 pr-8 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-none transition-all duration-200"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-white font-medium truncate group-hover:text-white/90 text-sm flex-1">
            {fort.fortName}
          </h3>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
          <span>Pop: {fort.population.toLocaleString()}</span>
          <span>Defense: {fort.defense.toLocaleString()}</span>
          <span>${fort.money.toLocaleString()}</span>
        </div>
      </button>
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-1/2 -translate-y-1/2 right-1.5 p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded transition-all duration-200"
          title="Delete fort"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function FortsPageContent() {
  const [showGame, setShowGame] = useState(false);
  const [startFresh, setStartFresh] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [savedForts, setSavedForts] = useState<SavedFortMeta[]>([]);
  const [loadFortId, setLoadFortId] = useState<string | null>(null);

  const refreshSavedForts = useCallback(() => {
    let forts = readSavedFortsIndex();
    const autosaveState = loadFortsStateFromStorage(FORTS_AUTOSAVE_KEY);
    if (autosaveState) {
      const autosaveMeta = buildSavedFortMeta(autosaveState);
      forts = upsertSavedFortMeta(autosaveMeta, forts);
      writeSavedFortsIndex(forts);
    }
    setSavedForts(forts);
    setHasSaved(forts.length > 0);
    setIsChecking(false);
  }, []);

  useEffect(() => {
    refreshSavedForts();
  }, [refreshSavedForts]);

  const handleExitGame = () => {
    setShowGame(false);
    setStartFresh(false);
    setLoadFortId(null);
    refreshSavedForts();
    window.history.replaceState({}, '', '/forts');
  };

  const handleDeleteFort = (fort: SavedFortMeta) => {
    const autosaveState = loadFortsStateFromStorage(FORTS_AUTOSAVE_KEY);
    if (autosaveState?.id === fort.id) {
      deleteFortsStateFromStorage(FORTS_AUTOSAVE_KEY);
    }
    deleteFortsStateFromStorage(`${FORTS_SAVED_FORT_PREFIX}${fort.id}`);
    const updated = removeSavedFortMeta(fort.id, savedForts);
    writeSavedFortsIndex(updated);
    setSavedForts(updated);
    setHasSaved(updated.length > 0);
  };

  return (
    showGame ? (
      <FortsProvider startFresh={startFresh} loadFortId={loadFortId}>
        <main className="h-screen w-screen overflow-hidden">
          <FortsGame onExit={handleExitGame} />
        </main>
      </FortsProvider>
    ) : isChecking ? (
      <main className="min-h-screen bg-gradient-to-br from-amber-950 via-orange-950 to-amber-950 flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </main>
    ) : (
      <main className="min-h-screen bg-gradient-to-br from-amber-950 via-orange-950 to-amber-950 flex items-center justify-center p-4 sm:p-8 overflow-x-hidden">
        <div className="max-w-7xl w-full grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left - Title and Buttons */}
          <div className="flex flex-col items-center lg:items-start justify-center space-y-8 lg:space-y-12">
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-light tracking-wider text-white/90">
              IsoForts
            </h1>

            <div className="flex flex-col gap-3 w-full max-w-64">
              <Button 
                onClick={() => {
                  if (hasSaved && savedForts.length > 0) {
                    setStartFresh(false);
                    setLoadFortId(savedForts[0].id);
                  } else {
                    setStartFresh(true);
                    setLoadFortId(null);
                  }
                  setShowGame(true);
                }}
                className="w-full py-6 sm:py-8 text-xl sm:text-2xl font-light tracking-wide bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-none transition-all duration-300"
              >
                {hasSaved ? 'Continue' : 'New Fort'}
              </Button>

              {hasSaved && (
                <Button 
                  onClick={() => {
                    setStartFresh(true);
                    setLoadFortId(null);
                    setShowGame(true);
                  }}
                  variant="outline"
                  className="w-full py-6 sm:py-8 text-xl sm:text-2xl font-light tracking-wide bg-transparent hover:bg-white/10 text-white/60 hover:text-white border border-white/20 rounded-none transition-all duration-300"
                >
                  New Fort
                </Button>
              )}

              <a
                href="https://github.com/amilich/isometric-city"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center py-2 text-sm font-light tracking-wide text-white/40 hover:text-white/70 transition-colors duration-200"
              >
                Open GitHub
              </a>
            </div>

            {/* Saved Forts */}
            {savedForts.length > 0 && (
              <div className="w-full max-w-64">
                <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
                  Saved Forts
                </h2>
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                  {savedForts.slice(0, 5).map((fort) => (
                    <SavedFortCard
                      key={fort.id}
                      fort={fort}
                      onLoad={() => {
                        setStartFresh(false);
                        setLoadFortId(fort.id);
                        setShowGame(true);
                      }}
                      onDelete={() => handleDeleteFort(fort)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right - Placeholder for sprite gallery */}
          <div className="flex justify-center lg:justify-end">
            <div className="text-white/40 text-sm">Fort Builder</div>
          </div>
        </div>
      </main>
    )
  );
}

export default function FortsPage() {
  return (
    <MultiplayerContextProvider>
      <FortsPageContent />
    </MultiplayerContextProvider>
  );
}
