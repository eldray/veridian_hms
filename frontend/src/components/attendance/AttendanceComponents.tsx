// src/components/attendance/AttendanceCard.tsx
import { Link } from 'react-router-dom';
import { User, Eye, Edit, Pill, FlaskConical, Scissors, DollarSign, Calendar, Stethoscope } from 'lucide-react';

interface AttendanceCardProps {
  attendance: any;
  patient: any;
  attendanceId: string;
  totalBill: number;
  statusColor: string;
  attendanceTypeLabel: string;
  paymentModeLabel: string;
  paymentModeIcon: React.ReactNode;
  formattedDate: string;
  onEditAttendance: (attendance: any) => void;
}

export const AttendanceCard: React.FC<AttendanceCardProps> = ({
  attendance,
  patient,
  attendanceId,
  totalBill,
  statusColor,
  attendanceTypeLabel,
  paymentModeLabel,
  paymentModeIcon,
  formattedDate,
  onEditAttendance
}) => {
  return (
    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-teal-500 rounded-lg flex items-center justify-center shadow-sm">
            <User className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm leading-tight">
              {patient?.fullName || `Patient ${attendance.patientId?.toString().slice(-6) || 'Unknown'}`}
            </h3>
            <p className="text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded border mt-0.5">
              {patient?.folderNumber || 'No Folder'} • {attendance.attendanceNumber || `ATT-${attendanceId?.slice(-8)}`}
            </p>
          </div>
        </div>
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusColor}`}>
          {(attendance.status || 'active').charAt(0).toUpperCase() + (attendance.status || 'active').slice(1)}
        </span>
      </div>

      <div className="space-y-1.5 text-xs mb-3">
        <div className="flex items-center gap-1.5 text-gray-600">
          <Calendar className="w-3.5 h-3.5" />
          <span className="font-medium">{formattedDate}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-medium text-blue-700">{attendanceTypeLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {paymentModeIcon}
          <span className="font-medium text-gray-700">{paymentModeLabel}</span>
        </div>
        {attendance.complaints && attendance.complaints !== 'No complaints recorded' && (
          <p className="text-gray-700 text-xs truncate">
            <span className="font-semibold">Complaints:</span> {attendance.complaints}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3 text-xs text-gray-600">
        <span className="flex items-center gap-0.5">
          <Pill className="w-3 h-3" />
          {attendance.medications?.length || 0}
        </span>
        <span className="flex items-center gap-0.5">
          <FlaskConical className="w-3 h-3" />
          {attendance.labTests?.length || 0}
        </span>
        <span className="flex items-center gap-0.5">
          <Scissors className="w-3 h-3" />
          {attendance.procedures?.length || 0}
        </span>
        {totalBill > 0 && (
          <span className="flex items-center gap-0.5 ml-auto font-medium">
            <DollarSign className="w-3 h-3" />
            ${totalBill.toFixed(2)}
          </span>
        )}
      </div>

      <div className="flex gap-1.5 pt-2 border-t border-gray-200">
        <Link
          to={`/dashboard/attendance/${attendanceId}`}
          className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all duration-200 font-medium text-xs"
        >
          <Eye className="w-3 h-3" />
          View
        </Link>
        <button
          onClick={() => onEditAttendance(attendance)}
          className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-all duration-200 font-medium text-xs"
        >
          <Edit className="w-3 h-3" />
          Edit
        </button>
      </div>
    </div>
  );
};