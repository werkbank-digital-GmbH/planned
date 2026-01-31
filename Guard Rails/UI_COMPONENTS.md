# planned. – UI Components

> Komponenten-Bibliothek basierend auf den Stitch UI-Screens

**Version:** 1.3
**Datum:** 29. Januar 2026

---

## Inhaltsverzeichnis

1. [Design System](#design-system)
2. [Tailwind Configuration](#tailwind-configuration)
3. [Accessibility Guidelines](#accessibility-guidelines)
4. [Layout Components](#layout-components)
5. [Planning Components](#planning-components)
6. [Resource Pool Components](#resource-pool-components)
7. [Form Components](#form-components)
8. [Feedback Components](#feedback-components)
9. [Mobile Components](#mobile-components)

---

## Design System

### Farbpalette – Die 5 Kernfarben

planned. verwendet ein minimalistisches Farbschema mit **5 Kernfarben**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    PLANNED. FARBPALETTE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ████████  SCHWARZ     #2D2D2D   Text, Headlines, Icons        │
│                                                                 │
│  ████████  GRAU        #6D6D6D   Sekundärer Text, Placeholder  │
│                                                                 │
│  ████████  HELLGRAU    #DDDDDD   Borders, Dividers, Muted BG   │
│                                                                 │
│  ████████  WEISS       #FFFFFF   Hintergründe, Cards           │
│                                                                 │
│  ████████  ORANGE      #EBBD04   AKZENT! Buttons, Links, CTAs  │
│            (Akzent)              ⚠️ WICHTIGSTE FARBE           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Farben im Detail

| Farbe | Hex | RGB | Verwendung |
|-------|-----|-----|------------|
| **Schwarz** | `#2D2D2D` | `45, 45, 45` | Primärer Text, Headlines, Icons, Navigation aktiv |
| **Grau** | `#6D6D6D` | `109, 109, 109` | Sekundärer Text, Placeholder, Labels, Subtitles |
| **Hellgrau** | `#DDDDDD` | `221, 221, 221` | Borders, Dividers, Disabled States, Muted Backgrounds |
| **Weiß** | `#FFFFFF` | `255, 255, 255` | Hintergründe, Cards, Inputs, Content Areas |
| **Orange (Akzent)** | `#EBBD04` | `235, 189, 4` | **Primary Buttons, Links, Active States, CTAs, Highlights** |

### Akzentfarbe – Die wichtigste Farbe

Die **Orange Akzentfarbe (#EBBD04)** ist das zentrale Branding-Element:

```typescript
// Verwendung der Akzentfarbe
const accentUseCases = {
  // ✅ RICHTIG - Akzentfarbe verwenden für:
  primaryButtons: true,      // "Speichern", "Hinzufügen"
  activeNavItems: true,      // Aktiver Menüpunkt
  links: true,               // Interaktive Links
  focusRings: true,          // Fokus-Indicator bei Inputs
  selectedItems: true,       // Ausgewählte Elemente
  progressBars: true,        // Fortschrittsanzeigen
  badges: true,              // Wichtige Badges
  togglesOn: true,           // Aktive Switches
  
  // ❌ FALSCH - Akzentfarbe NICHT verwenden für:
  bodyText: false,           // Zu wenig Kontrast auf Weiß
  errorStates: false,        // Verwende Rot
  successStates: false,      // Verwende Grün
  backgrounds: false,        // Nur als Light-Variante
};
```

### Abgeleitete Farben

Für UI-Elemente werden zusätzliche Varianten aus den Kernfarben abgeleitet:

```typescript
// src/lib/theme.ts

export const colors = {
  // ═══════════════════════════════════════════════════════════════
  // KERNFARBEN (5 Basis-Farben)
  // ═══════════════════════════════════════════════════════════════
  
  black: '#2D2D2D',
  gray: '#6D6D6D',
  grayLight: '#DDDDDD',
  white: '#FFFFFF',
  accent: '#EBBD04',
  
  // ═══════════════════════════════════════════════════════════════
  // ABGELEITETE FARBEN
  // ═══════════════════════════════════════════════════════════════
  
  // Akzent-Varianten
  accentHover: '#D4A903',      // Dunkleres Orange für Hover
  accentLight: '#FEF3C7',      // Helles Orange für Backgrounds
  accentMuted: '#F5E6A3',      // Gedämpftes Orange
  
  // Grau-Abstufungen (zwischen den Kernfarben)
  grayDark: '#4A4A4A',         // Zwischen Schwarz und Grau
  grayMedium: '#9A9A9A',       // Zwischen Grau und Hellgrau
  grayLighter: '#EEEEEE',      // Zwischen Hellgrau und Weiß
  
  // ═══════════════════════════════════════════════════════════════
  // SEMANTISCHE FARBEN (für Feedback)
  // ═══════════════════════════════════════════════════════════════
  
  success: {
    DEFAULT: '#22C55E',
    light: '#DCFCE7',
    dark: '#166534',
  },
  warning: {
    DEFAULT: '#F59E0B',
    light: '#FEF3C7',
    dark: '#92400E',
  },
  error: {
    DEFAULT: '#EF4444',
    light: '#FEE2E2',
    dark: '#B91C1C',
  },
  info: {
    DEFAULT: '#3B82F6',
    light: '#DBEAFE',
    dark: '#1D4ED8',
  },
  
  // ═══════════════════════════════════════════════════════════════
  // BEREICH-FARBEN (Produktion vs. Montage)
  // ═══════════════════════════════════════════════════════════════
  
  bereich: {
    produktion: {
      bg: '#DCFCE7',       // Grün-Hintergrund
      text: '#166534',     // Grün-Text
      border: '#86EFAC',   // Grün-Border
    },
    montage: {
      bg: '#FEF3C7',       // Gelb-Hintergrund (Akzent-Light)
      text: '#92400E',     // Braun-Text
      border: '#FCD34D',   // Gelb-Border
    },
  },
  
  // ═══════════════════════════════════════════════════════════════
  // VERFÜGBARKEITS-FARBEN (Resource Pool)
  // ═══════════════════════════════════════════════════════════════
  
  availability: {
    available: '#EBBD04',    // Akzent = Verfügbar
    partial: '#6D6D6D',      // Grau = Teilweise belegt
    busy: '#DDDDDD',         // Hellgrau = Voll belegt
    absent: '#EF4444',       // Rot = Abwesenheit
  },
};
```

### Farbkontraste (WCAG 2.1 AA)

| Kombination | Kontrastverhältnis | Status | Verwendung |
|-------------|-------------------|--------|------------|
| Schwarz (#2D2D2D) auf Weiß (#FFFFFF) | **12.6:1** | ✅ AAA | Primärer Text |
| Grau (#6D6D6D) auf Weiß (#FFFFFF) | **5.4:1** | ✅ AA | Sekundärer Text |
| Schwarz (#2D2D2D) auf Hellgrau (#DDDDDD) | **7.8:1** | ✅ AAA | Text auf muted BG |
| Akzent (#EBBD04) auf Weiß (#FFFFFF) | **1.9:1** | ❌ Fail | NUR für Dekoration! |
| Schwarz (#2D2D2D) auf Akzent (#EBBD04) | **6.7:1** | ✅ AA | Button-Text |
| Weiß (#FFFFFF) auf Akzent (#EBBD04) | **1.9:1** | ❌ Fail | NICHT verwenden! |

**Wichtige Regel:** Bei Akzent-Buttons immer **schwarzen Text** verwenden, nicht weißen!

---

## Tailwind Configuration

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
        // ═══════════════════════════════════════════════════════════
        // KERNFARBEN
        // ═══════════════════════════════════════════════════════════
        
        black: '#2D2D2D',
        gray: {
          DEFAULT: '#6D6D6D',
          light: '#DDDDDD',
          dark: '#4A4A4A',
          medium: '#9A9A9A',
          lighter: '#EEEEEE',
        },
        white: '#FFFFFF',
        
        // Akzentfarbe (WICHTIGSTE FARBE!)
        accent: {
          DEFAULT: '#EBBD04',
          hover: '#D4A903',
          light: '#FEF3C7',
          muted: '#F5E6A3',
        },
        
        // ═══════════════════════════════════════════════════════════
        // SHADCN/UI MAPPING
        // ═══════════════════════════════════════════════════════════
        
        // Primary = Akzent
        primary: {
          DEFAULT: '#EBBD04',
          foreground: '#2D2D2D',  // Schwarzer Text auf Akzent!
        },
        
        // Secondary = Hellgrau
        secondary: {
          DEFAULT: '#DDDDDD',
          foreground: '#2D2D2D',
        },
        
        // Backgrounds
        background: '#FFFFFF',
        foreground: '#2D2D2D',
        
        // Muted
        muted: {
          DEFAULT: '#EEEEEE',
          foreground: '#6D6D6D',
        },
        
        // Cards & Popovers
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#2D2D2D',
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#2D2D2D',
        },
        
        // Borders & Inputs
        border: '#DDDDDD',
        input: '#DDDDDD',
        ring: '#EBBD04',
        
        // Destructive
        destructive: {
          DEFAULT: '#EF4444',
          foreground: '#FFFFFF',
        },
        
        // ═══════════════════════════════════════════════════════════
        // SEMANTISCHE FARBEN
        // ═══════════════════════════════════════════════════════════
        
        success: {
          DEFAULT: '#22C55E',
          light: '#DCFCE7',
          dark: '#166534',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
          dark: '#92400E',
        },
        error: {
          DEFAULT: '#EF4444',
          light: '#FEE2E2',
          dark: '#B91C1C',
        },
        info: {
          DEFAULT: '#3B82F6',
          light: '#DBEAFE',
          dark: '#1D4ED8',
        },
        
        // ═══════════════════════════════════════════════════════════
        // BEREICH-FARBEN
        // ═══════════════════════════════════════════════════════════
        
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
        
        // ═══════════════════════════════════════════════════════════
        // VERFÜGBARKEIT
        // ═══════════════════════════════════════════════════════════
        
        availability: {
          available: '#EBBD04',
          partial: '#6D6D6D',
          busy: '#DDDDDD',
          absent: '#EF4444',
        },
      },
      
      // ═══════════════════════════════════════════════════════════
      // TYPOGRAPHY
      // ═══════════════════════════════════════════════════════════
      
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],       // 12px
        sm: ['0.875rem', { lineHeight: '1.25rem' }],   // 14px
        base: ['1rem', { lineHeight: '1.5rem' }],      // 16px
        lg: ['1.125rem', { lineHeight: '1.75rem' }],   // 18px
        xl: ['1.25rem', { lineHeight: '1.75rem' }],    // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem' }],     // 24px
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
      },
      
      // ═══════════════════════════════════════════════════════════
      // SPACING & SIZING
      // ═══════════════════════════════════════════════════════════
      
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
      
      // ═══════════════════════════════════════════════════════════
      // ANIMATIONS
      // ═══════════════════════════════════════════════════════════
      
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
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
```

---

## CSS Custom Properties

```css
/* src/app/globals.css */

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Kernfarben als CSS Variables */
    --color-black: 45 45 45;         /* #2D2D2D */
    --color-gray: 109 109 109;       /* #6D6D6D */
    --color-gray-light: 221 221 221; /* #DDDDDD */
    --color-white: 255 255 255;      /* #FFFFFF */
    --color-accent: 235 189 4;       /* #EBBD04 */
    
    /* Shadcn/UI Variables */
    --background: 0 0% 100%;
    --foreground: 0 0% 18%;
    
    --card: 0 0% 100%;
    --card-foreground: 0 0% 18%;
    
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 18%;
    
    --primary: 45 97% 47%;           /* Akzent */
    --primary-foreground: 0 0% 18%;  /* Schwarz auf Akzent! */
    
    --secondary: 0 0% 87%;           /* Hellgrau */
    --secondary-foreground: 0 0% 18%;
    
    --muted: 0 0% 93%;
    --muted-foreground: 0 0% 43%;
    
    --accent: 45 97% 47%;
    --accent-foreground: 0 0% 18%;
    
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    
    --border: 0 0% 87%;
    --input: 0 0% 87%;
    --ring: 45 97% 47%;
    
    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

/* Utility Classes */
@layer utilities {
  .text-primary-content {
    @apply text-black;
  }
  
  .text-secondary-content {
    @apply text-gray;
  }
  
  .text-muted-content {
    @apply text-gray-medium;
  }
  
  /* Screen Reader Only */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
  
  /* Focus Visible Ring mit Akzentfarbe */
  .focus-ring {
    @apply focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2;
  }
}
```

---

## Typography

### Schriftarten

```typescript
// src/lib/typography.ts

export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
  },
  
  // Font Sizes mit Line Heights
  fontSize: {
    xs: '0.75rem',      // 12px - Kleine Labels, Badges
    sm: '0.875rem',     // 14px - Sekundärer Text, Inputs
    base: '1rem',       // 16px - Body Text
    lg: '1.125rem',     // 18px - Lead Text
    xl: '1.25rem',      // 20px - Section Headers
    '2xl': '1.5rem',    // 24px - Page Titles
    '3xl': '1.875rem',  // 30px - Hero Headlines
  },
  
  // Font Weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};
```

### Typografie-Anwendung

| Element | Größe | Gewicht | Farbe | Beispiel |
|---------|-------|---------|-------|----------|
| H1 | 30px (3xl) | Bold | Schwarz | Seitentitel |
| H2 | 24px (2xl) | Semibold | Schwarz | Section Header |
| H3 | 20px (xl) | Semibold | Schwarz | Card Header |
| Body | 16px (base) | Normal | Schwarz | Fließtext |
| Body Small | 14px (sm) | Normal | Grau | Sekundärer Text |
| Label | 14px (sm) | Medium | Schwarz | Form Labels |
| Caption | 12px (xs) | Normal | Grau | Zeitstempel, Hints |

---

## Z-Index Scale

```typescript
// src/lib/z-index.ts

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  toast: 80,
};
```

---

## Accessibility Guidelines

### Grundprinzipien

planned. folgt den **WCAG 2.1 Level AA** Standards:

1. **Perceivable** – Inhalte für alle wahrnehmbar (inkl. Screenreader)
2. **Operable** – Vollständig per Tastatur bedienbar
3. **Understandable** – Verständliche Texte und vorhersehbares Verhalten
4. **Robust** – Kompatibel mit assistiven Technologien

### Farbregeln

```typescript
// REGEL 1: Akzentfarbe NIE als einzige Information
// ❌ FALSCH
<div className="bg-accent">Fehler</div>

// ✅ RICHTIG
<div className="bg-error-light border-l-4 border-error flex items-center gap-2">
  <AlertIcon className="text-error" />
  <span>Fehler: Beschreibung</span>
</div>

// REGEL 2: Bei Akzent-Buttons IMMER schwarzen Text
// ❌ FALSCH
<Button className="bg-accent text-white">Speichern</Button>

// ✅ RICHTIG
<Button className="bg-accent text-black hover:bg-accent-hover">Speichern</Button>

// REGEL 3: Grauer Text nur auf weißem/hellem Hintergrund
// ❌ FALSCH
<div className="bg-gray">
  <span className="text-gray">Text</span>
</div>

// ✅ RICHTIG
<div className="bg-white">
  <span className="text-gray">Sekundärer Text</span>
</div>
```

### Chart & Visualisierungs-Accessibility

```typescript
// REGEL 1: Charts IMMER mit aria-label und role="img"
<div
  role="img"
  aria-label="Burndown Chart: 45 von 80 Stunden verbraucht"
>
  <LineChart />
</div>

// REGEL 2: Textuelle Alternative bereitstellen
// Unterhalb des Charts eine Zusammenfassung für Screenreader
<div aria-hidden="true">
  <LineChart data={data} />
</div>
<dl className="sr-only">
  <dt>Budget:</dt><dd>80 Stunden</dd>
  <dt>Verbraucht:</dt><dd>45 Stunden</dd>
  <dt>Verbleibend:</dt><dd>35 Stunden</dd>
</dl>

// REGEL 3: Progress Bars mit korrekten ARIA-Attributen
<div
  role="progressbar"
  aria-valuenow={45}
  aria-valuemin={0}
  aria-valuemax={80}
  aria-label="Phasen-Fortschritt: 45 von 80 Stunden"
>
  {/* Visual Bar */}
</div>

// REGEL 4: Farbe nie als einzige Information in Charts
// ❌ FALSCH: Nur Farbe unterscheidet die Linien
// ✅ RICHTIG: Legende mit Text + unterschiedliche Linienstile
<Line
  type="monotone"
  dataKey="planned"
  stroke="#EBBD04"
  strokeDasharray="5 5"  // Gestrichelt für "Geplant"
/>
<Line
  type="monotone"
  dataKey="actual"
  stroke="#22C55E"
  strokeDasharray="0"    // Durchgezogen für "Ist"
/>
```

### Keyboard Navigation

```typescript
// src/lib/keyboard.ts

export const KEYBOARD_SHORTCUTS = {
  // Navigation
  NEXT_DAY: 'ArrowRight',
  PREV_DAY: 'ArrowLeft',
  NEXT_WEEK: 'ArrowDown',
  PREV_WEEK: 'ArrowUp',
  TODAY: 't',
  
  // Actions
  DELETE: 'Delete',
  UNDO: 'mod+z',        // Cmd/Ctrl + Z
  REDO: 'mod+shift+z',
  SAVE: 'mod+s',
  SEARCH: 'mod+k',
  HELP: '?',
  
  // Dialogs
  CLOSE: 'Escape',
  CONFIRM: 'Enter',
  
  // Views
  DAY_VIEW: 'd',
  WEEK_VIEW: 'w',
  FILTER: 'f',
};

/**
 * Focus-Trap für Modals und Dialogs
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!isActive || !containerRef.current) return;
    
    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();
    
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);
  
  return containerRef;
}
```

### Screen Reader Announcements

```typescript
// src/presentation/components/ui/ScreenReaderAnnounce.tsx

interface ScreenReaderAnnounceProps {
  message: string;
  politeness?: 'polite' | 'assertive';
}

/**
 * Unsichtbare Komponente für Screen Reader Ankündigungen.
 * Verwendung: Statusänderungen, Erfolgs-/Fehlermeldungen
 */
export function ScreenReaderAnnounce({ 
  message, 
  politeness = 'polite' 
}: ScreenReaderAnnounceProps) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}
```

### Skip Links

```typescript
// src/presentation/components/layout/SkipLinks.tsx

export function SkipLinks() {
  return (
    <nav aria-label="Sprungnavigation" className="sr-only focus-within:not-sr-only">
      <a
        href="#main-content"
        className="absolute top-0 left-0 bg-black text-white px-4 py-2 z-[100] 
                   transform -translate-y-full focus:translate-y-0 transition-transform"
      >
        Zum Hauptinhalt springen
      </a>
      <a
        href="#main-navigation"
        className="absolute top-0 left-32 bg-black text-white px-4 py-2 z-[100]
                   transform -translate-y-full focus:translate-y-0 transition-transform"
      >
        Zur Navigation springen
      </a>
      <a
        href="#resource-pool"
        className="absolute top-0 left-64 bg-black text-white px-4 py-2 z-[100]
                   transform -translate-y-full focus:translate-y-0 transition-transform"
      >
        Zum Ressourcen-Pool springen
      </a>
    </nav>
  );
}
```

---

## Layout Components

### AppShell

```tsx
// src/presentation/components/layout/AppShell.tsx

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen bg-white">
      <SkipLinks />
      <Sidebar />
      <main 
        id="main-content"
        className="flex-1 overflow-auto"
        role="main"
        aria-label="Hauptinhalt"
      >
        {children}
      </main>
    </div>
  );
}
```

### Sidebar

```tsx
// src/presentation/components/layout/Sidebar.tsx

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', roles: ['admin', 'planer'] },
  { icon: Calendar, label: 'Planung', href: '/planung', roles: ['admin', 'planer'] },
  { icon: Folder, label: 'Projekte', href: '/projekte', roles: ['admin', 'planer'] },
  { icon: Users, label: 'Mitarbeiter', href: '/mitarbeiter', roles: ['admin', 'planer'] },
  { icon: Truck, label: 'Ressourcen', href: '/ressourcen', roles: ['admin', 'planer'] },
  { icon: Settings, label: 'Einstellungen', href: '/einstellungen', roles: ['admin'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useCurrentUser();
  
  const visibleItems = navItems.filter(item => 
    item.roles.includes(user?.role ?? 'gewerblich')
  );
  
  return (
    <aside 
      id="main-navigation"
      className="w-60 bg-white border-r border-gray-light flex flex-col"
      role="navigation"
      aria-label="Hauptnavigation"
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-gray-light">
        <Link href="/dashboard" className="flex items-center gap-2 focus-ring rounded">
          <span className="text-2xl font-bold text-black">planned.</span>
        </Link>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul role="list" className="space-y-1">
          {visibleItems.map(item => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    "focus-ring",
                    isActive 
                      ? "bg-accent-light text-black font-medium" 
                      : "text-gray hover:bg-gray-lighter hover:text-black"
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon 
                    className={cn("w-5 h-5", isActive ? "text-accent" : "text-gray")} 
                    aria-hidden="true" 
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      {/* User Section */}
      <div className="p-4 border-t border-gray-light">
        <UserNav />
      </div>
    </aside>
  );
}
```

### Header

```tsx
// src/presentation/components/layout/Header.tsx

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="h-16 border-b border-gray-light bg-white px-6 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold text-black">{title}</h1>
        {subtitle && (
          <p className="text-sm text-gray">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </header>
  );
}
```

---

## Planning Components

### PlanningGrid

```tsx
// src/presentation/components/planning/PlanningGrid.tsx

interface PlanningGridProps {
  projects: ProjectWithPhases[];
  allocations: AllocationWithDetails[];
  weekStart: Date;
  viewMode: 'day' | 'week';
}

export function PlanningGrid({ projects, allocations, weekStart, viewMode }: PlanningGridProps) {
  const days = viewMode === 'day' 
    ? getWeekDays(weekStart) 
    : getWeeksInRange(weekStart, 5);
  
  return (
    <div 
      className="border border-gray-light rounded-lg overflow-hidden bg-white"
      role="grid"
      aria-label="Planungsraster"
    >
      {/* Header Row */}
      <div 
        className="grid bg-gray-lighter border-b border-gray-light"
        style={{ gridTemplateColumns: `300px repeat(${days.length}, 1fr)` }}
        role="row"
      >
        <div className="p-3 font-medium text-sm text-gray" role="columnheader">
          Projekt / Phase
        </div>
        {days.map(day => (
          <DateHeader key={day.toISOString()} date={day} viewMode={viewMode} />
        ))}
      </div>
      
      {/* Project Rows */}
      {projects.map(project => (
        <ProjectRow 
          key={project.id}
          project={project}
          allocations={allocations}
          days={days}
          viewMode={viewMode}
        />
      ))}
    </div>
  );
}
```

### AllocationChip

```tsx
// src/presentation/components/planning/AllocationChip.tsx

interface AllocationChipProps {
  allocation: AllocationWithDetails;
  hasAbsenceWarning?: boolean;
  hasMultiWarning?: boolean;
  onDelete?: () => void;
}

export function AllocationChip({ 
  allocation, 
  hasAbsenceWarning,
  hasMultiWarning,
  onDelete 
}: AllocationChipProps) {
  const isUser = !!allocation.userId;
  const displayName = isUser 
    ? allocation.user?.fullName 
    : allocation.resource?.name;
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded text-xs",
            "transition-colors cursor-pointer focus-ring",
            "bg-accent-light text-black border border-accent",
            hasAbsenceWarning && "border-error bg-error-light",
            hasMultiWarning && "border-warning bg-warning-light"
          )}
          aria-label={`${displayName}${hasAbsenceWarning ? ', hat Abwesenheit' : ''}${hasMultiWarning ? ', mehrfach eingeplant' : ''}`}
        >
          {/* Avatar/Icon */}
          {isUser ? (
            <Avatar className="w-5 h-5">
              <AvatarFallback className="text-[10px] bg-accent text-black">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <Truck className="w-4 h-4 text-gray" aria-hidden="true" />
          )}
          
          {/* Name */}
          <span className="truncate max-w-[80px]">{displayName}</span>
          
          {/* Warning Icons */}
          {hasAbsenceWarning && (
            <AlertTriangle className="w-3 h-3 text-error" aria-hidden="true" />
          )}
          {hasMultiWarning && (
            <AlertCircle className="w-3 h-3 text-warning" aria-hidden="true" />
          )}
        </button>
      </PopoverTrigger>
      
      <PopoverContent className="w-64">
        <AllocationPopover allocation={allocation} onDelete={onDelete} />
      </PopoverContent>
    </Popover>
  );
}
```

### BereichBadge

```tsx
// src/presentation/components/shared/BereichBadge.tsx

interface BereichBadgeProps {
  bereich: 'produktion' | 'montage';
}

export function BereichBadge({ bereich }: BereichBadgeProps) {
  const config = {
    produktion: {
      label: 'PRODUKTION',
      className: 'bg-bereich-produktion-bg text-bereich-produktion-text border-bereich-produktion-border',
    },
    montage: {
      label: 'VOR ORT',
      className: 'bg-bereich-montage-bg text-bereich-montage-text border-bereich-montage-border',
    },
  };
  
  const { label, className } = config[bereich];
  
  return (
    <span 
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
        className
      )}
    >
      {label}
    </span>
  );
}
```

---

## Resource Pool Components

### ResourcePool

```tsx
// src/presentation/components/resource-pool/ResourcePool.tsx

interface ResourcePoolProps {
  users: UserWithAvailability[];
  resources: ResourceWithAvailability[];
  weekDays: Date[];
}

export function ResourcePool({ users, resources, weekDays }: ResourcePoolProps) {
  const [filter, setFilter] = useState<'all' | 'users' | 'resources'>('all');
  const [search, setSearch] = useState('');
  
  const filteredUsers = users.filter(u => 
    filter !== 'resources' && 
    u.fullName.toLowerCase().includes(search.toLowerCase())
  );
  
  const filteredResources = resources.filter(r => 
    filter !== 'users' && 
    r.name.toLowerCase().includes(search.toLowerCase())
  );
  
  const availableCount = filteredUsers.filter(u => u.isAvailableToday).length +
                         filteredResources.filter(r => r.isAvailableToday).length;
  
  return (
    <div 
      id="resource-pool"
      className="border-t border-gray-light bg-white"
      role="region"
      aria-label="Ressourcen-Pool"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-light">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-black">RESSOURCEN-POOL</h2>
          <span className="text-sm text-gray">
            {availableCount} verfügbar
          </span>
        </div>
        
        {/* Filter Tabs */}
        <div className="flex gap-1">
          {(['all', 'users', 'resources'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1 text-sm rounded transition-colors focus-ring",
                filter === f 
                  ? "bg-accent text-black" 
                  : "text-gray hover:bg-gray-lighter"
              )}
            >
              {f === 'all' ? 'Alle' : f === 'users' ? 'Mitarbeiter' : 'Ressourcen'}
            </button>
          ))}
        </div>
      </div>
      
      {/* Search */}
      <div className="px-4 py-2 border-b border-gray-light">
        <Input
          placeholder="Suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8"
        />
      </div>
      
      {/* Cards */}
      <div className="p-4 grid grid-cols-4 gap-3 max-h-[200px] overflow-y-auto">
        {filteredUsers.map(user => (
          <ResourceCard 
            key={user.id}
            type="user"
            data={user}
            weekDays={weekDays}
          />
        ))}
        {filteredResources.map(resource => (
          <ResourceCard 
            key={resource.id}
            type="resource"
            data={resource}
            weekDays={weekDays}
          />
        ))}
      </div>
    </div>
  );
}
```

### AvailabilityIndicator

```tsx
// src/presentation/components/resource-pool/AvailabilityIndicator.tsx

type AvailabilityStatus = 'available' | 'partial' | 'busy' | 'absent';

interface AvailabilityIndicatorProps {
  status: AvailabilityStatus;
  day: Date;
  tooltip?: string;
}

export function AvailabilityIndicator({ status, day, tooltip }: AvailabilityIndicatorProps) {
  const config: Record<AvailabilityStatus, { className: string; label: string }> = {
    available: {
      className: 'bg-availability-available',  // Akzent = Verfügbar
      label: 'Verfügbar',
    },
    partial: {
      className: 'bg-availability-partial',    // Grau = Teilweise
      label: 'Teilweise belegt',
    },
    busy: {
      className: 'bg-availability-busy border border-gray-light',  // Hellgrau = Belegt
      label: 'Vollständig belegt',
    },
    absent: {
      className: 'bg-availability-absent',     // Rot = Abwesend
      label: 'Abwesend',
    },
  };
  
  const { className, label } = config[status];
  const dayLabel = format(day, 'EEEE', { locale: de });
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn("w-3 h-3 rounded-full", className)}
          role="img"
          aria-label={`${dayLabel}: ${label}`}
        />
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{tooltip || `${dayLabel}: ${label}`}</p>
      </TooltipContent>
    </Tooltip>
  );
}
```

---

## Form Components

### FormField

```tsx
// src/presentation/components/shared/FormField.tsx

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FormField({ id, label, error, hint, required, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label 
        htmlFor={id}
        className={cn("text-sm font-medium text-black", error && "text-error")}
      >
        {label}
        {required && <span className="text-error ml-1" aria-hidden="true">*</span>}
        {required && <span className="sr-only">(Pflichtfeld)</span>}
      </Label>
      
      {children}
      
      {error && (
        <p id={`${id}-error`} className="text-sm text-error" role="alert">
          {error}
        </p>
      )}
      
      {hint && !error && (
        <p id={`${id}-hint`} className="text-sm text-gray">
          {hint}
        </p>
      )}
    </div>
  );
}
```

### Button Variants

```tsx
// Button-Verwendung mit Farbschema

// Primary Button (Akzent)
<Button className="bg-accent text-black hover:bg-accent-hover">
  Speichern
</Button>

// Secondary Button (Outlined)
<Button variant="outline" className="border-gray-light text-black hover:bg-gray-lighter">
  Abbrechen
</Button>

// Destructive Button
<Button variant="destructive">
  Löschen
</Button>

// Ghost Button
<Button variant="ghost" className="text-gray hover:text-black hover:bg-gray-lighter">
  Mehr anzeigen
</Button>

// Link Button
<Button variant="link" className="text-accent hover:text-accent-hover">
  Details anzeigen
</Button>
```

---

## Feedback Components

### Toast

```tsx
// src/presentation/components/ui/Toast.tsx

const toastVariants = {
  default: 'bg-white border-gray-light',
  success: 'bg-success-light border-success',
  warning: 'bg-warning-light border-warning',
  destructive: 'bg-error-light border-error',
};

const toastIcons = {
  default: null,
  success: <CheckCircle className="w-5 h-5 text-success" />,
  warning: <AlertTriangle className="w-5 h-5 text-warning" />,
  destructive: <XCircle className="w-5 h-5 text-error" />,
};
```

### EmptyState

```tsx
// src/presentation/components/feedback/EmptyState.tsx

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div 
      className="flex flex-col items-center justify-center p-12 text-center"
      role="status"
    >
      <div 
        className="w-16 h-16 bg-gray-lighter rounded-full flex items-center justify-center mb-4"
        aria-hidden="true"
      >
        <Icon className="w-8 h-8 text-gray" />
      </div>
      <h3 className="text-lg font-medium text-black">{title}</h3>
      <p className="text-sm text-gray mt-1 max-w-sm">{description}</p>
      
      {action && (
        <Button 
          className="mt-4 bg-accent text-black hover:bg-accent-hover" 
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

### LoadingSpinner

```tsx
// src/presentation/components/feedback/LoadingSpinner.tsx

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function LoadingSpinner({ size = 'md', label = 'Wird geladen...' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };
  
  return (
    <div role="status" aria-label={label}>
      <Loader2 
        className={cn("animate-spin text-accent", sizeClasses[size])}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
```

---

## Error Handling Components

### Error Message Mapping

```typescript
// src/lib/error-messages.ts

/**
 * Deutsche Fehlermeldungen für alle API Error Codes.
 * Verwendet in Toast-Notifications und Inline-Errors.
 */
export const ERROR_MESSAGES: Record<string, string> = {
  // ═══════════════════════════════════════════════════════════════
  // ALLOCATION ERRORS
  // ═══════════════════════════════════════════════════════════════
  'ALLOCATION_NOT_FOUND': 'Zuweisung nicht gefunden',
  'ALLOCATION_CONFLICT': 'Ressource ist zu diesem Zeitpunkt bereits eingeplant',
  'ALLOCATION_PAST_DATE': 'Zuweisungen in der Vergangenheit können nicht erstellt werden',
  'ALLOCATION_INVALID_HOURS': 'Ungültige Stundenanzahl',
  'ALLOCATION_EXCEEDS_CAPACITY': 'Kapazität überschritten',

  // ═══════════════════════════════════════════════════════════════
  // USER ERRORS
  // ═══════════════════════════════════════════════════════════════
  'USER_NOT_FOUND': 'Mitarbeiter nicht gefunden',
  'USER_INACTIVE': 'Mitarbeiter ist nicht aktiv',
  'USER_HAS_ABSENCE': 'Mitarbeiter hat eine Abwesenheit an diesem Tag',
  'USER_ALREADY_ALLOCATED': 'Mitarbeiter ist bereits eingeplant',

  // ═══════════════════════════════════════════════════════════════
  // PROJECT & PHASE ERRORS
  // ═══════════════════════════════════════════════════════════════
  'PROJECT_NOT_FOUND': 'Projekt nicht gefunden',
  'PROJECT_ARCHIVED': 'Projekt ist archiviert',
  'PHASE_NOT_FOUND': 'Phase nicht gefunden',
  'PHASE_COMPLETED': 'Phase ist bereits abgeschlossen',
  'PHASE_BUDGET_EXCEEDED': 'Phasen-Budget überschritten',

  // ═══════════════════════════════════════════════════════════════
  // RESOURCE ERRORS
  // ═══════════════════════════════════════════════════════════════
  'RESOURCE_NOT_FOUND': 'Ressource nicht gefunden',
  'RESOURCE_INACTIVE': 'Ressource ist nicht aktiv',
  'RESOURCE_TYPE_NOT_FOUND': 'Ressourcentyp nicht gefunden',

  // ═══════════════════════════════════════════════════════════════
  // AUTH & PERMISSION ERRORS
  // ═══════════════════════════════════════════════════════════════
  'UNAUTHORIZED': 'Nicht autorisiert',
  'FORBIDDEN': 'Keine Berechtigung für diese Aktion',
  'SESSION_EXPIRED': 'Sitzung abgelaufen – bitte erneut anmelden',
  'INVALID_CREDENTIALS': 'Ungültige Anmeldedaten',

  // ═══════════════════════════════════════════════════════════════
  // INTEGRATION ERRORS
  // ═══════════════════════════════════════════════════════════════
  'ASANA_SYNC_FAILED': 'Asana-Synchronisation fehlgeschlagen',
  'ASANA_TOKEN_EXPIRED': 'Asana-Verbindung abgelaufen – bitte neu verbinden',
  'ASANA_PROJECT_NOT_FOUND': 'Asana-Projekt nicht gefunden',
  'ASANA_WEBHOOK_FAILED': 'Asana-Webhook konnte nicht erstellt werden',
  'TIMETAC_SYNC_FAILED': 'TimeTac-Synchronisation fehlgeschlagen',
  'TIMETAC_TOKEN_INVALID': 'TimeTac API-Token ungültig',
  'TIMETAC_USER_NOT_MAPPED': 'TimeTac-Benutzer nicht zugeordnet',

  // ═══════════════════════════════════════════════════════════════
  // VALIDATION ERRORS
  // ═══════════════════════════════════════════════════════════════
  'VALIDATION_ERROR': 'Ungültige Eingabe',
  'REQUIRED_FIELD': 'Pflichtfeld nicht ausgefüllt',
  'INVALID_DATE': 'Ungültiges Datum',
  'INVALID_EMAIL': 'Ungültige E-Mail-Adresse',
  'INVALID_UUID': 'Ungültige ID',

  // ═══════════════════════════════════════════════════════════════
  // GENERIC ERRORS
  // ═══════════════════════════════════════════════════════════════
  'INTERNAL_ERROR': 'Ein unerwarteter Fehler ist aufgetreten',
  'NETWORK_ERROR': 'Netzwerkfehler – bitte Verbindung prüfen',
  'RATE_LIMITED': 'Zu viele Anfragen – bitte kurz warten',
  'SERVICE_UNAVAILABLE': 'Dienst vorübergehend nicht verfügbar',
};

/**
 * Holt die deutsche Fehlermeldung für einen Error Code.
 */
export function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] || 'Ein unbekannter Fehler ist aufgetreten';
}
```

### ErrorAlert Component

```tsx
// src/presentation/components/feedback/ErrorAlert.tsx

interface ErrorAlertProps {
  code: string;
  details?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorAlert({ code, details, onRetry, onDismiss }: ErrorAlertProps) {
  const message = getErrorMessage(code);

  return (
    <div
      role="alert"
      className="bg-error-light border border-error rounded-lg p-4 flex items-start gap-3"
    >
      <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" aria-hidden="true" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-error-dark">{message}</p>
        {details && (
          <p className="text-xs text-gray mt-1">{details}</p>
        )}
      </div>

      <div className="flex gap-2">
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="text-error hover:bg-error-light"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Erneut versuchen
          </Button>
        )}
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="text-gray hover:bg-gray-lighter"
          >
            <X className="w-4 h-4" />
            <span className="sr-only">Schließen</span>
          </Button>
        )}
      </div>
    </div>
  );
}
```

---

## Filter Components

### FilterDropdown

```tsx
// src/presentation/components/shared/FilterDropdown.tsx

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  placeholder?: string;
}

export function FilterDropdown({
  label,
  options,
  value,
  onChange,
  multiple = false,
  placeholder = 'Alle',
}: FilterDropdownProps) {
  const selectedLabels = multiple
    ? options.filter(o => (value as string[]).includes(o.value)).map(o => o.label).join(', ')
    : options.find(o => o.value === value)?.label;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-9 border-gray-light text-sm justify-between min-w-[140px]"
          aria-label={`${label} Filter`}
        >
          <span className="truncate">
            {selectedLabels || placeholder}
          </span>
          <ChevronDown className="w-4 h-4 ml-2 text-gray" aria-hidden="true" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-1">
          {options.map(option => {
            const isSelected = multiple
              ? (value as string[]).includes(option.value)
              : value === option.value;

            return (
              <button
                key={option.value}
                onClick={() => {
                  if (multiple) {
                    const newValue = isSelected
                      ? (value as string[]).filter(v => v !== option.value)
                      : [...(value as string[]), option.value];
                    onChange(newValue);
                  } else {
                    onChange(option.value);
                  }
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded text-sm",
                  "transition-colors focus-ring",
                  isSelected
                    ? "bg-accent-light text-black"
                    : "hover:bg-gray-lighter text-gray"
                )}
              >
                <span>{option.label}</span>
                <div className="flex items-center gap-2">
                  {option.count !== undefined && (
                    <span className="text-xs text-gray">{option.count}</span>
                  )}
                  {isSelected && (
                    <Check className="w-4 h-4 text-accent" aria-hidden="true" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

### BereichFilter

```tsx
// src/presentation/components/planning/BereichFilter.tsx

type Bereich = 'all' | 'produktion' | 'montage';

interface BereichFilterProps {
  value: Bereich;
  onChange: (value: Bereich) => void;
}

export function BereichFilter({ value, onChange }: BereichFilterProps) {
  const options: { value: Bereich; label: string; color?: string }[] = [
    { value: 'all', label: 'Alle Bereiche' },
    { value: 'produktion', label: 'Produktion', color: 'bg-bereich-produktion-bg' },
    { value: 'montage', label: 'Vor Ort', color: 'bg-bereich-montage-bg' },
  ];

  return (
    <div
      className="flex gap-1 p-1 bg-gray-lighter rounded-lg"
      role="radiogroup"
      aria-label="Bereich Filter"
    >
      {options.map(option => (
        <button
          key={option.value}
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors focus-ring",
            value === option.value
              ? "bg-white text-black shadow-sm"
              : "text-gray hover:text-black"
          )}
        >
          {option.color && (
            <span
              className={cn("w-2 h-2 rounded-full", option.color)}
              aria-hidden="true"
            />
          )}
          {option.label}
        </button>
      ))}
    </div>
  );
}
```

### FilterBar

```tsx
// src/presentation/components/planning/FilterBar.tsx

interface FilterBarProps {
  bereich: Bereich;
  onBereichChange: (value: Bereich) => void;
  projectStatus: string;
  onProjectStatusChange: (value: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function FilterBar({
  bereich,
  onBereichChange,
  projectStatus,
  onProjectStatusChange,
  searchQuery,
  onSearchChange,
}: FilterBarProps) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-gray-light bg-white">
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Projekt suchen..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Bereich Filter */}
      <BereichFilter value={bereich} onChange={onBereichChange} />

      {/* Project Status Filter */}
      <FilterDropdown
        label="Status"
        value={projectStatus}
        onChange={(v) => onProjectStatusChange(v as string)}
        options={[
          { value: 'all', label: 'Alle Status' },
          { value: 'active', label: 'Aktiv' },
          { value: 'planned', label: 'Geplant' },
          { value: 'completed', label: 'Abgeschlossen' },
        ]}
      />
    </div>
  );
}
```

---

## Dashboard Components

### BurndownChart

```tsx
// src/presentation/components/dashboard/BurndownChart.tsx

