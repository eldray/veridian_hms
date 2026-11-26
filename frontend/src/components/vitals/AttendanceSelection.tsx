import React from 'react';
import { Calendar, Clock, Plus, Activity } from 'lucide-react';
import type { Attendance } from '../../types';

interface AttendanceSelectionProps {
  patientAttendances: Attendance[];
  selectedAttendanceId: string;
  setSelectedAttendanceId: (id: string) => void;
  selectedPatientId: string;
  navigate: (path: string) => void;
  onActivateAttendance: (attendance?: any) => void;
  activatingAttendance: boolean;
}

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?._id || entity?.id;
};

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'pending': return 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] border-[var(--border-color)]';
    case 'active': return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border-[var(--border-color)]';
    case 'completed': return 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border-[var(--border-color)]';
    case 'cancelled': return 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border-[var(--border-color)]';
    case 'admitted': return 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] border-[var(--border-color)]';
    default: return 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]';
  }
};

export const AttendanceSelection: React.FC<AttendanceSelectionProps> = ({
  patientAttendances,
  selectedAttendanceId,
  setSelectedAttendanceId,
  selectedPatientId,
  navigate,
  onActivateAttendance,
  activatingAttendance
}) => {
  return (
    <div className="bg-[var(--bg-card)] rounded-2xl shadow-xl border border-[var(--border-color)] p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[var(--icon-cyan-text)]" />
          Patient Visits
        </h2>
        
        <button
          onClick={() => navigate(`/dashboard/attendance/new?patientId=${selectedPatientId}`)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-green-text)] transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Visit
        </button>
      </div>

      {patientAttendances.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Visits Found</h3>
          <p className="text-[var(--text-secondary)] mb-4">This patient doesn't have any recorded visits yet.</p>
          <button
            onClick={() => navigate(`/dashboard/attendance/new?patientId=${selectedPatientId}`)}
            className="px-6 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-cyan-text)] transition-colors font-medium"
          >
            Create First Visit
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
            Select Visit to Record Vitals
          </label>
          
          {patientAttendances.map((attendance) => (
            <div 
              key={getEntityId(attendance)} 
              className={`border-2 rounded-xl p-4 transition-all duration-200 ${
                selectedAttendanceId === getEntityId(attendance)
                  ? 'border-[var(--icon-cyan-text)] bg-[var(--icon-cyan-bg)] shadow-md'
                  : 'border-[var(--border-color)] bg-[var(--bg-main)] hover:border-[var(--icon-cyan-text)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <p className="font-semibold text-[var(--text-primary)] text-lg">
                      {attendance.attendanceNumber || `Visit ${new Date(attendance.dateTime || attendance.createdAt || '').toLocaleDateString()}`}
                    </p>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(attendance.status || '')}`}>
                      {attendance.status?.charAt(0).toUpperCase() + attendance.status?.slice(1) || 'Unknown'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm text-[var(--text-secondary)]">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{new Date(attendance.dateTime || attendance.createdAt || '').toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Type: {attendance.attendanceType?.replace(/_/g, ' ') || 'General'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => setSelectedAttendanceId(getEntityId(attendance) || '')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedAttendanceId === getEntityId(attendance)
                        ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] shadow-sm'
                        : 'bg-gray-100 text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
                    }`}
                  >
                    {selectedAttendanceId === getEntityId(attendance) ? 'Selected' : 'Select'}
                  </button>
                  
                  {attendance.status === 'pending' && (
                    <button
                      onClick={() => onActivateAttendance(attendance)}
                      disabled={activatingAttendance}
                      className="flex items-center gap-2 px-3 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-green-text)] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Activity className="w-3 h-3" />
                      {activatingAttendance ? 'Activating...' : 'Activate'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};