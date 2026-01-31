# planned. – Dependencies

> Vollständige Liste aller npm-Pakete mit exakten Versionen

**Version:** 1.2
**Datum:** 29. Januar 2026

---

## Übersicht

Dieses Dokument definiert alle Dependencies für das planned.-Projekt. **Keine weiteren Pakete installieren ohne explizite Genehmigung.**

---

## package.json

```json
{
  "name": "planned",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "db:reset": "supabase db reset",
    "db:migrate": "supabase db push",
    "db:types": "supabase gen types typescript --linked > src/lib/database.types.ts",
    "db:seed": "supabase db reset && echo 'Seed data inserted'",
    "prepare": "husky"
  },
  "dependencies": {
    "next": "15.1.0",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    
    "@supabase/supabase-js": "2.47.0",
    "@supabase/ssr": "0.5.2",
    
    "@tanstack/react-query": "5.62.8",
    "zustand": "5.0.2",
    
    "@dnd-kit/core": "6.3.1",
    "@dnd-kit/sortable": "9.0.0",
    "@dnd-kit/utilities": "3.2.2",
    
    "date-fns": "4.1.0",
    "date-fns-tz": "3.2.0",
    
    "zod": "3.24.1",
    "react-hook-form": "7.54.2",
    "@hookform/resolvers": "3.9.1",
    
    "recharts": "2.15.0",
    
    "@radix-ui/react-accordion": "1.2.2",
    "@radix-ui/react-alert-dialog": "1.1.4",
    "@radix-ui/react-avatar": "1.1.2",
    "@radix-ui/react-checkbox": "1.1.3",
    "@radix-ui/react-dialog": "1.1.4",
    "@radix-ui/react-dropdown-menu": "2.1.4",
    "@radix-ui/react-label": "2.1.1",
    "@radix-ui/react-popover": "1.1.4",
    "@radix-ui/react-progress": "1.1.1",
    "@radix-ui/react-select": "2.1.4",
    "@radix-ui/react-separator": "1.1.1",
    "@radix-ui/react-slot": "1.1.1",
    "@radix-ui/react-switch": "1.1.2",
    "@radix-ui/react-tabs": "1.1.2",
    "@radix-ui/react-toast": "1.2.4",
    "@radix-ui/react-tooltip": "1.1.6",
    
    "class-variance-authority": "0.7.1",
    "clsx": "2.1.1",
    "tailwind-merge": "2.6.0",
    "tailwindcss-animate": "1.0.7",
    
    "lucide-react": "0.469.0",
    
    "sonner": "1.7.1",

    "next-themes": "0.4.4",

    "@upstash/ratelimit": "2.0.5",
    "@upstash/redis": "1.34.3"
  },
  "devDependencies": {
    "typescript": "5.7.2",
    "@types/node": "22.10.5",
    "@types/react": "19.0.2",
    "@types/react-dom": "19.0.2",
    
    "tailwindcss": "3.4.17",
    "postcss": "8.4.49",
    "autoprefixer": "10.4.20",
    
    "eslint": "9.17.0",
    "eslint-config-next": "15.1.0",
    "@typescript-eslint/eslint-plugin": "8.19.1",
    "@typescript-eslint/parser": "8.19.1",
    "eslint-plugin-import": "2.31.0",
    
    "vitest": "2.1.8",
    "@vitest/ui": "2.1.8",
    "@vitest/coverage-v8": "2.1.8",
    "@vitejs/plugin-react": "4.3.4",
    "@testing-library/react": "16.1.0",
    "@testing-library/jest-dom": "6.6.3",
    "@testing-library/user-event": "14.5.2",
    "jsdom": "25.0.1",
    
    "@playwright/test": "1.49.1",
    
    "msw": "2.7.0",
    
    "husky": "9.1.7",
    "lint-staged": "15.3.0",
    
    "supabase": "2.8.0"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "vitest related --run"
    ]
  },
  "packageManager": "pnpm@9.15.0"
}
```

---

## Dependencies Erklärung

### Core Framework

| Paket | Version | Zweck |
|-------|---------|-------|
| `next` | 15.1.0 | React Framework mit App Router |
| `react` | 19.0.0 | UI Library |
| `react-dom` | 19.0.0 | React DOM Renderer |

### Supabase

| Paket | Version | Zweck |
|-------|---------|-------|
| `@supabase/supabase-js` | 2.47.0 | Supabase Client (DB, Auth, Realtime) |
| `@supabase/ssr` | 0.5.2 | Server-Side Rendering Support |

