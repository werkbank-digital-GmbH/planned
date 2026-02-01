'use client';

import { Truck, User } from 'lucide-react';

import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface PoolItemOverlayProps {
  itemName: string;
  itemType: 'user' | 'resource';
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Overlay für ein Pool-Item (Mitarbeiter/Ressource) das gezogen wird.
 *
 * Zeigt eine minimalistische Karte mit Icon und Name.
 */
export function PoolItemOverlay({ itemName, itemType }: PoolItemOverlayProps) {
  const isUser = itemType === 'user';

  return (
    <div
      className={cn(
        'rounded-md border bg-white p-2 shadow-lg',
        'cursor-grabbing',
        isUser ? 'border-blue-300' : 'border-orange-300'
      )}
      style={{ minWidth: '120px' }}
    >
      <div className="flex items-center gap-2 text-xs font-medium">
        <div
          className={cn(
            'flex items-center justify-center w-5 h-5 rounded-full',
            isUser ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
          )}
        >
          {isUser ? <User className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
        </div>
        <span className="truncate">{itemName}</span>
      </div>
    </div>
  );
}
