// src/pages/Vitals.tsx — COMPLETE FILE, nothing removed.
// CHANGES ONLY (same treatment as Patients / Attendance / Insurance):
//  1. Every data point in its own column — was: Patient cell stacked name+age+gender+antenatal,
//     Location stacked bed+ward, Last Vitals stacked BP+Temp+Pulse+SpO2, Priority stacked badge+Abnormal.
//     Now: Patient | Age | Gender | Folder # | Attendance # | Visit date |
//     BP | Temp | Pulse | SpO2 | Priority | Abnormal | Waiting / Recorded | Actions
//     (Antenatal, Ward, Bed removed — see fix 6)
//  2. Pagination hardened: totalPages = Math.max(1, ...) + safePage clamp, page resets on
//     search / tab / view change (was: could strand on an empty page, reset only on tab).
//  3. Sorting: click Visit date or Waiting / Recorded to sort (was: no sort).
//  4. (Superseded by fix 6) Antenatal column removed entirely — the Antenatal stat card stays.
//  5. All handlers, stats, tabs, WorklistViewControls, navigation state, loading state UNCHANGED.
//  6. VIEWPORT FIX: Antenatal, Ward and Bed columns REMOVED (not needed). Table is now 14 cols pending /
//     12 cols recent, text-xs + table-fixed + truncated patient name + short visit date, so it fits
//     a normal viewport instead of overflowing sideways.
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorklistStore } from '../store/worklistStore';
import { WorklistViewControls } from '../components/worklist/WorklistViewControls';
import { useToast } from '../store/toastStore';
import {
  HeartPulse,
  Activity,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  Heart,
  User,
  Baby,
  History,
  Eye,
  Edit3,
  ArrowUpDown,
} from 'lucide-react';
import {
  PageHeader,
  Button,
  Card,
  SearchInput,
  Tabs,
  Badge,
  StatCard,
  Pagination,
  TH,
  TH_ROW,
  TD,
  TD_MONO,
  TR,
  TABLE_SHELL,
  FilterSelect,
  cn,
} from '../components/ui';

// Priority chip
const PriorityBadge = ({ priority }: { priority: string }) => {
  if (priority === 'critical' || priority === 'stat') {
    return (
      <Badge tone="red" dot size="sm">
        Critical
      </Badge>
    );
  }
  if (priority === 'urgent') {
    return (
      <Badge tone="orange" dot size="sm">
        Urgent
      </Badge>
    );
  }
  return (
    <Badge tone="blue" dot size="sm">
      Routine
    </Badge>
  );
};

