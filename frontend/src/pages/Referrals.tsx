// src/pages/Referrals.tsx — Enhanced UI/UX
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../store/toastStore';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useAuthStore } from '../store/authStore';
import { useHospitalStore } from '../store/hospitalStore';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';
import { generatePDF, openPrintWindow } from '../utils/pdfGenerator';
import { getPatientName } from '../utils/patient';
import SendDocumentModal from '../components/SendDocumentModal';
import {
  getReferrals,
  createOutgoingReferral,
  createIncomingReferral,
  updateReferralStatus,
  getReferralStats,
} from '../api';
import {
  ArrowLeft, Send, Printer, UserPlus,
  Users, Clock, CheckCircle, XCircle, Activity,
  Filter, RefreshCw, Building, Stethoscope,
  MessageSquare, ChevronRight, AlertCircle,
  ArrowUpRight, ArrowDownLeft, LayoutGrid, List,
  Search, X, Info, MapPin, Calendar, FileText,
  Phone, User, ClipboardList, Target, TrendingUp,
  ChevronDown, Check, BadgeCheck, Hash, AlertTriangle,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Referral {
  id: string;
  referralNumber: string;
  referralType: 'outgoing' | 'incoming';
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  urgency: 'routine' | 'urgent' | 'stat';
  referralReason: string;
  referralNotes?: string;
  referredToFacility?: string;
  referredToDoctor?: string;
  referredToDepartment?: string;
  referredFromFacility?: string;
  referredFromDoctor?: string;
  referralDate: string;
  patient: {
    id: string;
    surname: string;
    otherNames: string;
    folderNumber: string;
    dateOfBirth: string;
    gender: string;
    contact: string;
  };
  createdBy?: { fullName: string; role: string };
}

type ViewMode = 'table' | 'cards';

// ── Badge helpers ─────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({ status, size = 'sm' }) => {
  const map: Record<string, { cls: string; Icon: React.ElementType; label: string }> = {
    pending:   { cls: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]', Icon: Clock,       label: 'Pending' },
    accepted:  { cls: 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)]',     Icon: Check,       label: 'Accepted' },
    completed: { cls: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',   Icon: CheckCircle, label: 'Completed' },
    cancelled: { cls: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]',       Icon: XCircle,     label: 'Cancelled' },
  };
  const cfg = map[status] || map.pending;
  const Icon = cfg.Icon;
  const cls = size === 'sm'
    ? 'px-2 py-0.5 text-[10px] gap-1'
    : 'px-2.5 py-1 text-xs gap-1.5';
  const iconCls = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';
  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${cfg.cls} ${cls}`}>
      <Icon className={iconCls} />
      {cfg.label}
    </span>
  );
};

const UrgencyBadge: React.FC<{ urgency: string; size?: 'sm' | 'md' }> = ({ urgency, size = 'sm' }) => {
  const map: Record<string, { cls: string; label: string; dot: string }> = {
    routine: { cls: 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)]', label: 'Routine', dot: 'bg-[var(--text-tertiary)]' },
    urgent:  { cls: 'bg-orange-100 text-orange-700 border border-orange-200',                              label: 'Urgent',  dot: 'bg-orange-500' },
    stat:    { cls: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border border-[var(--icon-red-text)]/30', label: 'STAT', dot: 'bg-red-500' },
  };
  const cfg = map[urgency] || map.routine;
  const cls = size === 'sm'
    ? 'px-2 py-0.5 text-[10px] gap-1'
    : 'px-2.5 py-1 text-xs gap-1.5';
  return (
    <span className={`inline-flex items-center rounded-full font-bold ${cfg.cls} ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${urgency === 'stat' ? 'animate-pulse' : ''}`} />
      {cfg.label}
    </span>
  );
};

const TypeBadge: React.FC<{ type: 'outgoing' | 'incoming'; size?: 'sm' | 'md' }> = ({ type, size = 'sm' }) => {
  const cls = size === 'sm'
    ? 'px-2 py-0.5 text-[10px] gap-1'
    : 'px-2.5 py-1 text-xs gap-1.5';
  const iconCls = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';
  if (type === 'outgoing') {
    return (
      <span className={`inline-flex items-center rounded-full font-semibold bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] ${cls}`}>
        <ArrowUpRight className={iconCls} /> Outgoing
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center rounded-full font-semibold bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] ${cls}`}>
      <ArrowDownLeft className={iconCls} /> Incoming
    </span>
  );
};

const initials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');

// ═════════════════════════════════════════════════════════════════════════════
// Main page
// ═════════════════════════════════════════════════════════════════════════════

