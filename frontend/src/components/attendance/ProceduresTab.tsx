// src/components/attendance/ProceduresTab.tsx
import { Scissors } from 'lucide-react';

interface ProceduresTabProps {
  attendance: any;
}

const formatProcedureCost = (value: unknown): string => {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return '₵0.00';
  return `₵${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const ProceduresTab: React.FC<ProceduresTabProps> = ({ attendance }) => {
  const procedures = attendance.procedures || [];

  if (procedures.length === 0) {
    return (
      <div className="p-6 text-center">
        <Scissors className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-3" />
        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">No Procedures</h3>
        <p className="text-sm text-[var(--text-secondary)]">No procedures have been performed for this attendance.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="space-y-3">
        {procedures.map((procedure: any, index: number) => (
          <div key={procedure.id || index} className="bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <h4 className="font-semibold text-base text-[var(--text-primary)]">{procedure.procedureName || procedure.name}</h4>
              {(Number(procedure.cost) || 0) > 0 && (
                <span className="px-3 py-1 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] text-sm font-semibold rounded-full border border-[var(--border-color)] tabular-nums self-start sm:self-auto">
                  {formatProcedureCost(procedure.cost)}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
              <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)]">
                <p className="text-xs text-[var(--text-secondary)] font-medium mb-1">Description</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">{procedure.description || 'No description'}</p>
              </div>
              {procedure.performedAt && (
                <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)]">
                  <p className="text-xs text-[var(--text-secondary)] font-medium mb-1">Performed</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {new Date(procedure.performedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              {procedure.performedBy && (
                <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)]">
                  <p className="text-xs text-[var(--text-secondary)] font-medium mb-1">Performed By</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{procedure.performedBy}</p>
                </div>
              )}
            </div>
            {procedure.notes && (
              <div className="bg-[var(--icon-orange-bg)] rounded-lg p-3 border border-[var(--border-color)]">
                <p className="text-xs text-[var(--text-secondary)] font-medium mb-1">Notes</p>
                <p className="text-sm text-[var(--text-primary)]">{procedure.notes}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
