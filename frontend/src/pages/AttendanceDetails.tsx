// src/pages/AttendanceDetails.tsx - FULLY FIXED VERSION
import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Stethoscope, 
  CreditCard, 
  FileText,
  Pill,
  FlaskConical,
  Scissors,
  DollarSign,
  Edit,
  Plus,
  Hospital,
  Shield,
  Activity,
  Loader
} from 'lucide-react';

export default function AttendanceDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    currentAttendance, 
    getAttendance, 
    isLoading: attendanceLoading,
    error 
  } = useAttendanceStore();
  const { 
    patients, 
    loadPatients,
    isLoading: patientsLoading
  } = usePatientStore();
  const { hasRole, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'medications' | 'lab-tests' | 'procedures' | 'billing'>('overview');

  const isLoading = attendanceLoading || patientsLoading;

  // ✅ LOAD PATIENTS ON MOUNT
  useEffect(() => {
    loadPatients(); // Ensure patients are loaded
  }, [loadPatients]);

  useEffect(() => {
    if (id) {
      getAttendance(id);
    }
  }, [id, getAttendance]);

  // ✅ BULLETPROOF PATIENT MATCHING
  const patient = useMemo(() => {
    if (!currentAttendance?.patientId) return null;

    // If attendance has a populated patient object with fullName, use it
    if (currentAttendance.patient?.fullName) {
      return currentAttendance.patient;
    }

    // Convert to string to handle ObjectId vs string
    const attendancePatientId = currentAttendance.patientId.toString();

    // Find patient by _id or id
    const foundPatient = patients.find(p => {
      const pid = (p._id || p.id)?.toString();
      return pid === attendancePatientId;
    });

    return foundPatient || null;
  }, [currentAttendance, patients]);

  // Smart back navigation
  const handleBack = () => {
    if (location.key !== 'default') {
      navigate(-1);
    } else {
      navigate('/dashboard/attendance');
    }
  };

  // Safe clinician name extraction
  const getClinicianName = (attendance: any) => {
    const clinician = attendance.clinicianName || attendance.attendingClinician;
    if (!clinician) return 'Unknown Clinician';
    if (typeof clinician === 'object' && clinician !== null) {
      return clinician.fullName || clinician.username || clinician.name || 'Unknown Clinician';
    }
    return clinician || 'Unknown Clinician';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-6">
        <div className="text-center bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-12">
          <Loader className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Attendance...</h2>
          <p className="text-gray-600">Please wait while we load the attendance details.</p>
        </div>
      </div>
    );
  }

  if (error || !currentAttendance) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-6">
        <div className="text-center bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {error ? 'Error Loading Attendance' : 'Attendance Not Found'}
          </h2>
          <p className="text-gray-600 mb-6">
            {error || "The attendance record you're looking for doesn't exist."}
          </p>
          <button 
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg font-semibold"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const canEdit = hasRole(['admin', 'doctor', 'nurse']);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'medications', label: 'Medications', icon: Pill, count: currentAttendance.medications?.length || 0 },
    { id: 'lab-tests', label: 'Lab Tests', icon: FlaskConical, count: currentAttendance.labTests?.length || 0 },
    { id: 'procedures', label: 'Procedures', icon: Scissors, count: currentAttendance.procedures?.length || 0 },
    { id: 'billing', label: 'Billing', icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-2xl p-8 text-white shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-3 hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm"
                title="Go back to previous page"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold">
                  {currentAttendance.attendanceNumber || `ATT-${currentAttendance._id?.slice(-8)}`}
                </h1>
                <p className="text-blue-100 text-lg mt-1">
                  {patient?.fullName || `Patient ${currentAttendance.patientId?.toString().slice(-6) || 'Unknown'}`} • {new Date(currentAttendance.dateTime).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {canEdit && (
                <button className="flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-200 border border-white/20 font-semibold">
                  <Edit className="w-5 h-5" />
                  <span>Edit Record</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-2">
          <nav className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-3 py-4 px-6 rounded-xl font-semibold transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-lg'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          {activeTab === 'overview' && (
            <OverviewTab 
              attendance={currentAttendance} 
              patient={patient} 
              getClinicianName={getClinicianName} 
            />
          )}
          {activeTab === 'medications' && <MedicationsTab attendance={currentAttendance} />}
          {activeTab === 'lab-tests' && <LabTestsTab attendance={currentAttendance} />}
          {activeTab === 'procedures' && <ProceduresTab attendance={currentAttendance} />}
          {activeTab === 'billing' && <BillingTab attendance={currentAttendance} />}
        </div>
      </div>
    </div>
  );
}

