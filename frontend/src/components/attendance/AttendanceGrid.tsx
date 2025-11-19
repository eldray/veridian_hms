// src/components/attendance/AttendanceGrid.tsx
import { AttendanceCard } from './AttendanceCard';
import { Hospital,CreditCard, Shield  } from 'lucide-react';

interface AttendanceGridProps {
  attendances: any[];
  findPatient: (attendance: any) => any;
  onEditAttendance: (attendance: any) => void;
}

export const AttendanceGrid: React.FC<AttendanceGridProps> = ({
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

  const getPaymentModeIcon = (mode: string) => {
    switch (mode) {
      case 'nhis': return <Shield className="w-3.5 h-3.5 text-green-600" />;
      case 'private_insurance': return <Hospital className="w-3.5 h-3.5 text-blue-600" />;
      default: return <CreditCard className="w-3.5 h-3.5 text-gray-600" />;
    }
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
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {attendances.map((attendance) => {
        const patient = findPatient(attendance);
        const attendanceId = attendance._id || attendance.id;
        const totalBill = attendance.totalBill || 0;
        
        return (
          <AttendanceCard
            key={attendanceId}
            attendance={attendance}
            patient={patient}
            attendanceId={attendanceId}
            totalBill={totalBill}
            statusColor={getStatusColor(attendance.status)}
            attendanceTypeLabel={getAttendanceTypeLabel(attendance.attendanceType)}
            paymentModeLabel={getPaymentModeLabel(attendance.paymentMode)}
            paymentModeIcon={getPaymentModeIcon(attendance.paymentMode)}
            formattedDate={formatDate(attendance.dateTime || attendance.createdAt)}
            onEditAttendance={onEditAttendance}
          />
        );
      })}
    </div>
  );
};