import React from 'react';
import type { Medication, Patient, Attendance } from '../../types';
import { Printer } from 'lucide-react';

interface PrintPrescriptionsSectionProps {
  prescribedMeds: Medication[];
  selectedPatient: Patient | undefined;
  selectedAttendance: Attendance | undefined;
  onPrintAll: () => void;
  onPrintSingle: (medication: Medication) => void;
  printingPrescriptionId: string | null;
}

export const PrintPrescriptionsSection: React.FC<PrintPrescriptionsSectionProps> = ({
  prescribedMeds,
  selectedPatient,
  selectedAttendance,
  onPrintAll,
  onPrintSingle,
  printingPrescriptionId
}) => {
  if (prescribedMeds.length === 0) return null;

  return (
    <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-[var(--icon-purple-bg)] rounded-lg flex items-center justify-center">
            <Printer className="w-4 h-4 text-[var(--icon-purple-text)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Print Prescriptions</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Generate printable prescriptions for all pending medications
            </p>
          </div>
        </div>
        <button
          onClick={onPrintAll}
          className="px-3 py-2 bg-[var(--icon-purple-text)] text-white rounded-lg hover:opacity-90 transition-all duration-200 font-medium flex items-center gap-1 text-sm"
        >
          <Printer className="w-3 h-3" />
          Print All ({prescribedMeds.length})
        </button>
      </div>
    </div>
  );
};