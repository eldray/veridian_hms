// src/components/patients/MedicalRecordsTab.tsx
import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';

interface MedicalRecordsTabProps {
  attendances: any[];
  patient: any;
}

export const MedicalRecordsTab: React.FC<MedicalRecordsTabProps> = ({ attendances, patient }) => {
  const allMedications = attendances.flatMap(att => att.medications || []);
  const allLabTests = attendances.flatMap(att => att.labTests || []);
  const allDiagnoses = attendances.flatMap(att =>
    att.diagnoses?.map((d: any) => ({
      ...d,
      attendanceDate: att.dateTime,
      attendanceType: att.attendanceType
    })) || []
  );

  if (attendances.length === 0) {
    return (
      <div className="py-8 text-center" role="status">
        <ClipboardList className="mx-auto mb-3 h-12 w-12 text-[var(--text-tertiary)]" aria-hidden="true" />
        <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">No Medical Records</h3>
        <p className="text-sm text-[var(--text-secondary)]">Medical records will appear after patient visits</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Visits', value: attendances.length },
          { label: 'Meds', value: allMedications.length },
          { label: 'Tests', value: allLabTests.length }
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">{item.value}</p>
            <p className="text-xs font-medium text-[var(--text-secondary)]">{item.label}</p>
          </div>
        ))}
      </div>

      {allDiagnoses.length > 0 && (
        <section className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3" aria-labelledby="recent-diagnoses-heading">
          <h4 id="recent-diagnoses-heading" className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Recent Diagnoses</h4>
          <div className="space-y-2">
            {allDiagnoses.slice(0, 3).map((diagnosis, index) => (
              <div key={index} className="flex items-center justify-between gap-3 rounded-md border border-[var(--border-color)] bg-[var(--bg-main)] p-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--text-primary)]">{diagnosis.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {new Date(diagnosis.attendanceDate).toLocaleDateString('en-GH')}
                  </p>
                </div>
                <Link
                  to={`/dashboard/attendance/${diagnosis.attendanceId}`}
                  className="shrink-0 rounded text-xs font-medium text-[var(--primary-color)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)]"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {allMedications.length > 0 && (
        <section className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3" aria-labelledby="recent-medications-heading">
          <h4 id="recent-medications-heading" className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Recent Medications</h4>
          <div className="space-y-2">
            {allMedications.slice(0, 3).map((med, index) => (
              <div key={index} className="flex items-center justify-between gap-3 rounded-md border border-[var(--border-color)] bg-[var(--bg-main)] p-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--text-primary)]">{med.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{med.dosage} • {med.frequency}</p>
                </div>
                <span className="shrink-0 rounded border border-[var(--border-color)] bg-[var(--bg-card)] px-1.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
                  {med.status?.charAt(0).toUpperCase() + med.status?.slice(1) || 'Prescribed'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};