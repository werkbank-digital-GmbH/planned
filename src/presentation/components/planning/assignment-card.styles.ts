/**
 * Gemeinsame Styles für AssignmentCard und SpanningAssignmentCard.
 * Stellt visuelle Konsistenz zwischen Single-Day und Multi-Day Cards sicher.
 */

// ═══════════════════════════════════════════════════════════════════════════
// BASE STYLES
// ═══════════════════════════════════════════════════════════════════════════

/** Basis-Styles für alle Assignment Cards */
export const cardBase = [
  'group relative flex items-center gap-1.5',
  'px-2 py-1 rounded text-xs',
  'select-none cursor-pointer',
  'border shadow-sm',
  'transition-all duration-150',
  'hover:shadow-md',
].join(' ');

/** Styles für User-Zuweisungen (Mitarbeiter) */
export const cardUser = 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100';

/** Styles für Resource-Zuweisungen (Fahrzeuge/Geräte) */
export const cardResource = 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100';

/** Styles für Drag-Zustand */
export const cardDragging = 'opacity-50 ring-2 ring-blue-500 shadow-lg';

/** Styles für Resize-Zustand */
export const cardResizing = 'ring-2 ring-blue-400 z-10';

/** Styles für Konflikt-Markierung */
export const cardConflict = 'ring-2 ring-red-400';

// ═══════════════════════════════════════════════════════════════════════════
// ICON STYLES
// ═══════════════════════════════════════════════════════════════════════════

/** Icon-Größe für alle Cards */
export const iconSize = 'h-3.5 w-3.5 flex-shrink-0';

// ═══════════════════════════════════════════════════════════════════════════
// RESIZE HANDLE
// ═══════════════════════════════════════════════════════════════════════════

/** Basis-Styles für Resize-Handle */
export const resizeHandleBase = [
  'absolute right-0 top-0 bottom-0 w-2.5',
  'cursor-col-resize',
  'opacity-0 group-hover:opacity-100 transition-opacity',
  'bg-gradient-to-r from-transparent',
  'rounded-r',
].join(' ');

/** Resize-Handle für User-Card */
export const resizeHandleUser = 'to-blue-300';

/** Resize-Handle für Resource-Card */
export const resizeHandleResource = 'to-orange-300';

/** Resize-Handle im aktiven Zustand */
export const resizeHandleActive = 'opacity-100 bg-blue-400';

// ═══════════════════════════════════════════════════════════════════════════
// GHOST PREVIEW
// ═══════════════════════════════════════════════════════════════════════════

/** Basis-Styles für Ghost-Preview während Resize */
export const ghostPreviewBase = [
  'absolute top-0 bottom-0 left-0',
  'border-2 border-dashed rounded pointer-events-none',
].join(' ');

/** Ghost-Preview für User-Card */
export const ghostPreviewUser = 'border-blue-400 bg-blue-50/30';

/** Ghost-Preview für Resource-Card */
export const ghostPreviewResource = 'border-orange-400 bg-orange-50/30';

// ═══════════════════════════════════════════════════════════════════════════
// MOVE HANDLE
// ═══════════════════════════════════════════════════════════════════════════

/** Styles für den Drag-Bereich */
export const moveHandle = 'flex items-center gap-1.5 cursor-grab active:cursor-grabbing flex-1 min-w-0';
