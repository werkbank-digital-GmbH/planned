# Plan D7: Erweiterte Empfehlungen

## Ziel
KI-Empfehlungen mit vollem Kontext (Wetter, Adressen, Verfügbarkeit) für actionable Insights.

## Kontext
- D4: Analytics UI zeigt Insights ✅
- D5: Beschreibungen + Adressen aus Asana
- D6: Wetter-Daten verfügbar
- Aktuell: `InsightTextGenerator.ts` generiert generische Empfehlungen

## Ziel-Zustand

**Von:**
> "Prüft, ob zusätzliche Kapazität eingeplant werden kann."

**Zu:**
> "⚠️ Phase ist 2 Tage im Verzug. Morgen Regen vorhergesagt (80%).
> **Empfehlung:** Max Müller ist Mi-Fr verfügbar und hat keinen anderen Einsatz.
> [→ Max auf diese Phase planen]"

## Abhängigkeiten
- **D4** muss fertig sein (Analytics UI) ✅
- **D5** muss fertig sein (Beschreibungen, Adressen)
- **D6** muss fertig sein (Wetter)

---

## Prompt D7-1: AvailabilityAnalyzer + DB-Migration

```
Erstelle den AvailabilityAnalyzer Service und die DB-Erweiterung für Suggested Actions.

### 1. Migration erstellen: `supabase/migrations/[timestamp]_add_suggested_actions.sql`

```sql
-- Suggested Actions in Phase-Insights speichern
ALTER TABLE phase_insights
ADD COLUMN IF NOT EXISTS suggested_action JSONB;

-- Beispiel-Struktur:
-- {
--   "type": "assign_user",
--   "user_id": "uuid",
--   "user_name": "Max Müller",
--   "available_days": ["2026-02-04", "2026-02-05"],
--   "reason": "Verfügbar Mi-Fr, 60% Auslastung"
-- }

COMMENT ON COLUMN phase_insights.suggested_action IS
  'KI-generierte Handlungsempfehlung mit konkreten Daten (User, Termine, etc.)';
```

### 2. AvailabilityAnalyzer erstellen

Neue Datei: `src/domain/analytics/AvailabilityAnalyzer.ts`

```typescript
/**
 * Analysiert Mitarbeiter-Verfügbarkeit für Empfehlungen.
 */

export interface AvailableUser {
  id: string;
  name: string;
  email: string;
  availableDays: string[];    // ISO date strings
  availableHours: number;     // Summe freier Stunden
  currentUtilization: number; // 0-100%
}

export interface OverloadedUser {
  id: string;
  name: string;
  utilizationPercent: number;
}

export interface AvailabilityContext {
  availableUsers: AvailableUser[];
  overloadedUsers: OverloadedUser[];
}

export class AvailabilityAnalyzer {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly allocationRepository: IAllocationRepository,
    private readonly absenceRepository: IAbsenceRepository
  ) {}

  /**
   * Findet verfügbare Mitarbeiter für einen Zeitraum.
   */
  async findAvailableUsers(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    minAvailableHours: number = 8
  ): Promise<AvailableUser[]> {
    // 1. Alle User des Tenants laden (nur gewerbliche/planer)
    // 2. Für jeden: Allocations + Absences im Zeitraum
    // 3. Freie Kapazität berechnen (8h/Tag Standard)
    // 4. Nur User mit >= minAvailableHours zurückgeben
    // 5. Sortieren nach Verfügbarkeit (höchste zuerst)
  }

  /**
   * Findet überlastete Mitarbeiter (> 100% Auslastung).
   */
  async findOverloadedUsers(
    tenantId: string,
    weekStart: Date
  ): Promise<OverloadedUser[]> {
    // User mit > 40h in der Woche
  }

  /**
   * Berechnet die Auslastung eines Users.
   */
  private calculateUtilization(
    allocatedHours: number,
    workingDays: number
  ): number {
    const expectedHours = workingDays * 8;
    return Math.round((allocatedHours / expectedHours) * 100);
  }
}
```

### 3. SuggestedAction Type definieren

In `src/domain/analytics/types.ts`:

```typescript
export type SuggestedActionType =
  | 'assign_user'    // User auf Phase zuweisen
  | 'reschedule'     // Phase verschieben
  | 'alert'          // Warnung ohne konkrete Aktion
  | 'none';          // Keine Aktion nötig