interface BurndownChartProps {
  budgetHours: number;
  plannedHours: number;
  actualHours: number;
  dateRange: [Date, Date];
  data: { date: string; planned: number; actual: number }[];
}

export function BurndownChart({
  budgetHours,
  plannedHours,
  actualHours,
  dateRange,
  data
}: BurndownChartProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-light p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-black">Stunden-Burndown</h3>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-accent" aria-hidden="true" />
            <span className="text-gray">Geplant</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-success" aria-hidden="true" />
            <span className="text-gray">Ist</span>
          </div>
        </div>
      </div>

      {/* Chart Container - verwendet recharts */}
      <div
        className="h-48"
        role="img"
        aria-label={`Burndown Chart: ${actualHours} von ${budgetHours} Stunden verbraucht`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#DDDDDD" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#6D6D6D' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6D6D6D' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #DDDDDD',
                borderRadius: '8px',
              }}
            />
            <Line
              type="monotone"
              dataKey="planned"
              stroke="#EBBD04"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#22C55E"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-light">
        <div>
          <p className="text-xs text-gray">Budget</p>
          <p className="text-lg font-semibold text-black">{budgetHours}h</p>
        </div>
        <div>
          <p className="text-xs text-gray">Geplant</p>
          <p className="text-lg font-semibold text-accent">{plannedHours}h</p>
        </div>
        <div>
          <p className="text-xs text-gray">Verbraucht</p>
          <p className="text-lg font-semibold text-success">{actualHours}h</p>
        </div>
      </div>
    </div>
  );
}
```

### CapacityGauge

```tsx
// src/presentation/components/dashboard/CapacityGauge.tsx

