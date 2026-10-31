// src/pages/Appointments.tsx - FIXED with NewAttendanceModal
import { useEffect, useState, useMemo } from 'react';
import { confirmDialog } from '../context/ConfirmDialog';
import { useAppointmentStore } from '../store/appointmentStore';
import { useAuthStore } from '../store/authStore';
import { usePatientStore } from '../store/patientStore';
import { useToast } from '../store/toastStore';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import NewAttendanceModal from '../components/NewAttendanceModal';
import { describeApiError } from '../utils/apiError';

import {
  Badge, Button, Card, cn, Field, FilterSelect, humanStatus, INPUT, PageHeader, Pagination,
  SearchInput, Segmented, SELECT, StatCard, TABLE_SHELL, TD, TH, TH_ROW, TR,
  type BadgeTone,
} from '../components/ui';

import {
  Plus,
  Calendar,
  User,
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react';

type DateFilterType = 'today' | 'tomorrow' | 'week' | 'custom';

interface SelectOption {
  value: string;
  label: string;
  role?: string;
  departmentId?: string;
  departmentName?: string;
  folderNumber?: string;
}

export default function Appointments() {
  const navigate = useNavigate();
  const { 
    appointments, 
    getAppointments, 
    createAppointment, 
    updateAppointment, 
    deleteAppointment,
    updateAppointmentStatus,
    checkInAppointment,
    getAvailableClinicians,
    availableClinicians,
    isLoading,
    error: storeError
  } = useAppointmentStore();
  const { patients, loadPatients, isLoading: patientsLoading } = usePatientStore();
  const { user, hasRole } = useAuthStore();
  const { success, error } = useToast();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // ✅ NEW: Use NewAttendanceModal for conversion
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedAppointmentForAttendance, setSelectedAppointmentForAttendance] = useState<any>(null);

  // Form data - department comes from clinician
  const [formData, setFormData] = useState({
    patientId: '',
    clinicianId: '',
    title: '',
    description: '',
    appointmentDate: '',
    appointmentTime: '',
    duration: 30,
    type: 'consultation'
  });

  // Convert patients to Select options
  const patientOptions: SelectOption[] = useMemo(() => {
    return patients.map(patient => ({
      value: patient.id,
      label: patient.name || `${patient.surname || ''} ${patient.otherNames || ''}`.trim(),
      folderNumber: patient.folderNumber
    }));
  }, [patients]);

  // Convert clinicians to Select options (includes department info)
  const clinicianOptions: SelectOption[] = useMemo(() => {
    return availableClinicians.map(clinician => ({
      value: clinician.id,
      label: `${clinician.fullName} (${clinician.role})`,
      role: clinician.role,
      departmentId: clinician.departmentId,
      departmentName: clinician.department?.name
    }));
  }, [availableClinicians]);

  // Get selected patient label
  const selectedPatientLabel = useMemo(() => {
    const patient = patients.find(p => p.id === formData.patientId);
    if (!patient) return null;
    return {
      value: patient.id,
      label: patient.name || `${patient.surname || ''} ${patient.otherNames || ''}`.trim()
    };
  }, [patients, formData.patientId]);

  // Get selected clinician label
  const selectedClinicianLabel = useMemo(() => {
    const clinician = availableClinicians.find(c => c.id === formData.clinicianId);
    if (!clinician) return null;
    return {
      value: clinician.id,
      label: `${clinician.fullName} (${clinician.role})`,
      departmentId: clinician.departmentId,
      departmentName: clinician.department?.name
    };
  }, [availableClinicians, formData.clinicianId]);

  // Get date range based on filter
  const getDateRange = (): { startDate: Date; endDate: Date } | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    
    switch (dateFilter) {
      case 'today':
        return { startDate: today, endDate: endOfDay };
      case 'tomorrow':
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const endOfTomorrow = new Date(tomorrow);
        endOfTomorrow.setHours(23, 59, 59, 999);
        tomorrow.setHours(0, 0, 0, 0);
        return { startDate: tomorrow, endDate: endOfTomorrow };
      case 'week':
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        weekEnd.setHours(23, 59, 59, 999);
        return { startDate: today, endDate: weekEnd };
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

  // Load all data
  const loadData = async () => {
    try {
      setRefreshing(true);
      const dateRange = getDateRange();
      const filters: any = {};
      
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (typeFilter !== 'all') filters.type = typeFilter;
      if (dateRange) {
        filters.dateFrom = dateRange.startDate.toISOString();
        filters.dateTo = dateRange.endDate.toISOString();
      }
      
      await Promise.all([
        getAppointments({ ...filters, limit: 5000 }), // all pages of the selected window
        // Lab techs and sonographers book patients but have no read access to the
        // patient directory, so the list is a name lookup only — never fatal here.
        loadPatients().catch(() => undefined),
        getAvailableClinicians(['doctor', 'nurse', 'midwife'])
      ]);
    } catch (err) {
      error('Load Failed', 'Failed to load appointment data');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, typeFilter, dateFilter, customStartDate, customEndDate]);

  // The store records the failure in state instead of throwing, so without this the page
  // would silently swap in an empty list and the operator would think there were no bookings.
  useEffect(() => {
    if (storeError) error('Appointments Not Loaded', storeError);
  }, [storeError]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter, dateFilter, customStartDate, customEndDate]);

  // Get patient name helper
  const getPatientName = (patient: any) => {
    if (!patient) return 'Unknown Patient';
    return patient.name || patient.fullName || `${patient.surname || ''} ${patient.otherNames || ''}`.trim() || 'Unknown Patient';
  };

  // Get patient by ID
  // Indexed register: the filter below runs this for every appointment, so a linear scan
  // of the patient list turned each keystroke in the search box into seconds of dead UI.
  const patientById = useMemo(
    () => new Map((patients || []).map((p: any) => [p.id, p] as [string, any])),
    [patients],
  );

  const findPatient = (appointment: any) => {
    if (!appointment) return null;
    const patientId = appointment.patientId || appointment.patient?.id;
    if (!patientId) return null;
    return patientById.get(patientId);
  };

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    const apts = Array.isArray(appointments) ? appointments : [];
    
    return apts.filter(apt => {
      if (!apt || !apt.id) return false;
      
      const patient = findPatient(apt);
      const patientName = patient ? getPatientName(patient) : '';
      const clinicianName = apt.clinician?.fullName || '';
      const title = apt.title || '';
      const searchLower = searchTerm.toLowerCase();
      
      const matchesSearch = searchTerm === '' || 
        patientName.toLowerCase().includes(searchLower) ||
        clinicianName.toLowerCase().includes(searchLower) ||
        title.toLowerCase().includes(searchLower);
      
      return matchesSearch;
    });
  }, [appointments, patientById, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAppointments = filteredAppointments.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  // ✅ Handle convert to attendance - Open NewAttendanceModal
  const handleConvertToAttendance = (appointment: any) => {
    setSelectedAppointmentForAttendance(appointment);
    setShowAttendanceModal(true);
  };

  // ✅ Handle successful attendance creation
  const handleAttendanceSuccess = async (attendance: any) => {
    setShowAttendanceModal(false);

    // The attendance is saved by now, so a failed status update must not strand the clerk away
    // from the record they just created. Say which half did not happen, then still open it.
    try {
      if (selectedAppointmentForAttendance?.id) {
        await updateAppointmentStatus(selectedAppointmentForAttendance.id, 'completed');
      }
      success('Converted', 'Appointment converted to attendance successfully');
    } catch (err: any) {
      error('Attendance created', `The appointment is still marked as booked - ${describeApiError(err, 'its status could not be updated')}.`);
    }

    // Navigate to the attendance details
    navigate(`/dashboard/attendance/${attendance.id}`);

    // Refresh data
    await loadData();
    setSelectedAppointmentForAttendance(null);
  };

  // ✅ Handle attendance modal close
  const handleAttendanceClose = () => {
    setShowAttendanceModal(false);
    setSelectedAppointmentForAttendance(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get selected clinician to get department
    const selectedClinician = availableClinicians.find(c => c.id === formData.clinicianId);
    
    const appointmentPayload = {
      ...formData,
      departmentId: selectedClinician?.departmentId || null,
      clinicianRole: selectedClinician?.role
    };
    
    try {
      if (editingAppointment) {
        await updateAppointment(editingAppointment.id, appointmentPayload);
        success('Appointment Updated', 'Appointment updated successfully');
      } else {
        await createAppointment(appointmentPayload);
        success('Appointment Created', 'Appointment created successfully');
      }
      setShowForm(false);
      setEditingAppointment(null);
      resetForm();
      await loadData();
    } catch (err: any) {
      error('Save Failed', err.message || 'Failed to save appointment');
    }
  };

  const handleEdit = (apt: any) => {
    setEditingAppointment(apt);
    setFormData({
      patientId: apt.patientId,
      clinicianId: apt.clinicianId,
      title: apt.title,
      description: apt.description || '',
      appointmentDate: apt.appointmentDate?.split('T')[0] || '',
      appointmentTime: apt.appointmentTime,
      duration: apt.duration,
      type: apt.type
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (await confirmDialog({ title: 'Delete appointment', message: 'Are you sure you want to delete this appointment?', confirmText: 'Delete' })) {
      try {
        await deleteAppointment(id);
        success('Appointment Deleted', 'Appointment deleted successfully');
        await loadData();
      } catch (err: any) {
        error('Delete Failed', describeApiError(err, 'The appointment could not be deleted.'));
      }
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await updateAppointmentStatus(id, status);
      success('Status Updated', `Appointment ${status.replace('_', ' ')}`);
      await loadData();
    } catch (err: any) {
      error('Update Failed', describeApiError(err, 'The appointment status could not be updated.'));
    }
  };

  const handleCheckIn = async (id: string) => {
    try {
      await checkInAppointment(id);
      success('Checked In', 'Patient checked in successfully');
      await loadData();
    } catch (err: any) {
      error('Check-in Failed', describeApiError(err, 'The patient could not be checked in.'));
    }
  };

  const resetForm = () => {
    setFormData({
      patientId: '',
      clinicianId: '',
      title: '',
      description: '',
      appointmentDate: '',
      appointmentTime: '',
      duration: 30,
      type: 'consultation'
    });
  };

  // Badge's shared STATUS_TONES does not know this page's appointment enum
  // (scheduled / confirmed / checked_in / no_show), so the tones stay local.
  const getStatusTone = (status: string): BadgeTone => {
    switch (status) {
      case 'scheduled': return 'blue';
      case 'confirmed': return 'green';
      case 'checked_in': return 'purple';
      case 'in_progress': return 'yellow';
      case 'cancelled': return 'red';
      case 'no_show': return 'orange';
      default: return 'neutral';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'consultation': return 'text-[var(--icon-blue-text)] bg-[var(--icon-blue-bg)]';
      case 'follow_up': return 'text-[var(--icon-cyan-text)] bg-[var(--icon-cyan-bg)]';
      case 'procedure': return 'text-[var(--icon-purple-text)] bg-[var(--icon-purple-bg)]';
      case 'antenatal': return 'text-[var(--icon-pink-text)] bg-[var(--icon-pink-bg)]';
      case 'postnatal': return 'text-[var(--icon-teal-text)] bg-[var(--icon-teal-bg)]';
      case 'vaccination': return 'text-[var(--icon-orange-text)] bg-[var(--icon-orange-bg)]';
      case 'lab_test': return 'text-[var(--icon-green-text)] bg-[var(--icon-green-bg)]';
      case 'scan': return 'text-[var(--icon-indigo-text)] bg-[var(--icon-indigo-bg)]';
      default: return 'text-[var(--text-secondary)] bg-[var(--bg-main)]';
    }
  };

  const canEditAppointment = (apt: any) => {
    return hasRole(['admin']) || apt.clinicianId === user?.id;
  };

  const stats = {
    total: filteredAppointments.length,
    scheduled: filteredAppointments.filter(a => a.status === 'scheduled').length,
    confirmed: filteredAppointments.filter(a => a.status === 'confirmed').length,
    today: filteredAppointments.filter(a => {
      const today = new Date().toDateString();
      const aptDate = new Date(a.appointmentDate).toDateString();
      return aptDate === today;
    }).length
  };

  const getDateFilterDisplay = () => {
    switch (dateFilter) {
      case 'today': return 'Today';
      case 'tomorrow': return 'Tomorrow';
      case 'week': return 'Next 7 Days';
      case 'custom':
        if (customStartDate && customEndDate) {
          const format = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return `${format(customStartDate)} - ${format(customEndDate)}`;
        }
        return 'Custom Range';
      default: return 'Today';
    }
  };

  // Custom styles for react-select
  const selectStyles = {
    control: (base: any, state: any) => ({
      ...base,
      backgroundColor: 'var(--bg-main)',
      borderColor: 'var(--border-color)',
      borderRadius: '0.5rem',
      padding: '0.125rem',
      boxShadow: state.isFocused ? '0 0 0 2px var(--icon-blue-text)' : 'none',
      '&:hover': {
        borderColor: 'var(--icon-blue-text)'
      }
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? 'var(--bg-main)' : 'var(--bg-card)',
      color: 'var(--text-primary)',
      cursor: 'pointer',
      '&:active': {
        backgroundColor: 'var(--icon-blue-bg)'
      }
    }),
    singleValue: (base: any) => ({
      ...base,
      color: 'var(--text-primary)'
    }),
    input: (base: any) => ({
      ...base,
      color: 'var(--text-primary)'
    }),
    menu: (base: any) => ({
      ...base,
      backgroundColor: 'var(--bg-card)',
      borderColor: 'var(--border-color)',
      zIndex: 50
    }),
    placeholder: (base: any) => ({
      ...base,
      color: 'var(--text-tertiary)'
    })
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <PageHeader
        title="Appointment Management"
        subtitle="Schedule and manage patient appointments"
        meta={`${filteredAppointments.length} appointment(s) • ${stats.today} today`}
        icon={Calendar}
        accent="purple"
        backTo="/dashboard"
        actions={(
          <>
            <Button variant="secondary" icon={User} onClick={() => navigate('/dashboard/attendance')}>
              Attendance
            </Button>
            <Button variant="soft" accent="cyan" icon={Plus} onClick={() => setShowForm(true)}>
              New Appointment
            </Button>
            <Button icon={RefreshCw} loading={refreshing} onClick={loadData}>Refresh</Button>
          </>
        )}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Appointments" value={stats.total} />
        <StatCard label="Scheduled" value={stats.scheduled} accent="blue" />
        <StatCard label="Confirmed" value={stats.confirmed} accent="green" />
        <StatCard label="Today" value={stats.today} accent="purple" />
      </div>

      {/* Date Filter Bar */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="text-sm font-medium text-[var(--text-primary)]">Show:</span>
          </div>
          
          <Segmented
            aria-label="Appointment date range"
            value={dateFilter}
            onChange={(range) => { setDateFilter(range); setShowDatePicker(range === 'custom'); }}
            options={[
              { value: 'today', label: 'Today' },
              { value: 'tomorrow', label: 'Tomorrow' },
              { value: 'week', label: 'Next 7 Days' },
              { value: 'custom', label: 'Custom' },
            ]}
          />

          {showDatePicker && dateFilter === 'custom' && (
            <div className="flex items-center gap-3 ml-auto">
              <input type="date" aria-label="Custom range start" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className={INPUT} />
              <span className="text-[var(--text-secondary)]">to</span>
              <input type="date" aria-label="Custom range end" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className={INPUT} />
            </div>
          )}
          
          <div className="text-xs text-[var(--text-secondary)] ml-auto">Showing: {getDateFilterDisplay()}</div>
        </div>
      </Card>

      {/* Search and Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <SearchInput
            className="w-full sm:max-w-sm"
            placeholder="Search by patient or clinician..."
            value={searchTerm}
            onChange={setSearchTerm}
          />

          <div className="flex items-center gap-3">
            <FilterSelect
              aria-label="Filter by status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'checked_in', label: 'Checked In' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
                { value: 'no_show', label: 'No Show' },
              ]}
            />

            <FilterSelect
              aria-label="Filter by type"
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'consultation', label: 'Consultation' },
                { value: 'follow_up', label: 'Follow Up' },
                { value: 'procedure', label: 'Procedure' },
                { value: 'antenatal', label: 'Antenatal' },
                { value: 'postnatal', label: 'Postnatal' },
                { value: 'vaccination', label: 'Vaccination' },
                { value: 'lab_test', label: 'Lab Test' },
                { value: 'scan', label: 'Scan' },
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

      {/* Appointments Table */}
      {/* A refresh keeps the current rows on screen; skeletons only stand in for the first paint. */}
      {isLoading && filteredAppointments.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] animate-pulse">
              <div className="h-4 bg-[var(--bg-main)] rounded w-1/4 mb-3"></div>
              <div className="h-3 bg-[var(--bg-main)] rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-[var(--bg-main)] rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : filteredAppointments.length === 0 ? (
        <Card padded={false} className="p-8 text-center">
          <Calendar className="w-14 h-14 text-[var(--text-tertiary)] mx-auto mb-3" />
          <p className="text-[var(--text-secondary)] mb-2">{searchTerm || statusFilter !== 'all' || typeFilter !== 'all' ? 'No appointments found' : 'No appointments scheduled yet'}</p>
          <p className="text-[var(--text-tertiary)] text-sm mb-4">Get started by creating your first appointment</p>
          <Button variant="soft" accent="blue" icon={Plus} onClick={() => setShowForm(true)}>
            Schedule First Appointment
          </Button>
        </Card>
      ) : (
        <>
          <div className={TABLE_SHELL}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={TH_ROW}>
                  <tr>
                    <th className={TH}>Patient</th>
                    <th className={TH}>Clinician</th>
                    <th className={TH}>Department</th>
                    <th className={TH}>Date & Time</th>
                    <th className={TH}>Type</th>
                    <th className={TH}>Status</th>
                    <th className={cn(TH, 'text-center')}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAppointments.map((apt) => {
                    const patient = findPatient(apt);
                    const patientName = patient ? getPatientName(patient) : 'Unknown';
                    
                    return (
                      <tr key={apt.id} className={TR}>
                        <td className={cn(TD, 'whitespace-normal')}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                            </div>
                            <div>
                              <p className="font-semibold text-[var(--text-primary)] text-sm">{patientName}</p>
                              <p className="text-xs text-[var(--text-secondary)]">{patient?.folderNumber || 'No Folder'}</p>
                            </div>
                          </div>
                        </td>
                        <td className={cn(TD, 'whitespace-normal')}>
                          <div>
                            <p className="text-sm text-[var(--text-primary)]">{apt.clinician?.fullName || '—'}</p>
                            <p className="text-xs text-[var(--text-secondary)] capitalize">{apt.clinicianRole || '—'}</p>
                          </div>
                        </td>
                        <td className={cn(TD, 'whitespace-normal')}>
                          <span className="text-sm text-[var(--text-primary)]">{apt.department?.name || '—'}</span>
                        </td>
                        <td className={TD}>
                          <div className="text-sm">
                            <p className="font-medium text-[var(--text-primary)]">{new Date(apt.appointmentDate).toLocaleDateString()}</p>
                            <p className="text-[var(--text-secondary)] text-xs">{apt.appointmentTime}</p>
                          </div>
                        </td>
                        <td className={TD}>
                          {/* Appointment types include pink and teal, which Badge has no tone for, so the tint stays local. */}
                          <span className={cn('inline-flex px-2 py-1 text-xs font-medium rounded-full', getTypeColor(apt.type))}>{apt.type.replace('_', ' ').toUpperCase()}</span>
                        </td>
                        <td className={TD}>
                          <Badge tone={getStatusTone(apt.status)} dot size="sm">{humanStatus(apt.status)}</Badge>
                        </td>
                        <td className={TD}>
                          <div className="flex items-center justify-center gap-1">
                            {apt.status === 'scheduled' && (
                              <Button size="sm" variant="ghost" iconOnly icon={CheckCircle} aria-label="Confirm" className="hover:text-[var(--icon-green-text)]" onClick={() => handleStatusUpdate(apt.id, 'confirmed')} />
                            )}
                            {apt.status === 'confirmed' && !apt.checkedIn && (
                              <Button size="sm" variant="ghost" iconOnly icon={User} aria-label="Check In" className="hover:text-[var(--icon-purple-text)]" onClick={() => handleCheckIn(apt.id)} />
                            )}
                            {apt.status === 'checked_in' && (
                              <Button size="sm" variant="ghost" iconOnly icon={Calendar} aria-label="Convert to Attendance" className="hover:text-[var(--icon-green-text)]" onClick={() => handleConvertToAttendance(apt)} />
                            )}
                            {canEditAppointment(apt) && apt.status !== 'completed' && apt.status !== 'cancelled' && (
                              <Button size="sm" variant="ghost" iconOnly icon={Edit} aria-label="Edit" className="hover:text-[var(--icon-blue-text)]" onClick={() => handleEdit(apt)} />
                            )}
                            {hasRole(['admin']) && (
                              <Button size="sm" variant="ghost" iconOnly icon={Trash2} aria-label="Delete" className="hover:text-[var(--icon-red-text)]" onClick={() => handleDelete(apt.id)} />
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

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredAppointments.length}
            noun="appointments"
            onChange={goToPage}
          />
        </>
      )}

      {/* ✅ NewAttendanceModal for converting appointment */}
      {showAttendanceModal && selectedAppointmentForAttendance && (
        <NewAttendanceModal
          patientId={selectedAppointmentForAttendance.patientId}
          onSuccess={handleAttendanceSuccess}
          onClose={handleAttendanceClose}
          isEditMode={false}
        />
      )}

      {/* Appointment Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-2xl shadow-lg border border-[var(--border-color)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{editingAppointment ? 'Edit Appointment' : 'Schedule New Appointment'}</h2>
              <Button variant="ghost" iconOnly icon={XCircle} aria-label="Close" onClick={() => { setShowForm(false); setEditingAppointment(null); resetForm(); }} />
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Patient" required>
                  <Select 
                    options={patientOptions} 
                    value={selectedPatientLabel} 
                    onChange={(option: any) => setFormData({ ...formData, patientId: option?.value || '' })} 
                    placeholder="Search patient by name or folder number..." 
                    isClearable 
                    isLoading={patientsLoading} 
                    styles={selectStyles} 
                    noOptionsMessage={() => "No patients found"} 
                  />
                </Field>
                <Field label="Clinician (Doctor/Nurse/Midwife)" required>
                  <Select 
                    options={clinicianOptions} 
                    value={selectedClinicianLabel} 
                    onChange={(option: any) => setFormData({ ...formData, clinicianId: option?.value || '' })} 
                    placeholder="Search clinician by name..." 
                    isClearable 
                    isLoading={false} 
                    styles={selectStyles} 
                    noOptionsMessage={() => "No clinicians found"} 
                  />
                  {/* Show department info from selected clinician */}
                  {selectedClinicianLabel && (
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">
                      Department: {selectedClinicianLabel.departmentName || 'Not assigned'}
                    </p>
                  )}
                </Field>
              </div>

              <Field label="Title" required>
                <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className={cn(INPUT, 'w-full')} placeholder="Appointment title" />
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Date" required>
                  <input type="date" required value={formData.appointmentDate} onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })} className={cn(INPUT, 'w-full')} />
                </Field>
                <Field label="Time" required>
                  <input type="time" required value={formData.appointmentTime} onChange={(e) => setFormData({ ...formData, appointmentTime: e.target.value })} className={cn(INPUT, 'w-full')} />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Type" required>
                  <select required value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className={cn(SELECT, 'w-full')}>
                    <option value="consultation">Consultation</option>
                    <option value="follow_up">Follow Up</option>
                    <option value="procedure">Procedure</option>
                    <option value="antenatal">Antenatal</option>
                    <option value="postnatal">Postnatal</option>
                    <option value="vaccination">Vaccination</option>
                    <option value="lab_test">Lab Test</option>
                    <option value="scan">Scan</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                <Field label="Duration (minutes)">
                  <input type="number" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })} className={cn(INPUT, 'w-full')} />
                </Field>
              </div>

              <Field label="Description">
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className={cn(INPUT, 'w-full', 'resize-none')} placeholder="Appointment description or notes" />
              </Field>

              <div className="flex gap-3 justify-end pt-4">
                <Button variant="secondary" onClick={() => { setShowForm(false); setEditingAppointment(null); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" variant="soft" accent="blue">
                  {editingAppointment ? 'Update' : 'Schedule'} Appointment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}