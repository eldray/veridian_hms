// src/components/patients/PatientsHeader.tsx
import { Link } from 'react-router-dom';
import { Hospital, Plus } from 'lucide-react';

interface PatientsHeaderProps {
  canRegister: boolean;
}

export const PatientsHeader: React.FC<PatientsHeaderProps> = ({ canRegister }) => {
  return (
    <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-lg p-4 text-white shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Hospital className="w-5 h-5 text-blue-400" />
            Patient Management
          </h1>
          <p className="text-blue-100 mt-0.5 text-xs">Manage patient records and medical history</p>
        </div>
        {canRegister && (
          <Link
            to="/dashboard/patients/register"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all duration-200 hover:shadow-md font-semibold text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Register Patient</span>
          </Link>
        )}
      </div>
    </div>
  );
};