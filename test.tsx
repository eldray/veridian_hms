// src/pages/MedicalEntries.tsx - UPDATED WITH PROPER PATIENT DATA FLOW
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useStockStore } from '../store/stockStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { useAuthStore } from '../store/authStore';
import type { Medication, LabTest, Procedure, Scan, Diagnosis } from '../types';
import {
  Stethoscope,
  Activity,
  Pill,
  FlaskConical,
  Save,
  Search,
  User,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Hospital,
  Shield,
  FileText,
  Scissors,
  Scan as ScanIcon,
  Plus,
  ArrowRight,
  Heart,
  RefreshCw
} from 'lucide-react';

export default function MedicalEntries() {
  const navigate = useNavigate();
  const { patients, loadPatients } = usePatientStore();
  const {
    attendances,
    getAttendances,
    addDiagnosisToAttendance,
    addLabTestToAttendance,
    addProcedureToAttendance,
    addScanToAttendance,
    addMedicationToAttendance,
    updateLabTestStatus,
    updateMedicationStatus,
    updateAttendance
  } = useAttendanceStore();
  const { stockItems, getStockItems } = useStockStore();
  const {
    diagnosisTemplates,
    labTestTemplates,
    procedureTemplates,
    getDiagnoses,
    getLabTestTemplates,
    getProcedureTemplates
  } = useMedicalServicesStore();
  const { user } = useAuthStore();

  // Load initial data
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        loadPatients(),
        getAttendances(),
        getStockItems(),
        getDiagnoses(),
        getLabTestTemplates(),
        getProcedureTemplates()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ✅ ADDED: Improved patient matching function (same as Attendance.tsx)
  const findPatient = (attendance: any) => {
    if (!attendance.patientId) {
      console.warn('❌ Attendance has no patientId:', attendance._id);
      return null;
    }

    // Try different ID formats and strategies
    const patient = patients.find((p) => {
      const patientId = p._id || p.id;
      const attendancePatientId = attendance.patientId;
      
      // Direct string comparison
      if (patientId?.toString() === attendancePatientId?.toString()) {
        return true;
      }
      
      // If attendance has populated patient data, use it directly
      if (attendance.patient && (attendance.patient._id === patientId || attendance.patient.id === patientId)) {
        return true;
      }
      
      return false;
    });

    if (!patient) {
      console.warn('❌ No patient found for attendance:', {
        attendanceId: attendance._id,
        attendancePatientId: attendance.patientId,
        availablePatients: patients.length,
        samplePatientIds: patients.slice(0, 3).map(p => ({ id: p._id || p.id, name: p.fullName }))
      });
    }

    return patient || attendance.patient; // Fallback to populated patient data
  };

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [selectedAttendance, setSelectedAttendance] = useState<string>('');

  // Clinical data state
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [notes, setNotes] = useState('');

  // Medications state
  const [medications, setMedications] = useState<Medication[]>([]);
  const [currentMed, setCurrentMed] = useState({
    stockItemId: '',
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
    quantity: 1,
    route: 'oral',
    instructions: ''
  });

  // Lab tests state
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [currentLab, setCurrentLab] = useState({
    templateId: '',
    name: '',
    priority: 'routine' as 'routine' | 'urgent',
    notes: ''
  });

  // Procedures state
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [currentProcedure, setCurrentProcedure] = useState({
    templateId: '',
    name: '',
    scheduledDate: '',
    notes: ''
  });

  // Scans state
  const [scans, setScans] = useState<Scan[]>([]);
  const [currentScan, setCurrentScan] = useState({
    scanType: '',
    description: '',
    bodyPart: '',
    priority: 'routine' as 'routine' | 'urgent',
    notes: ''
  });

  // Success/error state
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter patients based on search term
  const filteredPatients = patients.filter(
    (p) =>
      p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.contact.includes(searchTerm) ||
      p.folderNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ✅ IMPROVED: Get active attendances for selected patient with proper patient data
  const activeAttendances = attendances
    .filter(a => a.patientId === selectedPatient && ['pending', 'active'].includes(a.status))
    .map(attendance => ({
      ...attendance,
      patient: findPatient(attendance) // Attach patient data to each attendance
    }));

  // ✅ IMPROVED: Get patient and attendance data with proper matching
  const selectedPatientData = patients.find((p) => p._id === selectedPatient || p.id === selectedPatient);
  const selectedAttendanceData = activeAttendances.find((a) => 
    a._id === selectedAttendance || a.id === selectedAttendance
  );

  // Determine mode based on user role
  const canCreateEntries = ['admin', 'doctor', 'nurse'].includes(user?.role || '');

  // ✅ ADDED: Refresh function
  const handleRefresh = () => {
    loadData();
  };

  // ✅ ADDED: Debug logging for patient matching
  useEffect(() => {
    if (attendances.length > 0 && patients.length > 0) {
      console.log('🔍 MEDICAL ENTRIES DEBUG: Patient-Attendance Matching');
      console.log('Total attendances:', attendances.length);
      console.log('Total patients:', patients.length);
      
      const unmatchedAttendances = attendances.filter(attendance => {
        const patient = findPatient(attendance);
        return !patient;
      });

      if (unmatchedAttendances.length > 0) {
        console.warn('❌ Unmatched attendances in medical entries:', unmatchedAttendances.length);
      } else {
        console.log('✅ All attendances matched with patients in medical entries!');
      }
    }
  }, [attendances, patients]);

  const handleAddMedication = () => {
    if (!currentMed.stockItemId || !currentMed.dosage) {
      setMessage({ type: 'error', text: 'Please select medication and enter dosage' });
      return;
    }
    const stockItem = stockItems.find((s) => s._id === currentMed.stockItemId);
    if (!stockItem) {
      setMessage({ type: 'error', text: 'Stock item not found' });
      return;
    }
    const newMed: Medication = {
      _id: `med-${Date.now()}`,
      stockItemId: currentMed.stockItemId,
      name: stockItem.name,
      dosage: currentMed.dosage,
      frequency: currentMed.frequency,
      duration: currentMed.duration,
      quantity: currentMed.quantity,
      route: currentMed.route,
      instructions: currentMed.instructions,
      status: 'prescribed',
      prescribedAt: new Date().toISOString(),
      prescribedBy: user?.fullName || user?.username || ''
    };
    setMedications([...medications, newMed]);
    setCurrentMed({
      stockItemId: '',
      name: '',
      dosage: '',
      frequency: '',
      duration: '',
      quantity: 1,
      route: 'oral',
      instructions: ''
    });
    setMessage({ type: 'success', text: 'Medication added' });
    setTimeout(() => setMessage(null), 2000);
  };

  const handleAddLabTest = () => {
    if (!currentLab.templateId) {
      setMessage({ type: 'error', text: 'Please select a lab test' });
      return;
    }
    const template = labTestTemplates.find((t) => t._id === currentLab.templateId);
    if (!template) {
      setMessage({ type: 'error', text: 'Lab test template not found' });
      return;
    }
    const newTest: LabTest = {
      _id: `lab-${Date.now()}`,
      templateId: currentLab.templateId,
      name: template.name,
      status: 'requested',
      priority: currentLab.priority,
      requestedAt: new Date().toISOString(),
      notes: currentLab.notes
    };
    setLabTests([...labTests, newTest]);
    setCurrentLab({
      templateId: '',
      name: '',
      priority: 'routine',
      notes: ''
    });
    setMessage({ type: 'success', text: 'Lab test added' });
    setTimeout(() => setMessage(null), 2000);
  };

  const handleAddProcedure = () => {
    if (!currentProcedure.templateId || !currentProcedure.scheduledDate) {
      setMessage({ type: 'error', text: 'Please select procedure and schedule date' });
      return;
    }
    const template = procedureTemplates.find((t) => t._id === currentProcedure.templateId);
    if (!template) {
      setMessage({ type: 'error', text: 'Procedure template not found' });
      return;
    }
    const newProcedure: Procedure = {
      _id: `proc-${Date.now()}`,
      templateId: currentProcedure.templateId,
      name: template.name,
      status: 'scheduled',
      scheduledDate: currentProcedure.scheduledDate,
      notes: currentProcedure.notes
    };
    setProcedures([...procedures, newProcedure]);
    setCurrentProcedure({
      templateId: '',
      name: '',
      scheduledDate: '',
      notes: ''
    });
    setMessage({ type: 'success', text: 'Procedure added' });
    setTimeout(() => setMessage(null), 2000);
  };

  const handleAddScan = () => {
    if (!currentScan.scanType || !currentScan.description) {
      setMessage({ type: 'error', text: 'Please enter scan type and description' });
      return;
    }
    const newScan: Scan = {
      _id: `scan-${Date.now()}`,
      scanType: currentScan.scanType,
      description: currentScan.description,
      bodyPart: currentScan.bodyPart,
      status: 'requested',
      priority: currentScan.priority,
      requestedAt: new Date().toISOString(),
      notes: currentScan.notes
    };
    setScans([...scans, newScan]);
    setCurrentScan({
      scanType: '',
      description: '',
      bodyPart: '',
      priority: 'routine',
      notes: ''
    });
    setMessage({ type: 'success', text: 'Scan added' });
    setTimeout(() => setMessage(null), 2000);
  };

  const handleSubmitMedicalEntries = async () => {
    if (!selectedPatient || !selectedAttendance) {
      setMessage({ type: 'error', text: 'Please select a patient and active attendance' });
      return;
    }
    if (!chiefComplaint) {
      setMessage({ type: 'error', text: 'Chief complaint is required' });
      return;
    }
    setIsSubmitting(true);
    setMessage(null);
    try {
      // Update attendance with chief complaint and medical notes
      await updateAttendance(selectedAttendance, {
        complaints: chiefComplaint,
        medicalNotes: notes
      });

      // Add diagnosis if selected
      if (diagnosis) {
        await addDiagnosisToAttendance(selectedAttendance, {
          diagnosisId: diagnosis._id,
          name: diagnosis.name,
          icdCode: diagnosis.icdCode,
          notes: '',
          primary: true,
          date: new Date().toISOString()
        });
      }

      // Add lab tests
      for (const test of labTests) {
        await addLabTestToAttendance(selectedAttendance, test);
      }

      // Add procedures
      for (const procedure of procedures) {
        await addProcedureToAttendance(selectedAttendance, procedure);
      }

      // Add scans
      for (const scan of scans) {
        await addScanToAttendance(selectedAttendance, scan);
      }

      // Add medications
      for (const medication of medications) {
        await addMedicationToAttendance(selectedAttendance, medication);
      }

      setMessage({
        type: 'success',
        text: 'Medical entries saved successfully!'
      });

      // Reset form after 2 seconds
      setTimeout(() => {
        setChiefComplaint('');
        setDiagnosis(null);
        setNotes('');
        setMedications([]);
        setLabTests([]);
        setProcedures([]);
        setScans([]);
        setMessage(null);
      }, 2000);
    } catch (error: any) {
      console.error('Failed to save medical entries:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to save medical entries'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-6">
        <div className="text-center bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-12">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Medical Entries...</h2>
          <p className="text-gray-600">Please wait while we load patient and attendance data.</p>
        </div>
      </div>
    );
  }

  if (!canCreateEntries) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-6">
        <div className="text-center bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-12">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">You don't have permission to access medical entries.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Hospital className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Medical Entries</h1>
              <p className="text-blue-100 text-lg">
                Add diagnoses, medications, lab tests, procedures, and scans
              </p>
              <p className="text-blue-200 text-sm mt-1">
                {patients.length} patient(s) loaded • {attendances.length} attendance(s) found
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-200 border border-white/20 font-semibold disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={() => navigate('/dashboard/vitals')}
              className="flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-200 border border-white/20 font-semibold"
            >
              <Heart className="w-5 h-5" />
              <span>Record Vitals</span>
            </button>
          </div>
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
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Patient and Attendance Selection */}
      <div className="space-y-6">
        {/* Patient Selection */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
            <User className="w-5 h-5 text-blue-600" />
            Patient Selection
          </h2>
          <div className="space-y-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
              <input
                type="text"
                placeholder="Search patient by name, contact, or folder number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
            {searchTerm && (
              <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-xl bg-white">
                {filteredPatients.map((patient) => (
                  <button
                    key={patient._id || patient.id}
                    onClick={() => {
                      setSelectedPatient(patient._id || patient.id);
                      setSearchTerm('');
                      setSelectedAttendance('');
                    }}
                    className="w-full text-left p-4 hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                  >
                    <div className="font-semibold text-gray-900">{patient.fullName}</div>
                    <div className="text-sm text-gray-600">
                      {patient.gender} • {patient.contact} • {patient.folderNumber}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {selectedPatientData && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl border border-blue-200">
                <div className="font-bold text-lg text-gray-900">{selectedPatientData.fullName}</div>
                <div className="text-sm text-gray-700 mt-1">
                  {selectedPatientData.age} years • {selectedPatientData.gender} • {selectedPatientData.folderNumber}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Attendance Selection */}
        {selectedPatient && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
              <Calendar className="w-5 h-5 text-green-600" />
              Select Active Attendance
            </h2>
            {activeAttendances.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg mb-4">No active attendances found for this patient</p>
                <button
                  onClick={() => navigate('/dashboard/attendance/new')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
                >
                  Create New Attendance
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeAttendances.map((attendance) => (
                  <button
                    key={attendance._id || attendance.id}
                    onClick={() => setSelectedAttendance(attendance._id || attendance.id)}
                    className={`p-4 border-2 rounded-xl text-left transition-all duration-200 ${
                      selectedAttendance === (attendance._id || attendance.id)
                        ? 'border-blue-500 bg-blue-50 shadow-lg'
                        : 'border-gray-300 hover:border-gray-400 bg-white'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">
                      {attendance.attendanceNumber}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {new Date(attendance.dateTime).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-600 capitalize">
                      {attendance.attendanceType?.replace('_', ' ')}
                    </div>
                    {/* ✅ ADDED: Patient name display in attendance card */}
                    {attendance.patient && (
                      <div className="text-xs text-gray-500 mt-1">
                        Patient: {attendance.patient.fullName}
                      </div>
                    )}
                    <div className={`inline-block px-2 py-1 text-xs font-semibold rounded-full mt-2 ${
                      attendance.status === 'active'
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                    }`}>
                      {attendance.status}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Medical Entries Form */}
      {selectedAttendance && (
        <div className="space-y-6">
          {/* Clinical Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Clinical Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Chief Complaint *
                </label>
                <input
                  type="text"
                  placeholder="Patient's main concern"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Diagnosis
                </label>
                <select
                  value={diagnosis?._id || ''}
                  onChange={(e) => {
                    const selected = diagnosisTemplates.find(d => d._id === e.target.value);
                    setDiagnosis(selected || null);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="">Select diagnosis...</option>
                  {diagnosisTemplates.map((diag) => (
                    <option key={diag._id} value={diag._id}>
                      {diag.name} {diag.icdCode ? `(${diag.icdCode})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Medical Notes
                </label>
                <textarea
                  placeholder="Additional clinical notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>
          {/* Medications */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
              <Pill className="w-5 h-5 text-blue-600" />
              Medications
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select Medication
                  </label>
                  <select
                    value={currentMed.stockItemId}
                    onChange={(e) => {
                      const item = stockItems.find((s) => s._id === e.target.value);
                      setCurrentMed({
                        ...currentMed,
                        stockItemId: e.target.value,
                        name: item?.name || '',
                      });
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="">Select medication...</option>
                    {stockItems
                      .filter((s) => s.category === 'medication')
                      .map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.name} - Stock: {item.currentStock}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Dosage</label>
                  <input
                    type="text"
                    placeholder="e.g., 500mg"
                    value={currentMed.dosage}
                    onChange={(e) => setCurrentMed({ ...currentMed, dosage: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Frequency</label>
                  <input
                    type="text"
                    placeholder="e.g., Twice daily"
                    value={currentMed.frequency}
                    onChange={(e) => setCurrentMed({ ...currentMed, frequency: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Duration</label>
                  <input
                    type="text"
                    placeholder="e.g., 7 days"
                    value={currentMed.duration}
                    onChange={(e) => setCurrentMed({ ...currentMed, duration: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={currentMed.quantity}
                    onChange={(e) =>
                      setCurrentMed({ ...currentMed, quantity: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Route</label>
                  <select
                    value={currentMed.route}
                    onChange={(e) => setCurrentMed({ ...currentMed, route: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="oral">Oral</option>
                    <option value="iv">IV</option>
                    <option value="im">IM</option>
                    <option value="sc">SC</option>
                    <option value="topical">Topical</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Instructions</label>
                <input
                  type="text"
                  placeholder="Special instructions"
                  value={currentMed.instructions}
                  onChange={(e) => setCurrentMed({ ...currentMed, instructions: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
              <button
                onClick={handleAddMedication}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg font-semibold"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Add Medication
              </button>
              {/* Medication List */}
              {medications.length > 0 && (
                <div className="mt-4 border border-gray-300 rounded-xl overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Medication
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Dosage
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Frequency
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Duration
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Qty
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {medications.map((med) => (
                        <tr key={med._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{med.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{med.dosage}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{med.frequency}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{med.duration}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{med.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          {/* Lab Tests */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
              <FlaskConical className="w-5 h-5 text-blue-600" />
              Lab Tests
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Test</label>
                  <select
                    value={currentLab.templateId}
                    onChange={(e) => {
                      const template = labTestTemplates.find((t) => t._id === e.target.value);
                      setCurrentLab({
                        ...currentLab,
                        templateId: e.target.value,
                        name: template?.name || '',
                      });
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="">Select test...</option>
                    {labTestTemplates.map((template) => (
                      <option key={template._id} value={template._id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                  <select
                    value={currentLab.priority}
                    onChange={(e) => setCurrentLab({ ...currentLab, priority: e.target.value as any })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                  <input
                    type="text"
                    placeholder="Special instructions"
                    value={currentLab.notes}
                    onChange={(e) => setCurrentLab({ ...currentLab, notes: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
              <button
                onClick={handleAddLabTest}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg font-semibold"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Add Lab Test
              </button>
              {/* Lab Test List */}
              {labTests.length > 0 && (
                <div className="mt-4 border border-gray-300 rounded-xl overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Test Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {labTests.map((test) => (
                        <tr key={test._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{test.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 capitalize">{test.priority}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
                              Requested
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          {/* Procedures */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
              <Scissors className="w-5 h-5 text-blue-600" />
              Procedures
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Procedure</label>
                  <select
                    value={currentProcedure.templateId}
                    onChange={(e) => {
                      const template = procedureTemplates.find((t) => t._id === e.target.value);
                      setCurrentProcedure({
                        ...currentProcedure,
                        templateId: e.target.value,
                        name: template?.name || '',
                      });
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="">Select procedure...</option>
                    {procedureTemplates.map((template) => (
                      <option key={template._id} value={template._id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Scheduled Date
                  </label>
                  <input
                    type="datetime-local"
                    value={currentProcedure.scheduledDate}
                    onChange={(e) => setCurrentProcedure({ ...currentProcedure, scheduledDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                  <input
                    type="text"
                    placeholder="Procedure notes"
                    value={currentProcedure.notes}
                    onChange={(e) => setCurrentProcedure({ ...currentProcedure, notes: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
              <button
                onClick={handleAddProcedure}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg font-semibold"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Add Procedure
              </button>
              {/* Procedure List */}
              {procedures.length > 0 && (
                <div className="mt-4 border border-gray-300 rounded-xl overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Procedure
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Scheduled
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {procedures.map((procedure) => (
                        <tr key={procedure._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{procedure.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(procedure.scheduledDate).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                              Scheduled
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          {/* Scans */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
              <ScanIcon className="w-5 h-5 text-blue-600" />
              Scans & Imaging
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Scan Type</label>
                  <input
                    type="text"
                    placeholder="e.g., X-Ray, Ultrasound"
                    value={currentScan.scanType}
                    onChange={(e) => setCurrentScan({ ...currentScan, scanType: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                  <input
                    type="text"
                    placeholder="Scan description"
                    value={currentScan.description}
                    onChange={(e) => setCurrentScan({ ...currentScan, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Body Part</label>
                  <input
                    type="text"
                    placeholder="e.g., Chest, Abdomen"
                    value={currentScan.bodyPart}
                    onChange={(e) => setCurrentScan({ ...currentScan, bodyPart: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                  <select
                    value={currentScan.priority}
                    onChange={(e) => setCurrentScan({ ...currentScan, priority: e.target.value as any })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                <input
                  type="text"
                  placeholder="Special instructions"
                  value={currentScan.notes}
                  onChange={(e) => setCurrentScan({ ...currentScan, notes: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
              <button
                onClick={handleAddScan}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg font-semibold"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Add Scan
              </button>
              {/* Scan List */}
              {scans.length > 0 && (
                <div className="mt-4 border border-gray-300 rounded-xl overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Scan Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Body Part
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Priority
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {scans.map((scan) => (
                        <tr key={scan._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{scan.scanType}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{scan.description}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{scan.bodyPart}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 capitalize">{scan.priority}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSubmitMedicalEntries}
              disabled={isLoading}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 hover:shadow-xl shadow-lg flex items-center gap-3 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-6 h-6" />
                  <span>Save Medical Entries</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}