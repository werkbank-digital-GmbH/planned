'use server';

/**
 * Direct Allocation Actions für Undo/Redo.
 *
 * Diese Funktionen werden von Undo/Redo verwendet und pushen NICHT
 * in den Undo-Stack (würde Endlosschleife verursachen).
 */

import { createActionSupabaseClient } from '@/infrastructure/supabase';

import type { AllocationSnapshot, MoveSnapshot } from '../hooks/types/undo';

// ═══════════════════════════════════════════════════════════════════════════
// CREATE ALLOCATION DIRECT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Erstellt eine Allocation direkt (für Undo/Redo).
 *
 * Verwendet die originale ID um die Allocation wiederherzustellen.
 */
export async function createAllocationDirect(
  snapshot: AllocationSnapshot
): Promise<void> {
  const supabase = await createActionSupabaseClient();

  const { error } = await supabase.from('allocations').insert({
    id: snapshot.id,
    tenant_id: snapshot.tenantId,
    user_id: snapshot.userId ?? null,
    resource_id: snapshot.resourceId ?? null,
    project_phase_id: snapshot.projectPhaseId,
    date: snapshot.date,
    planned_hours: snapshot.plannedHours,
    notes: snapshot.notes ?? null,
  });

  if (error) {
    throw new Error(`Allocation wiederherstellen fehlgeschlagen: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DELETE ALLOCATION DIRECT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Löscht eine Allocation direkt (für Undo/Redo).
 */
export async function deleteAllocationDirect(
  allocationId: string
): Promise<void> {
  const supabase = await createActionSupabaseClient();

  const { error } = await supabase
    .from('allocations')
    .delete()
    .eq('id', allocationId);

  if (error) {
    throw new Error(`Allocation löschen fehlgeschlagen: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MOVE ALLOCATION DIRECT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verschiebt eine Allocation direkt (für Undo/Redo).
 */
export async function moveAllocationDirect(
  allocationId: string,
  target: MoveSnapshot
): Promise<void> {
  const supabase = await createActionSupabaseClient();

  const { error } = await supabase
    .from('allocations')
    .update({
      user_id: target.userId ?? null,
      resource_id: target.resourceId ?? null,
      date: target.date,
      project_phase_id: target.projectPhaseId,
    })
    .eq('id', allocationId);

  if (error) {
    throw new Error(`Allocation verschieben fehlgeschlagen: ${error.message}`);
  }
}
