import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Clock,
  Heart,
  Instagram,
  MessageCircle,
  RefreshCcw,
  Send,
  TrendingUp,
  Users,
  Bookmark,
} from 'lucide-react';
import { useProfile } from '../../app/context/ProfileContext';
import { Badge } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { Card, CardDescription, CardTitle } from '../../shared/components/Card';
import { EmptyState } from '../../shared/components/EmptyState';
import { socialAnalyticsService } from '../../services/social-analytics.service';
import type { SocialAccountMetric, SocialConnection } from '../../types/social-analytics';

type PeriodDays = 7 | 30 | 90;

interface DateRange {
  start: string;
  end: string;
}

interface KpiCardData {
  label: string;
  value: string;
  comparison: ComparisonResult;
  icon: React.ElementType;
}

interface ChartPoint {
  date: string;
  value: number;
}

interface ChartSeries {
  id: string;
  label: string;
  color: string;
  points: ChartPoint[];
  valueFormatter?: (value: number) => string;
}

interface BarChartItem {
  label: string;
  value: number | null;
  icon: React.ElementType;
  color: string;
}

interface ComparisonResult {
  label: string;
  trend: 'up' | 'down' | 'neutral';
}

const PERIOD_TABS: Array<{ id: string; label: string }> = [
  { id: '7', label: '7 dias' },
  { id: '30', label: '30 dias' },
  { id: '90', label: '90 dias' },
];

const numberFormatter = new Intl.NumberFormat('pt-BR');

function formatTime(date: Date) {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isSameCalendarDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function formatLastUpdate(value: string | null | undefined) {
  if (!value) return 'Ainda não atualizado';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Ainda não atualizado';

  const now = new Date();
  const diffMinutes = Math.max(0, Math.floor((now.getTime() - parsed.getTime()) / 60_000));

  if (diffMinutes < 5) {
    return 'Atualizado há poucos minutos';
  }

  if (isSameCalendarDay(parsed, now)) {
    return `Atualizado hoje às ${formatTime(parsed)}`;
  }

  const yesterday = addDays(now, -1);
  if (isSameCalendarDay(parsed, yesterday)) {
    return `Atualizado ontem às ${formatTime(parsed)}`;
  }

  return `Atualizado em ${parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })} às ${formatTime(parsed)}`;
}

function formatMetricDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

function formatTooltipDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
  });
}

function formatNumber(value: number | null) {
  return value === null ? '—' : numberFormatter.format(value);
}

