import {
  matchUsersByEmailPrefix,
  type PlannedUserForMatching,
  type AsanaUserForMatching,
} from '@/domain/services/UserMatcher';

import type { IIntegrationMappingRepository } from '@/application/ports/repositories/IIntegrationMappingRepository';
import type { IUserRepository } from '@/application/ports/repositories/IUserRepository';
import type { IAsanaService, AsanaUser } from '@/application/ports/services/IAsanaService';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface UserSyncResult {
  matched: number;
  unmatchedPlanned: number;
  unmatchedAsana: number;
  mappings: UserMappingDTO[];
}

export interface UserMappingDTO {
  plannedUserId: string;
  plannedUserName: string;
  plannedUserEmail: string;
  asanaUserGid: string | null;
  asanaUserEmail: string | null;
  asanaUserName: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// USE CASE
// ═══════════════════════════════════════════════════════════════════════════

export interface SyncAsanaUsersInput {
  tenantId: string;
  accessToken: string;
  workspaceId: string;
}

/**
 * Synchronisiert User zwischen Asana und planned.
 *
 * - Lädt alle User aus dem konfigurierten Asana Workspace
 * - Lädt alle aktiven User aus planned.
 * - Matcht User per E-Mail-Prefix (vor dem @)
 * - Speichert Mappings in integration_mappings Tabelle
 *
 * Das Mapping wird für Abwesenheiten-Sync benötigt:
 * Asana Task hat Assignee → Mapping → Planned User ID
 */
export class SyncAsanaUsersUseCase {
  constructor(
    private readonly asanaService: IAsanaService,
    private readonly mappingRepo: IIntegrationMappingRepository,
    private readonly userRepo: IUserRepository
  ) {}

  async execute(input: SyncAsanaUsersInput): Promise<UserSyncResult> {
    const { tenantId, accessToken, workspaceId } = input;

    // 1. Asana Users laden
    const asanaUsers = await this.asanaService.getWorkspaceUsers(
      workspaceId,
      accessToken
    );

    // 3. Planned Users laden
    const plannedUsers = await this.userRepo.findActiveByTenant(tenantId);

    // 4. Mapping erstellen
    const plannedForMatching: PlannedUserForMatching[] = plannedUsers.map((u) => ({
      id: u.id,
      email: u.email,
    }));

    const asanaForMatching: AsanaUserForMatching[] = asanaUsers
      .filter((u): u is AsanaUser & { email: string } => !!u.email)
      .map((u) => ({
        gid: u.gid,
        email: u.email,
        name: u.name,
      }));

    const matchResult = matchUsersByEmailPrefix(plannedForMatching, asanaForMatching);

    // 5. Alte Mappings löschen und neue speichern
    await this.mappingRepo.deleteByType(tenantId, 'asana', 'user');

    const mappings: UserMappingDTO[] = [];

    // User-Map für Namen
    const plannedUserMap = new Map(plannedUsers.map((u) => [u.id, u]));

    // Gematchte User hinzufügen
    for (const match of matchResult.matched) {
      await this.mappingRepo.upsert({
        tenantId,
        service: 'asana',
        mappingType: 'user',
        externalId: match.asanaUserGid,
        internalId: match.plannedUserId,
        externalName: match.asanaUserName,
      });

      const user = plannedUserMap.get(match.plannedUserId);
      mappings.push({
        plannedUserId: match.plannedUserId,
        plannedUserName: user?.fullName ?? 'Unbekannt',
        plannedUserEmail: match.plannedUserEmail,
        asanaUserGid: match.asanaUserGid,
        asanaUserEmail: match.asanaUserEmail,
        asanaUserName: match.asanaUserName,
      });
    }

    // Ungematchte Planned-User hinzufügen (für vollständige Liste)
    for (const unmatched of matchResult.unmatchedPlanned) {
      const user = plannedUserMap.get(unmatched.id);
      mappings.push({
        plannedUserId: unmatched.id,
        plannedUserName: user?.fullName ?? 'Unbekannt',
        plannedUserEmail: unmatched.email,
        asanaUserGid: null,
        asanaUserEmail: null,
        asanaUserName: null,
      });
    }

    return {
      matched: matchResult.matched.length,
      unmatchedPlanned: matchResult.unmatchedPlanned.length,
      unmatchedAsana: matchResult.unmatchedAsana.length,
      mappings,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Get existing mappings without re-syncing
// ═══════════════════════════════════════════════════════════════════════════

export class GetAsanaUserMappingsUseCase {
  constructor(
    private readonly mappingRepo: IIntegrationMappingRepository,
    private readonly userRepo: IUserRepository
  ) {}

  async execute(tenantId: string): Promise<UserMappingDTO[]> {
    const mappings = await this.mappingRepo.findByTenantAndType(tenantId, 'asana', 'user');
    const users = await this.userRepo.findActiveByTenant(tenantId);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const mappedUserIds = new Set(mappings.map((m) => m.internalId));

    const result: UserMappingDTO[] = [];

    // Gemappte User
    for (const m of mappings) {
      const user = userMap.get(m.internalId);
      result.push({
        plannedUserId: m.internalId,
        plannedUserName: user?.fullName ?? 'Unbekannt',
        plannedUserEmail: user?.email ?? 'Unbekannt',
        asanaUserGid: m.externalId,
        asanaUserEmail: null, // Nicht in Mapping gespeichert
        asanaUserName: m.externalName ?? 'Unbekannt',
      });
    }

    // Ungemappte Planned-User
    for (const user of users) {
      if (!mappedUserIds.has(user.id)) {
        result.push({
          plannedUserId: user.id,
          plannedUserName: user.fullName,
          plannedUserEmail: user.email,
          asanaUserGid: null,
          asanaUserEmail: null,
          asanaUserName: null,
        });
      }
    }

    return result;
  }
}
