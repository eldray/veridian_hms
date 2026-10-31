import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from './cn';
import { INPUT, SEARCH_INPUT, SELECT } from './table';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
}

/** Search box with the magnifier, a clear affordance and a consistent focus ring. */
export function SearchInput({ value, onChange, onClear, className, placeholder = 'Search…', ...rest }: SearchInputProps) {
  return (
    <div className={cn('relative flex-1 min-w-[180px]', className)}>
      <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        {...rest}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(SEARCH_INPUT, value && 'pr-9')}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => { onChange(''); onClear?.(); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-[var(--text-tertiary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

interface FilterSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: ReactNode }[];
}

/** Dropdown filter; the label is what the filter is *of*, e.g. "All statuses". */
export function FilterSelect({ value, onChange, options, className, ...rest }: FilterSelectProps) {
  const id = useId();
  return (
    <select
      id={id}
      {...rest}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(SELECT, className)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );
}

interface FieldProps {
  label: string;
  /** Marks the field as mandatory so a rejection on save matches what the label promised. */
  required?: boolean;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Label, control, hint — the same order and type scale in every modal and form. */
export function Field({ label, required, hint, className, children }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        {label}
        {required && <span className="text-[var(--icon-red-text)]"> *</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-[var(--text-tertiary)]">{hint}</p>}
    </div>
  );
}

export { INPUT, SEARCH_INPUT, SELECT };
