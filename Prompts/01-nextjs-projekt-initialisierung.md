# Prompt 01: Next.js 15 Projekt-Initialisierung

**Phase:** 1 – Projekt-Setup & Infrastruktur
**Komplexität:** M (Medium)
**Geschätzte Zeit:** 2-3 Stunden

---

## Kontext

Du startest die Entwicklung von **planned.**, einer Kapazitätsplanungs-App für Holzbaubetriebe. Das Projekt verwendet Next.js 15 mit App Router, TypeScript im strict mode, und Tailwind CSS.

Dies ist der erste Prompt – es existiert noch kein Code.

---

## Ziel

Erstelle das Next.js 15 Projekt mit allen Basis-Konfigurationen gemäß `DEPENDENCIES.md`.

---

## Referenz-Dokumentation

- `DEPENDENCIES.md` – Exakte Paketversionen
- `FOLDER_STRUCTURE.md` – Projektstruktur
- `Rules.md` – Code-Stil und Konventionen
- `UI_COMPONENTS.md` – Farbpalette

---

## Akzeptanzkriterien

```gherkin
Feature: Projekt-Initialisierung

Scenario: Next.js 15 Setup
  Given ein leeres Projektverzeichnis
  When ich das Projekt initialisiere
  Then existiert eine vollständige Next.js 15 Konfiguration
  And TypeScript ist im strict mode konfiguriert
  And Tailwind CSS ist mit den planned.-Farben konfiguriert
  And ESLint mit Clean Architecture Import-Regeln ist aktiv
  And Vitest ist als Test-Runner konfiguriert
  And alle Ordner gemäß FOLDER_STRUCTURE.md sind angelegt

Scenario: Ordnerstruktur
  Given das initialisierte Projekt
  Then existieren folgende Ordner:
    | Ordner                    |
    | src/domain/entities       |
    | src/domain/value-objects  |
    | src/domain/enums          |
    | src/domain/errors         |
    | src/domain/services       |
    | src/application/ports     |
    | src/application/use-cases |
    | src/infrastructure        |
    | src/presentation          |
    | src/app                   |
    | src/lib                   |
    | tests/e2e                 |

Scenario: ESLint Import-Regeln
  Given die ESLint-Konfiguration
  Then sind Cross-Layer-Imports verboten:
    | Von            | Nach           | Erlaubt |
    | domain         | application    | ❌      |
    | domain         | infrastructure | ❌      |
    | application    | infrastructure | ❌      |
    | application    | presentation   | ❌      |
    | infrastructure | domain         | ✅      |
    | presentation   | application    | ✅      |
```

---

## Technische Anforderungen

### Exakte Versionen aus DEPENDENCIES.md

```typescript
const dependencies = {
  "next": "15.1.0",
  "react": "19.0.0",
  "react-dom": "19.0.0",
  "typescript": "5.7.2",
  "tailwindcss": "3.4.17",
  "@tailwindcss/typography": "0.5.15"
};

const devDependencies = {
  "vitest": "2.1.8",
  "@testing-library/react": "16.1.0",
  "eslint": "9.17.0",
  "prettier": "3.4.2"
};
```

### Tailwind Farben aus UI_COMPONENTS.md

```typescript
const colors = {
  black: '#2D2D2D',      // Primärfarbe Text
  gray: '#6D6D6D',       // Sekundärfarbe
  lightGray: '#DDDDDD',  // Borders, Disabled
  white: '#FFFFFF',      // Hintergründe
  accent: '#EBBD04',     // Orange/Gold (Akzent)
  success: '#22C55E',    // Grün
  warning: '#F59E0B',    // Gelb/Orange
  error: '#EF4444'       // Rot
};
```

---

## Implementierungsschritte

### 🔴 RED: Test für TypeScript strict mode

