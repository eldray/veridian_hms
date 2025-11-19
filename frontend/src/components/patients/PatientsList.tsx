// src/components/patients/PatientsList.tsx
import { Link } from 'react-router-dom';
import { User, Phone, Calendar, Eye, Edit, Stethoscope } from 'lucide-react';

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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Patient</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Contact</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Details</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Payment</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {patients.map((patient) => {
            const patientId = getPatientId(patient);
            return (
              <tr key={patientId} className="hover:bg-gray-50 transition-colors duration-150">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-teal-500 rounded-md flex items-center justify-center shadow-sm overflow-hidden">
                      {patient.imageUrl ? (
                        <img 
                          src={patient.imageUrl} 
                          alt={patient.fullName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : null}
                      {!patient.imageUrl && <User className="w-3 h-3 text-white" />}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-xs">{patient.fullName}</p>
                      <p className="text-xs text-gray-500">{patient.folderNumber || patientId}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Phone className="w-3 h-3 text-green-600" />
                    {patient.contact}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Calendar className="w-3 h-3 text-blue-600" />
                    {patient.age || 'N/A'}y • {patient.gender}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getPaymentModeColor(patient.paymentMode)}`}>
                    {getPaymentModeLabel(patient.paymentMode)}
                  </span>
                </td>
                <td className="px-3 py-2">
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