export interface SuggestedAction {
  type: SuggestedActionType;
  userId?: string;
  userName?: string;
  availableDays?: string[];
  reason: string;
}
```

### 4. PhaseInsight erweitern

In `src/domain/analytics/types.ts`:

```typescript
export interface PhaseInsight {
  // ... existierende Felder
  suggestedAction?: SuggestedAction;
}
```

### 5. Repository Mapper anpassen

In `SupabaseAnalyticsRepository.ts`:
- `suggested_action` aus DB mappen (JSONB → SuggestedAction)
- Bei save: `suggestedAction` in DB speichern

### Guards ausführen:
```bash
pnpm lint && pnpm typecheck && pnpm test:run
```
```

---

## Prompt D7-2: Erweiterte KI-Prompts + Use Case Anpassung

```
Erweitere den InsightTextGenerator um vollen Kontext und passe den GenerateInsightsUseCase an.

### 1. Enhanced Context Interface

In `src/application/ports/services/IInsightTextGenerator.ts`:

```typescript
export interface EnhancedPhaseTextInput extends PhaseTextInput {
  // Projekt-Kontext
  projectAddress?: string;
  projectDescription?: string;

  // Wetter (aus D6)
  weatherForecast?: {
    next3Days: Array<{
      date: string;
      description: string;
      tempMin: number;
      tempMax: number;
      precipitationProbability: number;
      windSpeedMax: number;
      constructionRating: 'good' | 'moderate' | 'poor';
    }>;
    hasRainRisk: boolean;
    hasFrostRisk: boolean;
    hasWindRisk: boolean;
  };

  // Verfügbare Ressourcen
  availability?: {
    availableUsers: Array<{
      id: string;
      name: string;
      availableDays: string[];
      currentUtilization: number;
    }>;
    overloadedUsers: Array<{
      id: string;
      name: string;
      utilizationPercent: number;
    }>;
  };
}

export interface GeneratedTextsWithAction extends GeneratedTexts {
  suggestedAction?: SuggestedAction;
}
```

### 2. InsightTextGenerator erweitern

In `src/infrastructure/ai/InsightTextGenerator.ts`:

1. Neue Methode `generateEnhancedPhaseTexts(input: EnhancedPhaseTextInput)`:

```typescript
async generateEnhancedPhaseTexts(input: EnhancedPhaseTextInput): Promise<GeneratedTextsWithAction> {
  if (this.client) {
    try {
      return await this.generateEnhancedWithClaude(input);
    } catch (error) {
      console.error('[InsightTextGenerator] Claude API error:', error);
    }
  }
  return this.generateEnhancedFallbackTexts(input);
}
```

2. Neuer Prompt-Builder `buildEnhancedPhasePrompt()`:

Der Prompt enthält:
- Alle bisherigen Phase-Daten
- Projekt-Adresse und Beschreibung (gekürzt auf 300 Zeichen)
- Wetter für die nächsten 3 Tage
- Top 3 verfügbare Mitarbeiter mit Auslastung
- Überlastete Mitarbeiter

Response-Format erweitern:
```json
{
  "summary_text": "...",
  "detail_text": "...",
  "recommendation_text": "...",
  "suggested_action": {
    "type": "assign_user | reschedule | alert | none",
    "user_id": "uuid oder null",
    "user_name": "Name oder null",
    "available_days": ["2026-02-04"],
    "reason": "Kurze Begründung"
  }
}
```

3. Fallback-Texte erweitern:

```typescript
private generateEnhancedFallbackTexts(input: EnhancedPhaseTextInput): GeneratedTextsWithAction {
  const baseTexts = this.generateFallbackTexts(input);

  // Suggested Action basierend auf Status + Verfügbarkeit
  let suggestedAction: SuggestedAction | undefined;

  if ((input.status === 'behind' || input.status === 'at_risk') && input.availability?.availableUsers.length) {
    const topUser = input.availability.availableUsers[0];
    suggestedAction = {
      type: 'assign_user',
      userId: topUser.id,
      userName: topUser.name,
      availableDays: topUser.availableDays,
      reason: `Verfügbar ${topUser.availableDays.length} Tage, ${topUser.currentUtilization}% ausgelastet`,
    };

    baseTexts.recommendation_text =
      `${topUser.name} ist ${topUser.availableDays.length} Tage verfügbar (${topUser.currentUtilization}% Auslastung).`;
  }

  return { ...baseTexts, suggestedAction };
}
```

### 3. GenerateInsightsUseCase erweitern

In `src/application/use-cases/analytics/GenerateInsightsUseCase.ts`:

1. Dependencies erweitern:
```typescript
constructor(
  // ... existierende
  private readonly availabilityAnalyzer: AvailabilityAnalyzer,
  private readonly weatherService: IWeatherService,
  private readonly weatherCacheRepository: IWeatherCacheRepository,
)
```

2. In `execute()` vor Textgenerierung:

```typescript
// Verfügbarkeit laden
const availability = await this.availabilityAnalyzer.findAvailableUsers(
  tenantId,
  phase.startDate,
  phase.endDate,
  8 // min 8h verfügbar
);

