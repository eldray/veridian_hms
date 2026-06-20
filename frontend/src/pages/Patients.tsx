// src/pages/Patients.tsx - FIXED VERSION
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import NewAttendanceModal from '../components/NewAttendanceModal';
import { 
  Search, Grid, List, RefreshCw, Users, Calendar, 
  Eye, Edit, ChevronLeft, ChevronRight, 
  Plus, Phone, User, Trash2, Stethoscope,
  CalendarDays, Clock, Filter, X, CreditCard
} from 'lucide-react';

type DateFilterType = 'all' | 'today' | 'yesterday' | 'custom';

export default function Patients() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('list');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  // Date filter states
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { patients, loadPatients, searchPatients, isLoading, deletePatient } = usePatientStore();
  const { hasRole } = useAuthStore();
  const { success, error } = useToast();

  useEffect(() => {
    const loadData = async () => {
      if (isLoading && !refreshing) return;
      
      try {
        setRefreshing(true);
        await loadPatients();
      } catch (err) {
        console.error('Failed to load patients:', err);
        error('Load Failed', 'Failed to load patients');
      } finally {
        setRefreshing(false);
      }
    };

    loadData();
  }, []);

  // ✅ FIXED: Filter patients by attendance date
  const filterPatientsByDate = (patientsList: any[]) => {
    // If 'all', return all patients (no filter)
    if (dateFilter === 'all') {
      return patientsList;
    }

    if (dateFilter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      return patientsList.filter(patient => {
        const hasTodayAttendance = patient.attendances?.some((att: any) => 
          new Date(att.dateTime).toISOString().split('T')[0] === today
        );
        return hasTodayAttendance;
      });
    }
    
    if (dateFilter === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      return patientsList.filter(patient => {
        const hasYesterdayAttendance = patient.attendances?.some((att: any) => 
          new Date(att.dateTime).toISOString().split('T')[0] === yesterdayStr
        );
        return hasYesterdayAttendance;
      });
    }
    
    if (dateFilter === 'custom' && customStartDate && customEndDate) {
      return patientsList.filter(patient => {
        const hasAttendanceInRange = patient.attendances?.some((att: any) => {
          const attDate = new Date(att.dateTime).toISOString().split('T')[0];
          return attDate >= customStartDate && attDate <= customEndDate;
        });
        return hasAttendanceInRange;
      });
    }
    
    return patientsList;
  };

  const getPatientFullName = (patient: any) => {
    return patient?.fullName || patient?.name || `${patient?.surname || ''} ${patient?.otherNames || ''}`.trim();
  };

  // ✅ Apply search first, then date filter
  const searchedPatients = searchQuery ? searchPatients(searchQuery) : patients;
  const filteredPatients = filterPatientsByDate(searchedPatients);

  // ✅ FIXED: Sort patients by creation date (newest first)
  const sortedPatients = [...filteredPatients].sort((a, b) => {
    // Use createdAt or registeredAt as fallback
    const dateA = new Date(a.createdAt || a.registeredAt || 0);
    const dateB = new Date(b.createdAt || b.registeredAt || 0);
    return dateB.getTime() - dateA.getTime(); // Newest first
  });

  // Pagination - use sortedPatients
  const totalPages = Math.ceil(sortedPatients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPatients = sortedPatients.slice(startIndex, startIndex + itemsPerPage);

  const canRegister = hasRole(['admin', 'nurse', 'doctor']);
  const canDelete = hasRole(['admin']);

  const handleAddAttendance = (patientId: string) => {
    setSelectedPatientId(patientId);
    setShowAttendanceModal(true);
  };

  const handleAttendanceSuccess = () => {
    setShowAttendanceModal(false);
    setSelectedPatientId(null);
    success('Check-in complete', 'New visit created');
    handleRefresh();
  };

  const handleAttendanceClose = () => {
    setShowAttendanceModal(false);
    setSelectedPatientId(null);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPatients().finally(() => setRefreshing(false));
    setCurrentPage(1);
  };

  const handleDeletePatient = async (patientId: string) => {
    try {
      await deletePatient(patientId);
      setDeleteConfirm(null);
      success('Patient Deleted', 'Patient record has been removed');
      handleRefresh();
    } catch (err: any) {
      error('Delete Failed', err.message || 'Failed to delete patient');
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const getPaymentModeColor = (paymentMode: string) => {
    switch (paymentMode) {
      case 'cash': return 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]';
      case 'nhis': return 'bg-green-50 text-green-700 border-green-200';
      case 'private_insurance': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]';
    }
  };

  const getPaymentModeLabel = (paymentMode: string) => {
    switch (paymentMode) {
      case 'cash': return 'CASH';
      case 'nhis': return 'NHIS';
      case 'private_insurance': return 'PRIVATE';
      default: return paymentMode?.toUpperCase() || 'UNKNOWN';
    }
  };

  const getPatientId = (patient: any) => patient.id;

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case 'all': return 'All Patients';
      case 'today': return "Today's Patients";
      case 'yesterday': return "Yesterday's Patients";
      case 'custom': return `${customStartDate} to ${customEndDate}`;
      default: return 'All Patients';
    }
  };

  const getFilterStats = () => {
    const totalWithAttendances = patients.filter(p => p.attendances?.length > 0).length;
    return {
      totalPatients: patients.length,
      filteredCount: sortedPatients.length,
      withAttendances: totalWithAttendances
    };
  };

  const stats = getFilterStats();

  // Loading State
  if (isLoading && !refreshing) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Patient Management</h1>
          </div>
          <button
            disabled
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] text-sm"
          >
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading...
          </button>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[var(--bg-main)] rounded-lg animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[var(--bg-main)] rounded animate-pulse w-48"></div>
                  <div className="h-3 bg-[var(--bg-main)] rounded animate-pulse w-32"></div>
                </div>
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Patient Management</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Manage patient records and medical history</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            {stats.totalPatients} total patients • {stats.withAttendances} with visits
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canRegister && (
            <Link
              to="/dashboard/patients/register"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all duration-200 font-semibold text-sm"
            >
              <Plus className="w-4 h-4" />
              Register Patient
            </Link>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm text-[var(--text-primary)]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="text-sm font-medium text-[var(--text-primary)]">Show patients with visits:</span>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => {
                setDateFilter('all');
                setCurrentPage(1);
                setShowDatePicker(false);
              }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                dateFilter === 'all'
                  ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
                  : 'bg-[var(--bg-main)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => {
                setDateFilter('today');
                setCurrentPage(1);
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
                setCurrentPage(1);
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
              Custom Range
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
            Showing: {getDateFilterLabel()} • {sortedPatients.length} patients
          </div>
        </div>
      </div>

      {/* Search and View Controls */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full sm:max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search by patient name, folder number, contact..."
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
              <option value={15}>15 per page</option>
              <option value={20}>20 per page</option>
              <option value={25}>25 per page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Banner */}
      {sortedPatients.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-semibold text-blue-800">
                Showing {paginatedPatients.length} of {sortedPatients.length} patient records
              </p>
              {searchQuery && (
                <p className="text-xs text-blue-600 mt-0.5">
                  Search results for: "{searchQuery}"
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-700 flex-wrap">
              <span className="bg-blue-100 px-2 py-1 rounded border border-blue-200">
                Cash: {sortedPatients.filter(p => p.paymentMode === 'cash').length}
              </span>
              <span className="bg-green-100 px-2 py-1 rounded border border-green-200">
                NHIS: {sortedPatients.filter(p => p.paymentMode === 'nhis').length}
              </span>
              <span className="bg-purple-100 px-2 py-1 rounded border border-purple-200">
                Private: {sortedPatients.filter(p => p.paymentMode === 'private_insurance').length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {sortedPatients.length === 0 && (
        <div className="bg-[var(--bg-card)] rounded-xl p-8 shadow-sm border border-[var(--border-color)] text-center">
          <Users className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
            {searchQuery ? 'No Patients Found' : `No ${getDateFilterLabel()}`}
          </h3>
          <p className="text-[var(--text-secondary)] text-sm mb-4">
            {searchQuery 
              ? 'No patient records match your search criteria. Try adjusting your search terms.'
              : dateFilter === 'all'
                ? 'No patient records found in the system.'
                : dateFilter !== 'custom' 
                  ? `No patients had visits ${dateFilter === 'today' ? 'today' : 'yesterday'}.`
                  : `No patients had visits between ${customStartDate} and ${customEndDate}.`
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
          ) : dateFilter !== 'all' && (
            <button
              onClick={() => setDateFilter('all')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all duration-200 font-semibold text-sm"
            >
              <Users className="w-4 h-4" />
              View All Patients
            </button>
          )}
        </div>
      )}

      {/* Card View */}
      {sortedPatients.length > 0 && viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginatedPatients.map((patient) => {
            const patientId = getPatientId(patient);
            const fullName = getPatientFullName(patient);
            
            return (
              <div key={patientId} className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)] hover:shadow-md transition-all duration-200 group">
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
                        {patient.folderNumber || patientId.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      to={`/dashboard/patients/register?edit=true&id=${patientId}`}
                      className="p-1.5 bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] rounded-lg hover:bg-[var(--icon-yellow-text)] hover:text-white transition-all duration-200 opacity-0 group-hover:opacity-100"
                      title="Edit Patient"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Link>
                    {canDelete && (
                      <button
                        onClick={() => setDeleteConfirm(patientId)}
                        className="p-1.5 bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-text)] hover:text-white transition-all duration-200 opacity-0 group-hover:opacity-100"
                        title="Delete Patient"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-xs mb-3">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Phone className="w-3.5 h-3.5" />
                    <span className="font-medium">{patient.contact}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPaymentModeColor(patient.paymentMode)}`}>
                      {getPaymentModeLabel(patient.paymentMode)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-xs">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Created: {new Date(patient.createdAt || patient.registeredAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-[var(--border-color)]">
                  <Link
                    to={`/dashboard/patients/${patientId}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all duration-200 font-medium text-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </Link>
                  <button
                    onClick={() => handleAddAttendance(patientId)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white transition-all duration-200 font-medium text-xs"
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    Visit
                  </button>
                </div>

                {deleteConfirm === patientId && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-xs font-medium mb-2">Delete {fullName}?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeletePatient(patientId)}
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
      )}

      {/* List View (DEFAULT) */}
      {sortedPatients.length > 0 && viewMode === 'list' && (
        <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Payment Mode</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Created</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Last Visit</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {paginatedPatients.map((patient) => {
                const patientId = getPatientId(patient);
                const fullName = getPatientFullName(patient);
                const lastVisit = patient.attendances?.[0]?.dateTime 
                  ? new Date(patient.attendances[0].dateTime).toLocaleDateString()
                  : 'Never';
                const createdDate = new Date(patient.createdAt || patient.registeredAt).toLocaleDateString();
                
                return (
                  <tr key={patientId} className="hover:bg-[var(--bg-main)] transition-colors duration-150">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                        </div>
                        <div>
                          <p className="font-semibold text-[var(--text-primary)] text-sm">
                            {fullName}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {patient.folderNumber || patientId.slice(0, 8)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                        <Phone className="w-3.5 h-3.5" />
                        {patient.contact}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getPaymentModeColor(patient.paymentMode)}`}>
                        {getPaymentModeLabel(patient.paymentMode)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {createdDate}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                        <Calendar className="w-3.5 h-3.5" />
                        {lastVisit}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/dashboard/patients/${patientId}`}
                          className="p-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors duration-200"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/dashboard/patients/register?edit=true&id=${patientId}`}
                          className="p-2 bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] rounded-lg hover:bg-[var(--icon-yellow-text)] hover:text-white transition-colors duration-200"
                          title="Edit Patient"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleAddAttendance(patientId)}
                          className="p-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white transition-colors duration-200"
                          title="Add Visit"
                        >
                          <Stethoscope className="w-4 h-4" />
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => setDeleteConfirm(patientId)}
                            className="p-2 bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-text)] hover:text-white transition-colors duration-200"
                            title="Delete Patient"
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
      {sortedPatients.length > 0 && totalPages > 1 && (
        <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="text-sm text-[var(--text-secondary)]">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedPatients.length)} of{' '}
              {sortedPatients.length} patient records
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

      {/* Modal */}
      {showAttendanceModal && selectedPatientId && (
        <NewAttendanceModal
          patientId={selectedPatientId}
          onSuccess={handleAttendanceSuccess}
          onClose={handleAttendanceClose}
          isEditMode={false}
        />
      )}
    </div>
  );
}