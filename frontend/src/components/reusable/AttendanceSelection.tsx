import React from 'react';
import { Attendance, Patient } from '../types';
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
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const selectedAttendance = patientAttendances.find((a) => getEntityId(a) === selectedAttendanceId);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
          <Calendar className="w-4 h-4 text-green-600" />
          Select Attendance
        </h2>
        <button
          onClick={onNewAttendance}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm"
        >
          New Attendance
        </button>
      </div>
      
      {patientAttendances.length === 0 ? (
        <div className="text-center py-3 text-gray-500">
          <p className="text-sm mb-2">No attendances found</p>
          <button
            onClick={onNewAttendance}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white text-sm"
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
              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-3 border-2 border-blue-500 bg-blue-50 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-gray-900 text-sm">
            {attendance.attendanceNumber}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {new Date(attendance.dateTime).toLocaleDateString()}
          </div>
          <div className="text-xs text-gray-600 capitalize">
            {attendance.attendanceType?.replace('_', ' ')}
          </div>
          <div className="text-xs text-gray-600">
            Payment: <span className="font-semibold capitalize">{attendance.paymentMode}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {attendance.totalBill && attendance.totalBill > 0 && (
            <div className="text-right">
              <div className="text-xs font-semibold text-gray-900">
                ${attendance.totalBill.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500">
                Bill
              </div>
            </div>
          )}
          
          <div className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(attendance.status)}`}>
            {attendance.status}
          </div>

          <button
            onClick={() => onEdit(attendance)}
            className="p-1.5 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors duration-200"
            title="Edit Attendance"
          >
            <Edit className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};