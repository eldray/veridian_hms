// src/components/NewAttendanceModal.tsx - UPDATED FOR SURNAME + OTHERNAMES
import { useState, useEffect } from 'react';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useInsuranceStore } from '../store/insuranceStore';
import { useToast } from '../store/toastStore';
import { X, Save, User, CheckCircle, CreditCard, Shield, Building, AlertCircle } from 'lucide-react';
import type { AttendanceType, PaymentMode, AttendanceStatus } from '../types';

interface NewAttendanceModalProps {
  patientId?: string;
  onSuccess: (attendance: any) => void;
  onClose: () => void;
  isEditMode?: boolean;
  attendanceData?: any;
}

export default function NewAttendanceModal({
  patientId,
  onSuccess,
  onClose,
  isEditMode = false,
  attendanceData = null
}: NewAttendanceModalProps) {
  const { createAttendance, updateAttendance, isLoading } = useAttendanceStore();
  const { getPatientById } = usePatientStore();
  const { insuranceProviders, getInsuranceProviders } = useInsuranceStore();
  const { user } = useAuthStore();
  const { success, error } = useToast();

  const [attendanceType, setAttendanceType] = useState<AttendanceType>('general_consultation');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [nhisCCC, setNhisCCC] = useState('');
  const [complaints, setComplaints] = useState('');
  const [status, setStatus] = useState<AttendanceStatus>('pending');
  const [patient, setPatient] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // ✅ FIX: Get full name from surname + otherNames
  const getPatientFullName = (patient: any) => {
    if (!patient) return 'Unknown Patient';
    return `${patient.surname || ''} ${patient.otherNames || ''}`.trim();
  };

  // Load insurance providers
  useEffect(() => {
    getInsuranceProviders().catch(console.error);
  }, [getInsuranceProviders]);

  useEffect(() => {
    if (isEditMode && attendanceData) {
      console.log('📋 Editing attendance:', attendanceData);
      setAttendanceType(attendanceData.attendanceType || 'general_consultation');
      setPaymentMode(attendanceData.paymentMode || 'cash');
      setNhisCCC(attendanceData.nhisCCC || '');
      setComplaints(attendanceData.complaints || '');
      setStatus(attendanceData.status || 'pending');
      
      if (attendanceData.patientId) {
        const patientData = getPatientById(attendanceData.patientId);
        setPatient(patientData);
      } else if (patientId) {
        const patientData = getPatientById(patientId);
        setPatient(patientData);
      }
    } else if (patientId) {
      const patientData = getPatientById(patientId);
      console.log('👤 Patient data loaded:', patientData);
      setPatient(patientData);
      
      if (patientData) {
        if (patientData.paymentMode) {
          setPaymentMode(patientData.paymentMode);
        }
        if (patientData.insuranceDetails?.memberId) {
          setNhisCCC(patientData.insuranceDetails.memberId);
        }
      }
    }
  }, [patientId, getPatientById, isEditMode, attendanceData]);

  // Validation function
  const validateForm = (): boolean => {
    const errors: string[] = [];

    // NHIS Validation
    if (paymentMode === 'nhis') {
      if (!nhisCCC.trim()) {
        errors.push('NHIS CCC code is required for NHIS patients');
      } else if (!/^\d{5}$/.test(nhisCCC.trim())) {
        errors.push('NHIS CCC code must be exactly 5 digits');
      }
    }

    // Private Insurance Validation
    if (paymentMode === 'private_insurance') {
      if (!patient?.insuranceDetails?.providerId) {
        errors.push('Patient must have an insurance provider selected for private insurance');
      }
      
      // Check if insurance provider is active and valid
      if (patient?.insuranceDetails?.providerId) {
        const insuranceProvider = insuranceProviders?.find(p => p.id === patient.insuranceDetails.providerId);
        if (!insuranceProvider) {
          errors.push('Selected insurance provider not found');
        } else if (!insuranceProvider.isActive) {
          errors.push('Selected insurance provider is not active');
        }
      }
    }

    // General validations
    if (!complaints.trim()) {
      errors.push('Patient complaints are required');
    }

    if (!attendanceType) {
      errors.push('Attendance type is required');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🟡 Submit button clicked - Starting form submission...');

    // Run validation first
    if (!validateForm()) {
      const errorMessage = validationErrors[0] || 'Please fix the form errors';
      error('Validation Failed', errorMessage);
      return;
    }

    // Debug: Check all required conditions
    console.log('🔍 Debug - Form state:', {
      isEditMode,
      patientId,
      patient: !!patient,
      user: !!user,
      paymentMode,
      nhisCCC,
      isLoading
    });

    if (isEditMode) {
      if (!attendanceData) {
        console.log('❌ Edit mode: No attendance data found');
        error('Edit Failed', 'Attendance data not found for editing');
        return;
      }
    } else {
      if (!patientId || !patient) {
        console.log('❌ Create mode: Patient not found - patientId:', patientId, 'patient:', patient);
        error('Patient Not Found', 'Patient not found');
        return;
      }
    }

    if (!user) {
      console.log('❌ No user found');
      error('Authentication Error', 'User not authenticated');
      return;
    }

    console.log('✅ All validations passed - Building payload...');

    // Create a clean payload with all required fields
    const attendanceDataPayload: any = {
      // For create mode, include patientId
      ...(isEditMode ? {} : { patientId }),
      
      // Basic required fields
      dateTime: isEditMode ? attendanceData.dateTime : new Date().toISOString(),
      attendanceType,
      paymentMode,
      
      // Conditional NHIS field
      ...(paymentMode === 'nhis' && { nhisCCC: nhisCCC.trim() }),
      
      // Conditional insurance provider
      ...(paymentMode === 'private_insurance' && patient?.insuranceDetails?.providerId && {
        insuranceProviderId: patient.insuranceDetails.providerId
      }),
      
      // Complaints with default
      complaints: complaints.trim() || 'No complaints recorded',
      
      // User information
      createdById: user.id,
      ...(isEditMode && { updatedById: user.id }),
      
      // Status
      ...(isEditMode ? { status } : { status: 'pending' }),
    };

    // Clean up undefined/null values
    Object.keys(attendanceDataPayload).forEach(key => {
      if (attendanceDataPayload[key] === undefined || attendanceDataPayload[key] === null) {
        delete attendanceDataPayload[key];
      }
    });

    console.log('📝 Final payload being submitted:', attendanceDataPayload);

    try {
      console.log('🔄 Calling store function...');
      let result;
      
      if (isEditMode && attendanceData) {
        const attendanceId = attendanceData.id;
        console.log('🔄 Updating attendance with ID:', attendanceId);
        result = await updateAttendance(attendanceId, attendanceDataPayload);
        success('Attendance Updated', 'Attendance record has been successfully updated');
      } else {
        console.log('🆕 Creating new attendance');
        result = await createAttendance(attendanceDataPayload);
        success('Attendance Created', `New attendance created for ${getPatientFullName(patient)}`);
      }
      
      console.log('✅ Attendance saved successfully:', result);
      
      setShowSuccess(true);
      setTimeout(() => {
        console.log('🎯 Calling onSuccess callback');
        onSuccess(result);
      }, 1500);
    } catch (err: any) {
      console.error('❌ Failed to save attendance:', err);
      
      let errorMessage = 'Failed to save attendance';
      
      if (err.response?.data) {
        const serverError = err.response.data;
        if (typeof serverError === 'string') {
          errorMessage = serverError;
        } else if (serverError.message) {
          errorMessage = serverError.message;
        } else if (serverError.error) {
          errorMessage = serverError.error;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      console.error('❌ Error message to display:', errorMessage);
      error('Save Failed', errorMessage);
    }
  };

  const paymentModes = [
    { id: 'cash', name: 'Cash', icon: CreditCard, color: 'gray' },
    { id: 'nhis', name: 'NHIS', icon: Shield, color: 'green' },
    { id: 'private_insurance', name: 'Private Insurance', icon: Building, color: 'blue' }
  ];

  const statusOptions: { id: AttendanceStatus; name: string; color: string }[] = [
    { id: 'pending', name: 'Pending', color: 'yellow' },
    { id: 'completed', name: 'Completed', color: 'green' },
    { id: 'cancelled', name: 'Cancelled', color: 'red' },
    { id: 'admitted', name: 'Admitted', color: 'purple' },
    { id: 'discharged', name: 'Discharged', color: 'indigo' }
  ];

  const attendanceTypes: { id: AttendanceType; name: string }[] = [
    { id: 'general_consultation', name: 'General Consultation' },
    { id: 'emergency_acute', name: 'Emergency/Acute' },
    { id: 'antenatal', name: 'Antenatal' },
    { id: 'postnatal', name: 'Postnatal' },
    { id: 'chronic_followup', name: 'Chronic Follow-up' },
    { id: 'specialist_consultation', name: 'Specialist Consultation' },
    { id: 'delivery', name: 'Delivery' },
    { id: 'surgery', name: 'Surgery' }
  ];

  // Get current insurance provider info for display
  const currentInsuranceProvider = paymentMode === 'private_insurance' && patient?.insuranceDetails?.providerId 
    ? insuranceProviders?.find(p => p.id === patient.insuranceDetails.providerId)
    : null;

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-white/80 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl p-6 w-full max-w-md text-center border border-gray-200 shadow-lg">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {isEditMode ? 'Attendance Updated!' : 'Attendance Created!'}
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            {isEditMode 
              ? 'Attendance record has been successfully updated.'
              : `New attendance record has been successfully created for ${getPatientFullName(patient)}.`
            }
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white/80 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 shadow-lg">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-teal-500 rounded-t-xl p-4 text-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 rounded-lg">
                {isEditMode ? <Save className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {isEditMode ? 'Edit Attendance' : 'Create New Attendance'}
                </h2>
                <p className="text-blue-100 text-xs">
                  {patient ? getPatientFullName(patient) : 'Loading...'} • {patient?.folderNumber}
                  {isEditMode && attendanceData?.attendanceNumber && ` • ${attendanceData.attendanceNumber}`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Patient Info */}
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                <User className="w-3 h-3 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">{patient ? getPatientFullName(patient) : 'Loading...'}</p>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span>{patient?.folderNumber}</span>
                  <span>•</span>
                  <span className="capitalize">{patient?.gender}</span>
                  <span>•</span>
                  <span>{patient?.age} years</span>
                </div>
                {/* Insurance Provider Info */}
                {paymentMode === 'private_insurance' && currentInsuranceProvider && (
                  <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                    <p className="text-xs font-medium text-blue-800">
                      Insurance: {currentInsuranceProvider.name}
                    </p>
                    <p className="text-xs text-blue-600">
                      Coverage: {currentInsuranceProvider.coveragePercentage}% • 
                      {currentInsuranceProvider.isActive ? ' Active' : ' Inactive'}
                    </p>
                  </div>
                )}
              </div>
              {isEditMode && attendanceData?.dateTime && (
                <div className="text-xs text-gray-500">
                  <span>Created: {new Date(attendanceData.dateTime).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <h3 className="text-sm font-bold text-red-900">Please fix the following errors:</h3>
              </div>
              <ul className="text-xs text-red-700 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Status Selection (Edit Mode Only) */}
            {isEditMode && (
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <h3 className="text-sm font-bold text-gray-900 mb-2">Status</h3>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
                  className="w-full px-2.5 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
                  disabled={isLoading}
                >
                  {statusOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-600 mt-1">
                  Update the attendance status based on current progress
                </p>
              </div>
            )}

            {/* Payment Mode Selection */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Payment Mode</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {paymentModes.map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = paymentMode === mode.id;
                  
                  return (
                    <button
                      type="button"
                      key={mode.id}
                      onClick={() => setPaymentMode(mode.id as PaymentMode)}
                      className={`p-2 rounded-lg border text-left transition-all duration-200 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                      disabled={isLoading}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded flex items-center justify-center ${
                          isSelected ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <Icon className={`w-3 h-3 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-xs">{mode.name}</p>
                          <p className="text-xs text-gray-600 capitalize">
                            {mode.id.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Attendance Type */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Attendance Type</h3>
              <select
                value={attendanceType}
                onChange={(e) => setAttendanceType(e.target.value as AttendanceType)}
                className="w-full px-2.5 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
                disabled={isLoading}
              >
                {attendanceTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-600 mt-1">
                Select the appropriate type of attendance
              </p>
            </div>

            {/* NHIS CCC Code */}
            {paymentMode === 'nhis' && (
              <div className={`rounded-lg p-3 border ${
                nhisCCC.trim() && /^\d{5}$/.test(nhisCCC.trim())
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-yellow-600" />
                  NHIS Information
                </h3>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    NHIS CCC Code *
                  </label>
                  <input
                    type="text"
                    value={nhisCCC}
                    onChange={(e) => setNhisCCC(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    placeholder="Enter 5-digit CCC code"
                    className="w-full px-2.5 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
                    required
                    disabled={isLoading}
                    pattern="\d{5}"
                    title="NHIS CCC code must be exactly 5 digits"
                  />
                  <p className={`text-xs mt-1 ${
                    nhisCCC.trim() && /^\d{5}$/.test(nhisCCC.trim())
                      ? 'text-green-700' 
                      : 'text-yellow-700'
                  }`}>
                    {nhisCCC.trim() 
                      ? nhisCCC.trim().length === 5 
                        ? 'Valid NHIS CCC code format' 
                        : 'CCC code must be exactly 5 digits'
                      : 'Required for NHIS claim processing'
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Private Insurance Validation Display */}
            {paymentMode === 'private_insurance' && (
              <div className={`rounded-lg p-3 border ${
                currentInsuranceProvider && currentInsuranceProvider.isActive
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1">
                  <Building className="w-3 h-3 text-blue-600" />
                  Insurance Verification
                </h3>
                <div>
                  {currentInsuranceProvider ? (
                    <>
                      <p className="text-xs font-medium text-gray-700">
                        Provider: {currentInsuranceProvider.name}
                      </p>
                      <p className={`text-xs ${
                        currentInsuranceProvider.isActive
                          ? 'text-green-700'
                          : 'text-red-700'
                      }`}>
                        Status: {currentInsuranceProvider.isActive 
                          ? 'Active ✓'
                          : 'Inactive ✗'
                        }
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-red-700">
                      No insurance provider selected for patient
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Complaints */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Patient Complaints</h3>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Presenting Complaints *
                </label>
                <textarea
                  value={complaints}
                  onChange={(e) => setComplaints(e.target.value)}
                  placeholder="Enter patient complaints, symptoms, or reason for visit..."
                  rows={3}
                  className="w-full px-2.5 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
                  disabled={isLoading}
                  required
                />
                <p className="text-xs text-blue-700 mt-1">
                  Detailed complaints help in accurate diagnosis and treatment planning
                </p>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{isEditMode ? 'Updating...' : 'Creating...'}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3 h-3" />
                    <span>{isEditMode ? 'Update Attendance' : 'Create Attendance'}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-3 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium text-sm disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}