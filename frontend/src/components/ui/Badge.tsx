import type { ReactNode } from 'react';
import { cn } from './cn';
import { accentVar, type Accent } from './accent';

export type BadgeTone = Accent | 'neutral';

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  /** Coloured dot before the label — reads faster in dense status columns. */
  dot?: boolean;
  size?: 'xs' | 'sm';
  className?: string;
}

/** Status chip. Same shape everywhere; only the tone carries meaning. */
export function Badge({ tone = 'neutral', children, dot = false, size = 'xs', className }: BadgeProps) {
  const isNeutral = tone === 'neutral';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap',
        size === 'xs' ? 'px-2 py-0.5 text-[10px] leading-tight' : 'px-2.5 py-1 text-xs',
        className,
      )}
      style={{
        background: isNeutral ? 'var(--bg-main)' : accentVar(tone, 'bg'),
        color: isNeutral ? 'var(--text-secondary)' : accentVar(tone, 'text'),
      }}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: isNeutral ? 'var(--text-tertiary)' : accentVar(tone, 'text') }}
        />
      )}
      {children}
    </span>
  );
}

const STATUS_TONES: Record<string, BadgeTone> = {
  active: 'green', approved: 'green', paid: 'green', completed: 'green', discharged: 'green',
  dispensed: 'green', fulfilled: 'green', verified: 'green', resolved: 'green', available: 'green',
  pending: 'yellow', draft: 'yellow', awaiting: 'yellow', unpaid: 'yellow', opened: 'yellow',
  submitted: 'blue', processing: 'blue', in_progress: 'blue', admitted: 'blue', attending: 'blue',
  finalized: 'purple',
  batched: 'indigo', corporate: 'indigo',
  referred: 'orange', transferred: 'orange', partial: 'orange', admitted_overdue: 'orange',
  rejected: 'red', cancelled: 'red', canceled: 'red', failed: 'red', overdue: 'red',
  expired: 'red', critical: 'red', absent: 'red', absconded: 'red',
  inactive: 'neutral', suspended: 'neutral', archived: 'neutral', returned: 'neutral', closed: 'neutral',
};

/** Look up a status's tone without each page inventing its own colour. */
export function statusTone(status?: string | null): BadgeTone {
  if (!status) return 'neutral';
  return STATUS_TONES[status.toLowerCase()] ?? 'neutral';
}

/** 'partially_paid' reads as "Partially paid" wherever a raw enum reaches the screen. */
export function humanStatus(status?: string | null): string {
  if (!status) return '—';
  return status.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export default Badge;
