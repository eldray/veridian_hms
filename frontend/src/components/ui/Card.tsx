import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from './cn';
import { accentVar, type Accent } from './accent';

export interface CardProps {
  title?: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  accent?: Accent;
  actions?: ReactNode;
  children: ReactNode;
  /** Set false for tables that should bleed to the card edge. */
  padded?: boolean;
  className?: string;
}

/** Surface with an optional titled strip. Section titles all read the same size. */
export function Card({ title, description, icon: Icon, accent = 'cyan', actions, children, padded = true, className }: CardProps) {
  const hasHeader = !!(title || actions || Icon);
  return (
    <div className={cn('bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden', className)}>
      {hasHeader && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: accentVar(accent, 'bg'), color: accentVar(accent, 'text') }}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
            )}
            <div className="min-w-0">
              {title && <h2 className="text-sm font-semibold text-[var(--text-primary)] leading-tight truncate">{title}</h2>}
              {description && <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </div>
      )}
      <div className={padded ? 'p-4' : undefined}>{children}</div>
    </div>
  );
}

export interface StatCardProps {
  label: string;
  value: ReactNode;
  /** Smaller type for money figures, which are longer than counts. */
  size?: 'count' | 'money';
  icon?: LucideIcon;
  /** Colours the figure and its icon tile; omitted means a neutral figure. */
  accent?: Accent;
  hint?: ReactNode;
  onClick?: () => void;
  className?: string;
}

/** One figure, one label — the same tile everywhere a page reports counts or totals. */
export function StatCard({ label, value, size = 'count', icon: Icon, accent, hint, onClick, className }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn('font-bold leading-tight', size === 'money' ? 'text-lg' : 'text-2xl')} style={{ color: accent ? accentVar(accent, 'text') : 'var(--text-primary)' }}>
            {value}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">{label}</p>
          {hint && <p className="text-[11px] text-[var(--text-tertiary)] mt-1">{hint}</p>}
        </div>
        {Icon && (
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: accentVar(accent ?? 'cyan', 'bg'), color: accentVar(accent ?? 'cyan', 'text') }}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}

export default Card;