// Wetter laden (wenn Projekt Koordinaten hat)
let weatherForecast;
if (project.addressLat && project.addressLng) {
  weatherForecast = await this.getWeatherContext(project.addressLat, project.addressLng);
}

// Enhanced Input erstellen
const enhancedInput: EnhancedPhaseTextInput = {
  ...baseInput,
  projectAddress: project.address,
  projectDescription: phase.description?.slice(0, 300),
  weatherForecast,
  availability,
};

// Texte generieren
const textsWithAction = await this.textGenerator.generateEnhancedPhaseTexts(enhancedInput);
```

3. Beim Speichern des Insights:
```typescript
await this.analyticsRepository.savePhaseInsight({
  // ... existierende Felder
  suggestedAction: textsWithAction.suggestedAction,
});
```

### 4. Cron-Route anpassen

In `/api/cron/insights/route.ts`:
- AvailabilityAnalyzer und WeatherService instanziieren
- An UseCase übergeben

### Guards ausführen:
```bash
pnpm lint && pnpm typecheck && pnpm test:run
```
```

---

## Prompt D7-3: Actionable UI + Action-Handler

```
Erweitere die Insight-UI um Action-Buttons und implementiere die Aktionen.

### 1. InsightCard erweitern

In `src/presentation/components/project-details/InsightCard.tsx`:

```tsx
interface InsightCardProps {
  insight: PhaseInsight;
  onActionClick?: (action: SuggestedAction, phaseId: string) => void;
}

