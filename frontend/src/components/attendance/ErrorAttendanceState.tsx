// src/components/attendance/ErrorAttendanceState.tsx
import { FileText, ArrowLeft } from 'lucide-react';

interface ErrorAttendanceStateProps {
  error: any;
  onBack: () => void;
}

export const ErrorAttendanceState: React.FC<ErrorAttendanceStateProps> = ({
  error,
  onBack
}) => {
  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-4">
      <div className="text-center bg-[var(--bg-card)] rounded-lg shadow-sm border border-[var(--border-color)] p-6">
        <FileText className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">
          {error ? 'Error Loading' : 'Not Found'}
        </h2>
        <p className="text-[var(--text-secondary)] mb-4 text-sm">
          {error || "The attendance record doesn't exist."}
        </p>
        <button 
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-cyan-text)] transition-all duration-200 font-semibold text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
      </div>
    </div>
  );
};