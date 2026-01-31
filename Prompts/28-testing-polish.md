# Prompt 28: Testing & Polish

**Phase:** 6 – Dashboard, Mobile & Finishing
**Komplexität:** L (Large)
**Geschätzte Zeit:** 5-6 Stunden

---

## Kontext

Alle Features sind implementiert. Jetzt führen wir umfassende Tests durch und polieren die UX.

**Bereits vorhanden:**
- Alle Features implementiert
- Unit Tests für Use Cases
- E2E Tests für kritische Flows

---

## Ziel

Führe abschließende Tests durch, behebe Bugs und optimiere die User Experience.

---

## Referenz-Dokumentation

- `FEATURES.md` – Alle Features
- `Rules.md` – Qualitätsstandards
- Alle UI-Screens

---

## Akzeptanzkriterien

```gherkin
Feature: Testing & Quality

Scenario: Test Coverage
  Given alle Tests sind geschrieben
  Then ist die Test Coverage > 80%
  And alle kritischen Pfade sind abgedeckt

Scenario: E2E Tests bestehen
  Given die E2E Test Suite läuft
  Then bestehen alle Tests
  And die Tests sind stabil (keine Flakes)

Scenario: Performance Check
  Given die App ist deployed
  Then lädt die Planungsseite in < 2s
  And Drag & Drop reagiert in < 100ms
  And API Calls sind < 500ms

Scenario: Accessibility Check
  Given ich nutze einen Screenreader
  Then kann ich alle Funktionen nutzen
  And alle Bilder haben Alt-Text
  And alle Buttons haben Labels

Scenario: Error Handling
  Given ein Server-Fehler tritt auf
  Then sehe ich eine freundliche Fehlermeldung
  And die App crasht nicht
  And ich kann weitermachen

Scenario: Loading States
  Given Daten werden geladen
  Then sehe ich einen Loading-Indikator
  And die UI blockiert nicht

Scenario: Empty States
  Given es gibt keine Daten
  Then sehe ich hilfreiche Leere-Zustände
  And Hinweise wie ich anfangen kann

Scenario: Mobile Responsiveness
  Given ich nutze ein Smartphone
  Then ist die Desktop-Planung nicht zugänglich
  And ich lande auf /meine-woche
```

---

## Test-Checkliste

### Unit Tests

```typescript
// Kritische Use Cases müssen Tests haben:
□ CreateAllocationUseCase
□ MoveAllocationUseCase
□ DeleteAllocationUseCase
□ CreateUserUseCase
□ SyncAsanaProjectsUseCase
□ SyncTimeTacAbsencesUseCase
□ GetAllocationsForWeekQuery
□ GetDashboardDataQuery
```

### E2E Tests

```typescript
// tests/e2e/critical-paths.spec.ts
describe('Critical User Paths', () => {
  test('Login → Dashboard → Planung → Create Allocation');
  test('Login → Settings → Create User → Logout');
  test('Mobile: Login → Meine Woche → Navigate');
  test('Drag Allocation → Undo → Redo');
  test('Asana Connect → Sync → View Projects');
});
```

### Manual Test Cases

```markdown
## Auth Flow
- [ ] Login mit gültigen Credentials
- [ ] Login mit ungültigen Credentials (Fehlermeldung)
- [ ] Passwort vergessen Flow
- [ ] Logout

## Planungsansicht
- [ ] Wochennavigation (Pfeile, Heute-Button)
- [ ] Allocation Cards werden angezeigt
- [ ] Drag & Drop innerhalb User
- [ ] Drag & Drop zwischen Users
- [ ] Drag aus Sidebar
- [ ] Quick-Add Dialog (N-Taste)
- [ ] Copy/Paste (Cmd+C/V)
- [ ] Delete (Delete-Taste)
- [ ] Undo/Redo (Cmd+Z/Y)
- [ ] Range-Select
- [ ] Abwesenheits-Warning

## Mobile
- [ ] Meine Woche lädt korrekt
- [ ] Swipe Navigation
- [ ] Abwesenheiten angezeigt
- [ ] Bottom Navigation

## Integrationen
- [ ] Asana OAuth Flow
- [ ] Asana Projekt-Import
- [ ] TimeTac Verbindung
- [ ] Abwesenheits-Sync
- [ ] TimeEntry-Sync

## Einstellungen
- [ ] Profil bearbeiten
- [ ] Passwort ändern
- [ ] Mitarbeiter verwalten (Admin)
- [ ] Ressourcen verwalten (Admin)
```

