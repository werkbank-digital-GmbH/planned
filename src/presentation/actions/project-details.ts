'use server';

/**
 * Project Details Server Actions
 *
 * Server Actions für die Projekt-Detailansicht.
 */

import type { PhaseBereich, ProjectStatus } from '@/domain/types';

import { Result, type ActionResult } from '@/application/common';

import { createActionSupabaseClient } from '@/infrastructure/supabase';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface PhaseDetailDTO {
  id: string;
  name: string;
  bereich: PhaseBereich;
  startDate?: string;
  endDate?: string;
  budgetHours: number;
  plannedHours: number;
  actualHours: number;
  diffHours: number;
  progressPercent: number;
  status: 'not_started' | 'in_progress' | 'completed';
  assignedUsers: Array<{ id: string; fullName: string; initials: string }>;
  assignedResources: Array<{ id: string; name: string; icon: string }>;
}

export interface ProjectDetailsDTO {
  id: string;
  name: string;
  clientName?: string;
  address?: string;
  status: ProjectStatus;
  asanaGid?: string;
  asanaUrl?: string;
  driveFolderUrl?: string;
  progressPercent: number;
  totalBudgetHours: number;
  totalPlannedHours: number;
  totalActualHours: number;
  executionPeriod: {
    start?: string;
    end?: string;
  };
  phases: PhaseDetailDTO[];
}

export interface UpdatePhaseDTO {
  startDate?: string;
  endDate?: string;
  budgetHours?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Holt den Tenant des aktuellen Users.
 */
async function getCurrentUserTenant() {
  const supabase = await createActionSupabaseClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    throw new Error('Nicht eingeloggt');
  }

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_id', authUser.id)
    .single();

  if (!userData) {
    throw new Error('User nicht gefunden');
  }

  return userData.tenant_id;
}

/**
 * Extrahiert Initialen aus einem Namen.
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Ermittelt den Status einer Phase basierend auf Datum und Fortschritt.
 */
function getPhaseStatus(
  startDate: string | null,
  _endDate: string | null,
  actualHours: number,
  budgetHours: number
): 'not_started' | 'in_progress' | 'completed' {
  const today = new Date();

  // Wenn actualHours >= budgetHours und budgetHours > 0, dann abgeschlossen
  if (budgetHours > 0 && actualHours >= budgetHours) {
    return 'completed';
  }

  // Wenn kein Startdatum oder Startdatum in der Zukunft
  if (!startDate || new Date(startDate) > today) {
    return 'not_started';
  }

  // Wenn actualHours > 0 oder Startdatum in der Vergangenheit
  if (actualHours > 0 || (startDate && new Date(startDate) <= today)) {
    return 'in_progress';
  }

  return 'not_started';
}

// ═══════════════════════════════════════════════════════════════════════════
// GET PROJECT DETAILS ACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lädt die Details eines Projekts inkl. aller Phasen und zugewiesenen Ressourcen.
 *
 * @param projectId - ID des Projekts
 */
