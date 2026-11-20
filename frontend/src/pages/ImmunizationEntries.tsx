import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/api';
import NewAttendanceModal from '../components/NewAttendanceModal';
import ImmunizationPanel from '../components/patients/ImmunizationPanel';
import { useAuthStore } from '../store/authStore';
import { ArrowLeft, RefreshCw } from 'lucide-react';

type Patient = { id: string; surname?: string; otherNames?: string; folderNumber?: string; dateOfBirth?: string; gender?: string };
type Visit = { id: string; attendanceNumber?: string; attendanceType?: string; dateTime?: string; status?: string };

export default function ImmunizationEntries() {
  const { patientId = '' } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuthStore();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [attendances, setAttendances] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  const loadPatientWorkspace = async () => {
    if (!patientId) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/immunization/patients/' + patientId + '/context');
      setPatient(response.data?.data?.patient ?? null);
      setAttendances(response.data?.data?.attendances ?? []);
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || 'Unable to load this patient’s immunization workspace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadPatientWorkspace(); }, [patientId]);
  const name = [patient?.otherNames, patient?.surname].filter(Boolean).join(' ') || 'Patient';

  if (loading) return <main className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-8 text-center text-sm text-[var(--text-secondary)]">Loading patient immunization entries…</main>;
  if (error || !patient) return <main className="space-y-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
    <h1 className="text-xl font-semibold text-[var(--text-primary)]">Immunization Entries</h1>
    <p className="text-sm text-red-600">{error || 'Patient not found.'}</p>
    <button onClick={() => navigate('/dashboard/immunization')} className="rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm">Back to waiting list</button>
  </main>;

  return <main className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Immunization Entries</h1>
        <p className="text-sm text-[var(--text-secondary)]">{name} · Folder {patient.folderNumber || '—'}{patient.dateOfBirth ? ' · DOB ' + new Date(patient.dateOfBirth).toLocaleDateString() : ''}{patient.gender ? ' · ' + patient.gender : ''}</p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => void loadPatientWorkspace()} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm"><RefreshCw className="h-4 w-4" /> Refresh</button>
        <button onClick={() => navigate('/dashboard/immunization')} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm"><ArrowLeft className="h-4 w-4" /> Waiting list</button>
      </div>
    </header>
    <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
      <ImmunizationPanel patientId={patientId} attendances={attendances} canRecord={hasRole(['admin','super_admin','doctor','nurse','midwife'])} canManageCatalogue={hasRole(['admin','super_admin'])} onCreateAttendance={() => setShowAttendanceModal(true)} />
    </section>
    {showAttendanceModal && <NewAttendanceModal patientId={patientId} initialAttendanceType="immunization" onClose={() => setShowAttendanceModal(false)} onSuccess={() => { setShowAttendanceModal(false); void loadPatientWorkspace(); }} />}
  </main>;
}
