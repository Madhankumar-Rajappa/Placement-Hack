// ============================================================
// PlacementOS — Reusable UI Components
// ============================================================

import { type ReactNode } from 'react';
import { Loader2, AlertCircle, Info, CheckCircle2, AlertTriangle } from 'lucide-react';

// ── Loading Spinner ──────────────────────────────────────────

export function Spinner({ size = 20, className = '' }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} />;
}

export function PageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Spinner size={32} className="text-accent mb-4" />
      <p className="text-sm text-text-muted">{message}</p>
    </div>
  );
}

// ── Error Display ────────────────────────────────────────────

export function ErrorDisplay({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="card border-error/30 bg-error-muted/10">
      <div className="flex items-start gap-3">
        <AlertCircle size={20} className="text-error mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-text-primary">{message}</p>
          {onRetry && (
            <button onClick={onRetry} className="btn btn-sm btn-secondary mt-3">
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────────

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Icon size={48} className="text-text-muted mb-4 opacity-40" />
      <h3 className="text-base font-medium text-text-secondary mb-2">{title}</h3>
      <p className="text-sm text-text-muted max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────

export function Card({
  children,
  className = '',
  accent = false,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  accent?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className={`card ${accent ? 'card-accent' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon: Icon,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center">
            <Icon size={20} className="text-accent-light" />
          </div>
        )}
        <div>
          <h3 className="text-base font-semibold text-text-primary">{title}</h3>
          {subtitle && <p className="text-sm text-text-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ── Progress Bar ─────────────────────────────────────────────

export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  color,
  showLabel = false,
  label,
}: {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  showLabel?: boolean;
  label?: string;
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const heights = { sm: 'h-1.5', md: 'h-2', lg: 'h-3' };

  return (
    <div className="w-full">
      {(showLabel || label) && (
        <div className="flex justify-between text-xs text-text-muted mb-1.5">
          <span>{label}</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={`progress-bar ${heights[size]}`}>
        <div
          className="progress-fill"
          style={{
            width: `${percentage}%`,
            background: color || undefined,
          }}
        />
      </div>
    </div>
  );
}

// ── Readiness Circle ─────────────────────────────────────────

export function ReadinessCircle({
  score,
  size = 160,
  strokeWidth = 10,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (Math.min(100, Math.max(0, score)) / 100) * circumference;
  const offset = circumference - progress;

  const getColor = (s: number) => {
    if (s >= 80) return '#22c55e';
    if (s >= 60) return '#6366f1';
    if (s >= 40) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="readiness-circle" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-bg-input)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor(score)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="readiness-value">
        <span className="readiness-number" style={{ fontSize: size * 0.18 }}>
          {Math.round(score)}
        </span>
        <span className="text-xs text-text-muted mt-1">READINESS</span>
      </div>
    </div>
  );
}

// ── Badge ────────────────────────────────────────────────────

export function PriorityBadge({ priority }: { priority: string }) {
  const classes: Record<string, string> = {
    critical: 'badge-critical',
    high: 'badge-high',
    medium: 'badge-medium',
    low: 'badge-low',
  };

  return (
    <span className={`badge ${classes[priority] || 'badge-info'}`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    completed: 'badge-success',
    ready: 'badge-accent',
    in_progress: 'badge-warning',
    pending: 'badge-info',
    failed: 'badge-error',
    processing: 'badge-warning',
    active: 'badge-success',
    paused: 'badge-warning',
    skipped: 'badge-error',
    draft: 'badge-info',
  };

  return (
    <span className={`badge ${classes[status] || 'badge-info'}`}>
      {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
    </span>
  );
}

// ── Skeleton Loaders ─────────────────────────────────────────

export function SkeletonCard() {
  return (
    <div className="card">
      <div className="skeleton h-4 w-1/3 mb-4" />
      <div className="skeleton h-3 w-2/3 mb-2" />
      <div className="skeleton h-3 w-1/2 mb-4" />
      <div className="skeleton h-8 w-full" />
    </div>
  );
}

export function SkeletonLine({ width = '100%' }: { width?: string }) {
  return <div className="skeleton h-3 mb-2" style={{ width }} />;
}

// ── Alert Banner ─────────────────────────────────────────────

export function Alert({
  type = 'info',
  children,
}: {
  type?: 'info' | 'success' | 'warning' | 'error';
  children: ReactNode;
}) {
  const icons = {
    info: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    error: AlertCircle,
  };
  const colors = {
    info: 'border-info/30 bg-info-muted/10 text-info',
    success: 'border-success/30 bg-success-muted/10 text-success',
    warning: 'border-warning/30 bg-warning-muted/10 text-warning',
    error: 'border-error/30 bg-error-muted/10 text-error',
  };
  const Icon = icons[type];

  return (
    <div className={`card ${colors[type]} flex items-start gap-3`}>
      <Icon size={18} className="mt-0.5 flex-shrink-0" />
      <div className="text-sm text-text-primary">{children}</div>
    </div>
  );
}

// ── Page Header ──────────────────────────────────────────────

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-text-primary">{title}</h1>
        {subtitle && <p className="text-sm text-text-muted mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  color = 'accent',
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  trend?: { value: number; label: string };
  color?: string;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-text-muted font-medium uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
          {trend && (
            <p className={`text-xs mt-1 ${trend.value >= 0 ? 'text-success' : 'text-error'}`}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ 
            background: `var(--color-${color}-muted, var(--color-accent-muted))`,
            color: `var(--color-${color}, var(--color-accent))`
          }}
        >
          <Icon size={20} />
        </div>
      </div>
    </Card>
  );
}