---

## Implementierungsschritte

### 🟢 GREEN: Comprehensive E2E Test Suite

```typescript
// tests/e2e/full-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Full Application Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Fresh login for each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'planer@test.de');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should complete full planning workflow', async ({ page }) => {
    // Navigate to planning
    await page.click('a[href="/planung"]');
    await expect(page.locator('[data-testid="planning-grid"]')).toBeVisible();

    // Create allocation via drag from sidebar
    const phaseItem = page.locator('[data-testid="sidebar-phase"]').first();
    const emptyCell = page.locator('[data-testid="empty-cell"]').first();
    await phaseItem.dragTo(emptyCell);

    // Verify allocation created
    await expect(page.locator('[data-testid="allocation-card"]')).toBeVisible();

    // Undo
    await page.keyboard.press('Meta+z');
    await expect(page.locator('[data-testid="allocation-card"]')).not.toBeVisible();

    // Redo
    await page.keyboard.press('Meta+Shift+z');
    await expect(page.locator('[data-testid="allocation-card"]')).toBeVisible();
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Simulate network error
    await page.route('**/api/**', (route) => route.abort());

    await page.click('a[href="/planung"]');

    // Should show error state, not crash
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('text=Ein Fehler ist aufgetreten')).toBeVisible();
  });
});
```

### 🟢 GREEN: Error Boundary Component

