// src/pages/PatientDetails.tsx - UPDATED FOR SURNAME + OTHERNAMES
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useAuthStore } from '../store/authStore';
import { useInsuranceStore } from '../store/insuranceStore';
import { useToast } from '../store/toastStore';
import NewAttendanceModal from '../components/NewAttendanceModal';
import { ArrowLeft, Edit, Calendar, Users, FileText, Pill, FlaskConical, Scissors, DollarSign, RefreshCw, AlertCircle, Loader, Trash2 } from 'lucide-react';

export default function PatientDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const { currentPatient, fetchPatient, deletePatient } = usePatientStore();
  const { attendances, getAttendances } = useAttendanceStore();
  const { hasRole } = useAuthStore();
  const { providers: insuranceProviders, getInsuranceProviders } = useInsuranceStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'documents' | 'attendances' | 'medical-records'>('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalVisits: 0,
    completedVisits: 0,
    pendingVisits: 0,
    totalMedications: 0,
    totalLabTests: 0
  });
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Extract patient data properly from nested response
  const patient = useMemo(() => {
    if (!currentPatient) return null;
    
    // Handle different response formats
    if (currentPatient.data) {
      return currentPatient.data;
    } else if (currentPatient.success && currentPatient.data) {
      return currentPatient.data;
    } else {
      return currentPatient;
    }
  }, [currentPatient]);

  // ✅ ADDED: Get full name from surname + otherNames
  const getPatientFullName = (patient: any) => {
    return `${patient.surname || ''} ${patient.otherNames || ''}`.trim();
  };

  // Filter patient attendances
// ✅ FIXED: Simplified attendance filtering
const patientAttendances = useMemo(() => {
  if (!patient || !attendances.length) return [];
  
  const patientId = patient.id;
  console.log('🔍 Filtering attendances for patient:', patientId);
  console.log('📊 Total attendances to filter:', attendances.length);

  // Simple direct filtering - remove complex nested checks
  const filtered = attendances.filter(attendance => {
    // Direct patientId match (most common case)
    if (attendance.patientId === patientId) {
      return true;
    }
    
    // Handle populated patient object
    if (attendance.patient && attendance.patient.id === patientId) {
      return true;
    }
    
    return false;
  });

  console.log('✅ Found attendances for patient:', filtered.length);
  return filtered;
}, [attendances, patient]);

