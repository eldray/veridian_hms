// src/pages/Attendance.tsx - FIXED VERSION
import { useLiveRefresh } from '../api/realtime';
import { useState, useEffect, useMemo } from 'react';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import NewAttendanceModal from '../components/NewAttendanceModal';
import {
  Badge, Button, Card, cn, FilterSelect, humanStatus, INPUT, LinkButton, PageHeader, Pagination,
  SearchInput, Segmented, statusTone, TABLE_SHELL, TD, TD_MONO, TH, TH_ROW, TR,
} from '../components/ui';
import { 
  Grid, List, RefreshCw, Hospital, FileText, Calendar, 
  Eye, Edit, Pill, FlaskConical, Scissors, 
  DollarSign, CreditCard, Shield, Trash2, User, X, Building
} from 'lucide-react';
import type { AttendanceType, PaymentMode } from '../types';

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
  
  const { patients, loadPatients } = usePatientStore();
  const { hasRole } = useAuthStore();

  // The visit rows arrive with their own patient attached, so the table does not wait for
  // the register: it only fills in the name-search fallback as the pages stream in.
  const isLoading = attendancesLoading;

  // One lookup table instead of a scan: findPatient() is called for every attendance while
  // filtering and rendering, and searching the register linearly from there blocked the
  // main thread for seconds on a full ward list.
  const patientById = useMemo(
    () => new Map((patients || []).map((p: any) => [p.id, p] as [string, any])),
    [patients],
  );

  // ✅ FIXED: Find patient from multiple sources
  const findPatient = (attendance: any) => {
    if (!attendance) return null;

    // 1. Check if patient is directly attached
    if (attendance.patient && typeof attendance.patient === 'object') {
      return attendance.patient;
    }

    // 1b. A counter ticket has no register entry — the walk-in's own name is on the visit.
    if (attendance.counterClient && typeof attendance.counterClient === 'object') {
      return attendance.counterClient;
    }

    // 2. Check if patientId is an object with patient data
    if (attendance.patientId && typeof attendance.patientId === 'object') {
      return attendance.patientId;
    }
    
    // 3. If we have a patientId string, find it in the patients store
    if (attendance.patientId && typeof attendance.patientId === 'string') {
      const found = patientById.get(attendance.patientId);
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

  // A counter ticket is a real visit but the person is not in the patient register, so the
  // list has to say so instead of showing a nameless row with a missing folder number.
  const isCounterTicket = (attendance: any) =>
    attendance?.attendanceType === 'walk_in' || Boolean(attendance?.counterClient || attendance?.counterClientId);

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
      // Only the selected date window is requested (all pages of it, 100 per request).
      // The backend caps a single request at 100 rows, so this walks the pages.
      const range = getDateRange();
      await getAttendances({
        limit: 5000,
        ...(range ? { dateFrom: range.startDate.toISOString(), dateTo: range.endDate.toISOString() } : {}),
      });
      // Every visit row carries its patient, so the register is only reference data for the
      // counters and the fallback name lookup — it arrives afterwards instead of gating the table.
      void loadPatients().catch(() => undefined);
    } catch (e) {
      error('Refresh failed', 'Could not load attendance data.');
    } finally {
      setRefreshing(false);
    }
  };

  // Live updates: when anyone registers a visit, records vitals, admits or discharges,
  // quietly re-fetch just the visits in the selected window (no spinner, no patient reload).
  const windowReady = !(dateFilter === 'custom' && !(customStartDate && customEndDate));
  useLiveRefresh(['encounters', 'admissions'], () => {
    const range = getDateRange();
    return getAttendances({
      limit: 5000,
      ...(range ? { dateFrom: range.startDate.toISOString(), dateTo: range.endDate.toISOString() } : {}),
    }, { silent: true });
  }, windowReady);

  useEffect(() => {
    // Reload when the date window changes (custom range: wait until both dates are set)
    if (dateFilter === 'custom' && !(customStartDate && customEndDate)) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, customStartDate, customEndDate]);

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
  }, [attendances, patientById, searchQuery, dateFilter, customStartDate, customEndDate]);

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

  // Mirrors the PUT/DELETE guards on /encounters/:id (midwife may edit a visit).
  const canEdit = hasRole(['admin', 'doctor', 'nurse', 'midwife']);
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
        <PageHeader
          title="Attendance Management"
          subtitle="Manage patient visits and clinical records"
          icon={Calendar}
          accent="cyan"
          actions={(
            <Button icon={RefreshCw} loading>Loading...</Button>
          )}
        />
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
      <PageHeader
        title="Attendance Management"
        subtitle="Manage patient visits and clinical records"
        meta={`${filteredAttendances.length} attendance(s) • ${patients.length} patient(s)`}
        icon={Calendar}
        accent="cyan"
        actions={(
          <Button icon={RefreshCw} loading={refreshing} onClick={handleRefresh}>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        )}
      />

      {/* Date Filter Bar */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="text-sm font-medium text-[var(--text-primary)]">Show:</span>
          </div>

          <Segmented
            aria-label="Attendance date range"
            value={dateFilter}
            onChange={(range) => { setDateFilter(range); setShowDatePicker(range === 'custom'); }}
            options={[
              { value: 'today', label: 'Today' },
              { value: 'yesterday', label: 'Yesterday' },
              { value: 'custom', label: 'Custom' },
            ]}
          />

          {showDatePicker && dateFilter === 'custom' && (
            <div className="flex items-center gap-3 ml-auto">
              <input
                type="date"
                aria-label="Custom range start"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className={INPUT}
              />
              <span className="text-[var(--text-secondary)]">to</span>
              <input
                type="date"
                aria-label="Custom range end"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className={INPUT}
              />
            </div>
          )}
          
          <div className="text-xs text-[var(--text-secondary)] ml-auto">
            Showing: {getDateFilterDisplay()}
          </div>
        </div>
      </Card>

      {/* Controls */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <SearchInput
            className="w-full sm:max-w-sm"
            value={searchQuery}
            onChange={(value) => { setSearchQuery(value); setCurrentPage(1); }}
            placeholder="Search by patient name, folder number, complaints..."
          />

          <div className="flex items-center gap-3">
            <Segmented
              aria-label="Attendance layout"
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: 'cards', label: 'Cards', icon: Grid },
                { value: 'list', label: 'List', icon: List },
              ]}
            />

            <FilterSelect
              aria-label="Rows per page"
              value={String(itemsPerPage)}
              onChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}
              options={[
                { value: '10', label: '10 per page' },
                { value: '20', label: '20 per page' },
                { value: '50', label: '50 per page' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Stats Banner */}
      {filteredAttendances.length > 0 && (
        <Card>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Showing {paginated.length} of {filteredAttendances.length} attendance records
              </p>
              {searchQuery && (
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Search results for: "{searchQuery}"
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone="yellow" dot size="sm">Pending: {filteredAttendances.filter(a => a.status === 'pending').length}</Badge>
              <Badge tone="green" dot size="sm">Completed: {filteredAttendances.filter(a => a.status === 'completed').length}</Badge>
              <Badge tone="purple" dot size="sm">Admitted: {filteredAttendances.filter(a => a.status === 'admitted').length}</Badge>
              <Badge tone="cyan" dot size="sm">Discharged: {filteredAttendances.filter(a => a.status === 'discharged').length}</Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Content */}
      {filteredAttendances.length === 0 ? (
        <Card padded={false} className="p-8 text-center">
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
            <Button icon={X} onClick={() => setSearchQuery('')}>Clear Search</Button>
          ) : dateFilter !== 'today' && (
            <Button variant="soft" accent="cyan" icon={Calendar} onClick={() => setDateFilter('today')}>
              View Today's Attendances
            </Button>
          )}
        </Card>
      ) : viewMode === 'cards' ? (
        // Cards View
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginated.map((attendance) => {
            const patient = findPatient(attendance);
            const attendanceId = attendance.id;
            const totalBill = attendance.totalBill || 0;
            const fullName = patient ? getPatientFullName(patient) : 'Unknown Patient';
            const walkIn = isCounterTicket(attendance);
            
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
                      <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-main)] px-2 py-1 rounded border border-[var(--border-color)] mt-1">
                        {patient?.folderNumber || (walkIn ? 'Walk-in' : 'No Folder')} • {attendance.attendanceNumber || `ATT-${attendanceId?.slice(-8)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge tone={statusTone(attendance.status || 'pending')} dot size="sm">
                      {humanStatus(attendance.status || 'pending')}
                    </Badge>
                    {canDelete && (
                      <Button
                        size="xs"
                        variant="dangerSoft"
                        iconOnly
                        icon={Trash2}
                        aria-label="Delete Attendance"
                        className="opacity-0 group-hover:opacity-100"
                        onClick={() => setDeleteConfirm(attendanceId)}
                      />
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
                  <LinkButton
                    size="sm"
                    variant="soft"
                    accent="cyan"
                    icon={Eye}
                    className="flex-1"
                    to={`/dashboard/attendance/${attendanceId}`}
                  >
                    View
                  </LinkButton>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="soft"
                      accent="yellow"
                      icon={Edit}
                      className="flex-1"
                      onClick={() => handleEditAttendance(attendance)}
                    >
                      Edit
                    </Button>
                  )}
                </div>

                {deleteConfirm === attendanceId && (
                  <div className="mt-3 p-3 bg-[var(--icon-red-bg)] border border-[var(--border-color)] rounded-lg">
                    <p className="text-[var(--icon-red-text)] text-xs font-medium mb-2">
                      Delete this attendance record?
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="danger" className="flex-1" onClick={() => handleDeleteAttendance(attendanceId)}>
                        Delete
                      </Button>
                      <Button size="sm" variant="secondary" className="flex-1" onClick={() => setDeleteConfirm(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // ✅ LIST VIEW
        <div className={TABLE_SHELL}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={TH_ROW}>
                <tr>
                  <th className={TH}>Patient Name</th>
                  <th className={TH}>Folder #</th>
                  <th className={TH}>Attendance #</th>
                  <th className={TH}>Date & Time</th>
                  <th className={TH}>Type</th>
                  <th className={TH}>Payment</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((attendance) => {
                  const patient = findPatient(attendance);
                  const attendanceId = attendance.id;
                  const totalBill = attendance.totalBill || 0;
                  const fullName = patient ? getPatientFullName(patient) : 'Unknown Patient';
                  const walkIn = isCounterTicket(attendance);

                  return (
                    <tr key={attendanceId} className={TR}>
                      <td className={cn(TD, 'whitespace-normal')}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                          </div>
                          <p className="font-semibold text-[var(--text-primary)] text-sm">
                            {fullName}
                          </p>
                          {walkIn && (
                            <Badge tone="orange" dot size="sm">Walk-in</Badge>
                          )}
                        </div>
                      </td>

                      <td className={TD_MONO}>
                        {patient?.folderNumber || (walkIn ? 'No folder' : 'N/A')}
                      </td>

                      <td className={cn(TD_MONO, 'font-semibold text-[var(--icon-cyan-text)]')}>
                        {attendance.attendanceNumber}
                      </td>

                      <td className={TD}>
                        {formatDate(attendance.dateTime || attendance.createdAt)}
                      </td>

                      <td className={TD}>
                        <span className="inline-flex items-center gap-1 text-xs">
                          <Hospital className="w-3 h-3 text-[var(--icon-cyan-text)]" />
                          {getAttendanceTypeLabel(attendance.attendanceType)}
                        </span>
                      </td>

                      <td className={cn(TD, 'whitespace-normal')}>
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

                      <td className={TD}>
                        <Badge tone={statusTone(attendance.status || 'pending')} dot size="sm">
                          {humanStatus(attendance.status || 'pending')}
                        </Badge>
                      </td>

                      <td className={TD}>
                        <div className="flex items-center gap-1.5">
                          <LinkButton
                            size="sm"
                            variant="soft"
                            accent="cyan"
                            iconOnly
                            icon={Eye}
                            aria-label="View Details"
                            to={`/dashboard/attendance/${attendanceId}`}
                          />
                          {canEdit && (
                            <Button
                              size="sm"
                              variant="soft"
                              accent="yellow"
                              iconOnly
                              icon={Edit}
                              aria-label="Edit Attendance"
                              onClick={() => handleEditAttendance(attendance)}
                            />
                          )}
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="dangerSoft"
                              iconOnly
                              icon={Trash2}
                              aria-label="Delete Attendance"
                              onClick={() => setDeleteConfirm(attendanceId)}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={filteredAttendances.length}
        noun="attendances"
        onChange={goToPage}
      />

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