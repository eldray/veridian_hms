import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import NewAttendanceModal from '../components/NewAttendanceModal';
import ImmunizationPanel from '../components/patients/ImmunizationPanel';
import { useAuthStore } from '../store/authStore';

type Patient = { id: string; surname?: string; otherNames?: string; folderNumber?: string };
type Visit = { id: string; attendanceNumber?: string; attendanceType?: string; dateTime?: string; Patient?: Patient };

export default function ImmunizationEntries() {
  const { patientId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { hasRole } = useAuthStore();
  const visit = (location.state as { visit?: Visit; attendances?: Visit[] } | null)?.visit;
  const [attendances, setAttendances] = useState<Visit[]>((location.state as { attendances?: Visit[] } | null)?.attendances ?? []);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const patient = visit?.Patient;
  const name = [patient?.otherNames, patient?.surname].filter(Boolean).join(' ') || 'Patient';

  if (!visit || visit.Patient?.id !== patientId) {
    return <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 space-y-3">
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">Immunization entries</h1>
      <p className="text-sm text-[var(--text-secondary)]">Patient visit context is no longer available. Please reopen the patient from the waiting list.</p>
      <button onClick={() => navigate('/dashboard/immunization')} className="rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm">Back to waiting list</button>
    </div>;
  }

  return <main className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-[var(--text-primary)]">Immunization entries</h1><p className="text-sm text-[var(--text-secondary)]">{name} · Folder {patient.folderNumber || '—'} · Attendance {visit.attendanceNumber || '—'}</p></div>
      <button onClick={() => navigate('/dashboard/immunization')} className="rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm">Back to waiting list</button>
    </header>
    <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
      <ImmunizationPanel patientId={patientId} attendances={attendances.filter(a => a.attendanceType === 'immunization')} canRecord={hasRole(['admin','super_admin','doctor','nurse','midwife'])} canManageCatalogue={hasRole(['admin','super_admin'])} onCreateAttendance={() => setShowAttendanceModal(true)} />
    </section>
    {showAttendanceModal && <NewAttendanceModal patientId={patientId} initialAttendanceType="immunization" onClose={() => setShowAttendanceModal(false)} onSuccess={() => { setShowAttendanceModal(false); navigate('/dashboard/immunization', { replace: true }); }} />}
  </main>;
}
