/**
 * Drag & Drop Typen für die Planungsansicht.
 *
 * Definiert die Datenstrukturen für Drag-Operationen
 * und Drop-Zonen im Planning Grid.
 */

// ═══════════════════════════════════════════════════════════════════════════
// DRAG DATA TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Drag-Daten für eine bestehende Allocation.
 */
export interface AllocationDragData {
  type: 'allocation';
  allocationId: string;
  sourceUserId?: string;
  sourceResourceId?: string;
  sourceDate: Date;
  projectPhaseId: string;
}

/**
 * Drag-Daten für eine Projektphase aus der Sidebar.
 * Wird verwendet um neue Allocations zu erstellen.
 */
export interface ProjectPhaseDragData {
  type: 'project-phase';
  projectPhaseId: string;
  projectId: string;
  phaseName: string;
}

/**
 * Drag-Daten für einen Pool-Item (Mitarbeiter/Ressource).
 * Wird verwendet um neue Allocations aus dem Ressourcen-Pool zu erstellen.
 */
export interface PoolItemDragData {
  type: 'pool-item';
  itemType: 'user' | 'resource';
  itemId: string;
  itemName: string;
  /** Die Werktage, für die Allocations erstellt werden sollen (bei Wochenansicht: 1 Tag, bei Monatsansicht: 5 Tage) */
  dates: string[];
}

/**
 * Drag-Daten für einen Allocation-Span (mehrere aufeinanderfolgende Allocations).
 * Wird verwendet um ganze Blöcke (z.B. Mo-Fr) zu verschieben oder löschen.
 */
export interface AllocationSpanDragData {
  type: 'allocation-span';
  /** IDs aller Allocations im Span */
  allocationIds: string[];
  /** User-ID wenn User-Allocation */
  userId?: string;
  /** Resource-ID wenn Resource-Allocation */
  resourceId?: string;
  /** Phase-ID */
  phaseId: string;
  /** Display-Name für Overlay */
  displayName: string;
  /** Anzahl der Tage */
  spanDays: number;
  /** Index des ersten Tages (0-4) */
  startDayIndex: number;
}

/**
 * Drag-Daten für Resize einer Allocation (horizontal erweitern/verkleinern).
 * Wird verwendet um die Dauer einer Allocation per Drag zu ändern.
 */
export interface ResizeAllocationDragData {
  type: 'resize-allocation';
  /** ID der Start-Allocation */
  allocationId: string;
  /** Alle IDs bei Span (für Verkleinern) */
  allocationIds: string[];
  /** User-ID wenn User-Allocation */
  userId?: string;
  /** Resource-ID wenn Resource-Allocation */
  resourceId?: string;
  /** Phase-ID */
  phaseId: string;
  /** Project-ID */
  projectId: string;
  /** Aktueller Start-Tag (0-4 für Mo-Fr) */
  startDayIndex: number;
  /** Aktuelle Span-Länge */
  currentSpanDays: number;
  /** Phase Start-Datum für Constraint (ISO String) */
  phaseStartDate?: string;
  /** Phase End-Datum für Constraint (ISO String) */
  phaseEndDate?: string;
  /** Display-Name für Overlay */
  displayName: string;
}

/**
 * Union Type für alle Drag-Daten.
 */
export type DragData =
  | AllocationDragData
  | ProjectPhaseDragData
  | PoolItemDragData
  | AllocationSpanDragData
  | ResizeAllocationDragData;

// ═══════════════════════════════════════════════════════════════════════════
// DROP ZONE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Typ der Drop-Zone.
 * - user: User-Zeile im Grid
 * - resource: Ressourcen-Zeile im Grid
 * - phase: Phasen-Zelle im Projekt-Grid
 * - pool: Ressourcen-Pool (zum Löschen von Allocations)
 */
export type DropZoneType = 'user' | 'resource' | 'phase' | 'pool';

/**
 * Geparste Daten einer Drop-Zone.
 */
export interface DropZoneData {
  type: DropZoneType;
  userId?: string;
  resourceId?: string;
  phaseId?: string;
  projectId?: string;
  date: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Erstellt eine Drop-Zone ID aus den Komponenten.
 *
 * Format: cell-{type}-{entityId}-{YYYY-MM-DD}
 */
export function createDropZoneId(
  type: 'user' | 'resource',
  entityId: string,
  date: Date
): string {
  const dateStr = date.toISOString().split('T')[0];
  return `cell-${type}-${entityId}-${dateStr}`;
}

/**
 * Erstellt eine Phase-Drop-Zone ID.
 *
 * Format: phase-{phaseId}-{projectId}-{YYYY-MM-DD}
 */
export function createPhaseDropZoneId(
  phaseId: string,
  projectId: string,
  date: Date
): string {
  const dateStr = date.toISOString().split('T')[0];
  return `phase-${phaseId}-${projectId}-${dateStr}`;
}

/**
 * Parst eine Drop-Zone ID zurück in ihre Komponenten.
 *
 * Unterstützt:
 * - cell-user-{userId}-{date}
 * - cell-resource-{resourceId}-{date}
 * - phase-{phaseId}-{projectId}-{date}
 *
 * @returns DropZoneData oder null wenn das Format ungültig ist
 */
export function parseDropZoneId(id: string): DropZoneData | null {
  // Format 0: pool-delete-zone (Ressourcen-Pool zum Löschen)
  if (id === 'pool-delete-zone') {
    return {
      type: 'pool',
      date: new Date(), // Datum ist für Pool nicht relevant
    };
  }

  // Format 1: cell-user-{userId}-{YYYY-MM-DD} oder cell-resource-{resourceId}-{YYYY-MM-DD}
  const cellMatch = id.match(/^cell-(user|resource)-(.+)-(\d{4}-\d{2}-\d{2})$/);
  if (cellMatch) {
    const [, type, entityId, dateStr] = cellMatch;
    return {
      type: type as 'user' | 'resource',
      userId: type === 'user' ? entityId : undefined,
      resourceId: type === 'resource' ? entityId : undefined,
      date: new Date(dateStr + 'T00:00:00.000Z'),
    };
  }

  // Format 2: phase-{phaseId}-{projectId}-{YYYY-MM-DD}
  // UUIDs enthalten Bindestriche, daher matching bis zum letzten Datumsformat
  const phaseMatch = id.match(/^phase-([0-9a-f-]{36})-([0-9a-f-]{36})-(\d{4}-\d{2}-\d{2})$/);
  if (phaseMatch) {
    const [, phaseId, projectId, dateStr] = phaseMatch;
    return {
      type: 'phase',
      phaseId,
      projectId,
      date: new Date(dateStr + 'T00:00:00.000Z'),
    };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Type Guard für AllocationDragData.
 */
export function isAllocationDragData(
  data: DragData
): data is AllocationDragData {
  return data.type === 'allocation';
}

/**
 * Type Guard für ProjectPhaseDragData.
 */
export function isProjectPhaseDragData(
  data: DragData
): data is ProjectPhaseDragData {
  return data.type === 'project-phase';
}

/**
 * Type Guard für PoolItemDragData.
 */
export function isPoolItemDragData(
  data: DragData
): data is PoolItemDragData {
  return data.type === 'pool-item';
}

/**
 * Type Guard für AllocationSpanDragData.
 */
export function isAllocationSpanDragData(
  data: DragData
): data is AllocationSpanDragData {
  return data.type === 'allocation-span';
}

/**
 * Type Guard für ResizeAllocationDragData.
 */
export function isResizeAllocationDragData(
  data: DragData
): data is ResizeAllocationDragData {
  return data.type === 'resize-allocation';
}
