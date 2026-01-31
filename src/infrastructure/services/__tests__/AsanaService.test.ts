import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AsanaService } from '../AsanaService';

describe('AsanaService', () => {
  let service: AsanaService;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    service = new AsanaService({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TOKEN EXCHANGE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('exchangeCodeForToken', () => {
    it('should exchange authorization code for tokens', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'access-123',
            refresh_token: 'refresh-456',
            token_type: 'bearer',
            expires_in: 3600,
            data: {
              gid: 'user-789',
              name: 'Test User',
              email: 'test@example.com',
            },
          }),
      });

      const result = await service.exchangeCodeForToken(
        'auth-code-xyz',
        'https://app.example.com/callback'
      );

      expect(result.access_token).toBe('access-123');
      expect(result.refresh_token).toBe('refresh-456');
      expect(result.expires_in).toBe(3600);
      expect(result.data.email).toBe('test@example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://app.asana.com/-/oauth_token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      );
    });

    it('should throw on failed token exchange', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      await expect(
        service.exchangeCodeForToken('invalid-code', 'https://app.example.com/callback')
      ).rejects.toThrow('Token-Austausch fehlgeschlagen');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REFRESH TOKEN
  // ═══════════════════════════════════════════════════════════════════════════

  describe('refreshAccessToken', () => {
    it('should refresh access token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'new-access-123',
            refresh_token: 'new-refresh-456',
            token_type: 'bearer',
            expires_in: 3600,
            data: {
              gid: 'user-789',
              name: 'Test User',
              email: 'test@example.com',
            },
          }),
      });

      const result = await service.refreshAccessToken('refresh-token');

      expect(result.access_token).toBe('new-access-123');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKSPACES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getWorkspaces', () => {
    it('should fetch workspaces', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              { gid: 'ws-1', name: 'Workspace 1' },
              { gid: 'ws-2', name: 'Workspace 2' },
            ],
          }),
      });

      const workspaces = await service.getWorkspaces('access-token');

      expect(workspaces).toHaveLength(2);
      expect(workspaces[0].gid).toBe('ws-1');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://app.asana.com/api/1.0/workspaces',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer access-token',
            'Content-Type': 'application/json',
          },
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getProjects', () => {
    it('should fetch projects from workspace', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              { gid: 'proj-1', name: 'Project 1', archived: false },
              { gid: 'proj-2', name: 'Project 2', archived: true },
            ],
          }),
      });

      const projects = await service.getProjects('workspace-123', 'token');

      expect(projects).toHaveLength(2);
      expect(projects[0].name).toBe('Project 1');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/workspaces/workspace-123/projects'),
        expect.objectContaining({
          headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
        })
      );
    });

    it('should filter by archived status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await service.getProjects('workspace-123', 'token', { archived: false });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('archived=false'),
        expect.any(Object)
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECT DETAILS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getProjectDetails', () => {
    it('should fetch project details', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              gid: 'proj-1',
              name: 'Project 1',
              archived: false,
              custom_fields: [
                { gid: 'cf-1', name: 'Projektnummer', display_value: '2024-001' },
              ],
              sections: [{ gid: 'sec-1', name: 'Produktion' }],
            },
          }),
      });

      const project = await service.getProjectDetails('proj-1', 'token');

      expect(project.gid).toBe('proj-1');
      expect(project.custom_fields).toHaveLength(1);
      expect(project.sections).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getSections', () => {
    it('should fetch project sections', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              { gid: 'sec-1', name: 'Produktion Phase 1' },
              { gid: 'sec-2', name: 'Montage Phase 1' },
            ],
          }),
      });

      const sections = await service.getSections('proj-1', 'token');

      expect(sections).toHaveLength(2);
      expect(sections[0].name).toBe('Produktion Phase 1');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('error handling', () => {
    it('should throw ASANA_TOKEN_EXPIRED on 401', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      await expect(service.getWorkspaces('expired-token')).rejects.toThrow(
        'ASANA_TOKEN_EXPIRED'
      );
    });

    it('should throw generic error on other failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(service.getWorkspaces('token')).rejects.toThrow('Asana API Fehler');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MAPPING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('mapToProject', () => {
    it('should map custom fields correctly', () => {
      const asanaProject = {
        gid: 'proj-1',
        name: 'Schulhaus Muster',
        archived: false,
        custom_fields: [
          { gid: 'cf-1', name: 'Projektnummer', display_value: '2024-001', number_value: null, text_value: null },
          { gid: 'cf-2', name: 'SOLL Produktion', display_value: '120', number_value: 120, text_value: null },
          { gid: 'cf-3', name: 'SOLL Montage', display_value: '80', number_value: 80, text_value: null },
        ],
      };

      const mapped = service.mapToProject(asanaProject, {
        workspaceId: 'ws-1',
        projectNumberFieldId: 'cf-1',
        sollProduktionFieldId: 'cf-2',
        sollMontageFieldId: 'cf-3',
      });

      expect(mapped.asanaGid).toBe('proj-1');
      expect(mapped.name).toBe('Schulhaus Muster');
      expect(mapped.projectNumber).toBe('2024-001');
      expect(mapped.sollProduktion).toBe(120);
      expect(mapped.sollMontage).toBe(80);
      expect(mapped.isArchived).toBe(false);
    });

    it('should handle missing custom fields', () => {
      const asanaProject = {
        gid: 'proj-1',
        name: 'Project without custom fields',
        archived: false,
      };

      const mapped = service.mapToProject(asanaProject, {
        workspaceId: 'ws-1',
        projectNumberFieldId: 'cf-1',
      });

      expect(mapped.projectNumber).toBeUndefined();
      expect(mapped.sollProduktion).toBeUndefined();
    });
  });

  describe('mapSectionToPhase', () => {
    it('should map section to produktion phase', () => {
      const section = { gid: 'sec-1', name: 'Produktion Phase 1' };

      const mapped = service.mapSectionToPhase(section);

      expect(mapped.asanaGid).toBe('sec-1');
      expect(mapped.name).toBe('Produktion Phase 1');
      expect(mapped.bereich).toBe('produktion');
    });

    it('should map section to montage phase', () => {
      const section = { gid: 'sec-2', name: 'Montage Woche 1-3' };

      const mapped = service.mapSectionToPhase(section);

      expect(mapped.bereich).toBe('montage');
    });

    it('should detect baustelle as montage', () => {
      const section = { gid: 'sec-3', name: 'Baustelle vorbereiten' };

      const mapped = service.mapSectionToPhase(section);

      expect(mapped.bereich).toBe('montage');
    });

    it('should default to produktion for unknown sections', () => {
      const section = { gid: 'sec-4', name: 'Planung' };

      const mapped = service.mapSectionToPhase(section);

      expect(mapped.bereich).toBe('produktion');
    });
  });
});
