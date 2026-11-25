// src/components/patients/PatientsList.tsx
import { Link } from 'react-router-dom';
import { Phone, Calendar, Eye, Edit, Stethoscope } from 'lucide-react';
import { PatientAvatar } from './PatientAvatar';
import { TABLE_SHELL, TH, TH_ROW, TD, TR, cn } from '../ui';

interface PatientsListProps {
  patients: any[];
  onAddAttendance: (patientId: string) => void;
}

export const PatientsList: React.FC<PatientsListProps> = ({ patients, onAddAttendance }) => {
  const getPaymentModeColor = (paymentMode: string) => {
    switch (paymentMode) {
      case 'cash':
        return 'bg-gray-100 text-gray-800 border border-gray-200';
      case 'nhis':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'private_insurance':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getPaymentModeLabel = (paymentMode: string) => {
    switch (paymentMode) {
      case 'cash':
        return 'CASH';
      case 'nhis':
        return 'NHIS';
      case 'private_insurance':
        return 'PRIVATE';
      default:
        return paymentMode?.toUpperCase() || 'UNKNOWN';
    }
  };

  const getPatientId = (patient: any) => patient.id || patient._id;

  return (
    <div className={cn(TABLE_SHELL, "overflow-x-auto")}>
      <table className="w-full min-w-[720px] text-sm">
        <thead className={TH_ROW}>
          <tr>
            <th className={cn(TH, "px-3 py-2")}>Patient</th>
            <th className={cn(TH, "px-3 py-2")}>Contact</th>
            <th className={cn(TH, "px-3 py-2")}>Details</th>
            <th className={cn(TH, "px-3 py-2")}>Payment</th>
            <th className={cn(TH, "px-3 py-2")}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => {
            const patientId = getPatientId(patient);
            return (
              <tr key={patientId} className={TR}>
                <td className={cn(TD, "px-3 py-2")}>
                  <div className="flex items-center gap-2">
                    <PatientAvatar patient={patient} size="sm" />
                    <div>
                      <p className="font-semibold text-[var(--text-primary)] text-xs">{patient.fullName}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{patient.folderNumber || patientId}</p>
                    </div>
                  </div>
                </td>
                <td className={cn(TD, "px-3 py-2")}>
                  <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                    <Phone className="w-3 h-3 text-[var(--icon-green-text)]" />
                    {patient.contact}
                  </div>
                </td>
                <td className={cn(TD, "px-3 py-2")}>
                  <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                    <Calendar className="w-3 h-3 text-[var(--icon-cyan-text)]" />
                    {patient.age || 'N/A'}y • {patient.gender}
                  </div>
                </td>
                <td className={cn(TD, "px-3 py-2")}>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getPaymentModeColor(patient.paymentMode)}`}>
                    {getPaymentModeLabel(patient.paymentMode)}
                  </span>
                </td>
                <td className={cn(TD, "px-3 py-2")}>
                  <div className="flex items-center gap-1">
                    <Link
                      to={`/dashboard/patients/${patientId}`}
                      className="p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
                      title="View Details"
                    >
                      <Eye className="w-3 h-3" />
                    </Link>
                    <Link
                      to={`/dashboard/patients/register?edit=true&id=${patientId}`}
                      className="p-1.5 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors duration-200"
                      title="Edit Patient"
                    >
                      <Edit className="w-3 h-3" />
                    </Link>
                    <button
                      onClick={() => onAddAttendance(patientId)}
                      className="p-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200"
                      title="Add Visit"
                    >
                      <Stethoscope className="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};