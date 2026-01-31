'use server';

/**
 * Project Server Actions
 *
 * Server Actions für Projekt-bezogene Operationen.
 */

import { Result, type ActionResult } from '@/application/common';

import { SupabaseProjectPhaseRepository } from '@/infrastructure/repositories/SupabaseProjectPhaseRepository';
import { SupabaseProjectRepository } from '@/infrastructure/repositories/SupabaseProjectRepository';
import { createActionSupabaseClient } from '@/infrastructure/supabase';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ProjectListDTO {
  id: string;
  name: string;
}

export interface ProjectSearchDTO {
  id: string;
  name: string;
}

export interface ProjectPhaseDTO {
  id: string;
  name: string;
  bereich: string;
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

// ═══════════════════════════════════════════════════════════════════════════
// GET PROJECTS LIST ACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lädt alle aktiven Projekte des aktuellen Tenants.
 *
 * Für Filter-Dropdowns und Listen.
 */
export async function getProjectsListAction(): Promise<ActionResult<ProjectListDTO[]>> {
  try {
    const tenantId = await getCurrentUserTenant();
    const supabase = await createActionSupabaseClient();
    const projectRepository = new SupabaseProjectRepository(supabase);

    const projects = await projectRepository.findActiveByTenant(tenantId);

    const projectDTOs: ProjectListDTO[] = projects.map((project) => ({
      id: project.id,
      name: project.name,
    }));

    return Result.ok(projectDTOs);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH PROJECTS ACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sucht nach Projekten mit Fuzzy-Matching.
 *
 * @param search - Suchbegriff (mind. 2 Zeichen)
 */
export async function searchProjectsAction(
  search: string
): Promise<ActionResult<ProjectSearchDTO[]>> {
  if (search.length < 2) {
    return Result.ok([]);
  }

  try {
    const tenantId = await getCurrentUserTenant();
    const supabase = await createActionSupabaseClient();
    const projectRepository = new SupabaseProjectRepository(supabase);

    const projects = await projectRepository.findActiveByTenant(tenantId);

    // Fuzzy-Filter: Name enthält Suchbegriff (case-insensitive)
    const searchLower = search.toLowerCase();
    const filtered = projects.filter((p) =>
      p.name.toLowerCase().includes(searchLower)
    );

    const projectDTOs: ProjectSearchDTO[] = filtered.map((project) => ({
      id: project.id,
      name: project.name,
    }));

    return Result.ok(projectDTOs);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET PROJECT PHASES ACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lädt alle Phasen eines Projekts.
 *
 * @param projectId - ID des Projekts
 */
export async function getProjectPhasesAction(
  projectId: string
): Promise<ActionResult<ProjectPhaseDTO[]>> {
  try {
    await getCurrentUserTenant(); // Auth-Check
    const supabase = await createActionSupabaseClient();
    const phaseRepository = new SupabaseProjectPhaseRepository(supabase);

    const phases = await phaseRepository.findAllByProject(projectId);

    const phaseDTOs: ProjectPhaseDTO[] = phases.map((phase) => ({
      id: phase.id,
      name: phase.name,
      bereich: phase.bereich,
    }));

    return Result.ok(phaseDTOs);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}
