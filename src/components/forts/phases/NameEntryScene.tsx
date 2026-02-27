'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface NameEntrySceneProps {
  /** Initial value (e.g. from new game with pre-filled name). */
  initialName: string;
  onContinue: (fortName: string) => void;
}

export function NameEntryScene({ initialName, onContinue }: NameEntrySceneProps) {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onContinue(name);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/95">
      <form
        onSubmit={handleSubmit}
        className="max-w-md mx-auto p-8 text-center space-y-6"
      >
        <h2 className="text-2xl font-semibold text-white">Name your fort</h2>
        <p className="text-white/70 text-sm">
          Choose a name for this fort. It will be used for this save.
        </p>
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Northwatch, Riverhold"
          className="bg-white/10 border-white/20 text-white placeholder:text-white/40 text-center text-lg max-w-xs mx-auto"
          maxLength={64}
          autoFocus
          aria-label="Fort name"
        />
        <Button type="submit" className="mt-4">
          Continue to card draw
        </Button>
      </form>
    </div>
  );
}
