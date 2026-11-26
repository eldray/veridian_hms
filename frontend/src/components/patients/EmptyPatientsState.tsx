import { Link } from 'react-router-dom';
import { User, Plus } from 'lucide-react';

interface EmptyPatientsStateProps {
  searchQuery: string;
  canRegister: boolean;
}

export const EmptyPatientsState: React.FC<EmptyPatientsStateProps> = ({ searchQuery, canRegister }) => {
  return (
    <section
      className="rounded-xl p-6 sm:p-8 shadow-sm border text-center"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
      }}
      role="status"
      aria-live="polite"
    >
      <User
        className="w-10 h-10 mx-auto mb-3"
        style={{ color: 'var(--text-tertiary)' }}
        aria-hidden="true"
      />
      <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
        {searchQuery ? 'No patients found' : 'No patients registered yet'}
      </p>
      {canRegister && !searchQuery && (
        <Link
          to="/dashboard/patients/register"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold mt-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Register Your First Patient
        </Link>
      )}
    </section>
  );
};