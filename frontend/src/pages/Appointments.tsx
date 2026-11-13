// src/pages/Appointments.tsx - FIXED with NewAttendanceModal + View All + Sort
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
import { Badge, Button, Card, cn, Field, FilterSelect, humanStatus, INPUT, PageHeader, Pagination, SearchInput, Segmented, SELECT, StatCard, TABLE_SHELL, TD, TH, TH_ROW, TR, type BadgeTone } from '../components/ui';
import { Plus, Calendar, User, Edit, Trash2, RefreshCw, CheckCircle, XCircle, Grid, List, Filter } from 'lucide-react';

type DateFilterType = 'all' | 'today' | 'tomorrow' | 'week' | 'custom';
type SortKey = 'dateAsc' | 'dateDesc' | 'patientName' | 'folder' | 'clinician' | 'department' | 'type' | 'status';
interface SelectOption { value: string; label: string; role?: string; departmentId?: string; departmentName?: string; folderNumber?: string; }

export default function Appointments() {
  const navigate = useNavigate();
  const { appointments, getAppointments, createAppointment, updateAppointment, deleteAppointment, updateAppointmentStatus, checkInAppointment, getAvailableClinicians, availableClinicians, isLoading, error: storeError } = useAppointmentStore();
  const { patients, loadPatients, isLoading: patientsLoading } = usePatientStore();
  const { user, hasRole } = useAuthStore();
  const { success, error } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('dateAsc');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('list');
  const [showForm, setShowForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedAppointmentForAttendance, setSelectedAppointmentForAttendance] = useState<any>(null);
  const [formData, setFormData] = useState({ patientId: '', clinicianId: '', title: '', description: '', appointmentDate: '', appointmentTime: '', duration: 30, type: 'consultation' });

  const patientOptions: SelectOption[] = useMemo(() => patients.map(p => ({ value: p.id, label: p.name || `${p.surname || ''} ${p.otherNames || ''}`.trim(), folderNumber: p.folderNumber })), [patients]);
  const clinicianOptions: SelectOption[] = useMemo(() => availableClinicians.map(c => ({ value: c.id, label: `${c.fullName} (${c.role})`, role: c.role, departmentId: c.departmentId, departmentName: c.department?.name })), [availableClinicians]);
  const selectedPatientLabel = useMemo(() => { const p = patients.find(x => x.id === formData.patientId); return p ? { value: p.id, label: p.name || `${p.surname || ''} ${p.otherNames || ''}`.trim() } : null; }, [patients, formData.patientId]);
  const selectedClinicianLabel = useMemo(() => { const c = availableClinicians.find(x => x.id === formData.clinicianId); return c ? { value: c.id, label: `${c.fullName} (${c.role})`, departmentId: c.departmentId, departmentName: c.department?.name } : null; }, [availableClinicians, formData.clinicianId]);

  const getDateRange = (): { startDate: Date; endDate: Date } | null => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
    switch (dateFilter) {
      case 'all': return null;
      case 'today': return { startDate: today, endDate: endOfDay };
      case 'tomorrow': { const t = new Date(today); t.setDate(t.getDate() + 1); const e = new Date(t); e.setHours(23, 59, 59, 999); t.setHours(0, 0, 0, 0); return { startDate: t, endDate: e }; }
      case 'week': { const e = new Date(today); e.setDate(e.getDate() + 7); e.setHours(23, 59, 59, 999); return { startDate: today, endDate: e }; }
      case 'custom': if (customStartDate && customEndDate) { const s = new Date(customStartDate); s.setHours(0, 0, 0, 0); const e = new Date(customEndDate); e.setHours(23, 59, 59, 999); return { startDate: s, endDate: e }; } return null;
      default: return null;
    }
  };

  const loadData = async () => {
    try {
      setRefreshing(true);
      const range = getDateRange(); const filters: any = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (typeFilter !== 'all') filters.type = typeFilter;
      if (range) { filters.dateFrom = range.startDate.toISOString(); filters.dateTo = range.endDate.toISOString(); }
      await Promise.all([getAppointments({ ...filters, limit: 5000 }), loadPatients().catch(() => undefined), getAvailableClinicians(['doctor', 'nurse', 'midwife'])]);
    } catch { error('Load Failed', 'Failed to load appointment data'); } finally { setRefreshing(false); }
  };
  useEffect(() => { loadData(); }, [statusFilter, typeFilter, dateFilter, customStartDate, customEndDate]);
  useEffect(() => { if (storeError) error('Appointments Not Loaded', storeError); }, [storeError]);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, typeFilter, dateFilter, customStartDate, customEndDate, sortKey]);

  const getPatientName = (p: any) => !p ? 'Unknown Patient' : p.name || p.fullName || `${p.surname || ''} ${p.otherNames || ''}`.trim() || 'Unknown Patient';
  const patientById = useMemo(() => new Map((patients || []).map((p: any) => [p.id, p] as [string, any])), [patients]);
  const findPatient = (apt: any) => { if (!apt) return null; const id = apt.patientId || apt.patient?.id; return id ? patientById.get(id) : null; };

  const filteredAppointments = useMemo(() => {
    const apts = Array.isArray(appointments) ? appointments : [];
    const filtered = apts.filter(apt => {
      if (!apt || !apt.id) return false;
      const p = findPatient(apt); const name = p ? getPatientName(p) : '';
      const lower = searchTerm.toLowerCase();
      return searchTerm === '' || name.toLowerCase().includes(lower) || (apt.clinician?.fullName || '').toLowerCase().includes(lower) || (apt.title || '').toLowerCase().includes(lower);
    });
    const byDate = (a: any, b: any) => new Date(`${a.appointmentDate}T${a.appointmentTime || '00:00'}`).getTime() - new Date(`${b.appointmentDate}T${b.appointmentTime || '00:00'}`).getTime();
    switch (sortKey) {
      case 'dateDesc': return [...filtered].sort((a, b) => -byDate(a, b));
      case 'patientName': return [...filtered].sort((a, b) => getPatientName(findPatient(a)).localeCompare(getPatientName(findPatient(b))));
      case 'folder': return [...filtered].sort((a, b) => String(findPatient(a)?.folderNumber || '').localeCompare(String(findPatient(b)?.folderNumber || '')));
      case 'clinician': return [...filtered].sort((a, b) => String(a.clinician?.fullName || '').localeCompare(String(b.clinician?.fullName || '')));
      case 'department': return [...filtered].sort((a, b) => String(a.department?.name || '').localeCompare(String(b.department?.name || '')));
      case 'type': return [...filtered].sort((a, b) => String(a.type || '').localeCompare(String(b.type || '')));
      case 'status': return [...filtered].sort((a, b) => String(a.status || '').localeCompare(String(b.status || '')));
      case 'dateAsc': default: return [...filtered].sort(byDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments, patientById, searchTerm, sortKey]);

  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAppointments = filteredAppointments.slice(startIndex, startIndex + itemsPerPage);
  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  const handleConvertToAttendance = (apt: any) => { setSelectedAppointmentForAttendance(apt); setShowAttendanceModal(true); };
  const handleAttendanceSuccess = async (attendance: any) => {
    setShowAttendanceModal(false);
    try { if (selectedAppointmentForAttendance?.id) await updateAppointmentStatus(selectedAppointmentForAttendance.id, 'completed'); success('Converted', 'Appointment converted to attendance successfully'); }
    catch (err: any) { error('Attendance created', `The appointment is still marked as booked - ${describeApiError(err, 'its status could not be updated')}.`); }
    navigate(`/dashboard/attendance/${attendance.id}`); await loadData(); setSelectedAppointmentForAttendance(null);
  };
  const handleAttendanceClose = () => { setShowAttendanceModal(false); setSelectedAppointmentForAttendance(null); };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); const sel = availableClinicians.find(c => c.id === formData.clinicianId);
    const payload = { ...formData, departmentId: sel?.departmentId || null, clinicianRole: sel?.role };
    try { if (editingAppointment) { await updateAppointment(editingAppointment.id, payload); success('Appointment Updated', 'Appointment updated successfully'); } else { await createAppointment(payload); success('Appointment Created', 'Appointment created successfully'); } setShowForm(false); setEditingAppointment(null); resetForm(); await loadData(); }
    catch (err: any) { error('Save Failed', err.message || 'Failed to save appointment'); }
  };
  const handleEdit = (apt: any) => { setEditingAppointment(apt); setFormData({ patientId: apt.patientId, clinicianId: apt.clinicianId, title: apt.title, description: apt.description || '', appointmentDate: apt.appointmentDate?.split('T')[0] || '', appointmentTime: apt.appointmentTime, duration: apt.duration, type: apt.type }); setShowForm(true); };
  const handleDelete = async (id: string) => { if (await confirmDialog({ title: 'Delete appointment', message: 'Are you sure you want to delete this appointment?', confirmText: 'Delete' })) { try { await deleteAppointment(id); success('Appointment Deleted', 'Appointment deleted successfully'); await loadData(); } catch (err: any) { error('Delete Failed', describeApiError(err, 'The appointment could not be deleted.')); } } };
  const handleStatusUpdate = async (id: string, status: string) => { try { await updateAppointmentStatus(id, status); success('Status Updated', `Appointment ${status.replace('_', ' ')}`); await loadData(); } catch (err: any) { error('Update Failed', describeApiError(err, 'The appointment status could not be updated.')); } };
  const handleCheckIn = async (id: string) => { try { await checkInAppointment(id); success('Checked In', 'Patient checked in successfully'); await loadData(); } catch (err: any) { error('Check-in Failed', describeApiError(err, 'The patient could not be checked in.')); } };
  const resetForm = () => setFormData({ patientId: '', clinicianId: '', title: '', description: '', appointmentDate: '', appointmentTime: '', duration: 30, type: 'consultation' });
  const getStatusTone = (status: string): BadgeTone => ({ scheduled: 'blue', confirmed: 'green', checked_in: 'purple', in_progress: 'yellow', cancelled: 'red', no_show: 'orange' } as Record<string, BadgeTone>)[status] || 'neutral';
  const getTypeColor = (type: string) => ({ consultation: 'text-[var(--icon-blue-text)] bg-[var(--icon-blue-bg)]', follow_up: 'text-[var(--icon-cyan-text)] bg-[var(--icon-cyan-bg)]', procedure: 'text-[var(--icon-purple-text)] bg-[var(--icon-purple-bg)]', antenatal: 'text-[var(--icon-pink-text)] bg-[var(--icon-pink-bg)]', postnatal: 'text-[var(--icon-teal-text)] bg-[var(--icon-teal-bg)]', vaccination: 'text-[var(--icon-orange-text)] bg-[var(--icon-orange-bg)]', lab_test: 'text-[var(--icon-green-text)] bg-[var(--icon-green-bg)]', scan: 'text-[var(--icon-indigo-text)] bg-[var(--icon-indigo-bg)]' } as Record<string, string>)[type] || 'text-[var(--text-secondary)] bg-[var(--bg-main)]';
  const canEditAppointment = (apt: any) => hasRole(['admin']) || apt.clinicianId === user?.id;
  const stats = { total: filteredAppointments.length, scheduled: filteredAppointments.filter(a => a.status === 'scheduled').length, confirmed: filteredAppointments.filter(a => a.status === 'confirmed').length, today: filteredAppointments.filter(a => new Date(a.appointmentDate).toDateString() === new Date().toDateString()).length };
  const getDateFilterDisplay = () => dateFilter === 'all' ? 'All Appointments' : dateFilter === 'today' ? 'Today' : dateFilter === 'tomorrow' ? 'Tomorrow' : dateFilter === 'week' ? 'Next 7 Days' : (customStartDate && customEndDate ? `${new Date(customStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(customEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Custom Range');
  const dateBtn = (key: DateFilterType, label: string) => (<button key={key} onClick={() => { setDateFilter(key); setShowDatePicker(key === 'custom'); setCurrentPage(1); }} className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-all ${dateFilter === key ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' : 'bg-[var(--bg-main)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'}`}>{label}</button>);
  const selectStyles = { control: (base: any, state: any) => ({ ...base, backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)', borderRadius: '0.5rem', padding: '0.125rem', boxShadow: state.isFocused ? '0 0 0 2px var(--icon-blue-text)' : 'none', '&:hover': { borderColor: 'var(--icon-blue-text)' } }), option: (base: any, state: any) => ({ ...base, backgroundColor: state.isFocused ? 'var(--bg-main)' : 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer', '&:active': { backgroundColor: 'var(--icon-blue-bg)' } }), singleValue: (base: any) => ({ ...base, color: 'var(--text-primary)' }), input: (base: any) => ({ ...base, color: 'var(--text-primary)' }), menu: (base: any) => ({ ...base, backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', zIndex: 50 }), placeholder: (base: any) => ({ ...base, color: 'var(--text-tertiary)' }) };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <PageHeader title="Appointment Management" subtitle="Schedule and manage patient appointments" meta={`${filteredAppointments.length} appointment(s) • ${stats.today} today`} icon={Calendar} accent="purple" backTo="/dashboard" actions={<><Button icon={RefreshCw} loading={refreshing} onClick={loadData}>{refreshing ? 'Refreshing...' : 'Refresh'}</Button><Button variant="secondary" icon={User} onClick={() => navigate('/dashboard/attendance')}>Attendance</Button><Button variant="soft" accent="cyan" icon={Plus} onClick={() => setShowForm(true)}>New Appointment</Button></>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4"><StatCard label="Total Appointments" value={stats.total} /><StatCard label="Scheduled" value={stats.scheduled} accent="blue" /><StatCard label="Confirmed" value={stats.confirmed} accent="green" /><StatCard label="Today" value={stats.today} accent="purple" /></div>

      {/* Date Filter Bar — same shell as Patients / Attendance */}
      <div className="bg-[var(--bg-card)] rounded-xl p-3 sm:p-4 shadow-sm border border-[var(--border-color)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-[var(--text-secondary)]" /><span className="text-sm font-medium text-[var(--text-primary)]">Show:</span></div>
          <div className="flex gap-2 overflow-x-auto max-w-full pb-0.5">{dateBtn('all', 'View All')}{dateBtn('today', 'Today')}{dateBtn('tomorrow', 'Tomorrow')}{dateBtn('week', 'Next 7 Days')}{dateBtn('custom', 'Custom')}</div>
          {showDatePicker && dateFilter === 'custom' && (<div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto sm:ml-auto"><input type="date" aria-label="Custom range start" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className={INPUT} /><span className="text-[var(--text-secondary)]">to</span><input type="date" aria-label="Custom range end" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className={INPUT} /></div>)}
          <div className="text-xs text-[var(--text-secondary)] ml-auto hidden sm:block">Showing: {getDateFilterDisplay()} • {filteredAppointments.length} appointments</div>
        </div>
      </div>

      {/* Controls — Search + Sort + View — same shell as Patients / Attendance */}
      <div className="bg-[var(--bg-card)] rounded-xl p-3 sm:p-4 shadow-sm border border-[var(--border-color)]">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <SearchInput className="w-full lg:max-w-sm" placeholder="Search by patient or clinician..." value={searchTerm} onChange={setSearchTerm} />
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <FilterSelect aria-label="Sort appointments" value={sortKey} onChange={v => setSortKey(v as SortKey)} options={[{ value: 'dateAsc', label: 'Earliest first' }, { value: 'dateDesc', label: 'Latest first' }, { value: 'patientName', label: 'Patient Name A–Z' }, { value: 'folder', label: 'Folder #' }, { value: 'clinician', label: 'Clinician' }, { value: 'department', label: 'Department' }, { value: 'type', label: 'Type' }, { value: 'status', label: 'Status' }]} />
            <FilterSelect aria-label="Filter by status" value={statusFilter} onChange={setStatusFilter} options={[{ value: 'all', label: 'All Status' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'confirmed', label: 'Confirmed' }, { value: 'checked_in', label: 'Checked In' }, { value: 'in_progress', label: 'In Progress' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }, { value: 'no_show', label: 'No Show' }]} />
            <FilterSelect aria-label="Filter by type" value={typeFilter} onChange={setTypeFilter} options={[{ value: 'all', label: 'All Types' }, { value: 'consultation', label: 'Consultation' }, { value: 'follow_up', label: 'Follow Up' }, { value: 'procedure', label: 'Procedure' }, { value: 'antenatal', label: 'Antenatal' }, { value: 'postnatal', label: 'Postnatal' }, { value: 'vaccination', label: 'Vaccination' }, { value: 'lab_test', label: 'Lab Test' }, { value: 'scan', label: 'Scan' }]} />
            <Segmented aria-label="Appointment layout" value={viewMode} onChange={setViewMode} options={[{ value: 'cards', label: 'Cards', icon: Grid }, { value: 'list', label: 'List', icon: List }]} />
            <FilterSelect aria-label="Rows per page" value={String(itemsPerPage)} onChange={v => { setItemsPerPage(Number(v)); setCurrentPage(1); }} options={[{ value: '10', label: '10 per page' }, { value: '20', label: '20 per page' }, { value: '50', label: '50 per page' }]} />
          </div>
        </div>
      </div>

      {/* Stats strip — same shell as Patients / Attendance */}
      {filteredAppointments.length > 0 && (
        <div className="bg-[var(--bg-card)] rounded-xl p-3 sm:p-4 border border-[var(--border-color)]">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Showing {paginatedAppointments.length} of {filteredAppointments.length} appointment records {searchTerm && <span className="text-xs font-normal text-[var(--text-secondary)]">for "{searchTerm}"</span>}</p>
            <div className="flex items-center gap-2 flex-wrap"><Badge tone="blue" dot size="sm">Scheduled: {stats.scheduled}</Badge><Badge tone="green" dot size="sm">Confirmed: {stats.confirmed}</Badge><Badge tone="purple" dot size="sm">Today: {stats.today}</Badge></div>
          </div>
        </div>
      )}

      {isLoading && filteredAppointments.length === 0 ? (<div className="space-y-3">{[1,2,3].map(i => (<div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] animate-pulse"><div className="h-4 bg-[var(--bg-main)] rounded w-1/4 mb-3" /><div className="h-3 bg-[var(--bg-main)] rounded w-1/2 mb-2" /><div className="h-3 bg-[var(--bg-main)] rounded w-2/3" /></div>))}</div>)
      : filteredAppointments.length === 0 ? (<Card padded={false} className="p-8 text-center"><Calendar className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" /><h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{searchTerm ? 'No Appointments Found' : 'No Appointment Records'}</h3><p className="text-[var(--text-secondary)] text-sm mb-4">{searchTerm ? 'No appointment records match your search criteria.' : `No appointment records found for ${getDateFilterDisplay().toLowerCase()}.`}</p>{searchTerm ? <Button icon={XCircle} onClick={() => setSearchTerm('')}>Clear Search</Button> : dateFilter !== 'today' ? <Button variant="soft" accent="cyan" icon={Calendar} onClick={() => setDateFilter('today')}>View Today's Appointments</Button> : <Button variant="soft" accent="cyan" icon={Plus} onClick={() => setShowForm(true)}>Schedule First Appointment</Button>}</Card>)
      : (<>
        {/* MOBILE cards */}
        <div className="grid grid-cols-1 gap-3 md:hidden">{paginatedAppointments.map(apt => { const p = findPatient(apt); return (<div key={apt.id} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]"><div className="flex items-start justify-between gap-2"><div className="flex items-center gap-3 min-w-0"><div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center shrink-0"><User className="w-5 h-5 text-[var(--icon-cyan-text)]" /></div><div className="min-w-0"><p className="font-semibold text-[var(--text-primary)] truncate">{p ? getPatientName(p) : 'Unknown'}</p><p className="text-xs text-[var(--text-secondary)] font-mono">{p?.folderNumber || 'No Folder'} • {apt.title}</p></div></div><Badge tone={getStatusTone(apt.status)} dot size="sm">{humanStatus(apt.status)}</Badge></div><dl className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3 text-xs"><div><dt className="text-[var(--text-tertiary)]">Clinician</dt><dd className="font-medium">{apt.clinician?.fullName || '—'}</dd></div><div><dt className="text-[var(--text-tertiary)]">Date</dt><dd className="font-medium">{new Date(apt.appointmentDate).toLocaleDateString()} {apt.appointmentTime}</dd></div><div><dt className="text-[var(--text-tertiary)]">Department</dt><dd className="font-medium">{apt.department?.name || '—'}</dd></div><div><dt className="text-[var(--text-tertiary)]">Type</dt><dd className="font-medium">{apt.type.replace('_', ' ')}</dd></div></dl><div className="flex items-center justify-center gap-1 pt-3 mt-3 border-t border-[var(--border-color)]">{apt.status === 'scheduled' && <Button size="sm" variant="soft" accent="green" iconOnly icon={CheckCircle} aria-label="Confirm" onClick={() => handleStatusUpdate(apt.id, 'confirmed')} />}{apt.status === 'confirmed' && !apt.checkedIn && <Button size="sm" variant="soft" accent="purple" iconOnly icon={User} aria-label="Check In" onClick={() => handleCheckIn(apt.id)} />}{apt.status === 'checked_in' && <Button size="sm" variant="soft" accent="green" iconOnly icon={Calendar} aria-label="Convert to Attendance" onClick={() => handleConvertToAttendance(apt)} />}{canEditAppointment(apt) && apt.status !== 'completed' && apt.status !== 'cancelled' && <Button size="sm" variant="soft" accent="yellow" iconOnly icon={Edit} aria-label="Edit" onClick={() => handleEdit(apt)} />}{hasRole(['admin']) && <Button size="sm" variant="dangerSoft" iconOnly icon={Trash2} aria-label="Delete" onClick={() => handleDelete(apt.id)} />}</div></div>); })}</div>
        {viewMode === 'cards' ? (
        <div className="hidden md:grid grid-cols-2 xl:grid-cols-3 gap-4">{paginatedAppointments.map(apt => { const p = findPatient(apt); const name = p ? getPatientName(p) : 'Unknown'; return (<div key={apt.id} className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)] hover:shadow-md transition-all group"><div className="flex items-start justify-between mb-3"><div className="flex items-center gap-3 min-w-0"><div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center"><User className="w-5 h-5 text-[var(--icon-cyan-text)]" /></div><div className="min-w-0"><h3 className="font-semibold text-[var(--text-primary)] text-sm truncate">{name}</h3><p className="text-xs text-[var(--text-secondary)] font-mono">{p?.folderNumber || 'No Folder'} • {apt.title}</p></div></div><Badge tone={getStatusTone(apt.status)} dot size="sm">{humanStatus(apt.status)}</Badge></div><dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs"><div><dt className="text-[var(--text-tertiary)]">Clinician</dt><dd className="font-medium">{apt.clinician?.fullName || '—'}</dd></div><div><dt className="text-[var(--text-tertiary)]">Date</dt><dd className="font-medium">{new Date(apt.appointmentDate).toLocaleDateString()} {apt.appointmentTime}</dd></div><div><dt className="text-[var(--text-tertiary)]">Department</dt><dd className="font-medium">{apt.department?.name || '—'}</dd></div><div><dt className="text-[var(--text-tertiary)]">Type</dt><dd className="font-medium">{apt.type.replace('_', ' ')}</dd></div></dl><div className="flex gap-2 pt-3 mt-3 border-t border-[var(--border-color)]">{apt.status === 'scheduled' && <Button size="sm" variant="soft" accent="green" icon={CheckCircle} className="flex-1" onClick={() => handleStatusUpdate(apt.id, 'confirmed')}>Confirm</Button>}{apt.status === 'confirmed' && !apt.checkedIn && <Button size="sm" variant="soft" accent="purple" icon={User} className="flex-1" onClick={() => handleCheckIn(apt.id)}>Check In</Button>}{apt.status === 'checked_in' && <Button size="sm" variant="soft" accent="green" icon={Calendar} className="flex-1" onClick={() => handleConvertToAttendance(apt)}>Convert</Button>}</div></div>); })}</div>
        ) : (
        <div className={`${TABLE_SHELL} hidden md:block`}><div className="overflow-x-auto"><table className="w-full text-sm min-w-[1250px]"><thead className={TH_ROW}><tr><th className={TH}>Patient Name</th><th className={TH}>Folder #</th><th className={TH}>Title</th><th className={TH}>Clinician</th><th className={TH}>Role</th><th className={TH}>Department</th><th className={TH}>Date</th><th className={TH}>Time</th><th className={TH}>Duration</th><th className={TH}>Type</th><th className={TH}>Status</th><th className={cn(TH, 'text-center')}>Actions</th></tr></thead><tbody>{paginatedAppointments.map(apt => { const patient = findPatient(apt); const patientName = patient ? getPatientName(patient) : 'Unknown'; return (<tr key={apt.id} className={TR}><td className={cn(TD, 'whitespace-normal')}><div className="flex items-center gap-3"><div className="w-8 h-8 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center shrink-0"><User className="w-4 h-4 text-[var(--icon-cyan-text)]" /></div><p className="font-semibold text-[var(--text-primary)] text-sm">{patientName}</p></div></td><td className={TD}>{patient?.folderNumber || 'No Folder'}</td><td className={cn(TD, 'whitespace-normal')}><span className="text-sm text-[var(--text-primary)]">{apt.title || '—'}</span></td><td className={cn(TD, 'whitespace-normal')}><span className="text-sm text-[var(--text-primary)]">{apt.clinician?.fullName || '—'}</span></td><td className={TD}><span className="text-sm text-[var(--text-secondary)] capitalize">{apt.clinicianRole || apt.clinician?.role || '—'}</span></td><td className={cn(TD, 'whitespace-normal')}><span className="text-sm text-[var(--text-primary)]">{apt.department?.name || '—'}</span></td><td className={TD}><span className="text-sm font-medium text-[var(--text-primary)]">{new Date(apt.appointmentDate).toLocaleDateString()}</span></td><td className={TD}><span className="text-sm text-[var(--text-secondary)]">{apt.appointmentTime || '—'}</span></td><td className={TD}><span className="text-sm text-[var(--text-secondary)]">{apt.duration ? `${apt.duration} min` : '—'}</span></td><td className={TD}><span className={cn('inline-flex px-2 py-1 text-xs font-medium rounded-full', getTypeColor(apt.type))}>{apt.type.replace('_', ' ').toUpperCase()}</span></td><td className={TD}><Badge tone={getStatusTone(apt.status)} dot size="sm">{humanStatus(apt.status)}</Badge></td><td className={TD}><div className="flex items-center justify-center gap-1">{apt.status === 'scheduled' && <Button size="sm" variant="soft" accent="green" iconOnly icon={CheckCircle} aria-label="Confirm" className="hover:text-[var(--icon-green-text)]" onClick={() => handleStatusUpdate(apt.id, 'confirmed')} />}{apt.status === 'confirmed' && !apt.checkedIn && <Button size="sm" variant="soft" accent="purple" iconOnly icon={User} aria-label="Check In" className="hover:text-[var(--icon-purple-text)]" onClick={() => handleCheckIn(apt.id)} />}{apt.status === 'checked_in' && <Button size="sm" variant="soft" accent="green" iconOnly icon={Calendar} aria-label="Convert to Attendance" className="hover:text-[var(--icon-green-text)]" onClick={() => handleConvertToAttendance(apt)} />}{canEditAppointment(apt) && apt.status !== 'completed' && apt.status !== 'cancelled' && <Button size="sm" variant="soft" accent="yellow" iconOnly icon={Edit} aria-label="Edit" className="hover:text-[var(--icon-blue-text)]" onClick={() => handleEdit(apt)} />}{hasRole(['admin']) && <Button size="sm" variant="dangerSoft" iconOnly icon={Trash2} aria-label="Delete" className="hover:text-[var(--icon-red-text)]" onClick={() => handleDelete(apt.id)} />}</div></td></tr>); })}</tbody></table></div></div>
        )}
        <Pagination page={currentPage} totalPages={totalPages} itemsPerPage={itemsPerPage} totalItems={filteredAppointments.length} noun="appointments" onChange={goToPage} />
        
      </>)}

      {showAttendanceModal && selectedAppointmentForAttendance && <NewAttendanceModal patientId={selectedAppointmentForAttendance.patientId} onSuccess={handleAttendanceSuccess} onClose={handleAttendanceClose} isEditMode={false} />}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-2xl shadow-lg border border-[var(--border-color)] max-h-[90vh] overflow-y-auto"><div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-[var(--text-primary)]">{editingAppointment ? 'Edit Appointment' : 'Schedule New Appointment'}</h2><Button variant="ghost" iconOnly icon={XCircle} aria-label="Close" onClick={() => { setShowForm(false); setEditingAppointment(null); resetForm(); }} /></div>
        <form onSubmit={handleSubmit} className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Field label="Patient" required><Select options={patientOptions} value={selectedPatientLabel} onChange={(o: any) => setFormData({ ...formData, patientId: o?.value || '' })} placeholder="Search patient by name or folder number..." isClearable isLoading={patientsLoading} styles={selectStyles} noOptionsMessage={() => "No patients found"} /></Field><Field label="Clinician (Doctor/Nurse/Midwife)" required><Select options={clinicianOptions} value={selectedClinicianLabel} onChange={(o: any) => setFormData({ ...formData, clinicianId: o?.value || '' })} placeholder="Search clinician by name..." isClearable styles={selectStyles} noOptionsMessage={() => "No clinicians found"} />{selectedClinicianLabel && <p className="text-xs text-[var(--text-tertiary)] mt-1">Department: {selectedClinicianLabel.departmentName || 'Not assigned'}</p>}</Field></div>
        <Field label="Title" required><input type="text" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className={cn(INPUT, 'w-full')} placeholder="Appointment title" /></Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Field label="Date" required><input type="date" required value={formData.appointmentDate} onChange={e => setFormData({ ...formData, appointmentDate: e.target.value })} className={cn(INPUT, 'w-full')} /></Field><Field label="Time" required><input type="time" required value={formData.appointmentTime} onChange={e => setFormData({ ...formData, appointmentTime: e.target.value })} className={cn(INPUT, 'w-full')} /></Field></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Field label="Type" required><select required value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className={cn(SELECT, 'w-full')}><option value="consultation">Consultation</option><option value="follow_up">Follow Up</option><option value="procedure">Procedure</option><option value="antenatal">Antenatal</option><option value="postnatal">Postnatal</option><option value="vaccination">Vaccination</option><option value="lab_test">Lab Test</option><option value="scan">Scan</option><option value="other">Other</option></select></Field><Field label="Duration (minutes)"><input type="number" value={formData.duration} onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) })} className={cn(INPUT, 'w-full')} /></Field></div>
        <Field label="Description"><textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} className={cn(INPUT, 'w-full', 'resize-none')} placeholder="Appointment description or notes" /></Field>
        <div className="flex gap-3 justify-end pt-4"><Button variant="secondary" onClick={() => { setShowForm(false); setEditingAppointment(null); resetForm(); }}>Cancel</Button><Button type="submit" variant="soft" accent="blue">{editingAppointment ? 'Update' : 'Schedule'} Appointment</Button></div></form></div></div>
      )}
    </div>
  );
}
