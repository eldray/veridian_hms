// src/pages/LabResults.tsx - UPDATED WITH PDF GENERATION
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { LabTest, Attendance, Patient, LabTestEntry } from '../types';
import { 
  Search, 
  FlaskConical, 
  CheckCircle, 
  Clock, 
  Activity, 
  AlertCircle, 
  ArrowLeft, 
  User, 
  Calendar, 
  Printer,
  Plus,
  FileText
} from 'lucide-react';
import { generatePDF, openPrintWindow } from '../utils/pdfGenerator';

// Mock hospital data - replace with actual hospital data from your system
const mockHospital = {
  name: "City General Hospital",
  address: "123 Medical Center Drive, Healthcare City",
  phone: "+1 (555) 123-4567",
  email: "info@citygeneralhospital.com"
};

// Helper: Get consistent ID from entity
const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?._id || entity?.id;
};

export default function LabResults() {
  const navigate = useNavigate();
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [selectedTest, setSelectedTest] = useState<{
    attendanceId: string;
    testId: string;
  } | null>(null);
  const [result, setResult] = useState('');
  const [normalRange, setNormalRange] = useState('');
  const [units, setUnits] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isRequestingLab, setIsRequestingLab] = useState(false);
  const [currentLabRequest, setCurrentLabRequest] = useState<LabTestEntry>({
    templateId: '',
    name: '',
    priority: 'routine',
    notes: ''
  });

  const { 
    attendances, 
    updateLabTestStatus, 
    getAttendances, 
    addLabTestToAttendance 
  } = useAttendanceStore();
  const { patients, loadPatients } = usePatientStore();
  const { user } = useAuthStore();
  const { labTestTemplates, getLabTestTemplates } = useMedicalServicesStore();

  useEffect(() => {
    const loadData = async () => {
      await getAttendances();
      await loadPatients();
      await getLabTestTemplates();
    };
    loadData();
  }, [getAttendances, loadPatients, getLabTestTemplates]);

  // Enhanced patient matching function
  const findPatient = (attendance: any) => {
    if (attendance?.patient?.fullName) {
      return attendance.patient;
    }

    let actualPatientId: string | null = null;
    
    if (attendance.patientId && typeof attendance.patientId === 'object') {
      actualPatientId = (
        attendance.patientId._id ||
        attendance.patientId.id ||
        attendance.patientId.patientId ||
        attendance.patientId.patientID
      )?.toString();
    } else if (attendance.patientId) {
      actualPatientId = attendance.patientId.toString();
    }

    if (actualPatientId) {
      const patient = patients.find(p => {
        const patientId = getEntityId(p);
        return patientId === actualPatientId;
      });
      if (patient) return patient;
    }

    if (attendance.patient && typeof attendance.patient === 'object') {
      const patientObjId = getEntityId(attendance.patient);
      if (patientObjId) {
        const patient = patients.find(p => getEntityId(p) === patientObjId);
        if (patient) return patient;
      }
    }

    return null;
  };

  // Get attendances with lab tests and proper patient data
  const attendancesWithPatients = attendances.map(attendance => ({
    ...attendance,
    patient: findPatient(attendance)
  }));

  // Filter patients based on search term
  const filteredPatients = patients.filter(
    (p) =>
      p.fullName?.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.contact?.includes(patientSearch) ||
      p.folderNumber?.toLowerCase().includes(patientSearch.toLowerCase())
  );

  // Get attendances for selected patient
  const patientAttendances = attendancesWithPatients
    .filter(a => {
      const patient = a.patient;
      return patient && (getEntityId(patient) === selectedPatientId);
    })
    .map(attendance => ({
      ...attendance,
      patient: findPatient(attendance)
    }));

  // Get the latest pending attendance for auto-selection
  const getLatestPendingAttendance = () => {
    const pendingAttendances = patientAttendances.filter(a => a.status === 'pending');
    return pendingAttendances.sort((a, b) => 
      new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
    )[0];
  };

  // Lookup selected entities
  const selectedPatient = patients.find((p) => getEntityId(p) === selectedPatientId);
  const selectedAttendance = patientAttendances.find((a) => getEntityId(a) === selectedAttendanceId);

  // Auto-select latest pending attendance when patient is selected
  useEffect(() => {
    if (selectedPatientId && patientAttendances.length > 0) {
      const latestPending = getLatestPendingAttendance();
      if (latestPending) {
        setSelectedAttendanceId(getEntityId(latestPending) || '');
      } else {
        setSelectedAttendanceId(getEntityId(patientAttendances[0]) || '');
      }
    }
  }, [selectedPatientId, patientAttendances]);

  // Get lab tests for selected attendance
  const labTests = selectedAttendance?.labTests || [];
  const pendingTests = labTests.filter((t: LabTest) => t.status === 'requested' || t.status === 'in_progress');
  const completedTests = labTests.filter((t: LabTest) => t.status === 'completed');

  // Get selected test data
  const selectedTestData = selectedTest
    ? labTests.find((t: LabTest) => getEntityId(t) === selectedTest.testId)
    : null;

  // Check if lab test can be updated
  const canUpdateLabTest = selectedAttendance?.status === 'pending' || selectedAttendance?.status === 'active';
  const canRequestLab = selectedAttendance && (selectedAttendance.status === 'pending' || selectedAttendance.status === 'active');

  // Generate lab results PDF
  const handlePrintResults = () => {
    if (!selectedPatient || !selectedAttendance) {
      setMessage({ type: 'error', text: 'Please select a patient and attendance first' });
      return;
    }

    const completedTests = labTests.filter((t: LabTest) => t.status === 'completed');
    
    if (completedTests.length === 0) {
      setMessage({ type: 'error', text: 'No completed lab tests available for printing' });
      return;
    }

    const htmlContent = generatePDF('labResults', {
      labTests: completedTests,
      patient: selectedPatient,
      attendance: selectedAttendance,
      hospital: mockHospital
    }, mockHospital);

    openPrintWindow(htmlContent, `Lab Results - ${selectedPatient.fullName}`);
  };

  const handleSubmitResult = async () => {
    if (!selectedTest || !result.trim()) {
      setMessage({ type: 'error', text: 'Please enter test result' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (!canUpdateLabTest) {
      setMessage({ type: 'error', text: 'Cannot update lab results for completed or cancelled attendance' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setIsLoading(true);
    try {
      await updateLabTestStatus(
        selectedTest.attendanceId,
        selectedTest.testId,
        {
          status: 'completed',
          result: result,
          normalRange: normalRange || undefined,
          units: units || undefined,
          notes: notes || undefined,
          performedBy: user?._id || '',
          completedAt: new Date().toISOString(),
        }
      );
      setMessage({ type: 'success', text: 'Lab result submitted successfully' });
      // Reset form
      setSelectedTest(null);
      setResult('');
      setNormalRange('');
      setUnits('');
      setNotes('');
      // Refresh data
      await getAttendances();
    } catch (error) {
      console.error('Error submitting lab result:', error);
      setMessage({ type: 'error', text: 'Failed to submit lab result' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkInProgress = async (testId: string) => {
    if (!selectedAttendanceId) return;
    
    try {
      await updateLabTestStatus(selectedAttendanceId, testId, {
        status: 'in_progress',
        performedBy: user?._id || '',
      });
      setMessage({ type: 'success', text: 'Test marked as in progress' });
      await getAttendances();
    } catch (error) {
      console.error('Error updating test status:', error);
      setMessage({ type: 'error', text: 'Failed to update test status' });
    }
  };

  const handleRequestLabTest = async () => {
    if (!selectedAttendanceId || !currentLabRequest.templateId) {
      setMessage({ type: 'error', text: 'Please select a lab test to request' });
      return;
    }

    if (!canRequestLab) {
      setMessage({ type: 'error', text: `Cannot request lab tests for ${selectedAttendance?.status} attendance` });
      return;
    }

    setIsRequestingLab(true);
    try {
      const template = labTestTemplates.find((t) => t._id === currentLabRequest.templateId);
      if (!template) {
        setMessage({ type: 'error', text: 'Lab test template not found' });
        return;
      }

      const newTest: LabTest = {
        _id: `lab-${Date.now()}`,
        templateId: currentLabRequest.templateId,
        name: template.name,
        status: 'requested',
        priority: currentLabRequest.priority,
        requestedAt: new Date().toISOString(),
        notes: currentLabRequest.notes
      };

      await addLabTestToAttendance(selectedAttendanceId, newTest);
      setMessage({ type: 'success', text: 'Lab test requested successfully!' });
      
      // Reset form
      setCurrentLabRequest({
        templateId: '',
        name: '',
        priority: 'routine',
        notes: ''
      });
      
      await getAttendances();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to request lab test' });
    } finally {
      setIsRequestingLab(false);
    }
  };

  // Statistics
  const totalPending = pendingTests.filter((t: LabTest) => t.status === 'requested').length;
  const inProgressCount = pendingTests.filter((t: LabTest) => t.status === 'in_progress').length;
  const completedCount = completedTests.length;

  return (
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard/medical-entries')}
              className="p-3 hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <FlaskConical className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Laboratory Management</h1>
              <p className="text-blue-100 text-lg">Request lab tests and manage results</p>
            </div>
          </div>
          {selectedPatient && selectedAttendance && (
            <button
              onClick={handlePrintResults}
              disabled={completedTests.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-200 border border-white/20 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-5 h-5" />
              <span>Print Results</span>
            </button>
          )}
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center gap-3 border ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border-green-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Patient and Attendance Selection - SIDE BY SIDE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Selection */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
            <User className="w-5 h-5 text-blue-600" />
            Patient Selection
          </h2>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search patient by name, contact, or folder number..."
                value={patientSearch}
                onChange={(e) => {
                  setPatientSearch(e.target.value);
                  setShowPatientDropdown(true);
                }}
                onFocus={() => setShowPatientDropdown(true)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
              
              {/* Patient Search Results */}
              {showPatientDropdown && patientSearch && (
                <div className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto border border-gray-300 rounded-xl bg-white shadow-lg">
                  {filteredPatients.length > 0 ? (
                    filteredPatients.map((patient) => {
                      const pid = getEntityId(patient);
                      if (!pid) return null;
                      return (
                        <button
                          key={pid}
                          onClick={() => {
                            setSelectedPatientId(pid);
                            setPatientSearch(patient.fullName || '');
                            setShowPatientDropdown(false);
                          }}
                          className="w-full text-left p-4 hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                        >
                          <div className="font-semibold text-gray-900">{patient.fullName}</div>
                          <div className="text-sm text-gray-600">
                            {patient.gender} • {patient.contact} • {patient.folderNumber}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-4 text-gray-500 text-center">No patients found</div>
                  )}
                </div>
              )}
            </div>
            
            {selectedPatient && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl border border-blue-200">
                <div className="font-bold text-lg text-gray-900">{selectedPatient.fullName}</div>
                <div className="text-sm text-gray-700 mt-1">
                  {selectedPatient.age} years • {selectedPatient.gender} • {selectedPatient.folderNumber}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Attendance Selection */}
        {selectedPatientId && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
              <Calendar className="w-5 h-5 text-green-600" />
              Select Attendance
            </h2>
            
            {patientAttendances.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm mb-2">No attendances found for this patient</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <select
                    value={selectedAttendanceId}
                    onChange={(e) => setSelectedAttendanceId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white"
                  >
                    <option value="">Select an attendance...</option>
                    {patientAttendances.map((attendance) => {
                      const aid = getEntityId(attendance);
                      if (!aid) return null;
                      return (
                        <option key={aid} value={aid}>
                          {attendance.attendanceNumber} - {new Date(attendance.dateTime).toLocaleDateString()} - {attendance.status}
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Selected Attendance Details */}
                {selectedAttendance && (
                  <div className="p-4 border-2 border-blue-500 bg-blue-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {selectedAttendance.attendanceNumber}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {new Date(selectedAttendance.dateTime).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-600 capitalize">
                          {selectedAttendance.attendanceType?.replace('_', ' ')}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {/* Status Badge */}
                        <div className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                          selectedAttendance.status === 'active' 
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : selectedAttendance.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                            : 'bg-gray-100 text-gray-800 border-gray-200'
                        }`}>
                          {selectedAttendance.status}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      {selectedAttendance && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center shadow-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <span className="text-gray-600 text-sm font-medium">Pending Tests</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalPending}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shadow-lg">
                <FlaskConical className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-gray-600 text-sm font-medium">In Progress</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{inProgressCount}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center shadow-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-gray-600 text-sm font-medium">Completed</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{completedCount}</p>
          </div>
        </div>
      )}

      {/* Main Content - Split Layout */}
      {selectedAttendance && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Lab Requests & Management */}
          <div className="space-y-6">
            {/* Request New Lab Test */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Plus className="w-6 h-6 text-blue-600" />
                Request New Lab Test
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Lab Test *
                  </label>
                  <select
                    value={currentLabRequest.templateId}
                    onChange={(e) => {
                      const template = labTestTemplates.find(t => t._id === e.target.value);
                      setCurrentLabRequest({
                        ...currentLabRequest,
                        templateId: e.target.value,
                        name: template?.name || ''
                      });
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="">Select lab test...</option>
                    {labTestTemplates.map((template) => (
                      <option key={template._id} value={template._id}>
                        {template.name} {template.price ? `($${template.price})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={currentLabRequest.priority}
                    onChange={(e) => setCurrentLabRequest({
                      ...currentLabRequest,
                      priority: e.target.value as 'routine' | 'urgent'
                    })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={currentLabRequest.notes}
                    onChange={(e) => setCurrentLabRequest({
                      ...currentLabRequest,
                      notes: e.target.value
                    })}
                    rows={3}
                    placeholder="Any special instructions or notes..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>

                <button
                  onClick={handleRequestLabTest}
                  disabled={isRequestingLab || !currentLabRequest.templateId || !canRequestLab}
                  className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 hover:shadow-lg shadow-md font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRequestingLab ? 'Requesting...' : 'Request Lab Test'}
                </button>

                {!canRequestLab && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertCircle className="w-5 h-5" />
                      <span className="text-sm">Cannot request lab tests for {selectedAttendance?.status} attendance</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pending Lab Requests */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                Lab Requests ({pendingTests.length})
              </h2>
              
              {pendingTests.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">No pending lab requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingTests.map((test: LabTest) => (
                    <div
                      key={getEntityId(test)}
                      className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                        selectedTest?.testId === getEntityId(test)
                          ? 'bg-gradient-to-r from-blue-50 to-teal-50 border-blue-500 shadow-lg'
                          : test.status === 'in_progress'
                          ? 'bg-gradient-to-r from-blue-50 to-teal-50 border-blue-200 hover:border-blue-300'
                          : 'bg-gradient-to-br from-gray-50 to-yellow-50 border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() =>
                        setSelectedTest({
                          attendanceId: selectedAttendanceId,
                          testId: getEntityId(test) || '',
                        })
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-bold text-lg text-gray-900">{test.name}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            Requested: {new Date(test.requestedAt).toLocaleString()}
                          </p>
                          {test.priority === 'urgent' && (
                            <span className="inline-block mt-2 px-2 py-1 text-xs font-bold bg-red-100 text-red-800 rounded-full">
                              URGENT
                            </span>
                          )}
                          {test.notes && (
                            <p className="text-sm text-gray-500 mt-2">{test.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {test.status === 'requested' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkInProgress(getEntityId(test) || '');
                              }}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Start
                            </button>
                          )}
                          <span className={`px-3 py-1 text-sm font-bold rounded-full ${
                            test.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                          }`}>
                            {test.status === 'in_progress' ? 'In Progress' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Completed Tests */}
            {completedTests.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Completed Tests ({completedTests.length})
                </h3>
                <div className="space-y-3">
                  {completedTests.map((test: LabTest) => (
                    <div
                      key={getEntityId(test)}
                      className="p-4 bg-green-50 rounded-xl border border-green-200"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{test.name}</p>
                          <p className="text-sm text-gray-600">
                            Completed: {test.completedAt ? new Date(test.completedAt).toLocaleString() : 'N/A'}
                          </p>
                        </div>
                        <span className="px-3 py-1 text-sm font-bold rounded-full bg-green-100 text-green-800 border border-green-200">
                          Completed
                        </span>
                      </div>
                      {test.result && (
                        <div className="mt-2 p-3 bg-white rounded-lg border">
                          <p className="text-sm font-medium text-gray-700">Result: {test.result}</p>
                          {test.normalRange && (
                            <p className="text-sm text-gray-600">Normal Range: {test.normalRange}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Results Entry */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Activity className="w-6 h-6 text-blue-600" />
                Enter Test Result
              </h2>
              
              {!selectedTest ? (
                <div className="text-center py-12">
                  <FlaskConical className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">Select a test from the left to enter results</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-2xl p-6 border border-blue-200">
                    <p className="text-sm text-blue-900 font-medium mb-2">Selected Test</p>
                    <p className="font-bold text-xl text-blue-900 mb-2">{selectedTestData?.name}</p>
                    {selectedPatient && (
                      <p className="text-blue-900">
                        Patient: <span className="font-semibold">{selectedPatient.fullName}</span>
                      </p>
                    )}
                    {selectedTestData?.priority === 'urgent' && (
                      <span className="inline-block mt-2 px-3 py-1 text-sm font-bold bg-red-100 text-red-800 rounded-full border border-red-200">
                        URGENT
                      </span>
                    )}
                    {!canUpdateLabTest && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4">
                        <div className="flex items-center gap-2 text-red-800">
                          <AlertCircle className="w-5 h-5" />
                          <span className="font-medium">Cannot update lab results for {selectedAttendance?.status} attendance</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Test Result <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={result}
                      onChange={(e) => setResult(e.target.value)}
                      rows={4}
                      placeholder="Enter detailed test results..."
                      className="w-full px-4 py-4 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Normal Range
                      </label>
                      <input
                        type="text"
                        value={normalRange}
                        onChange={(e) => setNormalRange(e.target.value)}
                        placeholder="e.g., 0-100"
                        className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Units
                      </label>
                      <input
                        type="text"
                        value={units}
                        onChange={(e) => setUnits(e.target.value)}
                        placeholder="e.g., mg/dL"
                        className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Any additional observations or notes..."
                      className="w-full px-4 py-4 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                    />
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={handleSubmitResult}
                      disabled={isLoading || !result.trim() || !canUpdateLabTest}
                      className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 hover:shadow-lg shadow-md font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Submitting...' : 'Submit Result'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTest(null);
                        setResult('');
                        setNormalRange('');
                        setUnits('');
                        setNotes('');
                      }}
                      className="px-6 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedAttendance && selectedPatient && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <FlaskConical className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Attendance Selected</h3>
          <p className="text-gray-600">Select an attendance to view and manage lab tests</p>
        </div>
      )}

      {!selectedPatient && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Patient Selected</h3>
          <p className="text-gray-600">Search and select a patient to get started</p>
        </div>
      )}
    </div>
  );
}
