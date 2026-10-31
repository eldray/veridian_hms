import type { LucideIcon } from 'lucide-react';
import { cn } from './cn';
import { accentVar, type Accent } from './accent';

export interface TabItem<T extends string = string> {
  key: T;
  label: string;
  icon?: LucideIcon;
  /** Counts render as a chip so a queue can show how much it holds. */
  count?: number;
}

interface TabsProps<T extends string> {
  tabs: TabItem<T>[];
  active: T;
  onChange: (key: T) => void;
  accent?: Accent;
  size?: 'sm' | 'md';
  className?: string;
  'aria-label'?: string;
}

/** Underline tabs — the app's idiom for switching sections on one screen. */
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  accent = 'cyan',
  size = 'md',
  className,
  'aria-label': ariaLabel = 'Sections',
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('flex gap-1 border-b border-[var(--border-color)] overflow-x-auto', className)}
    >
      {tabs.map(({ key, label, icon: Icon, count }) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => isActive || onChange(key)}
            className={cn(
              'flex items-center gap-2 whitespace-nowrap font-medium transition-all relative',
              size === 'md' ? 'px-4 py-2.5 text-sm' : 'px-3 py-2 text-xs',
              isActive
                ? ''
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            )}
            style={isActive
              ? { color: accentVar(accent, 'text'), borderBottom: `2px solid ${accentVar(accent, 'text')}` }
              : { borderBottom: '2px solid transparent' }}
          >
            {Icon && <Icon className={size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />}
            {label}
            {typeof count === 'number' && (
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none"
                style={isActive
                  ? { background: accentVar(accent, 'bg'), color: accentVar(accent, 'text') }
                  : { background: 'var(--bg-main)', color: 'var(--text-tertiary)' }}
              >
                {count > 999 ? '999+' : count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface SegmentedProps<T extends string> {
  options: { value: T; label?: string; icon?: LucideIcon }[];
  value: T;
  onChange: (value: T) => void;
  accent?: Accent;
  className?: string;
  'aria-label'?: string;
}

/** Pill toggle — used for view modes (grid/list) and short either/or filters. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accent = 'cyan',
  className,
  'aria-label': ariaLabel = 'View',
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn('inline-flex gap-1 p-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)]', className)}
    >
      {options.map(({ value: optionValue, label, icon: Icon }) => {
        const isActive = optionValue === value;
        return (
          <button
            key={optionValue}
            type="button"
            aria-pressed={isActive}
            onClick={() => isActive || onChange(optionValue)}
            title={label}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all',
              isActive ? '' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]',
              !label && 'px-1.5',
            )}
            style={isActive ? { background: accentVar(accent, 'text'), color: '#fff' } : undefined}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
