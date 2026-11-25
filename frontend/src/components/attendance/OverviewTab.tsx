// src/components/attendance/OverviewTab.tsx
import { User, Calendar, Stethoscope, CreditCard, Activity } from 'lucide-react';
import { PatientAvatar } from '../patients/PatientAvatar';

interface OverviewTabProps {
  attendance: any;
  patient: any;
  getClinicianName: (attendance: any) => string;
}

const formatCurrency = (amount: unknown): string => {
  const value = typeof amount === 'string' ? Number.parseFloat(amount) : Number(amount);
  return `₵${(Number.isFinite(value) ? value : 0).toFixed(2)}`;
};

export const OverviewTab: React.FC<OverviewTabProps> = ({ 
  attendance, 
  patient, 
  getClinicianName 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border border-[var(--border-color)]';
      case 'cancelled': return 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border border-[var(--border-color)]';
      case 'admitted': return 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] border border-[var(--border-color)]';
      case 'pending': return 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)] border border-[var(--border-color)]';
      case 'active': return 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] border border-[var(--border-color)]';
      default: return 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)]';
    }
  };

  const getPaymentModeLabel = (mode: string) => {
    switch (mode) {
      case 'cash': return 'Cash';
      case 'nhis': return 'NHIS';
      case 'private_insurance': return 'Private Insurance';
      default: return mode;
    }
  };

  const getAttendanceTypeLabel = (type: string) => {
    return type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'General OPD';
  };

  return (
    <div className="p-8 space-y-8">
      {/* Patient & Basic Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Patient Information */}
          {patient && (
            <div className="bg-[var(--bg-main)] rounded-2xl p-6 border border-[var(--border-color)]">
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-3">
                <PatientAvatar patient={patient} size="md" />
                Patient Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
                  <p className="text-sm text-[var(--text-secondary)] font-medium">Patient Name</p>
                  <p className="font-bold text-lg text-[var(--text-primary)]">{patient.fullName}</p>
                </div>
                <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
                  <p className="text-sm text-[var(--text-secondary)] font-medium">Folder Number</p>
                  <p className="font-bold text-lg text-[var(--text-primary)]">{patient.folderNumber || 'N/A'}</p>
                </div>
                <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
                  <p className="text-sm text-[var(--text-secondary)] font-medium">Age & Gender</p>
                  <p className="font-bold text-lg text-[var(--text-primary)]">
                    {patient.age || 'N/A'} years • {patient.gender || 'N/A'}
                  </p>
                </div>
                <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
                  <p className="text-sm text-[var(--text-secondary)] font-medium">Contact</p>
                  <p className="font-bold text-lg text-[var(--text-primary)]">{patient.contact || 'N/A'}</p>
                </div>
                {patient.address && (
                  <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] md:col-span-2">
                    <p className="text-sm text-[var(--text-secondary)] font-medium">Address</p>
                    <p className="font-bold text-lg text-[var(--text-primary)]">{patient.address}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Attendance Details */}
          <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6">Attendance Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-4 p-4 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                <Calendar className="w-8 h-8 text-[var(--icon-blue-text)]" />
                <div>
                  <p className="text-sm text-[var(--text-secondary)] font-medium">Date & Time</p>
                  <p className="font-bold text-[var(--text-primary)]">
                    {new Date(attendance.dateTime).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                <Stethoscope className="w-8 h-8 text-[var(--icon-green-text)]" />
                <div>
                  <p className="text-sm text-[var(--text-secondary)] font-medium">Attendance Type</p>
                  <p className="font-bold text-[var(--text-primary)]">
                    {getAttendanceTypeLabel(attendance.attendanceType)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                <CreditCard className="w-8 h-8 text-[var(--icon-purple-text)]" />
                <div>
                  <p className="text-sm text-[var(--text-secondary)] font-medium">Payment Mode</p>
                  <p className="font-bold text-[var(--text-primary)]">{getPaymentModeLabel(attendance.paymentMode)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                <Activity className="w-8 h-8 text-[var(--icon-orange-text)]" />
                <div>
                  <p className="text-sm text-[var(--text-secondary)] font-medium">Status</p>
                  <span className={`px-4 py-2 text-sm font-bold rounded-full ${getStatusColor(attendance.status)}`}>
                    {attendance.status?.charAt(0).toUpperCase() + attendance.status?.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6">Medical Information</h3>
            <div className="space-y-6">
              <div className="bg-[var(--icon-blue-bg)] rounded-xl p-4 border border-[var(--border-color)]">
                <p className="text-sm text-[var(--text-secondary)] font-medium mb-2">Complaints</p>
                <p className="font-semibold text-[var(--text-primary)] text-lg">
                  {attendance.complaints || 'No complaints recorded'}
                </p>
              </div>
              {attendance.diagnosis && (
                <div className="bg-[var(--icon-green-bg)] rounded-xl p-4 border border-[var(--border-color)]">
                  <p className="text-sm text-[var(--text-secondary)] font-medium mb-2">Diagnosis</p>
                  <p className="font-semibold text-[var(--text-primary)] text-lg">{attendance.diagnosis}</p>
                </div>
              )}
              {attendance.medicalNotes && (
                <div className="bg-[var(--icon-orange-bg)] rounded-xl p-4 border border-[var(--border-color)]">
                  <p className="text-sm text-[var(--text-secondary)] font-medium mb-2">Medical Notes</p>
                  <p className="font-semibold text-[var(--text-primary)]">{attendance.medicalNotes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Vitals */}
          {attendance.vitals && Object.keys(attendance.vitals).some(key => attendance.vitals[key]) && (
            <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6">Vitals</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {attendance.vitals.bloodPressure && (
                  <div className="text-center bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)]">
                    <p className="text-sm text-[var(--text-secondary)] font-medium">Blood Pressure</p>
                    <p className="font-bold text-2xl text-[var(--text-primary)]">{attendance.vitals.bloodPressure}</p>
                  </div>
                )}
                {attendance.vitals.temperature && (
                  <div className="text-center bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)]">
                    <p className="text-sm text-[var(--text-secondary)] font-medium">Temperature</p>
                    <p className="font-bold text-2xl text-[var(--text-primary)]">{attendance.vitals.temperature}°C</p>
                  </div>
                )}
                {attendance.vitals.pulse && (
                  <div className="text-center bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)]">
                    <p className="text-sm text-[var(--text-secondary)] font-medium">Pulse</p>
                    <p className="font-bold text-2xl text-[var(--text-primary)]">{attendance.vitals.pulse}</p>
                  </div>
                )}
                {attendance.vitals.spo2 && (
                  <div className="text-center bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)]">
                    <p className="text-sm text-[var(--text-secondary)] font-medium">SpO2</p>
                    <p className="font-bold text-2xl text-[var(--text-primary)]">{attendance.vitals.spo2}%</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Clinician & Quick Stats */}
        <div className="space-y-6">
          {/* Clinician Information */}
          <div className="bg-[var(--bg-main)] rounded-2xl p-6 border border-[var(--border-color)]">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Clinician</h3>
            <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
              <p className="font-semibold text-[var(--text-primary)] text-lg">
                {getClinicianName(attendance)}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-[var(--bg-main)] rounded-2xl p-6 border border-[var(--border-color)]">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
                <span className="text-[var(--text-secondary)] font-medium">Medications</span>
                <span className="font-bold text-lg text-[var(--text-primary)]">{attendance.medications?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
                <span className="text-[var(--text-secondary)] font-medium">Lab Tests</span>
                <span className="font-bold text-lg text-[var(--text-primary)]">{attendance.labTests?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
                <span className="text-[var(--text-secondary)] font-medium">Procedures</span>
                <span className="font-bold text-lg text-[var(--text-primary)]">{attendance.procedures?.length || 0}</span>
              </div>
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)]">
                  <span className="font-bold text-[var(--text-primary)]">Total Bill</span>
                  <span className="font-bold text-xl text-[var(--text-primary)]">
                    {formatCurrency(attendance.totalBill)}
                  </span>
                </div>
                {(attendance.outstandingBalance || 0) > 0 && (
                  <div className="flex justify-between items-center bg-[var(--icon-red-bg)] rounded-xl p-4 border border-[var(--border-color)] mt-3">
                    <span className="font-semibold text-[var(--icon-red-text)]">Outstanding</span>
                    <span className="font-bold text-lg text-[var(--icon-red-text)]">
                      {formatCurrency(attendance.outstandingBalance)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};