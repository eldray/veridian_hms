// src/pages/Admissions.tsx - COMPLETE REDESIGNED VERSION
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAdmissionStore } from '../store/admissionStore';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { useHospitalStore } from '../store/hospitalStore';
import { generatePDF, openPrintWindow } from '../utils/pdfGenerator';
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
  User,
  Stethoscope,
  FileText,
  Building,
  Phone,
  IdCard,
  Printer,
  LogOut,
  Bed,
  AlertCircle,
  Loader2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter
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

// Helper: Calculate age
const calculateAge = (dateOfBirth: string): number => {
  if (!dateOfBirth) return 0;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

type DateFilterType = 'today' | 'yesterday' | 'custom';

export default function Admissions() {
  const { success, error } = useToast();
  const { hospital } = useHospitalStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAdmission, setSelectedAdmission] = useState<any>(null);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  
  // Date filter states
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { admissions, getAdmissions, dischargePatient, getAdmissionStats, admissionStats } = useAdmissionStore();
  const { patients, loadPatients } = usePatientStore();
  const { attendances, getAttendances, updateAttendance } = useAttendanceStore();
  const { user, hasRole } = useAuthStore();

  // Helper: Get date range based on filter
  const getDateRange = (): { startDate: Date; endDate: Date } | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    
    switch (dateFilter) {
      case 'today':
        return { startDate: today, endDate: endOfDay };
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const endOfYesterday = new Date(yesterday);
        endOfYesterday.setHours(23, 59, 59, 999);
        yesterday.setHours(0, 0, 0, 0);
        return { startDate: yesterday, endDate: endOfYesterday };
      case 'custom':
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          return { startDate: start, endDate: end };
        }
        return null;
      default:
        return null;
    }
  };

  const loadData = async () => {
    try {
      setRefreshing(true);
      setIsLoading(true);
      await Promise.all([
        getAdmissions(),
        loadPatients(),
        getAttendances(),
        getAdmissionStats(),
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

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFilter, customStartDate, customEndDate]);

// Replace the findPatient function with this improved version:

// Find patient for admission - IMPROVED VERSION
const findPatient = (admission: any) => {
  if (!admission) return null;
  
  // Debug logging to see what we're dealing with
  console.log('🔍 Finding patient for admission:', {
    admissionId: admission.id,
    patientId: admission.patientId,
    patient: admission.patient,
    patientsCount: patients.length
  });
  
  // Try multiple ways to get the patient ID
  let patientId = null;
  
  // Method 1: Direct patientId field
  if (admission.patientId) {
    patientId = typeof admission.patientId === 'object' 
      ? getEntityId(admission.patientId) 
      : admission.patientId;
  }
  
  // Method 2: From patient object
  if (!patientId && admission.patient) {
    patientId = getEntityId(admission.patient);
  }
  
  // Method 3: From nested object
  if (!patientId && admission.Patient) {
    patientId = getEntityId(admission.Patient);
  }
  
  if (!patientId) {
    console.warn('⚠️ No patientId found for admission:', admission.id);
    return null;
  }
  
  // Find patient by comparing IDs (convert both to strings for comparison)
  const foundPatient = patients.find(p => {
    const pId = getEntityId(p);
    return pId && String(pId) === String(patientId);
  });
  
  if (!foundPatient) {
    console.warn(`⚠️ Patient not found for ID: ${patientId} (type: ${typeof patientId})`);
    console.log('Available patient IDs:', patients.map(p => getEntityId(p)));
  }
  
  return foundPatient;
};

  // Filter admissions by search and date
  const filteredAdmissions = useMemo(() => {
    if (!admissions.length) return [];
    
    const dateRange = getDateRange();
    
    const filtered = admissions.filter(admission => {
      // Date filtering based on admission date
      if (dateRange) {
        const admissionDate = new Date(admission.admissionDate || admission.createdAt);
        if (admissionDate < dateRange.startDate || admissionDate > dateRange.endDate) {
          return false;
        }
      }
      
      // Search filtering
      if (searchQuery) {
        const patient = findPatient(admission);
        const fullName = patient ? getPatientName(patient) : '';
        const lower = searchQuery.toLowerCase();
        return (
          admission.admissionNumber?.toLowerCase().includes(lower) ||
          fullName.toLowerCase().includes(lower) ||
          patient?.folderNumber?.toLowerCase().includes(lower) ||
          admission.diagnosis?.toLowerCase().includes(lower) ||
          admission.admittingDoctor?.toLowerCase().includes(lower) ||
          admission.status?.toLowerCase().includes(lower)
        );
      }
      
      return true;
    });
    
    return filtered.sort((a, b) => 
      new Date(b.admissionDate || b.createdAt).getTime() - new Date(a.admissionDate || a.createdAt).getTime()
    );
  }, [admissions, patients, searchQuery, dateFilter, customStartDate, customEndDate]);

  // Separate by status for stats
  const activeAdmissions = filteredAdmissions.filter(a => a.status === 'admitted');
  const dischargedAdmissions = filteredAdmissions.filter(a => a.status === 'discharged');

  // Pagination
  const totalPages = Math.ceil(filteredAdmissions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAdmissions = filteredAdmissions.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  // Get date filter display text
  const getDateFilterDisplay = () => {
    switch (dateFilter) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'custom': 
        if (customStartDate && customEndDate) {
          const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return `${formatDate(customStartDate)} - ${formatDate(customEndDate)}`;
        }
        return 'Custom Range';
      default: return 'Today';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'admitted': return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]';
      case 'discharged': return 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]';
      default: return 'bg-[var(--bg-main)] text-[var(--text-secondary)]';
    }
  };

  // Print Discharge Summary using pdfGenerator
  const handlePrintDischargeSummary = async (admission: any) => {
    const patient = findPatient(admission);
    if (!patient) {
      error('Print Failed', 'Patient information not found');
      return;
    }

    try {
      const dischargeData = {
        admission: {
          admissionNumber: admission.admissionNumber,
          admissionDate: admission.admissionDate,
          dischargeDate: admission.dischargeDate || new Date().toISOString(),
          dischargeStatus: admission.dischargeStatus || 'home',
          lengthOfStay: admission.lengthOfStay || 0,
          admissionType: admission.admissionType || 'emergency',
          dischargeSummary: admission.dischargeSummary || 'Patient discharged successfully.',
          attendingDoctor: admission.admittingDoctor || 'Unknown',
          wardName: admission.ward?.wardName || 'General Ward',
          bedNumber: admission.bed?.bedNumber || 'N/A'
        },
        attendance: {
          attendanceNumber: admission.attendance?.attendanceNumber || 'N/A',
          dateTime: admission.admissionDate,
          attendingClinician: admission.admittingDoctor
        },
        patient: {
          fullName: getPatientName(patient),
          folderNumber: patient.folderNumber,
          contact: patient.contact,
          age: calculateAge(patient.dateOfBirth),
          gender: patient.gender,
          id: patient.id
        },
        clinicalData: {
          diagnoses: admission.principalDiagnosis ? [{
            name: admission.principalDiagnosis?.name || admission.diagnosis,
            icdCode: admission.principalDiagnosis?.icdCode || '',
            primary: true,
            date: admission.admissionDate
          }] : [],
          medications: [],
          procedures: []
        }
      };

      const htmlContent = generatePDF('dischargeSummary', dischargeData, hospital);
      openPrintWindow(htmlContent, `Discharge_Summary_${admission.admissionNumber}`);
      
      success('Print Ready', 'Discharge summary generated successfully');
    } catch (err) {
      console.error('Error printing discharge summary:', err);
      error('Print Failed', 'Could not generate discharge summary');
    }
  };

  // Discharge Handler
  const handleDischargePatient = async (admission: any) => {
    setSelectedAdmission(admission);
    setShowDischargeModal(true);
  };

  const confirmDischarge = async () => {
    if (!selectedAdmission) return;
    
    const patient = findPatient(selectedAdmission);
    
    try {
      const dischargeData = {
        dischargeDate: new Date().toISOString().split('T')[0],
        dischargeTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
        dischargeStatus: 'home',
        dischargeSummary: 'Patient discharged successfully',
      };

      await dischargePatient(getEntityId(selectedAdmission)!, dischargeData);
      await Promise.all([getAdmissions(), getAdmissionStats()]);
      setShowDischargeModal(false);
      setSelectedAdmission(null);
      success('Patient Discharged!', `${getPatientName(patient)} has been successfully discharged.`);
      
      // Print discharge summary after discharge
      await handlePrintDischargeSummary(selectedAdmission);
    } catch (err: any) {
      console.error('❌ Discharge error:', err);
      error('Discharge Failed', err.response?.data?.message || 'Failed to discharge patient. Please try again.');
    }
  };

  const canDischargePatient = hasRole(['admin', 'doctor']);

  // Loading state
  if (isLoading && !refreshing) {
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Patient Admissions</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Manage inpatient admissions and discharges</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            {filteredAdmissions.length} admission(s) • {activeAdmissions.length} active • {dischargedAdmissions.length} discharged
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm text-[var(--text-primary)]"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="text-sm font-medium text-[var(--text-primary)]">Show:</span>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => {
                setDateFilter('today');
                setShowDatePicker(false);
              }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                dateFilter === 'today'
                  ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
                  : 'bg-[var(--bg-main)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => {
                setDateFilter('yesterday');
                setShowDatePicker(false);
              }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                dateFilter === 'yesterday'
                  ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
                  : 'bg-[var(--bg-main)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => {
                setDateFilter('custom');
                setShowDatePicker(true);
              }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                dateFilter === 'custom'
                  ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
                  : 'bg-[var(--bg-main)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
              }`}
            >
              Custom
            </button>
          </div>

          {/* Custom Date Range Picker */}
          {showDatePicker && dateFilter === 'custom' && (
            <div className="flex items-center gap-3 ml-auto">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)]"
              />
              <span className="text-[var(--text-secondary)]">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)]"
              />
            </div>
          )}
          
          <div className="text-xs text-[var(--text-secondary)] ml-auto">
            Showing: {getDateFilterDisplay()}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full sm:max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by patient name, folder number, admission number, diagnosis..."
                className="w-full pl-10 pr-4 py-2.5 text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-[var(--bg-card)] text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="px-3 py-2.5 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-[var(--bg-card)] text-[var(--text-primary)] text-sm"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Banner */}
      {filteredAdmissions.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-semibold text-blue-800">
                Showing {paginatedAdmissions.length} of {filteredAdmissions.length} admission records
              </p>
              {searchQuery && (
                <p className="text-xs text-blue-600 mt-0.5">
                  Search results for: "{searchQuery}"
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-700 flex-wrap">
              <span className="bg-green-100 px-2 py-1 rounded border border-green-200">
                Admitted: {activeAdmissions.length}
              </span>
              <span className="bg-cyan-100 px-2 py-1 rounded border border-cyan-200">
                Discharged: {dischargedAdmissions.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Admissions Table - DEFAULT VIEW */}
      {filteredAdmissions.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl p-8 shadow-sm border border-[var(--border-color)] text-center">
          <Hospital className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
            {searchQuery ? 'No Admissions Found' : 'No Admission Records'}
          </h3>
          <p className="text-[var(--text-secondary)] text-sm mb-4">
            {searchQuery 
              ? 'No admission records match your search criteria. Try adjusting your search terms.'
              : `No admission records found for ${getDateFilterDisplay().toLowerCase()}.`
            }
          </p>
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-main)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border-color)] transition-all text-sm font-medium border border-[var(--border-color)]"
            >
              <X className="w-4 h-4" />
              Clear Search
            </button>
          ) : dateFilter !== 'today' && (
            <button
              onClick={() => setDateFilter('today')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
            >
              <Calendar className="w-4 h-4" />
              View Today's Admissions
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Patient</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Admission #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Admission Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Discharge Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Ward / Bed</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Doctor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {paginatedAdmissions.map((admission) => {
                  const patient = findPatient(admission);
                  const fullName = patient ? getPatientName(patient) : 'Unknown Patient';
                  const admissionDate = admission.admissionDate || admission.createdAt;
                  const dischargeDate = admission.dischargeDate;
                  const wardName = admission.ward?.wardName || '—';
                  const bedNumber = admission.bed?.bedNumber || '—';
                  
                  return (
                    <tr key={admission.id} className="hover:bg-[var(--bg-main)] transition-colors duration-150">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[var(--text-primary)] text-sm truncate">
                              {fullName}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {patient?.folderNumber || 'No Folder'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono text-[var(--text-primary)]">
                          {admission.admissionNumber || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p className="font-medium text-[var(--text-primary)]">
                            {formatDate(admissionDate)}
                          </p>
                          <p className="text-[var(--text-secondary)] text-xs">
                            {formatDateTime(admissionDate)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {dischargeDate ? (
                          <div className="text-sm">
                            <p className="font-medium text-[var(--text-primary)]">
                              {formatDate(dischargeDate)}
                            </p>
                            <p className="text-[var(--text-secondary)] text-xs">
                              {formatDateTime(dischargeDate)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-[var(--text-secondary)] text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm">
                          <Bed className="w-3 h-3 text-[var(--text-secondary)]" />
                          <span className="text-[var(--text-primary)]">{wardName}</span>
                          <span className="text-[var(--text-secondary)]">/</span>
                          <span className="font-mono text-[var(--text-secondary)]">{bedNumber}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-[var(--text-primary)]">
                          {admission.admittingDoctor || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(admission.status)}`}>
                          {admission.status === 'admitted' ? 'ACTIVE' : 'DISCHARGED'}
                        </span>
                        {admission.lengthOfStay > 0 && (
                          <span className="text-xs text-[var(--text-secondary)] ml-2">
                            LOS: {admission.lengthOfStay}d
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {/* View Medical Records */}
                          <Link
                            to={`/dashboard/medical-entries/${admission.attendanceId}`}
                            className="p-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors"
                            title="View Medical Records"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          
                          {/* Print Discharge Summary */}
                          <button
                            onClick={() => handlePrintDischargeSummary(admission)}
                            className="p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-700 hover:text-white transition-colors"
                            title="Print Discharge Summary"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          
                          {/* Discharge Button (only for active admissions) */}
                          {admission.status === 'admitted' && canDischargePatient && (
                            <button
                              onClick={() => handleDischargePatient(admission)}
                              className="p-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white transition-colors"
                              title="Discharge Patient"
                            >
                              <LogOut className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="text-sm text-[var(--text-secondary)]">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredAdmissions.length)} of{' '}
                  {filteredAdmissions.length} admission records
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[var(--text-primary)]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] shadow-sm'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[var(--text-primary)]"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Discharge Confirmation Modal */}
      {showDischargeModal && selectedAdmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl max-w-md w-full border border-[var(--border-color)]">
            <div className="p-6 border-b border-[var(--border-color)]">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Confirm Discharge</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Are you sure you want to discharge {getPatientName(findPatient(selectedAdmission))}?
              </p>
            </div>
            <div className="p-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDischargeModal(false);
                  setSelectedAdmission(null);
                }}
                className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDischarge}
                className="px-4 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white transition-all text-sm font-medium"
              >
                Confirm Discharge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}