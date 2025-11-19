// src/components/PaymentModeTab.tsx - FIXED API INTEGRATION
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
import { useToast } from '../store/toastStore';
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
  onRetryProviders?: () => void;
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
  const { error: toastError, success } = useToast();

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
      toastError('Insurance Required', 'Please complete all required insurance details before creating attendance');
      return;
    }
    
    // Set the payment mode in the parent component first
    onPaymentModeChange(mode);
    
    // Then open the modal
    setSelectedPaymentMode(mode);
    setShowAttendanceModal(true);
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
    success('Attendance Created', 'New visit has been created successfully');
  };

  const handleAttendanceClose = () => {
    setShowAttendanceModal(false);
  };

  const handleRetryProviders = () => {
    if (onRetryProviders) {
      onRetryProviders();
      success('Refreshing', 'Reloading insurance providers...');
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
      <div className="p-4 text-center text-gray-600 text-sm">
        ⚠️ Missing required props for PaymentModeTab
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-blue-900 mb-1">
                Payment Mode (Optional)
              </h3>
              <p className="text-blue-700 text-xs">
                You can set the payment mode now or add it later.{' '}
                <strong>Cash patients</strong> can create attendances
                immediately. <strong>Insurance patients</strong> need valid
                insurance details before creating attendances.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Mode Selection - UPDATED WITH SMALLER CARDS */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          Select Payment Mode {!isOptional && <span className="text-red-500">*</span>}
        </h2>

        {/* FIXED: Smaller card grid with reduced spacing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Cash - Smaller card */}
          <div
            className={`border-2 rounded-lg p-3 cursor-pointer transition-all duration-200 min-h-[120px] flex flex-col ${
              paymentMode === 'cash'
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-300 bg-white hover:border-blue-300 hover:shadow-sm'
            }`}
            onClick={() => {
              onPaymentModeChange('cash');
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`p-1.5 rounded-lg ${
                  paymentMode === 'cash'
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <DollarSign className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Cash</h3>
            </div>
            <p className="text-gray-600 text-xs mb-2 leading-tight flex-grow">
              Patient pays directly for services. Attendances can be created immediately.
            </p>

            {paymentMode === 'cash' && patientId && (
              <div className="mt-auto space-y-1">
                <div className="p-1.5 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 text-xs font-medium">
                    ✓ Ready for immediate attendance creation
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddAttendance('cash');
                  }}
                  className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-xs"
                >
                  <Plus className="w-3 h-3" />
                  Create Cash Attendance
                </button>
              </div>
            )}
          </div>

          {/* NHIS - Smaller card */}
          <div
            className={`border-2 rounded-lg p-3 cursor-pointer transition-all duration-200 min-h-[120px] flex flex-col ${
              paymentMode === 'nhis'
                ? 'border-green-500 bg-green-50 shadow-md'
                : 'border-gray-300 bg-white hover:border-green-300 hover:shadow-sm'
            }`}
            onClick={() => {
              onPaymentModeChange('nhis');
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`p-1.5 rounded-lg ${
                  paymentMode === 'nhis'
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Shield className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">NHIS</h3>
            </div>
            <p className="text-gray-600 text-xs mb-2 leading-tight flex-grow">
              National Health Insurance Scheme. Requires valid insurance details.
            </p>

            {paymentMode === 'nhis' && patientId && (
              <div className="mt-auto space-y-1">
                <div className={`p-1.5 rounded-lg ${
                  isInsuranceValid() 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <p className={`text-xs font-medium ${
                    isInsuranceValid() ? 'text-green-700' : 'text-yellow-700'
                  }`}>
                    {isInsuranceValid() ? '✓ Ready for attendance creation' : '⚠ Complete insurance details below'}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddAttendance('nhis');
                  }}
                  disabled={!isInsuranceValid()}
                  className={`w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg transition-colors font-medium text-xs ${
                    isInsuranceValid()
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  Create NHIS Attendance
                </button>
              </div>
            )}
          </div>

          {/* Private Insurance - Smaller card */}
          <div
            className={`border-2 rounded-lg p-3 cursor-pointer transition-all duration-200 min-h-[120px] flex flex-col ${
              paymentMode === 'private_insurance'
                ? 'border-purple-500 bg-purple-50 shadow-md'
                : 'border-gray-300 bg-white hover:border-purple-300 hover:shadow-sm'
            }`}
            onClick={() => {
              onPaymentModeChange('private_insurance');
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`p-1.5 rounded-lg ${
                  paymentMode === 'private_insurance'
                    ? 'bg-purple-100 text-purple-600'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <CreditCard className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">
                Private Insurance
              </h3>
            </div>
            <p className="text-gray-600 text-xs mb-2 leading-tight flex-grow">
              Private insurance coverage. Select provider and enter details.
            </p>

            {paymentMode === 'private_insurance' && patientId && (
              <div className="mt-auto space-y-1">
                <div className={`p-1.5 rounded-lg ${
                  isInsuranceValid() 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <p className={`text-xs font-medium ${
                    isInsuranceValid() ? 'text-green-700' : 'text-yellow-700'
                  }`}>
                    {isInsuranceValid() ? '✓ Ready for attendance creation' : '⚠ Complete insurance details below'}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddAttendance('private_insurance');
                  }}
                  disabled={!isInsuranceValid()}
                  className={`w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg transition-colors font-medium text-xs ${
                    isInsuranceValid()
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  Create Insurance Attendance
                </button>
              </div>
            )}
          </div>
        </div>

        {isOptional && paymentMode && (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => {
                onPaymentModeChange(undefined);
              }}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Remove payment mode selection
            </button>
          </div>
        )}
      </div>

      {/* Insurance Details */}
      {(paymentMode === 'nhis' || paymentMode === 'private_insurance') && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            Insurance Details <span className="text-red-500">*</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Insurance Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Insurance Number *
              </label>
              <input
                type="text"
                required
                value={safeInsurance.insuranceNumber}
                onChange={(e) =>
                  updateInsuranceField('insuranceNumber', e.target.value)
                }
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                placeholder="Enter insurance number"
              />
            </div>

            {/* Provider Selection for Private Insurance */}
            {paymentMode === 'private_insurance' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Insurance Provider *
                </label>
                <div className="relative">
                  {isLoadingProviders ? (
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <Loader className="w-4 h-4 animate-spin" />
                      Loading providers...
                    </div>
                  ) : privateProviders.length === 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200 text-xs">
                        <AlertCircle className="w-3 h-3" />
                        <span>No private insurance providers available.</span>
                      </div>
                      {onRetryProviders && (
                        <button
                          type="button"
                          onClick={handleRetryProviders}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors"
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
                      className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    >
                      <option value="">Select Provider</option>
                      {privateProviders.map((provider) => (
                        <option
                          key={provider._id || provider.id}
                          value={provider._id || provider.id}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={safeInsurance.startDate}
                onChange={(e) =>
                  updateInsuranceField('startDate', e.target.value)
                }
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date *
              </label>
              <input
                type="date"
                required
                value={safeInsurance.endDate}
                onChange={(e) =>
                  updateInsuranceField('endDate', e.target.value)
                }
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
              />
            </div>
          </div>

          {/* Provider Name Input (for NHIS) */}
          {paymentMode === 'nhis' && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Provider Name
              </label>
              <input
                type="text"
                value={safeInsurance.providerName || 'NHIS'}
                onChange={(e) =>
                  updateInsuranceField('providerName', e.target.value)
                }
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                placeholder="NHIS"
              />
            </div>
          )}

          {/* Info */}
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-700 text-xs">
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