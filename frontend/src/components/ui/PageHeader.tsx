import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';
import { cn } from './cn';
import { accentVar, type Accent } from './accent';

export interface PageHeaderProps {
  title: ReactNode;
  /** One line under the title — what the page is for. */
  subtitle?: ReactNode;
  /** Second, quieter line — live counts, balances, anything that changes. */
  meta?: ReactNode;
  icon?: LucideIcon;
  accent?: Accent;
  /** Route to go back to; renders the back chevron. */
  backTo?: string;
  onBack?: () => void;
  /** Right-hand actions, in reading order: secondary first, primary last. */
  actions?: ReactNode;
  /** Tab bar or filter strip that belongs directly under the header. */
  tabs?: ReactNode;
  className?: string;
}

/**
 * The one header every page opens with. Pages differ in what their buttons do, not
 * in how the title block, back control and action row are laid out.
 */
export function PageHeader({
  title,
  subtitle,
  meta,
  icon: Icon,
  accent = 'cyan',
  backTo,
  onBack,
  actions,
  tabs,
  className,
}: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) onBack();
    else if (backTo) navigate(backTo);
    else navigate(-1);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {(backTo || onBack) && (
            <Button variant="ghost" size="sm" iconOnly icon={ArrowLeft} onClick={handleBack} aria-label="Go back" />
          )}
          {Icon && (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: accentVar(accent, 'bg'), color: accentVar(accent, 'text') }}
            >
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-[var(--text-primary)] leading-tight">{title}</h1>
            {subtitle && <p className="text-sm text-[var(--text-secondary)] mt-0.5">{subtitle}</p>}
            {meta && <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{meta}</p>}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-wrap justify-end flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
      {tabs}
    </div>
  );
}

export default PageHeader;
