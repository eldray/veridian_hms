// src/components/NewAttendanceModal.tsx - REDESIGNED WITH CONSISTENT THEME
import { useState, useEffect } from 'react';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useInsuranceStore } from '../store/insuranceStore';
import { useToast } from '../store/toastStore';
import { X, Save, User, CheckCircle, CreditCard,Tag, Shield, Building, AlertCircle, Calendar, Clock, FileText, Stethoscope } from 'lucide-react';
import type { AttendanceType, PaymentMode, AttendanceStatus } from '../types';
import ComplaintInput from './ComplaintInput';

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

  // Get full name from surname + otherNames
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

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (paymentMode === 'nhis') {
      if (!nhisCCC.trim()) {
        errors.push('NHIS CCC code is required for NHIS patients');
      } else if (!/^\d{5}$/.test(nhisCCC.trim())) {
        errors.push('NHIS CCC code must be exactly 5 digits');
      }
    }

    if (paymentMode === 'private_insurance') {
      if (!patient?.insuranceDetails?.providerId) {
        errors.push('Patient must have an insurance provider selected for private insurance');
      }
      
      if (patient?.insuranceDetails?.providerId) {
        const insuranceProvider = insuranceProviders?.find(p => p.id === patient.insuranceDetails.providerId);
        if (!insuranceProvider) {
          errors.push('Selected insurance provider not found');
        } else if (!insuranceProvider.isActive) {
          errors.push('Selected insurance provider is not active');
        }
      }
    }

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

    if (!validateForm()) {
      const errorMessage = validationErrors[0] || 'Please fix the form errors';
      error('Validation Failed', errorMessage);
      return;
    }

    if (isEditMode && !attendanceData) {
      error('Edit Failed', 'Attendance data not found for editing');
      return;
    }

    if (!isEditMode && (!patientId || !patient)) {
      error('Patient Not Found', 'Patient not found');
      return;
    }

    if (!user) {
      error('Authentication Error', 'User not authenticated');
      return;
    }

    const attendanceDataPayload: any = {
      ...(isEditMode ? {} : { patientId }),
      dateTime: isEditMode ? attendanceData.dateTime : new Date().toISOString(),
      attendanceType,
      paymentMode,
      ...(paymentMode === 'nhis' && { nhisCCC: nhisCCC.trim() }),
      ...(paymentMode === 'private_insurance' && patient?.insuranceDetails?.providerId && {
        insuranceProviderId: patient.insuranceDetails.providerId
      }),
      complaints: complaints.trim() || 'No complaints recorded',
      createdById: user.id,
      ...(isEditMode && { updatedById: user.id }),
      ...(isEditMode ? { status } : { status: 'pending' }),
    };

    Object.keys(attendanceDataPayload).forEach(key => {
      if (attendanceDataPayload[key] === undefined || attendanceDataPayload[key] === null) {
        delete attendanceDataPayload[key];
      }
    });

    try {
      let result;
      
      if (isEditMode && attendanceData) {
        result = await updateAttendance(attendanceData.id, attendanceDataPayload);
        success('Attendance Updated', 'Attendance record has been successfully updated');
      } else {
        result = await createAttendance(attendanceDataPayload);
        success('Attendance Created', `New attendance created for ${getPatientFullName(patient)}`);
      }
      
      setShowSuccess(true);
      setTimeout(() => {
        onSuccess(result);
      }, 1500);
    } catch (err: any) {
      let errorMessage = 'Failed to save attendance';
      
      if (err.response?.data) {
        const serverError = err.response.data;
        errorMessage = serverError.message || serverError.error || errorMessage;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      error('Save Failed', errorMessage);
    }
  };

  const paymentModes = [
    { id: 'cash', name: 'Cash', icon: CreditCard, color: 'blue' },
    { id: 'nhis', name: 'NHIS', icon: Shield, color: 'green' },
    { id: 'private_insurance', name: 'Private Insurance', icon: Building, color: 'purple' }
  ];

  const statusOptions: { id: AttendanceStatus; name: string; color: string }[] = [
    { id: 'pending', name: 'Pending', color: 'yellow' },
    { id: 'completed', name: 'Completed', color: 'green' },
    { id: 'cancelled', name: 'Cancelled', color: 'red' },
    { id: 'admitted', name: 'Admitted', color: 'cyan' },
    { id: 'discharged', name: 'Discharged', color: 'indigo' }
  ];

  const attendanceTypes: { id: AttendanceType; name: string; icon: JSX.Element }[] = [
    { id: 'general_consultation', name: 'General Consultation', icon: <Stethoscope className="w-3.5 h-3.5" /> },
    { id: 'emergency_acute', name: 'Emergency/Acute', icon: <AlertCircle className="w-3.5 h-3.5" /> },
    { id: 'antenatal', name: 'Antenatal', icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: 'postnatal', name: 'Postnatal', icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: 'chronic_followup', name: 'Chronic Follow-up', icon: <Clock className="w-3.5 h-3.5" /> },
    { id: 'specialist_consultation', name: 'Specialist Consultation', icon: <Stethoscope className="w-3.5 h-3.5" /> },
    { id: 'delivery', name: 'Delivery', icon: <User className="w-3.5 h-3.5" /> },
    { id: 'surgery', name: 'Surgery', icon: <FileText className="w-3.5 h-3.5" /> }
  ];

  const getColorClasses = (color: string, isSelected: boolean) => {
    const colors: Record<string, { selected: string; bg: string; text: string; border: string }> = {
      blue: { selected: 'bg-blue-50 border-blue-500', bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
      green: { selected: 'bg-green-50 border-green-500', bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
      purple: { selected: 'bg-purple-50 border-purple-500', bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
      yellow: { selected: 'bg-yellow-50 border-yellow-500', bg: 'bg-yellow-100', text: 'text-yellow-600', border: 'border-yellow-200' },
      red: { selected: 'bg-red-50 border-red-500', bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-200' },
      cyan: { selected: 'bg-cyan-50 border-cyan-500', bg: 'bg-cyan-100', text: 'text-cyan-600', border: 'border-cyan-200' },
      indigo: { selected: 'bg-indigo-50 border-indigo-500', bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200' }
    };
    return colors[color] || colors.blue;
  };

  const currentInsuranceProvider = paymentMode === 'private_insurance' && patient?.insuranceDetails?.providerId 
    ? insuranceProviders?.find(p => p.id === patient.insuranceDetails.providerId)
    : null;

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-md text-center border border-[var(--border-color)] shadow-xl">
          <div className="w-12 h-12 bg-[var(--icon-green-bg)] rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-6 h-6 text-[var(--icon-green-text)]" />
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
            {isEditMode ? 'Attendance Updated!' : 'Attendance Created!'}
          </h3>
          <p className="text-[var(--text-secondary)] text-sm mb-4">
            {isEditMode 
              ? 'Attendance record has been successfully updated.'
              : `New attendance record has been successfully created for ${getPatientFullName(patient)}.`
            }
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-[var(--border-color)] shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-4 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center">
              {isEditMode ? <Save className="w-4 h-4 text-[var(--icon-cyan-text)]" /> : <User className="w-4 h-4 text-[var(--icon-cyan-text)]" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                {isEditMode ? 'Edit Attendance' : 'Create New Attendance'}
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                {patient ? getPatientFullName(patient) : 'Loading...'} • {patient?.folderNumber}
                {isEditMode && attendanceData?.attendanceNumber && ` • ${attendanceData.attendanceNumber}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 hover:bg-[var(--bg-main)] rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Patient Info Card */}
          <div className="bg-[var(--bg-main)] rounded-lg p-3 border border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-[var(--icon-cyan-text)]" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-[var(--text-primary)]">{patient ? getPatientFullName(patient) : 'Loading...'}</p>
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <span>{patient?.folderNumber}</span>
                  <span>•</span>
                  <span className="capitalize">{patient?.gender || 'N/A'}</span>
                  <span>•</span>
                  <span>{patient?.age || 'N/A'} years</span>
                </div>
                {paymentMode === 'private_insurance' && currentInsuranceProvider && (
                  <div className="mt-2 p-2 bg-[var(--icon-purple-bg)] rounded-lg border border-[var(--icon-purple-text)]">
                    <p className="text-xs font-medium text-[var(--icon-purple-text)]">
                      Insurance: {currentInsuranceProvider.name}
                    </p>
                    <p className="text-xs text-[var(--icon-purple-text)] opacity-80">
                      Coverage: {currentInsuranceProvider.coveragePercentage}% • 
                      {currentInsuranceProvider.isActive ? ' Active' : ' Inactive'}
                    </p>
                  </div>
                )}
              </div>
              {isEditMode && attendanceData?.dateTime && (
                <div className="text-xs text-[var(--text-tertiary)]">
                  <span>Created: {new Date(attendanceData.dateTime).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-[var(--icon-red-bg)] border border-[var(--icon-red-text)] rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-[var(--icon-red-text)]" />
                <h3 className="text-sm font-bold text-[var(--icon-red-text)]">Please fix the following errors:</h3>
              </div>
              <ul className="text-xs text-[var(--icon-red-text)] space-y-1">
                {validationErrors.map((err, index) => (
                  <li key={index}>• {err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Status Selection (Edit Mode Only) */}
            {isEditMode && (
              <div className="bg-[var(--bg-main)] rounded-lg p-3 border border-[var(--border-color)]">
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2">Status</h3>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
                  className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all text-sm"
                  disabled={isLoading}
                >
                  {statusOptions.map((option) => {
                    const colors = getColorClasses(option.color, false);
                    return (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    );
                  })}
                </select>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  Update the attendance status based on current progress
                </p>
              </div>
            )}

            {/* Payment Mode Selection */}
            <div className="bg-[var(--bg-main)] rounded-lg p-3 border border-[var(--border-color)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2">Payment Mode</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {paymentModes.map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = paymentMode === mode.id;
                  const colors = getColorClasses(mode.color, isSelected);
                  
                  return (
                    <button
                      type="button"
                      key={mode.id}
                      onClick={() => setPaymentMode(mode.id as PaymentMode)}
                      className={`p-2 rounded-lg border text-left transition-all duration-200 ${
                        isSelected
                          ? `${colors.selected} border`
                          : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-gray-300'
                      }`}
                      disabled={isLoading}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ? colors.bg : 'bg-[var(--bg-main)]'}`}>
                          <Icon className={`w-3.5 h-3.5 ${isSelected ? colors.text : 'text-[var(--text-secondary)]'}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-[var(--text-primary)] text-xs">{mode.name}</p>
                          <p className="text-xs text-[var(--text-secondary)] capitalize">
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
            <div className="bg-[var(--bg-main)] rounded-lg p-3 border border-[var(--border-color)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2">Attendance Type</h3>
              <select
                value={attendanceType}
                onChange={(e) => setAttendanceType(e.target.value as AttendanceType)}
                className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all text-sm"
                disabled={isLoading}
              >
                {attendanceTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                Select the appropriate type of attendance
              </p>
            </div>

            {/* NHIS CCC Code */}
            {paymentMode === 'nhis' && (
              <div className={`rounded-lg p-3 border ${
                nhisCCC.trim() && /^\d{5}$/.test(nhisCCC.trim())
                  ? 'bg-[var(--icon-green-bg)] border-[var(--icon-green-text)]' 
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
              }`}>
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-[var(--icon-green-text)]" />
                  NHIS Information
                </h3>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    NHIS CCC Code *
                  </label>
                  <input
                    type="text"
                    value={nhisCCC}
                    onChange={(e) => setNhisCCC(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    placeholder="Enter 5-digit CCC code"
                    className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all text-sm"
                    required
                    disabled={isLoading}
                    pattern="\d{5}"
                    title="NHIS CCC code must be exactly 5 digits"
                  />
                  <p className={`text-xs mt-1 ${
                    nhisCCC.trim() && /^\d{5}$/.test(nhisCCC.trim())
                      ? 'text-[var(--icon-green-text)]' 
                      : 'text-yellow-700 dark:text-yellow-500'
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
                  ? 'bg-[var(--icon-green-bg)] border-[var(--icon-green-text)]'
                  : 'bg-[var(--icon-red-bg)] border-[var(--icon-red-text)]'
              }`}>
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-[var(--icon-purple-text)]" />
                  Insurance Verification
                </h3>
                <div>
                  {currentInsuranceProvider ? (
                    <>
                      <p className="text-xs font-medium text-[var(--text-primary)]">
                        Provider: {currentInsuranceProvider.name}
                      </p>
                      <p className={`text-xs ${
                        currentInsuranceProvider.isActive
                          ? 'text-[var(--icon-green-text)]'
                          : 'text-[var(--icon-red-text)]'
                      }`}>
                        Status: {currentInsuranceProvider.isActive 
                          ? 'Active ✓'
                          : 'Inactive ✗'
                        }
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-[var(--icon-red-text)]">
                      No insurance provider selected for patient
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Complaints - Enhanced with + sign and search */}
            <div className="bg-[var(--icon-cyan-bg)] border border-[var(--icon-cyan-text)] rounded-lg p-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                <Tag className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                Patient Complaints
              </h3>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Presenting Complaints *
                </label>
                <ComplaintInput
                  value={complaints}
                  onChange={setComplaints}
                  placeholder="Search for complaints like 'Fever', 'Headache', 'Abdominal pain'..."
                  disabled={isLoading}
                  required
                />
                <p className="text-xs text-[var(--text-tertiary)] mt-2">
                  ✓ Select from suggestions, browse by category, or type custom complaints
                </p>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center gap-2 pt-3 border-t border-[var(--border-color)]">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>{isEditMode ? 'Updating...' : 'Creating...'}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{isEditMode ? 'Update Attendance' : 'Create Attendance'}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2.5 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] transition-all duration-200 font-medium text-sm disabled:opacity-50"
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