// src/pages/maternal/components/shared/TableComponents.tsx
import React from 'react';

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    pending: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]',
    requested: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]',
    scheduled: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]',
    prescribed: 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]',
    completed: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
    cancelled: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]',
    dispensed: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[status?.toLowerCase()] ?? 'bg-[var(--bg-main)] text-[var(--text-secondary)]'}`}>
      {status}
    </span>
  );
};

export const RiskBadge: React.FC<{ risk: string }> = ({ risk }) => {
  const map: Record<string, string> = {
    low: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
    medium: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]',
    high: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${map[risk?.toLowerCase()] ?? map.low}`}>
      {risk?.toUpperCase()} RISK
    </span>
  );
};

export const SectionCard: React.FC<{
  icon: React.ReactNode; title: string; count?: number;
  countCls?: string; action?: React.ReactNode; children: React.ReactNode; maxH?: string;
}> = ({ icon, title, count, countCls = 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]', action, children, maxH = 'max-h-72' }) => (
  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden flex flex-col">
    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex-shrink-0">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold text-[var(--text-primary)] tracking-tight">{title}</span>
        {count !== undefined && count > 0 && (
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${countCls}`}>{count}</span>
        )}
      </div>
      {action}
    </div>
    <div className={`${maxH} overflow-y-auto`} style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border-color) transparent' }}>
      {children}
    </div>
  </div>
);

export const EmptySlate: React.FC<{ icon: React.ReactNode; label: string; action?: React.ReactNode }> = ({ icon, label, action }) => (
  <div className="flex flex-col items-center justify-center py-10 gap-2.5">
    <div className="opacity-20">{icon}</div>
    <p className="text-xs text-[var(--text-tertiary)]">{label}</p>
    {action}
  </div>
);

export const AddBtn: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
  <button onClick={onClick}
    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold
      bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]
      hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all">
    <Plus className="w-3 h-3" />{label}
  </button>
);

export const DelBtn: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button onClick={onClick}
    className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] transition-all">
    <Trash2 className="w-3.5 h-3.5" />
  </button>
);

export const TH: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] whitespace-nowrap">{children}</th>
);

export const TD: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <td className={`px-3 py-2 text-[var(--text-secondary)] text-xs ${className}`}>{children}</td>
);

export const TDp: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <td className="px-3 py-2 text-[var(--text-primary)] text-xs font-medium">{children}</td>
);

// Add missing imports
import { Plus, Trash2 } from 'lucide-react';