'use client';

import { Calendar, Truck, User } from 'lucide-react';

import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface AllocationSpanOverlayProps {
  displayName: string;
  spanDays: number;
  isUser: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getSpanLabel(spanDays: number): string {
  if (spanDays === 5) return 'Mo-Fr';
  return `${spanDays} Tage`;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Drag-Overlay für Allocation-Spans.
 *
 * Zeigt eine visuelle Repräsentation des gezogenen Multi-Tag-Blocks.
 */
export function AllocationSpanOverlay({
  displayName,
  spanDays,
  isUser,
}: AllocationSpanOverlayProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm',
        'border shadow-lg cursor-grabbing',
        isUser
          ? 'bg-blue-100 text-blue-800 border-blue-300'
          : 'bg-orange-100 text-orange-800 border-orange-300'
      )}
    >
      {isUser ? (
        <User className="h-4 w-4 flex-shrink-0" />
      ) : (
        <Truck className="h-4 w-4 flex-shrink-0" />
      )}
      <span className="font-medium">{displayName}</span>
      <span className="text-xs opacity-70 flex items-center gap-1 ml-1">
        <Calendar className="h-3.5 w-3.5" />
        {getSpanLabel(spanDays)}
      </span>
    </div>
  );
}
