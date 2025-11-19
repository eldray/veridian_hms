// src/components/attendance/AttendanceList.tsx
import { Link } from 'react-router-dom';
import { User, Eye, Edit } from 'lucide-react';

interface AttendanceListProps {
  attendances: any[];
  findPatient: (attendance: any) => any;
  onEditAttendance: (attendance: any) => void;
}

export const AttendanceList: React.FC<AttendanceListProps> = ({
  attendances,
  findPatient,
  onEditAttendance
}) => {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800 border border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border border-red-200';
      case 'admitted': return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'active': return 'bg-blue-100 text-blue-800 border border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getAttendanceTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'general_opd': 'General OPD',
      'specialist_consultation': 'Specialist',
      'antenatal_care': 'Antenatal',
      'diagnostic_opd': 'Diagnostic',
      'emergency': 'Emergency',
      'other_opd': 'Other OPD',
      'inpatient': 'Inpatient'
    };
    return typeMap[type] || type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'General OPD';
  };

  const getPaymentModeLabel = (mode: string) => {
    const modeMap: Record<string, string> = {
      'cash': 'Cash',
      'nhis': 'NHIS',
      'private_insurance': 'Private Insurance'
    };
    return modeMap[mode] || mode?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Cash';
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Patient</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Date & Type</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Payment</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {attendances.map((attendance) => {
            const patient = findPatient(attendance);
            const attendanceId = attendance._id || attendance.id;
            const totalBill = attendance.totalBill || 0;
            
            return (
              <tr key={attendanceId} className="hover:bg-gray-50 transition-colors duration-150">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-teal-500 rounded-md flex items-center justify-center shadow-sm">
                      <User className="w-3 h-3 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-xs">
                        {patient?.fullName || `Patient ${attendance.patientId?.toString().slice(-6) || 'Unknown'}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {patient?.folderNumber || 'No Folder'}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="text-xs">
                    <p className="font-medium text-gray-900">
                      {formatDate(attendance.dateTime || attendance.createdAt)}
                    </p>
                    <p className="text-gray-600">{getAttendanceTypeLabel(attendance.attendanceType)}</p>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-medium">{getPaymentModeLabel(attendance.paymentMode)}</span>
                    {totalBill > 0 && (
                      <span className="text-green-600 font-bold">${totalBill.toFixed(2)}</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(attendance.status)}`}
                  >
                    {(attendance.status || 'active').charAt(0).toUpperCase() + (attendance.status || 'active').slice(1)}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <Link
                      to={`/dashboard/attendance/${attendanceId}`}
                      className="p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
                      title="View Details"
                    >
                      <Eye className="w-3 h-3" />
                    </Link>
                    <button
                      onClick={() => onEditAttendance(attendance)}
                      className="p-1.5 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors duration-200"
                      title="Edit Attendance"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};