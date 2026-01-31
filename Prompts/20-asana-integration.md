# Prompt 20: Asana Integration

**Phase:** 5 – Integrationen
**Komplexität:** L (Large)
**Geschätzte Zeit:** 5-6 Stunden

---

## Kontext

Die Planungs-UI ist vollständig. Jetzt implementieren wir die Integration mit Asana für den Projekt-Import.

**Bereits vorhanden:**
- Project Entity (read-only)
- ProjectPhase Entity
- Encryption Service (für API-Keys)
- IntegrationCredentials Repository

---

## Ziel

Implementiere OAuth-Flow und Projekt-Sync mit Asana.

---

## Referenz-Dokumentation

- `FEATURES.md` – F7.1-F7.5 (Asana Integration)
- `API_SPEC.md` – Asana Endpoints, Sync Logic
- `DATA_MODEL.md` – integration_credentials, sync_logs

---

## Akzeptanzkriterien

```gherkin
Feature: F7 - Asana Integration

Scenario: F7.1 - Asana verbinden (OAuth)
  Given ich bin Admin
  And bin in Einstellungen > Integrationen
  When ich auf "Mit Asana verbinden" klicke
  Then werde ich zu Asana OAuth weitergeleitet
  After Autorisierung: Token wird verschlüsselt gespeichert
  And ich sehe "Asana verbunden" mit Workspace-Name

Scenario: F7.2 - Projekte aus Asana importieren
  Given Asana ist verbunden
  When ich auf "Projekte synchronisieren" klicke
  Then werden alle Projekte aus dem Workspace geladen
  And ich kann auswählen welche Projekte importiert werden
  And ausgewählte Projekte erscheinen in der App

Scenario: F7.3 - Projekt-Details importieren
  Given ein Projekt wurde importiert
  Then werden folgende Felder übernommen:
    | Asana Feld      | Planned Feld    |
    | name            | name            |
    | gid             | asana_id        |
    | custom_field[X] | project_number  |
    | custom_field[Y] | soll_produktion |
    | custom_field[Z] | soll_montage    |

Scenario: F7.4 - Phasen aus Sections importieren
  Given ein Projekt hat Sections in Asana
  Then werden Sections als Phasen importiert
  And der Bereich wird aus Section-Name abgeleitet:
    | Section enthält | Bereich    |
    | "Produktion"    | produktion |
    | "Montage"       | montage    |
  And soll_hours wird aus Custom Field übernommen

Scenario: F7.5 - Automatischer Sync
  Given Asana ist verbunden
  Then läuft alle 15 Minuten ein Sync-Job
  And neue Projekte werden hinzugefügt
  And geänderte Daten werden aktualisiert
  And gelöschte Projekte werden als "archived" markiert

Scenario: Asana trennen
  Given Asana ist verbunden
  When ich auf "Verbindung trennen" klicke
  Then wird der Token gelöscht
  And Projekte bleiben erhalten (nur Sync stoppt)

Scenario: Token abgelaufen
  Given der Asana Token ist abgelaufen
  When ein Sync versucht wird
  Then wird ein Refresh versucht
  If Refresh fehlschlägt: Admin wird benachrichtigt
  And Integration wird als "Erneute Verbindung erforderlich" markiert
```

---

## Technische Anforderungen

### OAuth Flow

```typescript
// 1. Authorization URL generieren
const authUrl = `https://app.asana.com/-/oauth_authorize?` +
  `client_id=${ASANA_CLIENT_ID}` +
  `&redirect_uri=${REDIRECT_URI}` +
  `&response_type=code` +
  `&state=${tenantId}`;

// 2. Callback verarbeiten
// GET /api/integrations/asana/callback?code=XXX&state=tenant-123

// 3. Token Exchange
const tokenResponse = await fetch('https://app.asana.com/-/oauth_token', {
  method: 'POST',
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: ASANA_CLIENT_ID,
    client_secret: ASANA_CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    code: authCode,
  }),
});
```

### Asana API Types

```typescript
interface AsanaProject {
  gid: string;
  name: string;
  archived: boolean;
  custom_fields: AsanaCustomField[];
  sections: AsanaSection[];
}

