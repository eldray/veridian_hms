// The entry screens used to open on an empty card with only two dropdowns. Staff who
// reached them from a waiting list had to know which patient to retype, and laboratory,
// sonography and pharmacy roles cannot search the patient directory at all, so the
// screen stayed blank for them. This card lists the department's own queue instead —
// the same rows the waiting list shows — and opens the visit the work belongs to.
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { Badge, Button, Card, cn, type BadgeTone } from '../ui';

export interface QueuedVisit {
  attendanceId: string;
  patientId: string;
  name: string;
  folderNumber?: string;
  age?: number | string | null;
  gender?: string;
  attendanceNumber?: string;
  visitDate?: string | null;
  detail?: string;
  priority?: string;
  waitMinutes?: number;
}

const PRIORITY_TONES: Record<string, BadgeTone> = {
  stat: 'red',
  critical: 'red',
  urgent: 'orange',
  routine: 'blue',
};

const genderMark = (gender?: string): string =>
  gender === 'male' ? '♂' : gender === 'female' ? '♀' : '·';

const waitLabel = (minutes?: number): string | null => {
  if (!minutes || minutes < 60) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m ? ` ${m}m` : ''} waiting`;
};

const dateLabel = (value?: string | null): string | null => {
  if (!value) return null;
  const at = new Date(value);
  return Number.isNaN(at.getTime()) ? null : at.toLocaleDateString();
};

interface QueuedVisitsProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  accent?: 'cyan' | 'purple' | 'blue' | 'indigo' | 'green' | 'red' | 'orange' | 'yellow';
  rows: QueuedVisit[];
  loading?: boolean;
  emptyMessage: string;
  onOpen: (row: QueuedVisit) => void;
  onRefresh?: () => void;
  onViewAll?: () => void;
  limit?: number;
}

export function QueuedVisits({
  title,
  description,
  icon,
  accent = 'cyan',
  rows,
  loading = false,
  emptyMessage,
  onOpen,
  onRefresh,
  onViewAll,
  limit = 6,
}: QueuedVisitsProps) {
  const visible = rows.slice(0, limit);
  const hidden = rows.length - visible.length;

  return (
    <Card
      title={title}
      description={description ?? `${rows.length} visit${rows.length === 1 ? '' : 's'} in the queue`}
      icon={icon}
      accent={accent}
      padded={false}
      actions={
        <>
          {onViewAll && rows.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              View waiting list
            </Button>
          )}
          {onRefresh && (
            <Button
              variant="ghost"
              iconOnly
              size="sm"
              icon={Clock}
              loading={loading}
              onClick={onRefresh}
              aria-label="Refresh queue"
              title="Refresh queue"
            />
          )}
        </>
      }
    >
      {rows.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-[var(--icon-green-text)] mx-auto mb-2" />
          <p className="text-sm text-[var(--text-secondary)]">{loading ? 'Loading the queue…' : emptyMessage}</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-[var(--border-color)]">
            {visible.map((row) => {
              const waiting = waitLabel(row.waitMinutes);
              const visitDate = dateLabel(row.visitDate);
              return (
                <button
                  key={row.attendanceId}
                  type="button"
                  onClick={() => onOpen(row)}
                  className={cn(
                    'w-full text-left px-4 py-3 flex items-center gap-3 transition-colors',
                    'hover:bg-[var(--bg-main)] focus:outline-none focus-visible:bg-[var(--bg-main)]',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-[var(--text-primary)] truncate">{row.name}</span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {genderMark(row.gender)}
                        {row.age !== null && row.age !== undefined && row.age !== '' ? ` ${row.age}y` : ''}
                      </span>
                      {row.priority && (
                        <Badge tone={PRIORITY_TONES[String(row.priority).toLowerCase()] ?? 'neutral'} size="sm" dot>
                          {String(row.priority).toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[var(--text-secondary)]">
                      {row.folderNumber && <span className="font-mono">#{row.folderNumber}</span>}
                      {row.attendanceNumber && <span className="font-mono">Visit {row.attendanceNumber}</span>}
                      {visitDate && <span>{visitDate}</span>}
                      {waiting && <span className="text-[var(--icon-orange-text)]">{waiting}</span>}
                    </div>
                    {row.detail && (
                      <p className="text-xs text-[var(--text-primary)] mt-1 truncate">{row.detail}</p>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
                </button>
              );
            })}
          </div>
          {hidden > 0 && (
            <div className="px-4 py-2 border-t border-[var(--border-color)] text-center text-[11px] text-[var(--text-tertiary)]">
              Showing {visible.length} of {rows.length} — open the waiting list for the rest
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export default QueuedVisits;
