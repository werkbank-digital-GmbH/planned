import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Kombiniert Tailwind-Klassen intelligent.
 * Nutzt clsx für bedingte Klassen und tailwind-merge für Konfliktauflösung.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
