# Prompt 21: TimeTac Integration

**Phase:** 5 – Integrationen
**Komplexität:** L (Large)
**Geschätzte Zeit:** 5-6 Stunden

---

## Kontext

Asana Integration ist implementiert. Jetzt implementieren wir TimeTac für Abwesenheiten und Ist-Zeiten.

**Bereits vorhanden:**
- TimeEntry Entity (aus Prompt 11a)
- Absence Entity
- Encryption Service
- Integration Credentials Repository

---

## Ziel

Implementiere API-Key-basierte Integration mit TimeTac für Abwesenheits- und Zeiterfassungs-Sync.

---

## Referenz-Dokumentation

- `FEATURES.md` – F8.1-F8.5 (TimeTac Integration)
- `API_SPEC.md` – TimeTac Endpoints
- `DATA_MODEL.md` – time_entries, absences

---

## Akzeptanzkriterien

```gherkin
Feature: F8 - TimeTac Integration

Scenario: F8.1 - TimeTac verbinden (API Key)
  Given ich bin Admin
  And bin in Einstellungen > Integrationen
  When ich meinen TimeTac API-Key eingebe
  And auf "Verbinden" klicke
  Then wird die Verbindung getestet
  And bei Erfolg: Key wird verschlüsselt gespeichert
  And ich sehe "TimeTac verbunden"

Scenario: F8.2 - Mitarbeiter aus TimeTac importieren
  Given TimeTac ist verbunden
  When ich auf "Mitarbeiter abgleichen" klicke
  Then werden TimeTac-User geladen
  And ich kann sie bestehenden Mitarbeitern zuordnen
  And die timetac_id wird gespeichert

Scenario: F8.3 - Abwesenheiten synchronisieren
  Given TimeTac ist verbunden
  And Mitarbeiter sind zugeordnet
  When der Sync läuft
  Then werden Abwesenheiten importiert:
    | TimeTac Type | Planned Type |
    | Urlaub       | urlaub       |
    | Krank        | krank        |
    | Feiertag     | feiertag     |
    | Sonstiges    | sonstiges    |

Scenario: F8.4 - Ist-Zeiten synchronisieren
  Given TimeTac ist verbunden
  And Mitarbeiter sind zugeordnet
  When der Sync läuft
  Then werden TimeEntries importiert
  And sie werden als ActualHours in Allocations angezeigt

Scenario: F8.5 - Automatischer Sync
  Given TimeTac ist verbunden
  Then läuft alle 30 Minuten ein Sync-Job
  And neue Abwesenheiten werden hinzugefügt
  And geänderte Zeiten werden aktualisiert

Scenario: API-Key ungültig
  Given ich gebe einen ungültigen API-Key ein
  When ich auf "Verbinden" klicke
  Then sehe ich "Ungültiger API-Key"
  And die Verbindung wird nicht gespeichert
```

---

## Technische Anforderungen

### TimeTac API

```typescript
// Base URL
const TIMETAC_API_BASE = 'https://go.timetac.com/api/v3';

// Auth Header
const headers = {
  Authorization: `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
};
```

### TimeTac Types

```typescript
interface TimeTacUser {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  active: boolean;
}

interface TimeTacAbsence {
  id: number;
  user_id: number;
  absence_type_id: number;
  date_from: string;  // YYYY-MM-DD
  date_to: string;
  hours: number;
  approved: boolean;
}

interface TimeTacAbsenceType {
  id: number;
  name: string;
  // z.B. "Urlaub", "Krank", "Feiertag"
}

interface TimeTacTimeEntry {
  id: number;
  user_id: number;
  date: string;
  task_id?: number;
  project_id?: number;
  duration_hours: number;
  note?: string;
}
```

### Mapping Configuration

```typescript
interface TimeTacSyncConfig {
  absenceTypeMapping: Record<number, AbsenceType>;
  // z.B. { 1: 'urlaub', 2: 'krank', 3: 'feiertag' }
  projectMapping: Record<number, string>;
  // z.B. { 101: 'project-uuid-1' }
}
```

---

## Implementierungsschritte

### 🔴 RED: Test für TimeTac Service

```typescript
// src/infrastructure/services/__tests__/TimeTacService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TimeTacService } from '../TimeTacService';

