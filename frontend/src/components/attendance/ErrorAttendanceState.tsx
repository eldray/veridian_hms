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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="text-center bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-gray-900 mb-1">
          {error ? 'Error Loading' : 'Not Found'}
        </h2>
        <p className="text-gray-600 mb-4 text-sm">
          {error || "The attendance record doesn't exist."}
        </p>
        <button 
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all duration-200 font-semibold text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
      </div>
    </div>
  );
};