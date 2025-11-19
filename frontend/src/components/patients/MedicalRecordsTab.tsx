// src/components/patients/MedicalRecordsTab.tsx
import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';

interface MedicalRecordsTabProps {
  attendances: any[];
  patient: any;
}

export const MedicalRecordsTab: React.FC<MedicalRecordsTabProps> = ({ attendances, patient }) => {
  const allMedications = attendances.flatMap(att => att.medications || []);
  const allLabTests = attendances.flatMap(att => att.labTests || []);
  const allDiagnoses = attendances.flatMap(att => 
    att.diagnoses?.map((d: any) => ({
      ...d,
      attendanceDate: att.dateTime,
      attendanceType: att.attendanceType
    })) || []
  );

  if (attendances.length === 0) {
    return (
      <div className="text-center py-8">
        <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Medical Records</h3>
        <p className="text-gray-600 text-sm">Medical records will appear after patient visits</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-900">{attendances.length}</p>
          <p className="text-xs text-blue-700 font-medium">Visits</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-900">{allMedications.length}</p>
          <p className="text-xs text-green-700 font-medium">Meds</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-purple-900">{allLabTests.length}</p>
          <p className="text-xs text-purple-700 font-medium">Tests</p>
        </div>
      </div>

      {/* Recent Diagnoses */}
      {allDiagnoses.length > 0 && (
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-3 text-sm">Recent Diagnoses</h4>
          <div className="space-y-2">
            {allDiagnoses.slice(0, 3).map((diagnosis, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                <div>
                  <p className="font-medium text-gray-900">{diagnosis.name}</p>
                  <p className="text-xs text-gray-600">
                    {new Date(diagnosis.attendanceDate).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  to={`/dashboard/attendance/${diagnosis.attendanceId}`}
                  className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Medications */}
      {allMedications.length > 0 && (
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-3 text-sm">Recent Medications</h4>
          <div className="space-y-2">
            {allMedications.slice(0, 3).map((med, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                <div>
                  <p className="font-medium text-gray-900">{med.name}</p>
                  <p className="text-xs text-gray-600">{med.dosage} • {med.frequency}</p>
                </div>
                <span className={`px-1.5 py-0.5 text-xs rounded ${
                  med.status === 'dispensed' ? 'bg-green-100 text-green-800' : 
                  med.status === 'administered' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {med.status?.charAt(0).toUpperCase() + med.status?.slice(1) || 'Prescribed'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};