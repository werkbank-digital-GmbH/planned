# planned. – Integrationen

> Asana API-Details, Sync-Logik und Mapping

**Version:** 1.4
**Datum:** 01. Februar 2026

> **HINWEIS:** TimeTac wurde entfernt. Ist-Stunden und Abwesenheiten kommen künftig aus Asana.

---

## Übersicht

```
┌─────────────────────────────────────────────────────────────────┐
│                         planned.                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────┐           │
│  │                    ASANA                         │           │
│  │              (Bidirektional)                     │           │
│  │                                                  │           │
│  │  ↓ Projekte          ↑ Phasen-Dates             │           │
│  │  ↓ Phasen/Tasks      ↑ Phasen-Stunden           │           │
│  │  ↓ Abwesenheiten     (planned)                  │           │
│  │  ↓ IST-Stunden                                  │           │
│  └─────────────────────────────────────────────────┘           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    SYNC ENGINE                           │   │
│  │  • Webhook Handler    • Cron Jobs    • Queue/Debounce   │   │
│  │  • Conflict Resolution • Error Recovery • Logging       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Asana Integration

### 1.1 Übersicht

| Aspekt | Details |
|--------|---------|
| **Richtung** | Bidirektional |
| **Authentifizierung** | OAuth 2.0 |
| **Token Refresh** | Automatisch via Cron (alle 6h) |
| **Konfliktauflösung** | Last-Write-Wins mit Timestamp |
| **Sync-Trigger** | Webhook (primary) + Cron (fallback) |
| **Debounce** | 5 Sekunden für Outbound-Sync |
| **Rate Limits** | 1500 Requests/Minute |

### 1.2 Asana App Konfiguration

Die Asana-App wird in der [Asana Developer Console](https://app.asana.com/0/my-apps) erstellt und konfiguriert.

**App-Credentials (aus Asana Developer Console):**

| Wert | Beschreibung |
|------|--------------|
| **Client ID** | `1212961742614376` |
| **Client Secret** | `3f81c4cd04588073f0fb343b825f1496` |
| **Redirect URI** | `https://app.planned.de/api/auth/asana/callback` |

**Wichtig:** Diese Werte müssen als Environment Variables konfiguriert werden:
```env
ASANA_CLIENT_ID=1212961742614376
ASANA_CLIENT_SECRET=3f81c4cd04588073f0fb343b825f1496
ASANA_REDIRECT_URI=https://app.planned.de/api/auth/asana/callback
```

### 1.3 OAuth Flow

```typescript
// src/infrastructure/services/AsanaAuthService.ts

class AsanaAuthService {
  private readonly CLIENT_ID = process.env.ASANA_CLIENT_ID;
  private readonly CLIENT_SECRET = process.env.ASANA_CLIENT_SECRET;
  private readonly REDIRECT_URI = process.env.ASANA_REDIRECT_URI;
  
  // ═══════════════════════════════════════════════════════════════
  // STEP 1: Authorization URL generieren
  // ═══════════════════════════════════════════════════════════════
  
  generateAuthorizationUrl(tenantId: string): string {
    // State enthält Tenant-ID für Callback-Zuordnung (encrypted)
    const state = this.encryptState({ tenantId, timestamp: Date.now() });
    
    const params = new URLSearchParams({
      client_id: this.CLIENT_ID,
      redirect_uri: this.REDIRECT_URI,
      response_type: 'code',
      state,
      // Wichtig: Refresh Token anfordern
      access_type: 'offline',
    });
    
    return `https://app.asana.com/-/oauth_authorize?${params}`;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // STEP 2: Authorization Code gegen Token tauschen
  // ═══════════════════════════════════════════════════════════════
  
  async exchangeCodeForToken(code: string): Promise<AsanaToken> {
    const response = await fetch('https://app.asana.com/-/oauth_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.CLIENT_ID,
        client_secret: this.CLIENT_SECRET,
        redirect_uri: this.REDIRECT_URI,
        code,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new AsanaAuthError(`Token exchange failed: ${error.error_description}`);
    }
    
    const token = await response.json();
    
    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: new Date(Date.now() + token.expires_in * 1000),
      tokenType: token.token_type,
    };
  }
  
  // ═══════════════════════════════════════════════════════════════
  // STEP 3: Token Refresh (automatisch via Cron)
  // ═══════════════════════════════════════════════════════════════
  
  async refreshAccessToken(refreshToken: string): Promise<AsanaToken> {
    const response = await fetch('https://app.asana.com/-/oauth_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.CLIENT_ID,
        client_secret: this.CLIENT_SECRET,
        refresh_token: refreshToken,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      // Bei invalid_grant: User muss neu autorisieren
      if (error.error === 'invalid_grant') {
        throw new AsanaReauthorizationRequired();
      }
      throw new AsanaAuthError(`Token refresh failed: ${error.error_description}`);
    }
    
    const token = await response.json();
    
    return {
      accessToken: token.access_token,
      // Asana gibt bei Refresh keinen neuen Refresh Token
      refreshToken: refreshToken,
      expiresAt: new Date(Date.now() + token.expires_in * 1000),
      tokenType: token.token_type,
    };
  }
}

