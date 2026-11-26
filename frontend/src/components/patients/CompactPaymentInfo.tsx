// src/components/patients/CompactPaymentInfo.tsx
import { Link } from 'react-router-dom';
import { CreditCard, Shield, DollarSign, Plus } from 'lucide-react';

interface CompactPaymentInfoProps {
  patient: any;
  insuranceProviders: any[];
  patientId: string;
}

export const CompactPaymentInfo: React.FC<CompactPaymentInfoProps> = ({ patient, insuranceProviders, patientId }) => {
  const getPaymentModeColor = (paymentMode: string) => {
    switch (paymentMode) {
      case 'cash': return 'border-gray-300 bg-gray-50';
      case 'nhis': return 'border-green-300 bg-green-50';
      case 'private_insurance': return 'border-purple-300 bg-purple-50';
      default: return 'border-gray-200 bg-white';
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
        <div className={`border rounded-lg p-3 transition-all duration-200 ${getPaymentModeClasses('cash', patient.paymentMode === 'cash')} ${
          patient.paymentMode === 'cash' ? '' : ''
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded ${patient.paymentMode === 'cash' ? 'bg-[var(--text-secondary)] text-white' : 'bg-[var(--bg-main)] text-[var(--text-secondary)]'}`}>
              <DollarSign className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-[var(--text-primary)] text-sm">Cash</h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mb-3">Patient pays directly for services</p>
          {patient.paymentMode === 'cash' && patientId && (
            <Link
              to={`/dashboard/attendance/new?patientId=${patientId}&paymentMode=cash`}
              className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-[var(--text-secondary)] text-white rounded text-xs font-medium hover:opacity-90 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Create Attendance
            </Link>
          )}
        </div>

        {/* NHIS Card */}
        <div className={`border rounded-lg p-3 transition-all duration-200 ${getPaymentModeClasses('nhis', patient.paymentMode === 'nhis')} ${
          patient.paymentMode === 'nhis' ? '' : ''
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded ${patient.paymentMode === 'nhis' ? 'bg-[var(--icon-green-text)] text-white' : 'bg-[var(--bg-main)] text-[var(--text-secondary)]'}`}>
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm">NHIS</h3>
          </div>
          <p className="text-xs text-gray-600 mb-3">National Health Insurance Scheme</p>
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
        <div className={`border rounded-lg p-3 transition-all duration-200 ${getPaymentModeClasses('private_insurance', patient.paymentMode === 'private_insurance')} ${
          patient.paymentMode === 'private_insurance' ? '' : ''
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded ${patient.paymentMode === 'private_insurance' ? 'bg-[var(--icon-purple-text)] text-white' : 'bg-[var(--bg-main)] text-[var(--text-secondary)]'}`}>
              <CreditCard className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm">Private Insurance</h3>
          </div>
          <p className="text-xs text-gray-600 mb-3">Private insurance coverage</p>
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
          <h4 className="font-semibold text-gray-900 mb-3 text-sm">Insurance Details</h4>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Insurance Number:</span>
              <span className="font-medium">{patient.insuranceDetails.insuranceNumber}</span>
            </div>
            {patient.paymentMode === 'private_insurance' && (
              <div className="flex justify-between">
                <span className="text-gray-600">Provider:</span>
                <span className="font-medium">
                  {insuranceProviders.find(p => p.id === patient.insuranceDetails?.insuranceProvider)?.name || 'Not provided'}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Start Date:</span>
              <span className="font-medium">
                {patient.insuranceDetails.startDate ? new Date(patient.insuranceDetails.startDate).toLocaleDateString() : 'Not provided'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">End Date:</span>
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