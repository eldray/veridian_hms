import React from 'react';
import { Medication, Patient, Attendance } from '../types';
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Printer className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Print Prescriptions</h3>
            <p className="text-xs text-gray-600">
              Generate printable prescriptions for all pending medications
            </p>
          </div>
        </div>
        <button
          onClick={onPrintAll}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200 font-medium flex items-center gap-1 text-sm"
        >
          <Printer className="w-3 h-3" />
          Print All ({prescribedMeds.length})
        </button>
      </div>
    </div>
  );
};