interface AsanaSection {
  gid: string;
  name: string;
  // Custom fields für soll_hours
}

interface AsanaCustomField {
  gid: string;
  name: string;
  display_value: string;
  number_value?: number;
}
```

### Sync Configuration

```typescript
interface AsanaSyncConfig {
  workspaceId: string;
  projectNumberFieldId: string;    // Custom Field GID
  sollProduktionFieldId: string;   // Custom Field GID
  sollMontageFieldId: string;      // Custom Field GID
  syncIntervalMinutes: number;     // Default: 15
}
```

---

## Implementierungsschritte

### 🔴 RED: Test für Asana Service

```typescript
// src/infrastructure/services/__tests__/AsanaService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AsanaService } from '../AsanaService';

describe('AsanaService', () => {
  let service: AsanaService;
  let mockFetch: vi.Mock;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    service = new AsanaService();
  });

  it('should fetch projects from workspace', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: [
          { gid: 'proj-1', name: 'Project 1' },
          { gid: 'proj-2', name: 'Project 2' },
        ],
      }),
    });

    const projects = await service.getProjects('workspace-123', 'token');

    expect(projects).toHaveLength(2);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/workspaces/workspace-123/projects'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer token' },
      })
    );
  });

  it('should map custom fields correctly', async () => {
    const asanaProject = {
      gid: 'proj-1',
      name: 'Schulhaus Muster',
      custom_fields: [
        { gid: 'cf-1', name: 'Projektnummer', display_value: '2024-001' },
        { gid: 'cf-2', name: 'SOLL Produktion', number_value: 120 },
      ],
    };

    const mapped = service.mapToProject(asanaProject, {
      projectNumberFieldId: 'cf-1',
      sollProduktionFieldId: 'cf-2',
    });

    expect(mapped.projectNumber).toBe('2024-001');
    expect(mapped.sollProduktion).toBe(120);
  });
});
```

### 🟢 GREEN: AsanaService implementieren

```typescript
// src/infrastructure/services/AsanaService.ts
import { IAsanaService } from '@/application/ports/services/IAsanaService';

const ASANA_API_BASE = 'https://app.asana.com/api/1.0';

export class AsanaService implements IAsanaService {
  async getWorkspaces(accessToken: string): Promise<AsanaWorkspace[]> {
    const response = await this.request('/workspaces', accessToken);
    return response.data;
  }

  async getProjects(
    workspaceId: string,
    accessToken: string,
    options?: { archived?: boolean }
  ): Promise<AsanaProject[]> {
    const params = new URLSearchParams({
      opt_fields: 'name,archived,custom_fields,sections',
    });
    if (options?.archived !== undefined) {
      params.set('archived', String(options.archived));
    }

    const response = await this.request(
      `/workspaces/${workspaceId}/projects?${params}`,
      accessToken
    );
    return response.data;
  }

  async getProjectDetails(
    projectId: string,
    accessToken: string
  ): Promise<AsanaProject> {
    const params = new URLSearchParams({
      opt_fields: 'name,archived,custom_fields,sections,sections.name',
    });

    const response = await this.request(
      `/projects/${projectId}?${params}`,
      accessToken
    );
    return response.data;
  }

  async getSections(
    projectId: string,
    accessToken: string
  ): Promise<AsanaSection[]> {
    const response = await this.request(
      `/projects/${projectId}/sections`,
      accessToken
    );
    return response.data;
  }

  mapToProject(
    asanaProject: AsanaProject,
    config: AsanaSyncConfig
  ): Partial<Project> {
    const getCustomFieldValue = (fieldId: string) => {
      const field = asanaProject.custom_fields?.find((f) => f.gid === fieldId);
      return field?.display_value || field?.number_value;
    };

    return {
      asanaId: asanaProject.gid,
      name: asanaProject.name,
      projectNumber: String(getCustomFieldValue(config.projectNumberFieldId) || ''),
      sollProduktion: Number(getCustomFieldValue(config.sollProduktionFieldId)) || 0,
      sollMontage: Number(getCustomFieldValue(config.sollMontageFieldId)) || 0,
      isArchived: asanaProject.archived,
    };
  }