describe('TimeTacService', () => {
  let service: TimeTacService;
  let mockFetch: vi.Mock;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    service = new TimeTacService();
  });

  it('should validate API key', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 1, name: 'Test Account' } }),
    });

    const isValid = await service.validateApiKey('test-key');

    expect(isValid).toBe(true);
  });

  it('should fetch users', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: [
          { id: 1, firstname: 'Max', lastname: 'Mustermann' },
          { id: 2, firstname: 'Anna', lastname: 'Schmidt' },
        ],
      }),
    });

    const users = await service.getUsers('test-key');

    expect(users).toHaveLength(2);
    expect(users[0].firstname).toBe('Max');
  });

  it('should fetch absences for date range', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: [
          {
            id: 1,
            user_id: 1,
            absence_type_id: 1,
            date_from: '2026-02-02',
            date_to: '2026-02-06',
          },
        ],
      }),
    });

    const absences = await service.getAbsences(
      'test-key',
      new Date('2026-02-01'),
      new Date('2026-02-28')
    );

    expect(absences).toHaveLength(1);
  });
});
```

### 🟢 GREEN: TimeTacService implementieren

```typescript
// src/infrastructure/services/TimeTacService.ts
import { ITimeTacService } from '@/application/ports/services/ITimeTacService';

const TIMETAC_API_BASE = 'https://go.timetac.com/api/v3';

