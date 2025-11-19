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
        <Pill className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-900 mb-1">No Medications</h3>
        <p className="text-gray-600 text-sm">No medications prescribed.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="space-y-3">
        {medications.map((med: any, index: number) => (
          <div key={med.id || index} className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg p-3 border border-gray-200 hover:shadow-md transition-all duration-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 mb-2">
              <h4 className="font-bold text-gray-900 text-sm">{med.name || med.medicationName}</h4>
              {med.dispensed ? (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded border border-green-200">
                  Dispensed
                </span>
              ) : (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded border border-yellow-200">
                  Pending
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className="bg-white rounded p-2 border border-gray-200">
                <p className="text-xs text-gray-600 font-medium">Dosage</p>
                <p className="font-semibold text-gray-900 text-sm">{med.dosage || 'N/A'}</p>
              </div>
              <div className="bg-white rounded p-2 border border-gray-200">
                <p className="text-xs text-gray-600 font-medium">Frequency</p>
                <p className="font-semibold text-gray-900 text-sm">{med.frequency || 'N/A'}</p>
              </div>
              <div className="bg-white rounded p-2 border border-gray-200">
                <p className="text-xs text-gray-600 font-medium">Duration</p>
                <p className="font-semibold text-gray-900 text-sm">{med.duration || 'N/A'}</p>
              </div>
              <div className="bg-white rounded p-2 border border-gray-200">
                <p className="text-xs text-gray-600 font-medium">Quantity</p>
                <p className="font-semibold text-gray-900 text-sm">{med.quantity || 'N/A'}</p>
              </div>
            </div>
            {med.dispensedAt && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-600">
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