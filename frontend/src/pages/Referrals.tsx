// src/pages/Referrals.tsx
import { useState, useEffect, useRef } from 'react';
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

// ── Badge helpers ─────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    pending:   'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]',
    accepted:  'bg-[var(--icon-blue-bg)]   text-[var(--icon-blue-text)]',
    completed: 'bg-[var(--icon-green-bg)]  text-[var(--icon-green-text)]',
    cancelled: 'bg-[var(--icon-red-bg)]    text-[var(--icon-red-text)]',
  };
  const Icon = status === 'cancelled' ? XCircle : CheckCircle;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[status] || map.pending}`}>
      <Icon className="w-2.5 h-2.5" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const UrgencyBadge: React.FC<{ urgency: string }> = ({ urgency }) => {
  const map: Record<string, string> = {
    routine: 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)]',
    urgent:  'bg-orange-100 text-orange-700 border border-orange-200',
    stat:    'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border border-[var(--icon-red-text)]',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${map[urgency] || map.routine}`}>
      {urgency.toUpperCase()}
    </span>
  );
};

const TypeBadge: React.FC<{ type: 'outgoing' | 'incoming' }> = ({ type }) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
    type === 'outgoing'
      ? 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)]'
      : 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]'
  }`}>
    {type === 'outgoing' ? '↑ Outgoing' : '↓ Incoming'}
  </span>
);

// ═════════════════════════════════════════════════════════════════════════════
// Main page
// ═════════════════════════════════════════════════════════════════════════════

export default function Referrals() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { hospital }  = useHospitalStore();
  const { user }      = useAuthStore();

  const { patients, loadPatients }     = usePatientStore();
  const { attendances, getAttendances } = useAttendanceStore();

  // ── State ──────────────────────────────────────────────────────────────────
  const [referrals,     setReferrals]     = useState<Referral[]>([]);
  const [stats,         setStats]         = useState<any>(null);
  const [isLoading,     setIsLoading]     = useState(false);
  const [refreshing,    setRefreshing]    = useState(false);
  const [showModal,     setShowModal]     = useState(false);
  const [showStats,     setShowStats]     = useState(false);
  const [filterStatus,  setFilterStatus]  = useState('all');
  const [filterType,    setFilterType]    = useState('all');
  const [referralType,  setReferralType]  = useState<'outgoing' | 'incoming'>('outgoing');
  const [printingId,    setPrintingId]    = useState<string | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendReferral,  setSendReferral]  = useState<Referral | null>(null);

  // Patient selector state (used inside create modal)
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

  const hasLoaded = useRef(false);

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
    } catch { /* stats are optional */ }
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

  // ── Print referral letter — matches DispensePatient pattern exactly ────────

  // In Referrals.tsx - Fix the handlePrintLetter function
const handlePrintLetter = async (referral: Referral) => {
  if (!referral?.id) { toastError('Error', 'Referral ID is missing'); return; }
  setPrintingId(referral.id);
  try {
    const patientName = referral.patient
      ? `${referral.patient.surname} ${referral.patient.otherNames}`.trim()
      : 'Unknown Patient';

    // ✅ FIXED: Use 'referral' type (not 'referralLetter')
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
    }, hospital);  // Pass hospital as the third argument

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
  };

  const selectedAttendance = attendances.find(a => a.id === selectedAttendanceId);

  // Filtered view
  const displayedReferrals = referrals; // filtering done server-side

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 p-6">

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card)] transition-colors">
            <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
          <div className="w-9 h-9 bg-[var(--icon-cyan-bg)] rounded-xl flex items-center justify-center">
            <Send className="w-4 h-4 text-[var(--icon-cyan-text)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">Patient Referrals</h1>
            <p className="text-xs text-[var(--text-secondary)]">Manage outgoing and incoming referrals</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { loadData(true); fetchReferrals(); fetchStats(); }}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-card)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={() => setShowStats(s => !s)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-card)] transition-colors"
          >
            <Activity className="w-4 h-4" /> Stats
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--icon-cyan-text)] text-white rounded-lg hover:opacity-90 transition-all text-sm font-semibold"
          >
            <UserPlus className="w-4 h-4" /> New Referral
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total',    value: stats.totalReferrals || 0,                                                    color: 'text-[var(--icon-cyan-text)]',   bg: 'bg-[var(--icon-cyan-bg)]',   icon: <Send className="w-5 h-5 text-[var(--icon-cyan-text)]" /> },
            { label: 'Outgoing', value: stats.byType?.find((t: any) => t.referralType === 'outgoing')?._count || 0,  color: 'text-[var(--icon-blue-text)]',   bg: 'bg-[var(--icon-blue-bg)]',   icon: <ChevronRight className="w-5 h-5 text-[var(--icon-blue-text)]" /> },
            { label: 'Incoming', value: stats.byType?.find((t: any) => t.referralType === 'incoming')?._count || 0,  color: 'text-[var(--icon-green-text)]',  bg: 'bg-[var(--icon-green-bg)]',  icon: <ChevronRight className="w-5 h-5 rotate-180 text-[var(--icon-green-text)]" /> },
            { label: 'Pending',  value: stats.byStatus?.find((s: any) => s.status === 'pending')?._count   || 0,     color: 'text-[var(--icon-yellow-text)]', bg: 'bg-[var(--icon-yellow-bg)]', icon: <Clock className="w-5 h-5 text-[var(--icon-yellow-text)]" /> },
          ].map(s => (
            <div key={s.label} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{s.label}</p>
                </div>
                <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center`}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FILTER BAR ──────────────────────────────────────────────────────── */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--text-secondary)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">Status:</span>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 text-sm border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)]"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">Type:</span>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-3 py-1.5 text-sm border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)]"
          >
            <option value="all">All Types</option>
            <option value="outgoing">Outgoing</option>
            <option value="incoming">Incoming</option>
          </select>
        </div>
        <span className="ml-auto text-xs text-[var(--text-tertiary)]">{displayedReferrals.length} referral{displayedReferrals.length !== 1 ? 's' : ''}</span>
      </div>

      {/* ── REFERRALS TABLE ─────────────────────────────────────────────────── */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr>
                {['Ref No.', 'Patient', 'Type', 'To / From', 'Urgency', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {displayedReferrals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Send className="w-10 h-10 text-[var(--text-tertiary)] opacity-30 mx-auto mb-2" />
                    <p className="text-sm text-[var(--text-secondary)]">No referrals found</p>
                  </td>
                </tr>
              ) : (
                displayedReferrals.map(ref => (
                  <tr key={ref.id} className="hover:bg-[var(--bg-main)] transition-colors">
                    {/* Ref number */}
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[var(--text-primary)]">
                      {ref.referralNumber}
                    </td>

                    {/* Patient */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm text-[var(--text-primary)]">
                        {ref.patient?.surname} {ref.patient?.otherNames}
                      </p>
                      <p className="text-[10px] text-[var(--text-tertiary)]">{ref.patient?.folderNumber}</p>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3">
                      <TypeBadge type={ref.referralType} />
                    </td>

                    {/* To/From */}
                    <td className="px-4 py-3 max-w-[180px]">
                      <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                        {ref.referralType === 'outgoing' ? ref.referredToFacility : ref.referredFromFacility}
                      </p>
                      {(ref.referredToDoctor || ref.referredFromDoctor) && (
                        <p className="text-[10px] text-[var(--text-tertiary)] truncate">
                          Dr. {ref.referralType === 'outgoing' ? ref.referredToDoctor : ref.referredFromDoctor}
                        </p>
                      )}
                    </td>

                    {/* Urgency */}
                    <td className="px-4 py-3">
                      <UrgencyBadge urgency={ref.urgency} />
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={ref.status} />
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                      {new Date(ref.referralDate).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {/* Print — outgoing only, matches DispensePatient print button */}
                        {ref.referralType === 'outgoing' && (
                          <button
                            onClick={() => handlePrintLetter(ref)}
                            disabled={printingId === ref.id}
                            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] transition-all disabled:opacity-40"
                            title="Print referral letter"
                          >
                            <Printer className={`w-3.5 h-3.5 ${printingId === ref.id ? 'animate-pulse' : ''}`} />
                          </button>
                        )}

                        {/* Send via SendDocumentModal */}
                        <button
                          onClick={() => { setSendReferral(ref); setShowSendModal(true); }}
                          className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-green-600 hover:bg-green-50 transition-all"
                          title="Send referral"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>

                        {/* Status transitions */}
                        {ref.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(ref.id, 'accepted')}
                              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--icon-green-text)] hover:bg-[var(--icon-green-bg)] transition-all"
                              title="Accept referral"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(ref.id, 'cancelled')}
                              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] transition-all"
                              title="Cancel referral"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {ref.status === 'accepted' && (
                          <button
                            onClick={() => handleStatusUpdate(ref.id, 'completed')}
                            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--icon-blue-text)] hover:bg-[var(--icon-blue-bg)] transition-all"
                            title="Mark as completed"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CREATE REFERRAL MODAL ────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-[var(--border-color)] shadow-xl">

            {/* Modal header */}
            <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-5 py-4 flex items-center justify-between rounded-t-xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center">
                  <Send className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                </div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Create New Referral</h2>
              </div>
              <button onClick={() => { setShowModal(false); resetForm(); }}
                className="p-1.5 hover:bg-[var(--bg-main)] rounded-lg transition-colors">
                <XCircle className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5">

              {/* Referral type toggle */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setReferralType('outgoing')}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    referralType === 'outgoing'
                      ? 'bg-[var(--icon-blue-text)] text-white shadow-sm'
                      : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-[var(--icon-blue-text)]'
                  }`}
                >
                  ↑ Outgoing — Refer to another facility
                </button>
                <button
                  type="button"
                  onClick={() => setReferralType('incoming')}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    referralType === 'incoming'
                      ? 'bg-[var(--icon-green-text)] text-white shadow-sm'
                      : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-[var(--icon-green-text)]'
                  }`}
                >
                  ↓ Incoming — Referred from another facility
                </button>
              </div>

              {/* Patient + attendance selector */}
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

              {/* Current visit info strip */}
              {selectedPatientId && selectedAttendance && (
                <div className="px-4 py-3 bg-[var(--icon-cyan-bg)] rounded-lg border border-[var(--border-color)]">
                  <p className="text-xs font-semibold text-[var(--icon-cyan-text)] mb-1 flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5" /> Current Visit
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] text-[var(--text-secondary)]">
                    <span>Visit #: <b className="text-[var(--text-primary)]">{selectedAttendance.attendanceNumber}</b></span>
                    <span>Date: <b className="text-[var(--text-primary)]">{new Date(selectedAttendance.dateTime).toLocaleDateString()}</b></span>
                    <span>Type: <b className="text-[var(--text-primary)] capitalize">{selectedAttendance.attendanceType}</b></span>
                    <span>Status: <b className="text-[var(--text-primary)] capitalize">{selectedAttendance.status}</b></span>
                  </div>
                </div>
              )}

              {/* Outgoing fields */}
              {referralType === 'outgoing' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                      Referred To Facility <span className="text-[var(--icon-red-text)]">*</span>
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                      <input
                        type="text" required
                        value={formData.referredToFacility}
                        onChange={e => setFormData(p => ({ ...p, referredToFacility: e.target.value }))}
                        placeholder="e.g., Korle Bu Teaching Hospital"
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                        Referred To Doctor
                      </label>
                      <div className="relative">
                        <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                        <input
                          type="text"
                          value={formData.referredToDoctor}
                          onChange={e => setFormData(p => ({ ...p, referredToDoctor: e.target.value }))}
                          placeholder="Doctor's name"
                          className="w-full pl-10 pr-4 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                        Department
                      </label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                        <input
                          type="text"
                          value={formData.referredToDepartment}
                          onChange={e => setFormData(p => ({ ...p, referredToDepartment: e.target.value }))}
                          placeholder="e.g., Cardiology"
                          className="w-full pl-10 pr-4 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)]"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Incoming fields */}
              {referralType === 'incoming' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                      Referred From Facility <span className="text-[var(--icon-red-text)]">*</span>
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                      <input
                        type="text" required
                        value={formData.referredFromFacility}
                        onChange={e => setFormData(p => ({ ...p, referredFromFacility: e.target.value }))}
                        placeholder="e.g., Ridge Hospital"
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                      Referring Doctor
                    </label>
                    <div className="relative">
                      <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                      <input
                        type="text"
                        value={formData.referredFromDoctor}
                        onChange={e => setFormData(p => ({ ...p, referredFromDoctor: e.target.value }))}
                        placeholder="Doctor's name"
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)]"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Common fields */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Reason for Referral <span className="text-[var(--icon-red-text)]">*</span>
                </label>
                <textarea
                  rows={3} required
                  value={formData.referralReason}
                  onChange={e => setFormData(p => ({ ...p, referralReason: e.target.value }))}
                  placeholder="Describe the clinical reason for referral…"
                  className="w-full px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] resize-none focus:ring-2 focus:ring-[var(--icon-cyan-text)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Additional Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.referralNotes}
                  onChange={e => setFormData(p => ({ ...p, referralNotes: e.target.value }))}
                  placeholder="Any additional information for the receiving facility…"
                  className="w-full px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] resize-none focus:ring-2 focus:ring-[var(--icon-cyan-text)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Urgency
                </label>
                <select
                  value={formData.urgency}
                  onChange={e => setFormData(p => ({ ...p, urgency: e.target.value as any }))}
                  className="w-full px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)]"
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="stat">STAT (Immediate)</option>
                </select>
              </div>

              {/* Footer buttons */}
              <div className="flex gap-3 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2.5 bg-[var(--icon-cyan-text)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 text-sm font-semibold transition-all"
                >
                  {isLoading ? 'Creating…' : `Create ${referralType === 'outgoing' ? 'Outgoing' : 'Incoming'} Referral`}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-5 py-2.5 border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-main)] transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}