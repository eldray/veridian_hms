// src/pages/MedicalWaitingList.tsx - SIMPLIFIED using worklistStore only

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveRefresh } from '../api/realtime';
import { useWorklistStore } from '../store/worklistStore';
import { WorklistViewControls } from '../components/worklist/WorklistViewControls';
import { useToast } from '../store/toastStore';
import {
  AlertCircle,
  AlertTriangle,
  Bed,
  CheckCircle,
  Clipboard,
  ClipboardList,
  Clock,
  Eye,
  FileText,
  History,
  RefreshCw,
  User,
  Users,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  humanStatus,
  PageHeader,
  Pagination,
  SearchInput,
  StatCard,
  statusTone,
  Tabs,
  TD,
  TD_MONO,
  TH,
  TH_ROW,
  TR,
  cn,
  type BadgeTone,
  type TabItem,
} from '../components/ui';

// This queue's own statuses and priorities are not part of Badge's shared maps, so the tone and
// the wording they earn on screen stay here — the chip itself is always the shared Badge.
const MEDICAL_STATUS: Record<string, { tone: BadgeTone; label: string }> = {
  pending_doctor: { tone: 'yellow', label: 'Pending Review' },
  reviewed: { tone: 'green', label: 'Reviewed' },
  pending_vitals_first: { tone: 'blue', label: 'Awaiting Vitals' },
};

const PRIORITY_TONES: Record<string, BadgeTone> = {
  stat: 'red',
  critical: 'red',
  urgent: 'orange',
};

const PRIORITY_LABELS: Record<string, string> = {
  stat: 'CRITICAL',
  critical: 'CRITICAL',
  urgent: 'URGENT',
};

const QUEUE_TABS: TabItem[] = [
  { key: 'pending', label: 'Pending Review', icon: Clock },
  { key: 'recent', label: 'Reviewed Today', icon: CheckCircle },
];

