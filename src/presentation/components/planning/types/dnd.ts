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
 * Union Type für alle Drag-Daten.
 */
export type DragData = AllocationDragData | ProjectPhaseDragData;

// ═══════════════════════════════════════════════════════════════════════════
// DROP ZONE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Typ der Drop-Zone (User-Zeile oder Ressourcen-Zeile).
 */
export type DropZoneType = 'user' | 'resource';

/**
 * Geparste Daten einer Drop-Zone.
 */
export interface DropZoneData {
  type: DropZoneType;
  userId?: string;
  resourceId?: string;
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
  type: DropZoneType,
  entityId: string,
  date: Date
): string {
  const dateStr = date.toISOString().split('T')[0];
  return `cell-${type}-${entityId}-${dateStr}`;
}

/**
 * Parst eine Drop-Zone ID zurück in ihre Komponenten.
 *
 * @returns DropZoneData oder null wenn das Format ungültig ist
 */
export function parseDropZoneId(id: string): DropZoneData | null {
  // Format: cell-user-{userId}-{YYYY-MM-DD} oder cell-resource-{resourceId}-{YYYY-MM-DD}
  const match = id.match(/^cell-(user|resource)-(.+)-(\d{4}-\d{2}-\d{2})$/);
  if (!match) return null;

  const [, type, entityId, dateStr] = match;
  return {
    type: type as DropZoneType,
    userId: type === 'user' ? entityId : undefined,
    resourceId: type === 'resource' ? entityId : undefined,
    date: new Date(dateStr + 'T00:00:00.000Z'),
  };
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
