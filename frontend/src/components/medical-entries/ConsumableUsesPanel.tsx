import React from 'react';
import { CalendarClock, Edit2, Package, StickyNote, Trash2 } from 'lucide-react';

interface ConsumableUsesPanelProps {
  uses: any[];
  onEdit?: (use: any) => void;
  onDelete?: (use: any) => void;
}

const cleanNotes = (value?: string) => String(value || '').replace(/^Consumable use:\\s*/, '').trim();

const formatDate = (value?: string) => {
  if (!value) return 'Date not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date not recorded';
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

export const ConsumableUsesPanel: React.FC<ConsumableUsesPanelProps> = ({ uses, onEdit, onDelete }) => {
  if (uses.length === 0) {
    return (
      <div className="px-4 py-8">
        <div className="mx-auto flex max-w-xs flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-main)] text-[var(--text-tertiary)]">
            <Package className="h-5 w-5" />
          </span>
          <p className="text-xs font-semibold text-[var(--text-primary)]">No consumables recorded yet</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-tertiary)]">
            Record supplies used during this visit. Each entry updates stock and stays in the visit history.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3 sm:p-4">
      {uses.map(use => {
        const name = use.StockItem?.name || 'Consumable';
        const unit = use.StockItem?.unitOfMeasure || 'unit(s)';
        const quantity = Math.abs(Number(use.quantity) || 0);
        const notes = cleanNotes(use.notes);
        return (
          <article
            key={use.id}
            className="group flex min-w-0 items-start gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 transition-colors hover:border-[var(--icon-cyan-text)]/40 hover:bg-[var(--bg-main)] sm:p-4"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">
              <Package className="h-4 w-4" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                <div className="min-w-0 flex-1">
                  <h4 className="break-words text-xs font-bold text-[var(--text-primary)]">{name}</h4>
                  {(use.StockItem?.drugCode || use.StockItem?.category) && (
                    <p className="mt-1 truncate text-[10px] text-[var(--text-tertiary)]">
                      {[use.StockItem?.drugCode, use.StockItem?.category].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <span className="inline-flex shrink-0 items-baseline gap-1 rounded-lg bg-[var(--icon-cyan-bg)] px-2.5 py-1.5 text-[var(--icon-cyan-text)]">
                  <span className="text-sm font-bold tabular-nums">{quantity}</span>
                  <span className="text-[9px] font-semibold">{unit}</span>
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[var(--text-tertiary)]">
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" />
                  {formatDate(use.transactionDate || use.createdAt)}
                </span>
                {notes && (
                  <span className="inline-flex min-w-0 items-start gap-1">
                    <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
                    <span className="break-words">{notes}</span>
                  </span>
                )}
              </div>
            </div>

            {(onEdit || onDelete) && (
              <div className="flex shrink-0 items-center gap-1 self-start">
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(use)}
                    aria-label={`Edit ${name}`}
                    title="Edit entry"
                    className="rounded-lg border border-transparent p-2 text-[var(--text-tertiary)] transition-colors hover:border-[var(--border-color)] hover:bg-[var(--icon-cyan-bg)] hover:text-[var(--icon-cyan-text)]"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(use)}
                    aria-label={`Delete ${name}`}
                    title="Delete entry and restore stock"
                    className="rounded-lg border border-transparent p-2 text-[var(--text-tertiary)] transition-colors hover:border-[var(--border-color)] hover:bg-[var(--icon-red-bg)] hover:text-[var(--icon-red-text)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
};
