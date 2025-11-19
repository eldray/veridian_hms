// src/components/patients/PatientCard.tsx
import { Link } from 'react-router-dom';
import { User, Calendar, Phone, CreditCard, Eye, Stethoscope, Edit } from 'lucide-react';

interface PatientCardProps {
  patient: any;
  patientId: string;
  paymentModeColor: string;
  paymentModeLabel: string;
  onAddAttendance: (patientId: string) => void;
}

export const PatientCard: React.FC<PatientCardProps> = ({
  patient,
  patientId,
  paymentModeColor,
  paymentModeLabel,
  onAddAttendance
}) => {
  return (
    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-teal-500 rounded-lg flex items-center justify-center shadow-sm overflow-hidden">
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
            {!patient.imageUrl && <User className="w-4 h-4 text-white" />}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm leading-tight">{patient.fullName}</h3>
            <p className="text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded border mt-0.5">
              {patient.folderNumber || patientId}
            </p>
          </div>
        </div>
        <Link
          to={`/dashboard/patients/register?edit=true&id=${patientId}`}
          className="p-1.5 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-all duration-200"
          title="Edit Patient"
        >
          <Edit className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-1.5 text-xs mb-3">
        <div className="flex items-center gap-1.5 text-gray-600">
          <Calendar className="w-3 h-3 text-blue-600" />
          <span className="font-medium">
            {patient.age || 'N/A'}y • {patient.gender}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-600">
          <Phone className="w-3 h-3 text-green-600" />
          <span className="font-medium">{patient.contact}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CreditCard className="w-3 h-3 text-purple-600" />
          <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${paymentModeColor}`}>
            {paymentModeLabel}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-1.5 pt-2 border-t border-gray-200">
        <Link
          to={`/dashboard/patients/${patientId}`}
          className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all duration-200 font-medium text-xs"
        >
          <Eye className="w-3 h-3" />
          View
        </Link>
        <button
          onClick={() => onAddAttendance(patientId)}
          className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-all duration-200 font-medium text-xs"
        >
          <Stethoscope className="w-3 h-3" />
          Visit
        </button>
      </div>
    </div>
  );
};