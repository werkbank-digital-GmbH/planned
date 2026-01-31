/**
 * Dependency Injection Tokens
 *
 * Symbole zur Identifizierung von Abhängigkeiten im Container.
 * Jedes Token entspricht einem Interface aus der Application-Schicht.
 */

export const TOKENS = {
  // ═══════════════════════════════════════════════════════════════════════════
  // REPOSITORIES
  // ═══════════════════════════════════════════════════════════════════════════

  /** IUserRepository */
  UserRepository: Symbol('UserRepository'),

  /** IProjectRepository */
  ProjectRepository: Symbol('ProjectRepository'),

  /** IProjectPhaseRepository */
  ProjectPhaseRepository: Symbol('ProjectPhaseRepository'),

  /** IAllocationRepository */
  AllocationRepository: Symbol('AllocationRepository'),

  /** IResourceRepository */
  ResourceRepository: Symbol('ResourceRepository'),

  /** IResourceTypeRepository */
  ResourceTypeRepository: Symbol('ResourceTypeRepository'),

  /** IAbsenceRepository */
  AbsenceRepository: Symbol('AbsenceRepository'),

  /** ITimeEntryRepository */
  TimeEntryRepository: Symbol('TimeEntryRepository'),

  /** ITenantRepository */
  TenantRepository: Symbol('TenantRepository'),

  /** ISyncLogRepository */
  SyncLogRepository: Symbol('SyncLogRepository'),

  /** IIntegrationCredentialsRepository */
  IntegrationCredentialsRepository: Symbol('IntegrationCredentialsRepository'),

  // ═══════════════════════════════════════════════════════════════════════════
  // SERVICES
  // ═══════════════════════════════════════════════════════════════════════════

  /** IAsanaService */
  AsanaService: Symbol('AsanaService'),

  /** ITimeTacService */
  TimeTacService: Symbol('TimeTacService'),

  /** IEncryptionService */
  EncryptionService: Symbol('EncryptionService'),

  /** IAuthService */
  AuthService: Symbol('AuthService'),
} as const;

/**
 * Type für Token-Keys
 */
export type TokenKey = keyof typeof TOKENS;