interface AsanaToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  tokenType: string;
}
```

---

## 2. Asana Onboarding-Flow (NEU)

Der Onboarding-Flow führt den Admin durch die vollständige Einrichtung der Asana-Integration.

### 2.1 Flow-Übersicht

```
┌─────────────────────────────────────────────────────────────────┐
│                    ASANA ONBOARDING FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STEP 1: OAuth Verbindung                                       │
│  ────────────────────────                                       │
│  [Mit Asana verbinden] → OAuth → Callback → Token speichern     │
│                                                                 │
│  STEP 2: Workspace auswählen                                    │
│  ────────────────────────────                                   │
│  Workspaces laden → User wählt Workspace → ID speichern         │
│                                                                 │
│  STEP 3: Custom Fields zuordnen                                 │
│  ─────────────────────────────                                  │
│  Alle Felder laden → Anzeigen → User mappt → IDs speichern      │
│                                                                 │
│  STEP 4: Initial Sync                                           │
│  ────────────────────                                           │
│  Projekte & Phasen importieren → Fortschritt anzeigen           │
│                                                                 │
│  STEP 5: Webhook aktivieren                                     │
│  ──────────────────────────                                     │
│  Webhook registrieren → Secret speichern → Bestätigung          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Step 1: OAuth Verbindung

```typescript
// src/presentation/actions/integrations/asana.ts

/**
 * Generiert die Asana OAuth URL und leitet den User weiter.
 */
export async function getAsanaAuthUrl(): Promise<ActionResult<{ url: string }>> {
  return withActionHandler({
    requiredRole: ['admin'],
    handler: async (_, { tenantId }) => {
      const authService = new AsanaAuthService();
      const url = authService.generateAuthorizationUrl(tenantId);
      return success({ url });
    },
  })({});
}

/**
 * Callback-Handler für Asana OAuth.
 * Wird von /api/auth/asana/callback aufgerufen.
 */
export async function handleAsanaCallback(
  code: string,
  state: string
): Promise<ActionResult<void>> {
  // State entschlüsseln und Tenant-ID extrahieren
  const { tenantId } = decryptState(state);
  
  // Token tauschen
  const authService = new AsanaAuthService();
  const token = await authService.exchangeCodeForToken(code);
  
  // Token verschlüsselt speichern
  await credentialsRepo.update(tenantId, {
    asanaAccessToken: encrypt(token.accessToken),
    asanaRefreshToken: encrypt(token.refreshToken),
    asanaTokenExpiresAt: token.expiresAt,
  });
  
  return success(undefined);
}
```

### 2.3 Step 2: Workspace auswählen

