'use client';

import { Lightbulb, TrendingDown, TrendingUp, Minus, UserPlus, Calendar, AlertTriangle } from 'lucide-react';

import type { BurnRateTrend, DataQuality, InsightStatus, SuggestedAction } from '@/domain/analytics/types';

import { Button } from '@/presentation/components/ui/button';
import { Card, CardContent, CardHeader } from '@/presentation/components/ui/card';

import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface InsightCardProps {
  title: string;
  status: InsightStatus;
  summaryText: string;
  detailText?: string | null;
  recommendationText?: string | null;
  progressPercent?: number | null;
  burnRateTrend?: BurnRateTrend | null;
  remainingHours?: number | null;
  deadlineDelta?: number | null;
  dataQuality?: DataQuality | null;
  variant?: 'project' | 'phase';
  /** Vorgeschlagene Aktion (D7) */
  suggestedAction?: SuggestedAction | null;
  /** Callback wenn Action-Button geklickt wird */
  onActionClick?: (action: SuggestedAction) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// STATUS BADGE
// ═══════════════════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<InsightStatus, { label: string; className: string }> = {
  on_track: { label: 'Im Plan', className: 'bg-green-100 text-green-700 border-green-200' },
  ahead: { label: 'Voraus', className: 'bg-green-100 text-green-700 border-green-200' },
  at_risk: { label: 'Gefährdet', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  behind: { label: 'Im Verzug', className: 'bg-red-100 text-red-700 border-red-200' },
  critical: { label: 'Kritisch', className: 'bg-red-100 text-red-700 border-red-200' },
  not_started: { label: 'Nicht gestartet', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  completed: { label: 'Abgeschlossen', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  unknown: { label: 'Unbekannt', className: 'bg-gray-100 text-gray-700 border-gray-200' },
};

function StatusBadge({ status }: { status: InsightStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BURN RATE TREND INDICATOR
// ═══════════════════════════════════════════════════════════════════════════

function TrendIndicator({ trend }: { trend: BurnRateTrend }) {
  const config = {
    up: { icon: TrendingUp, className: 'text-green-600', label: 'Steigend' },
    down: { icon: TrendingDown, className: 'text-red-600', label: 'Fallend' },
    stable: { icon: Minus, className: 'text-gray-500', label: 'Stabil' },
  };

  const { icon: Icon, className, label } = config[trend];

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs', className)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTION BUTTON
// ═══════════════════════════════════════════════════════════════════════════

interface ActionButtonProps {
  action: SuggestedAction;
  onClick: () => void;
}

function ActionButton({ action, onClick }: ActionButtonProps) {
  // Config basierend auf Action-Type
  const config = {
    assign_user: {
      icon: UserPlus,
      label: action.userName ? `${action.userName} zuweisen` : 'Mitarbeiter zuweisen',
      className: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    reschedule: {
      icon: Calendar,
      label: 'Phase verschieben',
      className: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    alert: {
      icon: AlertTriangle,
      label: 'Warnung',
      className: 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200',
    },
    none: null,
  };

  const actionConfig = config[action.type];

  // Keine Aktion oder 'none' type
  if (!actionConfig) {
    return null;
  }

  const { icon: Icon, label, className } = actionConfig;

  return (
    <Button
      size="sm"
      onClick={onClick}
      className={cn('gap-1.5', className)}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Zeigt einen einzelnen Insight an (Projekt- oder Phase-Level).
 *
 * Features:
 * - Status-Badge mit Farbcodierung
 * - Summary prominent
 * - Detail + Recommendation in kleinerer Schrift
 * - Optional: Progress, Burn Rate Trend, Remaining Hours
 */
export function InsightCard({
  title,
  status,
  summaryText,
  detailText,
  recommendationText,
  progressPercent,
  burnRateTrend,
  remainingHours,
  deadlineDelta,
  dataQuality,
  variant = 'phase',
  suggestedAction,
  onActionClick,
}: InsightCardProps) {
  const isProject = variant === 'project';

  // Hat eine actionable Aktion (nicht 'none' oder 'alert')
  const hasActionableAction = suggestedAction &&
    suggestedAction.type !== 'none' &&
    suggestedAction.type !== 'alert' &&
    onActionClick;

  // Border-Farbe basierend auf Status
  const borderColor = {
    on_track: 'border-l-green-500',
    ahead: 'border-l-green-500',
    at_risk: 'border-l-yellow-500',
    behind: 'border-l-red-500',
    critical: 'border-l-red-500',
    not_started: 'border-l-gray-300',
    completed: 'border-l-blue-500',
    unknown: 'border-l-gray-300',
  }[status];

  return (
    <Card className={cn('border-l-4', borderColor)}>
      <CardHeader className={cn('pb-2', isProject ? 'pt-4' : 'py-3')}>
        <div className="flex items-start justify-between gap-2">
          <h4 className={cn('font-medium', isProject ? 'text-lg' : 'text-sm')}>
            {title}
          </h4>
          <StatusBadge status={status} />
        </div>
      </CardHeader>

      <CardContent className={cn(isProject ? 'pb-4' : 'pb-3', 'space-y-3')}>
        {/* Summary Text */}
        <p className={cn('text-gray-700', isProject ? 'text-base' : 'text-sm')}>
          {summaryText}
        </p>

        {/* Metrics Row */}
        {(progressPercent !== null || burnRateTrend || remainingHours !== null) && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            {progressPercent !== null && (
              <span>Fortschritt: <strong>{progressPercent}%</strong></span>
            )}
            {burnRateTrend && <TrendIndicator trend={burnRateTrend} />}
            {remainingHours !== null && (
              <span>Verbleibend: <strong>{remainingHours}h</strong></span>
            )}
            {deadlineDelta != null && deadlineDelta !== 0 && (
              <span className={cn(deadlineDelta < 0 ? 'text-red-600' : 'text-green-600')}>
                {deadlineDelta > 0 ? `+${deadlineDelta}` : deadlineDelta} Tage
              </span>
            )}
          </div>
        )}

        {/* Detail Text */}
        {detailText && (
          <p className="text-sm text-gray-600">{detailText}</p>
        )}

        {/* Recommendation */}
        {recommendationText && (
          <div className="flex items-start gap-2 rounded-md bg-amber-50 p-2.5 text-sm">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-amber-800">{recommendationText}</p>
          </div>
        )}

        {/* Suggested Action Button */}
        {hasActionableAction && suggestedAction && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-gray-500">
              {suggestedAction.reason}
            </span>
            <ActionButton
              action={suggestedAction}
              onClick={() => onActionClick(suggestedAction)}
            />
          </div>
        )}

        {/* Data Quality Indicator */}
        {dataQuality && dataQuality !== 'good' && (
          <p className="text-xs text-gray-400 italic">
            {dataQuality === 'limited' && 'Eingeschränkte Datenbasis'}
            {dataQuality === 'insufficient' && 'Unzureichende Datenbasis'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
