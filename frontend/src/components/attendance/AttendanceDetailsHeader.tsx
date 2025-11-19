// src/components/attendance/AttendanceDetailsHeader.tsx
import { ArrowLeft, Edit } from 'lucide-react';

interface AttendanceDetailsHeaderProps {
  currentAttendance: any;
  patient: any;
  canEdit: boolean;
  onBack: () => void;
}

export const AttendanceDetailsHeader: React.FC<AttendanceDetailsHeaderProps> = ({
  currentAttendance,
  patient,
  canEdit,
  onBack
}) => {
  return (
    <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-xl p-4 text-white shadow-md">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">
              {currentAttendance.attendanceNumber || `ATT-${currentAttendance._id?.slice(-8)}`}
            </h1>
            <p className="text-blue-100 text-sm mt-0.5">
              {patient?.fullName || `Patient ${currentAttendance.patientId?.toString().slice(-6) || 'Unknown'}`} • {new Date(currentAttendance.dateTime).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button className="flex items-center gap-1.5 px-3 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-all duration-200 border border-white/20 font-semibold text-sm">
              <Edit className="w-4 h-4" />
              <span>Edit Record</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};