```typescript
// src/presentation/actions/integrations/asana.ts

interface AsanaWorkspace {
  gid: string;
  name: string;
}

/**
 * Lädt alle Workspaces des verbundenen Asana-Users.
 */
export async function getAsanaWorkspaces(): Promise<ActionResult<AsanaWorkspace[]>> {
  return withActionHandler({
    requiredRole: ['admin'],
    handler: async (_, { tenantId }) => {
      const credentials = await credentialsRepo.findByTenant(tenantId);
      
      if (!credentials?.asanaAccessToken) {
        return failure('INTEGRATION_NOT_CONFIGURED', 'Asana ist nicht verbunden.');
      }
      
      const accessToken = decrypt(credentials.asanaAccessToken);
      const workspaces = await asanaClient.getWorkspaces(accessToken);
      
      return success(workspaces);
    },
  })({});
}

/**
 * Speichert den ausgewählten Workspace.
 */
export async function selectAsanaWorkspace(
  workspaceId: string
): Promise<ActionResult<void>> {
  return withActionHandler({
    requiredRole: ['admin'],
    schema: z.object({ workspaceId: z.string().min(1) }),
    handler: async ({ workspaceId }, { tenantId }) => {
      await credentialsRepo.update(tenantId, {
        asanaWorkspaceId: workspaceId,
      });
      
      return success(undefined);
    },
  })({ workspaceId });
}
```

### 2.4 Step 3: Custom Fields zuordnen

**Kritisch:** Dieser Schritt holt ALLE Custom Fields aus Asana und zeigt sie dem User zur Zuordnung an.

```typescript
// src/presentation/actions/integrations/asana.ts

interface AsanaCustomField {
  gid: string;
  name: string;
  type: 'text' | 'number' | 'enum' | 'multi_enum' | 'date';
  enumOptions?: { gid: string; name: string; color: string }[];
  description?: string;
}

interface CustomFieldsResponse {
  allFields: AsanaCustomField[];
  suggestions: {
    bereich: AsanaCustomField | null;
    budgetHours: AsanaCustomField | null;
  };
  currentMappings: {
    bereichFieldId: string | null;
    budgetHoursFieldId: string | null;
  };
}

/**
 * Lädt ALLE Custom Fields aus dem ausgewählten Asana Workspace.
 * Gibt auch automatische Vorschläge für bekannte Feldnamen zurück.
 */
export async function getAsanaCustomFields(): Promise<ActionResult<CustomFieldsResponse>> {
  return withActionHandler({
    requiredRole: ['admin'],
    handler: async (_, { tenantId }) => {
      const credentials = await credentialsRepo.findByTenant(tenantId);
      
      if (!credentials?.asanaAccessToken || !credentials?.asanaWorkspaceId) {
        return failure('INTEGRATION_NOT_CONFIGURED', 'Asana Workspace nicht ausgewählt.');
      }
      
      const accessToken = decrypt(credentials.asanaAccessToken);
      
      // Alle Custom Fields aus dem Workspace laden
      const allFields = await asanaClient.getCustomFieldsForWorkspace(
        accessToken,
        credentials.asanaWorkspaceId
      );
      
      // Automatische Vorschläge basierend auf Feldnamen
      const suggestions = {
        bereich: findBestMatch(allFields, [
          'bereich',
          'area',
          'arbeitsbereich',
          'produktion/montage',
        ], 'enum'),
        budgetHours: findBestMatch(allFields, [
          'soll-stunden',
          'sollstunden',
          'budget',
          'stunden',
          'hours',
          'aufwand',
        ], 'number'),
      };
      
      // Aktuelle Mappings (falls bereits konfiguriert)
      const currentMappings = {
        bereichFieldId: credentials.asanaPhaseBereichFieldId,
        budgetHoursFieldId: credentials.asanaPhaseBudgetHoursFieldId,
      };
      
      return success({
        allFields,
        suggestions,
        currentMappings,
      });
    },
  })({});
}

/**
 * Findet das beste passende Custom Field basierend auf Namen.
 */
function findBestMatch(
  fields: AsanaCustomField[],
  searchTerms: string[],
  expectedType: string
): AsanaCustomField | null {
  // Erst exakte Matches (case-insensitive)
  for (const term of searchTerms) {
    const exactMatch = fields.find(
      f => f.name.toLowerCase() === term.toLowerCase() && f.type === expectedType
    );
    if (exactMatch) return exactMatch;
  }
  
  // Dann partielle Matches
  for (const term of searchTerms) {
    const partialMatch = fields.find(
      f => f.name.toLowerCase().includes(term.toLowerCase()) && f.type === expectedType
    );
    if (partialMatch) return partialMatch;
  }
  
  return null;
}
```

