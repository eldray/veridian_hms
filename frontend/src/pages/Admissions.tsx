// src/pages/Admissions.tsx - UPDATED with Ward Management button and proper data display

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
  Filter,
  Activity,
  ClipboardList,
  Pill,
  Microscope,
  AlertTriangle,
  ClockIcon,
  LayoutDashboard,
  Building2,
  Moon,
  Sun
} from 'lucide-react';

type DateFilterType = 'today' | 'yesterday' | 'custom';
type TabType = 'all' | 'active' | 'discharged';

// Helper functions
const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?._id || entity?.id;
};

const getPatientName = (patient: any): string => {
  if (!patient) return 'Unknown Patient';
  if (patient.fullName) return patient.fullName;
  return `${patient.surname || ''} ${patient.otherNames || ''}`.trim() || 'Unknown Patient';
};

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
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedDaycase, setSelectedDaycase] = useState<any>(null);
  
  // Date filter states
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { admissions, getAdmissions, convertDaycaseToIPD, dischargePatient, getDetentionPatients, getFormalIPDPatients, detentionPatients, formalIPDPatients } = useAdmissionStore();
  const { patients, loadPatients } = usePatientStore();
  const { attendances, getAttendances, updateAttendance, dischargeFromEncounter } = useAttendanceStore();
  const { user, hasRole } = useAuthStore();

  // Get date range helper
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
        getDetentionPatients(),
        getFormalIPDPatients(),
      ]);
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFilter, customStartDate, customEndDate, activeTab]);

  // ============================================
  // BUILD ALL ADMISSIONS (Formal IPD + Detention + Daycase)
  // ============================================
  
  // 1. Get formal IPD admissions (excluding detention)
  const formalIPD = useMemo(() => admissions.filter(a => a.admissionType !== 'detention_observation'), [admissions]);
  
  // 2. Get detention/observation admissions
  const detention = useMemo(() => admissions.filter(a => a.admissionType === 'detention_observation'), [admissions]);
  
  // 3. Get day surgery patients from attendances
  const daycasePatients = useMemo(() => {
    return attendances.filter(a => 
      a.encounterCategory === 'daycase' && 
      a.status === 'admitted'
    );
  }, [attendances]);
  
  // 4. Transform daycase patients to admission-like objects
  const virtualDaycaseAdmissions = useMemo(() => {
    return daycasePatients.map(att => ({
      id: att.id,
      admissionNumber: att.attendanceNumber || `DAY-${att.id.slice(-8)}`,
      attendanceId: att.id,
      admissionDate: att.dateTime || att.createdAt,
      dischargeDate: null,
      admissionType: 'day_surgery',
      admissionSource: 'opd',
      dischargeStatus: null,
      dailyNotes: [],
      createdAt: att.createdAt,
      updatedAt: att.updatedAt,
      attendance: att,
      isDaySurgery: true,
      isVirtual: true,
      status: 'admitted',
      displayType: 'day_surgery'
    }));
  }, [daycasePatients]);
  
  // 5. Combine all admissions

  const allAdmissions = useMemo(() => {
    // 1. Get formal IPD from admissions store
    const formal = formalIPD.map(adm => ({
      ...adm,
      isDaySurgery: false,
      isDetention: false,
      isVirtual: false,
      status: adm.dischargeDate ? 'discharged' : 'admitted',
      displayType: 'formal_ipd'
    }));
    
    // 2. Get detention from admissions store
    const detentionList = detention.map(adm => ({
      ...adm,
      isDaySurgery: false,
      isDetention: true,
      isVirtual: false,
      status: adm.dischargeDate ? 'discharged' : 'admitted',
      displayType: 'detention'
    }));
    
    // 3. Get day surgery from attendances
    const daySurgery = virtualDaycaseAdmissions;
    
    // 4. ✅ NEW: Get admitted patients from attendances that don't have admission records
    //    This is the FALLBACK for when admissions store is empty
    const admittedFromAttendances = attendances
      .filter(a => 
        a.status === 'admitted' && 
        a.encounterCategory === 'ipd' &&
        !formal.some(f => f.attendanceId === a.id) &&
        !detentionList.some(d => d.attendanceId === a.id)
      )
      .map(att => ({
        id: att.id,
        admissionNumber: att.attendanceNumber || `ADM-${att.id.slice(-8)}`,
        attendanceId: att.id,
        admissionDate: att.dateTime || att.createdAt,
        dischargeDate: null,
        admissionType: att.admissionType || 'emergency',
        admissionSource: 'opd',
        dischargeStatus: null,
        dailyNotes: [],
        createdAt: att.createdAt,
        updatedAt: att.updatedAt,
        attendance: att,
        isDaySurgery: false,
        isDetention: false,
        isVirtual: true,
        status: 'admitted',
        displayType: 'formal_ipd'
      }));
    
    // Remove duplicates
    const existingAttendanceIds = new Set([...formal, ...detentionList].map(a => a.attendanceId));
    const uniqueDaySurgery = daySurgery.filter(o => !existingAttendanceIds.has(o.attendanceId));
    const uniqueFromAttendances = admittedFromAttendances.filter(a => !existingAttendanceIds.has(a.attendanceId));
    
    const result = [...formal, ...detentionList, ...uniqueDaySurgery, ...uniqueFromAttendances];
    console.log(`📊 Combined admissions: ${result.length} (${formal.length} formal, ${detentionList.length} detention, ${uniqueDaySurgery.length} day surgery, ${uniqueFromAttendances.length} from attendances)`);
    
    return result;
  }, [formalIPD, detention, virtualDaycaseAdmissions, attendances]);

  // Filter admissions by search, date, and tab
  const filteredAdmissions = useMemo(() => {
    if (!allAdmissions.length) return [];
    
    const dateRange = getDateRange();
    
    const filtered = allAdmissions.filter(admission => {
      // Date filtering
      if (dateRange) {
        const admissionDate = new Date(admission.admissionDate);
        if (admissionDate < dateRange.startDate || admissionDate > dateRange.endDate) {
          return false;
        }
      }
      
      // Tab filtering
      const isDischarged = admission.dischargeDate !== null || admission.attendance?.status === 'discharged';
      if (activeTab === 'active' && isDischarged) return false;
      if (activeTab === 'discharged' && !isDischarged) return false;
      
      // Search filtering
      if (searchQuery) {
        const patient = admission.attendance?.Patient || patients.find(p => p.id === admission.attendance?.patientId);
        const fullName = patient ? getPatientName(patient) : '';
        const lower = searchQuery.toLowerCase();
        return (
          admission.admissionNumber?.toLowerCase().includes(lower) ||
          fullName.toLowerCase().includes(lower) ||
          patient?.folderNumber?.toLowerCase().includes(lower) ||
          admission.attendance?.complaints?.toLowerCase().includes(lower)
        );
      }
      
      return true;
    });
    
    return filtered.sort((a, b) => 
      new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime()
    );
  }, [allAdmissions, patients, searchQuery, dateFilter, customStartDate, customEndDate, activeTab]);

  const activeAdmissions = filteredAdmissions.filter(a => !a.dischargeDate);
  const dischargedAdmissions = filteredAdmissions.filter(a => a.dischargeDate);
  
  // Counts by type
  const formalIPDCount = filteredAdmissions.filter(a => a.displayType === 'formal_ipd' && !a.dischargeDate).length;
  const detentionCount = filteredAdmissions.filter(a => a.displayType === 'detention' && !a.dischargeDate).length;
  const daySurgeryCount = filteredAdmissions.filter(a => a.displayType === 'day_surgery' && !a.dischargeDate).length;

  // Pagination
  const totalPages = Math.ceil(filteredAdmissions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAdmissions = filteredAdmissions.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

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

  const getStatusBadge = (admission: any) => {
    if (admission.dischargeDate) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">DISCHARGED</span>;
    }
    
    switch (admission.displayType) {
      case 'day_surgery':
        return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">
          <Sun className="w-3 h-3" />
          DAY SURGERY
        </span>;
      case 'detention':
        return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">
          <Moon className="w-3 h-3" />
          OBSERVATION (12-72h)
        </span>;
      case 'formal_ipd':
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
          <Hospital className="w-3 h-3" />
          ADMITTED (IPD)
        </span>;
    }
  };

  const getTypeIcon = (admission: any) => {
    switch (admission.displayType) {
      case 'day_surgery':
        return <Sun className="w-4 h-4 text-purple-600" />;
      case 'detention':
        return <Moon className="w-4 h-4 text-orange-600" />;
      case 'formal_ipd':
      default:
        return <Hospital className="w-4 h-4 text-green-600" />;
    }
  };

  const getLengthOfStay = (admission: any) => {
    const start = new Date(admission.admissionDate);
    const end = admission.dischargeDate ? new Date(admission.dischargeDate) : new Date();
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const handleConvertToIPD = async (daycaseAdmission: any) => {
    setSelectedDaycase(daycaseAdmission);
    setShowConvertModal(true);
  };

  const confirmConvertToIPD = async () => {
    if (!selectedDaycase) return;
    
    try {
      await convertDaycaseToIPD(selectedDaycase.attendanceId, {
        admissionType: 'emergency'
      });
      success('Converted', 'Day surgery patient converted to formal IPD admission');
      await loadData();
      setShowConvertModal(false);
      setSelectedDaycase(null);
    } catch (err: any) {
      error('Conversion Failed', err.message);
    }
  };

  const handleDischargePatient = async (admission: any) => {
    setSelectedAdmission(admission);
    setShowDischargeModal(true);
  };

  const confirmDischarge = async () => {
    if (!selectedAdmission) return;
    
    try {
      await dischargePatient(selectedAdmission.attendanceId, {
        dischargeDate: new Date().toISOString(),
        dischargeStatus: 'home'
      });
      success('Patient Discharged', 'Patient has been successfully discharged');
      await loadData();
      setShowDischargeModal(false);
      setSelectedAdmission(null);
    } catch (err: any) {
      error('Discharge Failed', err.message);
    }
  };

  const canDischarge = hasRole(['admin', 'doctor']);
  const canConvert = hasRole(['admin', 'doctor']);

  // Navigate to ward management
  const navigateToWardManagement = () => {
    window.location.href = '/dashboard/wards';
  };

  if (isLoading && !refreshing) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)]">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Loading Admissions...</h2>
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
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manage IPD admissions, observation cases, and day surgery patients
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            {filteredAdmissions.length} total • {formalIPDCount} IPD • {detentionCount} Observation • {daySurgeryCount} Day Surgery • {dischargedAdmissions.length} Discharged
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* ✅ Ward Management Button - RESTORED */}
          <button
            onClick={navigateToWardManagement}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-700 hover:text-white transition-all text-sm font-medium"
          >
            <Building2 className="w-4 h-4" />
            Ward Management
          </button>
          
          <button
            onClick={loadData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm text-[var(--text-primary)]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[var(--bg-card)] rounded-xl p-1 border border-[var(--border-color)] flex gap-1">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'all'
              ? 'bg-cyan-100 text-cyan-700'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]'
          }`}
        >
          All ({filteredAdmissions.length})
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'active'
              ? 'bg-green-100 text-green-700'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]'
          }`}
        >
          Active ({activeAdmissions.length})
        </button>
        <button
          onClick={() => setActiveTab('discharged')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'discharged'
              ? 'bg-gray-100 text-gray-700'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]'
          }`}
        >
          Discharged ({dischargedAdmissions.length})
        </button>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="text-sm font-medium text-[var(--text-primary)]">Show:</span>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => { setDateFilter('today'); setShowDatePicker(false); }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                dateFilter === 'today'
                  ? 'bg-cyan-100 text-cyan-700'
                  : 'bg-[var(--bg-main)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => { setDateFilter('yesterday'); setShowDatePicker(false); }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                dateFilter === 'yesterday'
                  ? 'bg-cyan-100 text-cyan-700'
                  : 'bg-[var(--bg-main)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => { setDateFilter('custom'); setShowDatePicker(true); }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                dateFilter === 'custom'
                  ? 'bg-cyan-100 text-cyan-700'
                  : 'bg-[var(--bg-main)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
              }`}
            >
              Custom
            </button>
          </div>

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

      {/* Search Bar */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by patient name, folder number, admission number..."
            className="w-full pl-10 pr-4 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Admissions Table */}
      {filteredAdmissions.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center border border-[var(--border-color)]">
          <Hospital className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
            {searchQuery ? 'No Admissions Found' : 'No Active Admissions'}
          </h3>
          <p className="text-[var(--text-secondary)] text-sm">
            {searchQuery 
              ? 'No records match your search criteria.'
              : 'No patients are currently admitted or under observation.'
            }
          </p>
        </div>
      ) : (
        <>
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Patient</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">ID/Number</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Admission Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Stay</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {paginatedAdmissions.map((admission) => {
                  const patient = admission.attendance?.Patient || patients.find(p => p.id === admission.attendance?.patientId);
                  const fullName = patient ? getPatientName(patient) : 'Unknown Patient';
                  const wardName = admission.attendance?.Ward?.wardName || '—';
                  const bedNumber = admission.attendance?.Bed?.bedNumber || '—';
                  const isDischarged = !!admission.dischargeDate;
                  const stayDays = getLengthOfStay(admission);
                  
                  return (
                    <tr key={admission.id} className={`hover:bg-[var(--bg-main)] transition-colors ${
                      admission.displayType === 'detention' ? 'bg-orange-50/20' : 
                      admission.displayType === 'day_surgery' ? 'bg-purple-50/20' : ''
                    }`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-cyan-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-[var(--text-primary)] text-sm">{fullName}</p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {patient?.folderNumber || 'No Folder'} • {patient?.gender || '—'} • {patient?.dateOfBirth ? calculateAge(patient.dateOfBirth) : '?'} yrs
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(admission)}
                          {getStatusBadge(admission)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono text-[var(--text-primary)]">
                          {admission.admissionNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p className="font-medium text-[var(--text-primary)]">
                            {formatDate(admission.admissionDate)}
                          </p>
                          <p className="text-[var(--text-secondary)] text-xs">
                            {formatDateTime(admission.admissionDate)}
                          </p>
                        </div>
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
                          {stayDays} day{stayDays !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(admission)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {/* View Admission Details */}
                          <Link
                            to={`/dashboard/admissions/${admission.id}`}
                            className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-700 hover:text-white transition-colors"
                            title="View Admission Details"
                          >
                            <FileText className="w-4 h-4" />
                          </Link>
                          
                          {/* View Medical Records */}
                          {admission.attendance?.id && (
                            <Link
                              to={`/dashboard/medical-entries/${admission.attendance.id}`}
                              className="p-2 bg-cyan-100 text-cyan-700 rounded-lg hover:bg-cyan-700 hover:text-white transition-colors"
                              title="View Medical Records"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                          )}
                          
                          {/* Convert to IPD (only for day surgery) */}
                          {admission.displayType === 'day_surgery' && !isDischarged && canConvert && (
                            <button
                              onClick={() => handleConvertToIPD(admission)}
                              className="p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-700 hover:text-white transition-colors"
                              title="Convert to IPD"
                            >
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          )}
                          
                          {/* Discharge Button */}
                          {!isDischarged && canDischarge && (
                            <button
                              onClick={() => handleDischargePatient(admission)}
                              className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-700 hover:text-white transition-colors"
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
            <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="text-sm text-[var(--text-secondary)]">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredAdmissions.length)} of {filteredAdmissions.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 text-sm text-[var(--text-secondary)]">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Convert Modal */}
      {showConvertModal && selectedDaycase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl max-w-md w-full border border-[var(--border-color)]">
            <div className="p-6 border-b border-[var(--border-color)]">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Convert to IPD Admission</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Convert this day surgery patient to formal IPD admission?
              </p>
            </div>
            <div className="p-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowConvertModal(false)}
                className="px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmConvertToIPD}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
              >
                Convert to IPD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discharge Modal */}
      {showDischargeModal && selectedAdmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl max-w-md w-full border border-[var(--border-color)]">
            <div className="p-6 border-b border-[var(--border-color)]">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Confirm Discharge</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Are you sure you want to discharge this patient?
              </p>
            </div>
            <div className="p-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowDischargeModal(false)}
                className="px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDischarge}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
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