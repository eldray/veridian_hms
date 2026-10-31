// src/pages/Patients.tsx - FIXED VERSION
import { getPatients } from '../api';
import { useState, useEffect } from 'react';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import NewAttendanceModal from '../components/NewAttendanceModal';
import {
  RefreshCw, Users, Calendar,
  Eye, Edit,
  Plus, Phone, User,
  Trash2, Stethoscope,
  Filter, X, CreditCard, Grid, List
} from 'lucide-react';
import {
  Badge, Button, Card, FilterSelect, INPUT, LinkButton, PageHeader,
  Pagination, SearchInput, Segmented, TABLE_SHELL, TD, TD_MUTED, TH, TH_ROW, TR
} from '../components/ui';

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

  const { patients, loadPatients, searchPatients, isLoading, isLoadingMore, pagination, deletePatient } = usePatientStore();
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

  // Server-side search, debounced 300 ms (2+ characters)
  const [serverMatches, setServerMatches] = useState<any[]>([]);
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) { setServerMatches([]); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const result: any = await getPatients({ search: q, limit: 50 });
        if (!cancelled) setServerMatches(Array.isArray(result) ? result : []);
      } catch {
        if (!cancelled) setServerMatches([]);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [searchQuery]);

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

  // ✅ Apply search first, then date filter.
  // Local matches show instantly; the server search (indexed, 50 best matches) adds any patient that
  // is not loaded yet, so a search never says "not found" for someone who is registered.
  const searchedPatients = (() => {
    if (!searchQuery) return patients;
    const local = searchPatients(searchQuery);
    if (serverMatches.length === 0) return local;
    const seen = new Set(local.map((p: any) => p.id));
    return [...local, ...serverMatches.filter((p: any) => !seen.has(p.id))];
  })();
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
  const paginatedPatients = sortedPatients.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage);

  // Mirrors the patient API: everyone in requirePatientManagement may register,
  // only an administrator may delete a record.
  const canRegister = hasRole(['admin', 'doctor', 'nurse', 'midwife', 'records']);
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
    loadPatients({}, { force: true }).finally(() => setRefreshing(false));
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

  // Payment mode is not a workflow status, so Badge's STATUS_TONES has no entry for
  // it; the tone stays local and only the chip surface comes from the shared Badge.
  const getPaymentModeTone = (paymentMode: string) => {
    switch (paymentMode) {
      case 'nhis': return 'green' as const;
      case 'private_insurance': return 'purple' as const;
      default: return 'neutral' as const;
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
      totalPatients: pagination?.total ?? patients.length,
      filteredCount: sortedPatients.length,
      withAttendances: totalWithAttendances
    };
  };

  const stats = getFilterStats();

  const header = (
    <PageHeader
      title="Patient Management"
      subtitle="Manage patient records and medical history"
      meta={(
        <>
          {stats.totalPatients} total patients • {stats.withAttendances} with visits
          {isLoadingMore && (
            <span className="ml-2 text-[var(--text-tertiary)]">
              (loading all patients… {patients.length} of {pagination?.total ?? '?'})
            </span>
          )}
        </>
      )}
      icon={Users}
      accent="cyan"
      actions={(
        <>
          <Button icon={RefreshCw} loading={refreshing} onClick={handleRefresh}>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          {canRegister && (
            <LinkButton variant="soft" accent="cyan" icon={Plus} to="/dashboard/patients/register">
              Register Patient
            </LinkButton>
          )}
        </>
      )}
    />
  );

  // Loading State
  if (isLoading && !refreshing) {
    return (
      <div className="space-y-6 p-6">
        {header}
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
      {header}

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
                aria-label="Visits from date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className={INPUT}
              />
              <span className="text-[var(--text-secondary)]">to</span>
              <input
                type="date"
                aria-label="Visits to date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className={INPUT}
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
          <SearchInput
            className="w-full sm:max-w-sm"
            value={searchQuery}
            onChange={(value) => { setSearchQuery(value); setCurrentPage(1); }}
            placeholder="Search by patient name, folder number, contact..."
          />

          <div className="flex items-center gap-3">
            <Segmented
              aria-label="Patient layout"
              accent="cyan"
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
                { value: '15', label: '15 per page' },
                { value: '20', label: '20 per page' },
                { value: '25', label: '25 per page' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Stats Banner */}
      {sortedPatients.length > 0 && (
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Showing {paginatedPatients.length} of {sortedPatients.length} patient records
              </p>
              {searchQuery && (
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Search results for: "{searchQuery}"
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone={getPaymentModeTone('cash')} size="sm">
                Cash: {sortedPatients.filter(p => p.paymentMode === 'cash').length}
              </Badge>
              <Badge tone={getPaymentModeTone('nhis')} size="sm">
                NHIS: {sortedPatients.filter(p => p.paymentMode === 'nhis').length}
              </Badge>
              <Badge tone={getPaymentModeTone('private_insurance')} size="sm">
                Private: {sortedPatients.filter(p => p.paymentMode === 'private_insurance').length}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {sortedPatients.length === 0 && (
        <Card padded={false} className="p-8 text-center">
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
            <Button icon={X} onClick={() => setSearchQuery('')}>
              Clear Search
            </Button>
          ) : dateFilter !== 'all' && (
            <Button variant="soft" accent="cyan" icon={Users} onClick={() => setDateFilter('all')}>
              View All Patients
            </Button>
          )}
        </Card>
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
                      <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-main)] px-2 py-1 rounded border border-[var(--border-color)] mt-1 font-mono">
                        {patient.folderNumber || patientId.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <LinkButton
                      variant="soft"
                      accent="yellow"
                      size="xs"
                      iconOnly
                      icon={Edit}
                      aria-label="Edit Patient"
                      className="opacity-0 group-hover:opacity-100"
                      to={`/dashboard/patients/register?edit=true&id=${patientId}`}
                    />
                    {canDelete && (
                      <Button
                        variant="dangerSoft"
                        size="xs"
                        iconOnly
                        icon={Trash2}
                        aria-label="Delete Patient"
                        className="opacity-0 group-hover:opacity-100"
                        onClick={() => setDeleteConfirm(patientId)}
                      />
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
                    <Badge tone={getPaymentModeTone(patient.paymentMode)}>
                      {getPaymentModeLabel(patient.paymentMode)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-xs">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Created: {new Date(patient.createdAt || patient.registeredAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-[var(--border-color)]">
                  <LinkButton
                    variant="soft"
                    accent="cyan"
                    size="sm"
                    icon={Eye}
                    className="flex-1"
                    to={`/dashboard/patients/${patientId}`}
                  >
                    View
                  </LinkButton>
                  <Button
                    variant="soft"
                    accent="green"
                    size="sm"
                    icon={Stethoscope}
                    className="flex-1"
                    onClick={() => handleAddAttendance(patientId)}
                  >
                    Visit
                  </Button>
                </div>

                {deleteConfirm === patientId && (
                  <div className="mt-3 p-3 bg-[var(--icon-red-bg)] border border-[var(--border-color)] rounded-lg">
                    <p className="text-[var(--icon-red-text)] text-xs font-medium mb-2">Delete {fullName}?</p>
                    <div className="flex gap-2">
                      <Button
                        variant="danger"
                        size="xs"
                        className="flex-1"
                        onClick={() => handleDeletePatient(patientId)}
                      >
                        Delete
                      </Button>
                      <Button
                        variant="secondary"
                        size="xs"
                        className="flex-1"
                        onClick={() => setDeleteConfirm(null)}
                      >
                        Cancel
                      </Button>
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
        <div className={TABLE_SHELL}>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={TH_ROW}>
              <tr>
                <th className={TH}>Patient</th>
                <th className={TH}>Contact</th>
                <th className={TH}>Payment Mode</th>
                <th className={TH}>Created</th>
                <th className={TH}>Last Visit</th>
                <th className={TH}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPatients.map((patient) => {
                const patientId = getPatientId(patient);
                const fullName = getPatientFullName(patient);
                const lastVisit = patient.attendances?.[0]?.dateTime 
                  ? new Date(patient.attendances[0].dateTime).toLocaleDateString()
                  : 'Never';
                const createdDate = new Date(patient.createdAt || patient.registeredAt).toLocaleDateString();
                
                return (
                  <tr key={patientId} className={TR}>
                    <td className={TD}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                        </div>
                        <div>
                          <p className="font-semibold text-[var(--text-primary)] text-sm">
                            {fullName}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] font-mono">
                            {patient.folderNumber || patientId.slice(0, 8)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className={TD}>
                      <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                        <Phone className="w-3.5 h-3.5" />
                        {patient.contact}
                      </div>
                    </td>
                    <td className={TD}>
                      <Badge tone={getPaymentModeTone(patient.paymentMode)} size="sm">
                        {getPaymentModeLabel(patient.paymentMode)}
                      </Badge>
                    </td>
                    <td className={TD_MUTED}>
                      {createdDate}
                    </td>
                    <td className={TD}>
                      <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                        <Calendar className="w-3.5 h-3.5" />
                        {lastVisit}
                      </div>
                    </td>
                    <td className={TD}>
                      <div className="flex items-center gap-1.5">
                        <LinkButton
                          variant="soft"
                          accent="cyan"
                          size="sm"
                          iconOnly
                          icon={Eye}
                          aria-label="View Details"
                          to={`/dashboard/patients/${patientId}`}
                        />
                        <LinkButton
                          variant="soft"
                          accent="yellow"
                          size="sm"
                          iconOnly
                          icon={Edit}
                          aria-label="Edit Patient"
                          to={`/dashboard/patients/register?edit=true&id=${patientId}`}
                        />
                        <Button
                          variant="soft"
                          accent="green"
                          size="sm"
                          iconOnly
                          icon={Stethoscope}
                          aria-label="Add Visit"
                          onClick={() => handleAddAttendance(patientId)}
                        />
                        {canDelete && (
                          <Button
                            variant="dangerSoft"
                            size="sm"
                            iconOnly
                            icon={Trash2}
                            aria-label="Delete Patient"
                            onClick={() => setDeleteConfirm(patientId)}
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

      {/* Pagination */}
      {sortedPatients.length > 0 && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={sortedPatients.length}
          noun="patient records"
          onChange={goToPage}
        />
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