function formatPercent(value: number | null) {
  if (value === null) return '—';

  return `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  })}%`;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function getRangeForLastDays(days: PeriodDays): DateRange {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = addDays(end, -(days - 1));

  return {
    start: toIsoDate(start),
    end: toIsoDate(end),
  };
}

function getPreviousRange(currentRange: DateRange, days: PeriodDays): DateRange {
  const currentStart = new Date(`${currentRange.start}T00:00:00`);
  const previousEnd = addDays(currentStart, -1);
  const previousStart = addDays(previousEnd, -(days - 1));

  return {
    start: toIsoDate(previousStart),
    end: toIsoDate(previousEnd),
  };
}

function isInRange(metric: SocialAccountMetric, range: DateRange) {
  return metric.metricDate >= range.start && metric.metricDate <= range.end;
}

function sumAvailable(
  rows: SocialAccountMetric[],
  getter: (row: SocialAccountMetric) => number | null
) {
  let total = 0;
  let hasAnyValue = false;

  for (const row of rows) {
    const value = getter(row);

    if (value !== null && value !== undefined) {
      total += value;
      hasAnyValue = true;
    }
  }

  return hasAnyValue ? total : null;
}

function getInteractionValue(row: SocialAccountMetric) {
  const values = [row.likes, row.comments, row.saves, row.shares];
  const availableValues = values.filter((value): value is number => value !== null && value !== undefined);

  if (!availableValues.length) return null;

  return availableValues.reduce((total, value) => total + value, 0);
}

function getInteractionRateByReach(row: SocialAccountMetric) {
  const interactions = getInteractionValue(row);

  if (interactions === null || row.reach1d === null || row.reach1d === undefined || row.reach1d <= 0) {
    return null;
  }

  return (interactions / row.reach1d) * 100;
}

function getAccountsEngagedRateByReach(row: SocialAccountMetric) {
  if (
    row.accountsEngaged === null ||
    row.accountsEngaged === undefined ||
    row.reach1d === null ||
    row.reach1d === undefined ||
    row.reach1d <= 0
  ) {
    return null;
  }

  return (row.accountsEngaged / row.reach1d) * 100;
}

function getLatestFollowersCount(rows: SocialAccountMetric[]) {
  const snapshots = rows
    .filter((row) => row.followersCount !== null && row.followersCount !== undefined)
    .sort((a, b) => a.metricDate.localeCompare(b.metricDate));

  return snapshots.at(-1)?.followersCount ?? null;
}

function calculateFollowersComparison(rows: SocialAccountMetric[]) {
  const snapshots = rows
    .filter((row) => row.followersCount !== null && row.followersCount !== undefined)
    .sort((a, b) => a.metricDate.localeCompare(b.metricDate));

  if (snapshots.length < 2) {
    return {
      label: 'Histórico insuficiente para comparação',
      trend: 'neutral' as const,
    };
  }

  const first = snapshots[0].followersCount;
  const last = snapshots.at(-1)?.followersCount;

  if (first === null || first === undefined || last === null || last === undefined || first === 0) {
    return {
      label: 'Histórico insuficiente para comparação',
      trend: 'neutral' as const,
    };
  }

  const percentage = ((last - first) / first) * 100;

  return {
    label: `${Math.abs(percentage).toFixed(1)}% no período`,
    trend: percentage > 0 ? 'up' as const : percentage < 0 ? 'down' as const : 'neutral' as const,
  };
}

function calculatePeriodComparison(
  currentRows: SocialAccountMetric[],
  previousRows: SocialAccountMetric[],
  getter: (row: SocialAccountMetric) => number | null
) {
  const current = sumAvailable(currentRows, getter);
  const previous = sumAvailable(previousRows, getter);

  if (current === null || previous === null || previous === 0) {
    return {
      label: 'Histórico insuficiente para comparação',
      trend: 'neutral' as const,
    };
  }

  const percentage = ((current - previous) / previous) * 100;

  return {
    label: `${Math.abs(percentage).toFixed(1)}% vs. período anterior`,
    trend: percentage > 0 ? 'up' as const : percentage < 0 ? 'down' as const : 'neutral' as const,
  };
}

function buildDailyPoints(
  rows: SocialAccountMetric[],
  getter: (row: SocialAccountMetric) => number | null
): ChartPoint[] {
  const pointsByDate = new Map<string, number>();

  for (const row of rows) {
    const value = getter(row);

    if (value === null || value === undefined) {
      continue;
    }

    pointsByDate.set(row.metricDate, (pointsByDate.get(row.metricDate) ?? 0) + value);
  }

  return Array.from(pointsByDate.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getLatestPointValue(points: ChartPoint[]) {
  return points.at(-1)?.value ?? null;
}

function ChartEmptyState({ message = 'Nenhum dado disponível neste período.' }: { message?: string }) {
  return (
    <div className="flex min-h-[150px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 px-4 text-center text-sm text-text-secondary">
      {message}
    </div>
  );
}

function TinyLineChart({
  points,
  color = '#6D5DFB',
  label,
  valueFormatter = formatNumber,
  heightClassName = 'h-44',
  variant = 'line',
}: {
  points: ChartPoint[];
  color?: string;
  label: string;
  valueFormatter?: (value: number) => string;
  heightClassName?: string;
  variant?: 'line' | 'area';
}) {
  const gradientId = React.useId().replace(/:/g, '');

  if (!points.length) {
    return <ChartEmptyState />;
  }

  const width = 640;
  const height = 190;
  const paddingX = 34;
  const paddingY = 30;
  const values = points.map((point) => point.value);
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, 1);
  const valueRange = maxValue - minValue || 1;
  const xStep = points.length > 1 ? (width - paddingX * 2) / (points.length - 1) : 0;
  const coordinates = points.map((point, index) => {
    const x = points.length > 1 ? paddingX + index * xStep : width / 2;
    const y = height - paddingY - ((point.value - minValue) / valueRange) * (height - paddingY * 2);

    return { ...point, x, y };
  });
  const path = coordinates
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  return (
    <div className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className={`${heightClassName} w-full max-w-full`}>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        <line
          x1={paddingX}
          x2={width - paddingX}
          y1={height - paddingY}
          y2={height - paddingY}
          stroke="#E2E8F0"
          strokeWidth="1"
        />

        {coordinates.length > 1 ? (
          <>
            {variant === 'area' ? (
              <path
                d={`${path} L ${coordinates.at(-1)?.x ?? width - paddingX} ${height - paddingY} L ${coordinates[0].x} ${height - paddingY} Z`}
                fill={`url(#${gradientId})`}
              />
            ) : null}
            <path d={path} fill="none" stroke={color} strokeLinecap="round" strokeWidth="3" />
          </>
        ) : null}

        {variant === 'area' && coordinates.length === 1 ? (
          <rect
            x={coordinates[0].x - 32}
            y={coordinates[0].y}
            width="64"
            height={height - paddingY - coordinates[0].y}
            rx="16"
            fill={`url(#${gradientId})`}
          />
        ) : null}

        {coordinates.map((point) => (
          <g key={point.date}>
            <title>{`${formatTooltipDate(point.date)}\n${label}: ${valueFormatter(point.value)}`}</title>
            <circle cx={point.x} cy={point.y} r="5" fill={color} />
            <circle cx={point.x} cy={point.y} r="9" fill={color} opacity="0.12" />
          </g>
        ))}
      </svg>

      <div className="flex items-center justify-between gap-3 px-2 pb-1 text-xs text-text-secondary">
        <span>{formatMetricDate(points[0].date)}</span>
        <span>{points.length} ponto(s) disponível(is)</span>
        <span>{formatMetricDate(points.at(-1)?.date ?? points[0].date)}</span>
      </div>
    </div>
  );
}

function ReachEngagementComboChart({
  reachPoints,
  engagedPoints,
}: {
  reachPoints: ChartPoint[];
  engagedPoints: ChartPoint[];
}) {
  const series: ChartSeries[] = [
    {
      id: 'reach',
      label: 'Alcance',
      color: '#6D5DFB',
      points: reachPoints,
    },
    {
      id: 'engaged',
      label: 'Contas engajadas',
      color: '#F97316',
      points: engagedPoints,
    },
  ];
  const visibleSeries = series.filter((item) => item.points.length > 0);

  if (!visibleSeries.length) {
    return <ChartEmptyState />;
  }

  const width = 640;
  const height = 190;
  const paddingX = 34;
  const paddingY = 30;
  const dates = Array.from(
    new Set(visibleSeries.flatMap((item) => item.points.map((point) => point.date)))
  ).sort((a, b) => a.localeCompare(b));
  const values = visibleSeries.flatMap((item) => item.points.map((point) => point.value));
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, 1);
  const valueRange = maxValue - minValue || 1;
  const xStep = dates.length > 1 ? (width - paddingX * 2) / (dates.length - 1) : 0;
  const barWidth = Math.min(42, Math.max(18, (width - paddingX * 2) / Math.max(dates.length, 1) * 0.42));
  const getX = (date: string) =>
    dates.length > 1 ? paddingX + dates.indexOf(date) * xStep : width / 2;
  const getY = (value: number) =>
    height - paddingY - ((value - minValue) / valueRange) * (height - paddingY * 2);
  const reachByDate = new Map(reachPoints.map((point) => [point.date, point.value]));
  const engagedCoordinates = engagedPoints.map((point) => ({
    ...point,
    x: getX(point.date),
    y: getY(point.value),
  }));
  const engagedPath = engagedCoordinates
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  return (
    <div className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3">
      <div className="mb-2 flex flex-wrap gap-3 px-2 text-xs text-text-secondary">
        {visibleSeries.map((item) => (
          <span key={item.id} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full max-w-full">
        <line
          x1={paddingX}
          x2={width - paddingX}
          y1={height - paddingY}
          y2={height - paddingY}
          stroke="#E2E8F0"
          strokeWidth="1"
        />

        {dates.map((date) => {
          const value = reachByDate.get(date);

          if (value === undefined) return null;

          const barHeight = maxValue === 0 ? 2 : Math.max(2, height - paddingY - getY(value));
          const x = getX(date) - barWidth / 2;
          const y = height - paddingY - barHeight;

          return (
            <rect
              key={date}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx="10"
              fill="#6D5DFB"
              opacity="0.28"
            >
              <title>{`${formatTooltipDate(date)}\nAlcance: ${formatNumber(value)}`}</title>
            </rect>
          );
        })}

        {engagedCoordinates.length > 1 ? (
          <path d={engagedPath} fill="none" stroke="#F97316" strokeLinecap="round" strokeWidth="3" />
        ) : null}

        {engagedCoordinates.map((point) => (
          <g key={`engaged-${point.date}`}>
            <title>{`${formatTooltipDate(point.date)}\nContas engajadas: ${formatNumber(point.value)}`}</title>
            <circle cx={point.x} cy={point.y} r="5" fill="#F97316" />
            <circle cx={point.x} cy={point.y} r="9" fill="#F97316" opacity="0.12" />
          </g>
        ))}
      </svg>

      <div className="flex items-center justify-between gap-3 px-2 pb-1 text-xs text-text-secondary">
        <span>{formatMetricDate(dates[0])}</span>
        <span>{dates.length} dia(s) com dados</span>
        <span>{formatMetricDate(dates.at(-1) ?? dates[0])}</span>
      </div>
    </div>
  );
}

function VerticalBarChart({
  points,
  label,
  color = '#DB2777',
  valueFormatter = formatNumber,
  heightClassName = 'h-44',
}: {
  points: ChartPoint[];
  label: string;
  color?: string;
  valueFormatter?: (value: number) => string;
  heightClassName?: string;
}) {
  if (!points.length) {
    return <ChartEmptyState />;
  }

  const width = 640;
  const height = 190;
  const paddingX = 34;
  const paddingY = 30;
  const values = points.map((point) => point.value);
  const maxValue = Math.max(...values, 1);
  const xStep = points.length > 1 ? (width - paddingX * 2) / (points.length - 1) : 0;
  const barWidth = Math.min(42, Math.max(18, (width - paddingX * 2) / Math.max(points.length, 1) * 0.42));

  return (
    <div className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className={`${heightClassName} w-full max-w-full`}>
        <line
          x1={paddingX}
          x2={width - paddingX}
          y1={height - paddingY}
          y2={height - paddingY}
          stroke="#E2E8F0"
          strokeWidth="1"
        />

        {points.map((point, index) => {
          const x = points.length > 1 ? paddingX + index * xStep : width / 2;
          const barHeight = point.value === 0 ? 2 : Math.max(2, (point.value / maxValue) * (height - paddingY * 2));
          const y = height - paddingY - barHeight;

          return (
            <rect
              key={point.date}
              x={x - barWidth / 2}
              y={y}
              width={barWidth}
              height={barHeight}
              rx="10"
              fill={color}
              opacity="0.82"
            >
              <title>{`${formatTooltipDate(point.date)}\n${label}: ${valueFormatter(point.value)}`}</title>
            </rect>
          );
        })}
      </svg>

      <div className="flex items-center justify-between gap-3 px-2 pb-1 text-xs text-text-secondary">
        <span>{formatMetricDate(points[0].date)}</span>
        <span>{points.length} barra(s) disponível(is)</span>
        <span>{formatMetricDate(points.at(-1)?.date ?? points[0].date)}</span>
      </div>
    </div>
  );
}

function InteractionCompositionDonut({ items }: { items: BarChartItem[] }) {
  const availableItems = items.filter((item) => item.value !== null && item.value !== undefined);
  const total = availableItems.reduce((sum, item) => sum + (item.value ?? 0), 0);

  if (!availableItems.length) {
    return <ChartEmptyState message="Nenhum dado de interação disponível neste período." />;
  }

  const size = 220;
  const center = size / 2;
  const radius = 72;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-[220px_1fr] sm:items-center">
      <div className="relative mx-auto h-[220px] w-[220px]">
        <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
          />
          {total > 0
            ? availableItems.map((item) => {
                const value = item.value ?? 0;
                const ratio = value / total;
                const dashLength = ratio * circumference;
                const dashOffset = -accumulated;
                accumulated += dashLength;

                if (value <= 0) return null;

                return (
                  <circle
                    key={item.label}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={item.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                    strokeDashoffset={dashOffset}
                  >
                    <title>{`${item.label}\n${formatNumber(value)}\n${formatPercent(ratio * 100)} das interações`}</title>
                  </circle>
                );
              })
            : null}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full text-center">
          <p className="text-3xl font-bold tracking-tight text-text-primary">{formatNumber(total)}</p>
          <p className="text-sm font-medium text-text-secondary">Interações</p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const Icon = item.icon;
          const value = item.value;
          const percentage =
            value !== null && value !== undefined && total > 0 ? formatPercent((value / total) * 100) : null;

          return (
            <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2 text-sm text-text-secondary">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-brand shadow-sm">
                  <Icon className="h-4 w-4 shrink-0 text-brand" />
                </span>
                <span className="truncate">{item.label}</span>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-text-primary">{formatNumber(value)}</p>
                {percentage ? <p className="text-xs text-text-secondary">{percentage}</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnalyticsCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Card className="flex h-full flex-col">
      <div className="mb-5">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
      {footer ? <div className="mt-4">{footer}</div> : null}
    </Card>
  );
}

function RateSummary({
  value,
  description,
}: {
  value: number | null;
  description: string;
}) {
  return (
    <div className="mb-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
      <p className="text-2xl font-bold tracking-tight text-text-primary">{formatPercent(value)}</p>
      <p className="mt-1 text-sm text-text-secondary">{description}</p>
    </div>
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      className="flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-1"
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const isActive = option.id === value;

        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.id)}
            className={[
              'min-h-[36px] shrink-0 rounded-xl px-3 text-sm font-medium transition-colors',
              isActive
                ? 'bg-white text-brand shadow-sm'
                : 'text-text-secondary hover:bg-white/70 hover:text-text-primary',
            ].join(' ')}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function KpiCard({ metric }: { metric: KpiCardData }) {
  const Icon = metric.icon;
  const TrendIcon =
    metric.comparison.trend === 'up'
      ? ArrowUpRight
      : metric.comparison.trend === 'down'
      ? ArrowDownRight
      : null;

  return (
    <Card className="min-h-[142px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-text-secondary">{metric.label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-text-primary">{metric.value}</p>
        </div>
        <div className="rounded-2xl bg-brand/[0.08] p-3 text-brand">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div
        className={[
          'mt-5 flex items-center gap-1.5 text-xs font-medium',
          metric.comparison.trend === 'up'
            ? 'text-green-600'
            : metric.comparison.trend === 'down'
            ? 'text-red-600'
            : 'text-text-secondary',
        ].join(' ')}
      >
        {TrendIcon ? <TrendIcon className="h-3.5 w-3.5" /> : null}
        <span>{metric.comparison.label}</span>
      </div>
    </Card>
  );
}

export const Performance = () => {
  const navigate = useNavigate();
  const { activeProfile } = useProfile();

  const [periodDays, setPeriodDays] = React.useState<PeriodDays>(30);
  const [activeInstagramConnection, setActiveInstagramConnection] =
    React.useState<SocialConnection | null>(null);
  const [metrics, setMetrics] = React.useState<SocialAccountMetric[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const currentRange = React.useMemo(() => getRangeForLastDays(periodDays), [periodDays]);
  const previousRange = React.useMemo(
    () => getPreviousRange(currentRange, periodDays),
    [currentRange, periodDays]
  );

  const loadDashboardData = React.useCallback(async () => {
    if (!activeProfile?.id) {
      setActiveInstagramConnection(null);
      setMetrics([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const instagramConnection = await socialAnalyticsService.getActiveInstagramConnection(
        activeProfile.id
      );
      setActiveInstagramConnection(instagramConnection);

      if (!instagramConnection) {
        setMetrics([]);
        return;
      }

      const loadedMetrics = await socialAnalyticsService.listAccountMetrics({
        profileId: activeProfile.id,
        connectionId: instagramConnection.id,
        startDate: previousRange.start,
        endDate: currentRange.end,
      });

      setMetrics(loadedMetrics);
    } catch (error) {
      console.error('[PerformanceV2] Error loading dashboard:', error);
      setActiveInstagramConnection(null);
      setMetrics([]);
      setErrorMessage('Não foi possível carregar os dados de Performance agora.');
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile?.id, currentRange.end, previousRange.start]);

  React.useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const handleSync = React.useCallback(async () => {
    if (!activeProfile?.id || !activeInstagramConnection) {
      return;
    }

    setIsSyncing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await socialAnalyticsService.syncConnection(activeProfile.id, activeInstagramConnection.id);
      setSuccessMessage('Dados atualizados com sucesso.');
      await loadDashboardData();
    } catch (error) {
      console.error('[PerformanceV2] Error syncing dashboard:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível atualizar os dados do Instagram.'
      );
    } finally {
      setIsSyncing(false);
    }
  }, [activeInstagramConnection, activeProfile?.id, loadDashboardData]);

  const currentRows = React.useMemo(
    () => metrics.filter((metric) => isInRange(metric, currentRange)),
    [currentRange, metrics]
  );
  const previousRows = React.useMemo(
    () => metrics.filter((metric) => isInRange(metric, previousRange)),
    [metrics, previousRange]
  );
  const followersCount = React.useMemo(() => getLatestFollowersCount(currentRows), [currentRows]);
  const reach = React.useMemo(() => sumAvailable(currentRows, (row) => row.reach1d), [currentRows]);
  const accountsEngaged = React.useMemo(
    () => sumAvailable(currentRows, (row) => row.accountsEngaged),
    [currentRows]
  );
  const interactions = React.useMemo(
    () => sumAvailable(currentRows, getInteractionValue),
    [currentRows]
  );
  const reachPoints = React.useMemo(
    () => buildDailyPoints(currentRows, (row) => row.reach1d),
    [currentRows]
  );
  const accountsEngagedPoints = React.useMemo(
    () => buildDailyPoints(currentRows, (row) => row.accountsEngaged),
    [currentRows]
  );
  const interactionPoints = React.useMemo(
    () => buildDailyPoints(currentRows, getInteractionValue),
    [currentRows]
  );
  const followerPoints = React.useMemo(
    () =>
      currentRows
        .filter((row) => row.followersCount !== null && row.followersCount !== undefined)
        .map((row) => ({ date: row.metricDate, value: row.followersCount ?? 0 }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [currentRows]
  );
  const interactionRateByReachPoints = React.useMemo(
    () => buildDailyPoints(currentRows, getInteractionRateByReach),
    [currentRows]
  );
  const accountsEngagedRateByReachPoints = React.useMemo(
    () => buildDailyPoints(currentRows, getAccountsEngagedRateByReach),
    [currentRows]
  );
  const latestInteractionRateByReach = React.useMemo(
    () => getLatestPointValue(interactionRateByReachPoints),
    [interactionRateByReachPoints]
  );
  const latestAccountsEngagedRateByReach = React.useMemo(
    () => getLatestPointValue(accountsEngagedRateByReachPoints),
    [accountsEngagedRateByReachPoints]
  );

  const interactionBreakdown = React.useMemo<BarChartItem[]>(
    () => [
      {
        label: 'Curtidas',
        value: sumAvailable(currentRows, (row) => row.likes),
        icon: Heart,
        color: '#D85D7C',
      },
      {
        label: 'Comentários',
        value: sumAvailable(currentRows, (row) => row.comments),
        icon: MessageCircle,
        color: '#5477E8',
      },
      {
        label: 'Salvamentos',
        value: sumAvailable(currentRows, (row) => row.saves),
        icon: Bookmark,
        color: '#C08A34',
      },
      {
        label: 'Compartilhamentos',
        value: sumAvailable(currentRows, (row) => row.shares),
        icon: Send,
        color: '#2FA986',
      },
    ],
    [currentRows]
  );

  const kpis: KpiCardData[] = React.useMemo(
    () => [
      {
        label: 'Seguidores',
        value: formatNumber(followersCount),
        comparison: calculateFollowersComparison(currentRows),
        icon: Users,
      },
      {
        label: 'Alcance',
        value: formatNumber(reach),
        comparison: calculatePeriodComparison(currentRows, previousRows, (row) => row.reach1d),
        icon: TrendingUp,
      },
      {
        label: 'Contas engajadas',
        value: formatNumber(accountsEngaged),
        comparison: calculatePeriodComparison(currentRows, previousRows, (row) => row.accountsEngaged),
        icon: Activity,
      },
      {
        label: 'Interações',
        value: formatNumber(interactions),
        comparison: calculatePeriodComparison(currentRows, previousRows, getInteractionValue),
        icon: Heart,
      },
    ],
    [accountsEngaged, currentRows, followersCount, interactions, previousRows, reach]
  );

  const accountLabel =
    activeInstagramConnection?.externalAccountHandle ||
    activeInstagramConnection?.externalAccountName ||
    'Instagram conectado';
  const displayAccountLabel = accountLabel.startsWith('@') ? accountLabel : `@${accountLabel}`;
  const hasAnyMetrics = metrics.length > 0;
  const hasCurrentPeriodMetrics = currentRows.length > 0;
  const isConnectedWithoutSync =
    activeInstagramConnection && !activeInstagramConnection.lastSuccessfulSyncAt && !hasAnyMetrics;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-bold text-text-primary">Performance</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
            {activeInstagramConnection ? (
              <>
                <span className="font-medium text-text-primary">{displayAccountLabel}</span>
                <span className="text-slate-300">•</span>
                <span>Instagram</span>
                <span className="text-slate-300">•</span>
                <Badge variant="success">Conectado</Badge>
              </>
            ) : (
              <span>Acompanhe o crescimento e o desempenho das suas redes sociais.</span>
            )}
          </div>
          {activeInstagramConnection ? (
            <p className="flex items-center gap-1.5 text-sm text-text-secondary">
              <Clock className="h-4 w-4" />
              {formatLastUpdate(activeInstagramConnection.lastSuccessfulSyncAt)}
            </p>
          ) : null}
        </div>

        {activeInstagramConnection ? (
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto lg:justify-end">
            <SegmentedControl
              options={PERIOD_TABS}
              value={String(periodDays)}
              onChange={(id) => setPeriodDays(Number(id) as PeriodDays)}
              ariaLabel="Selecionar período"
            />
            <Button
              variant="outline"
              className="gap-2 whitespace-nowrap"
              isLoading={isSyncing}
              onClick={() => void handleSync()}
            >
              {!isSyncing ? <RefreshCcw className="h-4 w-4" /> : null}
              {isSyncing ? 'Atualizando...' : 'Atualizar dados'}
            </Button>
          </div>
        ) : null}
      </header>

      {errorMessage ? (
        <Card className="border-red-200 bg-red-50 text-red-700">{errorMessage}</Card>
      ) : null}
      {successMessage ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {successMessage}
        </div>
      ) : null}

      {isLoading ? (
        <Card>
          <div className="flex min-h-[360px] items-center justify-center text-text-secondary">
            Carregando dados de performance...
          </div>
        </Card>
      ) : !activeInstagramConnection ? (
        <Card>
          <EmptyState
            title="Conecte seu Instagram para acompanhar sua performance."
            description="Depois da conexão, a PostHub começa a construir seu histórico diário com dados reais da sua conta."
            icon={Instagram}
            action={
              <Button onClick={() => navigate('/workspace/integrations')}>
                Ir para Integrações
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {isConnectedWithoutSync ? (
            <Card>
              <EmptyState
                title="Instagram conectado, aguardando a primeira atualização"
                description="Clique em Atualizar dados para buscar as primeiras métricas deste perfil."
                icon={RefreshCcw}
                action={
                  <Button isLoading={isSyncing} onClick={() => void handleSync()}>
                    Atualizar dados
                  </Button>
                }
              />
            </Card>
          ) : !hasAnyMetrics ? (
            <Card>
              <EmptyState
                title="Ainda não encontramos métricas para esta conexão"
                description="A conexão existe, mas ainda não há dados de performance disponíveis para este perfil."
                icon={BarChart3}
              />
            </Card>
          ) : !hasCurrentPeriodMetrics ? (
            <Card>
              <EmptyState
                title="Sem métricas neste período"
                description="Escolha outro intervalo ou aguarde novas atualizações diárias para preencher o histórico."
                icon={Activity}
              />
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 xl:grid-cols-4">
                {kpis.map((metric) => (
                  <KpiCard key={metric.label} metric={metric} />
                ))}
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <AnalyticsCard
                  title="Evolução do alcance"
                  description="Quantas contas foram alcançadas em cada dia do período."
                >
                  <TinyLineChart
                    points={reachPoints}
                    label="Alcance"
                    color="#6D5DFB"
                    variant="area"
                  />
                </AnalyticsCard>

                <AnalyticsCard
                  title="Evolução de seguidores"
                  description="Registros reais da sua audiência ao longo do tempo."
                >
                  <TinyLineChart points={followerPoints} label="Seguidores" color="#16A34A" />
                </AnalyticsCard>

                <AnalyticsCard
                  title="Alcance e contas engajadas"
                  description="Compare se o alcance também está gerando pessoas engajadas."
                >
                  <ReachEngagementComboChart
                    reachPoints={reachPoints}
                    engagedPoints={accountsEngagedPoints}
                  />
                </AnalyticsCard>

                <AnalyticsCard
                  title="Composição das interações"
                  description="Veja como curtidas, comentários, salvamentos e compartilhamentos compõem o total."
                >
                  <InteractionCompositionDonut items={interactionBreakdown} />
                </AnalyticsCard>

                <AnalyticsCard
                  title="Evolução das interações"
                  description="Soma diária de curtidas, comentários, salvamentos e compartilhamentos."
                >
                  <VerticalBarChart
                    points={interactionPoints}
                    label="Interações"
                    color="#DB2777"
                  />
                </AnalyticsCard>

                <AnalyticsCard
                  title="Interações por alcance"
                  description="Interações em relação às contas alcançadas."
                >
                  <RateSummary
                    value={latestInteractionRateByReach}
                    description="Interações em relação às contas alcançadas."
                  />
                  <TinyLineChart
                    points={interactionRateByReachPoints}
                    label="Interações por alcance"
                    color="#0EA5E9"
                    valueFormatter={formatPercent}
                    heightClassName="h-36"
                  />
                </AnalyticsCard>
              </div>

              <div className="grid grid-cols-1">
                <AnalyticsCard
                  title="Contas engajadas por alcance"
                  description="Métrica derivada da PostHub para entender a proporção de contas alcançadas que engajaram."
                >
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.75fr_1.25fr] lg:items-stretch">
                    <RateSummary
                      value={latestAccountsEngagedRateByReach}
                      description="Contas engajadas em relação ao alcance do período."
                    />
                    <VerticalBarChart
                      points={accountsEngagedRateByReachPoints}
                      label="Contas engajadas por alcance"
                      color="#14B8A6"
                      valueFormatter={formatPercent}
                      heightClassName="h-36"
                    />
                  </div>
                </AnalyticsCard>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
