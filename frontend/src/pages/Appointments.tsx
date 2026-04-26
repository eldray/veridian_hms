import { useEffect, useState } from 'react';
import { useAppointmentStore } from '../store/appointmentStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
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
  Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
    isLoading 
  } = useAppointmentStore();
  const { user } = useAuthStore();
  const { success, error } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: '',
    departmentId: '',
    title: '',
    description: '',
    appointmentDate: '',
    appointmentTime: '',
    duration: 30,
    type: 'consultation',
    isNHIS: false,
    nhisCCC: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setRefreshing(true);
      const filters: any = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (typeFilter !== 'all') filters.type = typeFilter;
      if (dateFilter) filters.date = dateFilter;
      
      await getAppointments(filters);
      success('Data loaded', 'Appointments updated');
    } catch (err) {
      error('Load Failed', 'Failed to load appointment data');
    } finally {
      setRefreshing(false);
    }
  };

  const filteredAppointments = (Array.isArray(appointments) ? appointments : [])
    .filter(apt => apt && apt.id)
    .filter(apt => {
      const patientName = `${apt.patient?.surname || ''} ${apt.patient?.otherNames || ''}`.trim();
      const doctorName = apt.doctor?.fullName || '';
      const title = apt.title || '';
      
      return (
        patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

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
    } catch (err) {
      error('Save Failed', 'Failed to save appointment');
    }
  };

  const handleEdit = (apt: any) => {
    setEditingAppointment(apt);
    setFormData({
      patientId: apt.patientId,
      doctorId: apt.doctorId,
      departmentId: apt.departmentId,
      title: apt.title,
      description: apt.description || '',
      appointmentDate: apt.appointmentDate.split('T')[0],
      appointmentTime: apt.appointmentTime,
      duration: apt.duration,
      type: apt.type,
      isNHIS: apt.isNHIS,
      nhisCCC: apt.nhisCCC || ''
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
      doctorId: '',
      departmentId: '',
      title: '',
      description: '',
      appointmentDate: '',
      appointmentTime: '',
      duration: 30,
      type: 'consultation',
      isNHIS: false,
      nhisCCC: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] border-[var(--icon-blue-text)]';
      case 'confirmed': return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border-[var(--icon-green-text)]';
      case 'checked_in': return 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] border-[var(--icon-purple-text)]';
      case 'in_progress': return 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] border-[var(--icon-yellow-text)]';
      case 'completed': return 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]';
      case 'cancelled': return 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border-[var(--icon-red-text)]';
      case 'no_show': return 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)] border-[var(--icon-orange-text)]';
      default: return 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'consultation': return 'text-[var(--icon-blue-text)] bg-[var(--icon-blue-bg)]';
      case 'procedure': return 'text-[var(--icon-purple-text)] bg-[var(--icon-purple-bg)]';
      case 'antenatal': return 'text-[var(--icon-pink-text)] bg-[var(--icon-pink-bg)]';
      case 'lab_test': return 'text-[var(--icon-green-text)] bg-[var(--icon-green-bg)]';
      case 'scan': return 'text-[var(--icon-indigo-text)] bg-[var(--icon-indigo-bg)]';
      default: return 'text-[var(--text-secondary)] bg-[var(--bg-main)]';
    }
  };

  const canEditAppointment = (apt: any) => {
    return user?.role === 'admin' || apt.doctorId === user?.id;
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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-[var(--bg-main)] rounded-xl transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div className="w-12 h-12 bg-[var(--icon-purple-bg)] rounded-xl flex items-center justify-center">
            <Calendar className="w-6 h-6 text-[var(--icon-purple-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Appointment Management</h1>
            <p className="text-sm text-[var(--text-secondary)]">Schedule and manage patient appointments</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard/attendance')}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm text-[var(--text-primary)]"
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
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm text-[var(--text-primary)]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
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

      {/* Search and Filters */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by patient, doctor, or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all text-sm"
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked_in">Checked In</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all text-sm"
          >
            <option value="all">All Types</option>
            <option value="consultation">Consultation</option>
            <option value="procedure">Procedure</option>
            <option value="antenatal">Antenatal</option>
            <option value="lab_test">Lab Test</option>
            <option value="scan">Scan</option>
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="flex-1 px-3 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all text-sm"
            />
          </div>
        </div>
      </div>

      {/* Appointments List */}
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
          <p className="text-[var(--text-secondary)] mb-2">
            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || dateFilter 
              ? 'No appointments found' 
              : 'No appointments scheduled yet'}
          </p>
          <p className="text-[var(--text-tertiary)] text-sm mb-4">Get started by creating your first appointment</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 text-[var(--icon-blue-text)] hover:text-[var(--icon-blue-text)] font-medium text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Schedule First Appointment
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((apt) => (
            <div key={apt.id} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] hover:shadow-md transition-all duration-300">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-[var(--icon-blue-bg)] rounded-lg flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-[var(--icon-blue-text)]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-[var(--text-primary)]">{apt.title}</h3>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                            {apt.status.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(apt.type)}`}>
                            {apt.type.replace('_', ' ').toUpperCase()}
                          </span>
                          {apt.isNHIS && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border border-[var(--icon-green-text)]">
                              NHIS
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {canEditAppointment(apt) && (
                        <div className="flex gap-1">
                          {apt.status === 'scheduled' && (
                            <button
                              onClick={() => handleStatusUpdate(apt.id, 'confirmed')}
                              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--icon-green-text)] transition-colors hover:bg-[var(--icon-green-bg)] rounded-lg"
                              title="Confirm"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {apt.status === 'confirmed' && !apt.checkedIn && (
                            <button
                              onClick={() => handleCheckIn(apt.id)}
                              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--icon-purple-text)] transition-colors hover:bg-[var(--icon-purple-bg)] rounded-lg"
                              title="Check In"
                            >
                              <User className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(apt)}
                            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--icon-blue-text)] transition-colors hover:bg-[var(--icon-blue-bg)] rounded-lg"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(apt.id)}
                            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--icon-red-text)] transition-colors hover:bg-[var(--icon-red-bg)] rounded-lg"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-[var(--text-secondary)]" />
                      <div>
                        <p className="text-[var(--text-secondary)] font-medium">Patient</p>
                        <p className="text-[var(--text-primary)]">{`${apt.patient?.surname || ''} ${apt.patient?.otherNames || ''}`.trim() || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-[var(--text-secondary)]" />
                      <div>
                        <p className="text-[var(--text-secondary)] font-medium">Doctor</p>
                        <p className="text-[var(--text-primary)]">{apt.doctor?.fullName || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-[var(--text-secondary)]" />
                      <div>
                        <p className="text-[var(--text-secondary)] font-medium">Department</p>
                        <p className="text-[var(--text-primary)]">{apt.department?.name || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[var(--text-secondary)]" />
                      <div>
                        <p className="text-[var(--text-secondary)] font-medium">Date & Time</p>
                        <p className="text-[var(--text-primary)]">
                          {new Date(apt.appointmentDate).toLocaleDateString()} at {apt.appointmentTime}
                        </p>
                      </div>
                    </div>
                  </div>

                  {apt.description && (
                    <div className="mt-3">
                      <p className="text-[var(--text-secondary)] text-sm">{apt.description}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Appointment Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-2xl shadow-lg border border-[var(--border-color)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                {editingAppointment ? 'Edit Appointment' : 'Create New Appointment'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingAppointment(null);
                  resetForm();
                }}
                className="p-2 hover:bg-[var(--bg-main)] rounded-lg transition"
              >
                <XCircle className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all text-sm"
                    placeholder="Appointment title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Type *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all text-sm"
                  >
                    <option value="consultation">Consultation</option>
                    <option value="procedure">Procedure</option>
                    <option value="antenatal">Antenatal</option>
                    <option value="postnatal">Postnatal</option>
                    <option value="vaccination">Vaccination</option>
                    <option value="lab_test">Lab Test</option>
                    <option value="scan">Scan</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.appointmentDate}
                    onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.appointmentTime}
                    onChange={(e) => setFormData({ ...formData, appointmentTime: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all text-sm resize-none"
                  placeholder="Appointment description or notes"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isNHIS"
                  checked={formData.isNHIS}
                  onChange={(e) => setFormData({ ...formData, isNHIS: e.target.checked })}
                  className="w-4 h-4 text-[var(--icon-blue-text)] border-[var(--border-color)] rounded focus:ring-[var(--icon-blue-text)]"
                />
                <label htmlFor="isNHIS" className="text-sm text-[var(--text-secondary)]">
                  NHIS Appointment
                </label>
              </div>

              {formData.isNHIS && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    NHIS CCC Number
                  </label>
                  <input
                    type="text"
                    value={formData.nhisCCC}
                    onChange={(e) => setFormData({ ...formData, nhisCCC: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all text-sm"
                    placeholder="Enter CCC number"
                  />
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingAppointment(null);
                    resetForm();
                  }}
                  className="px-4 py-2.5 text-[var(--text-secondary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all duration-200 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded-lg hover:bg-[var(--icon-blue-text)] hover:text-white transition-all duration-200 font-medium text-sm"
                >
                  {editingAppointment ? 'Update' : 'Create'} Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}