### State Management

| Paket | Version | Zweck |
|-------|---------|-------|
| `@tanstack/react-query` | 5.62.8 | Server State Management |
| `zustand` | 5.0.2 | Client/UI State Management |

### Drag & Drop

| Paket | Version | Zweck |
|-------|---------|-------|
| `@dnd-kit/core` | 6.3.1 | Drag & Drop Kern-Funktionalität |
| `@dnd-kit/sortable` | 9.0.0 | Sortierbare Listen |
| `@dnd-kit/utilities` | 3.2.2 | Hilfsfunktionen |

### Datum/Zeit

| Paket | Version | Zweck |
|-------|---------|-------|
| `date-fns` | 4.1.0 | Datum-Manipulation |
| `date-fns-tz` | 3.2.0 | Timezone Support (DACH) |

### Formulare & Validierung

| Paket | Version | Zweck |
|-------|---------|-------|
| `zod` | 3.24.1 | Schema-Validierung |
| `react-hook-form` | 7.54.2 | Formular-Handling |
| `@hookform/resolvers` | 3.9.1 | Zod Integration für RHF |

### Charts

| Paket | Version | Zweck |
|-------|---------|-------|
| `recharts` | 2.15.0 | Dashboard Charts |

### UI Components (Shadcn/UI Basis)

| Paket | Version | Zweck |
|-------|---------|-------|
| `@radix-ui/react-*` | diverse | Headless UI Primitives |
| `class-variance-authority` | 0.7.1 | Variant-basierte Styles |
| `clsx` | 2.1.1 | Conditional Classes |
| `tailwind-merge` | 2.6.0 | Tailwind Class Merging |
| `tailwindcss-animate` | 1.0.7 | Animationen |
| `lucide-react` | 0.469.0 | Icons |
| `sonner` | 1.7.1 | Toast Notifications |
| `next-themes` | 0.4.4 | Dark Mode (optional) |
| `@upstash/ratelimit` | 2.0.5 | Rate Limiting (Sliding Window) |
| `@upstash/redis` | 1.34.3 | Serverless Redis Client |

### Dev Dependencies

| Paket | Version | Zweck |
|-------|---------|-------|
| `typescript` | 5.7.2 | TypeScript Compiler |
| `tailwindcss` | 3.4.17 | CSS Framework |
| `eslint` | 9.17.0 | Linting |
| `vitest` | 2.1.8 | Unit/Integration Tests |
| `@playwright/test` | 1.49.1 | E2E Tests |
| `msw` | 2.7.0 | API Mocking |
| `husky` | 9.1.7 | Git Hooks |
| `supabase` | 2.8.0 | Supabase CLI |

---

## Tailwind CSS Config

```typescript
// tailwind.config.ts

import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand Colors (shadcn/ui Kompatibilität)
        // HINWEIS: primary === accent (absichtlich identisch)
        // - "primary" für shadcn/ui Button, Badge, etc.
        // - "accent" für eigene Komponenten
        primary: {
          DEFAULT: '#EBBD04',
          hover: '#D4A903',
          light: '#FEF3C7',
        },

        // Neutral (Basis)
        black: '#2D2D2D',
        gray: {
          DEFAULT: '#6D6D6D',
          light: '#DDDDDD',
        },
        white: '#FFFFFF',

        // Akzentfarbe (= primary, für eigene Komponenten)
        accent: {
          DEFAULT: '#EBBD04',
          hover: '#D4A903',
          light: '#FEF3C7',
        },
        
        // Semantic
        success: {
          DEFAULT: '#22C55E',
          light: '#DCFCE7',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
        },
        error: {
          DEFAULT: '#EF4444',
          light: '#FEE2E2',
        },
        
        // Bereich-Farben
        bereich: {
          produktion: {
            bg: '#DCFCE7',
            text: '#166534',
            border: '#86EFAC',
          },
          montage: {
            bg: '#FEF3C7',
            text: '#92400E',
            border: '#FCD34D',
          },
        },
        
        // Verfügbarkeit
        availability: {
          available: '#EBBD04',
          partial: '#9CA3AF',
          busy: '#E7E5E4',
          absent: '#EF4444',
        },
        
        // Shadcn/UI erforderlich
        background: '#FFFFFF',
        foreground: '#2D2D2D',
        muted: {
          DEFAULT: '#DDDDDD',
          foreground: '#6D6D6D',
        },
        border: '#DDDDDD',
        input: '#DDDDDD',
        ring: '#EBBD04',
        
        // Cards & Popovers
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#2D2D2D',
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#2D2D2D',
        },
        
        // Destructive
        destructive: {
          DEFAULT: '#EF4444',
          foreground: '#FFFFFF',
        },
      },
      
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      },
      
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
      
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
```

