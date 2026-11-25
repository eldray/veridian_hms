// src/components/attendance/MedicationsTab.tsx
import { Pill } from 'lucide-react';

interface MedicationsTabProps {
  attendance: any;
}

export const MedicationsTab: React.FC<MedicationsTabProps> = ({ attendance }) => {
  const medications = attendance.medications || [];

  if (medications.length === 0) {
    return (
      <div className="p-6 text-center">
        <Pill className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">No Medications</h3>
        <p className="text-[var(--text-secondary)] text-sm">No medications prescribed.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="space-y-3">
        {medications.map((med: any, index: number) => (
          <div key={med.id || index} className="bg-[var(--bg-main)] rounded-lg p-3 border border-[var(--border-color)] hover:shadow-md transition-all duration-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 mb-2">
              <h4 className="font-bold text-[var(--text-primary)] text-sm">{med.name || med.medicationName}</h4>
              {med.dispensed ? (
                <span className="px-2 py-1 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] text-xs font-bold rounded border border-[var(--border-color)]">
                  Dispensed
                </span>
              ) : (
                <span className="px-2 py-1 bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)] text-xs font-bold rounded border border-[var(--border-color)]">
                  Pending
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className="bg-[var(--bg-card)] rounded p-2 border border-[var(--border-color)]">
                <p className="text-xs text-[var(--text-secondary)] font-medium">Dosage</p>
                <p className="font-semibold text-[var(--text-primary)] text-sm">{med.dosage || 'N/A'}</p>
              </div>
              <div className="bg-[var(--bg-card)] rounded p-2 border border-[var(--border-color)]">
                <p className="text-xs text-[var(--text-secondary)] font-medium">Frequency</p>
                <p className="font-semibold text-[var(--text-primary)] text-sm">{med.frequency || 'N/A'}</p>
              </div>
              <div className="bg-[var(--bg-card)] rounded p-2 border border-[var(--border-color)]">
                <p className="text-xs text-[var(--text-secondary)] font-medium">Duration</p>
                <p className="font-semibold text-[var(--text-primary)] text-sm">{med.duration || 'N/A'}</p>
              </div>
              <div className="bg-[var(--bg-card)] rounded p-2 border border-[var(--border-color)]">
                <p className="text-xs text-[var(--text-secondary)] font-medium">{med.status === 'dispensed' || med.status === 'administered' ? 'Dispensed quantity' : 'Prescribed quantity'}</p>
                <p className="font-semibold text-[var(--text-primary)] text-sm">{med.status === 'dispensed' || med.status === 'administered' ? (med.dispensedQuantity ?? med.quantity ?? 'N/A') : (med.quantity ?? 'N/A')}</p>
              </div>
            </div>
            {med.dispensedAt && (
              <div className="mt-2 pt-2 border-t border-[var(--border-color)]">
                <p className="text-xs text-[var(--text-secondary)]">
                  Dispensed on <span className="font-semibold">{new Date(med.dispensedAt).toLocaleDateString()}</span>
                  {med.dispensedBy && (
                    <> by <span className="font-semibold">{med.dispensedBy}</span></>
                  )}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};