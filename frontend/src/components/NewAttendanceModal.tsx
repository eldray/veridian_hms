// src/components/NewAttendanceModal.tsx - FIXED VERSION
import { getPatientName } from '../utils/patient';
import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useInsuranceStore } from '../store/insuranceStore';
import { useCorporateStore } from '../store/corporateStore';
import { useToast } from '../store/toastStore';
import { describeApiError } from '../utils/apiError';
import { X, Save, User, CheckCircle, CreditCard, Tag, Shield, Building, AlertCircle, Calendar, Clock, FileText, Stethoscope, Syringe } from 'lucide-react';
import type { AttendanceType, PaymentMode, AttendanceStatus } from '../types';
import ComplaintInput from './ComplaintInput';

interface NewAttendanceModalProps {
  patientId?: string;
  initialAttendanceType?: AttendanceType;
  corporateAccountId?: string;
  paymentMode?: PaymentMode;
  onSuccess: (attendance: any) => void;
  onClose: () => void;
  isEditMode?: boolean;
  attendanceData?: any;
}

export default function NewAttendanceModal({
  patientId,
  initialAttendanceType,
  corporateAccountId,
  paymentMode: initialPaymentMode,
  onSuccess,
  onClose,
  isEditMode = false,
  attendanceData = null
}: NewAttendanceModalProps) {
  const { createAttendance, updateAttendance, isLoading } = useAttendanceStore();
  const { getPatientById } = usePatientStore();
  const { providers: insuranceProviders, getInsuranceProviders } = useInsuranceStore();
  const { corporateAccounts, getCorporateAccounts } = useCorporateStore();
  const { user } = useAuthStore();
  const { success, error } = useToast();

  const [attendanceType, setAttendanceType] = useState<AttendanceType>(initialAttendanceType || 'emergency_acute');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(initialPaymentMode || 'cash');
  const [nhisCCC, setNhisCCC] = useState('');
  const [selectedCorporateAccountId, setResolvedCorporateAccountId] = useState(corporateAccountId || '');
  const [complaints, setComplaints] = useState('');
  const [status, setStatus] = useState<AttendanceStatus>('pending');
  const [patient, setPatient] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // ✅ HELPER: Resolve insurance provider ID from all possible data shapes
  const resolveInsuranceProviderId = (source: any): string | undefined => {
    if (!source) return undefined;
    return (
      source?.insuranceProviderId ||
      source?.insuranceDetails?.providerId ||
      source?.insuranceDetails?.insuranceProviderId ||
      source?.insuranceDetails?.provider?.id ||
      source?.insurance?.providerId ||
      undefined
    );
  };

  // ✅ HELPER: Resolve patient from state OR attendanceData fallback
  const resolvedPatient = patient || (isEditMode ? attendanceData : null);

  const getPatientFullName = getPatientName;
  useEffect(() => { if (initialAttendanceType) setAttendanceType(initialAttendanceType); }, [initialAttendanceType]);

  // Load insurance providers
  useEffect(() => {
    getInsuranceProviders().catch(console.error);
    getCorporateAccounts({ isActive: true, limit: 100 }).catch(console.error);
  }, [getInsuranceProviders, getCorporateAccounts]);

  // Initialize from patient data (for new attendance)
  useEffect(() => {
    if (!isEditMode && patientId) {
      const patientData = getPatientById(patientId);
      setPatient(patientData);

      if (patientData) {
        if (patientData.paymentMode) {
          setPaymentMode(patientData.paymentMode as PaymentMode);
        }
        setNhisCCC('');
        setResolvedCorporateAccountId(corporateAccountId || patientData.corporateAccountId || patientData.employer?.corporateAccountId || patientData.insuranceProviderId || '');
      }
    }
  }, [patientId, getPatientById, isEditMode]);

  // Initialize from attendance data (for edit mode)
  useEffect(() => {
    if (isEditMode && attendanceData) {
      setAttendanceType(attendanceData.attendanceType || 'emergency_acute');
      setPaymentMode(attendanceData.paymentMode || 'cash');
      setNhisCCC(attendanceData.nhisCCC || '');
      setResolvedCorporateAccountId(corporateAccountId || attendanceData.corporateAccountId || attendanceData.patient?.corporateAccountId || attendanceData.patient?.employer?.corporateAccountId || '');
      setComplaints(attendanceData.complaints || '');
      setStatus(attendanceData.status || 'pending');

      const pid = attendanceData.patientId || patientId;
      if (pid) {
        const patientData = getPatientById(pid);
        setPatient(patientData);
      }
    }
  }, [isEditMode, attendanceData, patientId, getPatientById]);

  // Populate membership/account information when the payment mode changes.
  useEffect(() => {
    const source = resolvedPatient || {};
    if (paymentMode === 'corporate') {
      setResolvedCorporateAccountId(corporateAccountId || source.corporateAccountId || source.employer?.corporateAccountId || source.insuranceProviderId || '');
    }
  }, [paymentMode, resolvedPatient, corporateAccountId, attendanceData]);

  // Watch for patient changes to update payment mode
  useEffect(() => {
    if (!isEditMode && patient) {
      if (patient.paymentMode) {
        setPaymentMode(patient.paymentMode as PaymentMode);
      }
    }
  }, [patient, isEditMode]);

  // ✅ FIXED validateForm — uses resolvedPatient so patient=null doesn't break it
  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (paymentMode === 'nhis') {
      const memberNumber = String(
        resolvedPatient?.nhisNumber ||
        resolvedPatient?.insuranceDetails?.memberId ||
        resolvedPatient?.insuranceDetails?.insuranceNumber ||
        ''
      ).trim();
      const expiry = resolvedPatient?.nhisExpiryDate || resolvedPatient?.insuranceDetails?.endDate;
      const hasMembershipDetails = Boolean(memberNumber && expiry);

      // Establish membership details and eligibility before requesting the visit-specific CCC.
      if (!hasMembershipDetails) {
        errors.push('Patient NHIS details are missing. Update the patient record with the NHIS membership number and expiry date first.');
      } else {
        const nhisActive = resolvedPatient?.nhisActive ?? resolvedPatient?.insuranceDetails?.isActive;
        if (nhisActive !== true) {
          errors.push(nhisActive === false
            ? 'NHIS membership is inactive. Update the patient record before using NHIS.'
            : 'NHIS membership status is not verified. Verify the patient record before using NHIS.');
        }
        const expiryDate = new Date(`${String(expiry).slice(0, 10)}T23:59:59`);
        const isExpired = Number.isNaN(expiryDate.getTime()) || expiryDate.getTime() < Date.now();
        if (isExpired) errors.push('NHIS membership has expired or has an invalid expiry date');
        if (nhisActive === true && !isExpired) {
          if (!nhisCCC.trim()) {
            errors.push('NHIS CCC code is required for an active NHIS membership');
          } else if (!/^\d{5}$/.test(nhisCCC.trim())) {
            errors.push('NHIS CCC code must be exactly 5 digits');
          }
        }
      }
    }

    if (paymentMode === 'private_insurance') {
      // ✅ Use resolvedPatient (falls back to attendanceData if patient state is null)
      const src = patient || (isEditMode ? attendanceData : null);
      const providerId = resolveInsuranceProviderId(src);

      if (!providerId) {
        errors.push('Patient must have an insurance provider selected for private insurance');
      } else if (!insuranceProviders || insuranceProviders.length === 0) {
        errors.push('Insurance provider status has not been verified');
      } else {
        // Verify selected provider against loaded active provider records
        const insuranceProvider = insuranceProviders.find(p => p.id === providerId);
        if (!insuranceProvider) {
          errors.push('Selected insurance provider not found');
        } else if (!insuranceProvider.isActive) {
          errors.push('Selected insurance provider is not active');
        }

      }
      const insuranceDetails = src?.insuranceDetails;
      if (insuranceDetails?.isActive !== true) errors.push(insuranceDetails?.isActive === false ? 'Patient insurance policy is inactive' : 'Insurance policy status is not verified as active');
      if (insuranceDetails?.endDate && new Date(insuranceDetails.endDate).getTime() < Date.now()) errors.push('Patient insurance policy has expired');
      // Require the loaded provider record and the patient's policy to be active
    }

    if (paymentMode === 'corporate') {
      if (!selectedCorporateAccountId) errors.push('Corporate account is required for corporate patients');
      const account = corporateAccounts.find((a: any) => a.id === selectedCorporateAccountId);
      if (selectedCorporateAccountId && account && account.isActive !== true) errors.push('Corporate account is inactive');
      if (selectedCorporateAccountId && !account) errors.push('Corporate account could not be verified or is still loading');
    }

    // Routine vaccination check-ins do not require an illness complaint.
    if (attendanceType !== 'immunization' && !complaints.trim()) {
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
      error('Validation Failed', 'Please fix the highlighted form errors');
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

    // ✅ Resolve insurance provider ID from the best available source
    const src = patient || (isEditMode ? attendanceData : null);
    const insuranceProviderId = resolveInsuranceProviderId(src);

    const attendanceDataPayload: any = {
      ...(isEditMode ? {} : { patientId }),
      dateTime: isEditMode ? attendanceData.dateTime : new Date().toISOString(),
      attendanceType,
      paymentMode,
      ...(paymentMode === 'nhis' && { nhisCCC: nhisCCC.trim() }),
      ...(paymentMode === 'private_insurance' && insuranceProviderId && {
        insuranceProviderId
      }),
      ...(paymentMode === 'corporate' && selectedCorporateAccountId && { corporateAccountId: selectedCorporateAccountId }),
      complaints: complaints.trim() || (attendanceType === 'immunization' ? 'Routine immunization / vaccination' : 'No complaints recorded'),
      createdById: isEditMode ? attendanceData.createdById : user.id,
      ...(isEditMode && { updatedById: user.id }),
      ...(isEditMode ? { status } : { status: 'pending' }),
    };

    // Clean up undefined/null values
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
      // An update goes through the attendance store, which re-throws a plain Error, so the field
      // list is not on `err.response` here - the reason is already in the message.
      error('Save Failed', describeApiError(err, 'Failed to save attendance'));
    }
  };

  const paymentModes = [
    { id: 'cash', name: 'Cash', icon: CreditCard, color: 'blue' },
    { id: 'nhis', name: 'NHIS', icon: Shield, color: 'green' },
    { id: 'private_insurance', name: 'Private Insurance', icon: Building, color: 'purple' },
    { id: 'corporate', name: 'Corporate', icon: Building, color: 'indigo' }
  ];

  const statusOptions: { id: AttendanceStatus; name: string; color: string }[] = [
    { id: 'pending', name: 'Pending', color: 'yellow' },
    { id: 'completed', name: 'Completed', color: 'green' },
    { id: 'cancelled', name: 'Cancelled', color: 'red' },
    { id: 'admitted', name: 'Admitted', color: 'cyan' },
    { id: 'discharged', name: 'Discharged', color: 'indigo' }
  ];

  const attendanceTypes: { id: AttendanceType; name: string; icon: ReactNode }[] = [
    { id: 'emergency_acute', name: 'Emergency/Acute', icon: <AlertCircle className="w-3.5 h-3.5" /> },
    { id: 'antenatal', name: 'Antenatal', icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: 'postnatal', name: 'Postnatal', icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: 'chronic_followup', name: 'Chronic Follow-up', icon: <Clock className="w-3.5 h-3.5" /> },
    { id: 'specialist_consultation', name: 'Specialist Consultation', icon: <Stethoscope className="w-3.5 h-3.5" /> },
    { id: 'delivery', name: 'Delivery', icon: <User className="w-3.5 h-3.5" /> },
    { id: 'surgery', name: 'Surgery', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'immunization', name: 'Immunization / Vaccination', icon: <Syringe className="w-3.5 h-3.5" /> }
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { selected: string; bg: string; text: string; border: string }> = {
      blue: { selected: 'bg-[var(--icon-blue-bg)] border-[var(--icon-blue-text)]', bg: 'bg-[var(--icon-blue-bg)]', text: 'text-[var(--icon-blue-text)]', border: 'border-[var(--icon-blue-text)]/30' },
      green: { selected: 'bg-[var(--icon-green-bg)] border-[var(--icon-green-text)]', bg: 'bg-[var(--icon-green-bg)]', text: 'text-[var(--icon-green-text)]', border: 'border-[var(--icon-green-text)]/30' },
      purple: { selected: 'bg-[var(--icon-purple-bg)] border-[var(--icon-purple-text)]', bg: 'bg-[var(--icon-purple-bg)]', text: 'text-[var(--icon-purple-text)]', border: 'border-[var(--icon-purple-text)]/30' },
      yellow: { selected: 'bg-[var(--icon-yellow-bg)] border-[var(--icon-yellow-text)]', bg: 'bg-[var(--icon-yellow-bg)]', text: 'text-[var(--icon-yellow-text)]', border: 'border-[var(--icon-yellow-text)]/30' },
      red: { selected: 'bg-[var(--icon-red-bg)] border-[var(--icon-red-text)]', bg: 'bg-[var(--icon-red-bg)]', text: 'text-[var(--icon-red-text)]', border: 'border-[var(--icon-red-text)]/30' },
      cyan: { selected: 'bg-[var(--icon-cyan-bg)] border-[var(--icon-cyan-text)]', bg: 'bg-[var(--icon-cyan-bg)]', text: 'text-[var(--icon-cyan-text)]', border: 'border-[var(--icon-cyan-text)]/30' },
      indigo: { selected: 'bg-[var(--icon-purple-bg)] border-[var(--icon-purple-text)]', bg: 'bg-[var(--icon-purple-bg)]', text: 'text-[var(--icon-purple-text)]', border: 'border-[var(--icon-purple-text)]/30' }
    };
    return colors[color] || colors.blue;
  };

  // ✅ FIXED: currentInsuranceProvider uses resolvedPatient + fallback object when list is loading
  const resolvedProviderId = resolveInsuranceProviderId(resolvedPatient);
  const resolvedNhisNumber = resolvedPatient?.nhisNumber || resolvedPatient?.insuranceDetails?.memberId || resolvedPatient?.insuranceDetails?.insuranceNumber || '';
  const resolvedNhisActive = resolvedPatient?.nhisActive ?? resolvedPatient?.insuranceDetails?.isActive;
  const resolvedNhisExpiry = resolvedPatient?.nhisExpiryDate || resolvedPatient?.insuranceDetails?.endDate;
  const resolvedNhisExpiryDate = resolvedNhisExpiry
    ? new Date(`${String(resolvedNhisExpiry).slice(0, 10)}T23:59:59`)
    : null;
  const resolvedNhisDetailsComplete = Boolean(resolvedNhisNumber && resolvedNhisExpiry);
  const resolvedNhisExpired = !resolvedNhisExpiryDate ||
    Number.isNaN(resolvedNhisExpiryDate.getTime()) ||
    resolvedNhisExpiryDate.getTime() < Date.now();
  const resolvedNhisEligible = resolvedNhisDetailsComplete &&
    resolvedNhisActive === true &&
    !resolvedNhisExpired;
  const selectedCorporateAccount = corporateAccounts.find((a: any) => a.id === selectedCorporateAccountId);

  const currentInsuranceProvider = paymentMode === 'private_insurance'
    ? (
        insuranceProviders?.find(p => p.id === resolvedProviderId) ??
        (resolvedProviderId
          ? {
              id: resolvedProviderId,
              name: resolvedPatient?.insuranceDetails?.providerName || 'Insurance Provider',
              isActive: false,
              coveragePercentage: '—'
            }
          : null)
      )
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
                {resolvedPatient ? getPatientFullName(resolvedPatient) : 'Loading...'} • {resolvedPatient?.folderNumber}
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
                <p className="font-semibold text-sm text-[var(--text-primary)]">
                  {resolvedPatient ? getPatientFullName(resolvedPatient) : 'Loading...'}
                </p>
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <span>{resolvedPatient?.folderNumber}</span>
                  <span>•</span>
                  <span className="capitalize">{resolvedPatient?.gender || 'N/A'}</span>
                  <span>•</span>
                  <span>{resolvedPatient?.age || 'N/A'} years</span>
                </div>
                {resolvedPatient?.paymentMode && (
                  <div className="mt-2 text-xs">
                    <span className="text-[var(--text-secondary)]">Default Payment: </span>
                    <span className="font-medium text-[var(--text-primary)] capitalize">{resolvedPatient.paymentMode}</span>
                  </div>
                )}
                {paymentMode === 'private_insurance' && currentInsuranceProvider && (
                  <div className="mt-2 p-2 bg-[var(--icon-purple-bg)] rounded-lg border border-[var(--icon-purple-text)]">
                    <p className="text-xs font-medium text-[var(--icon-purple-text)]">
                      Insurance: {currentInsuranceProvider.name}
                    </p>
                    <p className="text-xs text-[var(--icon-purple-text)] opacity-80">
                      {/\bpremier\s+health\b/i.test(String(currentInsuranceProvider.name || ''))
                        ? 'Benefit caps • '
                        : currentInsuranceProvider.coveragePercentage !== '—'
                          ? `Coverage: ${currentInsuranceProvider.coveragePercentage}% • `
                          : ''}
                      {currentInsuranceProvider.isActive ? 'Active' : 'Inactive'}
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
                  {statusOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  Update the attendance status based on current progress
                </p>
              </div>
            )}

            {/* Payment Mode Selection */}
            <div className="bg-[var(--bg-main)] rounded-lg p-3 border border-[var(--border-color)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2">Payment Mode</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {paymentModes.map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = paymentMode === mode.id;
                  const colors = getColorClasses(mode.color);

                  return (
                    <button
                      type="button"
                      key={mode.id}
                      onClick={() => setPaymentMode(mode.id as PaymentMode)}
                      className={`p-2 rounded-lg border text-left transition-all duration-200 ${
                        isSelected
                          ? `${colors.selected} border`
                          : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--text-tertiary)]'
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
              {resolvedPatient?.paymentMode && !isEditMode && (
                <p className="text-xs text-[var(--text-tertiary)] mt-2">
                  Auto-populated from patient's default payment method
                </p>
              )}
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

            {/* Verify membership details and active status before requesting the attendance CCC. */}
            {paymentMode === 'nhis' && (
              <div className={`rounded-lg p-3 border ${
                resolvedNhisEligible
                  ? 'bg-[var(--icon-green-bg)] border-[var(--icon-green-text)]'
                  : 'bg-[var(--icon-yellow-bg)] border-[var(--icon-yellow-text)]/30'
              }`}>
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-[var(--icon-green-text)]" />
                  NHIS Membership
                </h3>
                <div className="mb-2 text-xs text-[var(--text-secondary)] flex flex-wrap gap-x-3 gap-y-1">
                  <span>Member No: <strong>{resolvedNhisNumber || 'Not recorded'}</strong></span>
                  <span>Status: <strong>{resolvedNhisActive === true ? 'Active' : resolvedNhisActive === false ? 'Inactive' : 'Not verified'}</strong></span>
                  <span>Expiry: <strong>{resolvedNhisExpiry ? new Date(resolvedNhisExpiry).toLocaleDateString() : 'Not recorded'}</strong></span>
                </div>
                {!resolvedNhisDetailsComplete ? (
                  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">NHIS details required first</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      This patient does not have a complete NHIS membership number and expiry date on record. Update the patient’s NHIS details before creating an NHIS attendance. The CCC is requested only after membership details are recorded and confirmed active.
                    </p>
                    {(patientId || resolvedPatient?.id || resolvedPatient?._id) && (
                      <Link
                        to={`/dashboard/patients/register?edit=true&id=${patientId || resolvedPatient?.id || resolvedPatient?._id}`}
                        className="inline-flex mt-2 text-xs font-semibold text-[var(--icon-cyan-text)] hover:underline"
                      >
                        Open patient record to enter NHIS details
                      </Link>
                    )}
                  </div>
                ) : !resolvedNhisEligible ? (
                  <p className="text-xs font-medium text-[var(--icon-red-text)]">
                    {resolvedNhisActive === false
                      ? 'NHIS membership is inactive. Update or verify the patient’s NHIS details before proceeding.'
                      : resolvedNhisActive !== true
                        ? 'NHIS membership status has not been verified. Verify the patient’s NHIS details before proceeding.'
                        : 'NHIS membership has expired. Update the patient’s NHIS details before proceeding.'}
                  </p>
                ) : (
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
                      inputMode="numeric"
                      pattern="\d{5}"
                      title="NHIS CCC code must be exactly 5 digits"
                    />
                    <p className={`text-xs mt-1 ${
                      nhisCCC.trim() && /^\d{5}$/.test(nhisCCC.trim())
                        ? 'text-[var(--icon-green-text)]'
                        : 'text-[var(--icon-yellow-text)]'
                    }`}>
                      {nhisCCC.trim()
                        ? nhisCCC.trim().length === 5
                          ? 'Valid NHIS CCC code format'
                          : 'CCC code must be exactly 5 digits'
                        : 'Required for an active NHIS membership'
                      }
                    </p>
                  </div>
                )}
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
                        Status: {currentInsuranceProvider.isActive ? 'Active ✓' : 'Inactive ✗'}
                      </p>
                      {(resolvedPatient?.insuranceDetails?.insuranceNumber || resolvedPatient?.insuranceDetails?.policyNumber) && (
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          Policy No: {resolvedPatient.insuranceDetails.insuranceNumber || resolvedPatient.insuranceDetails.policyNumber}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-[var(--icon-red-text)]">
                      No insurance provider selected for patient
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Corporate account details */}
            {paymentMode === 'corporate' && (
              <div className={`rounded-lg p-3 border ${selectedCorporateAccount?.isActive ? 'bg-[var(--icon-green-bg)] border-[var(--icon-green-text)]' : 'bg-[var(--icon-red-bg)] border-[var(--icon-red-text)]'}`}>
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2 flex items-center gap-1"><Building className="w-3.5 h-3.5" /> Corporate Account Verification</h3>
                {selectedCorporateAccount ? <>
                  <p className="text-xs font-medium">{selectedCorporateAccount.companyName}</p>
                  <p className={`text-xs ${selectedCorporateAccount.isActive ? 'text-[var(--icon-green-text)]' : 'text-[var(--icon-red-text)]'}`}>Status: {selectedCorporateAccount.isActive ? 'Active' : 'Inactive'}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Account: {selectedCorporateAccount.id}</p>
                </> : <p className="text-xs text-[var(--icon-red-text)]">{selectedCorporateAccountId ? 'Account could not be verified' : 'No corporate account assigned to patient'}</p>}
              </div>
            )}

            {/* Complaints */}
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