// src/pages/Patients.tsx - UPDATED WITH DELETE + SCHEMA FIXES
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import NewAttendanceModal from '../components/NewAttendanceModal';
import { 
  Search, Grid, List, RefreshCw, Hospital, FileText, Users, Calendar, 
  Eye, Edit, ChevronLeft, ChevronRight, Pill, FlaskConical, Scissors, 
  DollarSign, CreditCard, Shield, Plus, Phone, MapPin, Folder, 
  Stethoscope, Trash2, User 
} from 'lucide-react';

export default function Patients() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { patients, loadPatients, searchPatients, isLoading, deletePatient } = usePatientStore();
  const { hasRole } = useAuthStore();
  const { success, error } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        setRefreshing(true);
        console.log('🔄 Loading patients in Patients component...');
        await loadPatients();
        console.log('✅ Patients loaded:', patients.length);
      } catch (err) {
        console.error('❌ Failed to load patients:', err);
        error('Load Failed', 'Failed to load patients');
      } finally {
        setRefreshing(false);
      }
    };

    loadData();
  }, [loadPatients]);

  // ✅ FIX: Get full name from surname + otherNames
  const getPatientFullName = (patient: any) => {
    return `${patient.surname || ''} ${patient.otherNames || ''}`.trim();
  };

  const displayedPatients = searchQuery ? searchPatients(searchQuery) : patients;

  // Pagination
  const totalPages = Math.ceil(displayedPatients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPatients = displayedPatients.slice(startIndex, startIndex + itemsPerPage);

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
    } catch (err: any) {
      error('Delete Failed', err.message || 'Failed to delete patient');
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // UI Helper Functions
  const getPaymentModeColor = (paymentMode: string) => {
    switch (paymentMode) {
      case 'cash': return 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]';
      case 'nhis': return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border-[var(--icon-green-bg)]';
      case 'private_insurance': return 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] border-[var(--icon-purple-bg)]';
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

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--bg-main)] rounded-lg animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-[var(--bg-main)] rounded animate-pulse w-32"></div>
                    <div className="h-3 bg-[var(--bg-main)] rounded animate-pulse w-24"></div>
                  </div>
                </div>
                <div className="h-6 bg-[var(--bg-main)] rounded-full animate-pulse w-16"></div>
              </div>
              <div className="space-y-2 mb-3">
                <div className="h-3 bg-[var(--bg-main)] rounded animate-pulse w-full"></div>
                <div className="h-3 bg-[var(--bg-main)] rounded animate-pulse w-3/4"></div>
              </div>
              <div className="flex gap-2 pt-3 border-t border-[var(--border-color)]">
                <div className="flex-1 h-8 bg-[var(--bg-main)] rounded-lg animate-pulse"></div>
                <div className="flex-1 h-8 bg-[var(--bg-main)] rounded-lg animate-pulse"></div>
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
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Patient Management</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Manage patient records and medical history</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            {displayedPatients.length} patient(s) in total
          </p>
        </div>
        <div className="flex items-center gap-3">
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
              <option value={6}>6 per page</option>
              <option value={9}>9 per page</option>
              <option value={12}>12 per page</option>
              <option value={24}>24 per page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Banner */}
      {displayedPatients.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-800">
                Showing {paginatedPatients.length} of {displayedPatients.length} patient records
              </p>
              {searchQuery && (
                <p className="text-xs text-blue-600 mt-0.5">
                  Search results for: "{searchQuery}"
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-700">
              <span className="bg-blue-100 px-2 py-1 rounded border border-blue-200">
                Cash: {displayedPatients.filter(p => p.paymentMode === 'cash').length}
              </span>
              <span className="bg-green-100 px-2 py-1 rounded border border-green-200">
                NHIS: {displayedPatients.filter(p => p.paymentMode === 'nhis').length}
              </span>
              <span className="bg-purple-100 px-2 py-1 rounded border border-purple-200">
                Private: {displayedPatients.filter(p => p.paymentMode === 'private_insurance').length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {displayedPatients.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[var(--bg-card)] rounded-lg p-3 text-center border border-[var(--border-color)]">
            <p className="text-lg font-bold text-[var(--text-primary)]">{displayedPatients.length}</p>
            <p className="text-xs text-[var(--text-secondary)] font-medium">Total Patients</p>
          </div>
          <div className="bg-[var(--bg-card)] rounded-lg p-3 text-center border border-[var(--border-color)]">
            <p className="text-lg font-bold text-[var(--text-primary)]">
              {displayedPatients.filter(p => p.paymentMode === 'nhis').length}
            </p>
            <p className="text-xs text-[var(--text-secondary)] font-medium">NHIS</p>
          </div>
          <div className="bg-[var(--bg-card)] rounded-lg p-3 text-center border border-[var(--border-color)]">
            <p className="text-lg font-bold text-[var(--text-primary)]">
              {displayedPatients.filter(p => p.paymentMode === 'private_insurance').length}
            </p>
            <p className="text-xs text-[var(--text-secondary)] font-medium">Private</p>
          </div>
          <div className="bg-[var(--bg-card)] rounded-lg p-3 text-center border border-[var(--border-color)]">
            <p className="text-lg font-bold text-[var(--text-primary)]">
              {displayedPatients.filter(p => p.paymentMode === 'cash').length}
            </p>
            <p className="text-xs text-[var(--text-secondary)] font-medium">Cash</p>
          </div>
        </div>
      )}

      {/* Content */}
      {displayedPatients.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl p-8 shadow-sm border border-[var(--border-color)] text-center">
          <Users className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
            {searchQuery ? 'No Patients Found' : 'No Patient Records'}
          </h3>
          <p className="text-[var(--text-secondary)] text-sm mb-4">
            {searchQuery 
              ? 'No patient records match your search criteria. Try adjusting your search terms.'
              : 'Get started by registering your first patient.'
            }
          </p>
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-main)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border-color)] transition-all duration-200 font-semibold text-sm border border-[var(--border-color)]"
            >
              Clear Search
            </button>
          ) : canRegister ? (
            <Link
              to="/dashboard/patients/register"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all duration-200 font-semibold text-sm"
            >
              <Plus className="w-4 h-4" />
              Register First Patient
            </Link>
          ) : null}
        </div>
      ) : viewMode === 'cards' ? (
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
                        {patient.folderNumber || patientId}
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
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="font-medium">
                      {patient.age || 'N/A'}y • {patient.gender}
                    </span>
                  </div>
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

                {/* Delete Confirmation */}
                {deleteConfirm === patientId && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-xs font-medium mb-2">
                      Delete {fullName}?
                    </p>
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
      ) : (
        <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Details</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Payment</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {paginatedPatients.map((patient) => {
                const patientId = getPatientId(patient);
                const fullName = getPatientFullName(patient);
                
                return (
                  <tr key={patientId} className="hover:bg-[var(--bg-main)] transition-colors duration-150">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center">
                          <User className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                        </div>
                        <div>
                          <p className="font-semibold text-[var(--text-primary)] text-sm">
                            {fullName}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {patient.folderNumber || patientId}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-[var(--text-secondary)] text-sm">
                        <Phone className="w-3.5 h-3.5" />
                        {patient.contact}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-[var(--text-secondary)] text-sm">
                        <Calendar className="w-3.5 h-3.5" />
                        {patient.age || 'N/A'}y • {patient.gender}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getPaymentModeColor(patient.paymentMode)}`}>
                        {getPaymentModeLabel(patient.paymentMode)}
                      </span>
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
      {displayedPatients.length > 0 && totalPages > 1 && (
        <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[var(--text-secondary)]">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, displayedPatients.length)} of{' '}
              {displayedPatients.length} patient records
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