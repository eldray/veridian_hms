import {
  Calendar,
  FileText,
  Heart,
  Mail,
  Phone,
  ShieldAlert,
  Users,
} from 'lucide-react';

interface CompactAdditionalInfoProps {
  patient: any;
}

const InfoCard: React.FC<{
  title: string;
  icon: React.ElementType;
  tone: 'cyan' | 'purple' | 'red' | 'green' | 'yellow';
  children: React.ReactNode;
}> = ({ title, icon: Icon, tone, children }) => {
  const styles = {
    cyan: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]',
    purple: 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]',
    red: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]',
    green: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
    yellow: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]',
  };

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
      <header className="flex items-center gap-2.5 border-b border-[var(--border-color)] bg-[var(--bg-main)] px-4 py-3">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${styles[tone]}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h3 className="text-xs font-semibold text-[var(--text-primary)]">{title}</h3>
      </header>
      <div className="space-y-3 p-4">{children}</div>
    </section>
  );
};

const Detail: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">{label}</p>
    <p className="mt-0.5 break-words text-xs font-medium text-[var(--text-primary)]">{value || 'Not provided'}</p>
  </div>
);

const HistoryItem: React.FC<{
  title: string;
  subtitle?: string;
  note?: string;
}> = ({ title, subtitle, note }) => (
  <li className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2.5">
    <p className="text-xs font-semibold text-[var(--text-primary)]">{title}</p>
    {subtitle && <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{subtitle}</p>}
    {note && <p className="mt-1.5 whitespace-pre-wrap text-[11px] text-[var(--text-tertiary)]">{note}</p>}
  </li>
);

const EmptyList: React.FC<{ text: string }> = ({ text }) => (
  <p className="rounded-lg border border-dashed border-[var(--border-color)] px-3 py-3 text-center text-[11px] text-[var(--text-tertiary)]">
    {text}
  </p>
);

const formatDate = (value?: string | Date | null) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? undefined
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export const CompactAdditionalInfo: React.FC<CompactAdditionalInfoProps> = ({ patient }) => {
  const additionalInfo = patient.additionalInfo || {};
  const allergies = patient.allergies || [];
  const medicalHistories = patient.medicalHistories || [];
  const surgicalHistories = patient.surgicalHistories || [];
  const familyHistories = patient.familyHistories || [];
  const emergencyContact = additionalInfo.emergencyContact;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <InfoCard title="Contact & identification" icon={Mail} tone="cyan">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Detail label="Email" value={additionalInfo.email} />
            <Detail label="House number" value={additionalInfo.houseNumber} />
            <Detail label="ID type" value={additionalInfo.idType} />
            <Detail label="ID number" value={additionalInfo.idNumber} />
          </div>
        </InfoCard>

        <InfoCard title="Medical information" icon={Heart} tone="red">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Detail label="Blood type" value={additionalInfo.bloodType} />
            <Detail label="Occupation" value={additionalInfo.occupation} />
          </div>
        </InfoCard>

        <InfoCard title="Allergies" icon={ShieldAlert} tone="yellow">
          {allergies.length ? (
            <ul className="space-y-2">
              {allergies.map((allergy: any, index: number) => (
                <HistoryItem
                  key={allergy.id || `${allergy.allergen}-${index}`}
                  title={allergy.allergen}
                  subtitle={[
                    allergy.reaction && `Reaction: ${allergy.reaction}`,
                    allergy.severity && `Severity: ${allergy.severity}`,
                  ].filter(Boolean).join(' · ') || undefined}
                  note={allergy.notes}
                />
              ))}
            </ul>
          ) : <EmptyList text="No allergies recorded" />}
        </InfoCard>

        <InfoCard title="Medical conditions" icon={FileText} tone="purple">
          {medicalHistories.length ? (
            <ul className="space-y-2">
              {medicalHistories.map((history: any, index: number) => (
                <HistoryItem
                  key={history.id || `${history.condition}-${index}`}
                  title={history.condition}
                  subtitle={history.diagnosedAt ? `Diagnosed ${formatDate(history.diagnosedAt)}` : undefined}
                  note={history.notes}
                />
              ))}
            </ul>
          ) : <EmptyList text="No medical conditions recorded" />}
        </InfoCard>

        <InfoCard title="Surgical history" icon={Calendar} tone="purple">
          {surgicalHistories.length ? (
            <ul className="space-y-2">
              {surgicalHistories.map((history: any, index: number) => (
                <HistoryItem
                  key={history.id || `${history.procedure}-${index}`}
                  title={history.procedure}
                  subtitle={history.surgeryDate ? `Date: ${formatDate(history.surgeryDate)}` : undefined}
                  note={history.notes}
                />
              ))}
            </ul>
          ) : <EmptyList text="No surgical history recorded" />}
        </InfoCard>

        <InfoCard title="Family history" icon={Users} tone="green">
          {familyHistories.length ? (
            <ul className="space-y-2">
              {familyHistories.map((history: any, index: number) => (
                <HistoryItem
                  key={history.id || `${history.relation}-${history.condition}-${index}`}
                  title={history.condition}
                  subtitle={history.relation ? `Relative: ${history.relation}` : undefined}
                  note={history.notes}
                />
              ))}
            </ul>
          ) : <EmptyList text="No family history recorded" />}
        </InfoCard>

        <InfoCard title="Emergency contact" icon={Phone} tone="green">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Detail label="Next of kin" value={additionalInfo.nextOfKin} />
            <Detail label="Contact name" value={emergencyContact?.name} />
            <Detail label="Relationship" value={emergencyContact?.relationship} />
            <Detail label="Phone" value={emergencyContact?.phone} />
          </div>
        </InfoCard>
      </div>
    </div>
  );
};
