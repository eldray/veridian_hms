// src/components/attendance/AttendanceGrid.tsx
import { AttendanceCard } from './AttendanceComponents';
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
      case 'completed': return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border border-[var(--icon-green-text)]';
      case 'cancelled': return 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border border-[var(--icon-red-text)]';
      case 'admitted': return 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] border border-[var(--icon-purple-text)]';
      case 'pending': return 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] border border-[var(--icon-yellow-text)]';
      case 'active': return 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] border border-[var(--icon-blue-text)]';
      default: return 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)]';
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
      case 'nhis': return <Shield className="w-3.5 h-3.5 text-[var(--icon-green-text)]" />;
      case 'private_insurance': return <Hospital className="w-3.5 h-3.5 text-[var(--icon-blue-text)]" />;
      default: return <CreditCard className="w-3.5 h-3.5 text-[var(--text-secondary)]" />;
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