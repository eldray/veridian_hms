import React from 'react';
import { Pill, Package } from 'lucide-react';

/**
 * The two order types a clinician records from the same place. Consumables are stock issued
 * against the visit, prescriptions are lines the pharmacy dispenses, and each keeps its own
 * endpoint — the toggle only chooses which form is on screen.
 */
export const OrderModeToggle: React.FC<{
  mode: 'prescription' | 'consumable';
  onChange: (mode: 'prescription' | 'consumable') => void;
}> = ({ mode, onChange }) => {
  const options = [
    { key: 'prescription' as const, label: 'Prescription', icon: <Pill className="w-3.5 h-3.5" /> },
    { key: 'consumable' as const, label: 'Consumables', icon: <Package className="w-3.5 h-3.5" /> },
  ];
  return (
    <div className="flex rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] p-0.5" role="tablist" aria-label="Order type">
      {options.map(option => {
        const active = option.key === mode;
        return (
          <button
            key={option.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => { if (!active) onChange(option.key); }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors ${active
              ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
          >
            {option.icon}{option.label}
          </button>
        );
      })}
    </div>
  );
};
