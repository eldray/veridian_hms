import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from './cn';
import { accentVar, type Accent } from './accent';

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'outline' | 'danger' | 'dangerSoft';
export type ButtonSize = 'xs' | 'sm' | 'md';

/**
 * One button idiom for the whole app. The variant states what the action *is*
 * (main, side, destructive); it never depends on which page renders it.
 */
const VARIANTS: Record<Exclude<ButtonVariant, 'soft'>, string> = {
  primary: 'bg-[var(--icon-cyan-text)] text-white hover:opacity-90 shadow-sm',
  secondary: 'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-main)]',
  outline: 'bg-transparent text-[var(--icon-cyan-text)] border border-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)]',
  ghost: 'text-[var(--text-secondary)] hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]',
  danger: 'bg-[var(--icon-red-text)] text-white hover:opacity-90 shadow-sm',
  dangerSoft: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] hover:bg-[var(--icon-red-text)] hover:text-white',
};

const SIZES: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-[11px] gap-1 rounded-md',
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
  md: 'px-4 py-2 text-sm gap-2 rounded-lg',
};

const ICON_SIZES: Record<ButtonSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
};

/** What a control looks like is shared by the button and the link that imitates one. */
export interface ButtonSurfaceProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Accent for the `soft` variant; other variants use the scheme's fixed colours. */
  accent?: Accent;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  /** Icon-only control: square hit area, and `aria-label` becomes mandatory. */
  iconOnly?: boolean;
  fullWidth?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function buttonClasses({
  variant = 'secondary',
  size = 'md',
  iconOnly = false,
  fullWidth = false,
  className,
}: ButtonSurfaceProps = {}): string {
  return cn(
    'inline-flex items-center justify-center font-medium transition-all duration-150 select-none whitespace-nowrap',
    'disabled:opacity-50 disabled:pointer-events-none',
    SIZES[size],
    variant === 'soft' ? 'bg-[var(--icon-cyan-text)] text-white hover:opacity-90 shadow-sm' : VARIANTS[variant],
    iconOnly && (size === 'md' ? 'p-2' : size === 'sm' ? 'p-1.5' : 'p-1'),
    fullWidth && 'w-full',
    className,
  );
}

/** `soft` paints the accent solid, which a class cannot express per scheme. */
export function buttonStyle({ variant = 'secondary', accent = 'cyan', style }: ButtonSurfaceProps = {}): CSSProperties | undefined {
  return variant === 'soft' ? { ...style, background: accentVar(accent, 'text') } : style;
}

function ButtonGlyphs({
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  iconOnly = false,
  children,
}: ButtonSurfaceProps & { loading?: boolean }) {
  return (
    <>
      {loading && <Loader2 className={cn(ICON_SIZES[size], 'animate-spin')} />}
      {Icon && !loading && <Icon className={ICON_SIZES[size]} />}
      {!iconOnly && children}
      {!iconOnly && IconRight && <IconRight className={ICON_SIZES[size]} />}
    </>
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonSurfaceProps {
  /** Shows a spinner in place of the leading icon and blocks the click. */
  loading?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  accent = 'cyan',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  iconOnly = false,
  fullWidth = false,
  className,
  style,
  children,
  disabled,
  type = 'button',
  title,
  'aria-label': ariaLabel,
  ...rest
}: ButtonProps) {
  // An icon-only control still needs a name for screen readers; children work too.
  const label = ariaLabel ?? (iconOnly && typeof children === 'string' ? children : undefined);

  return (
    <button
      {...rest}
      type={type}
      disabled={loading || disabled}
      aria-busy={loading || undefined}
      aria-label={label}
      title={title ?? (iconOnly ? label : undefined)}
      style={buttonStyle({ variant, accent, style })}
      className={buttonClasses({ variant, size, iconOnly, fullWidth, className })}
    >
      <ButtonGlyphs
        size={size}
        icon={Icon}
        iconRight={IconRight}
        loading={loading}
        iconOnly={iconOnly}
      >
        {children}
      </ButtonGlyphs>
    </button>
  );
}

export interface LinkButtonProps extends Omit<LinkProps, 'className' | 'style'>, ButtonSurfaceProps {}

/** A navigation affordance that must be indistinguishable from a Button. */
export function LinkButton({
  variant = 'secondary',
  size = 'md',
  accent = 'cyan',
  icon,
  iconRight,
  iconOnly = false,
  fullWidth = false,
  className,
  style,
  children,
  ...rest
}: LinkButtonProps) {
  const label = rest['aria-label'] ?? (iconOnly && typeof children === 'string' ? children : undefined);

  return (
    <Link
      {...rest}
      aria-label={label}
      title={rest.title ?? (iconOnly ? label : undefined)}
      style={buttonStyle({ variant, accent, style })}
      className={buttonClasses({ variant, size, iconOnly, fullWidth, className })}
    >
      <ButtonGlyphs size={size} icon={icon} iconRight={iconRight} iconOnly={iconOnly}>
        {children}
      </ButtonGlyphs>
    </Link>
  );
}

export default Button;
