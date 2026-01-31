'use client';

/**
 * UndoToolbar Component
 *
 * Zeigt Undo/Redo Buttons mit Tooltips und Zähler an.
 */

import { Redo2, Undo2 } from 'lucide-react';

import { Button } from '@/presentation/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/presentation/components/ui/tooltip';
import { useUndo } from '@/presentation/contexts/UndoContext';

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Toolbar mit Undo/Redo Buttons.
 *
 * Zeigt:
 * - Undo Button mit Zähler
 * - Redo Button
 * - Tooltips mit Shortcut-Hinweisen
 */
export function UndoToolbar() {
  const {
    canUndo,
    canRedo,
    undoCount,
    lastAction,
    undo,
    redo,
    isProcessing,
  } = useUndo();

  return (
    <div className="flex items-center gap-1">
      {/* Undo Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={undo}
            disabled={!canUndo || isProcessing}
            aria-label="Rückgängig"
            className="relative"
          >
            <Undo2 className="h-4 w-4" />
            {undoCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {undoCount > 9 ? '9+' : undoCount}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {canUndo
            ? `Rückgängig: ${lastAction} (⌘Z)`
            : 'Nichts zum Rückgängig machen'}
        </TooltipContent>
      </Tooltip>

      {/* Redo Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={redo}
            disabled={!canRedo || isProcessing}
            aria-label="Wiederholen"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {canRedo ? 'Wiederholen (⌘⇧Z)' : 'Nichts zum Wiederholen'}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