```typescript
// tests/config/typescript.test.ts
import { describe, it, expect } from 'vitest';
import tsconfig from '../../tsconfig.json';

describe('TypeScript Configuration', () => {
  it('should have strict mode enabled', () => {
    expect(tsconfig.compilerOptions.strict).toBe(true);
  });

  it('should have noUncheckedIndexedAccess enabled', () => {
    expect(tsconfig.compilerOptions.noUncheckedIndexedAccess).toBe(true);
  });
});
```

### 🟢 GREEN: tsconfig.json erstellen

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 🔴 RED: Test für Tailwind-Farben

```typescript
// tests/config/tailwind.test.ts
import { describe, it, expect } from 'vitest';
import tailwindConfig from '../../tailwind.config';

describe('Tailwind Configuration', () => {
  it('should have planned. brand colors', () => {
    const colors = tailwindConfig.theme.extend.colors;
    expect(colors.accent).toBe('#EBBD04');
    expect(colors.black).toBe('#2D2D2D');
  });
});
```

### 🟢 GREEN: tailwind.config.ts erstellen

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        black: '#2D2D2D',
        gray: '#6D6D6D',
        'light-gray': '#DDDDDD',
        white: '#FFFFFF',
        accent: '#EBBD04',
        'accent-light': '#FEF3C7',
        success: '#22C55E',
        'success-light': '#DCFCE7',
        warning: '#F59E0B',
        'warning-light': '#FEF3C7',
        error: '#EF4444',
        'error-light': '#FEE2E2',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

export default config;
```

### 🔵 REFACTOR: Strukturiere Config-Dateien

- Extrahiere Farben in `src/lib/constants.ts`
- Erstelle `.env.example` mit allen benötigten Variablen

---

## Erwartete Dateien

```
planned./
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── next.config.ts
├── vitest.config.ts
├── .eslintrc.json
├── .prettierrc
├── .env.example
├── .gitignore
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   └── .gitkeep
│   │   ├── value-objects/
│   │   │   └── .gitkeep
│   │   ├── enums/
│   │   │   └── .gitkeep
│   │   ├── errors/
│   │   │   └── .gitkeep
│   │   └── services/
│   │       └── .gitkeep
│   ├── application/
│   │   ├── ports/
│   │   │   ├── repositories/
│   │   │   │   └── .gitkeep
│   │   │   └── services/
│   │   │       └── .gitkeep
│   │   ├── use-cases/
│   │   │   └── .gitkeep
│   │   └── dtos/
│   │       └── .gitkeep
│   ├── infrastructure/
│   │   ├── repositories/
│   │   │   └── .gitkeep
│   │   ├── services/
│   │   │   └── .gitkeep
│   │   ├── supabase/
│   │   │   └── .gitkeep
│   │   ├── mappers/
│   │   │   └── .gitkeep
│   │   └── container/
│   │       └── .gitkeep
│   ├── presentation/
│   │   ├── actions/
│   │   │   └── .gitkeep
│   │   ├── hooks/
│   │   │   └── .gitkeep
│   │   └── components/
│   │       └── .gitkeep
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   └── lib/
│       └── constants.ts
└── tests/
    ├── config/
    │   ├── typescript.test.ts
    │   └── tailwind.test.ts
    └── e2e/
        └── .gitkeep
```

---

## Hinweise

- Verwende `pnpm` als Package Manager
- Aktiviere `turbopack` für Dev-Server in `next.config.ts`
- Konfiguriere den `@/` Alias für `./src/`
- ESLint muss Cross-Layer-Imports verbieten (siehe `Rules.md` Import-Regeln)
- Füge `.gitkeep` Dateien in leere Ordner ein
- Erstelle eine `src/lib/constants.ts` mit:
  ```typescript
  export const WORK_DAYS_PER_WEEK = 5;
  export const APP_NAME = 'planned.';
  ```

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] `pnpm dev` startet ohne Fehler
- [ ] `pnpm test` führt Config-Tests aus
- [ ] `pnpm lint` läuft ohne Fehler
- [ ] TypeScript strict mode ist aktiv
- [ ] Alle Ordner existieren

---

*Nächster Prompt: 02 – Supabase Integration & Database Setup*
