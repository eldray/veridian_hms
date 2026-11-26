import React from 'react';
import type { Attendance, Patient } from '../../types';
import { Calendar, Edit } from 'lucide-react';

interface AttendanceSelectionProps {
  patientAttendances: Array<Attendance & { patient?: Patient }>;
  selectedAttendanceId: string;
  onAttendanceSelect: (attendanceId: string) => void;
  onNewAttendance: () => void;
  onEditAttendance: (attendance: Attendance) => void;
  selectedPatientId: string;
}

export const AttendanceSelection: React.FC<AttendanceSelectionProps> = ({
  patientAttendances,
  selectedAttendanceId,
  onAttendanceSelect,
  onNewAttendance,
  onEditAttendance,
  selectedPatientId,
}) => {
  const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
    return entity?._id || entity?.id;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] border-[var(--icon-yellow-text)]';
      case 'active': return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border-[var(--icon-green-text)]';
      case 'completed': return 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] border-[var(--icon-blue-text)]';
      case 'cancelled': return 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border-[var(--icon-red-text)]';
      default: return 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]';
    }
  };

  const selectedAttendance = patientAttendances.find((a) => getEntityId(a) === selectedAttendanceId);

  return (
    <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-[var(--text-primary)]">
          <Calendar className="w-4 h-4 text-[var(--icon-cyan-text)]" />
          Select Attendance
        </h2>
        <button
          onClick={onNewAttendance}
          className="px-3 py-1.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:opacity-85 transition-all text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-cyan-text)]"
        >
          New Attendance
        </button>
      </div>
      
      {patientAttendances.length === 0 ? (
        <div className="text-center py-3 text-[var(--text-secondary)]">
          <p className="text-sm mb-2">No attendances found</p>
          <button
            onClick={onNewAttendance}
            className="px-3 py-1.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:opacity-85 transition-all text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-cyan-text)]"
          >
            Create New Attendance
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <select
              value={selectedAttendanceId}
              onChange={(e) => onAttendanceSelect(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all appearance-none bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
            >
              <option value="">Select an attendance...</option>
              {patientAttendances.map((attendance) => {
                const aid = getEntityId(attendance);
                if (!aid) return null;
                return (
                  <option key={aid} value={aid}>
                    {attendance.attendanceNumber} - {new Date(attendance.dateTime).toLocaleDateString()} - {attendance.status}
                  </option>
                );
              })}
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg className="w-3 h-3 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {selectedAttendance && (
            <AttendanceDetails 
              attendance={selectedAttendance} 
              onEdit={onEditAttendance}
            />
          )}
        </div>
      )}
    </div>
  );
};

const AttendanceDetails: React.FC<{ 
  attendance: Attendance & { patient?: Patient }; 
  onEdit: (attendance: Attendance) => void;
}> = ({ attendance, onEdit }) => {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] border-[var(--icon-yellow-text)]';
      case 'active': return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border-[var(--icon-green-text)]';
      case 'completed': return 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] border-[var(--icon-blue-text)]';
      case 'cancelled': return 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border-[var(--icon-red-text)]';
      default: return 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]';
    }
  };

  return (
    <div className="p-3 border-2 border-[var(--icon-cyan-text)] bg-[var(--bg-main)] rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-[var(--text-primary)] text-sm">
            {attendance.attendanceNumber}
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            {new Date(attendance.dateTime).toLocaleDateString()}
          </div>
          <div className="text-xs text-[var(--text-secondary)] capitalize">
            {attendance.attendanceType?.replace('_', ' ')}
          </div>
          <div className="text-xs text-[var(--text-secondary)]">
            Payment: <span className="font-semibold capitalize">{attendance.paymentMode}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {attendance.totalBill && attendance.totalBill > 0 && (
            <div className="text-right">
              <div className="text-xs font-semibold text-[var(--text-primary)]">
                ₵{Number(attendance.totalBill).toFixed(2)}
              </div>
              <div className="text-xs text-[var(--text-tertiary)]">
                Bill
              </div>
            </div>
          )}
          
          <div className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(attendance.status)}`}>
            {attendance.status}
          </div>

          <button
            onClick={() => onEdit(attendance)}
            className="p-1.5 bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] border border-[var(--icon-yellow-text)] rounded hover:opacity-85 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-cyan-text)]"
            title="Edit Attendance"
          >
            <Edit className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};