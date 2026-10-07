import React from 'react';
import { Edit2, Package, Trash2 } from 'lucide-react';

interface ConsumableUsesPanelProps {
  uses: any[];
  onEdit?: (use: any) => void;
  onDelete?: (use: any) => void;
}

export const ConsumableUsesPanel: React.FC<ConsumableUsesPanelProps> = ({ uses, onEdit, onDelete }) => (
  <div className="divide-y divide-[var(--border-color)]">
    {uses.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <Package className="w-8 h-8 opacity-20" />
        <p className="text-xs text-[var(--text-tertiary)]">No consumable use recorded</p>
      </div>
    ) : uses.map(use => (
      <div key={use.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-main)]">
        <Package className="w-4 h-4 text-[var(--icon-cyan-text)] flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[var(--text-primary)]">{use.StockItem?.name || 'Consumable'}</p>
          <p className="text-[11px] text-[var(--text-secondary)]">
            {Math.abs(use.quantity)} {use.StockItem?.unitOfMeasure || 'unit(s)'}
            {use.notes?.replace(/^Consumable use:\s*/, '') ? ` · ${use.notes.replace(/^Consumable use:\s*/, '')}` : ''}
          </p>
          <p className="text-[10px] text-[var(--text-tertiary)]">
            {use.transactionDate ? new Date(use.transactionDate).toLocaleString() : '—'}
          </p>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-1">
            {onEdit && (
              <button type="button" onClick={() => onEdit(use)} aria-label="Edit consumable use" title="Edit"
                className="rounded p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--icon-cyan-bg)] hover:text-[var(--icon-cyan-text)]">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button type="button" onClick={() => onDelete(use)} aria-label="Delete consumable use" title="Delete"
                className="rounded p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--icon-red-bg)] hover:text-[var(--icon-red-text)]">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    ))}
  </div>
);
