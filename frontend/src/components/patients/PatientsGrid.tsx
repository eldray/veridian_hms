// src/components/patients/PatientsGrid.tsx
import { PatientCard } from './PatientCard';

interface PatientsGridProps {
  patients: any[];
  onAddAttendance: (patientId: string) => void;
}

export const PatientsGrid: React.FC<PatientsGridProps> = ({ patients, onAddAttendance }) => {
  const getPaymentModeColor = (paymentMode: string) => {
    switch (paymentMode) {
      case 'cash':
        return 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)]';
      case 'nhis':
        return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border border-[var(--border-color)]';
      case 'private_insurance':
        return 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] border border-[var(--border-color)]';
      default:
        return 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)]';
    }
  };

  const getPaymentModeLabel = (paymentMode: string) => {
    switch (paymentMode) {
      case 'cash':
        return 'CASH';
      case 'nhis':
        return 'NHIS';
      case 'private_insurance':
        return 'PRIVATE';
      default:
        return paymentMode?.toUpperCase() || 'UNKNOWN';
    }
  };

  const getPatientId = (patient: any) => patient.id || patient._id;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {patients.map((patient) => {
        const patientId = getPatientId(patient);
        return (
          <PatientCard
            key={patientId}
            patient={patient}
            patientId={patientId}
            paymentModeColor={getPaymentModeColor(patient.paymentMode)}
            paymentModeLabel={getPaymentModeLabel(patient.paymentMode)}
            onAddAttendance={onAddAttendance}
          />
        );
      })}
    </div>
  );
};