### 2.5 UI-Komponente: Custom Field Mapping

```typescript
// src/presentation/components/settings/AsanaFieldMapping.tsx

interface AsanaFieldMappingProps {
  fields: CustomFieldsResponse;
  onSave: (mappings: FieldMappingInput) => Promise<void>;
}

export function AsanaFieldMapping({ fields, onSave }: AsanaFieldMappingProps) {
  const [bereichFieldId, setBereichFieldId] = useState(
    fields.currentMappings.bereichFieldId || fields.suggestions.bereich?.gid || ''
  );
  const [budgetHoursFieldId, setBudgetHoursFieldId] = useState(
    fields.currentMappings.budgetHoursFieldId || fields.suggestions.budgetHours?.gid || ''
  );
  
  // Nur Enum-Felder für Bereich
  const enumFields = fields.allFields.filter(f => f.type === 'enum');
  // Nur Number-Felder für Budget
  const numberFields = fields.allFields.filter(f => f.type === 'number');
  
  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="font-medium text-amber-900">Custom Fields zuordnen</h3>
        <p className="text-sm text-amber-700 mt-1">
          Wählen Sie die Asana-Felder aus, die für die Planung verwendet werden sollen.
          Diese Felder müssen auf Task-Ebene (Arbeitspakete) in Asana existieren.
        </p>
      </div>
      
      {/* Bereich-Feld */}
      <div>
        <Label htmlFor="bereich-field">
          Bereich (Produktion/Montage) *
        </Label>
        <p className="text-sm text-muted-foreground mb-2">
          Dropdown-Feld mit Optionen wie "Produktion" und "Montage"
        </p>
        <Select value={bereichFieldId} onValueChange={setBereichFieldId}>
          <SelectTrigger id="bereich-field">
            <SelectValue placeholder="Feld auswählen..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Nicht zuordnen</SelectItem>
            {enumFields.map(field => (
              <SelectItem key={field.gid} value={field.gid}>
                <div className="flex items-center gap-2">
                  <span>{field.name}</span>
                  {field.gid === fields.suggestions.bereich?.gid && (
                    <Badge variant="outline" className="text-xs">Empfohlen</Badge>
                  )}
                </div>
                {field.enumOptions && (
                  <span className="text-xs text-muted-foreground ml-2">
                    ({field.enumOptions.map(o => o.name).join(', ')})
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Enum-Werte Mapping anzeigen wenn Feld gewählt */}
        {bereichFieldId && (
          <EnumValueMapping
            fieldId={bereichFieldId}
            fields={fields.allFields}
            targetValues={['Produktion', 'Montage']}
          />
        )}
      </div>
      
      {/* Budget-Stunden-Feld */}
      <div>
        <Label htmlFor="budget-field">
          Soll-Stunden (Budget)
        </Label>
        <p className="text-sm text-muted-foreground mb-2">
          Zahlenfeld für die geplanten Stunden pro Arbeitspaket
        </p>
        <Select value={budgetHoursFieldId} onValueChange={setBudgetHoursFieldId}>
          <SelectTrigger id="budget-field">
            <SelectValue placeholder="Feld auswählen..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Nicht zuordnen</SelectItem>
            {numberFields.map(field => (
              <SelectItem key={field.gid} value={field.gid}>
                <div className="flex items-center gap-2">
                  <span>{field.name}</span>
                  {field.gid === fields.suggestions.budgetHours?.gid && (
                    <Badge variant="outline" className="text-xs">Empfohlen</Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Keine passenden Felder Warnung */}
      {enumFields.length === 0 && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Keine Dropdown-Felder gefunden</AlertTitle>
          <AlertDescription>
            Es wurden keine Dropdown-Custom-Fields in Ihrem Asana-Workspace gefunden.
            Bitte erstellen Sie ein Custom Field "Bereich" mit den Optionen "Produktion" und "Montage".
          </AlertDescription>
        </Alert>
      )}
      
      <Button 
        onClick={() => onSave({ bereichFieldId, budgetHoursFieldId })}
        disabled={!bereichFieldId}
      >
        Speichern und fortfahren
      </Button>
    </div>
  );
}

/**
 * Zeigt die Enum-Werte eines Feldes und ermöglicht das Mapping.
 */
function EnumValueMapping({ fieldId, fields, targetValues }: {
  fieldId: string;
  fields: AsanaCustomField[];
  targetValues: string[];
}) {
  const field = fields.find(f => f.gid === fieldId);
  if (!field?.enumOptions) return null;
  
  return (
    <div className="mt-3 p-3 bg-muted rounded-lg">
      <p className="text-sm font-medium mb-2">Werte-Zuordnung:</p>
      <div className="space-y-2">
        {field.enumOptions.map(option => {
          const matchedTarget = targetValues.find(
            t => option.name.toLowerCase().includes(t.toLowerCase())
          );
          return (
            <div key={option.gid} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: option.color || '#888' }}
              />
              <span>{option.name}</span>
              <span className="text-muted-foreground">→</span>
              <span className={matchedTarget ? 'text-green-600' : 'text-amber-600'}>
                {matchedTarget || 'Wird ignoriert'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### 2.6 Field Mapping speichern

```typescript
// src/presentation/actions/integrations/asana.ts