---

## PostCSS Config

```javascript
// postcss.config.js

module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

---

## TypeScript Config

```json
// tsconfig.json

{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    },
    "baseUrl": ".",
    
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "supabase/functions"
  ]
}
```

---

## Vitest Config

```typescript
// vitest.config.ts

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['node_modules', 'tests/e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        'tests',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

## Playwright Config

```typescript
// playwright.config.ts

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  globalSetup: './tests/e2e/setup/global-setup.ts',
  
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## ESLint Config

```json
// .eslintrc.json

{
  "extends": [
    "next/core-web-vitals",
    "next/typescript"
  ],
  "plugins": [
    "@typescript-eslint",
    "import"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/consistent-type-imports": ["error", { "prefer": "type-imports" }],
    
    "import/order": [
      "error",
      {
        "groups": [
          "builtin",
          "external",
          "internal",
          ["parent", "sibling"],
          "index"
        ],
        "pathGroups": [
          { "pattern": "@/domain/**", "group": "internal", "position": "before" },
          { "pattern": "@/application/**", "group": "internal", "position": "before" },
          { "pattern": "@/infrastructure/**", "group": "internal", "position": "before" },
          { "pattern": "@/presentation/**", "group": "internal", "position": "before" },
          { "pattern": "@/lib/**", "group": "internal", "position": "after" }
        ],
        "pathGroupsExcludedImportTypes": ["builtin"],
        "newlines-between": "always",
        "alphabetize": { "order": "asc" }
      }
    ],
    
    "import/no-restricted-paths": [
      "error",
      {
        "zones": [
          {
            "target": "./src/domain",
            "from": "./src/application",
            "message": "Domain darf Application nicht importieren!"
          },
          {
            "target": "./src/domain",
            "from": "./src/infrastructure",
            "message": "Domain darf Infrastructure nicht importieren!"
          },
          {
            "target": "./src/domain",
            "from": "./src/presentation",
            "message": "Domain darf Presentation nicht importieren!"
          },
          {
            "target": "./src/application",
            "from": "./src/infrastructure",
            "message": "Application darf Infrastructure nicht importieren!"
          },
          {
            "target": "./src/application",
            "from": "./src/presentation",
            "message": "Application darf Presentation nicht importieren!"
          }
        ]
      }
    ],
    
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

---

## Test Setup

```typescript
// tests/setup.ts

import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup nach jedem Test
afterEach(() => {
  cleanup();
});

// Mock für window.matchMedia (für responsive tests)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock für ResizeObserver (für dnd-kit)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
```

---

## Installation

```bash
# Mit pnpm (empfohlen)
pnpm install

# Oder mit npm
npm install

# Supabase CLI global
npm install -g supabase
```

---

## Shadcn/UI Komponenten installieren

Nach dem Basis-Setup die benötigten Shadcn/UI Komponenten hinzufügen:

```bash
# Initialisieren (einmalig)
npx shadcn@latest init

# Komponenten hinzufügen
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add form
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add popover
npx shadcn@latest add select
npx shadcn@latest add separator
npx shadcn@latest add switch
npx shadcn@latest add table
npx shadcn@latest add tabs
npx shadcn@latest add toast
npx shadcn@latest add tooltip
npx shadcn@latest add avatar
npx shadcn@latest add badge
npx shadcn@latest add checkbox
npx shadcn@latest add progress
npx shadcn@latest add accordion
npx shadcn@latest add alert-dialog
```

---

## Änderungshistorie

| Version | Datum | Änderungen |
|---------|-------|------------|
| 1.0 | Januar 2026 | Initial - Vollständige Dependency-Liste mit Configs |
| 1.1 | Januar 2026 | **Rebranding: "bänk" → "planned."**, UTF-8 Encoding korrigiert |
| 1.2 | Januar 2026 | + `@upstash/ratelimit` und `@upstash/redis` für Rate Limiting |

---

*Version: 1.2 für Antigravity*
*Erstellt: 29. Januar 2026*
