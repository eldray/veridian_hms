// src/pages/Admissions.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAdmissionStore } from '../store/admissionStore';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import {
  Search,
  Plus,
  Users,
  Hospital,
  Calendar,
  Clock,
  CheckCircle,
  X,
  RefreshCw,
  ArrowRight,
  User,
  Stethoscope,
  FileText,
  Building,
  Phone,
  IdCard,
  LogOut
} from 'lucide-react';

// Helper: Get consistent ID
const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?._id || entity?.id;
};

const getPatientName = (patient: any): string => {
  if (!patient) return 'Unknown Patient';
  if (patient.fullName) return patient.fullName;
  return `${patient.surname || ''} ${patient.otherNames || ''}`.trim() || 'Unknown Patient';
};

// Admission Modal Component
const AdmissionModal = ({
  isOpen,
  onClose,
  onAdmit,
  attendances,
  patients,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdmit: (attendance: any) => void;
  attendances: any[];
  patients: any[];
}) => {
  const [selectedAttendance, setSelectedAttendance] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  if (!isOpen) return null;

  const findPatient = (attendance: any) => {
    if (attendance?.patient?.fullName) return attendance.patient;

    let actualPatientId = null;
    if (attendance.patientId && typeof attendance.patientId === 'object') {
      actualPatientId = getEntityId(attendance.patientId);
    } else if (attendance.patientId) {
      actualPatientId = attendance.patientId.toString();
    }

    if (actualPatientId) {
      const patient = patients.find(p => getEntityId(p) === actualPatientId);
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

  const attendancesWithPatients = attendances.map(a => ({
    ...a,
    patient: findPatient(a),
  }));

  const filteredAttendances = attendancesWithPatients.filter(a => {
    const patient = a.patient;
    const search = searchTerm.toLowerCase();
    return (
      getPatientName(patient).toLowerCase().includes(search) ||
      a.attendanceNumber?.toLowerCase().includes(search) ||
      patient?.folderNumber?.toLowerCase().includes(search) ||
      patient?.contact?.includes(search)
    );
  });

  const todayAttendances = filteredAttendances.filter(a => {
    const today = new Date().toDateString();
    return new Date(a.dateTime || a.createdAt).toDateString() === today;
  });

  const olderAttendances = filteredAttendances.filter(a => {
    const today = new Date().toDateString();
    return new Date(a.dateTime || a.createdAt).toDateString() !== today;
  });

  const filteredPatients = patients.filter(p =>
    getPatientName(p).toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.contact?.includes(searchTerm) ||
    p.folderNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Reusable card renderer
  const renderAttendanceCard = (attendance: any) => {
    const patient = attendance.patient;
    const isSelected = getEntityId(selectedAttendance) === getEntityId(attendance);

    return (
      <div
        key={getEntityId(attendance)}
        onClick={() => setSelectedAttendance(attendance)}
        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
          isSelected
            ? 'bg-[var(--icon-cyan-bg)] border-[var(--icon-cyan-text)] shadow-sm'
            : 'bg-[var(--bg-main)] border-[var(--border-color)] hover:border-[var(--icon-cyan-text)]'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h4 className="font-semibold text-[var(--text-primary)]">{getPatientName(patient)}</h4>
              <span className="text-xs bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] px-2 py-1 rounded-full">
                {attendance.attendanceNumber || 'N/A'}
              </span>
              {patient?.folderNumber && (
                <span className="text-xs bg-[var(--bg-main)] text-[var(--text-secondary)] px-2 py-1 rounded-full">
                  {patient.folderNumber}
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-[var(--text-secondary)] mb-2">
              <div className="flex items-center gap-1">
                <Stethoscope className="w-3 h-3" />
                <span className="text-xs">{attendance.attendingClinician || 'No clinician'}</span>
              </div>
              <div className="text-xs capitalize">
                {attendance.attendanceType?.replace('_', ' ') || 'outpatient'}
              </div>
              <div className="text-xs capitalize">
                {attendance.paymentMode || 'cash'}
              </div>
            </div>

            {patient && (
              <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)] mb-2">
                {patient.gender && (
                  <span className="capitalize">{patient.gender}</span>
                )}
                {patient.contact && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {patient.contact}
                  </span>
                )}
              </div>
            )}

            {attendance.complaints && (
              <p className="text-xs text-[var(--text-secondary)]">
                <strong>Complaints:</strong> {attendance.complaints}
              </p>
            )}

            <div className="text-xs text-[var(--text-tertiary)] mt-2">
              {new Date(attendance.dateTime || attendance.createdAt).toLocaleString()}
            </div>
          </div>
          <div className="ml-4">
            {isSelected ? (
              <CheckCircle className="w-5 h-5 text-[var(--icon-green-text)]" />
            ) : (
              <div className="w-5 h-5 border-2 border-[var(--border-color)] rounded-full" />
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-[var(--border-color)]">
        {/* Header */}
        <div className="bg-[var(--bg-card)] p-6 border-b border-[var(--border-color)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-[var(--icon-cyan-text)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Admit Patient</h2>
              <p className="text-[var(--text-secondary)] text-sm">Convert outpatient to inpatient admission</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-main)] rounded-lg transition-colors text-[var(--text-secondary)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-[var(--border-color)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search by patient name, attendance number, folder number, or contact..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowPatientDropdown(true);
              }}
              onFocus={() => setShowPatientDropdown(true)}
              className="w-full pl-10 pr-4 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all text-sm"
            />
            {showPatientDropdown && searchTerm && (
              <div className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto border border-[var(--border-color)] rounded-lg bg-[var(--bg-card)] shadow-lg">
                {filteredPatients.length > 0 ? (
                  filteredPatients.map(p => {
                    const pid = getEntityId(p);
                    if (!pid) return null;
                    return (
                      <button
                        key={pid}
                        onClick={() => {
                          setSearchTerm(getPatientName(p));
                          setShowPatientDropdown(false);
                        }}
                        className="w-full text-left p-3 hover:bg-[var(--bg-main)] border-b border-[var(--border-color)] last:border-b-0 transition-colors"
                      >
                        <div className="font-medium text-[var(--text-primary)]">{getPatientName(p)}</div>
                        <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2 mt-1">
                          <IdCard className="w-3 h-3" />
                          {p.folderNumber}
                          {p.contact && (
                            <>
                              <span>•</span>
                              <Phone className="w-3 h-3" />
                              {p.contact}
                            </>
                          )}
                          {p.gender && (
                            <>
                              <span>•</span>
                              <span className="capitalize">{p.gender}</span>
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-3 text-center text-[var(--text-secondary)]">No patients found</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {todayAttendances.length > 0 && (
            <div>
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-[var(--text-primary)]">
                <Calendar className="w-4 h-4 text-[var(--icon-green-text)]" />
                Today's Attendances ({todayAttendances.length})
              </h3>
              <div className="space-y-2">
                {todayAttendances.map(attendance => renderAttendanceCard(attendance))}
              </div>
            </div>
          )}

          {olderAttendances.length > 0 && (
            <div>
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-[var(--text-primary)]">
                <Clock className="w-4 h-4 text-[var(--icon-yellow-text)]" />
                Previous Attendances ({olderAttendances.length})
              </h3>
              <div className="space-y-2">
                {olderAttendances.map(attendance => renderAttendanceCard(attendance))}
              </div>
            </div>
          )}

          {filteredAttendances.length === 0 && searchTerm && (
            <div className="text-center py-8 text-[var(--text-secondary)]">
              <User className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
              <p className="text-sm font-medium mb-1">No attendances found</p>
              <p className="text-xs">Try adjusting your search criteria</p>
            </div>
          )}

          {filteredAttendances.length === 0 && !searchTerm && (
            <div className="text-center py-8 text-[var(--text-secondary)]">
              <User className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
              <p className="text-sm font-medium mb-1">No outpatient attendances available</p>
              <p className="text-xs">All patients have already been admitted or there are no pending outpatient cases</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[var(--border-color)] bg-[var(--bg-main)] flex justify-between items-center">
          <div className="text-sm text-[var(--text-secondary)]">
            {selectedAttendance ? (
              <span>Selected: <strong className="text-[var(--text-primary)]">{getPatientName(selectedAttendance.patient)}</strong></span>
            ) : (
              <span>Please select a patient to admit</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-card)] transition-all text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => onAdmit(selectedAttendance)}
              disabled={!selectedAttendance}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
            >
              Continue to Admission
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Admissions() {
  const { success, error } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { admissions, getAdmissions, createAdmission, dischargePatient } = useAdmissionStore();
  const { patients, loadPatients } = usePatientStore();
  const { attendances, getAttendances, updateAttendance } = useAttendanceStore();
  const { user, hasRole } = useAuthStore();

  const loadData = async () => {
    try {
      setRefreshing(true);
      setIsLoading(true);
      await Promise.all([
        getAdmissions(),
        loadPatients(),
        getAttendances({ status: 'pending' }),
      ]);
      success('Data Loaded', 'Admissions data refreshed successfully');
    } catch (err: any) {
      console.error('❌ Error loading admissions data:', err);
      error('Load Failed', err.response?.data?.message || 'Failed to load admissions data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Patient lookup functions
  const findPatient = (attendance: any) => {
    if (attendance?.patient?.fullName) return attendance.patient;
    const pid = getEntityId(attendance.patientId) || getEntityId(attendance.patient);
    return patients.find(p => getEntityId(p) === pid) || null;
  };

  const findAdmissionPatient = (admission: any) => {
    const pid = getEntityId(admission.patientId) || getEntityId(admission.patient);
    return patients.find(p => getEntityId(p) === pid) || null;
  };

  // Filtered data
  const attendancesWithPatients = attendances.map(a => ({ 
    ...a, 
    patient: findPatient(a) 
  }));

  const activeAdmissions = admissions.filter(a => a.status === 'admitted');
  const dischargedAdmissions = admissions.filter(a => a.status === 'discharged');

  const admitableAttendances = attendancesWithPatients.filter(a =>
    a.status === 'pending' &&
    !admissions.some(adm => getEntityId(adm.attendance) === getEntityId(a) || adm.attendanceId === getEntityId(a))
  );

  const displayedAdmissions = searchQuery
    ? activeAdmissions.filter(a => {
        const patient = findAdmissionPatient(a);
        const q = searchQuery.toLowerCase();
        return (
          a.admissionNumber?.toLowerCase().includes(q) ||
          getPatientName(patient).toLowerCase().includes(q) ||
          patient?.folderNumber?.toLowerCase().includes(q) ||
          a.diagnosis?.toLowerCase().includes(q) ||
          a.admittingDoctor?.toLowerCase().includes(q)
        );
      })
    : activeAdmissions;

  // Permissions
  const canAdmitPatient = hasRole(['admin', 'doctor', 'nurse']);
  const canDischargePatient = hasRole(['admin', 'doctor']);

  // Statistics - Focused on admissions only
  const stats = {
    activeAdmissions: activeAdmissions.length,
    pendingAdmissions: admitableAttendances.length,
    dischargedAdmissions: dischargedAdmissions.length,
    totalAdmissions: admissions.length,
  };

  // Handlers
  const handleAdmitPatient = async (attendance: any) => {
    if (!attendance) return;

    try {
      console.log('🔍 Starting admission process for:', attendance);

      // Update attendance status
      await updateAttendance(getEntityId(attendance)!, {
        attendanceType: 'inpatient',
        status: 'admitted',
      });

      const patient = attendance.patient;
      if (!patient) {
        throw new Error('Patient information not found');
      }

      const admissionData = {
        attendanceId: getEntityId(attendance),
        patientId: getEntityId(patient),
        admissionNumber: `ADM-${Date.now()}`,
        admissionDate: new Date().toISOString(),
        admittingDoctor: user?.fullName || user?.username || 'Unknown Doctor',
        diagnosis: attendance.complaints || 'To be determined',
        status: 'admitted',
        complaints: attendance.complaints,
        paymentMode: attendance.paymentMode,
        attendanceNumber: attendance.attendanceNumber,
        originalAttendanceType: 'outpatient',
      };

      console.log('📝 Creating admission with data:', admissionData);
      await createAdmission(admissionData);

      // Refresh data
      await Promise.all([
        getAdmissions(),
        getAttendances({ status: 'pending' }),
      ]);

      setShowAdmissionModal(false);
      success('Patient Admitted!', `${getPatientName(patient)} has been successfully admitted.`);
    } catch (err: any) {
      console.error('❌ Admission error:', err);
      error('Admission Failed', err.response?.data?.message || 'Failed to admit patient. Please try again.');
    }
  };

  const handleDischargePatient = async (admission: any) => {
    const patient = findAdmissionPatient(admission);
    if (!window.confirm(`Are you sure you want to discharge ${getPatientName(patient)}?`)) {
      return;
    }

    try {
      const dischargeData = {
        dischargeDate: new Date().toISOString().split('T')[0],
        dischargeTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
        dischargeStatus: 'home',
        dischargeSummary: 'Patient discharged successfully',
      };

      await dischargePatient(getEntityId(admission)!, dischargeData);
      await getAdmissions();
      success('Patient Discharged!', `${getPatientName(patient)} has been successfully discharged.`);
    } catch (err: any) {
      console.error('❌ Discharge error:', err);
      error('Discharge Failed', err.response?.data?.message || 'Failed to discharge patient. Please try again.');
    }
  };

  const handleViewMedicalEntries = (admission: any) => {
    const patient = findAdmissionPatient(admission);
    if (patient) {
      // Navigate to medical entries page
      console.log('Navigate to medical entries for:', getPatientName(patient));
      success('Navigation', 'Would navigate to medical entries page');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] rounded-xl p-8 border border-[var(--border-color)]">
          <div className="w-12 h-12 border-4 border-[var(--icon-cyan-text)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Loading Admissions...</h2>
          <p className="text-[var(--text-secondary)] text-sm">Please wait while we load the admissions data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Patient Admissions</h1>
          <p className="text-[var(--text-secondary)] text-sm">Manage inpatient admissions and patient care</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/wards"
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm text-[var(--text-primary)]"
          >
            <Building className="w-4 h-4" />
            Manage Wards
          </Link>
          <button
            onClick={loadData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 transition-all text-sm text-[var(--text-primary)]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          {canAdmitPatient && (
            <button
              onClick={() => setShowAdmissionModal(true)}
              disabled={admitableAttendances.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Admit Patient {admitableAttendances.length > 0 && `(${admitableAttendances.length})`}
            </button>
          )}
        </div>
      </div>

      {/* Statistics Cards - Admissions Focused */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { 
            icon: Users, 
            label: 'Active Admissions', 
            value: stats.activeAdmissions, 
            bgColor: 'bg-[var(--icon-green-bg)]',
            textColor: 'text-[var(--icon-green-text)]'
          },
          { 
            icon: Clock, 
            label: 'Pending', 
            value: stats.pendingAdmissions, 
            bgColor: 'bg-[var(--icon-yellow-bg)]',
            textColor: 'text-[var(--icon-yellow-text)]'
          },
          { 
            icon: CheckCircle, 
            label: 'Discharged', 
            value: stats.dischargedAdmissions, 
            bgColor: 'bg-[var(--icon-cyan-bg)]',
            textColor: 'text-[var(--icon-cyan-text)]'
          },
          { 
            icon: Hospital, 
            label: 'Total', 
            value: stats.totalAdmissions, 
            bgColor: 'bg-[var(--icon-purple-bg)]',
            textColor: 'text-[var(--icon-purple-text)]'
          },
        ].map((stat, index) => (
          <div key={index} className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-[var(--text-primary)]">{stat.value}</p>
                <p className="text-xs text-[var(--text-secondary)] font-medium">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Admission Modal */}
      <AdmissionModal
        isOpen={showAdmissionModal}
        onClose={() => setShowAdmissionModal(false)}
        onAdmit={handleAdmitPatient}
        attendances={admitableAttendances}
        patients={patients}
      />

      {/* Search Bar */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search admissions by patient name, folder number, admission number, diagnosis, or doctor..."
            className="w-full pl-10 pr-4 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all text-sm"
          />
        </div>
      </div>

      {/* Active Admissions List */}
      <div className="bg-[var(--bg-card)] rounded-xl p-6 shadow-sm border border-[var(--border-color)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-[var(--text-primary)]">
            <Users className="w-5 h-5 text-[var(--icon-green-text)]" />
            Active Admissions ({activeAdmissions.length})
          </h2>
          {activeAdmissions.length > 0 && (
            <div className="text-sm text-[var(--text-secondary)]">
              Showing {displayedAdmissions.length} of {activeAdmissions.length} admissions
            </div>
          )}
        </div>

        {displayedAdmissions.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto mb-4 text-[var(--text-tertiary)]" />
            <p className="text-[var(--text-secondary)] text-sm mb-2">
              {searchQuery ? 'No matching admissions found' : 'No active admissions'}
            </p>
            <p className="text-[var(--text-tertiary)] text-xs mb-6">
              {searchQuery 
                ? 'Try adjusting your search criteria'
                : 'Admit patients from outpatient attendances to see them here'
              }
            </p>
            {admitableAttendances.length > 0 && canAdmitPatient && !searchQuery && (
              <button
                onClick={() => setShowAdmissionModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Admit Patient ({admitableAttendances.length} available)
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayedAdmissions.map(admission => {
              const patient = findAdmissionPatient(admission);
              const admissionDate = new Date(admission.admissionDate || admission.createdAt);
              const daysInHospital = Math.floor((Date.now() - admissionDate.getTime()) / (1000 * 60 * 60 * 24));
              
              return (
                <div key={getEntityId(admission)} className="bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)] hover:shadow-sm transition-all">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Patient Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap mb-3">
                        <h3 className="font-bold text-[var(--text-primary)]">{getPatientName(patient)}</h3>
                        <span className="text-xs bg-[var(--bg-main)] text-[var(--text-secondary)] px-2 py-1 rounded-full border">
                          {admission.admissionNumber || 'N/A'}
                        </span>
                        {patient?.folderNumber && (
                          <span className="text-xs bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] px-2 py-1 rounded-full border border-[var(--icon-cyan-text)]">
                            {patient.folderNumber}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-[var(--text-secondary)] mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[var(--icon-green-text)]" />
                          <span className="text-xs">Admitted: {admissionDate.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[var(--icon-purple-text)]" />
                          <span className="text-xs">{daysInHospital} day(s) in hospital</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-[var(--icon-red-text)]" />
                          <span className="text-xs">Dr. {admission.admittingDoctor || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                          <span className="text-xs">{patient?.gender || 'Unknown'} • {patient?.contact || 'No contact'}</span>
                        </div>
                      </div>

                      {admission.diagnosis && (
                        <p className="text-sm text-[var(--text-primary)] mb-2">
                          <strong>Diagnosis:</strong> {admission.diagnosis}
                        </p>
                      )}

                      {admission.complaints && (
                        <p className="text-sm text-[var(--text-secondary)]">
                          <strong>Presenting Complaints:</strong> {admission.complaints}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => handleViewMedicalEntries(admission)}
                        className="flex items-center gap-2 px-3 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] text-xs rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all font-medium"
                      >
                        <FileText className="w-3 h-3" />
                        Medical Entries
                      </button>
                      {canDischargePatient && (
                        <button
                          onClick={() => handleDischargePatient(admission)}
                          className="flex items-center gap-2 px-3 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] text-xs rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white transition-all font-medium"
                        >
                          <LogOut className="w-3 h-3" />
                          Discharge
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}