interface FieldMappingInput {
  bereichFieldId: string | null;
  budgetHoursFieldId: string | null;
}

/**
 * Speichert die Custom Field Zuordnungen.
 */
export async function saveAsanaFieldMappings(
  data: FieldMappingInput
): Promise<ActionResult<void>> {
  return withActionHandler({
    requiredRole: ['admin'],
    handler: async (data, { tenantId }) => {
      await credentialsRepo.update(tenantId, {
        asanaPhaseBereichFieldId: data.bereichFieldId || null,
        asanaPhaseBudgetHoursFieldId: data.budgetHoursFieldId || null,
      });
      
      return success(undefined);
    },
  })(data);
}
```

### 2.7 Step 4: Initial Sync

```typescript
// src/presentation/actions/integrations/asana.ts

interface SyncProgress {
  status: 'running' | 'completed' | 'failed';
  totalProjects: number;
  processedProjects: number;
  totalPhases: number;
  processedPhases: number;
  errors: string[];
}

/**
 * Startet den initialen Sync aller Projekte aus Asana.
 * Gibt eine Sync-Log-ID zurück zum Tracking des Fortschritts.
 */
export async function startAsanaInitialSync(): Promise<ActionResult<{ syncLogId: string }>> {
  return withActionHandler({
    requiredRole: ['admin'],
    handler: async (_, { tenantId }) => {
      const credentials = await credentialsRepo.findByTenant(tenantId);
      
      if (!credentials?.asanaAccessToken || !credentials?.asanaWorkspaceId) {
        return failure('INTEGRATION_NOT_CONFIGURED', 'Asana ist nicht vollständig konfiguriert.');
      }
      
      // Sync-Log erstellen
      const syncLog = await syncLogRepo.create({
        tenantId,
        service: 'asana',
        operation: 'initial_sync',
        status: 'running',
      });
      
      // Sync im Hintergrund starten (nicht blockierend)
      asanaSyncService.syncFromAsana(tenantId)
        .then(result => {
          syncLogRepo.update(syncLog.id, {
            status: result.errors.length > 0 ? 'partial' : 'success',
            result,
            completedAt: new Date(),
          });
        })
        .catch(error => {
          syncLogRepo.update(syncLog.id, {
            status: 'failed',
            errorMessage: error.message,
            completedAt: new Date(),
          });
        });
      
      return success({ syncLogId: syncLog.id });
    },
  })({});
}

/**
 * Prüft den Fortschritt eines laufenden Syncs.
 */
