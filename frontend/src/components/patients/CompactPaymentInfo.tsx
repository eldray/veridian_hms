// src/components/patients/CompactPaymentInfo.tsx
import { Link } from 'react-router-dom';
import { CreditCard, Shield, DollarSign, Plus } from 'lucide-react';

interface CompactPaymentInfoProps {
  patient: any;
  insuranceProviders: any[];
  patientId: string;
}

export const CompactPaymentInfo: React.FC<CompactPaymentInfoProps> = ({ patient, insuranceProviders, patientId }) => {
  const paymentModes = [
    {
      id: 'cash',
      label: 'Cash',
      description: 'Patient pays directly for services',
      Icon: DollarSign,
      accent: 'blue',
    },
    {
      id: 'nhis',
      label: 'NHIS',
      description: 'National Health Insurance Scheme',
      Icon: Shield,
      accent: 'green',
    },
    {
      id: 'private_insurance',
      label: 'Private Insurance',
      description: 'Private insurance coverage',
      Icon: CreditCard,
      accent: 'purple',
    },
  ] as const;

  const formatDate = (value?: string) => {
    if (!value) return 'Not provided';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Not provided'
      : date.toLocaleDateString('en-GH', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-3">
      <section className="flex items-center gap-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]">
          <CreditCard className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Current Payment Mode</p>
          <p className="text-base font-bold capitalize text-[var(--text-primary)]">{patient.paymentMode || 'Not set'}</p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        {paymentModes.map(({ id, label, description, Icon, accent }) => {
          const isCurrent = patient.paymentMode === id;
          const accentText = `var(--icon-${accent}-text)`;
          const accentBg = `var(--icon-${accent}-bg)`;

          return (
            <section
              key={id}
              aria-current={isCurrent ? 'true' : undefined}
              className={`rounded-lg border p-3 transition-colors ${isCurrent ? 'border-[var(--icon-blue-text)]' : 'border-[var(--border-color)]'} bg-[var(--bg-card)]`}
            >
              <div className="mb-2 flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-md"
                  style={{ backgroundColor: accentBg, color: accentText }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">{label}</h3>
                  {isCurrent && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--icon-blue-text)]">Current mode</span>
                  )}
                </div>
              </div>
              <p className="mb-3 text-xs text-[var(--text-secondary)]">{description}</p>
              {isCurrent && patientId && (
                <Link
                  to={`/dashboard/attendance/new?patientId=${patientId}&paymentMode=${id}`}
                  className="inline-flex w-full items-center justify-center gap-1 rounded-md px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--icon-blue-text)]"
                  style={{ backgroundColor: accentText }}
                >
                  <Plus className="h-3 w-3" />
                  Create Attendance
                </Link>
              )}
            </section>
          );
        })}
      </div>

      {(patient.paymentMode === 'nhis' || patient.paymentMode === 'private_insurance') && patient.insuranceDetails && (
        <section className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
          <h4 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Insurance Details</h4>
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-xs text-[var(--text-secondary)]">Insurance Number</dt>
              <dd className="break-words font-medium text-[var(--text-primary)]">{patient.insuranceDetails.insuranceNumber || 'Not provided'}</dd>
            </div>
            {patient.paymentMode === 'private_insurance' && (
              <div className="flex min-w-0 flex-col gap-0.5">
                <dt className="text-xs text-[var(--text-secondary)]">Provider</dt>
                <dd className="break-words font-medium text-[var(--text-primary)]">
                  {insuranceProviders.find(p => p.id === patient.insuranceDetails?.insuranceProvider)?.name || 'Not provided'}
                </dd>
              </div>
            )}
            <div className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-xs text-[var(--text-secondary)]">Start Date</dt>
              <dd className="font-medium text-[var(--text-primary)]">{formatDate(patient.insuranceDetails.startDate)}</dd>
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-xs text-[var(--text-secondary)]">End Date</dt>
              <dd className="font-medium text-[var(--text-primary)]">{formatDate(patient.insuranceDetails.endDate)}</dd>
            </div>
          </dl>
        </section>
      )}
    </div>
  );
};