// Overview Tab Component (unchanged - already good)
function OverviewTab({ attendance, patient, getClinicianName }: { 
  attendance: any; 
  patient: any;
  getClinicianName: (attendance: any) => string;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border border-red-200';
      case 'admitted': return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'active': return 'bg-blue-100 text-blue-800 border border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getPaymentModeLabel = (mode: string) => {
    switch (mode) {
      case 'cash': return 'Cash';
      case 'nhis': return 'NHIS';
      case 'private_insurance': return 'Private Insurance';
      default: return mode;
    }
  };

  const getAttendanceTypeLabel = (type: string) => {
    return type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'General OPD';
  };

  return (
    <div className="p-8 space-y-8">
      {/* Patient & Basic Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Patient Information */}
          {patient && (
            <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-2xl p-6 border border-blue-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <User className="w-6 h-6 text-blue-600" />
                Patient Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 font-medium">Patient Name</p>
                  <p className="font-bold text-lg text-gray-900">{patient.fullName}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 font-medium">Folder Number</p>
                  <p className="font-bold text-lg text-gray-900">{patient.folderNumber || 'N/A'}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 font-medium">Age & Gender</p>
                  <p className="font-bold text-lg text-gray-900">
                    {patient.age || 'N/A'} years • {patient.gender || 'N/A'}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 font-medium">Contact</p>
                  <p className="font-bold text-lg text-gray-900">{patient.contact || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Details */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Attendance Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <Calendar className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600 font-medium">Date & Time</p>
                  <p className="font-bold text-gray-900">
                    {new Date(attendance.dateTime).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <Stethoscope className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600 font-medium">Attendance Type</p>
                  <p className="font-bold text-gray-900">
                    {getAttendanceTypeLabel(attendance.attendanceType)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <CreditCard className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600 font-medium">Payment Mode</p>
                  <p className="font-bold text-gray-900">{getPaymentModeLabel(attendance.paymentMode)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <Activity className="w-8 h-8 text-yellow-600" />
                <div>
                  <p className="text-sm text-gray-600 font-medium">Status</p>
                  <span className={`px-4 py-2 text-sm font-bold rounded-full ${getStatusColor(attendance.status)}`}>
                    {/* In OverviewTab or main component */}
{attendance.status === 'pending' && (
  <div className="flex gap-2">
    <button onClick={() => activateAttendance(attendance._id)}>
      Activate Attendance
    </button>
    <button onClick={() => completeAttendance(attendance._id)}>
      Complete Attendance
    </button>
  </div>
)}

{attendance.status === 'active' && (
  <button onClick={() => completeAttendance(attendance._id)}>
    Complete Attendance
  </button>
)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Medical Information</h3>
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <p className="text-sm text-gray-600 font-medium mb-2">Complaints</p>
                <p className="font-semibold text-gray-900 text-lg">
                  {attendance.complaints || 'No complaints recorded'}
                </p>
              </div>
              {attendance.diagnosis && (
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <p className="text-sm text-gray-600 font-medium mb-2">Diagnosis</p>
                  <p className="font-semibold text-gray-900 text-lg">{attendance.diagnosis}</p>
                </div>
              )}
              {attendance.medicalNotes && (
                <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                  <p className="text-sm text-gray-600 font-medium mb-2">Medical Notes</p>
                  <p className="font-semibold text-gray-900">{attendance.medicalNotes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Vitals */}
          {attendance.vitals && Object.keys(attendance.vitals).some(key => attendance.vitals[key]) && (
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Vitals</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {attendance.vitals.bloodPressure && (
                  <div className="text-center bg-gradient-to-br from-blue-50 to-teal-50 rounded-xl p-4 border border-blue-200">
                    <p className="text-sm text-gray-600 font-medium">Blood Pressure</p>
                    <p className="font-bold text-2xl text-gray-900">{attendance.vitals.bloodPressure}</p>
                  </div>
                )}
                {attendance.vitals.temperature && (
                  <div className="text-center bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-4 border border-green-200">
                    <p className="text-sm text-gray-600 font-medium">Temperature</p>
                    <p className="font-bold text-2xl text-gray-900">{attendance.vitals.temperature}°C</p>
                  </div>
                )}
                {attendance.vitals.pulse && (
                  <div className="text-center bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                    <p className="text-sm text-gray-600 font-medium">Pulse</p>
                    <p className="font-bold text-2xl text-gray-900">{attendance.vitals.pulse}</p>
                  </div>
                )}
                {attendance.vitals.spo2 && (
                  <div className="text-center bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200">
                    <p className="text-sm text-gray-600 font-medium">SpO2</p>
                    <p className="font-bold text-2xl text-gray-900">{attendance.vitals.spo2}%</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Clinician & Quick Stats */}
        <div className="space-y-6">
          {/* Clinician Information */}
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Clinician</h3>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <p className="font-semibold text-gray-900 text-lg">
                {getClinicianName(attendance)}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-gradient-to-br from-gray-50 to-green-50 rounded-2xl p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white rounded-xl p-4 border border-gray-200">
                <span className="text-gray-600 font-medium">Medications</span>
                <span className="font-bold text-lg text-gray-900">{attendance.medications?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center bg-white rounded-xl p-4 border border-gray-200">
                <span className="text-gray-600 font-medium">Lab Tests</span>
                <span className="font-bold text-lg text-gray-900">{attendance.labTests?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center bg-white rounded-xl p-4 border border-gray-200">
                <span className="text-gray-600 font-medium">Procedures</span>
                <span className="font-bold text-lg text-gray-900">{attendance.procedures?.length || 0}</span>
              </div>
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl p-4 border border-blue-200">
                  <span className="font-bold text-gray-900">Total Bill</span>
                  <span className="font-bold text-xl text-gray-900">
                    ${attendance.totalBill?.toFixed(2) || '0.00'}
                  </span>
                </div>
                {(attendance.outstandingBalance || 0) > 0 && (
                  <div className="flex justify-between items-center bg-red-50 rounded-xl p-4 border border-red-200 mt-3">
                    <span className="font-semibold text-red-700">Outstanding</span>
                    <span className="font-bold text-lg text-red-700">
                      ${(attendance.outstandingBalance || 0).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Medications Tab Component (unchanged)
function MedicationsTab({ attendance }: { attendance: any }) {
  const medications = attendance.medications || [];

  if (medications.length === 0) {
    return (
      <div className="p-12 text-center">
        <Pill className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">No Medications</h3>
        <p className="text-gray-600 text-lg">No medications have been prescribed for this attendance.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="space-y-6">
        {medications.map((med: any, index: number) => (
          <div key={med.id || index} className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
              <h4 className="font-bold text-xl text-gray-900">{med.name || med.medicationName}</h4>
              {med.dispensed ? (
                <span className="px-4 py-2 bg-green-100 text-green-800 text-sm font-bold rounded-full border border-green-200">
                  Dispensed
                </span>
              ) : (
                <span className="px-4 py-2 bg-yellow-100 text-yellow-800 text-sm font-bold rounded-full border border-yellow-200">
                  Pending
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-sm text-gray-600 font-medium mb-1">Dosage</p>
                <p className="font-semibold text-gray-900 text-lg">{med.dosage || 'N/A'}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-sm text-gray-600 font-medium mb-1">Frequency</p>
                <p className="font-semibold text-gray-900 text-lg">{med.frequency || 'N/A'}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-sm text-gray-600 font-medium mb-1">Duration</p>
                <p className="font-semibold text-gray-900 text-lg">{med.duration || 'N/A'}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-sm text-gray-600 font-medium mb-1">Quantity</p>
                <p className="font-semibold text-gray-900 text-lg">{med.quantity || 'N/A'}</p>
              </div>
            </div>
            {med.dispensedAt && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Dispensed on <span className="font-semibold">{new Date(med.dispensedAt).toLocaleDateString()}</span>
                  {med.dispensedBy && (
                    <> by <span className="font-semibold">{med.dispensedBy}</span></>
                  )}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Lab Tests Tab Component (unchanged)
function LabTestsTab({ attendance }: { attendance: any }) {
  const labTests = attendance.labTests || [];

  if (labTests.length === 0) {
    return (
      <div className="p-12 text-center">
        <FlaskConical className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">No Lab Tests</h3>
        <p className="text-gray-600 text-lg">No lab tests have been requested for this attendance.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="space-y-6">
        {labTests.map((test: any, index: number) => (
          <div key={test.id || index} className="bg-gradient-to-br from-gray-50 to-purple-50 rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
              <h4 className="font-bold text-xl text-gray-900">{test.testName || test.name}</h4>
              <div className="flex items-center gap-2">
                {test.completed ? (
                  <span className="px-4 py-2 bg-green-100 text-green-800 text-sm font-bold rounded-full border border-green-200">
                    Completed
                  </span>
                ) : (
                  <span className="px-4 py-2 bg-yellow-100 text-yellow-800 text-sm font-bold rounded-full border border-yellow-200">
                    {test.requested ? 'Requested' : 'Pending'}
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-sm text-gray-600 font-medium mb-1">Test Type</p>
                <p className="font-semibold text-gray-900 text-lg">{test.testType || 'N/A'}</p>
              </div>
              {test.requestedAt && (
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 font-medium mb-1">Requested</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(test.requestedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              {test.completedAt && (
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 font-medium mb-1">Completed</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(test.completedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              {test.performedBy && (
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 font-medium mb-1">Performed By</p>
                  <p className="font-semibold text-gray-900">{test.performedBy}</p>
                </div>
              )}
            </div>
            {test.result && (
              <div className="bg-green-50 rounded-xl p-4 border border-green-200 mb-4">
                <p className="text-sm text-gray-600 font-medium mb-2">Result</p>
                <p className="font-semibold text-gray-900 text-lg">{test.result}</p>
              </div>
            )}
            {test.notes && (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <p className="text-sm text-gray-600 font-medium mb-2">Notes</p>
                <p className="text-gray-900">{test.notes}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Procedures Tab Component (unchanged)
function ProceduresTab({ attendance }: { attendance: any }) {
  const procedures = attendance.procedures || [];

  if (procedures.length === 0) {
    return (
      <div className="p-12 text-center">
        <Scissors className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">No Procedures</h3>
        <p className="text-gray-600 text-lg">No procedures have been performed for this attendance.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="space-y-6">
        {procedures.map((procedure: any, index: number) => (
          <div key={procedure.id || index} className="bg-gradient-to-br from-gray-50 to-orange-50 rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
              <h4 className="font-bold text-xl text-gray-900">{procedure.procedureName || procedure.name}</h4>
              {(procedure.cost || 0) > 0 && (
                <span className="px-4 py-2 bg-green-100 text-green-800 text-lg font-bold rounded-full border border-green-200">
                  ${(procedure.cost || 0).toFixed(2)}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-4">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-sm text-gray-600 font-medium mb-1">Description</p>
                <p className="font-semibold text-gray-900">{procedure.description || 'No description'}</p>
              </div>
              {procedure.performedAt && (
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 font-medium mb-1">Performed</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(procedure.performedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              {procedure.performedBy && (
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 font-medium mb-1">Performed By</p>
                  <p className="font-semibold text-gray-900">{procedure.performedBy}</p>
                </div>
              )}
            </div>
            {procedure.notes && (
              <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                <p className="text-sm text-gray-600 font-medium mb-2">Notes</p>
                <p className="text-gray-900">{procedure.notes}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Billing Tab Component (unchanged)
function BillingTab({ attendance }: { attendance: any }) {
  const totalBill = attendance.totalBill || 0;
  const paidAmount = attendance.paidAmount || 0;
  const outstandingBalance = totalBill - paidAmount;

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Billing Summary */}
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-8 border border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Billing Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white rounded-xl p-6 border border-gray-200">
              <span className="text-gray-600 font-medium text-lg">Total Bill</span>
              <span className="font-bold text-2xl text-gray-900">${totalBill.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center bg-white rounded-xl p-6 border border-gray-200">
              <span className="text-gray-600 font-medium text-lg">Paid Amount</span>
              <span className="font-bold text-2xl text-green-600">
                ${paidAmount.toFixed(2)}
              </span>
            </div>
            <div className="border-t pt-6">
              <div className={`flex justify-between items-center rounded-xl p-6 ${
                outstandingBalance > 0 
                  ? 'bg-red-50 border border-red-200' 
                  : 'bg-green-50 border border-green-200'
              }`}>
                <span className="font-bold text-xl text-gray-900">Outstanding Balance</span>
                <span className={`font-bold text-3xl ${
                  outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  ${outstandingBalance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Actions */}
        {outstandingBalance > 0 && (
          <div className="text-center">
            <Link
              to={`/dashboard/billing/${attendance._id || attendance.id}/payment`}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl font-bold text-lg"
            >
              <DollarSign className="w-6 h-6" />
              <span>Process Payment</span>
            </Link>
          </div>
        )}

        {/* Billing Details */}
        <div className="text-center bg-white rounded-2xl p-6 border border-gray-200">
          <p className="text-gray-600 text-lg">
            Payment Mode: <span className="font-bold text-gray-900 capitalize">{attendance.paymentMode}</span>
          </p>
          {attendance.nhisCCC && (
            <p className="text-gray-600 text-lg mt-2">
              NHIS CCC: <span className="font-bold text-gray-900">{attendance.nhisCCC}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
