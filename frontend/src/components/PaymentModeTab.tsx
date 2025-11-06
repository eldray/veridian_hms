// src/components/PaymentModeTab.tsx - UPDATED VERSION
import {
  CreditCard,
  Shield,
  DollarSign,
  Info,
  Loader,
  AlertCircle,
  Plus,
  RefreshCw,
} from 'lucide-react';
import type { PaymentMode, InsuranceDetails, InsuranceProvider } from '../types';
import { useState, useEffect } from 'react';
import NewAttendanceModal from './NewAttendanceModal';

interface PaymentModeTabProps {
  paymentMode?: PaymentMode;
  insuranceDetails?: InsuranceDetails;
  onPaymentModeChange: (mode?: PaymentMode) => void;
  onInsuranceDetailsChange: (details: InsuranceDetails) => void;
  insuranceProviders: InsuranceProvider[];
  isLoadingProviders?: boolean;
  isOptional?: boolean;
  patientId?: string;
  onRetryProviders?: () => void; // Add retry callback
}

export default function PaymentModeTab({
  paymentMode,
  insuranceDetails,
  onPaymentModeChange,
  onInsuranceDetailsChange,
  insuranceProviders = [],
  isLoadingProviders = false,
  isOptional = false,
  patientId,
  onRetryProviders,
}: PaymentModeTabProps) {
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<PaymentMode>('cash');
  const [error, setError] = useState<string | null>(null);

  // Add debug logs
  useEffect(() => {
    console.log('🔍 PaymentModeTab Debug:', {
      insuranceProviders,
      providersCount: insuranceProviders.length,
      paymentMode,
      isLoadingProviders
    });
  }, [insuranceProviders, paymentMode, isLoadingProviders]);

  // ✅ ensure we always have a valid insuranceDetails object
  const safeInsurance = insuranceDetails || {
    insuranceNumber: '',
    providerId: '',
    providerName: '',
    startDate: '',
    endDate: '',
  };

  const updateInsuranceField = (field: string, value: any) => {
    onInsuranceDetailsChange({
      ...safeInsurance,
      [field]: value,
    });
  };

  const handleAddAttendance = (mode: PaymentMode) => {
    // Validate insurance details for insurance modes
    if ((mode === 'nhis' || mode === 'private_insurance') && !isInsuranceValid()) {
      setError('Please complete all required insurance details before creating attendance');
      return;
    }
    
    // Set the payment mode in the parent component first
    onPaymentModeChange(mode);
    
    // Then open the modal
    setSelectedPaymentMode(mode);
    setShowAttendanceModal(true);
    setError(null);
  };

  const isInsuranceValid = () => {
    if (!safeInsurance.insuranceNumber || !safeInsurance.startDate || !safeInsurance.endDate) {
      return false;
    }
    if (paymentMode === 'private_insurance' && !safeInsurance.providerId) {
      return false;
    }
    return true;
  };

  const handleAttendanceSuccess = (attendance: any) => {
    setShowAttendanceModal(false);
    console.log('✅ Attendance created successfully:', attendance);
    setError(null);
  };

  const handleAttendanceClose = () => {
    setShowAttendanceModal(false);
    setError(null);
  };

  const handleRetryProviders = () => {
    setError(null);
    if (onRetryProviders) {
      onRetryProviders();
    }
  };

  // Filter providers by type
  const privateProviders = insuranceProviders.filter(provider => 
    provider.type === 'private' && provider.isActive
  );
  
  const nhisProviders = insuranceProviders.filter(provider => 
    provider.type === 'nhis' && provider.isActive
  );

  // ✅ Defensive render
  if (!onPaymentModeChange || !onInsuranceDetailsChange) {
    return (
      <div className="p-6 text-center text-gray-600">
        ⚠️ Missing required props for PaymentModeTab
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && patientId && (
        <NewAttendanceModal
          patientId={patientId}
          paymentMode={selectedPaymentMode}
          onSuccess={handleAttendanceSuccess}
          onClose={handleAttendanceClose}
          isEditMode={false}
        />
      )}

      {/* Optional payment mode info */}
      {isOptional && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Payment Mode (Optional)
              </h3>
              <p className="text-blue-700 text-sm">
                You can set the payment mode now or add it later.{' '}
                <strong>Cash patients</strong> can create attendances
                immediately. <strong>Insurance patients</strong> need valid
                insurance details before creating attendances.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Mode Selection */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Select Payment Mode {!isOptional && <span className="text-red-500">*</span>}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Cash */}
          <div
            className={`border-2 rounded-2xl p-6 cursor-pointer transition-all duration-200 ${
              paymentMode === 'cash'
                ? 'border-blue-500 bg-blue-50 shadow-lg'
                : 'border-gray-300 bg-white hover:border-blue-300 hover:shadow-md'
            }`}
            onClick={() => {
              onPaymentModeChange('cash');
              setError(null);
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`p-3 rounded-xl ${
                  paymentMode === 'cash'
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <DollarSign className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-gray-900">Cash</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Patient pays directly for services. Attendances can be created
              immediately.
            </p>

            {paymentMode === 'cash' && patientId && (
              <div className="mt-4 space-y-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-green-700 text-sm font-medium">
                    ✓ Ready for immediate attendance creation
                  </p>
                </div>
                <button
                  onClick={() => handleAddAttendance('cash')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Create Cash Attendance
                </button>
              </div>
            )}
          </div>

          {/* NHIS */}
          <div
            className={`border-2 rounded-2xl p-6 cursor-pointer transition-all duration-200 ${
              paymentMode === 'nhis'
                ? 'border-green-500 bg-green-50 shadow-lg'
                : 'border-gray-300 bg-white hover:border-green-300 hover:shadow-md'
            }`}
            onClick={() => {
              onPaymentModeChange('nhis');
              setError(null);
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`p-3 rounded-xl ${
                  paymentMode === 'nhis'
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-gray-900">NHIS</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              National Health Insurance Scheme. Requires valid insurance
              details.
            </p>

            {paymentMode === 'nhis' && patientId && (
              <div className="mt-4 space-y-3">
                <div className={`p-3 rounded-xl ${
                  isInsuranceValid() 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <p className={`text-sm font-medium ${
                    isInsuranceValid() ? 'text-green-700' : 'text-yellow-700'
                  }`}>
                    {isInsuranceValid() ? '✓ Ready for attendance creation' : '⚠ Complete insurance details below'}
                  </p>
                </div>
                <button
                  onClick={() => handleAddAttendance('nhis')}
                  disabled={!isInsuranceValid()}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors font-semibold text-sm ${
                    isInsuranceValid()
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  Create NHIS Attendance
                </button>
              </div>
            )}
          </div>

          {/* Private Insurance */}
          <div
            className={`border-2 rounded-2xl p-6 cursor-pointer transition-all duration-200 ${
              paymentMode === 'private_insurance'
                ? 'border-purple-500 bg-purple-50 shadow-lg'
                : 'border-gray-300 bg-white hover:border-purple-300 hover:shadow-md'
            }`}
            onClick={() => {
              onPaymentModeChange('private_insurance');
              setError(null);
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`p-3 rounded-xl ${
                  paymentMode === 'private_insurance'
                    ? 'bg-purple-100 text-purple-600'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-gray-900">
                Private Insurance
              </h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Private insurance coverage. Select provider and enter details.
            </p>

            {paymentMode === 'private_insurance' && patientId && (
              <div className="mt-4 space-y-3">
                <div className={`p-3 rounded-xl ${
                  isInsuranceValid() 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <p className={`text-sm font-medium ${
                    isInsuranceValid() ? 'text-green-700' : 'text-yellow-700'
                  }`}>
                    {isInsuranceValid() ? '✓ Ready for attendance creation' : '⚠ Complete insurance details below'}
                  </p>
                </div>
                <button
                  onClick={() => handleAddAttendance('private_insurance')}
                  disabled={!isInsuranceValid()}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors font-semibold text-sm ${
                    isInsuranceValid()
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  Create Insurance Attendance
                </button>
              </div>
            )}
          </div>
        </div>

        {isOptional && paymentMode && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                onPaymentModeChange(undefined);
                setError(null);
              }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Remove payment mode selection
            </button>
          </div>
        )}
      </div>

      {/* Insurance Details */}
      {(paymentMode === 'nhis' || paymentMode === 'private_insurance') && (
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Insurance Details <span className="text-red-500">*</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Insurance Number */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Insurance Number *
              </label>
              <input
                type="text"
                required
                value={safeInsurance.insuranceNumber}
                onChange={(e) =>
                  updateInsuranceField('insuranceNumber', e.target.value)
                }
                className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                placeholder="Enter insurance number"
              />
            </div>

            {/* Provider Selection for Private Insurance */}
            {paymentMode === 'private_insurance' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Insurance Provider *
                </label>
                <div className="relative">
                  {isLoadingProviders ? (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader className="w-4 h-4 animate-spin" />
                      Loading providers...
                    </div>
                  ) : privateProviders.length === 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">
                          No private insurance providers available.
                        </span>
                      </div>
                      {onRetryProviders && (
                        <button
                          type="button"
                          onClick={handleRetryProviders}
                          className="flex items-center gap-2 px-3 py-1 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Retry
                        </button>
                      )}
                    </div>
                  ) : (
                    <select
                      required
                      value={safeInsurance.providerId}
                      onChange={(e) =>
                        updateInsuranceField('providerId', e.target.value)
                      }
                      className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                    >
                      <option value="">Select Provider</option>
                      {privateProviders.map((provider) => (
                        <option
                          key={provider._id}
                          value={provider._id}
                        >
                          {provider.name}
                          {provider.coveragePercentage ? ` - ${provider.coveragePercentage}% coverage` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}

            {/* Start Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={safeInsurance.startDate}
                onChange={(e) =>
                  updateInsuranceField('startDate', e.target.value)
                }
                className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                End Date *
              </label>
              <input
                type="date"
                required
                value={safeInsurance.endDate}
                onChange={(e) =>
                  updateInsuranceField('endDate', e.target.value)
                }
                className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
              />
            </div>
          </div>

          {/* Provider Name Input (for NHIS) */}
          {paymentMode === 'nhis' && (
            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Provider Name
              </label>
              <input
                type="text"
                value={safeInsurance.providerName || 'NHIS'}
                onChange={(e) =>
                  updateInsuranceField('providerName', e.target.value)
                }
                className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                placeholder="NHIS"
              />
            </div>
          )}

          {/* Info */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <p className="text-yellow-700 text-sm">
              <strong>Note:</strong> Insurance details must be valid and current
              to create attendances. Patients with expired insurance will not be
              able to create new attendances.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