export async function getProjectDetailsAction(
  projectId: string
): Promise<ActionResult<ProjectDetailsDTO>> {
  try {
    const tenantId = await getCurrentUserTenant();
    const supabase = await createActionSupabaseClient();

    // Projekt laden
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select(
        `
        id,
        name,
        client_name,
        address,
        status,
        asana_gid,
        drive_folder_url
      `
      )
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .single();

    if (projectError || !projectData) {
      return Result.fail('NOT_FOUND', 'Projekt nicht gefunden');
    }

    // Phasen laden
    const { data: phasesData, error: phasesError } = await supabase
      .from('project_phases')
      .select(
        `
        id,
        name,
        bereich,
        start_date,
        end_date,
        budget_hours,
        planned_hours,
        actual_hours,
        status,
        sort_order
      `
      )
      .eq('project_id', projectId)
      .eq('status', 'active')
      .order('sort_order');

    if (phasesError) {
      throw new Error(phasesError.message);
    }

    // Allocations mit Users und Resources laden
    const phaseIds = (phasesData ?? []).map((p) => p.id);

    const { data: allocationsData } = await supabase
      .from('allocations')
      .select(
        `
        project_phase_id,
        user_id,
        resource_id,
        users (
          id,
          full_name
        ),
        resources (
          id,
          name,
          resource_types (
            icon
          )
        )
      `
      )
      .in('project_phase_id', phaseIds.length > 0 ? phaseIds : ['']);

    // Zugewiesene User/Resources pro Phase aggregieren
    const phaseUsersMap = new Map<
      string,
      Map<string, { id: string; fullName: string; initials: string }>
    >();
    const phaseResourcesMap = new Map<
      string,
      Map<string, { id: string; name: string; icon: string }>
    >();

    allocationsData?.forEach((allocation) => {
      const phaseId = allocation.project_phase_id;

      // User hinzufügen
      if (allocation.user_id && allocation.users) {
        if (!phaseUsersMap.has(phaseId)) {
          phaseUsersMap.set(phaseId, new Map());
        }
        const userMap = phaseUsersMap.get(phaseId)!;
        const user = allocation.users as { id: string; full_name: string };
        if (!userMap.has(user.id)) {
          userMap.set(user.id, {
            id: user.id,
            fullName: user.full_name,
            initials: getInitials(user.full_name),
          });
        }
      }

      // Resource hinzufügen
      if (allocation.resource_id && allocation.resources) {
        if (!phaseResourcesMap.has(phaseId)) {
          phaseResourcesMap.set(phaseId, new Map());
        }
        const resourceMap = phaseResourcesMap.get(phaseId)!;
        const resource = allocation.resources as {
          id: string;
          name: string;
          resource_types: { icon: string } | null;
        };
        if (!resourceMap.has(resource.id)) {
          resourceMap.set(resource.id, {
            id: resource.id,
            name: resource.name,
            icon: resource.resource_types?.icon ?? 'package',
          });
        }
      }
    });

    // Phasen-DTOs erstellen
    const phases: PhaseDetailDTO[] = (phasesData ?? []).map((phase) => {
      const budgetHours = phase.budget_hours ?? 0;
      const plannedHours = phase.planned_hours ?? 0;
      const actualHours = phase.actual_hours ?? 0;
      const diffHours = budgetHours - actualHours;
      const progressPercent =
        budgetHours > 0 ? Math.round((actualHours / budgetHours) * 100) : 0;

      const usersMap = phaseUsersMap.get(phase.id);
      const resourcesMap = phaseResourcesMap.get(phase.id);

      return {
        id: phase.id,
        name: phase.name,
        bereich: phase.bereich as PhaseBereich,
        startDate: phase.start_date ?? undefined,
        endDate: phase.end_date ?? undefined,
        budgetHours,
        plannedHours,
        actualHours,
        diffHours,
        progressPercent,
        status: getPhaseStatus(
          phase.start_date,
          phase.end_date,
          actualHours,
          budgetHours
        ),
        assignedUsers: usersMap ? Array.from(usersMap.values()) : [],
        assignedResources: resourcesMap
          ? Array.from(resourcesMap.values())
          : [],
      };
    });

    // Projekt-Level Aggregation
    const totalBudgetHours = phases.reduce((sum, p) => sum + p.budgetHours, 0);
    const totalPlannedHours = phases.reduce((sum, p) => sum + p.plannedHours, 0);
    const totalActualHours = phases.reduce((sum, p) => sum + p.actualHours, 0);
    const progressPercent =
      totalBudgetHours > 0
        ? Math.round((totalActualHours / totalBudgetHours) * 100)
        : 0;

    // Ausführungszeitraum ermitteln
    const startDates = phases
      .map((p) => p.startDate)
      .filter((d): d is string => !!d)
      .sort();
    const endDates = phases
      .map((p) => p.endDate)
      .filter((d): d is string => !!d)
      .sort();

    const executionPeriod = {
      start: startDates[0] ?? undefined,
      end: endDates[endDates.length - 1] ?? undefined,
    };

    // Asana URL konstruieren
    const asanaUrl = projectData.asana_gid
      ? `https://app.asana.com/0/${projectData.asana_gid}`
      : undefined;

    const projectDetails: ProjectDetailsDTO = {
      id: projectData.id,
      name: projectData.name,
      clientName: projectData.client_name ?? undefined,
      address: projectData.address ?? undefined,
      status: projectData.status as ProjectStatus,
      asanaGid: projectData.asana_gid ?? undefined,
      asanaUrl,
      driveFolderUrl: projectData.drive_folder_url ?? undefined,
      progressPercent,
      totalBudgetHours,
      totalPlannedHours,
      totalActualHours,
      executionPeriod,
      phases,
    };

    return Result.ok(projectDetails);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE PHASE ACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Aktualisiert eine Projektphase.
 *
 * Editierbare Felder:
 * - start_date
 * - end_date
 * - budget_hours
 *
 * @param phaseId - ID der Phase
 * @param updates - Zu aktualisierende Felder
 */
export async function updatePhaseAction(
  phaseId: string,
  updates: UpdatePhaseDTO
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const tenantId = await getCurrentUserTenant();
    const supabase = await createActionSupabaseClient();

    // Prüfen, ob Phase zum Tenant gehört
    const { data: phaseData, error: phaseError } = await supabase
      .from('project_phases')
      .select(
        `
        id,
        project_id,
        projects!inner (
          tenant_id
        )
      `
      )
      .eq('id', phaseId)
      .single();

    if (phaseError || !phaseData) {
      return Result.fail('NOT_FOUND', 'Phase nicht gefunden');
    }

    // Typ-Assertion für das verschachtelte Objekt
    const project = phaseData.projects as { tenant_id: string } | null;
    if (!project || project.tenant_id !== tenantId) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung');
    }

    // Update-Objekt erstellen
    const updateData: Record<string, unknown> = {};

    if (updates.startDate !== undefined) {
      updateData.start_date = updates.startDate;
    }
    if (updates.endDate !== undefined) {
      updateData.end_date = updates.endDate;
    }
    if (updates.budgetHours !== undefined) {
      updateData.budget_hours = updates.budgetHours;
    }

    if (Object.keys(updateData).length === 0) {
      return Result.fail('VALIDATION_ERROR', 'Keine Änderungen angegeben');
    }

    // Phase aktualisieren
    const { error: updateError } = await supabase
      .from('project_phases')
      .update(updateData)
      .eq('id', phaseId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    // TODO: Asana-Sync auslösen (Phase 4)
    // await syncPhaseToAsanaAction(phaseId);

    return Result.ok({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE PROJECT DRIVE URL ACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Aktualisiert die Google Drive URL eines Projekts.
 *
 * @param projectId - ID des Projekts
 * @param driveFolderUrl - Neue Drive URL (oder null zum Entfernen)
 */
export async function updateProjectDriveUrlAction(
  projectId: string,
  driveFolderUrl: string | null
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const tenantId = await getCurrentUserTenant();
    const supabase = await createActionSupabaseClient();

    // Prüfen, ob Projekt zum Tenant gehört
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id, tenant_id')
      .eq('id', projectId)
      .single();

    if (projectError || !projectData) {
      return Result.fail('NOT_FOUND', 'Projekt nicht gefunden');
    }

    if (projectData.tenant_id !== tenantId) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung');
    }

    // URL aktualisieren
    const { error: updateError } = await supabase
      .from('projects')
      .update({ drive_folder_url: driveFolderUrl })
      .eq('id', projectId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return Result.ok({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}
