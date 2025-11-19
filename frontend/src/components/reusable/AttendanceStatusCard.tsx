import React from 'react';
import { Attendance } from '../types';
import { Activity, Clock, PlayCircle, Edit } from 'lucide-react';

interface AttendanceStatusCardProps {
  attendance: Attendance;
  canRecordVitals: boolean;
  isAttendancePending: boolean;
  onActivate: () => void;
  onEdit: () => void;
  activating: boolean;
}

export const AttendanceStatusCard: React.FC<AttendanceStatusCardProps> = ({
  attendance,
  canRecordVitals,
  isAttendancePending,
  onActivate,
  onEdit,
  activating
}) => {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return <Clock className="w-3 h-3" />;
      case 'active': return <Activity className="w-3 h-3" />;
      case 'completed': return <Activity className="w-3 h-3" />;
      case 'cancelled': return <Clock className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Attendance Status</h3>
          <p className="text-sm text-gray-600">
            Current status: 
            <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(attendance.status)} flex items-center gap-1 w-fit mt-1`}>
              {getStatusIcon(attendance.status)}
              {attendance.status?.charAt(0).toUpperCase() + attendance.status?.slice(1)}
            </span>
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {isAttendancePending && (
            <button
              onClick={onActivate}
              disabled={activating}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 text-sm"
            >
              <PlayCircle className="w-3 h-3" />
              {activating ? 'Activating...' : 'Activate'}
            </button>
          )}
          
          <button
            onClick={onEdit}
            className="p-1.5 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors duration-200"
            title="Edit Attendance"
          >
            <Edit className="w-3 h-3" />
          </button>
          
          <div
            className={`px-2 py-1 text-xs font-semibold rounded-full border ${
              canRecordVitals
                ? 'bg-green-100 text-green-800 border-green-200'
                : 'bg-yellow-100 text-yellow-800 border-yellow-200'
            }`}
          >
            {canRecordVitals ? (
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Ready
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {isAttendancePending ? 'Not Active' : 'Completed'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};