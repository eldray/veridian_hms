// src/components/NewAttendanceModal.tsx
import { useState, useEffect } from 'react';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { X, Save, User, AlertCircle, CheckCircle, CreditCard, Shield, Building } from 'lucide-react';
import AttendanceTypeSelector from './AttendanceTypeSelector';
import type { AttendanceType, PaymentMode } from '../types';

interface NewAttendanceModalProps {
  patientId: string;
  onSuccess: (attendance: any) => void;
  onClose: () => void;
}

export default function NewAttendanceModal({
  patientId,
  onSuccess,
  onClose
}: NewAttendanceModalProps) {
  const { createAttendance, isLoading, error } = useAttendanceStore();
  const { getPatientById } = usePatientStore();
  const { user } = useAuthStore();

  const [attendanceType, setAttendanceType] = useState<AttendanceType>('general_opd');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [nhisCCC, setNhisCCC] = useState('');
  const [complaints, setComplaints] = useState('');
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
  }, [patientId, getPatientById]);

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

    const attendanceData = {
      patientId,
      dateTime: new Date().toISOString(),
      attendanceType,
      paymentMode,
      nhisCCC: paymentMode === 'nhis' ? nhisCCC : undefined,
      complaints: complaints.trim() || 'No complaints recorded',
      attendingClinician: user.id || user._id,
      status: 'active'
    };

    console.log('📝 Submitting attendance data:', attendanceData);

    try {
      const newAttendance = await createAttendance(attendanceData);
      console.log('✅ Attendance created successfully:', newAttendance);
      
      setSuccess(true);
      setTimeout(() => {
        onSuccess(newAttendance);
      }, 1500);
    } catch (error: any) {
      console.error('❌ Failed to create attendance:', error);
      setFormError(error.message || 'Failed to create attendance');
    }
  };

  const paymentModes = [
    { id: 'cash', name: 'Cash', icon: CreditCard, color: 'gray' },
    { id: 'nhis', name: 'NHIS', icon: Shield, color: 'green' },
    { id: 'private_insurance', name: 'Private Insurance', icon: Building, color: 'blue' }
  ];

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Attendance Created!</h3>
          <p className="text-gray-600 mb-6">
            New attendance record has been successfully created for {patient?.fullName}.
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
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-teal-600 rounded-t-2xl p-6 text-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Create New Attendance</h2>
              <p className="text-blue-100 text-sm mt-1">
                {patient?.fullName} • {patient?.folderNumber}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Display */}
          {(formError || error) && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">{formError || error}</span>
              </div>
            </div>
          )}

          {/* Patient Info */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{patient?.fullName}</p>
                <p className="text-sm text-gray-600">
                  {patient?.folderNumber} • {patient?.gender} • {patient?.age} years
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Payment Mode Selection */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Payment Mode</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {paymentModes.map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = paymentMode === mode.id;
                  
                  return (
                    <button
                      type="button"
                      key={mode.id}
                      onClick={() => setPaymentMode(mode.id as PaymentMode)}
                      className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{mode.name}</p>
                          <p className="text-sm text-gray-600 capitalize">
                            {mode.id.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Attendance Type Selector */}
            <AttendanceTypeSelector
              attendanceType={attendanceType}
              onAttendanceTypeChange={setAttendanceType}
            />

            {/* NHIS CCC Code (only for NHIS patients) */}
            {paymentMode === 'nhis' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-yellow-600" />
                  NHIS Information
                </h3>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    NHIS CCC Code *
                  </label>
                  <input
                    type="text"
                    value={nhisCCC}
                    onChange={(e) => setNhisCCC(e.target.value)}
                    placeholder="Enter CCC code"
                    className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                    required
                    disabled={isLoading}
                  />
                  <p className="text-sm text-yellow-700 mt-2">
                    Required for NHIS claim processing
                  </p>
                </div>
              </div>
            )}

            {/* Complaints */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Patient Complaints</h3>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Presenting Complaints
                </label>
                <textarea
                  value={complaints}
                  onChange={(e) => setComplaints(e.target.value)}
                  placeholder="Enter patient complaints, symptoms, or reason for visit..."
                  rows={4}
                  className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                  disabled={isLoading}
                />
                <p className="text-sm text-blue-700 mt-2">
                  Detailed complaints help in accurate diagnosis and treatment planning
                </p>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center gap-3 pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 hover:shadow-lg shadow-md font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating Attendance...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-6 h-6" />
                    <span>Create Attendance</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-6 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold text-lg disabled:opacity-50"
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
