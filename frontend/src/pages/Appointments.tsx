// src/pages/Appointments.tsx - FULLY CORRECTED VERSION
import { useEffect, useState, useMemo } from 'react';
import { useAppointmentStore } from '../store/appointmentStore';
import { useAuthStore } from '../store/authStore';
import { usePatientStore } from '../store/patientStore';
import { useDepartmentStore } from '../store/departmentStore';
import { useToast } from '../store/toastStore';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';

import {
  Plus,
  Search,
  Calendar,
  Clock,
  User,
  Stethoscope,
  Building,
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

type DateFilterType = 'today' | 'tomorrow' | 'week' | 'custom';

interface SelectOption {
  value: string;
  label: string;
  role?: string;
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
    convertToAttendance,
    getAvailableClinicians,
    availableClinicians,
    isLoading 
  } = useAppointmentStore();
  const { patients, loadPatients, isLoading: patientsLoading } = usePatientStore();
  const { departments, getDepartments, isLoading: departmentsLoading } = useDepartmentStore();
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAppointmentForAttendance, setSelectedAppointmentForAttendance] = useState<any>(null);
  const [paymentData, setPaymentData] = useState({
    paymentMode: 'cash',
    insuranceProviderId: '',
    nhisCCC: '',
    corporateAccountId: ''
  });

  // Form data
  const [formData, setFormData] = useState({
    patientId: '',
    clinicianId: '',
    departmentId: '',
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
      label: `${patient.surname} ${patient.otherNames || ''}`.trim(),
      folderNumber: patient.folderNumber
    }));
  }, [patients]);

  // Convert clinicians to Select options
  const clinicianOptions: SelectOption[] = useMemo(() => {
    return availableClinicians.map(clinician => ({
      value: clinician.id,
      label: `${clinician.fullName} (${clinician.role})`,
      role: clinician.role
    }));
  }, [availableClinicians]);

  // Convert departments to Select options
  const departmentOptions: SelectOption[] = useMemo(() => {
    return departments.map(dept => ({
      value: dept.id,
      label: dept.name
    }));
  }, [departments]);

  // Get selected patient label
  const selectedPatientLabel = useMemo(() => {
    const patient = patients.find(p => p.id === formData.patientId);
    if (!patient) return null;
    return {
      value: patient.id,
      label: `${patient.surname} ${patient.otherNames || ''}`.trim()
    };
  }, [patients, formData.patientId]);

  // Get selected clinician label
  const selectedClinicianLabel = useMemo(() => {
    const clinician = availableClinicians.find(c => c.id === formData.clinicianId);
    if (!clinician) return null;
    return {
      value: clinician.id,
      label: `${clinician.fullName} (${clinician.role})`
    };
  }, [availableClinicians, formData.clinicianId]);

  // Get selected department label
  const selectedDepartmentLabel = useMemo(() => {
    const dept = departments.find(d => d.id === formData.departmentId);
    if (!dept) return null;
    return {
      value: dept.id,
      label: dept.name
    };
  }, [departments, formData.departmentId]);

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
        getAppointments(filters),
        loadPatients(),
        getDepartments(),
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

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter, dateFilter, customStartDate, customEndDate]);

  // Get patient name helper
  const getPatientName = (patient: any) => {
    if (!patient) return 'Unknown Patient';
    return `${patient.surname || ''} ${patient.otherNames || ''}`.trim() || 'Unknown Patient';
  };

  // Get patient by ID
  const findPatient = (appointment: any) => {
    if (!appointment) return null;
    const patientId = appointment.patientId || appointment.patient?.id;
    if (!patientId) return null;
    return patients.find(p => p.id === patientId);
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
  }, [appointments, patients, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAppointments = filteredAppointments.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  // Handle convert to attendance
  const handleConvertToAttendance = (appointment: any) => {
    setSelectedAppointmentForAttendance(appointment);
    setPaymentData({
      paymentMode: 'cash',
      insuranceProviderId: '',
      nhisCCC: '',
      corporateAccountId: ''
    });
    setShowPaymentModal(true);
  };

  // Confirm payment and create attendance
  const confirmConvertToAttendance = async () => {
    if (!selectedAppointmentForAttendance) return;
    
    try {
      const result = await convertToAttendance(selectedAppointmentForAttendance.id, paymentData);
      setShowPaymentModal(false);
      setSelectedAppointmentForAttendance(null);
      success('Converted', 'Appointment converted to attendance successfully');
      
      await updateAppointmentStatus(selectedAppointmentForAttendance.id, 'completed');
      navigate(`/dashboard/attendance/${result.attendance?.id || result.id}`);
      await loadData();
    } catch (err: any) {
      error('Conversion Failed', err.message || 'Could not convert to attendance');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAppointment) {
        await updateAppointment(editingAppointment.id, formData);
        success('Appointment Updated', 'Appointment updated successfully');
      } else {
        await createAppointment(formData);
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
      departmentId: apt.departmentId,
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
    if (window.confirm('Are you sure you want to delete this appointment?')) {
      try {
        await deleteAppointment(id);
        success('Appointment Deleted', 'Appointment deleted successfully');
        await loadData();
      } catch (err) {
        error('Delete Failed', 'Failed to delete appointment');
      }
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await updateAppointmentStatus(id, status);
      success('Status Updated', `Appointment ${status.replace('_', ' ')}`);
      await loadData();
    } catch (err) {
      error('Update Failed', 'Failed to update appointment status');
    }
  };

  const handleCheckIn = async (id: string) => {
    try {
      await checkInAppointment(id);
      success('Checked In', 'Patient checked in successfully');
      await loadData();
    } catch (err) {
      error('Check-in Failed', 'Failed to check in patient');
    }
  };

  const resetForm = () => {
    setFormData({
      patientId: '',
      clinicianId: '',
      departmentId: '',
      title: '',
      description: '',
      appointmentDate: '',
      appointmentTime: '',
      duration: 30,
      type: 'consultation'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)]';
      case 'confirmed': return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]';
      case 'checked_in': return 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]';
      case 'in_progress': return 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]';
      case 'completed': return 'bg-[var(--bg-main)] text-[var(--text-secondary)]';
      case 'cancelled': return 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]';
      case 'no_show': return 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]';
      default: return 'bg-[var(--bg-main)] text-[var(--text-secondary)]';
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-[var(--bg-main)] rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div className="w-12 h-12 bg-[var(--icon-purple-bg)] rounded-xl flex items-center justify-center">
            <Calendar className="w-6 h-6 text-[var(--icon-purple-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Appointment Management</h1>
            <p className="text-sm text-[var(--text-secondary)]">Schedule and manage patient appointments</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              {filteredAppointments.length} appointment(s) • {stats.today} today
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard/attendance')}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm"
          >
            <User className="w-4 h-4" />
            Attendance
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Appointment
          </button>
          <button
            onClick={loadData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">Total Appointments</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="text-2xl font-bold text-[var(--icon-blue-text)]">{stats.scheduled}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">Scheduled</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="text-2xl font-bold text-[var(--icon-green-text)]">{stats.confirmed}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">Confirmed</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="text-2xl font-bold text-[var(--icon-purple-text)]">{stats.today}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">Today</div>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="text-sm font-medium text-[var(--text-primary)]">Show:</span>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => { setDateFilter('today'); setShowDatePicker(false); }} className={`px-3 py-1.5 text-sm rounded-lg transition-all ${dateFilter === 'today' ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' : 'bg-[var(--bg-main)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'}`}>
              Today
            </button>
            <button onClick={() => { setDateFilter('tomorrow'); setShowDatePicker(false); }} className={`px-3 py-1.5 text-sm rounded-lg transition-all ${dateFilter === 'tomorrow' ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' : 'bg-[var(--bg-main)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'}`}>
              Tomorrow
            </button>
            <button onClick={() => { setDateFilter('week'); setShowDatePicker(false); }} className={`px-3 py-1.5 text-sm rounded-lg transition-all ${dateFilter === 'week' ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' : 'bg-[var(--bg-main)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'}`}>
              Next 7 Days
            </button>
            <button onClick={() => { setDateFilter('custom'); setShowDatePicker(true); }} className={`px-3 py-1.5 text-sm rounded-lg transition-all ${dateFilter === 'custom' ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' : 'bg-[var(--bg-main)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'}`}>
              Custom
            </button>
          </div>

          {showDatePicker && dateFilter === 'custom' && (
            <div className="flex items-center gap-3 ml-auto">
              <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="px-3 py-1.5 text-sm border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)]" />
              <span className="text-[var(--text-secondary)]">to</span>
              <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="px-3 py-1.5 text-sm border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)]" />
            </div>
          )}
          
          <div className="text-xs text-[var(--text-secondary)] ml-auto">Showing: {getDateFilterDisplay()}</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full sm:max-w-sm relative">
            <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input type="text" placeholder="Search by patient or clinician..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all text-sm" />
          </div>

          <div className="flex items-center gap-3">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm">
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="checked_in">Checked In</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>

            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm">
              <option value="all">All Types</option>
              <option value="consultation">Consultation</option>
              <option value="follow_up">Follow Up</option>
              <option value="procedure">Procedure</option>
              <option value="antenatal">Antenatal</option>
              <option value="postnatal">Postnatal</option>
              <option value="vaccination">Vaccination</option>
              <option value="lab_test">Lab Test</option>
              <option value="scan">Scan</option>
            </select>

            <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="px-3 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm">
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appointments Table */}
      {isLoading ? (
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
        <div className="bg-[var(--bg-card)] rounded-xl p-8 border border-[var(--border-color)] text-center">
          <Calendar className="w-14 h-14 text-[var(--text-tertiary)] mx-auto mb-3" />
          <p className="text-[var(--text-secondary)] mb-2">{searchTerm || statusFilter !== 'all' || typeFilter !== 'all' ? 'No appointments found' : 'No appointments scheduled yet'}</p>
          <p className="text-[var(--text-tertiary)] text-sm mb-4">Get started by creating your first appointment</p>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 text-[var(--icon-blue-text)] hover:text-[var(--icon-blue-text)] font-medium text-sm transition-colors">
            <Plus className="w-4 h-4" />
            Schedule First Appointment
          </button>
        </div>
      ) : (
        <>
          <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Patient</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Clinician</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Date & Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {paginatedAppointments.map((apt) => {
                  const patient = findPatient(apt);
                  const patientName = patient ? getPatientName(patient) : 'Unknown';
                  
                  return (
                    <tr key={apt.id} className="hover:bg-[var(--bg-main)] transition-colors duration-150">
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm text-[var(--text-primary)]">{apt.clinician?.fullName || '—'}</p>
                          <p className="text-xs text-[var(--text-secondary)] capitalize">{apt.clinicianRole || '—'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-[var(--text-primary)]">{apt.department?.name || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p className="font-medium text-[var(--text-primary)]">{new Date(apt.appointmentDate).toLocaleDateString()}</p>
                          <p className="text-[var(--text-secondary)] text-xs">{apt.appointmentTime}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(apt.type)}`}>{apt.type.replace('_', ' ').toUpperCase()}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(apt.status)}`}>{apt.status.replace('_', ' ').toUpperCase()}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {apt.status === 'scheduled' && (
                            <button onClick={() => handleStatusUpdate(apt.id, 'confirmed')} className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--icon-green-text)] hover:bg-[var(--icon-green-bg)] rounded-lg transition-colors" title="Confirm">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {apt.status === 'confirmed' && !apt.checkedIn && (
                            <button onClick={() => handleCheckIn(apt.id)} className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--icon-purple-text)] hover:bg-[var(--icon-purple-bg)] rounded-lg transition-colors" title="Check In">
                              <User className="w-4 h-4" />
                            </button>
                          )}
                          {apt.status === 'checked_in' && (
                            <button onClick={() => handleConvertToAttendance(apt)} className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--icon-green-text)] hover:bg-[var(--icon-green-bg)] rounded-lg transition-colors" title="Convert to Attendance">
                              <Calendar className="w-4 h-4" />
                            </button>
                          )}
                          {canEditAppointment(apt) && apt.status !== 'completed' && apt.status !== 'cancelled' && (
                            <button onClick={() => handleEdit(apt)} className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--icon-blue-text)] hover:bg-[var(--icon-blue-bg)] rounded-lg transition-colors" title="Edit">
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {canEditAppointment(apt) && (
                            <button onClick={() => handleDelete(apt.id)} className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] rounded-lg transition-colors" title="Delete">
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="text-sm text-[var(--text-secondary)]">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredAppointments.length)} of {filteredAppointments.length} appointment records
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="p-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
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
                      <button key={pageNum} onClick={() => goToPage(pageNum)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]'}`}>
                        {pageNum}
                      </button>
                    );
                  })}
                  <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedAppointmentForAttendance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl max-w-md w-full border border-[var(--border-color)]">
            <div className="p-6 border-b border-[var(--border-color)]">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Select Payment Method</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">Patient: {getPatientName(findPatient(selectedAppointmentForAttendance))}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Payment Mode *</label>
                <select value={paymentData.paymentMode} onChange={(e) => setPaymentData({ ...paymentData, paymentMode: e.target.value })} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm">
                  <option value="cash">Cash</option>
                  <option value="nhis">NHIS</option>
                  <option value="private_insurance">Private Insurance</option>
                  <option value="corporate">Corporate</option>
                </select>
              </div>
              {paymentData.paymentMode === 'nhis' && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">NHIS Number *</label>
                  <input type="text" value={paymentData.nhisCCC} onChange={(e) => setPaymentData({ ...paymentData, nhisCCC: e.target.value })} placeholder="Enter NHIS number" className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm" />
                </div>
              )}
              {(paymentData.paymentMode === 'nhis' || paymentData.paymentMode === 'private_insurance') && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Insurance Provider</label>
                  <input type="text" value={paymentData.insuranceProviderId} onChange={(e) => setPaymentData({ ...paymentData, insuranceProviderId: e.target.value })} placeholder="Provider ID" className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm" />
                </div>
              )}
              {paymentData.paymentMode === 'corporate' && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Corporate Account ID</label>
                  <input type="text" value={paymentData.corporateAccountId} onChange={(e) => setPaymentData({ ...paymentData, corporateAccountId: e.target.value })} placeholder="Enter Corporate Account ID" className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm" />
                </div>
              )}
            </div>
            <div className="p-6 border-t border-[var(--border-color)] flex gap-3 justify-end">
              <button onClick={() => { setShowPaymentModal(false); setSelectedAppointmentForAttendance(null); }} className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm font-medium">
                Cancel
              </button>
              <button onClick={confirmConvertToAttendance} className="px-4 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white transition-all text-sm font-medium">
                Confirm & Create Attendance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-2xl shadow-lg border border-[var(--border-color)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{editingAppointment ? 'Edit Appointment' : 'Schedule New Appointment'}</h2>
              <button onClick={() => { setShowForm(false); setEditingAppointment(null); resetForm(); }} className="p-2 hover:bg-[var(--bg-main)] rounded-lg transition">
                <XCircle className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Patient *</label>
                  <Select options={patientOptions} value={selectedPatientLabel} onChange={(option: any) => setFormData({ ...formData, patientId: option?.value || '' })} placeholder="Search patient by name or folder number..." isClearable isLoading={patientsLoading} styles={selectStyles} noOptionsMessage={() => "No patients found"} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Clinician (Doctor/Nurse/Midwife) *</label>
                  <Select options={clinicianOptions} value={selectedClinicianLabel} onChange={(option: any) => setFormData({ ...formData, clinicianId: option?.value || '' })} placeholder="Search clinician by name..." isClearable isLoading={false} styles={selectStyles} noOptionsMessage={() => "No clinicians found"} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Department *</label>
                  <Select options={departmentOptions} value={selectedDepartmentLabel} onChange={(option: any) => setFormData({ ...formData, departmentId: option?.value || '' })} placeholder="Select department..." isClearable isLoading={departmentsLoading} styles={selectStyles} noOptionsMessage={() => "No departments found"} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Title *</label>
                  <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm" placeholder="Appointment title" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Date *</label>
                  <input type="date" required value={formData.appointmentDate} onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })} className="w-full px-3 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Time *</label>
                  <input type="time" required value={formData.appointmentTime} onChange={(e) => setFormData({ ...formData, appointmentTime: e.target.value })} className="w-full px-3 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Type *</label>
                  <select required value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full px-3 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm">
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
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Duration (minutes)</label>
                  <input type="number" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })} className="w-full px-3 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-3 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm resize-none" placeholder="Appointment description or notes" />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => { setShowForm(false); setEditingAppointment(null); resetForm(); }} className="px-4 py-2.5 text-[var(--text-secondary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all font-medium text-sm">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2.5 bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded-lg hover:bg-[var(--icon-blue-text)] hover:text-white transition-all font-medium text-sm">
                  {editingAppointment ? 'Update' : 'Schedule'} Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}