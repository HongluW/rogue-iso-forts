'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { ChevronRight, X } from 'lucide-react';

export interface ExpandableCategoryItem {
  id: string;
  label: string;
  /** Optional cost to show under the label */
  cost?: number;
  /** If true, the item is disabled (e.g. not enough money) */
  disabled?: boolean;
}

export interface ExpandableCategoryPanelProps {
  /** Label shown on the trigger (e.g. "Embrasure") */
  title: string;
  /** Items shown in the panel when open */
  items: ExpandableCategoryItem[];
  /** Currently selected item id (e.g. selected tool) */
  selectedId?: string | null;
  /** Called when an item is clicked */
  onSelectItem: (id: string) => void;
  /** Optional: panel width. Default 13rem */
  panelWidth?: string;
  /** Optional: class for the trigger button */
  triggerClassName?: string;
}

/**
 * Reusable collapsible category that opens a panel to the right.
 * Use for sidebar categories that have sub-items (e.g. Embrasure → Machicolations, etc.).
 */
export function ExpandableCategoryPanel({
  title,
  items,
  selectedId,
  onSelectItem,
  panelWidth = '13rem',
  triggerClassName = '',
}: ExpandableCategoryPanelProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPosition({ top: rect.top, left: rect.right });
  }, [open]);

  const panelContent = open ? (
    <div
      className="fixed z-[100] flex flex-col bg-slate-900 border border-slate-800 shadow-xl min-h-[200px] max-h-[min(320px,70vh)] rounded-r border-l-0"
      style={{ width: panelWidth, top: position.top, left: position.left }}
    >
      <div className="p-2 border-b border-slate-800 flex items-center justify-between shrink-0">
        <span className="text-white/60 text-xs uppercase tracking-wider">{title}</span>
        <button
          onClick={() => setOpen(false)}
          className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          title="Close"
          type="button"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {items.map((item) => {
          const isSelected = selectedId === item.id;
          return (
            <Button
              key={item.id}
              variant={isSelected ? 'default' : 'ghost'}
              size="sm"
              className={`w-full justify-start text-left text-sm ${
                isSelected ? 'bg-blue-600 hover:bg-blue-700' : 'text-white hover:bg-slate-800'
              }`}
              onClick={() => onSelectItem(isSelected ? 'select' : item.id)}
              disabled={item.disabled}
            >
              <div className="flex-1 min-w-0">
                <div className="truncate">{item.label}</div>
                {item.cost != null && item.cost > 0 && (
                  <div className="text-xs text-white/60">${item.cost}</div>
                )}
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <div className="relative">
      <Button
        ref={triggerRef}
        variant="ghost"
        className={`w-full justify-between text-left text-white/90 hover:bg-slate-800 hover:text-white ${triggerClassName}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-sm">{title}</span>
        <ChevronRight
          className={`w-4 h-4 text-white/50 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        />
      </Button>
      {open && typeof document !== 'undefined' && createPortal(panelContent, document.body)}
    </div>
  );
}
