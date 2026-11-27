import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../api/api';
import { getPatientName, getPatientFolderNumber } from '../utils/patient';
import NewAttendanceModal from '../components/NewAttendanceModal';
import ImmunizationPanel from '../components/patients/ImmunizationPanel';
import ImmunizationSectionTabs from '../components/immunization/ImmunizationSectionTabs';
import { useAuthStore } from '../store/authStore';
import { Syringe, RefreshCw } from 'lucide-react';
import { Button, Card, PageHeader } from '../components/ui';

type Patient = { id: string; surname?: string; otherNames?: string; folderNumber?: string; dateOfBirth?: string; gender?: string };
type Visit = { id: string; attendanceNumber?: string; attendanceType?: string; dateTime?: string; status?: string };

export default function ImmunizationEntries() {
  const { patientId = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedAttendanceId = searchParams.get('attendanceId') || '';
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
  const name = getPatientName(patient);

  if (loading) return <main className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-8 text-center text-sm text-[var(--text-secondary)]">Loading patient immunization entries…</main>;
  if (error || !patient) return <main className="space-y-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
    <ImmunizationSectionTabs />
    <h1 className="text-xl font-semibold text-[var(--text-primary)]">Immunization Entries</h1>
    <p className="text-sm text-[var(--icon-red-text)]">{error || 'Patient not found.'}</p>
    <button onClick={() => navigate('/dashboard/immunization')} className="rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm">Back to waiting list</button>
  </main>;

  return <main className="space-y-6 p-6">
    <PageHeader
      title="Immunization Entries"
      subtitle="Record vaccinations, review immunization history and follow up upcoming doses"
      icon={Syringe}
      accent="cyan"
      backTo="/dashboard/immunization"
      actions={<Button icon={RefreshCw} loading={loading} onClick={() => void loadPatientWorkspace()}>Refresh</Button>}
    />
    <ImmunizationSectionTabs />
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] pb-4 mb-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{name}</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Folder {getPatientFolderNumber(patient) || '—'}
            {patient.dateOfBirth ? ' · DOB ' + new Date(patient.dateOfBirth).toLocaleDateString() : ''}
            {patient.gender ? ' · ' + patient.gender : ''}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/dashboard/immunization')}>Back to waiting list</Button>
      </div>
      <ImmunizationPanel
        patientId={patientId}
        attendances={attendances}
        initialAttendanceId={selectedAttendanceId}
        canRecord={hasRole(['admin','super_admin','doctor','nurse','midwife'])}
        canManageCatalogue={hasRole(['admin','super_admin'])}
        onCreateAttendance={() => setShowAttendanceModal(true)}
      />
    </Card>
    {showAttendanceModal && <NewAttendanceModal patientId={patientId} initialAttendanceType="immunization" onClose={() => setShowAttendanceModal(false)} onSuccess={() => { setShowAttendanceModal(false); void loadPatientWorkspace(); }} />}
  </main>;
}