```typescript
// src/presentation/components/common/ErrorBoundary.tsx
'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/presentation/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // TODO: Send to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-error mb-4" />
          <h2 className="text-lg font-semibold mb-2">
            Ein Fehler ist aufgetreten
          </h2>
          <p className="text-gray-500 mb-4 max-w-md">
            Bitte versuchen Sie es erneut. Falls das Problem weiterhin besteht,
            kontaktieren Sie den Support.
          </p>
          <Button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Seite neu laden
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 🟢 GREEN: Empty State Components

```typescript
// src/presentation/components/common/EmptyState.tsx
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
      <div className="rounded-full bg-gray-100 p-4 mb-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium mb-1">{title}</h3>
      {description && (
        <p className="text-gray-500 text-sm max-w-md mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}

// Usage examples:
// <EmptyState
//   icon={Calendar}
//   title="Keine Allocations"
//   description="Erstellen Sie Ihre erste Allocation per Drag & Drop"
// />

// <EmptyState
//   icon={Users}
//   title="Keine Mitarbeiter"
//   description="Fügen Sie Mitarbeiter hinzu, um mit der Planung zu beginnen"
//   action={<Button>Mitarbeiter hinzufügen</Button>}
// />
```

### 🟢 GREEN: Loading States

```typescript
// src/presentation/components/common/LoadingState.tsx
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  text?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingState({
  text = 'Laden...',
  className,
  size = 'md',
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className={cn('flex items-center justify-center gap-2 p-4', className)}>
      <Loader2 className={cn('animate-spin', sizeClasses[size])} />
      <span className="text-gray-500">{text}</span>
    </div>
  );
}

// Skeleton components for specific layouts
export function PlanningGridSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="grid grid-cols-6 gap-2 p-4 border-b">
        <div className="h-10 bg-gray-200 rounded" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-200 rounded" />
        ))}
      </div>
      {/* Rows */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="grid grid-cols-6 gap-2 p-4 border-b">
          <div className="h-16 bg-gray-200 rounded" />
          {[...Array(5)].map((_, j) => (
            <div key={j} className="h-16 bg-gray-100 rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}
```

### 🟢 GREEN: Accessibility Improvements

```typescript
// src/presentation/components/planning/AllocationCard.tsx (accessibility updates)
export function AllocationCard({ allocation, ... }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${allocation.project.name}, ${allocation.plannedHours} Stunden`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          // Open details
        }
      }}
      {...props}
    >
      {/* content */}
    </div>
  );
}

// Keyboard navigation for grid
export function PlanningGrid() {
  const handleKeyNavigation = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        // Move focus to cell above
        break;
      case 'ArrowDown':
        // Move focus to cell below
        break;
      case 'ArrowLeft':
        // Move focus to previous day
        break;
      case 'ArrowRight':
        // Move focus to next day
        break;
    }
  };

  // ...
}
```

### 🟢 GREEN: Performance Optimizations

```typescript
// src/presentation/components/planning/PlanningGrid.tsx
import { memo, useMemo } from 'react';

// Memoize row components to prevent unnecessary re-renders
const UserRow = memo(function UserRow({ user, allocations, ... }) {
  // Only re-render when props change
  const sortedAllocations = useMemo(
    () => allocations.sort((a, b) => a.date.getTime() - b.date.getTime()),
    [allocations]
  );

  return (
    // ...
  );
});

// Virtual scrolling for large lists (optional, for >50 users)
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualizedUserList({ users, ... }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: users.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Row height
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <UserRow
            key={users[virtualRow.index].id}
            user={users[virtualRow.index]}
            style={{
              position: 'absolute',
              top: virtualRow.start,
              height: virtualRow.size,
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

### 🟢 GREEN: Final Validation Script

```typescript
// scripts/validate-deployment.ts
import { chromium } from 'playwright';

async function validateDeployment() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const BASE_URL = process.env.DEPLOYMENT_URL || 'http://localhost:3000';

  console.log('🔍 Validating deployment...');

  // 1. Check login page loads
  await page.goto(`${BASE_URL}/login`);
  console.log('✅ Login page loads');

  // 2. Check assets load
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  // 3. Check performance
  const start = Date.now();
  await page.goto(`${BASE_URL}/login`);
  const loadTime = Date.now() - start;
  console.log(`⏱️ Page load time: ${loadTime}ms`);

  if (loadTime > 3000) {
    console.warn('⚠️ Page load time exceeds 3s');
  }

  // 4. Check for JS errors
  if (errors.length > 0) {
    console.error('❌ JavaScript errors found:', errors);
    process.exit(1);
  }

  console.log('✅ No JavaScript errors');

  await browser.close();
  console.log('🎉 Validation complete!');
}

validateDeployment();
```

---

## Erwartete Dateien

```
src/
├── presentation/
│   └── components/
│       └── common/
│           ├── ErrorBoundary.tsx
│           ├── EmptyState.tsx
│           └── LoadingState.tsx
tests/
├── e2e/
│   ├── critical-paths.spec.ts
│   └── full-flow.spec.ts
└── unit/
    └── (existing tests)
scripts/
└── validate-deployment.ts
```

---

## Checkliste vor Release

```markdown
## Code Quality
- [ ] Alle Unit Tests grün
- [ ] Alle E2E Tests grün
- [ ] Keine TypeScript Errors
- [ ] Keine ESLint Errors
- [ ] Test Coverage > 80%

## UX
- [ ] Alle Loading States implementiert
- [ ] Alle Empty States implementiert
- [ ] Error Handling überall
- [ ] Mobile Responsiveness geprüft
- [ ] Keyboard Navigation funktioniert

## Performance
- [ ] Lighthouse Score > 80
- [ ] Planungsseite lädt < 2s
- [ ] Keine Memory Leaks
- [ ] Bundle Size optimiert

## Security
- [ ] Alle Env Vars in .env.example
- [ ] Keine Secrets im Code
- [ ] RLS Policies aktiv
- [ ] Rate Limiting aktiv

## Documentation
- [ ] README aktualisiert
- [ ] API Docs aktuell
- [ ] Deployment Guide erstellt
```

---

## Hinweise

- Playwright für E2E Tests (bereits in DEPENDENCIES.md)
- Vitest für Unit Tests
- Error Boundary in Layout wrappen
- Console Errors in Production loggen
- Performance Monitoring mit Web Vitals
- Regelmäßige Accessibility Audits

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] Alle Tests sind grün
- [ ] Error Handling funktioniert
- [ ] Loading States überall
- [ ] Empty States überall
- [ ] Performance ist akzeptabel
- [ ] Accessibility ist gewährleistet
- [ ] Release Checklist ist erfüllt

---

*Vorheriger Prompt: 27 – Settings & Profile*
*Projekt abgeschlossen! 🎉*
