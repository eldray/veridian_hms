// src/components/patients/CompactPaymentInfo.tsx
import { Link } from 'react-router-dom';
import { CreditCard, Shield, DollarSign, Plus } from 'lucide-react';

interface CompactPaymentInfoProps {
  patient: any;
  insuranceProviders: any[];
  patientId: string;
}

export const CompactPaymentInfo: React.FC<CompactPaymentInfoProps> = ({ patient, insuranceProviders, patientId }) => {
  const getPaymentModeClasses = (paymentMode: string, active: boolean) => {
    const base = 'border rounded-lg p-3 transition-all duration-200';
    switch (paymentMode) {
      case 'cash':
        return `${base} border-[var(--border-color)] ${active ? 'bg-[var(--bg-main)] ring-2 ring-[var(--text-tertiary)]' : 'bg-[var(--bg-card)]'}`;
      case 'nhis':
        return `${base} border-[var(--icon-green-text)]/40 ${active ? 'bg-[var(--icon-green-bg)] ring-2 ring-[var(--icon-green-text)]' : 'bg-[var(--bg-card)]'}`;
      case 'private_insurance':
        return `${base} border-[var(--icon-purple-text)]/40 ${active ? 'bg-[var(--icon-purple-bg)] ring-2 ring-[var(--icon-purple-text)]' : 'bg-[var(--bg-card)]'}`;
      default:
        return `${base} border-[var(--border-color)] bg-[var(--bg-card)]`;
    }
  };

  return (
    <div className="space-y-3 text-[var(--text-primary)]">
      {/* Current Payment Mode */}
      <div className="bg-[var(--icon-green-bg)] border border-[var(--icon-green-text)]/30 rounded-lg p-3">
        <div className="flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-[var(--icon-green-text)]" />
          <div>
            <p className="text-xs font-semibold text-[var(--icon-green-text)] uppercase tracking-wide">Current Payment Mode</p>
            <p className="text-lg font-bold text-[var(--text-primary)] capitalize">{patient.paymentMode || 'Not set'}</p>
          </div>
        </div>
      </div>

      {/* Compact Payment Mode Cards */}
      <div className="grid grid-cols-1 gap-3">
        {/* Cash Card */}
        <div className={getPaymentModeClasses('cash', patient.paymentMode === 'cash')}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded ${patient.paymentMode === 'cash' ? 'bg-[var(--icon-cyan-text)] text-white' : 'bg-[var(--bg-main)] text-[var(--text-secondary)]'}`}>
              <DollarSign className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-[var(--text-primary)] text-sm">Cash</h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mb-3">Patient pays directly for services</p>
          {patient.paymentMode === 'cash' && patientId && (
            <Link
              to={`/dashboard/attendance/new?patientId=${patientId}&paymentMode=cash`}
              className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-[var(--icon-cyan-text)] text-white rounded text-xs font-medium hover:opacity-90 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Create Attendance
            </Link>
          )}
        </div>

        {/* NHIS Card */}
        <div className={getPaymentModeClasses('nhis', patient.paymentMode === 'nhis')}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded ${patient.paymentMode === 'nhis' ? 'bg-[var(--icon-green-text)] text-white' : 'bg-[var(--bg-main)] text-[var(--text-secondary)]'}`}>
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-[var(--text-primary)] text-sm">NHIS</h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mb-3">National Health Insurance Scheme</p>
          {patient.paymentMode === 'nhis' && patientId && (
            <Link
              to={`/dashboard/attendance/new?patientId=${patientId}&paymentMode=nhis`}
              className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-[var(--icon-green-text)] text-white rounded text-xs font-medium hover:opacity-90 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Create Attendance
            </Link>
          )}
        </div>

        {/* Private Insurance Card */}
        <div className={getPaymentModeClasses('private_insurance', patient.paymentMode === 'private_insurance')}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded ${patient.paymentMode === 'private_insurance' ? 'bg-[var(--icon-purple-text)] text-white' : 'bg-[var(--bg-main)] text-[var(--text-secondary)]'}`}>
              <CreditCard className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-[var(--text-primary)] text-sm">Private Insurance</h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mb-3">Private insurance coverage</p>
          {patient.paymentMode === 'private_insurance' && patientId && (
            <Link
              to={`/dashboard/attendance/new?patientId=${patientId}&paymentMode=private_insurance`}
              className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-[var(--icon-purple-text)] text-white rounded text-xs font-medium hover:opacity-90 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Create Attendance
            </Link>
          )}
        </div>
      </div>

      {/* Insurance Details */}
      {(patient.paymentMode === 'nhis' || patient.paymentMode === 'private_insurance') && patient.insuranceDetails && (
        <div className="bg-[var(--icon-blue-bg)] rounded-lg p-3 border border-[var(--icon-blue-text)]/30">
          <h4 className="font-semibold text-[var(--text-primary)] mb-3 text-sm">Insurance Details</h4>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Insurance Number:</span>
              <span className="font-medium text-[var(--text-primary)]">{patient.insuranceDetails.insuranceNumber}</span>
            </div>
            {patient.paymentMode === 'private_insurance' && (
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Provider:</span>
                <span className="font-medium">
                  {insuranceProviders.find(p => p.id === patient.insuranceDetails?.insuranceProvider)?.name || 'Not provided'}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Start Date:</span>
              <span className="font-medium">
                {patient.insuranceDetails.startDate ? new Date(patient.insuranceDetails.startDate).toLocaleDateString() : 'Not provided'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">End Date:</span>
              <span className="font-medium">
                {patient.insuranceDetails.endDate ? new Date(patient.insuranceDetails.endDate).toLocaleDateString() : 'Not provided'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};