export async function getAsanaSyncProgress(
  syncLogId: string
): Promise<ActionResult<SyncProgress>> {
  return withActionHandler({
    requiredRole: ['admin'],
    handler: async ({ syncLogId }, { tenantId }) => {
      const syncLog = await syncLogRepo.findById(syncLogId);
      
      if (!syncLog || syncLog.tenantId !== tenantId) {
        return failure('NOT_FOUND', 'Sync-Log nicht gefunden.');
      }
      
      return success({
        status: syncLog.status,
        totalProjects: syncLog.result?.totalProjects || 0,
        processedProjects: syncLog.result?.processedProjects || 0,
        totalPhases: syncLog.result?.totalPhases || 0,
        processedPhases: syncLog.result?.processedPhases || 0,
        errors: syncLog.result?.errors || [],
      });
    },
  })({ syncLogId });
}
```

### 2.8 Step 5: Webhook aktivieren

```typescript
// src/presentation/actions/integrations/asana.ts

/**
 * Registriert den Asana Webhook für Echtzeit-Updates.
 */
export async function activateAsanaWebhook(): Promise<ActionResult<void>> {
  return withActionHandler({
    requiredRole: ['admin'],
    handler: async (_, { tenantId }) => {
      const credentials = await credentialsRepo.findByTenant(tenantId);
      
      if (!credentials?.asanaAccessToken || !credentials?.asanaWorkspaceId) {
        return failure('INTEGRATION_NOT_CONFIGURED', 'Asana ist nicht vollständig konfiguriert.');
      }
      
      const accessToken = decrypt(credentials.asanaAccessToken);
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/asana`;
      
      try {
        // Webhook für Workspace registrieren
        const webhook = await asanaClient.createWebhook(
          accessToken,
          credentials.asanaWorkspaceId,
          webhookUrl
        );
        
        // Webhook Secret speichern (für Signature Verification)
        // HINWEIS: Asana generiert das Secret bei der Webhook-Erstellung
        await credentialsRepo.update(tenantId, {
          asanaWebhookSecret: webhook.secret,
        });
        
        return success(undefined);
        
      } catch (error) {
        if (error.message?.includes('already exists')) {
          // Webhook existiert bereits - das ist OK
          return success(undefined);
        }
        throw error;
      }
    },
  })({});
}
```

---

## 3. Webhooks

### 3.1 Webhook Secret Handling

**Wichtig:** Das Webhook Secret wird von Asana generiert, NICHT von uns!

```
┌─────────────────────────────────────────────────────────────────┐
│                   WEBHOOK SECRET LIFECYCLE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. planned. ruft Asana API auf: POST /webhooks                     │
│     {                                                           │
│       "resource": "workspace_id",                               │
│       "target": "https://app.planned.de/api/webhooks/asana"       │
│     }                                                           │
│                                                                 │
│  2. Asana antwortet mit:                                        │
│     {                                                           │
│       "gid": "webhook_id",                                      │
│       "secret": "abc123..." ← VON ASANA GENERIERT               │
│     }                                                           │
│                                                                 │
│  3. planned. speichert Secret in DB:                                │
│     integration_credentials.asana_webhook_secret = "abc123..."  │
│                                                                 │
│  4. Bei jedem Webhook-Event:                                    │
│     - Asana sendet Header: X-Hook-Signature                     │
│     - planned. verifiziert mit gespeichertem Secret                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Webhook Signature Verification

```typescript
// src/app/api/webhooks/asana/route.ts

import { createHmac } from 'crypto';

export async function POST(request: Request) {
  const body = await request.text();
  
  // ═══════════════════════════════════════════════════════════════
  // HANDSHAKE: Webhook-Registrierung bestätigen
  // ═══════════════════════════════════════════════════════════════
  
  const hookSecret = request.headers.get('X-Hook-Secret');
  if (hookSecret) {
    // Asana sendet diesen Header bei der Registrierung
    // Wir müssen ihn einfach zurücksenden
    return new Response(null, {
      status: 200,
      headers: { 'X-Hook-Secret': hookSecret },
    });
  }
  
  // ═══════════════════════════════════════════════════════════════
  // SIGNATURE VERIFICATION
  // ═══════════════════════════════════════════════════════════════
  
  const signature = request.headers.get('X-Hook-Signature');
  if (!signature) {
    console.error('Webhook request without signature');
    return new Response('Missing signature', { status: 401 });
  }
  
  // Tenant aus Webhook-Resource ermitteln
  const { events } = JSON.parse(body);
  if (!events?.length) {
    return new Response(null, { status: 200 });
  }
  
  // Webhook Secret aus DB laden (basierend auf Resource)
  const resourceGid = events[0]?.resource?.gid || events[0]?.parent?.gid;
  const credentials = await findCredentialsByAsanaResource(resourceGid);
  
  if (!credentials?.asanaWebhookSecret) {
    console.error('Webhook secret not found for resource:', resourceGid);
    return new Response('Unknown resource', { status: 404 });
  }
  
  // Signature prüfen: HMAC-SHA256 des Body mit Secret
  const expectedSignature = createHmac('sha256', credentials.asanaWebhookSecret)
    .update(body)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    console.error('Invalid webhook signature');
    return new Response('Invalid signature', { status: 401 });
  }
  
  // ═══════════════════════════════════════════════════════════════
  // EVENTS VERARBEITEN
  // ═══════════════════════════════════════════════════════════════
  
  for (const event of events) {
    await processAsanaEvent(event, credentials.tenantId);
  }
  
  return new Response(null, { status: 200 });
}
```

### 3.3 Webhook Event Processing

```typescript
async function processAsanaEvent(
  event: AsanaWebhookEvent,
  tenantId: string
): Promise<void> {
  const { resource, action, parent } = event;
  
  console.log(`[Asana Webhook] ${action} on ${resource.resource_type} ${resource.gid}`);
  
  switch (resource.resource_type) {
    case 'project':
      await handleProjectEvent(resource.gid, action, tenantId);
      break;
      
    case 'task':
      await handleTaskEvent(resource.gid, action, parent?.gid, tenantId);
      break;
  }
}

async function handleProjectEvent(
  projectGid: string,
  action: string,
  tenantId: string
): Promise<void> {
  switch (action) {
    case 'changed':
    case 'added':
      // Projekt-Sync in Queue stellen (debounced)
      await syncQueue.enqueue({
        type: 'project_from_asana',
        tenantId,
        payload: { asanaProjectId: projectGid },
      });
      break;
      
    case 'deleted':
    case 'removed':
      await projectRepo.softDeleteByAsanaGid(tenantId, projectGid);
      break;
  }
}

interface AsanaWebhookEvent {
  action: 'added' | 'changed' | 'deleted' | 'removed' | 'undeleted';
  resource: {
    gid: string;
    resource_type: 'project' | 'task' | 'story';
  };
  parent?: {
    gid: string;
    resource_type: string;
  };
}
```

---

## 4. Cron Jobs

### 5.1 Konfiguration (vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/cron/refresh-asana-tokens",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/sync-timetac-absences",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/sync-timetac-hours",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/sync-asana",
      "schedule": "0 5 * * *"
    },
    {
      "path": "/api/cron/cleanup-sync-logs",
      "schedule": "0 3 * * 0"
    }
  ]
}
```

### 5.2 Cron Endpoint Template

```typescript
// src/app/api/cron/refresh-asana-tokens/route.ts

export async function GET(request: Request) {
  // 1. Cron Secret verifizieren
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // 2. Job ausführen
  const results = await asanaAuthService.refreshExpiringTokens();
  
  return Response.json({ 
    success: true, 
    results,
    timestamp: new Date().toISOString(),
  });
}
```

---

## 6. Environment Variables

```env
# ═══════════════════════════════════════════════════════════════
# ASANA
# ═══════════════════════════════════════════════════════════════
ASANA_CLIENT_ID=1212961742614376
ASANA_CLIENT_SECRET=3f81c4cd04588073f0fb343b825f1496
ASANA_REDIRECT_URI=https://app.planned.de/api/auth/asana/callback

# ═══════════════════════════════════════════════════════════════
# TIMETAC
# Credentials werden pro Tenant in DB gespeichert (verschlüsselt)
# ═══════════════════════════════════════════════════════════════
# (keine globalen Env Vars nötig)

# ═══════════════════════════════════════════════════════════════
# CRON JOBS
# ═══════════════════════════════════════════════════════════════
CRON_SECRET=your-super-secret-cron-key-min-32-chars

# ═══════════════════════════════════════════════════════════════
# ENCRYPTION (für Token-Speicherung)
# Generieren: openssl rand -hex 32
# ═══════════════════════════════════════════════════════════════
ENCRYPTION_KEY=64-char-hex-string-for-aes-256-encryption
```

---

## 7. Integration Status Dashboard

```typescript
// src/presentation/actions/integrations/status.ts

interface IntegrationStatus {
  asana: {
    isConnected: boolean;
    workspaceName: string | null;
    lastSyncAt: Date | null;
    lastSyncStatus: 'success' | 'partial' | 'failed' | null;
    tokenExpiresAt: Date | null;
    webhookActive: boolean;
    fieldMappings: {
      bereich: boolean;
      budgetHours: boolean;
    };
  };
  timetac: {
    isConnected: boolean;
    lastAbsenceSyncAt: Date | null;
    lastTimeEntrySyncAt: Date | null;
    mappedUsers: number;
    unmappedUsers: number;
  };
}

export async function getIntegrationStatus(): Promise<ActionResult<IntegrationStatus>> {
  return withActionHandler({
    requiredRole: ['admin'],
    handler: async (_, { tenantId }) => {
      const credentials = await credentialsRepo.findByTenant(tenantId);
      const latestSyncLogs = await syncLogRepo.findLatestByTenant(tenantId);
      const userMappingStats = await userRepo.getMappingStats(tenantId);
      
      return success({
        asana: {
          isConnected: !!credentials?.asanaAccessToken,
          workspaceName: credentials?.asanaWorkspaceName || null,
          lastSyncAt: latestSyncLogs.asana?.completedAt || null,
          lastSyncStatus: latestSyncLogs.asana?.status || null,
          tokenExpiresAt: credentials?.asanaTokenExpiresAt || null,
          webhookActive: !!credentials?.asanaWebhookSecret,
          fieldMappings: {
            bereich: !!credentials?.asanaPhaseBereichFieldId,
            budgetHours: !!credentials?.asanaPhaseBudgetHoursFieldId,
          },
        },
        timetac: {
          isConnected: !!credentials?.timetacApiToken,
          lastAbsenceSyncAt: latestSyncLogs.timetacAbsences?.completedAt || null,
          lastTimeEntrySyncAt: latestSyncLogs.timetacTimeEntries?.completedAt || null,
          mappedUsers: userMappingStats.mapped,
          unmappedUsers: userMappingStats.unmapped,
        },
      });
    },
  })({});
}
```

---

## Änderungshistorie

| Version | Datum | Änderungen |
|---------|-------|------------|
| 1.0 | Januar 2026 | Initial für Antigravity |
| 1.1 | Januar 2026 | + Token Refresh Logic, + Webhook Signature Verification, + TimeEntries Sync, + User Mapping Service, + Sync Queue/Debouncing, + Error Recovery, + Monitoring/Alerts |
| 1.2 | Januar 2026 | + **Asana App Credentials dokumentiert** (Client ID, Secret), + **Vollständiger Onboarding-Flow** (5 Steps), + **Custom Field Discovery & Mapping UI**, + **Webhook Secret Lifecycle** erklärt (Asana generiert!), + **getAsanaCustomFields Action** mit Suggestions, + **AsanaFieldMapping UI-Komponente**, + **EnumValueMapping** für Bereich-Zuordnung, + **Integration Status Dashboard**, + Cron Job Konfiguration in vercel.json |
| 1.3 | Januar 2026 | **Rebranding: "bänk" → "planned."**, URLs und Variablennamen aktualisiert |
| 1.4 | Februar 2026 | **TimeTac entfernt** – Ist-Stunden und Abwesenheiten kommen künftig aus Asana |

---

*Version: 1.4 für Antigravity*
*Aktualisiert: 01. Februar 2026*
