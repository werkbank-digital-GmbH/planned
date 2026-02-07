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

import { getCurrentUserWithTenant } from '@/presentation/actions/shared/auth';

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

export interface ProjectOverviewDTO {
  id: string;
  name: string;
  clientName?: string;
  address?: string;
  status: 'planning' | 'active' | 'paused' | 'completed';
  phasesTotal: number;
  phasesCompleted: number;
  budgetHours: number;
  actualHours: number;
  progressPercent: number;
  isLate: boolean;
  assignedUsers: Array<{ id: string; fullName: string; avatarUrl?: string }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════


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
    const { tenantId } = await getCurrentUserWithTenant();
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
    const { tenantId } = await getCurrentUserWithTenant();
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
    await getCurrentUserWithTenant(); // Auth-Check
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

// ═══════════════════════════════════════════════════════════════════════════
// GET PROJECTS OVERVIEW ACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lädt alle Projekte mit aggregierten Daten für die Übersichtsseite.
 *
 * Enthält: Phasen-Zähler, Stunden (SOLL/IST), Fortschritt, zugewiesene User.
 */
export async function getProjectsOverviewAction(): Promise<
  ActionResult<ProjectOverviewDTO[]>
> {
  try {
    const { tenantId } = await getCurrentUserWithTenant();
    const supabase = await createActionSupabaseClient();

    // Projekte mit Phasen und Allocations laden
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select(
        `
        id,
        name,
        client_name,
        address,
        status,
        project_phases (
          id,
          status,
          budget_hours,
          actual_hours,
          end_date
        )
      `
      )
      .eq('tenant_id', tenantId)
      .order('name');

    if (projectsError) {
      throw new Error(projectsError.message);
    }

    // Allocations mit User-Daten laden
    const { data: allocationsData } = await supabase
      .from('allocations')
      .select(
        `
        project_phase_id,
        user_id,
        users (
          id,
          full_name,
          avatar_url
        )
      `
      )
      .eq('tenant_id', tenantId)
      .not('user_id', 'is', null);

    // Phase-ID zu Project-ID Mapping erstellen
    const phaseToProjectMap = new Map<string, string>();
    projectsData?.forEach((project) => {
      project.project_phases?.forEach((phase: { id: string }) => {
        phaseToProjectMap.set(phase.id, project.id);
      });
    });

    // User pro Projekt aggregieren (unique)
    const projectUsersMap = new Map<
      string,
      Map<string, { id: string; fullName: string; avatarUrl?: string }>
    >();

    allocationsData?.forEach((allocation) => {
      const projectId = phaseToProjectMap.get(allocation.project_phase_id);
      if (projectId && allocation.users) {
        if (!projectUsersMap.has(projectId)) {
          projectUsersMap.set(projectId, new Map());
        }
        const userMap = projectUsersMap.get(projectId)!;
        const user = allocation.users as {
          id: string;
          full_name: string;
          avatar_url?: string;
        };
        if (!userMap.has(user.id)) {
          userMap.set(user.id, {
            id: user.id,
            fullName: user.full_name,
            avatarUrl: user.avatar_url ?? undefined,
          });
        }
      }
    });

    // DTOs erstellen
    const today = new Date();

    // Phase type für bessere Typisierung
    type PhaseData = {
      id: string;
      status: string | null;
      budget_hours: number | null;
      actual_hours: number | null;
      end_date: string | null;
    };

    const projectDTOs: ProjectOverviewDTO[] = (projectsData ?? []).map((project) => {
      const phases = (project.project_phases ?? []) as PhaseData[];
      const activePhases = phases.filter((p) => p.status === 'active');

      // Stunden aggregieren
      const budgetHours = activePhases.reduce(
        (sum, p) => sum + (p.budget_hours ?? 0),
        0
      );
      const actualHours = activePhases.reduce(
        (sum, p) => sum + (p.actual_hours ?? 0),
        0
      );

      // Fortschritt berechnen
      const progressPercent =
        budgetHours > 0 ? Math.round((actualHours / budgetHours) * 100) : 0;

      // Überfällig prüfen (Phasen mit end_date vor heute)
      const isLate = activePhases.some((p) => {
        if (!p.end_date) return false;
        return new Date(p.end_date) < today;
      });

      // Zugewiesene User
      const usersMap = projectUsersMap.get(project.id);
      const assignedUsers = usersMap ? Array.from(usersMap.values()) : [];

      return {
        id: project.id,
        name: project.name,
        clientName: project.client_name ?? undefined,
        address: project.address ?? undefined,
        status: project.status as ProjectOverviewDTO['status'],
        phasesTotal: phases.length,
        phasesCompleted: phases.filter((p) => p.status === 'deleted').length,
        budgetHours,
        actualHours,
        progressPercent,
        isLate,
        assignedUsers,
      };
    });

    return Result.ok(projectDTOs);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}
