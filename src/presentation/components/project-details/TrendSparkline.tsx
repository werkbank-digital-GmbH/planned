'use client';

import type { PhaseSnapshot } from '@/domain/analytics/types';

import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface TrendSparklineProps {
  /** Snapshot-Daten (chronologisch sortiert, älteste zuerst) */
  snapshots: Pick<PhaseSnapshot, 'snapshot_date' | 'ist_hours'>[];
  /** Breite in Pixeln */
  width?: number;
  /** Höhe in Pixeln */
  height?: number;
  /** Linienfarbe */
  color?: 'green' | 'yellow' | 'red' | 'gray';
  /** Zusätzliche CSS-Klassen */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

const COLOR_MAP: Record<string, string> = {
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
  gray: '#9ca3af',
};

/**
 * Berechnet die SVG-Path-Daten für eine Sparkline.
 */
function calculatePath(
  values: number[],
  width: number,
  height: number,
  padding: number = 2
): string {
  if (values.length === 0) return '';
  if (values.length === 1) {
    // Nur ein Punkt - zeichne horizontale Linie
    const y = height / 2;
    return `M ${padding} ${y} L ${width - padding} ${y}`;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1; // Verhindere Division durch 0

  const effectiveWidth = width - 2 * padding;
  const effectiveHeight = height - 2 * padding;

  const points = values.map((value, index) => {
    const x = padding + (index / (values.length - 1)) * effectiveWidth;
    // Invertiere Y (SVG hat 0 oben)
    const y = padding + effectiveHeight - ((value - min) / range) * effectiveHeight;
    return { x, y };
  });

  // Erstelle SVG-Path
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Inline-Sparkline-Grafik für IST-Stunden-Trend.
 *
 * Zeigt den Verlauf der IST-Stunden über die letzten Snapshots
 * als kleine SVG-Liniengrafik an.
 *
 * @example
 * ```tsx
 * <TrendSparkline
 *   snapshots={phaseSnapshots}
 *   width={60}
 *   height={20}
 *   color="green"
 * />
 * ```
 */
export function TrendSparkline({
  snapshots,
  width = 60,
  height = 20,
  color = 'gray',
  className,
}: TrendSparklineProps) {
  // Extrahiere IST-Stunden-Werte
  const values = snapshots.map((s) => s.ist_hours);

  // Keine Daten oder nur ein Datenpunkt
  if (values.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={cn('inline-block', className)}
        aria-label="Keine Trenddaten verfügbar"
      >
        <line
          x1={2}
          y1={height / 2}
          x2={width - 2}
          y2={height / 2}
          stroke={COLOR_MAP.gray}
          strokeWidth={1.5}
          strokeDasharray="2,2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const path = calculatePath(values, width, height);
  const strokeColor = COLOR_MAP[color] ?? COLOR_MAP.gray;

  // Berechne ob Trend steigend oder fallend ist für Label
  const firstValue = values[0];
  const lastValue = values[values.length - 1];
  const trendLabel =
    lastValue > firstValue
      ? 'Steigender Trend'
      : lastValue < firstValue
        ? 'Fallender Trend'
        : 'Stabiler Trend';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('inline-block', className)}
      aria-label={`${trendLabel}: ${values.length} Datenpunkte`}
    >
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Aktueller Wert als Punkt am Ende */}
      {values.length > 0 && (
        <circle
          cx={width - 2}
          cy={
            2 +
            (height - 4) -
            ((lastValue - Math.min(...values)) / (Math.max(...values) - Math.min(...values) || 1)) *
              (height - 4)
          }
          r={2}
          fill={strokeColor}
        />
      )}
    </svg>
  );
}