// ✅ FIXED: Improved data loading with better error handling
const loadData = async () => {
  if (!id) {
    toastError('Error', 'No patient ID provided');
    setIsLoading(false);
    return;
  }

  setIsLoading(true);
  setRefreshing(true);
  try {
    console.log('🔄 Loading patient details for ID:', id);
    
    // Load patient first, then other data
    await fetchPatient(id);
    
    // Only load other data if patient was found
    if (currentPatient) {
      await Promise.all([
        getAttendances({ patientId: id }), // ✅ FIXED: Filter attendances by patient ID
        getInsuranceProviders()
      ]);
    }
    
    console.log('✅ Patient details loaded successfully');
    
  } catch (err: any) {
    console.error('❌ Failed to load patient details:', err);
    const errorMsg = err.response?.data?.message || err.message || 'Could not load patient data';
    toastError('Load failed', errorMsg);
    
    // Redirect if patient not found
    if (err.response?.status === 404) {
      navigate('/dashboard/patients');
    }
  } finally {
    setIsLoading(false);
    setRefreshing(false);
  }
};

  useEffect(() => {
    loadData();
  }, [id, refreshTrigger]);

  // Recalculate stats when attendances change
  useEffect(() => {
    const totalVisits = patientAttendances.length;
    const completedVisits = patientAttendances.filter(a => a.status === 'completed').length;
    const pendingVisits = patientAttendances.filter(a => ['pending', 'active', 'in-progress'].includes(a.status)).length;
    const totalMedications = patientAttendances.reduce((sum, att) => sum + (att.medications?.length || 0), 0);
    const totalLabTests = patientAttendances.reduce((sum, att) => sum + (att.labTests?.length || 0), 0);

    setStats({ 
      totalVisits, 
      completedVisits, 
      pendingVisits, 
      totalMedications, 
      totalLabTests 
    });
  }, [patientAttendances]);

  const handleAttendanceSuccess = async () => {
    setShowAttendanceModal(false);
    try {
      // Refresh data
      await getAttendances();
      setActiveTab('attendances');
      setRefreshTrigger(prev => prev + 1);
      success('Check-in complete', 'New visit created');
    } catch {
      toastError('Refresh failed', 'Could not update visit list');
    }
  };

  const handleAttendanceClose = () => {
    setShowAttendanceModal(false);
  };

  const handleRefresh = () => {
    loadData();
  };

  const handleEdit = () => {
    navigate(`/dashboard/patients/register?edit=true&id=${patient?.id}`);
  };

  const handleNewAttendance = () => {
    setShowAttendanceModal(true);
  };

  const handleDeletePatient = async () => {
    if (!patient?.id) return;
    
    try {
      await deletePatient(patient.id);
      success('Patient Deleted', 'Patient record has been removed');
      navigate('/dashboard/patients');
    } catch (err: any) {
      toastError('Delete Failed', err.message || 'Failed to delete patient');
    }
  };

  // UI Helper Functions
  const getGenderColor = (gender: string) => {
    switch (gender?.toLowerCase()) {
      case 'male': return 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]';
      case 'female': return 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]';
      default: return 'bg-[var(--bg-main)] text-[var(--text-secondary)]';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'No date';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const canEdit = hasRole(['admin', 'doctor', 'nurse']);
  const canCreateAttendance = hasRole(['admin', 'doctor', 'nurse']);
  const canDelete = hasRole(['admin']);

  // Loading state
  if (isLoading && !refreshing) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] rounded-2xl shadow-lg border border-[var(--border-color)] p-10 max-w-md w-full">
          <Loader className="w-14 h-14 text-[var(--icon-cyan-text)] animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Loading Patient...</h2>
          <p className="text-[var(--text-secondary)]">Please wait while we load patient details.</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!patient) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] p-8 max-w-md w-full">
          <AlertCircle className="w-16 h-16 text-[var(--icon-red-text)] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Patient Not Found</h2>
          <p className="text-[var(--text-secondary)] mb-6 text-sm">
            The patient record does not exist or has been removed.
          </p>
          <button
            onClick={() => navigate('/dashboard/patients')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all duration-200 font-semibold text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Patients
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: Users },
    { id: 'attendances' as const, label: 'Visits', icon: Calendar, count: patientAttendances.length },
    { id: 'medical-records' as const, label: 'Medical', icon: FileText },
    { id: 'documents' as const, label: 'Documents', icon: FileText },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header - Matching Dashboard Style */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/patients')}
            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors bg-[var(--bg-card)] hover:bg-[var(--bg-main)] rounded-lg px-4 py-2 shadow-sm border border-[var(--border-color)]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Patient Details</h1>
            <p className="text-sm text-[var(--text-secondary)]">Record #{patient.folderNumber || patient.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm text-[var(--text-primary)]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          {canCreateAttendance && (
            <button
              onClick={handleNewAttendance}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white transition-all duration-200 font-semibold text-sm"
            >
              <Calendar className="w-4 h-4" />
              New Visit
            </button>
          )}

          {canEdit && (
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all duration-200 font-semibold text-sm"
            >
              <Edit className="w-4 h-4" />
              Edit Patient
            </button>
          )}

          {canDelete && (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-text)] hover:text-white transition-all duration-200 font-semibold text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Patient</h3>
                <p className="text-sm text-gray-600">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-gray-700 mb-4">
              Are you sure you want to delete <strong>{getPatientFullName(patient)}</strong>? 
              All patient records and visits will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeletePatient}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete Patient
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Header Card */}
      <div className="bg-[var(--bg-card)] rounded-xl p-6 shadow-sm border border-[var(--border-color)]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Patient Info Section */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-[var(--icon-cyan-bg)] rounded-xl flex items-center justify-center">
              <Users className="w-8 h-8 text-[var(--icon-cyan-text)]" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--text-primary)] leading-tight">
                    {getPatientFullName(patient)} {/* ✅ CHANGED */}
                  </h1>
                  <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-main)] px-3 py-1.5 rounded border mt-2 inline-block">
                    {patient.folderNumber || 'No Folder'} • {patient.ageDisplay || `${patient.age || 'N/A'} years`}
                  </p>
                </div>
                <span className={`px-3 py-1.5 text-sm font-semibold rounded-full ${getGenderColor(patient.gender)}`}>
                  {patient.gender?.charAt(0).toUpperCase() + patient.gender?.slice(1) || 'Unknown'}
                </span>
              </div>

              {/* Details Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">DOB: {formatDate(patient.dateOfBirth)}</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--text-primary)]">
                  <span className="font-semibold">Contact:</span> {patient.contact || 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-[var(--text-primary)]">
                  <span className="font-semibold">Payment:</span> {patient.paymentMode || 'Cash'}
                </div>
                <div className="flex items-center gap-2 text-[var(--text-primary)]">
                  <span className="font-semibold">Registered:</span> {formatDate(patient.createdAt)}
                </div>
              </div>

              {patient.address && (
                <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
                  <p className="text-[var(--text-primary)] text-sm">
                    <span className="font-semibold">Address:</span> {patient.address}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-[var(--bg-card)] rounded-xl p-4 text-center border border-[var(--border-color)]">
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalVisits}</p>
          <p className="text-xs text-[var(--text-secondary)]">Total Visits</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 text-center border border-[var(--border-color)]">
          <p className="text-2xl font-bold text-[var(--icon-green-text)]">{stats.completedVisits}</p>
          <p className="text-xs text-[var(--text-secondary)]">Completed</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 text-center border border-[var(--border-color)]">
          <p className="text-2xl font-bold text-[var(--icon-yellow-text)]">{stats.pendingVisits}</p>
          <p className="text-xs text-[var(--text-secondary)]">Pending</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 text-center border border-[var(--border-color)]">
          <p className="text-2xl font-bold text-[var(--icon-cyan-text)]">{stats.totalMedications}</p>
          <p className="text-xs text-[var(--text-secondary)]">Medications</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 text-center border border-[var(--border-color)]">
          <p className="text-2xl font-bold text-[var(--icon-purple-text)]">{stats.totalLabTests}</p>
          <p className="text-xs text-[var(--text-secondary)]">Lab Tests</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)]">
        <div className="border-b border-[var(--border-color)]">
          <nav className="flex flex-wrap gap-1 p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-2 px-4 rounded-lg font-medium transition-all duration-200 text-sm ${
                    activeTab === tab.id
                      ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-[var(--bg-main)] text-[var(--text-secondary)]'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl p-5 border border-blue-200">
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Basic Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-[var(--border-color)]">
                      <span className="text-[var(--text-secondary)] text-sm font-medium">Full Name</span>
                      <span className="font-bold text-[var(--text-primary)]">{getPatientFullName(patient)}</span> {/* ✅ CHANGED */}
                    </div>
                    <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-[var(--border-color)]">
                      <span className="text-[var(--text-secondary)] text-sm font-medium">Folder Number</span>
                      <span className="font-bold text-[var(--text-primary)]">{patient.folderNumber || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-[var(--border-color)]">
                      <span className="text-[var(--text-secondary)] text-sm font-medium">Gender</span>
                      <span className="font-bold text-[var(--text-primary)]">{patient.gender || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-[var(--border-color)]">
                      <span className="text-[var(--text-secondary)] text-sm font-medium">Date of Birth</span>
                      <span className="font-bold text-[var(--text-primary)]">{formatDate(patient.dateOfBirth)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-[var(--border-color)]">
                      <span className="text-[var(--text-secondary)] text-sm font-medium">Age</span>
                      <span className="font-bold text-[var(--text-primary)]">{patient.ageDisplay || `${patient.age || 'N/A'} years`}</span>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200">
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Contact Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-[var(--border-color)]">
                      <span className="text-[var(--text-secondary)] text-sm font-medium">Contact Number</span>
                      <span className="font-bold text-[var(--text-primary)]">{patient.contact || 'N/A'}</span>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-[var(--border-color)]">
                      <p className="text-[var(--text-secondary)] text-sm font-medium mb-1">Address</p>
                      <p className="font-bold text-[var(--text-primary)] text-sm">{patient.address || 'No address provided'}</p>
                    </div>
                    {patient.additionalInfo?.email && (
                      <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-[var(--border-color)]">
                        <span className="text-[var(--text-secondary)] text-sm font-medium">Email</span>
                        <span className="font-bold text-[var(--text-primary)]">{patient.additionalInfo.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional sections would go here */}
            </div>
          )}

          {activeTab !== 'profile' && (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" />
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Content
              </h3>
              <p className="text-[var(--text-secondary)] text-sm">
                {activeTab} details and management features are coming soon.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showAttendanceModal && (
        <NewAttendanceModal
          patientId={patient.id}
          onSuccess={handleAttendanceSuccess}
          onClose={handleAttendanceClose}
        />
      )}
    </div>
  );
}