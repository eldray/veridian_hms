// src/components/patients/EmptyPatientsState.tsx
import { Link } from 'react-router-dom';
import { User, Plus } from 'lucide-react';

interface EmptyPatientsStateProps {
  searchQuery: string;
  canRegister: boolean;
}

export const EmptyPatientsState: React.FC<EmptyPatientsStateProps> = ({ searchQuery, canRegister }) => {
  return (
    <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
      <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
      <p className="text-gray-600 mb-2">
        {searchQuery ? 'No patients found' : 'No patients registered yet'}
      </p>
      {canRegister && !searchQuery && (
        <Link
          to="/dashboard/patients/register"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold mt-3 text-sm"
        >
          <Plus className="w-4 h-4" />
          Register Your First Patient
        </Link>
      )}
    </div>
  );
};