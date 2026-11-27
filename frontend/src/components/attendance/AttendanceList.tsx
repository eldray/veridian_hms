// src/components/attendance/AttendanceList.tsx
import { Link } from 'react-router-dom';
import { PatientAvatar } from '../patients/PatientAvatar';
import { getPatientName, getPatientFolderNumber, getAttendanceNumber } from '../../utils/patient';
import { Eye, Edit } from 'lucide-react';
import { Badge, Button, humanStatus, statusTone, TABLE_SHELL, TD, TD_MONO, TH, TH_ROW, TR } from '../ui';

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
  const getAttendanceTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      general_opd: 'General OPD',
      specialist_consultation: 'Specialist',
      antenatal_care: 'Antenatal',
      diagnostic_opd: 'Diagnostic',
      emergency: 'Emergency',
      other_opd: 'Other OPD',
      inpatient: 'Inpatient'
    };
    return typeMap[type] || type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'General OPD';
  };

  const getPaymentModeLabel = (mode: string) => {
    const modeMap: Record<string, string> = {
      cash: 'Cash',
      nhis: 'NHIS',
      private_insurance: 'Private Insurance'
    };
    return modeMap[mode] || mode?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Cash';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-GH', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={TABLE_SHELL}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-sm">
          <thead className={TH_ROW}>
            <tr>
              <th className={TH}>Patient</th>
              <th className={TH}>Folder #</th>
              <th className={TH}>Attendance #</th>
              <th className={TH}>Date &amp; Type</th>
              <th className={TH}>Payment</th>
              <th className={TH}>Status</th>
              <th className={TH + ' text-right'}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {attendances.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
                  No attendance records to display.
                </td>
              </tr>
            ) : attendances.map((attendance) => {
              const patient = findPatient(attendance);
              const identitySource = patient || attendance;
              const attendanceId = attendance._id || attendance.id;
              const totalBill = attendance.totalBill || 0;

              return (
                <tr key={attendanceId} className={TR}>
                  <td className={TD}>
                    <div className="flex min-w-0 items-center gap-3">
                      <PatientAvatar patient={identitySource} size="sm" />
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--text-primary)] truncate">
                          {getPatientName(identitySource)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={TD_MONO}>{getPatientFolderNumber(attendance) || getPatientFolderNumber(identitySource) || '—'}</td>
                  <td className={TD_MONO}>{getAttendanceNumber(attendance) || '—'}</td>
                  <td className={TD}>
                    <div className="space-y-0.5">
                      <p className="font-medium text-[var(--text-primary)]">
                        {formatDate(attendance.dateTime || attendance.createdAt)}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {getAttendanceTypeLabel(attendance.attendanceType)}
                      </p>
                    </div>
                  </td>
                  <td className={TD}>
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-medium">{getPaymentModeLabel(attendance.paymentMode)}</span>
                      {Number(totalBill) > 0 && Number.isFinite(Number(totalBill)) && (
                        <span className="text-xs text-[var(--text-secondary)] font-semibold tabular-nums">
                          ₵{Number(totalBill).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={TD}>
                    <Badge tone={statusTone(attendance.status)} dot>
                      {humanStatus(attendance.status || 'active')}
                    </Badge>
                  </td>
                  <td className={TD + ' text-right'}>
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        to={`/dashboard/attendance/${attendanceId}`}
                        aria-label="View attendance details"
                        title="View details"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-cyan-text)]"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Edit}
                        iconOnly
                        aria-label="Edit attendance"
                        title="Edit attendance"
                        onClick={() => onEditAttendance(attendance)}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
