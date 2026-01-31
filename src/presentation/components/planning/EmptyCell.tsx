'use client';

import { Plus } from 'lucide-react';

import { Button } from '@/presentation/components/ui/button';

interface EmptyCellProps {
  userId: string;
  date: Date;
  onClick?: () => void;
}

/**
 * Leere Zelle im Grid für Tage ohne Zuweisungen.
 *
 * Zeigt einen dezenten "+" Button zum Hinzufügen.
 */
export function EmptyCell({ userId: _userId, date: _date, onClick }: EmptyCellProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    // TODO: Open create allocation dialog when onClick not provided
  };

  return (
    <div className="flex h-full min-h-[80px] items-center justify-center">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 rounded-full p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={handleClick}
      >
        <Plus className="h-4 w-4" />
        <span className="sr-only">Zuweisung hinzufügen</span>
      </Button>
    </div>
  );
}