interface CapacityGaugeProps {
  label: string;
  current: number;
  total: number;
  unit?: string;
}

export function CapacityGauge({ label, current, total, unit = 'h' }: CapacityGaugeProps) {
  const percentage = Math.min((current / total) * 100, 100);
  const colorScheme = percentage < 70 ? 'success' : percentage < 90 ? 'warning' : 'error';

  const colors = {
    success: { bar: 'bg-success', text: 'text-success' },
    warning: { bar: 'bg-warning', text: 'text-warning' },
    error: { bar: 'bg-error', text: 'text-error' },
  };

  return (
    <div className="bg-white rounded-lg border border-gray-light p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-black">{label}</span>
        <span className={cn("text-sm font-semibold", colors[colorScheme].text)}>
          {Math.round(percentage)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div
        className="h-2 bg-gray-lighter rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${label}: ${current} von ${total} ${unit}`}
      >
        <div
          className={cn("h-full rounded-full transition-all", colors[colorScheme].bar)}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Values */}
      <div className="flex justify-between mt-2 text-xs text-gray">
        <span>{current}{unit} belegt</span>
        <span>{total}{unit} verfügbar</span>
      </div>
    </div>
  );
}
```

### KPICard

```tsx
// src/presentation/components/dashboard/KPICard.tsx

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
  };
  icon?: LucideIcon;
}

