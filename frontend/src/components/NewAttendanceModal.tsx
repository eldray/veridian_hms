// src/components/NewAttendanceModal.tsx - UPDATED
import { useState, useEffect } from 'react';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { X, Save, User, AlertCircle, CheckCircle, CreditCard, Shield, Building } from 'lucide-react';
import type { AttendanceType, PaymentMode } from '../types';

interface NewAttendanceModalProps {
  patientId: string;
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
  const { createAttendance, updateAttendance, isLoading, error } = useAttendanceStore();
  const { getPatientById } = usePatientStore();
  const { user } = useAuthStore();

  const [attendanceType, setAttendanceType] = useState<AttendanceType>('general_opd');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [nhisCCC, setNhisCCC] = useState('');
  const [complaints, setComplaints] = useState('');
  const [status, setStatus] = useState('active');
  const [patient, setPatient] = useState<any>(null);
  const [formError, setFormError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (patientId) {
      const patientData = getPatientById(patientId);
      console.log('👤 Patient data loaded:', patientData);
      setPatient(patientData);
      
      if (patientData) {
        // Set payment mode from patient data if available
        if (patientData.paymentMode) {
          setPaymentMode(patientData.paymentMode);
        }
        
        // Pre-fill NHIS CCC if patient has it
        if (patientData.nhisCCC) {
          setNhisCCC(patientData.nhisCCC);
        }
      } else {
        setFormError('Patient not found.');
      }
    }

    // If edit mode, populate with existing data
    if (isEditMode && attendanceData) {
      setAttendanceType(attendanceData.attendanceType || 'general_opd');
      setPaymentMode(attendanceData.paymentMode || 'cash');
      setNhisCCC(attendanceData.nhisCCC || '');
      setComplaints(attendanceData.complaints || '');
      setStatus(attendanceData.status || 'active');
    }
  }, [patientId, getPatientById, isEditMode, attendanceData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!patientId || !patient) {
      setFormError('Patient not found');
      return;
    }

    if (!user) {
      setFormError('User not authenticated');
      return;
    }

    // Validate NHIS CCC for NHIS patients
    if (paymentMode === 'nhis' && !nhisCCC.trim()) {
      setFormError('Please enter NHIS CCC code');
      return;
    }

    const attendanceDataPayload = {
      patientId,
      dateTime: isEditMode ? attendanceData.dateTime : new Date().toISOString(),
      attendanceType,
      paymentMode,
      nhisCCC: paymentMode === 'nhis' ? nhisCCC : undefined,
      complaints: complaints.trim() || 'No complaints recorded',
      attendingClinician: user.id || user._id,
      status: status
    };

    console.log('📝 Submitting attendance data:', attendanceDataPayload);

    try {
      let result;
      if (isEditMode && attendanceData) {
        result = await updateAttendance(attendanceData._id || attendanceData.id, attendanceDataPayload);
      } else {
        result = await createAttendance(attendanceDataPayload);
      }
      
      console.log('✅ Attendance saved successfully:', result);
      
      setSuccess(true);
      setTimeout(() => {
        onSuccess(result);
      }, 1500);
    } catch (error: any) {
      console.error('❌ Failed to save attendance:', error);
      setFormError(error.message || 'Failed to save attendance');
    }
  };

  const paymentModes = [
    { id: 'cash', name: 'Cash', icon: CreditCard, color: 'gray' },
    { id: 'nhis', name: 'NHIS', icon: Shield, color: 'green' },
    { id: 'private_insurance', name: 'Private Insurance', icon: Building, color: 'blue' }
  ];

  const statusOptions = [
    { id: 'pending', name: 'Pending', color: 'yellow' },
    { id: 'active', name: 'Active', color: 'blue' },
    { id: 'completed', name: 'Completed', color: 'green' },
    { id: 'cancelled', name: 'Cancelled', color: 'red' },
    { id: 'admitted', name: 'Admitted', color: 'purple' },
    { id: 'discharged', name: 'Discharged', color: 'indigo' }
  ];

  if (success) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-8 w-full max-w-md text-center border border-gray-200 shadow-xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {isEditMode ? 'Attendance Updated!' : 'Attendance Created!'}
          </h3>
          <p className="text-gray-600 mb-6">
            {isEditMode 
              ? 'Attendance record has been successfully updated.'
              : `New attendance record has been successfully created for ${patient?.fullName}.`
            }
          </p>
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-200 shadow-2xl">
        {/* Header - Smaller */}
        <div className="bg-gradient-to-r from-blue-600 to-teal-600 rounded-t-2xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">
                {isEditMode ? 'Edit Attendance' : 'Create New Attendance'}
              </h2>
              <p className="text-blue-100 text-xs mt-1">
                {patient?.fullName} • {patient?.folderNumber}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Display */}
          {(formError || error) && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium text-sm">{formError || error}</span>
              </div>
            </div>
          )}

          {/* Patient Info - Compact */}
          <div className="bg-gray-50 rounded-xl p-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{patient?.fullName}</p>
                <p className="text-xs text-gray-600">
                  {patient?.folderNumber} • {patient?.gender} • {patient?.age} years
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Status Selection (Edit Mode Only) */}
            {isEditMode && (
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <h3 className="text-base font-bold text-gray-900 mb-3">Status</h3>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
                  disabled={isLoading}
                >
                  {statusOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Payment Mode Selection - Smaller */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <h3 className="text-base font-bold text-gray-900 mb-3">Payment Mode</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {paymentModes.map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = paymentMode === mode.id;
                  
                  return (
                    <button
                      type="button"
                      key={mode.id}
                      onClick={() => setPaymentMode(mode.id as PaymentMode)}
                      className={`p-3 rounded-lg border text-left transition-all duration-200 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded flex items-center justify-center ${
                          isSelected ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{mode.name}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Attendance Type - Dropdown */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <h3 className="text-base font-bold text-gray-900 mb-3">Attendance Type</h3>
              <select
                value={attendanceType}
                onChange={(e) => setAttendanceType(e.target.value as AttendanceType)}
                className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
                disabled={isLoading}
              >
                <option value="general_opd">General OPD</option>
                <option value="specialist_consultation">Specialist Consultation</option>
                <option value="antenatal_care">Antenatal Care</option>
                <option value="diagnostic_opd">Diagnostic OPD</option>
                <option value="emergency">Emergency</option>
                <option value="other_opd">Other OPD</option>
                <option value="inpatient">Inpatient</option>
              </select>
            </div>

            {/* NHIS CCC Code (only for NHIS patients) */}
            {paymentMode === 'nhis' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-yellow-600" />
                  NHIS Information
                </h3>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    NHIS CCC Code *
                  </label>
                  <input
                    type="text"
                    value={nhisCCC}
                    onChange={(e) => setNhisCCC(e.target.value)}
                    placeholder="Enter CCC code"
                    className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
                    required
                    disabled={isLoading}
                  />
                  <p className="text-xs text-yellow-700 mt-2">
                    Required for NHIS claim processing
                  </p>
                </div>
              </div>
            )}

            {/* Complaints */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="text-base font-bold text-gray-900 mb-3">Patient Complaints</h3>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Presenting Complaints
                </label>
                <textarea
                  value={complaints}
                  onChange={(e) => setComplaints(e.target.value)}
                  placeholder="Enter patient complaints, symptoms, or reason for visit..."
                  rows={3}
                  className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
                  disabled={isLoading}
                />
                <p className="text-xs text-blue-700 mt-2">
                  Detailed complaints help in accurate diagnosis and treatment planning
                </p>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all duration-200 hover:shadow-md font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
                className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-semibold text-base disabled:opacity-50"
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