export default function MedicalWaitingList() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState<'pending' | 'recent'>('pending');

  // ✅ ONLY use worklistStore
  const { worklistItems, fetchWorklist, isLoading: worklistLoading, view } = useWorklistStore();
  // Live queue: refreshes within a couple of seconds when a visit, request or result changes
  useLiveRefresh(['encounters', 'nursing'], () => fetchWorklist('medical', { silent: true }));

  const loadData = async () => {
    try {
      setRefreshing(true);
      setIsLoading(true);
      await fetchWorklist('medical');
      success('Data loaded', 'Medical waiting list ready');
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

  // ✅ Directly use worklistItems - they already have status flags
  // For medical: hasMedicalNotesToday flag determines if patient has been reviewed
  const pendingPatients = useMemo(() => {
    return worklistItems.filter(item => !item.hasMedicalNotesToday && item.status === 'pending_doctor');
  }, [worklistItems]);

  const recentPatients = useMemo(() => {
    return worklistItems.filter(item => item.hasMedicalNotesToday || item.status === 'reviewed');
  }, [worklistItems]);

  // Filter based on search and active tab. The completed and awaiting-results queues are already
  // narrowed by the server, so the review split only applies to the to-do queue.
  const filteredPatients = useMemo(() => {
    const source = view === 'pending' ? (activeTab === 'pending' ? pendingPatients : recentPatients) : worklistItems;
    if (!searchQuery) return source;
    const lower = searchQuery.toLowerCase();
    return source.filter(patient =>
      patient.patient?.name?.toLowerCase().includes(lower) ||
      patient.patient?.folderNumber?.toLowerCase().includes(lower) ||
      (patient.attendanceNumber || '').toLowerCase().includes(lower) ||
      patient.complaints?.toLowerCase().includes(lower)
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
    total: pendingPatients.length,
    urgent: pendingPatients.filter(p => p.priority === 'urgent').length,
    critical: pendingPatients.filter(p => p.priority === 'stat' || p.priority === 'critical').length,
    reviewed: recentPatients.length
  };

  const handleStartConsultation = (patient: any) => {
    navigate(`/dashboard/medical-entries/${patient.attendanceId}`, {
      state: {
        patient: {
          id: patient.patientId,
          name: patient.patient?.name,
          folderNumber: patient.patient?.folderNumber,
          age: patient.patient?.age,
          gender: patient.patient?.gender
        },
        attendanceId: patient.attendanceId,
        fromWaitingList: true
      }
    });
  };

  // One header for the whole screen, so the loading branch and the queue open identically.
  const queueHeader = (
    <PageHeader
      title="Medical Consultation Queue"
      subtitle="View waiting patients and start consultations"
      icon={Clipboard}
      accent="green"
      backTo="/dashboard"
      actions={(
        <>
          <Button variant="secondary" icon={FileText} onClick={() => navigate('/dashboard/medical-entries')}>
            Medical Entries
          </Button>
          <Button icon={RefreshCw} loading={refreshing} onClick={loadData}>Refresh</Button>
        </>
      )}
      tabs={view === 'pending' && (
        <Tabs
          tabs={QUEUE_TABS.map(tab => ({
            ...tab,
            count: tab.key === 'pending' ? pendingPatients.length : recentPatients.length,
          }))}
          active={activeTab}
          onChange={(key) => setActiveTab(key as 'pending' | 'recent')}
          accent="green"
          aria-label="Review status"
        />
      )}
    />
  );

  if (isLoading || worklistLoading) {
    return (
      <div className="space-y-6 p-6">
        {queueHeader}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl py-16 text-center">
          <div className="w-12 h-12 border-4 border-[var(--icon-green-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">Loading Medical Queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {queueHeader}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          label="Total Waiting"
          value={stats.total}
          icon={Users}
          accent="cyan"
          onClick={() => navigate('/dashboard/consultations')}
        />
        <StatCard
          label="Urgent"
          value={stats.urgent}
          icon={AlertTriangle}
          accent="orange"
          onClick={() => navigate('/dashboard/consultations')}
        />
        <StatCard
          label="Critical"
          value={stats.critical}
          icon={AlertCircle}
          accent="red"
          onClick={() => navigate('/dashboard/consultations')}
        />
        <StatCard
          label="Reviewed Today"
          value={stats.reviewed}
          icon={CheckCircle}
          accent="green"
          onClick={() => navigate('/dashboard/consultations')}
        />
        <StatCard
          label="Recent Cases"
          value={stats.reviewed}
          icon={History}
          accent="purple"
          onClick={() => navigate('/dashboard/consultations')}
        />
      </div>

      {/* Search Bar */}
      <Card>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by patient name, folder number, or complaints..."
        />
      </Card>

      {/* Queue view: open visits, visits closed today, and visits closed with a result still owed */}
      <Card>
        <WorklistViewControls department="medical" />
      </Card>

      {/* Table View */}
      <Card
        title={activeTab === 'pending'
          ? `Waiting List (${filteredPatients.length} patients)`
          : `Recently Reviewed Today (${filteredPatients.length} patients)`}
        icon={activeTab === 'pending' ? ClipboardList : History}
        accent="green"
        padded={false}
      >
        {filteredPatients.length === 0 ? (
          <div className="p-8 text-center">
            {activeTab === 'pending' ? (
              <>
                <CheckCircle className="w-12 h-12 text-[var(--icon-green-text)] mx-auto mb-3 opacity-50" />
                <p className="text-[var(--text-secondary)]">No patients waiting for consultation</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">All patients have been attended to</p>
              </>
            ) : (
              <>
                <History className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3 opacity-50" />
                <p className="text-[var(--text-secondary)]">No patients reviewed today</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">Complete consultations to see them here</p>
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
                  <th className={TH}>Complaints</th>
                  <th className={cn(TH, 'text-center')}>Status</th>
                  <th className={TH}>
                    {activeTab === 'pending' ? 'Priority' : 'Reviewed At'}
                  </th>
                  <th className={TH}>
                    {activeTab === 'pending' ? 'Wait Time' : 'Doctor'}
                  </th>
                  <th className={cn(TH, 'text-center')}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPatients.map((patient) => (
                  <tr
                    key={patient.id}
                    className={cn(TR, 'cursor-pointer')}
                    onClick={() => handleStartConsultation(patient)}
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
                        <span>{patient.location?.bed || 'OPD'}</span>
                        {patient.location?.ward && <span className="text-xs">({patient.location.ward})</span>}
                      </div>
                    </td>
                    <td className={cn(TD, 'whitespace-normal')}>
                      <p className="text-sm text-[var(--text-primary)] max-w-xs truncate">
                        {patient.complaints || '—'}
                      </p>
                    </td>
                    <td className={cn(TD, 'text-center')}>
                      <Badge tone={MEDICAL_STATUS[patient.status]?.tone ?? statusTone(patient.status)} dot size="sm">
                        {MEDICAL_STATUS[patient.status]?.label ?? humanStatus(patient.status)}
                      </Badge>
                    </td>
                    <td className={TD}>
                      {activeTab === 'pending' ? (
                        <Badge tone={PRIORITY_TONES[patient.priority] ?? 'green'} dot size="sm">
                          {PRIORITY_LABELS[patient.priority] ?? 'WAITING'}
                        </Badge>
                      ) : (
                        <div className="text-xs text-[var(--text-secondary)]">
                          {patient.reviewedAt
                            ? new Date(patient.reviewedAt).toLocaleTimeString()
                            : '—'}
                        </div>
                      )}
                    </td>
                    <td className={TD}>
                      {activeTab === 'pending' ? (
                        <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {Math.floor(patient.waitTime / 60)}h {patient.waitTime % 60}m
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--text-secondary)]">
                          {patient.reviewedBy || '—'}
                        </span>
                      )}
                    </td>
                    <td className={cn(TD, 'text-center')}>
                      <Button
                        size="sm"
                        variant="soft"
                        accent={activeTab === 'pending' ? 'green' : 'blue'}
                        icon={activeTab === 'pending' ? Eye : FileText}
                        className="mx-auto"
                        onClick={(e) => { e.stopPropagation(); handleStartConsultation(patient); }}
                      >
                        {activeTab === 'pending' ? 'Start Consultation' : 'View Record'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
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