export class TimeTacService implements ITimeTacService {
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await this.request('/account', apiKey);
      return !!response.data;
    } catch {
      return false;
    }
  }

  async getUsers(apiKey: string): Promise<TimeTacUser[]> {
    const response = await this.request('/users', apiKey);
    return response.data;
  }

  async getAbsences(
    apiKey: string,
    startDate: Date,
    endDate: Date
  ): Promise<TimeTacAbsence[]> {
    const params = new URLSearchParams({
      date_from: startDate.toISOString().split('T')[0],
      date_to: endDate.toISOString().split('T')[0],
    });

    const response = await this.request(`/absences?${params}`, apiKey);
    return response.data;
  }

  async getAbsenceTypes(apiKey: string): Promise<TimeTacAbsenceType[]> {
    const response = await this.request('/absence_types', apiKey);
    return response.data;
  }

  async getTimeEntries(
    apiKey: string,
    startDate: Date,
    endDate: Date,
    userId?: number
  ): Promise<TimeTacTimeEntry[]> {
    const params = new URLSearchParams({
      date_from: startDate.toISOString().split('T')[0],
      date_to: endDate.toISOString().split('T')[0],
    });
    if (userId) {
      params.set('user_id', String(userId));
    }

    const response = await this.request(`/time_entries?${params}`, apiKey);
    return response.data;
  }

  mapAbsenceType(timetacTypeId: number, config: TimeTacSyncConfig): AbsenceType {
    return config.absenceTypeMapping[timetacTypeId] || 'sonstiges';
  }

  private async request(path: string, apiKey: string): Promise<any> {
    const response = await fetch(`${TIMETAC_API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('TIMETAC_INVALID_API_KEY');
      }
      throw new Error(`TimeTac API error: ${response.status}`);
    }

    return response.json();
  }
}
```

### 🟢 GREEN: ConnectTimeTacUseCase

```typescript
// src/application/use-cases/integrations/ConnectTimeTacUseCase.ts
export class ConnectTimeTacUseCase {
  constructor(
    private timetacService: ITimeTacService,
    private credentialsRepository: IIntegrationCredentialsRepository,
    private encryptionService: IEncryptionService
  ) {}

  async execute(tenantId: string, apiKey: string): Promise<void> {
    // 1. API-Key validieren
    const isValid = await this.timetacService.validateApiKey(apiKey);
    if (!isValid) {
      throw new ValidationError('Ungültiger API-Key');
    }

    // 2. Verschlüsselt speichern
    const encryptedKey = this.encryptionService.encrypt(apiKey);

    await this.credentialsRepository.upsert({
      tenantId,
      provider: 'timetac',
      accessTokenEncrypted: encryptedKey,
      refreshTokenEncrypted: null,
      expiresAt: null, // API-Keys laufen nicht ab
    });
  }
}
```

### 🟢 GREEN: SyncAbsencesUseCase

```typescript
// src/application/use-cases/integrations/SyncTimeTacAbsencesUseCase.ts
export class SyncTimeTacAbsencesUseCase {
  constructor(
    private timetacService: ITimeTacService,
    private absenceRepository: IAbsenceRepository,
    private userRepository: IUserRepository,
    private credentialsRepository: IIntegrationCredentialsRepository,
    private syncLogRepository: ISyncLogRepository,
    private encryptionService: IEncryptionService
  ) {}

  async execute(tenantId: string, dateRange?: { start: Date; end: Date }): Promise<SyncResult> {
    const log: SyncLogEntry = {
      id: crypto.randomUUID(),
      tenantId,
      provider: 'timetac',
      syncType: 'absences',
      startedAt: new Date(),
      status: 'running',
    };

    try {
      // 1. Credentials laden
      const credentials = await this.credentialsRepository.findByTenantAndProvider(
        tenantId,
        'timetac'
      );

      if (!credentials) {
        throw new Error('TimeTac nicht verbunden');
      }

      const apiKey = this.encryptionService.decrypt(credentials.accessTokenEncrypted);

      // 2. User-Mapping laden
      const users = await this.userRepository.findByTenantWithTimeTacId(tenantId);
      const userMap = new Map(users.map((u) => [u.timetacId, u.id]));

      // 3. Date Range (Default: nächste 3 Monate)
      const startDate = dateRange?.start || new Date();
      const endDate = dateRange?.end || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

      // 4. Abwesenheiten von TimeTac laden
      const timetacAbsences = await this.timetacService.getAbsences(
        apiKey,
        startDate,
        endDate
      );

      const config = await this.getConfig(tenantId);

      // 5. Sync
      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const ttAbsence of timetacAbsences) {
        const userId = userMap.get(ttAbsence.user_id);
        if (!userId) {
          skipped++;
          continue;
        }

        const existing = await this.absenceRepository.findByTimetacId(
          ttAbsence.id,
          tenantId
        );

        const absenceData = {
          timetacId: ttAbsence.id,
          userId,
          tenantId,
          type: this.timetacService.mapAbsenceType(ttAbsence.absence_type_id, config),
          startDate: new Date(ttAbsence.date_from),
          endDate: new Date(ttAbsence.date_to),
          isApproved: ttAbsence.approved,
        };

        if (existing) {
          await this.absenceRepository.update(existing.id, absenceData);
          updated++;
        } else {
          const absence = Absence.create(absenceData);
          await this.absenceRepository.save(absence);
          created++;
        }
      }

      log.status = 'success';
      log.completedAt = new Date();
      log.details = { created, updated, skipped };
      await this.syncLogRepository.save(log);

      return { success: true, created, updated, skipped };
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

### 🟢 GREEN: SyncTimeEntriesUseCase

```typescript
// src/application/use-cases/integrations/SyncTimeTacTimeEntriesUseCase.ts
export class SyncTimeTacTimeEntriesUseCase {
  constructor(
    private timetacService: ITimeTacService,
    private timeEntryRepository: ITimeEntryRepository,
    private userRepository: IUserRepository,
    private credentialsRepository: IIntegrationCredentialsRepository,
    private syncLogRepository: ISyncLogRepository,
    private encryptionService: IEncryptionService
  ) {}

  async execute(tenantId: string, dateRange?: { start: Date; end: Date }): Promise<SyncResult> {
    // Similar to SyncAbsencesUseCase...
    // Maps TimeTac time entries to TimeEntry entities
    // TimeEntry.timetacId is required as per Prompt 11a

    const apiKey = this.encryptionService.decrypt(
      (await this.credentialsRepository.findByTenantAndProvider(tenantId, 'timetac'))!
        .accessTokenEncrypted
    );

    const users = await this.userRepository.findByTenantWithTimeTacId(tenantId);
    const userMap = new Map(users.map((u) => [u.timetacId, u.id]));

    const startDate = dateRange?.start || new Date();
    const endDate = dateRange?.end || new Date();

    const timeEntries = await this.timetacService.getTimeEntries(apiKey, startDate, endDate);

    let created = 0;
    let updated = 0;

    for (const entry of timeEntries) {
      const userId = userMap.get(entry.user_id);
      if (!userId) continue;

      const existing = await this.timeEntryRepository.findByTimetacId(entry.id, tenantId);

      const entryData = {
        timetacId: entry.id,
        userId,
        tenantId,
        date: new Date(entry.date),
        hours: entry.duration_hours,
        notes: entry.note,
      };

      if (existing) {
        await this.timeEntryRepository.update(existing.id, entryData);
        updated++;
      } else {
        const timeEntry = TimeEntry.create(entryData);
        await this.timeEntryRepository.save(timeEntry);
        created++;
      }
    }

    return { success: true, created, updated, skipped: 0 };
  }
}
```

### 🟢 GREEN: User Mapping UI

```typescript
// src/presentation/components/settings/TimeTacUserMapping.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTimeTacUsers, mapUserToTimeTac } from '@/presentation/actions/integrations';
import { getUsers } from '@/presentation/actions/users';
import { Select } from '@/presentation/components/ui/select';
import { Button } from '@/presentation/components/ui/button';
import { toast } from 'sonner';

export function TimeTacUserMapping() {
  const queryClient = useQueryClient();

  const { data: localUsers } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });

  const { data: timetacUsers } = useQuery({
    queryKey: ['timetac', 'users'],
    queryFn: getTimeTacUsers,
  });

  const mapMutation = useMutation({
    mutationFn: ({ userId, timetacId }: { userId: string; timetacId: number }) =>
      mapUserToTimeTac(userId, timetacId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Zuordnung gespeichert');
    },
  });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Mitarbeiter-Zuordnung</h3>
      <p className="text-sm text-gray-500">
        Ordnen Sie Ihre Mitarbeiter den entsprechenden TimeTac-Benutzern zu.
      </p>

      <div className="space-y-2">
        {localUsers?.data?.map((user) => (
          <div key={user.id} className="flex items-center gap-4 py-2">
            <span className="w-40 truncate">{user.fullName}</span>
            <Select
              value={user.timetacId?.toString() || ''}
              onValueChange={(value) =>
                mapMutation.mutate({
                  userId: user.id,
                  timetacId: parseInt(value),
                })
              }
            >
              <option value="">Nicht zugeordnet</option>
              {timetacUsers?.data?.map((ttUser) => (
                <option key={ttUser.id} value={ttUser.id}>
                  {ttUser.firstname} {ttUser.lastname}
                </option>
              ))}
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Erwartete Dateien

```
src/
├── infrastructure/
│   └── services/
│       ├── TimeTacService.ts
│       └── __tests__/
│           └── TimeTacService.test.ts
├── application/
│   ├── ports/
│   │   └── services/
│   │       └── ITimeTacService.ts
│   └── use-cases/
│       └── integrations/
│           ├── ConnectTimeTacUseCase.ts
│           ├── SyncTimeTacAbsencesUseCase.ts
│           └── SyncTimeTacTimeEntriesUseCase.ts
├── presentation/
│   ├── actions/
│   │   └── integrations.ts  # Erweitert
│   └── components/
│       └── settings/
│           └── TimeTacUserMapping.tsx
└── app/
    └── api/
        └── cron/
            └── sync-timetac/route.ts
```

---

## Hinweise

- API-Key-basierte Auth (kein OAuth)
- User müssen manuell gemappt werden (timetac_id)
- Abwesenheitstypen konfigurierbar
- Sync alle 30 Minuten
- TimeEntry.timetacId ist required (aus Prompt 11a)
- Gelöschte Einträge in TimeTac werden NICHT gelöscht (soft-delete)

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] API-Key Validierung funktioniert
- [ ] User-Mapping funktioniert
- [ ] Abwesenheiten werden importiert
- [ ] TimeEntries werden importiert
- [ ] Auto-Sync alle 30 Minuten
- [ ] Sync-Logs werden geschrieben

---

*Vorheriger Prompt: 20 – Asana Integration*
*Nächster Prompt: 22 – Absence Sync*
