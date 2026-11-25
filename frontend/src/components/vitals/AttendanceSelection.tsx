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
    case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'active': return 'bg-green-100 text-green-800 border-green-200';
    case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
    case 'admitted': return 'bg-purple-100 text-purple-800 border-purple-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Patient Visits
        </h2>
        
        <button
          onClick={() => navigate(`/dashboard/attendance/new?patientId=${selectedPatientId}`)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Visit
        </button>
      </div>

      {patientAttendances.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Visits Found</h3>
          <p className="text-gray-600 mb-4">This patient doesn't have any recorded visits yet.</p>
          <button
            onClick={() => navigate(`/dashboard/attendance/new?patientId=${selectedPatientId}`)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Create First Visit
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select Visit to Record Vitals
          </label>
          
          {patientAttendances.map((attendance) => (
            <div 
              key={getEntityId(attendance)} 
              className={`border-2 rounded-xl p-4 transition-all duration-200 ${
                selectedAttendanceId === getEntityId(attendance)
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <p className="font-semibold text-gray-900 text-lg">
                      {attendance.attendanceNumber || `Visit ${new Date(attendance.dateTime || attendance.createdAt || '').toLocaleDateString()}`}
                    </p>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(attendance.status || '')}`}>
                      {attendance.status?.charAt(0).toUpperCase() + attendance.status?.slice(1) || 'Unknown'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
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
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {selectedAttendanceId === getEntityId(attendance) ? 'Selected' : 'Select'}
                  </button>
                  
                  {attendance.status === 'pending' && (
                    <button
                      onClick={() => onActivateAttendance(attendance)}
                      disabled={activatingAttendance}
                      className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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