export function KPICard({ title, value, subtitle, trend, icon: Icon }: KPICardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-light p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray">{title}</p>
          <p className="text-2xl font-bold text-black mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray mt-1">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="p-2 bg-accent-light rounded-lg">
            <Icon className="w-5 h-5 text-accent" aria-hidden="true" />
          </div>
        )}
      </div>

      {trend && (
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-light">
          {trend.value >= 0 ? (
            <TrendingUp className="w-4 h-4 text-success" aria-hidden="true" />
          ) : (
            <TrendingDown className="w-4 h-4 text-error" aria-hidden="true" />
          )}
          <span className={cn(
            "text-sm font-medium",
            trend.value >= 0 ? "text-success" : "text-error"
          )}>
            {trend.value >= 0 ? '+' : ''}{trend.value}%
          </span>
          <span className="text-xs text-gray">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
```

---

## Mobile Components

### MobileShell

```tsx
// src/presentation/components/mobile/MobileShell.tsx

export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-lighter pb-16">
      <SkipLinks />
      <main 
        id="main-content" 
        role="main"
        aria-label="Hauptinhalt"
      >
        {children}
      </main>
      <MobileNavigation />
    </div>
  );
}

function MobileNavigation() {
  const pathname = usePathname();
  
  const items = [
    { icon: Calendar, label: 'Meine Woche', href: '/meine-woche' },
    { icon: User, label: 'Profil', href: '/profil' },
  ];
  
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-light"
      aria-label="Mobile Navigation"
    >
      <ul role="list" className="flex justify-around py-2">
        {items.map(item => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center p-2 rounded-lg focus-ring",
                  isActive ? "text-accent" : "text-gray"
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon className="w-6 h-6" aria-hidden="true" />
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

---

## Änderungshistorie

| Version | Datum | Änderungen |
|---------|-------|------------|
| 1.0 | Januar 2026 | Initial für Antigravity |
| 1.1 | Januar 2026 | + AllocationPopover, + FilterPanel, + DateHeader, + SyncStatusIndicator, + EmptyState Components, + Extended Design System Colors, + Z-Index Scale |
| 1.2 | Januar 2026 | + Accessibility Guidelines, + WCAG 2.1 AA Compliance, + Keyboard Navigation, + Screen Reader Announcements, + Skip Links, + Focus Management |
| 1.3 | Januar 2026 | **NEUES FARBSCHEMA:** 5 Kernfarben (Schwarz #2D2D2D, Grau #6D6D6D, Hellgrau #DDDDDD, Weiß #FFFFFF, Orange/Akzent #EBBD04), + Vollständige Tailwind Config, + CSS Custom Properties, + Farbkontrast-Tabelle aktualisiert, + Button-Text auf Akzent = Schwarz (nicht Weiß!), + Alle Komponenten an neues Farbschema angepasst |

---

*Version: 1.3 für Antigravity*  
*Erstellt: 29. Januar 2026*
