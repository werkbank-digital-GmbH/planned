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
}

/**
 * Union Type für alle Drag-Daten.
 */
export type DragData = AllocationDragData | ProjectPhaseDragData | PoolItemDragData;

// ═══════════════════════════════════════════════════════════════════════════
// DROP ZONE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Typ der Drop-Zone.
 * - user: User-Zeile im Grid
 * - resource: Ressourcen-Zeile im Grid
 * - phase: Phasen-Zelle im Projekt-Grid
 */
export type DropZoneType = 'user' | 'resource' | 'phase';

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
  const phaseMatch = id.match(/^phase-([^-]+)-([^-]+)-(\d{4}-\d{2}-\d{2})$/);
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
