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