export default function Referrals() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { hospital } = useHospitalStore();
  const { user } = useAuthStore();

  const { patients, loadPatients } = usePatientStore();
  const { attendances, getAttendances } = useAttendanceStore();

  // ── State ──────────────────────────────────────────────────────────────────
  const [referrals,     setReferrals]     = useState<Referral[]>([]);
  const [stats,         setStats]         = useState<any>(null);
  const [isLoading,     setIsLoading]     = useState(false);
  const [refreshing,    setRefreshing]    = useState(false);
  const [showModal,     setShowModal]     = useState(false);
  const [showStats,     setShowStats]     = useState(true);
  const [filterStatus,  setFilterStatus]  = useState('all');
  const [filterType,    setFilterType]    = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [referralType,  setReferralType]  = useState<'outgoing' | 'incoming'>('outgoing');
  const [printingId,    setPrintingId]    = useState<string | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendReferral,  setSendReferral]  = useState<Referral | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('referralsViewMode');
    return (saved as ViewMode) || 'table';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [selectedPatientId,    setSelectedPatientId]    = useState('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState('');

  const [formData, setFormData] = useState({
    referralReason:      '',
    referralNotes:       '',
    referredToFacility:  '',
    referredToDoctor:    '',
    referredToDepartment:'',
    referredFromFacility:'',
    referredFromDoctor:  '',
    urgency: 'routine' as 'routine' | 'urgent' | 'stat',
  });

  const [useStructuredForm, setUseStructuredForm] = useState(false);
  const [structuredPartI, setStructuredPartI] = useState({
    clientName: '', age: '', sex: '', parity: '', clinicName: '', generalCondition: '', patientComplaints: '', diagnosis: '', actionsTaken: '', reasonForReferral: '', dateOfReferral: '', referrerName: '', referrerTitle: '', referrerSignature: ''
  });
  const [structuredPartII, setStructuredPartII] = useState({
    institutionName: '', dateReceived: '', findings: '', actionsTaken: '', recommendations: '', receiverName: '', receiverTitle: ''
  });

  const hasLoaded = useRef(false);

  useEffect(() => {
    localStorage.setItem('referralsViewMode', viewMode);
  }, [viewMode]);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const loadData = async (force = false) => {
    if (!force && hasLoaded.current) return;
    try {
      setRefreshing(true);
      await Promise.all([loadPatients(), getAttendances()]);
      hasLoaded.current = true;
    } catch (err: any) {
      toastError('Load failed', err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchReferrals = async () => {
    try {
      const params: any = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterType   !== 'all') params.referralType = filterType;

      const response = await getReferrals(params);
      let data: Referral[] = [];
      if (Array.isArray(response))             data = response;
      else if (Array.isArray(response?.data))  data = response.data;

      setReferrals(data.map(r => ({ ...r, id: r.id || (r as any)._id })));
    } catch (err: any) {
      toastError('Error', err.response?.data?.message || 'Failed to fetch referrals');
    }
  };

  const fetchStats = async () => {
    try {
      const res = await getReferralStats();
      setStats(res?.data || res);
    } catch { /* optional */ }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { fetchReferrals(); fetchStats(); }, [filterStatus, filterType]);

  // ── Create referral ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) { toastError('Error', 'Please select a patient'); return; }
    if (referralType === 'outgoing' && !formData.referredToFacility) {
      toastError('Error', 'Please enter the facility to refer to'); return;
    }
    if (referralType === 'incoming' && !formData.referredFromFacility) {
      toastError('Error', 'Please enter the facility that referred the patient'); return;
    }

    setIsLoading(true);
    try {
      if (referralType === 'outgoing') {
        await createOutgoingReferral({
          patientId:           selectedPatientId,
          attendanceId:        selectedAttendanceId || undefined,
          referralReason:      formData.referralReason,
          referralNotes:       formData.referralNotes,
          urgency:             formData.urgency,
          referredToFacility:  formData.referredToFacility,
          referredToDoctor:    formData.referredToDoctor,
          referredToDepartment: formData.referredToDepartment,
          structuredForm:      useStructuredForm ? { partI: structuredPartI } : undefined
        });
        success('Success', 'Outgoing referral created');
      } else {
        await createIncomingReferral({
          patientId:           selectedPatientId,
          referralReason:      formData.referralReason,
          referralNotes:       formData.referralNotes,
          urgency:             formData.urgency,
          referredFromFacility: formData.referredFromFacility,
          referredFromDoctor:  formData.referredFromDoctor,
          structuredForm:      useStructuredForm ? { partII: structuredPartII } : undefined
        });
        success('Success', 'Incoming referral recorded');
      }
      setShowModal(false);
      resetForm();
      setTimeout(() => { fetchReferrals(); fetchStats(); }, 500);
    } catch (err: any) {
      toastError('Error', err.response?.data?.message || 'Failed to create referral');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Status update ──────────────────────────────────────────────────────────
  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await updateReferralStatus(id, status);
      success('Updated', `Referral marked as ${status}`);
      fetchReferrals();
      fetchStats();
    } catch (err: any) {
      toastError('Error', err.response?.data?.message || 'Failed to update status');
    }
  };

  // ── Print referral letter ──────────────────────────────────────────────────
  const handlePrintLetter = async (referral: Referral) => {
    if (!referral?.id) { toastError('Error', 'Referral ID is missing'); return; }
    setPrintingId(referral.id);
    try {
      const patientName = referral.patient
        ? `${referral.patient.surname} ${referral.patient.otherNames}`.trim()
        : 'Unknown Patient';

      const html = generatePDF('referral', {
        referral: {
          ...referral,
          referralNumber: referral.referralNumber,
          referralDate: referral.referralDate,
          referralType: referral.referralType,
          urgency: referral.urgency,
          referralReason: referral.referralReason,
          referralNotes: referral.referralNotes || '',
          referredToFacility: referral.referredToFacility || '',
          referredToDoctor: referral.referredToDoctor || '',
          referredToDepartment: referral.referredToDepartment || '',
          referredFromFacility: referral.referredFromFacility || '',
          referredFromDoctor: referral.referredFromDoctor || '',
        },
        patient: {
          ...referral.patient,
          fullName: patientName,
        },
      }, hospital);

      openPrintWindow(html, `Referral_${referral.referralNumber}`);
      success('Print ready', 'Referral letter opened');
    } catch (err) {
      console.error('Print error:', err);
      toastError('Print failed', 'Could not generate referral letter');
    } finally {
      setPrintingId(null);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setSelectedPatientId('');
    setSelectedAttendanceId('');
    setFormData({
      referralReason: '', referralNotes: '',
      referredToFacility: '', referredToDoctor: '', referredToDepartment: '',
      referredFromFacility: '', referredFromDoctor: '',
      urgency: 'routine',
    });
    setUseStructuredForm(false);
    setStructuredPartI({ clientName: '', age: '', sex: '', parity: '', clinicName: '', generalCondition: '', patientComplaints: '', diagnosis: '', actionsTaken: '', reasonForReferral: '', dateOfReferral: '', referrerName: '', referrerTitle: '', referrerSignature: '' });
    setStructuredPartII({ institutionName: '', dateReceived: '', findings: '', actionsTaken: '', recommendations: '', receiverName: '', receiverTitle: '' });
  };

  const selectedAttendance = attendances.find(a => a.id === selectedAttendanceId);

  // Client-side filtering (search + urgency) on top of server filters
  const displayedReferrals = useMemo(() => {
    let list = referrals;
    if (filterUrgency !== 'all') {
      list = list.filter(r => r.urgency === filterUrgency);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r =>
        r.referralNumber?.toLowerCase().includes(q) ||
        r.patient?.surname?.toLowerCase().includes(q) ||
        r.patient?.otherNames?.toLowerCase().includes(q) ||
        r.patient?.folderNumber?.toLowerCase().includes(q) ||
        r.referredToFacility?.toLowerCase().includes(q) ||
        r.referredFromFacility?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [referrals, filterUrgency, searchQuery]);

  // Reference number generator for the create modal preview
  const previewRefNo = useMemo(() => {
    const prefix = referralType === 'outgoing' ? 'REF-OUT' : 'REF-IN';
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    return `${prefix}-${ymd}-XXXX`;
  }, [referralType]);

  const activeFilterCount =
    (filterStatus !== 'all' ? 1 : 0) +
    (filterType !== 'all' ? 1 : 0) +
    (filterUrgency !== 'all' ? 1 : 0) +
    (searchQuery ? 1 : 0);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 p-4 sm:p-6">

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl flex items-center justify-center shadow-sm shadow-cyan-500/20">
            <Send className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">Patient Referrals</h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Manage outgoing and incoming referrals
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { loadData(true); fetchReferrals(); fetchStats(); }}
            disabled={refreshing}
            className="p-2 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowStats(s => !s)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
              showStats
                ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border-[var(--icon-cyan-text)]/20'
                : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Stats</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-all text-sm font-semibold shadow-sm shadow-cyan-500/20"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">New Referral</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {/* ── SEND DOCUMENT MODAL ─────────────────────────────────────────────── */}
      {sendReferral && (
        <SendDocumentModal
          open={showSendModal}
          onClose={() => { setShowSendModal(false); setSendReferral(null); }}
          patient={sendReferral.patient}
          documentType="referral"
          entityId={sendReferral.id}
        />
      )}

      {/* ── STATS ───────────────────────────────────────────────────────────── */}
      {showStats && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Referrals', value: stats.totalReferrals || 0, Icon: Send, bg: 'bg-[var(--icon-cyan-bg)]', color: 'text-[var(--icon-cyan-text)]' },
            { label: 'Outgoing', value: stats.byType?.find((t: any) => t.referralType === 'outgoing')?._count || 0, Icon: ArrowUpRight, bg: 'bg-[var(--icon-blue-bg)]', color: 'text-[var(--icon-blue-text)]' },
            { label: 'Incoming', value: stats.byType?.find((t: any) => t.referralType === 'incoming')?._count || 0, Icon: ArrowDownLeft, bg: 'bg-[var(--icon-green-bg)]', color: 'text-[var(--icon-green-text)]' },
            { label: 'Pending', value: stats.byStatus?.find((s: any) => s.status === 'pending')?._count || 0, Icon: Clock, bg: 'bg-[var(--icon-yellow-bg)]', color: 'text-[var(--icon-yellow-text)]' },
          ].map(s => {
            const Icon = s.Icon;
            return (
              <div key={s.label} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.bg}`}>
                    <Icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{s.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── FILTER BAR ──────────────────────────────────────────────────────── */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] shadow-sm">
        <div className="p-3">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
              <input
                type="text"
                placeholder="Search by referral #, patient name, folder, or facility…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Desktop filters */}
            <div className="hidden lg:flex items-center gap-2">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2.5 text-sm border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-cyan-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="px-3 py-2.5 text-sm border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-cyan-500"
              >
                <option value="all">All Types</option>
                <option value="outgoing">Outgoing</option>
                <option value="incoming">Incoming</option>
              </select>
              <select
                value={filterUrgency}
                onChange={e => setFilterUrgency(e.target.value)}
                className="px-3 py-2.5 text-sm border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-cyan-500"
              >
                <option value="all">All Urgencies</option>
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="stat">STAT</option>
              </select>

              {/* View toggle */}
              <div className="flex items-center bg-[var(--bg-main)] rounded-lg p-1 border border-[var(--border-color)]">
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'table'
                      ? 'bg-[var(--bg-card)] text-cyan-700 shadow-sm'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <List className="w-4 h-4" />
                  Table
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'cards'
                      ? 'bg-[var(--bg-card)] text-cyan-700 shadow-sm'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  Cards
                </button>
              </div>
            </div>

            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden flex items-center justify-center gap-2 px-4 py-2.5 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium"
            >
              <Filter className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-cyan-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Mobile filters expanded */}
          {showFilters && (
            <div className="lg:hidden mt-3 pt-3 border-t border-[var(--border-color)] space-y-2">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)]"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)]"
              >
                <option value="all">All Types</option>
                <option value="outgoing">Outgoing</option>
                <option value="incoming">Incoming</option>
              </select>
              <select
                value={filterUrgency}
                onChange={e => setFilterUrgency(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)]"
              >
                <option value="all">All Urgencies</option>
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="stat">STAT</option>
              </select>
              <div className="flex items-center bg-[var(--bg-main)] rounded-lg p-1 border border-[var(--border-color)]">
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'table' ? 'bg-[var(--bg-card)] text-cyan-700 shadow-sm' : 'text-[var(--text-tertiary)]'
                  }`}
                >
                  <List className="w-4 h-4" /> Table
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'cards' ? 'bg-[var(--bg-card)] text-cyan-700 shadow-sm' : 'text-[var(--text-tertiary)]'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" /> Cards
                </button>
              </div>
            </div>
          )}

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border-color)] flex-wrap">
              <span className="text-xs text-[var(--text-tertiary)] font-medium">Active:</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-50 text-cyan-700 rounded-md text-xs font-medium">
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="hover:text-cyan-900"><X className="w-3 h-3" /></button>
                </span>
              )}
              {filterStatus !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-50 text-cyan-700 rounded-md text-xs font-medium capitalize">
                  Status: {filterStatus}
                  <button onClick={() => setFilterStatus('all')} className="hover:text-cyan-900"><X className="w-3 h-3" /></button>
                </span>
              )}
              {filterType !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-50 text-cyan-700 rounded-md text-xs font-medium capitalize">
                  Type: {filterType}
                  <button onClick={() => setFilterType('all')} className="hover:text-cyan-900"><X className="w-3 h-3" /></button>
                </span>
              )}
              {filterUrgency !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-50 text-cyan-700 rounded-md text-xs font-medium uppercase">
                  Urgency: {filterUrgency}
                  <button onClick={() => setFilterUrgency('all')} className="hover:text-cyan-900"><X className="w-3 h-3" /></button>
                </span>
              )}
              <span className="ml-auto text-xs text-[var(--text-tertiary)]">
                {displayedReferrals.length} of {referrals.length}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── REFERRALS DISPLAY ───────────────────────────────────────────────── */}
      {displayedReferrals.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-[var(--bg-main)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-[var(--text-tertiary)] opacity-40" />
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">No referrals found</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1 max-w-xs mx-auto">
            {activeFilterCount > 0
              ? 'Try adjusting your filters or search query'
              : 'Create your first referral to get started'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* ═══════ TABLE VIEW ═══════ */
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr>
                  {['Ref No.', 'Patient', 'Type', 'To / From', 'Urgency', 'Status', 'Date', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {displayedReferrals.map(ref => (
                  <tr key={ref.id} className="hover:bg-cyan-50/30 transition-colors group">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-[var(--text-primary)] bg-[var(--bg-main)] px-2 py-1 rounded">
                        {ref.referralNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-100 to-cyan-50 border border-cyan-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-cyan-700">
                            {initials(`${ref.patient?.surname} ${ref.patient?.otherNames}`)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-[var(--text-primary)] truncate">
                            {ref.patient?.surname} {ref.patient?.otherNames}
                          </p>
                          <p className="text-[10px] text-[var(--text-tertiary)] font-mono">{ref.patient?.folderNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><TypeBadge type={ref.referralType} /></td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                        {ref.referralType === 'outgoing' ? ref.referredToFacility : ref.referredFromFacility}
                      </p>
                      {(ref.referredToDoctor || ref.referredFromDoctor) && (
                        <p className="text-[10px] text-[var(--text-tertiary)] truncate flex items-center gap-1">
                          <Stethoscope className="w-2.5 h-2.5" />
                          Dr. {ref.referralType === 'outgoing' ? ref.referredToDoctor : ref.referredFromDoctor}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3"><UrgencyBadge urgency={ref.urgency} /></td>
                    <td className="px-4 py-3"><StatusBadge status={ref.status} /></td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                      {new Date(ref.referralDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5">
                        {ref.referralType === 'outgoing' && (
                          <button
                            onClick={() => handlePrintLetter(ref)}
                            disabled={printingId === ref.id}
                            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-cyan-600 hover:bg-cyan-50 transition-all disabled:opacity-40"
                            title="Print referral letter"
                          >
                            <Printer className={`w-3.5 h-3.5 ${printingId === ref.id ? 'animate-pulse' : ''}`} />
                          </button>
                        )}
                        <button
                          onClick={() => { setSendReferral(ref); setShowSendModal(true); }}
                          className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-green-600 hover:bg-green-50 transition-all"
                          title="Send referral"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                        {ref.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(ref.id, 'accepted')}
                              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--icon-green-text)] hover:bg-[var(--icon-green-bg)] transition-all"
                              title="Accept"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(ref.id, 'cancelled')}
                              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] transition-all"
                              title="Cancel"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {ref.status === 'accepted' && (
                          <button
                            onClick={() => handleStatusUpdate(ref.id, 'completed')}
                            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--icon-blue-text)] hover:bg-[var(--icon-blue-bg)] transition-all"
                            title="Complete"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ═══════ CARDS VIEW ═══════ */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayedReferrals.map(ref => (
            <div
              key={ref.id}
              className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] hover:border-cyan-400 hover:shadow-lg transition-all overflow-hidden group flex flex-col"
            >
              {/* Header */}
              <div className="p-4 pb-3 border-b border-[var(--border-color)] bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <TypeBadge type={ref.referralType} size="md" />
                  <UrgencyBadge urgency={ref.urgency} size="md" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-100 to-cyan-50 border border-cyan-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-cyan-700">
                      {initials(`${ref.patient?.surname} ${ref.patient?.otherNames}`)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                      {ref.patient?.surname} {ref.patient?.otherNames}
                    </p>
                    <p className="text-[10px] text-[var(--text-tertiary)] font-mono">
                      {ref.patient?.folderNumber}
                    </p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 space-y-3 flex-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-tertiary)] flex items-center gap-1">
                    <Hash className="w-3 h-3" /> Ref No.
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-[var(--text-primary)]">
                    {ref.referralNumber}
                  </span>
                </div>

                <div>
                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold mb-1">
                    {ref.referralType === 'outgoing' ? 'Referred To' : 'Referred From'}
                  </p>
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0" />
                    {ref.referralType === 'outgoing' ? ref.referredToFacility : ref.referredFromFacility}
                  </p>
                  {(ref.referredToDoctor || ref.referredFromDoctor) && (
                    <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5 flex items-center gap-1.5">
                      <Stethoscope className="w-3 h-3 text-[var(--text-tertiary)]" />
                      Dr. {ref.referralType === 'outgoing' ? ref.referredToDoctor : ref.referredFromDoctor}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold mb-1">
                    Reason
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                    {ref.referralReason}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)] pt-2">
                  <Calendar className="w-3 h-3" />
                  {new Date(ref.referralDate).toLocaleDateString()}
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 bg-[var(--bg-main)] border-t border-[var(--border-color)] flex items-center justify-between gap-2">
                <StatusBadge status={ref.status} />
                <div className="flex items-center gap-0.5">
                  {ref.referralType === 'outgoing' && (
                    <button
                      onClick={() => handlePrintLetter(ref)}
                      disabled={printingId === ref.id}
                      className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-cyan-600 hover:bg-cyan-50 transition-all disabled:opacity-40"
                      title="Print referral letter"
                    >
                      <Printer className={`w-3.5 h-3.5 ${printingId === ref.id ? 'animate-pulse' : ''}`} />
                    </button>
                  )}
                  <button
                    onClick={() => { setSendReferral(ref); setShowSendModal(true); }}
                    className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-green-600 hover:bg-green-50 transition-all"
                    title="Send referral"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                  {ref.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(ref.id, 'accepted')}
                        className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--icon-green-text)] hover:bg-[var(--icon-green-bg)] transition-all"
                        title="Accept"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(ref.id, 'cancelled')}
                        className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] transition-all"
                        title="Cancel"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  {ref.status === 'accepted' && (
                    <button
                      onClick={() => handleStatusUpdate(ref.id, 'completed')}
                      className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--icon-blue-text)] hover:bg-[var(--icon-blue-bg)] transition-all"
                      title="Complete"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CREATE REFERRAL MODAL ────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowModal(false); resetForm(); }} />
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
            <div className="relative bg-[var(--bg-card)] rounded-2xl w-full max-w-3xl max-h-[94vh] flex flex-col overflow-hidden border border-[var(--border-color)] shadow-2xl">

              {/* Header */}
              <div className="relative bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 px-6 py-5 text-white flex-shrink-0">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 via-teal-400 to-transparent" />
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center flex-shrink-0">
                      <Send className="w-6 h-6 text-cyan-300" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold truncate text-white">Create New Referral</h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Fill in referral details for {referralType === 'outgoing' ? 'external' : 'internal'} transfer
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowModal(false); resetForm(); }}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 text-slate-300 hover:text-white"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Referral type toggle in header */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReferralType('outgoing')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      referralType === 'outgoing'
                        ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/30'
                        : 'bg-white/[0.06] border border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Outgoing
                  </button>
                  <button
                    type="button"
                    onClick={() => setReferralType('incoming')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      referralType === 'incoming'
                        ? 'bg-green-500 text-white shadow-sm shadow-green-500/30'
                        : 'bg-white/[0.06] border border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    Incoming
                  </button>
                </div>

                {/* Preview strip */}
                <div className="mt-3 flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2">
                  <Hash className="w-3.5 h-3.5 text-cyan-300 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Preview Reference Number</p>
                    <p className="text-sm font-mono font-bold text-white truncate">{previewRefNo}</p>
                  </div>
                  <UrgencyBadge urgency={formData.urgency} />
                </div>
              </div>

              {/* Body */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5" style={{ scrollbarWidth: 'thin' }}>

                {/* Patient selector section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-4 h-4 text-cyan-600" />
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Patient Information</h3>
                  </div>
                  <div className="bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)]">
                    <PatientAttendanceSelector
                      patients={patients}
                      attendances={attendances}
                      selectedPatientId={selectedPatientId}
                      selectedAttendanceId={selectedAttendanceId}
                      onPatientSelect={setSelectedPatientId}
                      onAttendanceSelect={setSelectedAttendanceId}
                      onClearSelection={() => { setSelectedPatientId(''); setSelectedAttendanceId(''); }}
                      autoSelectMostRecent={true}
                    />
                  </div>
                </div>

                {/* Current visit info */}
                {selectedPatientId && selectedAttendance && (
                  <div className="px-4 py-3 bg-cyan-50 border border-cyan-100 rounded-lg">
                    <p className="text-xs font-semibold text-cyan-700 mb-2 flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5" /> Current Visit
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div>
                        <span className="text-[var(--text-tertiary)] block">Visit #</span>
                        <b className="text-[var(--text-primary)]">{selectedAttendance.attendanceNumber}</b>
                      </div>
                      <div>
                        <span className="text-[var(--text-tertiary)] block">Date</span>
                        <b className="text-[var(--text-primary)]">{new Date(selectedAttendance.dateTime).toLocaleDateString()}</b>
                      </div>
                      <div>
                        <span className="text-[var(--text-tertiary)] block">Type</span>
                        <b className="text-[var(--text-primary)] capitalize">{selectedAttendance.attendanceType}</b>
                      </div>
                      <div>
                        <span className="text-[var(--text-tertiary)] block">Status</span>
                        <b className="text-[var(--text-primary)] capitalize">{selectedAttendance.status}</b>
                      </div>
                    </div>
                  </div>
                )}

                {/* Transfer details */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Building className="w-4 h-4 text-cyan-600" />
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      {referralType === 'outgoing' ? 'Refer To' : 'Referred From'}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {referralType === 'outgoing' ? (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                            Facility <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                            <input
                              type="text"
                              required
                              value={formData.referredToFacility}
                              onChange={e => setFormData(p => ({ ...p, referredToFacility: e.target.value }))}
                              placeholder="e.g., Korle Bu Teaching Hospital"
                              className="w-full pl-10 pr-4 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">Doctor</label>
                            <div className="relative">
                              <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                              <input
                                type="text"
                                value={formData.referredToDoctor}
                                onChange={e => setFormData(p => ({ ...p, referredToDoctor: e.target.value }))}
                                placeholder="Doctor's name"
                                className="w-full pl-10 pr-4 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-cyan-500 transition-all"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">Department</label>
                            <div className="relative">
                              <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                              <input
                                type="text"
                                value={formData.referredToDepartment}
                                onChange={e => setFormData(p => ({ ...p, referredToDepartment: e.target.value }))}
                                placeholder="e.g., Cardiology"
                                className="w-full pl-10 pr-4 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-cyan-500 transition-all"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                            Facility <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                            <input
                              type="text"
                              required
                              value={formData.referredFromFacility}
                              onChange={e => setFormData(p => ({ ...p, referredFromFacility: e.target.value }))}
                              placeholder="e.g., Ridge Hospital"
                              className="w-full pl-10 pr-4 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-cyan-500 transition-all"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">Referring Doctor</label>
                          <div className="relative">
                            <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                            <input
                              type="text"
                              value={formData.referredFromDoctor}
                              onChange={e => setFormData(p => ({ ...p, referredFromDoctor: e.target.value }))}
                              placeholder="Doctor's name"
                              className="w-full pl-10 pr-4 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-cyan-500 transition-all"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Clinical details */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ClipboardList className="w-4 h-4 text-cyan-600" />
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Clinical Information</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                        Reason for Referral <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={formData.referralReason}
                        onChange={e => setFormData(p => ({ ...p, referralReason: e.target.value }))}
                        placeholder="Describe the clinical reason for referral…"
                        className="w-full px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] resize-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                        Additional Notes
                      </label>
                      <textarea
                        rows={2}
                        value={formData.referralNotes}
                        onChange={e => setFormData(p => ({ ...p, referralNotes: e.target.value }))}
                        placeholder="Any additional information for the receiving facility…"
                        className="w-full px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] resize-none focus:ring-2 focus:ring-cyan-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Urgency picker */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-cyan-600" />
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Urgency</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { value: 'routine', label: 'Routine', description: 'Standard timeframe', color: 'slate' },
                      { value: 'urgent', label: 'Urgent', description: 'Within 24 hours', color: 'orange' },
                      { value: 'stat', label: 'STAT', description: 'Immediate attention', color: 'red' },
                    ].map(opt => {
                      const isActive = formData.urgency === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, urgency: opt.value as any }))}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${
                            isActive
                              ? opt.color === 'red'
                                ? 'bg-red-50 border-red-400 shadow-sm'
                                : opt.color === 'orange'
                                  ? 'bg-orange-50 border-orange-400 shadow-sm'
                                  : 'bg-slate-50 border-slate-400 shadow-sm'
                              : 'border-[var(--border-color)] bg-[var(--bg-main)] hover:border-cyan-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={`text-sm font-bold ${
                              isActive
                                ? opt.color === 'red' ? 'text-red-700' : opt.color === 'orange' ? 'text-orange-700' : 'text-slate-700'
                                : 'text-[var(--text-primary)]'
                            }`}>
                              {opt.label}
                            </span>
                            {isActive && <BadgeCheck className={`w-3.5 h-3.5 ${
                              opt.color === 'red' ? 'text-red-600' : opt.color === 'orange' ? 'text-orange-600' : 'text-slate-600'
                            }`} />}
                          </div>
                          <p className="text-[10px] text-[var(--text-secondary)]">{opt.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Structured form toggle + fields */}
                <div className="border-t border-[var(--border-color)] pt-4">
                  <label className="flex items-center gap-2.5 p-3 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)] cursor-pointer hover:border-cyan-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={useStructuredForm}
                      onChange={e => setUseStructuredForm(e.target.checked)}
                      className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 w-4 h-4"
                    />
                    <FileText className="w-3.5 h-3.5 text-cyan-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-[var(--text-primary)] flex-1">
                      Use structured referral form
                    </span>
                    <span className="text-[10px] font-semibold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-100">
                      {referralType === 'outgoing' ? 'Part I' : 'Part II'}
                    </span>
                  </label>
                </div>

                {useStructuredForm && referralType === 'outgoing' && (
                  <div className="space-y-3 bg-cyan-50/40 p-4 rounded-xl border border-cyan-100">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-cyan-700" />
                      <h4 className="text-sm font-bold text-cyan-800">
                        Part I — Outgoing Referral Form
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input placeholder="Client name" value={structuredPartI.clientName} onChange={e => setStructuredPartI(s => ({ ...s, clientName: e.target.value }))} className="p-2.5 text-sm border border-[var(--border-color)] bg-[var(--bg-card)] rounded-lg focus:ring-2 focus:ring-cyan-500" />
                      <input placeholder="Age" value={structuredPartI.age} onChange={e => setStructuredPartI(s => ({ ...s, age: e.target.value }))} className="p-2.5 text-sm border border-[var(--border-color)] bg-[var(--bg-card)] rounded-lg focus:ring-2 focus:ring-cyan-500" />
                      <input placeholder="Sex" value={structuredPartI.sex} onChange={e => setStructuredPartI(s => ({ ...s, sex: e.target.value }))} className="p-2.5 text-sm border border-[var(--border-color)] bg-[var(--bg-card)] rounded-lg focus:ring-2 focus:ring-cyan-500" />
                      <input placeholder="Parity" value={structuredPartI.parity} onChange={e => setStructuredPartI(s => ({ ...s, parity: e.target.value }))} className="p-2.5 text-sm border border-[var(--border-color)] bg-[var(--bg-card)] rounded-lg focus:ring-2 focus:ring-cyan-500" />
                      <input placeholder="Clinic name" value={structuredPartI.clinicName} onChange={e => setStructuredPartI(s => ({ ...s, clinicName: e.target.value }))} className="p-2.5 text-sm border border-[var(--border-color)] bg-[var(--bg-card)] rounded-lg focus:ring-2 focus:ring-cyan-500 sm:col-span-2" />
                      <textarea placeholder="General condition (vital signs)" value={structuredPartI.generalCondition} onChange={e => setStructuredPartI(s => ({ ...s, generalCondition: e.target.value }))} rows={2} className="p-2.5 text-sm border border-[var(--border-color)] bg-[var(--bg-card)] rounded-lg focus:ring-2 focus:ring-cyan-500 sm:col-span-2 resize-none" />
                      <textarea placeholder="Patient complaints" value={structuredPartI.patientComplaints} onChange={e => setStructuredPartI(s => ({ ...s, patientComplaints: e.target.value }))} rows={2} className="p-2.5 text-sm border border-[var(--border-color)] bg-[var(--bg-card)] rounded-lg focus:ring-2 focus:ring-cyan-500 sm:col-span-2 resize-none" />
                      <textarea placeholder="Diagnosis" value={structuredPartI.diagnosis} onChange={e => setStructuredPartI(s => ({ ...s, diagnosis: e.target.value }))} rows={2} className="p-2.5 text-sm border border-[var(--border-color)] bg-[var(--bg-card)] rounded-lg focus:ring-2 focus:ring-cyan-500 sm:col-span-2 resize-none" />
                      <textarea placeholder="Actions taken" value={structuredPartI.actionsTaken} onChange={e => setStructuredPartI(s => ({ ...s, actionsTaken: e.target.value }))} rows={2} className="p-2.5 text-sm border border-[var(--border-color)] bg-[var(--bg-card)] rounded-lg focus:ring-2 focus:ring-cyan-500 sm:col-span-2 resize-none" />
                      <textarea placeholder="Reason for referral" value={structuredPartI.reasonForReferral} onChange={e => setStructuredPartI(s => ({ ...s, reasonForReferral: e.target.value }))} rows={2} className="p-2.5 text-sm border border-[var(--border-color)] bg-[var(--bg-card)] rounded-lg focus:ring-2 focus:ring-cyan-500 sm:col-span-2 resize-none" />
                      <input type="date" placeholder="Date of referral" value={structuredPartI.dateOfReferral} onChange={e => setStructuredPartI(s => ({ ...s, dateOfReferral: e.target.value }))} className="p-2.5 text-sm border border-[var(--border-color)] bg-[var(--bg-card)] rounded-lg focus:ring-2 focus:ring-cyan-500" />
                      <input placeholder="Referrer name" value={structuredPartI.referrerName} onChange={e => setStructuredPartI(s => ({ ...s, referrerName: e.target.value }))} className="p-2.5 text-sm border border-[var(--border-color)] bg-[var(--bg-card)] rounded-lg focus:ring-2 focus:ring-cyan-500" />
                      <input placeholder="Referrer title" value={structuredPartI.referrerTitle} onChange={e => setStructuredPartI(s => ({ ...s, referrerTitle: e.target.value }))} className="p-2.5 text-sm border border-[var(--border-color)] bg-[var(--bg-card)] rounded-lg focus:ring-2 focus:ring-cyan-500 sm:col-span-2" />
                    </div>
                  </div>
                )}

                {useStructuredForm && referralType === 'incoming' && (
                  <div className="space-y-3 bg-green-50/40 p-4 rounded-xl border border-green-100">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-green-700" />
                      <h4 className="text-sm font-bold text-green-800">
                        Part II — Incoming Referral Form
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input placeholder="Institution name" value={structuredPartII.institutionName} onChange={e => setStructuredPartII(s => ({ ...s, institutionName: e.target.value }))} className="p-2.5 text-sm border border-[var(--border-color)] bg-[var(--bg-card)] rounded-lg focus:ring-2 focus:ring-green-500" />
                      <input type="date" placeholder="Date received" value={structuredPartII.dateReceived} onChange={e => setStructuredPartII(s => ({ ...s, dateReceived: e.target.value }))} className="p-2.5 text-sm border border-[var(--border-color)] bg-[var(--bg-card)] rounded-lg focus:ring-2 focus:ring-green-500" />
                      <textarea placeholder="Findings" value={structuredPartII.findings} onChange={e => setStructuredPartII(s => ({ ...s, findings: e.target.value }))} rows={2} className="p-2.5 text-sm border border-[var(--border-color)] bg-[var(--bg-card)] rounded-lg focus:ring-2 focus:ring-green-500 sm:col-span-2 resize-none" />
                      <textarea placeholder="Actions taken" value={structuredPartII.actionsTaken} onChange={e => setStructuredPartII(s => ({ ...s, actionsTaken: e.target.value }))} rows={2} className="p-2.5 text-sm border border-[var(--border-color)] bg-[var(--bg-card)] rounded-lg focus:ring-2 focus:ring-green-500 sm:col-span-2 resize-none" />
                      <textarea placeholder="Recommendations for follow-up" value={structuredPartII.recommendations} onChange={e => setStructuredPartII(s => ({ ...s, recommendations: e.target.value }))} rows={2} className="p-2.5 text-sm border border-[var(--border-color)] bg-[var(--bg-card)] rounded-lg focus:ring-2 focus:ring-green-500 sm:col-span-2 resize-none" />
                      <input placeholder="Receiver name" value={structuredPartII.receiverName} onChange={e => setStructuredPartII(s => ({ ...s, receiverName: e.target.value }))} className="p-2.5 text-sm border border-[var(--border-color)] bg-[var(--bg-card)] rounded-lg focus:ring-2 focus:ring-green-500" />
                      <input placeholder="Receiver title" value={structuredPartII.receiverTitle} onChange={e => setStructuredPartII(s => ({ ...s, receiverTitle: e.target.value }))} className="p-2.5 text-sm border border-[var(--border-color)] bg-[var(--bg-card)] rounded-lg focus:ring-2 focus:ring-green-500" />
                    </div>
                  </div>
                )}
              </form>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit as any}
                  disabled={isLoading || !selectedPatientId}
                  className={`flex items-center gap-2 px-5 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold shadow-sm transition-all ${
                    referralType === 'outgoing'
                      ? 'bg-cyan-600 hover:bg-cyan-700 shadow-cyan-500/20'
                      : 'bg-green-600 hover:bg-green-700 shadow-green-500/20'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating…
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Create {referralType === 'outgoing' ? 'Outgoing' : 'Incoming'} Referral
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}