export default function VitalsWaitingList() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState<'pending' | 'recent'>('pending');
  const [sortKey, setSortKey] = useState<'visit' | 'waiting'>('visit');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Only use worklistStore - no more attendanceStore or patientStore needed
  const { worklistItems, fetchWorklist, isLoading: worklistLoading, view } = useWorklistStore();

  const loadData = async () => {
    try {
      setRefreshing(true);
      setIsLoading(true);
      await fetchWorklist('vitals');
      success('Data loaded', 'Vitals ready');
    } catch (err: any) {
      toastError('Load failed', err.message || 'Could not load data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Directly use worklistItems - they already have hasVitalsToday flag
  const pendingPatients = useMemo(() => {
    return worklistItems.filter(item => !item.hasVitalsToday);
  }, [worklistItems]);

  const recentPatients = useMemo(() => {
    return worklistItems.filter(item => item.hasVitalsToday);
  }, [worklistItems]);

  // Filter based on search and active tab. The completed and awaiting-results queues are already
  // narrowed by the server, so the pending/done-today split only applies to the to-do queue.
  const filteredPatients = useMemo(() => {
    const source = view === 'pending'
      ? (activeTab === 'pending' ? pendingPatients : recentPatients)
      : worklistItems;
    const searched = !searchQuery
      ? source
      : source.filter(p => {
        const lower = searchQuery.toLowerCase();
        return (
          p.patient?.name?.toLowerCase().includes(lower) ||
          p.patient?.folderNumber?.toLowerCase().includes(lower) ||
          (p.attendanceNumber || '').toLowerCase().includes(lower)
        );
      });
    return [...searched].sort((a: any, b: any) => {
      const aVal = sortKey === 'visit'
        ? new Date(a.attendanceDateTime || 0).getTime()
        : sortKey === 'waiting' && activeTab === 'pending'
          ? Number(a.waitTime || 0)
          : new Date(a.vitalsRecordedAt || a.attendanceDateTime || 0).getTime();
      const bVal = sortKey === 'visit'
        ? new Date(b.attendanceDateTime || 0).getTime()
        : sortKey === 'waiting' && activeTab === 'pending'
          ? Number(b.waitTime || 0)
          : new Date(b.vitalsRecordedAt || b.attendanceDateTime || 0).getTime();
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [pendingPatients, recentPatients, worklistItems, searchQuery, activeTab, view, sortKey, sortDir]);

  // Pagination - clamped so filtering can never strand you on an empty page
  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPatients = filteredPatients.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage
  );

  // Reset page when tab, search, or worklist view changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, view]);

  // Stats
  const stats = {
    pendingVitals: pendingPatients.length,
    critical: pendingPatients.filter(p => p.priority === 'critical' || p.priority === 'stat').length,
    urgent: pendingPatients.filter(p => p.priority === 'urgent').length,
    antenatalPatients: pendingPatients.filter(p => p.isAntenatal).length,
    recentVitals: recentPatients.length
  };

  const handlePatientClick = (patient: any) => {
    navigate(`/dashboard/vitals/${patient.patientId}`, {
      state: {
        patient: {
          id: patient.patientId,
          name: patient.patient?.name,
          folderNumber: patient.patient?.folderNumber,
          age: patient.patient?.age,
          gender: patient.patient?.gender
        },
        attendanceId: patient.attendanceId,
        isAntenatal: patient.isAntenatal,
        lastVitals: patient.lastVitals
      }
    });
  };

  const toggleSort = (key: 'visit' | 'waiting') => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  if (isLoading || worklistLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)]">
          <div className="w-12 h-12 border-4 border-[var(--icon-red-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Loading Vitals Queue...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <PageHeader
        title="Vital Signs"
        subtitle="Record and monitor patient vital signs"
        meta={`${filteredPatients.length} shown \u2022 ${pendingPatients.length} due \u2022 ${recentPatients.length} done today`}
        icon={HeartPulse}
        accent="red"
        backTo="/dashboard"
        tabs={view === 'pending' ? (
          <Tabs<'pending' | 'recent'>
            tabs={[
              { key: 'pending', label: 'Pending Vitals', icon: Clock, count: pendingPatients.length },
              { key: 'recent', label: 'Recent Vitals (Today)', icon: CheckCircle, count: recentPatients.length },
            ]}
            active={activeTab}
            onChange={setActiveTab}
            accent="red"
            aria-label="Vitals queue"
          />
        ) : undefined}
        actions={(
          <>
            <Button
              variant="secondary"
              icon={HeartPulse}
              onClick={() => navigate('/dashboard/vitals/entry')}
            >
              Vitals Entry
            </Button>
            <Button
              icon={RefreshCw}
              loading={refreshing}
              onClick={loadData}
            >
              Refresh
            </Button>
          </>
        )}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard
          label="Vitals Due"
          value={stats.pendingVitals}
          icon={Activity}
          accent="red"
          onClick={() => navigate('/dashboard/vitals')}
        />
        <StatCard
          label="Critical"
          value={stats.critical}
          icon={AlertTriangle}
          accent="red"
          onClick={() => navigate('/dashboard/vitals')}
        />
        <StatCard
          label="Urgent"
          value={stats.urgent}
          icon={Clock}
          accent="orange"
          onClick={() => navigate('/dashboard/vitals')}
        />
        <StatCard
          label="Antenatal"
          value={stats.antenatalPatients}
          icon={Baby}
          accent="purple"
          onClick={() => navigate('/dashboard/vitals')}
        />
        <StatCard
          label="Recent Vitals"
          value={stats.recentVitals}
          icon={History}
          accent="green"
          onClick={() => navigate('/dashboard/vitals')}
        />
      </div>

      {/* Search Bar */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by patient name, folder or attendance number..."
          />
          <FilterSelect
            aria-label="Rows per page"
            value={String(itemsPerPage)}
            onChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}
            options={[
              { value: '10', label: '10 per page' },
              { value: '20', label: '20 per page' },
              { value: '50', label: '50 per page' },
            ]}
          />
        </div>
      </Card>

      {/* Queue view: what is open now, what was closed, and what was closed with a result still owed */}
      <Card>
        <WorklistViewControls department="vitals" />
      </Card>

      {/* Table View */}
      <div className={TABLE_SHELL}>
        <div className="bg-[var(--bg-main)] px-6 py-3 border-b border-[var(--border-color)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            {activeTab === 'pending' ? (
              <>
                <Heart className="w-4 h-4 text-[var(--icon-red-text)]" />
                Vitals Waiting List ({filteredPatients.length} patients)
              </>
            ) : (
              <>
                <History className="w-4 h-4 text-[var(--icon-green-text)]" />
                Recent Vitals Recorded Today ({filteredPatients.length} patients)
              </>
            )}
          </h2>
        </div>

        {filteredPatients.length === 0 ? (
          <div className="p-8 text-center">
            {activeTab === 'pending' ? (
              <>
                <CheckCircle className="w-12 h-12 text-[var(--icon-green-text)] mx-auto mb-3 opacity-50" />
                <p className="text-[var(--text-secondary)]">No patients waiting for vitals</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">All vitals are up to date</p>
              </>
            ) : (
              <>
                <History className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3 opacity-50" />
                <p className="text-[var(--text-secondary)]">No vitals recorded today</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">Record vitals to see them here</p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs table-fixed">
              <thead className={TH_ROW}>
                <tr>
                  <th className={TH}>Patient</th>
                  <th className={cn(TH, 'text-right')}>Age</th>
                  <th className={TH}>Gender</th>
                  <th className={TH}>Folder #</th>
                  <th className={TH}>Attendance #</th>
                  <th className={TH}>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => toggleSort('visit')}
                    >
                      Visit date
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className={cn(TH, 'text-right')}>BP</th>
                  <th className={cn(TH, 'text-right')}>Temp</th>
                  <th className={cn(TH, 'text-right')}>Pulse</th>
                  <th className={cn(TH, 'text-right')}>SpO2</th>
                  {activeTab === 'pending' && (
                    <>
                      <th className={TH}>Priority</th>
                      <th className={TH}>Abnormal</th>
                    </>
                  )}
                  <th className={TH}>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => toggleSort('waiting')}
                    >
                      {activeTab === 'pending' ? 'Waiting Time' : 'Recorded At'}
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className={cn(TH, 'text-center')}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPatients.map((patient) => (
                  <tr
                    key={patient.id}
                    className={cn(TR, 'cursor-pointer')}
                    onClick={() => handlePatientClick(patient)}
                  >
                    <td className={TD}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[var(--icon-cyan-bg)] rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                        </div>
                        <span className="font-medium text-[var(--text-primary)] text-sm max-w-[170px] truncate" title={patient.patient?.name}>
                          {patient.patient?.name}
                        </span>
                      </div>
                    </td>
                    <td className={cn(TD, 'text-right')}>
                      {patient.patient?.age != null ? `${patient.patient.age} years` : '\u2014'}
                    </td>
                    <td className={TD}>
                      {patient.patient?.gender || '\u2014'}
                    </td>
                    <td className={TD_MONO}>
                      {patient.patient?.folderNumber}
                    </td>
                    <td className={TD_MONO}>
                      {patient.attendanceNumber || '\u2014'}
                    </td>
                    <td className={cn(TD, 'text-xs text-[var(--text-secondary)]')}>
                      {patient.attendanceDateTime
                        ? new Date(patient.attendanceDateTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + new Date(patient.attendanceDateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                        : '\u2014'}
                    </td>
                    <td className={cn(TD, 'text-right')}>
                      {patient.lastVitals?.bloodPressure || '\u2014'}
                    </td>
                    <td className={cn(TD, 'text-right')}>
                      {patient.lastVitals?.temperature != null
                        ? `${patient.lastVitals.temperature}\u00b0C`
                        : '\u2014'}
                    </td>
                    <td className={cn(TD, 'text-right')}>
                      {patient.lastVitals?.pulse ?? '\u2014'}
                    </td>
                    <td className={cn(TD, 'text-right')}>
                      {patient.lastVitals?.spo2 != null
                        ? `${patient.lastVitals.spo2}%`
                        : '\u2014'}
                    </td>
                    {activeTab === 'pending' && (
                      <>
                        <td className={TD}>
                          <PriorityBadge priority={patient.priority} />
                        </td>
                        <td className={TD}>
                          {patient.hasAbnormal ? (
                            <Badge tone="red" size="xs">
                              Abnormal
                            </Badge>
                          ) : (
                            '\u2014'
                          )}
                        </td>
                      </>
                    )}
                    <td className={TD}>
                      <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {activeTab === 'pending'
                            ? `${Math.floor(patient.waitTime / 60)}h ${patient.waitTime % 60}m`
                            : patient.vitalsRecordedAt
                              ? new Date(patient.vitalsRecordedAt).toLocaleTimeString()
                              : '\u2014'
                          }
                        </span>
                      </div>
                    </td>
                    <td className={cn(TD, 'text-center')}>
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        icon={activeTab === 'pending' ? Eye : Edit3}
                        aria-label={activeTab === 'pending' ? 'Record Vitals' : 'Edit Vitals'}
                        className="mx-auto"
                        onClick={(e) => { e.stopPropagation(); handlePatientClick(patient); }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination
        page={safePage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={filteredPatients.length}
        noun="patients"
        onChange={setCurrentPage}
      />
    </div>
  );
}