export function InsightCard({ insight, onActionClick }: InsightCardProps) {
  const { suggestedAction } = insight;

  return (
    <Card className={getStatusBorderClass(insight.status)}>
      <CardContent className="pt-4">
        {/* Existierender Content: summary, detail, recommendation */}
        <p className="text-lg">{insight.summaryText}</p>
        <p className="text-sm text-muted-foreground mt-1">{insight.detailText}</p>
        <p className="text-sm font-medium mt-2">{insight.recommendationText}</p>

        {/* Action Button */}
        {suggestedAction && suggestedAction.type !== 'none' && (
          <div className="mt-4 pt-3 border-t">
            <ActionButton
              action={suggestedAction}
              onClick={() => onActionClick?.(suggestedAction, insight.phaseId)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActionButton({ action, onClick }: { action: SuggestedAction; onClick: () => void }) {
  if (action.type === 'assign_user') {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start"
        onClick={onClick}
      >
        <UserPlus className="h-4 w-4 mr-2" />
        {action.userName} auf diese Phase planen
        {action.availableDays && action.availableDays.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            {action.availableDays.length} Tage verfügbar
          </span>
        )}
      </Button>
    );
  }

  if (action.type === 'reschedule') {
    return (
      <Button variant="outline" size="sm" className="w-full justify-start" onClick={onClick}>
        <Calendar className="h-4 w-4 mr-2" />
        Phase verschieben prüfen
      </Button>
    );
  }

  if (action.type === 'alert') {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-600">
        <AlertTriangle className="h-4 w-4" />
        {action.reason}
      </div>
    );
  }

  return null;
}
```

### 2. Action Handler in ProjectInsightsSection

In `src/presentation/components/project-details/ProjectInsightsSection.tsx`:

```tsx
const handleActionClick = async (action: SuggestedAction, phaseId: string) => {
  if (action.type === 'assign_user' && action.userId) {
    // Option A: Direkt zur Planungsview navigieren mit Pre-Selection
    router.push(`/planung?phase=${phaseId}&user=${action.userId}`);

    // Option B: Schnell-Zuweisung Dialog öffnen
    // setQuickAssignDialog({ phaseId, userId: action.userId, userName: action.userName });
  }

  if (action.type === 'reschedule') {
    // Zur Phase in Asana linken (wenn asanaGid vorhanden)
    // Oder: Dialog mit Verschiebe-Optionen
  }
};

// In JSX:
{phaseInsights.map((insight) => (
  <InsightCard
    key={insight.id}
    insight={insight}
    onActionClick={handleActionClick}
  />
))}
```

### 3. Quick-Assign Dialog (Optional)

Neue Datei: `src/presentation/components/project-details/QuickAssignDialog.tsx`

```tsx
/**
 * Dialog für Schnell-Zuweisung eines Users auf eine Phase.
 * Zeigt verfügbare Tage und erstellt Allocations.
 */

interface QuickAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phaseId: string;
  userId: string;
  userName: string;
  availableDays: string[];
}

export function QuickAssignDialog({ ... }: QuickAssignDialogProps) {
  // 1. Zeige Phase-Info und User-Info
  // 2. Zeige verfügbare Tage als Checkboxen
  // 3. Stunden pro Tag eingeben (default 8)
  // 4. "Zuweisen" Button → createAllocation Action aufrufen
  // 5. Bei Erfolg: Dialog schließen, Seite revalidieren
}
```

### 4. Server Action für Quick-Assign

In `src/presentation/actions/allocations.ts` erweitern:

```typescript
export async function quickAssignUserToPhaseAction(
  phaseId: string,
  userId: string,
  dates: string[],  // ISO dates
  hoursPerDay: number = 8
): Promise<ActionResult<{ allocationsCreated: number }>> {
  // 1. Auth + Tenant prüfen
  // 2. Phase laden (für Validierung)
  // 3. Für jeden Tag eine Allocation erstellen
  // 4. Revalidate /planung
}
```

### 5. URL-Parameter in Planungsview

In `src/app/(dashboard)/planung/page.tsx`:

```tsx
// URL-Parameter auslesen für Pre-Selection
const searchParams = useSearchParams();
const preSelectedPhaseId = searchParams.get('phase');
const preSelectedUserId = searchParams.get('user');

// An PlanningGrid weitergeben für Highlighting/Scrolling
```

### Guards ausführen:
```bash
pnpm lint && pnpm typecheck && pnpm test:run
```
```

---

## Schätzung
~3 Prompts, hoher Aufwand (viel Logik)

## Spätere Erweiterungen (nicht D7)
- Qualifikationen berücksichtigen ("Max hat Kranschein")
- Entfernung berücksichtigen ("Projekt ist 2h entfernt")
- Automatische Zuweisung (nicht nur Vorschlag)

---

*Aktualisiert: 2026-02-03, Session 13*