  mapSectionToPhase(section: AsanaSection): Partial<ProjectPhase> {
    // Bereich aus Section-Name ableiten
    const nameLower = section.name.toLowerCase();
    let bereich: 'produktion' | 'montage' = 'produktion';

    if (nameLower.includes('montage') || nameLower.includes('baustelle')) {
      bereich = 'montage';
    }

    return {
      asanaId: section.gid,
      name: section.name,
      bereich,
    };
  }

  private async request(path: string, accessToken: string): Promise<any> {
    const response = await fetch(`${ASANA_API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('ASANA_TOKEN_EXPIRED');
      }
      throw new Error(`Asana API error: ${response.status}`);
    }

    return response.json();
  }
}
```

### 🟢 GREEN: OAuth Route Handler

```typescript
// src/app/api/integrations/asana/authorize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect('/login');
  }

  // Tenant ID als State für Security
  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_id', user.id)
    .single();

  const state = userData?.tenant_id;

  const authUrl = new URL('https://app.asana.com/-/oauth_authorize');
  authUrl.searchParams.set('client_id', process.env.ASANA_CLIENT_ID!);
  authUrl.searchParams.set('redirect_uri', process.env.ASANA_REDIRECT_URI!);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state);

  return NextResponse.redirect(authUrl);
}

// src/app/api/integrations/asana/callback/route.ts
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // tenant_id

  if (!code || !state) {
    return NextResponse.redirect('/einstellungen/integrationen?error=invalid_request');
  }

  try {
    // Token Exchange
    const tokenResponse = await fetch('https://app.asana.com/-/oauth_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.ASANA_CLIENT_ID!,
        client_secret: process.env.ASANA_CLIENT_SECRET!,
        redirect_uri: process.env.ASANA_REDIRECT_URI!,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Token exchange failed');
    }

    const tokens = await tokenResponse.json();

    // Token verschlüsselt speichern
    const encryptionService = new EncryptionService();
    const encryptedToken = encryptionService.encrypt(tokens.access_token);
    const encryptedRefresh = tokens.refresh_token
      ? encryptionService.encrypt(tokens.refresh_token)
      : null;

    const supabase = createAdminSupabaseClient();
    await supabase.from('integration_credentials').upsert({
      tenant_id: state,
      provider: 'asana',
      access_token_encrypted: encryptedToken,
      refresh_token_encrypted: encryptedRefresh,
      expires_at: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
    });

    return NextResponse.redirect('/einstellungen/integrationen?success=asana_connected');
  } catch (error) {
    console.error('Asana OAuth error:', error);
    return NextResponse.redirect('/einstellungen/integrationen?error=oauth_failed');
  }
}
```

### 🟢 GREEN: SyncProjectsUseCase

```typescript
// src/application/use-cases/integrations/SyncAsanaProjectsUseCase.ts
export class SyncAsanaProjectsUseCase {
  constructor(
    private asanaService: IAsanaService,
    private projectRepository: IProjectRepository,
    private projectPhaseRepository: IProjectPhaseRepository,
    private credentialsRepository: IIntegrationCredentialsRepository,
    private syncLogRepository: ISyncLogRepository,
    private encryptionService: IEncryptionService
  ) {}

  async execute(tenantId: string): Promise<SyncResult> {
    const log: SyncLogEntry = {
      id: crypto.randomUUID(),
      tenantId,
      provider: 'asana',
      startedAt: new Date(),
      status: 'running',
    };

    try {
      // 1. Credentials laden und entschlüsseln
      const credentials = await this.credentialsRepository.findByTenantAndProvider(
        tenantId,
        'asana'
      );

      if (!credentials) {
        throw new Error('Asana nicht verbunden');
      }

      const accessToken = this.encryptionService.decrypt(
        credentials.accessTokenEncrypted
      );

      // 2. Projekte von Asana laden
      const config = await this.getConfig(tenantId);
      const asanaProjects = await this.asanaService.getProjects(
        config.workspaceId,
        accessToken
      );

      // 3. Sync durchführen
      let created = 0;
      let updated = 0;
      let archived = 0;

      for (const asanaProject of asanaProjects) {
        const existing = await this.projectRepository.findByAsanaId(
          asanaProject.gid,
          tenantId
        );

        const projectData = this.asanaService.mapToProject(asanaProject, config);

        if (existing) {
          // Update
          await this.projectRepository.update(existing.id, projectData);
          updated++;
        } else {
          // Create
          const project = Project.create({
            ...projectData,
            tenantId,
          });
          await this.projectRepository.save(project);
          created++;
        }

        // Sections als Phasen syncen
        const sections = await this.asanaService.getSections(
          asanaProject.gid,
          accessToken
        );

        for (const section of sections) {
          await this.syncPhase(section, existing?.id || project.id, tenantId);
        }
      }

      // 4. Nicht mehr vorhandene Projekte archivieren
      const localProjects = await this.projectRepository.findByTenant(tenantId);
      const asanaIds = new Set(asanaProjects.map((p) => p.gid));

      for (const local of localProjects) {
        if (local.asanaId && !asanaIds.has(local.asanaId) && !local.isArchived) {
          await this.projectRepository.update(local.id, { isArchived: true });
          archived++;
        }
      }

      // 5. Sync-Log speichern
      log.status = 'success';
      log.completedAt = new Date();
      log.details = { created, updated, archived };
      await this.syncLogRepository.save(log);

      return { success: true, created, updated, archived };
    } catch (error) {
      log.status = 'error';
      log.completedAt = new Date();
      log.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.syncLogRepository.save(log);

      throw error;
    }
  }
}
```

### 🟢 GREEN: Cron Job für Auto-Sync

```typescript
// src/app/api/cron/sync-asana/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = headers().get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();

  // Alle Tenants mit aktiver Asana-Integration
  const { data: credentials } = await supabase
    .from('integration_credentials')
    .select('tenant_id')
    .eq('provider', 'asana');

  const results = [];

  for (const cred of credentials || []) {
    try {
      const useCase = Container.getInstance().resolve<SyncAsanaProjectsUseCase>(
        TOKENS.SyncAsanaProjectsUseCase
      );

      const result = await useCase.execute(cred.tenant_id);
      results.push({ tenantId: cred.tenant_id, ...result });
    } catch (error) {
      results.push({
        tenantId: cred.tenant_id,
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
  }

  return NextResponse.json({ synced: results.length, results });
}
```

---

## Erwartete Dateien

```
src/
├── app/
│   └── api/
│       ├── integrations/
│       │   └── asana/
│       │       ├── authorize/route.ts
│       │       └── callback/route.ts
│       └── cron/
│           └── sync-asana/route.ts
├── infrastructure/
│   └── services/
│       ├── AsanaService.ts
│       ├── EncryptionService.ts
│       └── __tests__/
│           └── AsanaService.test.ts
├── application/
│   ├── ports/
│   │   └── services/
│   │       └── IAsanaService.ts
│   └── use-cases/
│       └── integrations/
│           └── SyncAsanaProjectsUseCase.ts
```

---

## Hinweise

- OAuth 2.0 Flow mit PKCE (wenn von Asana unterstützt)
- Token verschlüsselt in DB speichern
- Refresh Token automatisch erneuern
- Cron Job alle 15 Minuten (via Vercel Cron oder externe)
- Sync-Logs für Debugging
- Custom Fields müssen in Asana konfiguriert werden
- Archivierte Projekte werden nicht gelöscht

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] OAuth Flow funktioniert
- [ ] Projekte werden importiert
- [ ] Custom Fields werden gemappt
- [ ] Sections → Phasen Mapping
- [ ] Auto-Sync alle 15 Minuten
- [ ] Token-Refresh funktioniert
- [ ] Sync-Logs werden geschrieben

---

*Vorheriger Prompt: 19a – Range-Select Multi-Allocation*
*Nächster Prompt: 21 – TimeTac Integration*
