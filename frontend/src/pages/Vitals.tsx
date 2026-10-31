// src/pages/Vitals.tsx

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
  Bed,
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
  cn,
} from '../components/ui';

// Priority chip
const PriorityBadge = ({ priority }: { priority: string }) => {
  if (priority === 'critical' || priority === 'stat') {
    return <Badge tone="red" dot size="sm">Critical</Badge>;
  }
  if (priority === 'urgent') {
    return <Badge tone="orange" dot size="sm">Urgent</Badge>;
  }
  return <Badge tone="blue" dot size="sm">Routine</Badge>;
};

export default function VitalsWaitingList() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState<'pending' | 'recent'>('pending');

  // ✅ Only use worklistStore - no more attendanceStore or patientStore needed
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

  // ✅ Directly use worklistItems - they already have hasVitalsToday flag
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
    if (!searchQuery) return source;
    const lower = searchQuery.toLowerCase();
    return source.filter(p =>
      p.patient?.name?.toLowerCase().includes(lower) ||
      p.patient?.folderNumber?.toLowerCase().includes(lower) ||
      (p.attendanceNumber || '').toLowerCase().includes(lower)
    );
  }, [pendingPatients, recentPatients, worklistItems, searchQuery, activeTab, view]);

  // Pagination
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

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
        meta={`${filteredPatients.length} shown • ${pendingPatients.length} due • ${recentPatients.length} done today`}
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
            <Button variant="secondary" icon={HeartPulse} onClick={() => navigate('/dashboard/vitals/entry')}>
              Vitals Entry
            </Button>
            <Button icon={RefreshCw} loading={refreshing} onClick={loadData}>
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
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by patient name, folder or attendance number..."
        />
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
            <table className="w-full text-sm">
              <thead className={TH_ROW}>
                <tr>
                  <th className={TH}>Patient</th>
                  <th className={TH}>Folder #</th>
                  <th className={TH}>Attendance #</th>
                  <th className={TH}>Visit date</th>
                  <th className={TH}>Location</th>
                  <th className={cn(TH, 'text-center')}>
                    {activeTab === 'pending' ? 'Last Vitals' : 'Latest Reading'}
                  </th>
                  {activeTab === 'pending' && (
                    <th className={TH}>Priority</th>
                  )}
                  <th className={TH}>
                    {activeTab === 'pending' ? 'Waiting Time' : 'Recorded At'}
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
                        <div>
                          <p className="font-medium text-[var(--text-primary)] text-sm">
                            {patient.patient?.name}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {patient.patient?.age} years • {patient.patient?.gender}
                            {patient.isAntenatal && <span className="ml-1">🤰</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className={TD_MONO}>{patient.patient?.folderNumber}</td>
                    <td className={TD_MONO}>{patient.attendanceNumber || '—'}</td>
                    <td className={cn(TD, 'text-xs text-[var(--text-secondary)]')}>
                      {patient.attendanceDateTime ? new Date(patient.attendanceDateTime).toLocaleString() : '—'}
                    </td>
                    <td className={TD}>
                      <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                        <Bed className="w-3.5 h-3.5" />
                        <span>{patient.location?.bed || '—'}</span>
                        {patient.location?.ward && <span className="text-xs">({patient.location.ward})</span>}
                      </div>
                    </td>
                    <td className={cn(TD, 'text-center')}>
                      {patient.lastVitals ? (
                        <div className="text-xs space-y-1">
                          <div className="flex gap-2 justify-center">
                            <span>BP: {patient.lastVitals.bloodPressure || '—'}</span>
                            <span>Temp: {patient.lastVitals.temperature || '—'}°C</span>
                          </div>
                          <div className="flex gap-2 justify-center text-[var(--text-tertiary)]">
                            <span>Pulse: {patient.lastVitals.pulse || '—'}</span>
                            <span>SpO2: {patient.lastVitals.spo2 || '—'}%</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--text-secondary)]">No records</span>
                      )}
                    </td>
                    {activeTab === 'pending' && (
                      <td className={TD}>
                        <PriorityBadge priority={patient.priority} />
                        {patient.hasAbnormal && (
                          <Badge tone="red" size="xs" className="ml-1">Abnormal</Badge>
                        )}
                      </td>
                    )}
                    <td className={TD}>
                      <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {activeTab === 'pending'
                            ? `${Math.floor(patient.waitTime / 60)}h ${patient.waitTime % 60}m`
                            : patient.vitalsRecordedAt
                              ? new Date(patient.vitalsRecordedAt).toLocaleTimeString()
                              : '—'
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
        page={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={filteredPatients.length}
        noun="patients"
        onChange={setCurrentPage}
      />
    </div>
  );
}
