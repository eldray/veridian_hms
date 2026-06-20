// src/pages/Attendance.tsx - FIXED VERSION
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import NewAttendanceModal from '../components/NewAttendanceModal';
import { 
  Search, Grid, List, RefreshCw, Hospital, FileText, Users, Calendar, 
  Eye, Edit, ChevronLeft, ChevronRight, Pill, FlaskConical, Scissors, 
  DollarSign, CreditCard, Shield, Trash2, User, Filter, X, Building
} from 'lucide-react';
import type { AttendanceStatus, AttendanceType, PaymentMode } from '../types';
import { getPatientName } from '../utils/patient';

type DateFilterType = 'today' | 'yesterday' | 'custom';

export default function Attendance() {
  const { success, error } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('list');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { 
    attendances, 
    getAttendances, 
    deleteAttendance, 
    isLoading: attendancesLoading 
  } = useAttendanceStore();
  
  const { patients, loadPatients, isLoading: patientsLoading } = usePatientStore();
  const { hasRole } = useAuthStore();

  const isLoading = attendancesLoading || patientsLoading;

  // ✅ FIXED: Find patient from multiple sources
  const findPatient = (attendance: any) => {
    if (!attendance) return null;
    
    // 1. Check if patient is directly attached
    if (attendance.patient && typeof attendance.patient === 'object') {
      return attendance.patient;
    }
    
    // 2. Check if patientId is an object with patient data
    if (attendance.patientId && typeof attendance.patientId === 'object') {
      return attendance.patientId;
    }
    
    // 3. If we have a patientId string, find it in the patients store
    if (attendance.patientId && typeof attendance.patientId === 'string') {
      const found = patients.find(p => p.id === attendance.patientId);
      if (found) return found;
    }
    
    // 4. Check for nested patient data in other fields
    if (attendance.Patient && typeof attendance.Patient === 'object') {
      return attendance.Patient;
    }
    
    return null;
  };

  // ✅ Canonical name getter
  const getPatientFullName = (patient: any) => {
    if (!patient) return 'Unknown Patient';
    return patient.fullName || patient.name || `${patient.surname || ''} ${patient.otherNames || ''}`.trim() || 'Unknown Patient';
  };

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
      await Promise.all([getAttendances(), loadPatients()]);
    } catch (e) {
      error('Refresh failed', 'Could not load attendance data.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ✅ Filter attendances by search AND date range
  const filteredAttendances = useMemo(() => {
    if (!attendances.length) return [];
    
    const dateRange = getDateRange();
    
    const filtered = attendances.filter(a => {
      // Date filtering
      if (dateRange) {
        const attendanceDate = new Date(a.dateTime || a.createdAt);
        if (attendanceDate < dateRange.startDate || attendanceDate > dateRange.endDate) {
          return false;
        }
      }
      
      // Search filtering
      if (searchQuery) {
        const p = findPatient(a);
        const fullName = p ? getPatientFullName(p) : '';
        const lower = searchQuery.toLowerCase();
        return (
          a.attendanceNumber?.toLowerCase().includes(lower) ||
          fullName.toLowerCase().includes(lower) ||
          p?.folderNumber?.toLowerCase().includes(lower) ||
          a.complaints?.toLowerCase().includes(lower) ||
          a.attendanceType?.toLowerCase().includes(lower) ||
          a.paymentMode?.toLowerCase().includes(lower) ||
          a.nhisCCC?.toLowerCase().includes(lower)
        );
      }
      
      return true;
    });
    
    return filtered.sort((a, b) => new Date(b.dateTime || b.createdAt).getTime() - new Date(a.dateTime || a.createdAt).getTime());
  }, [attendances, patients, searchQuery, dateFilter, customStartDate, customEndDate]);

  const totalPages = Math.ceil(filteredAttendances.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filteredAttendances.slice(startIndex, startIndex + itemsPerPage);

  const handleEditAttendance = (att: any) => {
    setSelectedAttendance(att);
    setEditModalOpen(true);
  };

  const handleDeleteAttendance = async (attendanceId: string) => {
    try {
      await deleteAttendance(attendanceId);
      setDeleteConfirm(null);
      success('Attendance Deleted', 'Attendance record has been removed');
      loadData();
    } catch (err: any) {
      error('Delete Failed', err.message || 'Failed to delete attendance');
    }
  };

  const handleEditSuccess = () => {
    setEditModalOpen(false);
    setSelectedAttendance(null);
    loadData();
    success('Attendance updated', 'Record saved successfully.');
  };

  const handleEditClose = () => {
    setEditModalOpen(false);
    setSelectedAttendance(null);
  };

  const handleRefresh = () => {
    loadData();
    setCurrentPage(1);
  };

  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFilter, customStartDate, customEndDate]);

  // UI Helper Functions
  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'completed': return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border-[var(--icon-green-bg)]';
      case 'cancelled': return 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border-[var(--icon-red-bg)]';
      case 'admitted': return 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] border-[var(--icon-purple-bg)]';
      case 'pending': return 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] border-[var(--icon-yellow-bg)]';
      case 'discharged': return 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border-[var(--icon-cyan-bg)]';
      default: return 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]';
    }
  };

  const getAttendanceTypeLabel = (type: AttendanceType) => {
    const typeMap: Record<AttendanceType, string> = {
      'emergency_acute': 'Emergency/Acute',
      'antenatal': 'Antenatal',
      'postnatal': 'Postnatal',
      'chronic_followup': 'Chronic Follow-up',
      'specialist_consultation': 'Specialist',
      'delivery': 'Delivery',
      'surgery': 'Surgery',
      'general_consultation': 'General Consultation'
    };
    return typeMap[type] || type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'General Consultation';
  };

  const getPaymentModeLabel = (mode: PaymentMode) => {
    const modeMap: Record<PaymentMode, string> = {
      'cash': 'Cash',
      'nhis': 'NHIS',
      'private_insurance': 'Private Insurance',
      'corporate': 'Corporate'
    };
    return modeMap[mode] || 'Cash';
  };

  const getPaymentModeIcon = (mode: PaymentMode) => {
    switch (mode) {
      case 'nhis': return <Shield className="w-3.5 h-3.5 text-[var(--icon-green-text)]" />;
      case 'private_insurance': return <Hospital className="w-3.5 h-3.5 text-[var(--icon-blue-text)]" />;
      case 'corporate': return <Building className="w-3.5 h-3.5 text-[var(--icon-purple-text)]" />;
      default: return <CreditCard className="w-3.5 h-3.5 text-[var(--text-secondary)]" />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatDateOnly = (dateString: string) => {
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

  const canEdit = hasRole(['admin', 'doctor', 'nurse']);
  const canDelete = hasRole(['admin']);

  const getDateFilterDisplay = () => {
    switch (dateFilter) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'custom': 
        if (customStartDate && customEndDate) {
          return `${formatDateOnly(customStartDate)} - ${formatDateOnly(customEndDate)}`;
        }
        return 'Custom Range';
      default: return 'Today';
    }
  };

  // Loading State
  if (isLoading && !refreshing) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Attendance Management</h1>
          </div>
          <button disabled className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading...
          </button>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[var(--bg-main)] rounded-lg animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[var(--bg-main)] rounded animate-pulse w-48"></div>
                  <div className="h-3 bg-[var(--bg-main)] rounded animate-pulse w-32"></div>
                </div>
                <div className="h-6 bg-[var(--bg-main)] rounded-full animate-pulse w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Attendance Management</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Manage patient visits and clinical records</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            {filteredAttendances.length} attendance(s) • {patients.length} patient(s)
          </p>
        </div>
        <button
          onClick={handleRefresh}
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
              onClick={() => { setDateFilter('today'); setShowDatePicker(false); }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                dateFilter === 'today'
                  ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
                  : 'bg-[var(--bg-main)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => { setDateFilter('yesterday'); setShowDatePicker(false); }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                dateFilter === 'yesterday'
                  ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
                  : 'bg-[var(--bg-main)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => { setDateFilter('custom'); setShowDatePicker(true); }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                dateFilter === 'custom'
                  ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
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

      {/* Controls */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full sm:max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search by patient name, folder number, complaints..."
                className="w-full pl-10 pr-4 py-2.5 text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-[var(--bg-card)] text-sm placeholder-[var(--text-tertiary)]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-[var(--bg-main)] rounded-lg p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded transition-all duration-200 ${
                  viewMode === 'cards' ? 'bg-[var(--bg-card)] text-[var(--icon-cyan-text)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-all duration-200 ${
                  viewMode === 'list' ? 'bg-[var(--bg-card)] text-[var(--icon-cyan-text)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

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
      {filteredAttendances.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-semibold text-blue-800">
                Showing {paginated.length} of {filteredAttendances.length} attendance records
              </p>
              {searchQuery && (
                <p className="text-xs text-blue-600 mt-0.5">
                  Search results for: "{searchQuery}"
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-700 flex-wrap">
              <span className="bg-blue-100 px-2 py-1 rounded border border-blue-200">
                Pending: {filteredAttendances.filter(a => a.status === 'pending').length}
              </span>
              <span className="bg-green-100 px-2 py-1 rounded border border-green-200">
                Completed: {filteredAttendances.filter(a => a.status === 'completed').length}
              </span>
              <span className="bg-purple-100 px-2 py-1 rounded border border-purple-200">
                Admitted: {filteredAttendances.filter(a => a.status === 'admitted').length}
              </span>
              <span className="bg-yellow-100 px-2 py-1 rounded border border-yellow-200">
                Discharged: {filteredAttendances.filter(a => a.status === 'discharged').length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {filteredAttendances.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl p-8 shadow-sm border border-[var(--border-color)] text-center">
          <FileText className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
            {searchQuery ? 'No Attendances Found' : 'No Attendance Records'}
          </h3>
          <p className="text-[var(--text-secondary)] text-sm mb-4">
            {searchQuery 
              ? 'No attendance records match your search criteria. Try adjusting your search terms.'
              : `No attendance records found for ${getDateFilterDisplay().toLowerCase()}.`
            }
          </p>
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-main)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border-color)] transition-all duration-200 font-semibold text-sm border border-[var(--border-color)]"
            >
              <X className="w-4 h-4" />
              Clear Search
            </button>
          ) : dateFilter !== 'today' && (
            <button
              onClick={() => setDateFilter('today')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all duration-200 font-semibold text-sm"
            >
              <Calendar className="w-4 h-4" />
              View Today's Attendances
            </button>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        // Cards View
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginated.map((attendance) => {
            const patient = findPatient(attendance);
            const attendanceId = attendance.id;
            const totalBill = attendance.totalBill || 0;
            const fullName = patient ? getPatientFullName(patient) : 'Unknown Patient';
            
            return (
              <div key={attendanceId} className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)] hover:shadow-md transition-all duration-200 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-[var(--icon-cyan-text)]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--text-primary)] text-sm leading-tight">
                        {fullName}
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-main)] px-2 py-1 rounded border mt-1">
                        {patient?.folderNumber || 'No Folder'} • {attendance.attendanceNumber || `ATT-${attendanceId?.slice(-8)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(attendance.status)}`}>
                    {(attendance.status || 'pending').charAt(0).toUpperCase() + (attendance.status || 'pending').slice(1)}
                    </span>
                    {canDelete && (
                      <button
                        onClick={() => setDeleteConfirm(attendanceId)}
                        className="p-1 bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-text)] hover:text-white transition-all duration-200 opacity-0 group-hover:opacity-100"
                        title="Delete Attendance"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-xs mb-3">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="font-medium">{formatDate(attendance.dateTime || attendance.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Hospital className="w-3.5 h-3.5 text-[var(--icon-cyan-text)]" />
                    <span className="font-medium text-[var(--icon-cyan-text)]">{getAttendanceTypeLabel(attendance.attendanceType)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPaymentModeIcon(attendance.paymentMode)}
                    <span className="font-medium text-[var(--text-primary)]">{getPaymentModeLabel(attendance.paymentMode)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-3 text-xs text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1">
                    <Pill className="w-3 h-3" />
                    {attendance.medications?.length || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <FlaskConical className="w-3 h-3" />
                    {attendance.labTests?.length || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Scissors className="w-3 h-3" />
                    {attendance.procedures?.length || 0}
                  </span>
                  {totalBill > 0 && (
                    <span className="flex items-center gap-1 ml-auto font-medium text-[var(--text-primary)]">
                      <DollarSign className="w-3 h-3" />
                      GHS {totalBill.toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="flex gap-2 pt-3 border-t border-[var(--border-color)]">
                  <Link
                    to={`/dashboard/attendance/${attendanceId}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all duration-200 font-medium text-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </Link>
                  {canEdit && (
                    <button
                      onClick={() => handleEditAttendance(attendance)}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] rounded-lg hover:bg-[var(--icon-yellow-text)] hover:text-white transition-all duration-200 font-medium text-xs"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  )}
                </div>

                {deleteConfirm === attendanceId && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-xs font-medium mb-2">
                      Delete this attendance record?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteAttendance(attendanceId)}
                        className="flex-1 px-2 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="flex-1 px-2 py-1.5 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // ✅ LIST VIEW
        <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Patient Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Folder #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Attendance #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Date & Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Payment</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {paginated.map((attendance) => {
                const patient = findPatient(attendance);
                const attendanceId = attendance.id;
                const totalBill = attendance.totalBill || 0;
                const fullName = patient ? getPatientFullName(patient) : 'Unknown Patient';
                
                return (
                  <tr key={attendanceId} className="hover:bg-[var(--bg-main)] transition-colors duration-150">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                        </div>
                        <p className="font-semibold text-[var(--text-primary)] text-sm">
                          {fullName}
                        </p>
                      </div>
                    </td>
                    
                    <td className="px-4 py-3">
                      <p className="font-mono text-sm font-medium text-[var(--text-primary)]">
                        {patient?.folderNumber || 'N/A'}
                      </p>
                    </td>
                    
                    <td className="px-4 py-3">
                      <p className="font-mono text-sm font-semibold text-[var(--icon-cyan-text)]">
                        {attendance.attendanceNumber}
                      </p>
                    </td>
                    
                    <td className="px-4 py-3">
                      <p className="text-sm text-[var(--text-primary)]">
                        {formatDate(attendance.dateTime || attendance.createdAt)}
                      </p>
                    </td>
                    
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs">
                        <Hospital className="w-3 h-3 text-[var(--icon-cyan-text)]" />
                        {getAttendanceTypeLabel(attendance.attendanceType)}
                      </span>
                    </td>
                    
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        {getPaymentModeIcon(attendance.paymentMode)}
                        <span className="font-medium">{getPaymentModeLabel(attendance.paymentMode)}</span>
                        {totalBill > 0 && (
                          <span className="text-[var(--icon-green-text)] font-bold ml-1">
                            GHS {totalBill.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(attendance.status)}`}>
                        {(attendance.status || 'pending').charAt(0).toUpperCase() + (attendance.status || 'pending').slice(1)}
                      </span>
                    </td>
                    
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/dashboard/attendance/${attendanceId}`}
                          className="p-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors duration-200"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {canEdit && (
                          <button
                            onClick={() => handleEditAttendance(attendance)}
                            className="p-2 bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] rounded-lg hover:bg-[var(--icon-yellow-text)] hover:text-white transition-colors duration-200"
                            title="Edit Attendance"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteConfirm(attendanceId)}
                            className="p-2 bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-text)] hover:text-white transition-colors duration-200"
                            title="Delete Attendance"
                          >
                            <Trash2 className="w-4 h-4" />
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
      )}

      {/* Pagination */}
      {filteredAttendances.length > 0 && totalPages > 1 && (
        <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="text-sm text-[var(--text-secondary)]">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredAttendances.length)} of{' '}
              {filteredAttendances.length} attendance records
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

      {/* Edit Modal */}
      {editModalOpen && selectedAttendance && (
        <NewAttendanceModal
          patientId={selectedAttendance.patientId}
          onSuccess={handleEditSuccess}
          onClose={handleEditClose}
          isEditMode={true}
          attendanceData={selectedAttendance}
        />
      )}
    </div>
  );
}