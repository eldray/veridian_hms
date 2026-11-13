// src/pages/Patients.tsx - REDESIGNED: every detail in its own column + responsive viewports
import { getPatients } from '../api';
import { useState, useEffect, useMemo } from 'react';
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
type SortKey = 'newest' | 'name' | 'lastVisit' | 'balance';

export default function Patients() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('list');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [onlyWithBalance, setOnlyWithBalance] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // ---------- helpers: one value per column ----------
  const getPatientFullName = (p: any) => p?.fullName || p?.name || `${p?.surname || ''} ${p?.otherNames || ''}`.trim();
  const getPatientId = (p: any) => p.id;
  const getAgeLabel = (p: any) => {
    if (p?.ageDisplay) return String(p.ageDisplay).replace(/years?/i, 'y').replace(/months?/i, 'm').trim();
    if (p?.age != null) return `${p.age}y`;
    return '—';
  };
  const getSexLabel = (p: any) => {
    const g = String(p?.gender || '').toLowerCase();
    if (g.startsWith('f')) return 'F';
    if (g.startsWith('m')) return 'M';
    return '—';
  };
  const getSexTone = (p: any) => {
    const g = String(p?.gender || '').toLowerCase();
    if (g.startsWith('f')) return 'purple' as const;
    if (g.startsWith('m')) return 'cyan' as const;
    return 'neutral' as const;
  };
  // Most recent attendance = source for Last Visit / Type / Status
  const getLastAttendance = (p: any) => {
    if (!p?.attendances?.length) return null;
    return [...p.attendances].sort((a: any, b: any) => new Date(b.dateTime || b.createdAt).getTime() - new Date(a.dateTime || a.createdAt).getTime())[0];
  };
  const getBalance = (p: any) => {
    if (!p?.attendances?.length) return 0;
    return p.attendances.reduce((s: number, a: any) => s + ((a.totalBill || 0) - (a.paidAmount || 0)), 0);
  };
  const getVisitStatus = (p: any): { label: string; tone: 'green' | 'yellow' | 'cyan' | 'neutral' | 'red' } => {
    const today = new Date().toISOString().split('T')[0];
    const hasToday = p?.attendances?.some((a: any) => new Date(a.dateTime).toISOString().split('T')[0] === today);
    if (hasToday) return { label: 'Today', tone: 'green' };
    const last = getLastAttendance(p);
    if (!last) return { label: 'No Visit', tone: 'neutral' };
    const s = String(last.status || '').toLowerCase();
    if (s === 'admitted') return { label: 'Admitted', tone: 'red' };
    if (['pending', 'active', 'in-progress'].includes(s)) return { label: 'Pending', tone: 'yellow' };
    if (s === 'completed') return { label: 'Completed', tone: 'cyan' };
    return { label: 'Completed', tone: 'neutral' };
  };
  const formatVisitType = (t?: string) => {
    if (!t) return '—';
    const map: Record<string, string> = { outpatient: 'OPD', antenatal: 'ANC', emergency: 'EMG', inpatient: 'INP', review: 'Review', follow_up: 'Follow-up', followup: 'Follow-up' };
    return map[t.toLowerCase()] || t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };
  const formatMoney = (n: number) => `₵${Number(n || 0).toFixed(2)}`;

  const filterPatientsByDate = (list: any[]) => {
    if (dateFilter === 'all') return list;
    if (dateFilter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      return list.filter(p => p.attendances?.some((a: any) => new Date(a.dateTime).toISOString().split('T')[0] === today));
    }
    if (dateFilter === 'yesterday') {
      const y = new Date(); y.setDate(y.getDate() - 1);
      const ys = y.toISOString().split('T')[0];
      return list.filter(p => p.attendances?.some((a: any) => new Date(a.dateTime).toISOString().split('T')[0] === ys));
    }
    if (dateFilter === 'custom' && customStartDate && customEndDate) {
      return list.filter(p => p.attendances?.some((a: any) => {
        const d = new Date(a.dateTime).toISOString().split('T')[0];
        return d >= customStartDate && d <= customEndDate;
      }));
    }
    return list;
  };

  const searchedPatients = useMemo(() => {
    if (!searchQuery) return patients;
    const local = searchPatients(searchQuery);
    if (serverMatches.length === 0) return local;
    const seen = new Set(local.map((p: any) => p.id));
    return [...local, ...serverMatches.filter((p: any) => !seen.has(p.id))];
  }, [searchQuery, patients, serverMatches, searchPatients]);

  const filteredPatients = useMemo(() => {
    let list = filterPatientsByDate(searchedPatients);
    if (onlyWithBalance) list = list.filter(p => getBalance(p) > 0);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchedPatients, dateFilter, customStartDate, customEndDate, onlyWithBalance]);

  const sortedPatients = useMemo(() => {
    const arr = [...filteredPatients];
    if (sortKey === 'name') return arr.sort((a, b) => getPatientFullName(a).localeCompare(getPatientFullName(b)));
    if (sortKey === 'lastVisit') {
      return arr.sort((a, b) => {
        const da = getLastAttendance(a)?.dateTime || ''; const db = getLastAttendance(b)?.dateTime || '';
        return new Date(db).getTime() - new Date(da).getTime();
      });
    }
    if (sortKey === 'balance') return arr.sort((a, b) => getBalance(b) - getBalance(a));
    return arr.sort((a, b) => new Date(b.createdAt || b.registeredAt || 0).getTime() - new Date(a.createdAt || a.registeredAt || 0).getTime());
  }, [filteredPatients, sortKey]);

  const totalPages = Math.ceil(sortedPatients.length / itemsPerPage);
  const paginatedPatients = sortedPatients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const canRegister = hasRole(['admin', 'doctor', 'nurse', 'midwife', 'records']);
  const canDelete = hasRole(['admin']);

  const handleAddAttendance = (id: string) => { setSelectedPatientId(id); setShowAttendanceModal(true); };
  const handleAttendanceSuccess = () => { setShowAttendanceModal(false); setSelectedPatientId(null); success('Check-in complete', 'New visit created'); handleRefresh(); };
  const handleAttendanceClose = () => { setShowAttendanceModal(false); setSelectedPatientId(null); };
  const handleRefresh = () => { setRefreshing(true); loadPatients({}, { force: true }).finally(() => setRefreshing(false)); setCurrentPage(1); };
  const handleDeletePatient = async (id: string) => {
    try { await deletePatient(id); setDeleteConfirm(null); success('Patient Deleted', 'Patient record has been removed'); handleRefresh(); }
    catch (err: any) { error('Delete Failed', err.message || 'Failed to delete patient'); }
  };
  const goToPage = (p: number) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));

  const getPaymentModeTone = (m: string) => m === 'nhis' ? 'green' as const : m === 'private_insurance' ? 'purple' as const : 'neutral' as const;
  const getPaymentModeLabel = (m: string) => m === 'cash' ? 'CASH' : m === 'nhis' ? 'NHIS' : m === 'private_insurance' ? 'PRIVATE' : (m?.toUpperCase() || 'UNKNOWN');
  const getDateFilterLabel = () => dateFilter === 'all' ? 'All Patients' : dateFilter === 'today' ? "Today's Patients" : dateFilter === 'yesterday' ? "Yesterday's Patients" : `${customStartDate} to ${customEndDate}`;

  const stats = {
    totalPatients: pagination?.total ?? patients.length,
    filteredCount: sortedPatients.length,
    withAttendances: patients.filter(p => p.attendances?.length > 0).length,
    withBalance: patients.filter(p => getBalance(p) > 0).length,
  };

  const header = (
    <PageHeader title="Patient Management" subtitle="Manage patient records and medical history"
      meta={<>{stats.totalPatients} total patients • {stats.withAttendances} with visits • {stats.withBalance} with balance {isLoadingMore && <span className="ml-2 text-[var(--text-tertiary)]">(loading all patients… {patients.length} of {pagination?.total ?? '?'})</span>}</>}
      icon={Users} accent="cyan"
      actions={<><Button icon={RefreshCw} loading={refreshing} onClick={handleRefresh}>{refreshing ? 'Refreshing...' : 'Refresh'}</Button>{canRegister && <LinkButton variant="soft" accent="cyan" icon={Plus} to="/dashboard/patients/register">Register Patient</LinkButton>}</>} />
  );

  if (isLoading && !refreshing) {
    return (<div className="space-y-6 p-4 sm:p-6">{header}<div className="space-y-4">{[1,2,3,4,5].map(i => <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]"><div className="flex items-center gap-4"><div className="w-10 h-10 bg-[var(--bg-main)] rounded-lg animate-pulse" /><div className="flex-1 space-y-2"><div className="h-4 bg-[var(--bg-main)] rounded animate-pulse w-48" /><div className="h-3 bg-[var(--bg-main)] rounded animate-pulse w-32" /></div></div></div>)}</div></div>);
  }

  const dateBtn = (key: DateFilterType, label: string) => (
    <button key={key} onClick={() => { setDateFilter(key); setCurrentPage(1); setShowDatePicker(key === 'custom'); }} className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-all ${dateFilter === key ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' : 'bg-[var(--bg-main)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'}`}>{label}</button>
  );

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {header}

      {/* Date + Quick filters */}
      <div className="bg-[var(--bg-card)] rounded-xl p-3 sm:p-4 shadow-sm border border-[var(--border-color)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-[var(--text-secondary)]" /><span className="text-sm font-medium text-[var(--text-primary)]">Show patients with visits:</span></div>
          <div className="flex gap-2 overflow-x-auto max-w-full pb-0.5">{(['all','today','yesterday','custom'] as DateFilterType[]).map(k => dateBtn(k, k === 'all' ? 'All' : k === 'today' ? 'Today' : k === 'yesterday' ? 'Yesterday' : 'Custom Range'))}</div>
          <button onClick={() => { setOnlyWithBalance(v => !v); setCurrentPage(1); }} className={`px-3 py-1.5 text-sm rounded-lg ${onlyWithBalance ? 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]' : 'bg-[var(--bg-main)] text-[var(--text-secondary)]'}`}>Has Balance</button>
          {showDatePicker && dateFilter === 'custom' && (
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto sm:ml-auto">
              <input type="date" aria-label="Visits from date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className={INPUT} />
              <span className="text-[var(--text-secondary)]">to</span>
              <input type="date" aria-label="Visits to date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className={INPUT} />
            </div>
          )}
          <div className="text-xs text-[var(--text-secondary)] ml-auto hidden sm:block">Showing: {getDateFilterLabel()} • {sortedPatients.length} patients</div>
        </div>
      </div>

      {/* Search + Sort + View */}
      <div className="bg-[var(--bg-card)] rounded-xl p-3 sm:p-4 shadow-sm border border-[var(--border-color)]">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <SearchInput className="w-full lg:max-w-sm" value={searchQuery} onChange={v => { setSearchQuery(v); setCurrentPage(1); }} placeholder="Search by name, folder number, contact..." />
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <FilterSelect aria-label="Sort patients" value={sortKey} onChange={v => { setSortKey(v as SortKey); setCurrentPage(1); }} options={[{ value: 'newest', label: 'Newest first' }, { value: 'name', label: 'Name A–Z' }, { value: 'lastVisit', label: 'Last visit' }, { value: 'balance', label: 'Highest balance' }]} />
            <Segmented aria-label="Patient layout" accent="cyan" value={viewMode} onChange={setViewMode} options={[{ value: 'cards', label: 'Cards', icon: Grid }, { value: 'list', label: 'List', icon: List }]} />
            <FilterSelect aria-label="Rows per page" value={String(itemsPerPage)} onChange={v => { setItemsPerPage(Number(v)); setCurrentPage(1); }} options={[{ value: '10', label: '10 per page' }, { value: '15', label: '15 per page' }, { value: '20', label: '20 per page' }, { value: '25', label: '25 per page' }]} />
          </div>
        </div>
      </div>

      {/* Stats */}
      {sortedPatients.length > 0 && (
        <div className="bg-[var(--bg-card)] rounded-xl p-3 sm:p-4 border border-[var(--border-color)]">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Showing {paginatedPatients.length} of {sortedPatients.length} patient records {searchQuery && <span className="text-xs font-normal text-[var(--text-secondary)]">for "{searchQuery}"</span>}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone={getPaymentModeTone('cash')} size="sm">Cash: {sortedPatients.filter(p => p.paymentMode === 'cash').length}</Badge>
              <Badge tone={getPaymentModeTone('nhis')} size="sm">NHIS: {sortedPatients.filter(p => p.paymentMode === 'nhis').length}</Badge>
              <Badge tone={getPaymentModeTone('private_insurance')} size="sm">Private: {sortedPatients.filter(p => p.paymentMode === 'private_insurance').length}</Badge>
            </div>
          </div>
        </div>
      )}

      {/* Empty */}
      {sortedPatients.length === 0 && (
        <Card padded={false} className="p-8 text-center"><Users className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" /><h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{searchQuery ? 'No Patients Found' : `No ${getDateFilterLabel()}`}</h3><p className="text-[var(--text-secondary)] text-sm mb-4">{searchQuery ? 'No patient records match your search criteria.' : dateFilter === 'all' ? 'No patient records found.' : `No patients had visits ${dateFilter === 'today' ? 'today' : dateFilter === 'yesterday' ? 'yesterday' : `between ${customStartDate} and ${customEndDate}`}.`}</p>{searchQuery ? <Button icon={X} onClick={() => setSearchQuery('')}>Clear Search</Button> : dateFilter !== 'all' && <Button variant="soft" accent="cyan" icon={Users} onClick={() => { setDateFilter('all'); setOnlyWithBalance(false); }}>View All Patients</Button>}</Card>
      )}

      {/* ============ MOBILE / SMALL: CARDS ( < md ) ============ */}
      {sortedPatients.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:hidden">
          {paginatedPatients.map(patient => {
            const id = getPatientId(patient); const last = getLastAttendance(patient); const st = getVisitStatus(patient); const bal = getBalance(patient);
            return (
              <div key={id} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center shrink-0"><User className="w-5 h-5 text-[var(--icon-cyan-text)]" /></div>
                    <div className="min-w-0"><p className="font-semibold text-[var(--text-primary)] truncate">{getPatientFullName(patient)}</p><p className="text-xs text-[var(--text-secondary)] font-mono">#{patient.folderNumber || id.slice(0, 8)} • {getSexLabel(patient)} • {getAgeLabel(patient)}</p></div>
                  </div>
                  <Badge tone={st.tone} size="sm">{st.label}</Badge>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3 text-xs">
                  <div><dt className="text-[var(--text-tertiary)]">Contact</dt><dd className="font-medium text-[var(--text-primary)]">{patient.contact || '—'}</dd></div>
                  <div><dt className="text-[var(--text-tertiary)]">Payment</dt><dd><Badge tone={getPaymentModeTone(patient.paymentMode)} size="sm">{getPaymentModeLabel(patient.paymentMode)}</Badge></dd></div>
                  <div><dt className="text-[var(--text-tertiary)]">Last Visit</dt><dd className="font-medium text-[var(--text-primary)]">{last ? new Date(last.dateTime).toLocaleDateString() : 'Never'}</dd></div>
                  <div><dt className="text-[var(--text-tertiary)]">Type</dt><dd className="font-medium text-[var(--text-primary)]">{last ? formatVisitType(last.attendanceType) : '—'}</dd></div>
                  <div><dt className="text-[var(--text-tertiary)]">Balance</dt><dd className={`font-semibold ${bal > 0 ? 'text-[var(--icon-red-text)]' : 'text-[var(--text-primary)]'}`}>{formatMoney(bal)}</dd></div>
                </dl>
                <div className="flex gap-2 pt-3 mt-3 border-t border-[var(--border-color)]">
                  <LinkButton variant="soft" accent="cyan" size="sm" icon={Eye} className="flex-1" to={`/dashboard/patients/${id}`}>View</LinkButton>
                  <Button variant="soft" accent="green" size="sm" icon={Stethoscope} className="flex-1" onClick={() => handleAddAttendance(id)}>Visit</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============ TABLET: COMPACT TABLE ( md to lg ) — hides Folder, Type, Contact ============ */}
      {sortedPatients.length > 0 && viewMode === 'list' && (
        <div className={`${TABLE_SHELL} hidden md:block lg:hidden`}>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className={TH_ROW}><tr><th className={TH}>Name</th><th className={TH}>Age</th><th className={TH}>Sex</th><th className={TH}>Last Visit</th><th className={TH}>Status</th><th className={TH}>Payment</th><th className={TH}>Balance</th><th className={TH}>Actions</th></tr></thead>
            <tbody>{paginatedPatients.map(patient => {
              const id = getPatientId(patient); const last = getLastAttendance(patient); const st = getVisitStatus(patient); const bal = getBalance(patient);
              return (<tr key={id} className={TR}>
                <td className={TD}><p className="font-semibold text-[var(--text-primary)]">{getPatientFullName(patient)}</p></td>
                <td className={TD}>{getAgeLabel(patient)}</td>
                <td className={TD}><Badge tone={getSexTone(patient)} size="sm">{getSexLabel(patient)}</Badge></td>
                <td className={TD_MUTED}>{last ? new Date(last.dateTime).toLocaleDateString() : 'Never'}</td>
                <td className={TD}><Badge tone={st.tone} size="sm">{st.label}</Badge></td>
                <td className={TD}><Badge tone={getPaymentModeTone(patient.paymentMode)} size="sm">{getPaymentModeLabel(patient.paymentMode)}</Badge></td>
                <td className={TD}><span className={bal > 0 ? 'font-semibold text-[var(--icon-red-text)]' : ''}>{formatMoney(bal)}</span></td>
                <td className={TD}><div className="flex gap-1.5"><LinkButton variant="soft" accent="cyan" size="sm" iconOnly icon={Eye} aria-label="View Details" to={`/dashboard/patients/${id}`} /><Button variant="soft" accent="green" size="sm" iconOnly icon={Stethoscope} aria-label="Add Visit" onClick={() => handleAddAttendance(id)} /></div></td>
              </tr>);
            })}</tbody></table></div>
        </div>
      )}

      {/* ============ DESKTOP: FULL TABLE ( lg+ ) — every detail own column, sticky Name ============ */}
      {sortedPatients.length > 0 && viewMode === 'list' && (
        <div className={`${TABLE_SHELL} hidden lg:block`}>
          <div className="overflow-x-auto"><table className="w-full text-sm min-w-[1020px]"><thead className={TH_ROW}><tr>
            <th className={`${TH} sticky left-0 z-20 bg-inherit min-w-[180px]`}>Name</th>
            <th className={`${TH} whitespace-nowrap`}>Folder #</th><th className={TH}>Age</th><th className={TH}>Sex</th>
            <th className={`${TH} whitespace-nowrap`}>Contact</th><th className={`${TH} whitespace-nowrap`}>Last Visit</th><th className={TH}>Type</th><th className={TH}>Status</th><th className={TH}>Payment</th><th className={`${TH} text-right`}>Balance</th><th className={TH}>Actions</th>
          </tr></thead>
            <tbody>{paginatedPatients.map(patient => {
              const id = getPatientId(patient); const last = getLastAttendance(patient); const st = getVisitStatus(patient); const bal = getBalance(patient);
              return (<tr key={id} className={TR}>
                <td className={`${TD} sticky left-0 z-10 bg-[var(--bg-card)] border-r border-[var(--border-color)]`}><div className="flex items-center gap-2.5"><div className="w-8 h-8 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center shrink-0"><User className="w-4 h-4 text-[var(--icon-cyan-text)]" /></div><p className="font-semibold text-[var(--text-primary)] whitespace-nowrap">{getPatientFullName(patient)}</p></div></td>
                <td className={TD}><span className="font-mono text-xs">{patient.folderNumber || id.slice(0, 8)}</span></td>
                <td className={TD}>{getAgeLabel(patient)}</td>
                <td className={TD}><Badge tone={getSexTone(patient)} size="sm">{getSexLabel(patient)}</Badge></td>
                <td className={TD}><a href={`tel:${patient.contact}`} className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--icon-cyan-text)] whitespace-nowrap"><Phone className="w-3.5 h-3.5" />{patient.contact || '—'}</a></td>
                <td className={TD_MUTED}>{last ? new Date(last.dateTime).toLocaleDateString() : 'Never'}</td>
                <td className={TD}>{last ? formatVisitType(last.attendanceType) : '—'}</td>
                <td className={TD}><Badge tone={st.tone} size="sm">{st.label}</Badge></td>
                <td className={TD}><Badge tone={getPaymentModeTone(patient.paymentMode)} size="sm">{getPaymentModeLabel(patient.paymentMode)}</Badge></td>
                <td className={`${TD} text-right`}><span className={bal > 0 ? 'font-semibold text-[var(--icon-red-text)]' : ''}>{formatMoney(bal)}</span></td>
                <td className={TD}><div className="flex items-center gap-1.5">
                  <LinkButton variant="soft" accent="cyan" size="sm" iconOnly icon={Eye} aria-label="View Details" to={`/dashboard/patients/${id}`} />
                  <LinkButton variant="soft" accent="yellow" size="sm" iconOnly icon={Edit} aria-label="Edit Patient" to={`/dashboard/patients/register?edit=true&id=${id}`} />
                  <Button variant="soft" accent="green" size="sm" iconOnly icon={Stethoscope} aria-label="Add Visit" onClick={() => handleAddAttendance(id)} />
                  {canDelete && <Button variant="dangerSoft" size="sm" iconOnly icon={Trash2} aria-label="Delete Patient" onClick={() => setDeleteConfirm(id)} />}
                </div></td>
              </tr>);
            })}</tbody></table></div>
        </div>
      )}

      {/* ============ DESKTOP CARDS ( lg+ + Cards mode ) ============ */}
      {sortedPatients.length > 0 && viewMode === 'cards' && (
        <div className="hidden md:grid grid-cols-2 xl:grid-cols-3 gap-4">
          {paginatedPatients.map(patient => {
            const id = getPatientId(patient); const last = getLastAttendance(patient); const st = getVisitStatus(patient); const bal = getBalance(patient);
            return (
              <div key={id} className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)] hover:shadow-md transition-all group">
                <div className="flex items-start justify-between mb-3"><div className="flex items-center gap-3 min-w-0"><div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center"><User className="w-5 h-5 text-[var(--icon-cyan-text)]" /></div><div className="min-w-0"><h3 className="font-semibold text-[var(--text-primary)] text-sm truncate">{getPatientFullName(patient)}</h3><p className="text-xs text-[var(--text-secondary)] font-mono">#{patient.folderNumber || id.slice(0, 8)}</p></div></div><Badge tone={st.tone} size="sm">{st.label}</Badge></div>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[var(--bg-main)] rounded-lg p-2"><dt className="text-[var(--text-tertiary)]">Age / Sex</dt><dd className="font-semibold text-[var(--text-primary)]">{getAgeLabel(patient)} • {getSexLabel(patient)}</dd></div>
                  <div className="bg-[var(--bg-main)] rounded-lg p-2"><dt className="text-[var(--text-tertiary)]">Contact</dt><dd className="font-medium text-[var(--text-primary)] truncate">{patient.contact || '—'}</dd></div>
                  <div className="bg-[var(--bg-main)] rounded-lg p-2"><dt className="text-[var(--text-tertiary)]">Last Visit</dt><dd className="font-medium text-[var(--text-primary)]">{last ? new Date(last.dateTime).toLocaleDateString() : 'Never'}</dd></div>
                  <div className="bg-[var(--bg-main)] rounded-lg p-2"><dt className="text-[var(--text-tertiary)]">Balance</dt><dd className={`font-semibold ${bal > 0 ? 'text-[var(--icon-red-text)]' : ''}`}>{formatMoney(bal)}</dd></div>
                </dl>
                <div className="flex items-center gap-2 mt-3"><Badge tone={getPaymentModeTone(patient.paymentMode)}>{getPaymentModeLabel(patient.paymentMode)}</Badge><span className="text-xs text-[var(--text-secondary)] ml-auto">{last ? formatVisitType(last.attendanceType) : ''}</span></div>
                <div className="flex gap-2 pt-3 mt-3 border-t border-[var(--border-color)]"><LinkButton variant="soft" accent="cyan" size="sm" icon={Eye} className="flex-1" to={`/dashboard/patients/${id}`}>View</LinkButton><Button variant="soft" accent="green" size="sm" icon={Stethoscope} className="flex-1" onClick={() => handleAddAttendance(id)}>Visit</Button></div>
                {deleteConfirm === id && (<div className="mt-3 p-3 bg-[var(--icon-red-bg)] border border-[var(--border-color)] rounded-lg"><p className="text-[var(--icon-red-text)] text-xs font-medium mb-2">Delete {getPatientFullName(patient)}?</p><div className="flex gap-2"><Button variant="danger" size="xs" className="flex-1" onClick={() => handleDeletePatient(id)}>Delete</Button><Button variant="secondary" size="xs" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button></div></div>)}
              </div>
            );
          })}
        </div>
      )}

      {sortedPatients.length > 0 && <Pagination page={currentPage} totalPages={totalPages} itemsPerPage={itemsPerPage} totalItems={sortedPatients.length} noun="patient records" onChange={goToPage} />}


      {/* Delete confirmation — shared for table + cards */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] rounded-xl p-5 max-w-sm w-full border border-[var(--border-color)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-[var(--icon-red-bg)] rounded-lg flex items-center justify-center"><Trash2 className="w-4 h-4 text-[var(--icon-red-text)]" /></div>
              <div><h3 className="text-sm font-bold text-[var(--text-primary)]">Delete Patient</h3><p className="text-[11px] text-[var(--text-tertiary)]">This action cannot be undone.</p></div>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-4">Are you sure you want to delete <strong className="text-[var(--text-primary)]">{getPatientFullName(patients.find((x: any) => x.id === deleteConfirm))}</strong>? All patient records and visits will be permanently removed.</p>
            <div className="flex gap-2"><Button variant="danger" className="flex-1" onClick={() => handleDeletePatient(deleteConfirm)}>Delete</Button><Button variant="secondary" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button></div>
          </div>
        </div>
      )}

      {showAttendanceModal && selectedPatientId && <NewAttendanceModal patientId={selectedPatientId} onSuccess={handleAttendanceSuccess} onClose={handleAttendanceClose} isEditMode={false} />}
    </div>
  );
}
