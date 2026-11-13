// src/pages/Referrals.tsx — consistent with Patients / Shift / Leave:
// shared PageHeader + SearchInput + FilterSelect + Segmented + Pagination
// from components/ui, no hard-coded Tailwind colours (all var(--*) tokens).
//
// AUTO-FILL — when a patient is picked, their register details automatically
// fill every identity field in the referral form, so nobody re-types them:
//   Part I: name, folder number, age, sex, contact, address, DOB, occupation,
//           marital status, next of kin (only for keys the form actually has)
//   Visit:  visit number / date / type (only for keys the form actually has)
//   Part II: receiving facility + receiver name/title come from the hospital
//            and the signed-in clinician (already done in resetForm/prefill).
// Only keys already present in the part object are written, so this never
// invents fields the form doesn't render. Switching patient re-fills the
// identity keys with the NEW patient (old code only filled empty fields, so
// it kept the previous patient's name). Clinical fields the user typed
// (complaints, findings, diagnosis, reason…) are never overwritten.
// Additional Notes now sits at the BOTTOM of the form, after Part I / Part II.
import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../store/toastStore';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useAuthStore } from '../store/authStore';
import { useHospitalStore } from '../store/hospitalStore';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';
import { generatePDF, openPrintWindow } from '../utils/pdfGenerator';
import { getPatientName } from '../utils/patient';
import SendDocumentModal from '../components/SendDocumentModal';
import ReferralDetailModal from '../components/referral/ReferralDetailModal';
import ReferralReportBackModal from '../components/referral/ReferralReportBackModal';
import { ReferralPartFields } from '../components/referral/ReferralStructuredParts';
import {
  PART_I_SECTIONS,
  PART_II_SECTIONS,
  emptyPartI,
  emptyPartII,
  missingRequired,
  partHasContent,
} from '../components/referral/referralForm';
import type { ReferralPartI, ReferralPartII } from '../components/referral/referralForm';
import {
  getReferrals,
  createOutgoingReferral,
  createIncomingReferral,
  updateReferralStatus,
  getReferralStats,
} from '../api';
import {
  ArrowLeft, Send, Printer, UserPlus, Clock, CheckCircle, XCircle, Activity,
  RefreshCw, Building, Stethoscope, MessageSquare, AlertCircle,
  ArrowUpRight, ArrowDownLeft, LayoutGrid, List,
  X, Calendar, FileText, User, ClipboardList, Target,
  Check, BadgeCheck, Hash, Eye,
} from 'lucide-react';
import {
  Badge, Button, FilterSelect, INPUT, PageHeader,
  Pagination, SearchInput, Segmented, TABLE_SHELL, TD, TH, TH_ROW, TR,
} from '../components/ui';

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
    id: string; surname: string; otherNames: string; folderNumber: string;
    dateOfBirth: string; gender: string; contact: string;
  };
  attendance?: {
    id: string; attendanceNumber: string; dateTime?: string;
    attendanceType?: string; encounterCategory?: string;
  } | null;
  createdBy?: { fullName: string; role: string };
  outcomeNotes?: string;
  structuredForm?: { partI?: Record<string, unknown>; partII?: Record<string, unknown> } | null;
}
type ViewMode = 'table' | 'cards';

// ── Badges — var(--*) tokens only, no hard-coded colours ─────────────────────
const StatusBadge: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({ status, size = 'sm' }) => {
  const map: Record<string, { cls: string; Icon: React.ElementType; label: string }> = {
    pending:   { cls: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]', Icon: Clock,       label: 'Pending' },
    accepted:  { cls: 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)]',     Icon: Check,       label: 'Accepted' },
    completed: { cls: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',   Icon: CheckCircle, label: 'Completed' },
    cancelled: { cls: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]',       Icon: XCircle,     label: 'Cancelled' },
  };
  const cfg = map[status] || map.pending;
  const Icon = cfg.Icon;
  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${cfg.cls} ${size === 'sm' ? 'px-2 py-0.5 text-[10px] gap-1' : 'px-2.5 py-1 text-xs gap-1.5'}`}>
      <Icon className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />{cfg.label}
    </span>
  );
};
const UrgencyBadge: React.FC<{ urgency: string; size?: 'sm' | 'md' }> = ({ urgency, size = 'sm' }) => {
  const map: Record<string, { cls: string; label: string; dot: string }> = {
    routine: { cls: 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)]', label: 'Routine', dot: 'bg-[var(--text-tertiary)]' },
    urgent:  { cls: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] border border-[var(--icon-yellow-text)]/30', label: 'Urgent', dot: 'bg-[var(--icon-yellow-text)]' },
    stat:    { cls: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border border-[var(--icon-red-text)]/30', label: 'STAT', dot: 'bg-[var(--icon-red-text)]' },
  };
  const cfg = map[urgency] || map.routine;
  return (
    <span className={`inline-flex items-center rounded-full font-bold ${cfg.cls} ${size === 'sm' ? 'px-2 py-0.5 text-[10px] gap-1' : 'px-2.5 py-1 text-xs gap-1.5'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${urgency === 'stat' ? 'animate-pulse' : ''}`} />{cfg.label}
    </span>
  );
};
const TypeBadge: React.FC<{ type: 'outgoing' | 'incoming'; size?: 'sm' | 'md' }> = ({ type, size = 'sm' }) => {
  const cls = size === 'sm' ? 'px-2 py-0.5 text-[10px] gap-1' : 'px-2.5 py-1 text-xs gap-1.5';
  const iconCls = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';
  if (type === 'outgoing') return (
    <span className={`inline-flex items-center rounded-full font-semibold bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] ${cls}`}>
      <ArrowUpRight className={iconCls} /> Outgoing
    </span>
  );
  return (
    <span className={`inline-flex items-center rounded-full font-semibold bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] ${cls}`}>
      <ArrowDownLeft className={iconCls} /> Incoming
    </span>
  );
};
const initials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');

// ── Auto-fill helpers ─────────────────────────────────────────────────────────
// Only write a value when the form actually has that key, and never clobber
// a clinical field the user already typed.
const onlyKnownKeys = <T extends Record<string, unknown>>(prev: T, values: Record<string, unknown>): Partial<T> => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (k in prev && v !== undefined && v !== null && v !== '') out[k] = v;
  }
  return out as Partial<T>;
};
const ageFromDob = (dob: any): string => {
  if (!dob) return '';
  const d = new Date(dob);
  if (!Number.isFinite(d.getTime())) return '';
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) years -= 1;
  return years >= 0 && years <= 125 ? `${years} years` : '';
};
const fmtDate = (v: any) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString() : String(v);
};

export default function Referrals() {
  const navigate = useNavigate();
  const location = useLocation();
  const [urlSearchParams] = useSearchParams();
  const searchParams = useMemo(() => {
    const context = (location.state as { referralContext?: Record<string, string> } | null)?.referralContext;
    if (!context) return urlSearchParams;
    const params = new URLSearchParams();
    Object.entries(context).forEach(([key, value]) => { if (typeof value === 'string') params.set(key, value); });
    return params;
  }, [location.state, urlSearchParams]);
  const { success, error: toastError } = useToast();
  const { hospital } = useHospitalStore();
  const { user } = useAuthStore();
  const { patients, loadPatients } = usePatientStore();
  const { attendances, getAttendances, getAttendance } = useAttendanceStore();

  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [referralType, setReferralType] = useState<'outgoing' | 'incoming'>('outgoing');
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendReferral, setSendReferral] = useState<Referral | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('referralsViewMode');
    return (saved as ViewMode) || 'table';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('referralsPageSize');
    return saved ? parseInt(saved, 10) : 20;
  });
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState('');
  const [prefilledAttendance, setPrefilledAttendance] = useState<any>(null);
  const [formData, setFormData] = useState({
    referralReason: '', referralNotes: '',
    referredToFacility: '', referredToDoctor: '', referredToDepartment: '',
    referredFromFacility: '', referredFromDoctor: '',
    urgency: 'routine' as 'routine' | 'urgent' | 'stat',
  });
  const [partI, setPartI] = useState<ReferralPartI>(() => emptyPartI());
  const [partII, setPartII] = useState<ReferralPartII>(() => emptyPartII());
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [detailReferral, setDetailReferral] = useState<Referral | null>(null);
  const [acceptTarget, setAcceptTarget] = useState<Referral | null>(null);
  const [acceptPartII, setAcceptPartII] = useState<Record<string, string>>(() => emptyPartII());
  const [accepting, setAccepting] = useState(false);
  const hasLoaded = useRef(false);
  const lastAutoPatientId = useRef('');
  const lastAutoAttendanceId = useRef('');

  useEffect(() => { localStorage.setItem('referralsViewMode', viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem('referralsPageSize', String(pageSize)); }, [pageSize]);

  const loadData = async (force = false) => {
    if (!force && hasLoaded.current) return;
    try {
      setRefreshing(true);
      await Promise.all([loadPatients(), getAttendances({ live: true, limit: 500 })]);
      hasLoaded.current = true;
    } catch (err: any) { toastError('Load failed', err.message); }
    finally { setRefreshing(false); }
  };
  const fetchReferrals = async () => {
    try {
      const params: any = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterType !== 'all') params.referralType = filterType;
      const response = await getReferrals(params);
      let data: Referral[] = [];
      if (Array.isArray(response)) data = response;
      else if (Array.isArray(response?.data)) data = response.data;
      setReferrals(data.map(r => ({ ...r, id: r.id || (r as any)._id })));
    } catch (err: any) { toastError('Error', err.response?.data?.message || 'Failed to fetch referrals'); }
  };
  const fetchStats = async () => {
    try { const res = await getReferralStats(); setStats(res?.data || res); } catch { /* optional */ }
  };

  const prefillKeyApplied = useRef('');
  useEffect(() => {
    const patientId = searchParams.get('patientId') || '';
    const attendanceId = searchParams.get('attendanceId') || '';
    const source = searchParams.get('source') || 'Clinical assessment';
    if (!patientId) return;
    const prefillKey = searchParams.toString();
    if (prefillKeyApplied.current === prefillKey) return;
    prefillKeyApplied.current = prefillKey;
    setSelectedPatientId(patientId);
    setSelectedAttendanceId(attendanceId);
    setReferralType('outgoing');
    setFormData({
      referralReason: searchParams.get('reason') || '',
      referralNotes: searchParams.get('notes') || '',
      referredToFacility: searchParams.get('facility') || '',
      referredToDoctor: '', referredToDepartment: '',
      referredFromFacility: '', referredFromDoctor: '',
      urgency: (['routine', 'urgent', 'stat'].includes(searchParams.get('urgency') || '')
        ? searchParams.get('urgency') as 'routine' | 'urgent' | 'stat' : 'routine'),
    });
    // Clinical prefill (complaints / diagnosis / treatment) still comes from the
    // navigation context; identity fields are filled by the patient effect below.
    setPartI(emptyPartI({
      clientName: searchParams.get('patientName') || '',
      clinicName: source,
      generalCondition: '',
      patientComplaints: searchParams.get('complaints') || searchParams.get('reason') || '',
      clinicalFindings: '',
      diagnosis: searchParams.get('diagnosis') || '',
      actionsTaken: searchParams.get('treatment') || '',
      reasonForReferral: searchParams.get('reason') || '',
      contactBackName: user?.fullName || '',
    }));
    setPartII(emptyPartII({
      institutionName: hospital?.name || '',
      receiverName: user?.fullName || '',
      receiverTitle: user?.role || '',
    }));
    setFormErrors([]);
    setShowModal(true);
  }, [searchParams, user, hospital]);

  useEffect(() => {
    const requestedAttendanceId = searchParams.get('attendanceId');
    const requestedPatientId = searchParams.get('patientId');
    setPrefilledAttendance(null);
    if (!requestedAttendanceId || !requestedPatientId) {
      if (!requestedAttendanceId) setSelectedAttendanceId('');
      return;
    }
    let cancelled = false;
    getAttendance(requestedAttendanceId).then((visit: any) => {
      if (cancelled) return;
      const linkedPatient = visit?.patientId || visit?.patient?.id || visit?.patient?._id;
      const linkedPatientId = typeof linkedPatient === 'object' ? linkedPatient.id || linkedPatient._id : linkedPatient;
      if (String(linkedPatientId || '') !== requestedPatientId) {
        setSelectedAttendanceId(''); setPrefilledAttendance(null);
        toastError('Visit mismatch', 'The linked visit belongs to a different patient. Select the correct visit before submitting the referral.');
        return;
      }
      setPrefilledAttendance(visit);
    }).catch(() => {
      if (cancelled) return;
      setSelectedAttendanceId(''); setPrefilledAttendance(null);
      toastError('Visit unavailable', 'The linked visit could not be loaded. Select the correct visit before submitting the referral.');
    });
    return () => { cancelled = true; };
  }, [searchParams, getAttendance, toastError]);

  // ── AUTO-FILL: patient → Part I identity fields ────────────────────────────
  // Runs whenever the picked patient changes (including prefill). Identity keys
  // are overwritten with the NEW patient; clinical keys are left alone.
  const selectedPatient: any = useMemo(
    () => patients.find((item: any) => String(item.id || item._id || '') === String(selectedPatientId)) ?? null,
    [patients, selectedPatientId],
  );
  useEffect(() => {
    if (!selectedPatientId || !selectedPatient) { lastAutoPatientId.current = ''; return; }
    if (lastAutoPatientId.current === String(selectedPatientId)) return;
    lastAutoPatientId.current = String(selectedPatientId);
    const p = selectedPatient;
    const dob = p.dateOfBirth || p.dob || p.birthDate || '';
    const age = p.ageDisplay || p.age || ageFromDob(dob);
    const contact = p.contact || p.phone || p.phoneNumber || p.telephone || p.mobile || '';
    const address = p.address || p.residentialAddress || p.homeAddress || '';
    const nok = p.nextOfKin || p.nextOfKinName || p.emergencyContactName || '';
    const nokContact = p.nextOfKinContact || p.nextOfKinPhone || p.emergencyContact || '';
    setPartI(prev => ({
      ...prev,
      ...onlyKnownKeys(prev as unknown as Record<string, unknown>, {
        clientName: getPatientName(p), patientName: getPatientName(p), fullName: getPatientName(p),
        folderNumber: p.folderNumber || p.folderNo || '', folderNo: p.folderNumber || '',
        age: age !== '' && age != null ? `${age} years` : '',
        sex: p.gender || p.sex || '', gender: p.gender || p.sex || '',
        dateOfBirth: fmtDate(dob), dob: fmtDate(dob),
        contact, phone: contact, phoneNumber: contact, telephone: contact,
        address, residentialAddress: address, homeAddress: address,
        occupation: p.occupation || '', maritalStatus: p.maritalStatus || '',
        nextOfKin: nok, nextOfKinName: nok, nextOfKinContact: nokContact,
        contactBackName: user?.fullName || '',
        referrerName: user?.fullName || '',
        referrerTitle: user?.role ? String(user.role).replace(/_/g, ' ') : '',
      }),
    }));
  }, [selectedPatientId, selectedPatient, user]);

  // ── AUTO-FILL: visit → Part I visit fields ─────────────────────────────────
  const selectedAttendance = useMemo(
    () => [...attendances, ...(prefilledAttendance ? [prefilledAttendance] : [])]
      .find((a: any) => String(a.id || a._id) === selectedAttendanceId),
    [attendances, prefilledAttendance, selectedAttendanceId],
  );
  useEffect(() => {
    if (!selectedAttendanceId || !selectedAttendance) { lastAutoAttendanceId.current = ''; return; }
    if (lastAutoAttendanceId.current === String(selectedAttendanceId)) return;
    lastAutoAttendanceId.current = String(selectedAttendanceId);
    const v = selectedAttendance;
    setPartI(prev => ({
      ...prev,
      ...onlyKnownKeys(prev as unknown as Record<string, unknown>, {
        attendanceNumber: v.attendanceNumber || '', visitNumber: v.attendanceNumber || '',
        visitDate: fmtDate(v.dateTime || v.date), dateOfVisit: fmtDate(v.dateTime || v.date),
        attendanceType: v.attendanceType || '', encounterCategory: v.encounterCategory || '',
        clinicName: v.clinicName || v.clinic || '',
      }),
    }));
  }, [selectedAttendanceId, selectedAttendance]);

  // Reset the auto-fill trackers when the form is cleared, so picking the same
  // patient again after a reset still fills.
  const resetForm = () => {
    lastAutoPatientId.current = '';
    lastAutoAttendanceId.current = '';
    setSelectedPatientId('');
    setSelectedAttendanceId('');
    setFormData({
      referralReason: '', referralNotes: '',
      referredToFacility: '', referredToDoctor: '', referredToDepartment: '',
      referredFromFacility: '', referredFromDoctor: '',
      urgency: 'routine',
    });
    setPartI(emptyPartI({
      contactBackName: user?.fullName || '',
      referrerName: user?.fullName || '',
      referrerTitle: user?.role ? String(user.role).replace(/_/g, ' ') : '',
    }));
    setPartII(emptyPartII({
      institutionName: hospital?.name || '',
      receiverName: user?.fullName || '',
      receiverTitle: user?.role ? String(user.role).replace(/_/g, ' ') : '',
    }));
    setFormErrors([]);
  };

  useEffect(() => { if (showModal) void loadData(); }, [showModal]);
  useEffect(() => { fetchReferrals(); fetchStats(); }, [filterStatus, filterType]);
  useEffect(() => { setCurrentPage(1); }, [filterStatus, filterType, filterUrgency, searchQuery, pageSize]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) { toastError('Error', 'Please select a patient'); return; }
    if (referralType === 'outgoing' && searchParams.get('attendanceId') && !selectedAttendanceId) {
      toastError('Visit required', 'Select and verify the visit for this clinical referral before submitting.');
      return;
    }
    if (referralType === 'outgoing' && !formData.referredToFacility) {
      toastError('Error', 'Please enter the facility to refer to'); return;
    }
    if (referralType === 'incoming' && !formData.referredFromFacility) {
      toastError('Error', 'Please enter the facility that referred the patient'); return;
    }
    const sections = referralType === 'outgoing' ? PART_I_SECTIONS : PART_II_SECTIONS;
    const values = referralType === 'outgoing' ? partI : partII;
    const missing = missingRequired(sections, values as unknown as Record<string, string>);
    if (missing.length) {
      setFormErrors(missing);
      toastError('Incomplete form', `Complete ${missing.length} required field${missing.length > 1 ? 's' : ''}`);
      return;
    }
    setFormErrors([]);
    const reason = referralType === 'outgoing' ? partI.reasonForReferral : partII.findings;
    setIsLoading(true);
    try {
      if (referralType === 'outgoing') {
        await createOutgoingReferral({
          patientId: selectedPatientId,
          attendanceId: selectedAttendanceId || undefined,
          referralReason: reason,
          referralNotes: formData.referralNotes,
          urgency: formData.urgency,
          referredToFacility: formData.referredToFacility,
          referredToDoctor: formData.referredToDoctor,
          referredToDepartment: formData.referredToDepartment,
          structuredForm: { partI },
        });
        success('Success', 'Outgoing referral created');
      } else {
        await createIncomingReferral({
          patientId: selectedPatientId,
          referralReason: reason,
          referralNotes: formData.referralNotes,
          urgency: formData.urgency,
          referredFromFacility: formData.referredFromFacility,
          referredFromDoctor: formData.referredFromDoctor,
          structuredForm: { partII },
        });
        success('Success', 'Incoming referral recorded');
      }
      setShowModal(false);
      resetForm();
      setTimeout(() => { fetchReferrals(); fetchStats(); }, 500);
    } catch (err: any) { toastError('Error', err.response?.data?.message || 'Failed to create referral'); }
    finally { setIsLoading(false); }
  };

  const openAcceptDialog = (referral: Referral) => {
    setAcceptTarget(referral);
    setAcceptPartII({
      ...emptyPartII({
        institutionName: hospital?.name || '',
        receiverName: user?.fullName || '',
        receiverTitle: user?.role ? String(user.role).replace(/_/g, ' ') : '',
      }),
      ...(referral.structuredForm?.partII as Record<string, string> | undefined),
    });
  };
  const handleAcceptWithReportBack = async (partIIValues: Record<string, string>) => {
    if (!acceptTarget) return;
    setAccepting(true);
    try {
      await updateReferralStatus(acceptTarget.id, 'accepted', undefined, partIIValues);
      success('Referral accepted', 'Part II report back recorded');
      setAcceptTarget(null);
      fetchReferrals(); fetchStats();
    } catch (err: any) { toastError('Error', err.response?.data?.message || 'Failed to accept referral'); }
    finally { setAccepting(false); }
  };
  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await updateReferralStatus(id, status);
      success('Updated', `Referral marked as ${status}`);
      fetchReferrals(); fetchStats();
    } catch (err: any) { toastError('Error', err.response?.data?.message || 'Failed to update status'); }
  };
  const handlePrintLetter = async (referral: Referral) => {
    if (!referral?.id) { toastError('Error', 'Referral ID is missing'); return; }
    setPrintingId(referral.id);
    try {
      const patientName = referral.patient ? `${referral.patient.surname} ${referral.patient.otherNames}`.trim() : 'Unknown Patient';
      const structuredForm = referral.structuredForm ?? null;
      const hasStructured = partHasContent(structuredForm?.partI) || partHasContent(structuredForm?.partII);
      const html = generatePDF(hasStructured ? 'referralForm' : 'referral', {
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
          structuredForm,
        },
        patient: { ...referral.patient, fullName: patientName },
      }, hospital);
      openPrintWindow(html, `Referral_${referral.referralNumber}`);
      success('Print ready', hasStructured ? 'Referral form opened' : 'Referral letter opened');
    } catch (err) {
      console.error('Print error:', err);
      toastError('Print failed', 'Could not generate referral letter');
    } finally { setPrintingId(null); }
  };

  const displayedReferrals = useMemo(() => {
    let list = referrals;
    if (filterUrgency !== 'all') list = list.filter(r => r.urgency === filterUrgency);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r =>
        r.referralNumber?.toLowerCase().includes(q) ||
        r.patient?.surname?.toLowerCase().includes(q) ||
        r.patient?.otherNames?.toLowerCase().includes(q) ||
        r.patient?.folderNumber?.toLowerCase().includes(q) ||
        r.attendance?.attendanceNumber?.toLowerCase().includes(q) ||
        r.referredToFacility?.toLowerCase().includes(q) ||
        r.referredFromFacility?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [referrals, filterUrgency, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(displayedReferrals.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedReferrals = useMemo(
    () => displayedReferrals.slice(startIndex, startIndex + pageSize),
    [displayedReferrals, startIndex, pageSize],
  );
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  const previewRefNo = useMemo(() => {
    const prefix = referralType === 'outgoing' ? 'REF-OUT' : 'REF-IN';
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    return `${prefix}-${ymd}-XXXX`;
  }, [referralType]);

  const activeFilterCount =
    (filterStatus !== 'all' ? 1 : 0) + (filterType !== 'all' ? 1 : 0) +
    (filterUrgency !== 'all' ? 1 : 0) + (searchQuery ? 1 : 0);

  const rowActions = (ref: Referral) => (
    <div className="flex items-center gap-0.5">
      <Button variant="soft" accent="cyan" size="sm" iconOnly icon={Eye} aria-label="Open referral form" onClick={() => setDetailReferral(ref)} />
      <Button variant="soft" accent="cyan" size="sm" iconOnly icon={Printer} aria-label="Print referral form" disabled={printingId === ref.id} onClick={() => handlePrintLetter(ref)} />
      <Button variant="soft" accent="green" size="sm" iconOnly icon={MessageSquare} aria-label="Send referral" onClick={() => { setSendReferral(ref); setShowSendModal(true); }} />
      {ref.status === 'pending' && (
        <>
          <Button variant="soft" accent="green" size="sm" iconOnly icon={CheckCircle} aria-label="Accept and record the Part II report back" onClick={() => openAcceptDialog(ref)} />
          <Button variant="dangerSoft" size="sm" iconOnly icon={XCircle} aria-label="Cancel" onClick={() => handleStatusUpdate(ref.id, 'cancelled')} />
        </>
      )}
      {ref.status === 'accepted' && (
        <Button variant="soft" accent="cyan" size="sm" iconOnly icon={CheckCircle} aria-label="Complete" onClick={() => handleStatusUpdate(ref.id, 'completed')} />
      )}
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <PageHeader title="Patient Referrals" subtitle="Manage outgoing and incoming referrals"
        icon={Send} accent="cyan"
        meta={<>{referrals.length} referrals loaded</>}
        actions={<>
          <Button icon={ArrowLeft} variant="secondary" onClick={() => navigate(-1)}>Back</Button>
          <Button icon={RefreshCw} loading={refreshing} onClick={() => { loadData(true); fetchReferrals(); fetchStats(); }}>Refresh</Button>
          <Button variant="secondary" icon={Activity} onClick={() => setShowStats(s => !s)}>{showStats ? 'Hide stats' : 'Stats'}</Button>
          <Button variant="soft" accent="cyan" icon={UserPlus} onClick={() => { resetForm(); setShowModal(true); }}>New Referral</Button>
        </>} />

      {sendReferral && (
        <SendDocumentModal
          open={showSendModal}
          onClose={() => { setShowSendModal(false); setSendReferral(null); }}
          patient={sendReferral.patient}
          documentType="referral"
          entityId={sendReferral.id}
        />
      )}
      <ReferralDetailModal
        open={!!detailReferral} referral={detailReferral}
        onClose={() => setDetailReferral(null)}
        onPrint={detailReferral ? () => handlePrintLetter(detailReferral) : undefined}
      />
      <ReferralReportBackModal
        open={!!acceptTarget} referral={acceptTarget} submitting={accepting}
        values={acceptPartII} onValuesChange={setAcceptPartII}
        onClose={() => { if (!accepting) setAcceptTarget(null); }}
        onSubmit={handleAcceptWithReportBack}
      />

      {/* Stats — same shape as Patients */}
      {showStats && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Referrals', value: stats.totalReferrals || 0, Icon: Send, bg: 'bg-[var(--icon-cyan-bg)]', color: 'text-[var(--icon-cyan-text)]' },
            { label: 'Outgoing', value: stats.byType?.find((t: any) => t.referralType === 'outgoing')?._count || 0, Icon: ArrowUpRight, bg: 'bg-[var(--icon-blue-bg)]', color: 'text-[var(--icon-blue-text)]' },
            { label: 'Incoming', value: stats.byType?.find((t: any) => t.referralType === 'incoming')?._count || 0, Icon: ArrowDownLeft, bg: 'bg-[var(--icon-green-bg)]', color: 'text-[var(--icon-green-text)]' },
            { label: 'Pending', value: stats.byStatus?.find((s: any) => s.status === 'pending')?._count || 0, Icon: Clock, bg: 'bg-[var(--icon-yellow-bg)]', color: 'text-[var(--icon-yellow-text)]' },
          ].map(s => (
            <div key={s.label} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] flex items-center justify-between">
              <div><p className="text-xs text-[var(--text-secondary)]">{s.label}</p><p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{s.value}</p></div>
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}><s.Icon className={`w-5 h-5 ${s.color}`} /></div>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar — Patients pattern */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3 sm:p-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <SearchInput className="w-full lg:max-w-sm" value={searchQuery} onChange={setSearchQuery} placeholder="Search by referral #, patient name, folder, or facility…" />
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <FilterSelect aria-label="Status" value={filterStatus} onChange={setFilterStatus}
              options={[{ value: 'all', label: 'All Statuses' }, { value: 'pending', label: 'Pending' }, { value: 'accepted', label: 'Accepted' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }]} />
            <FilterSelect aria-label="Type" value={filterType} onChange={setFilterType}
              options={[{ value: 'all', label: 'All Types' }, { value: 'outgoing', label: 'Outgoing' }, { value: 'incoming', label: 'Incoming' }]} />
            <FilterSelect aria-label="Urgency" value={filterUrgency} onChange={setFilterUrgency}
              options={[{ value: 'all', label: 'All Urgencies' }, { value: 'routine', label: 'Routine' }, { value: 'urgent', label: 'Urgent' }, { value: 'stat', label: 'STAT' }]} />
            <Segmented aria-label="Referral layout" accent="cyan" value={viewMode} onChange={(v) => setViewMode(v as ViewMode)}
              options={[{ value: 'table', label: 'Table', icon: List }, { value: 'cards', label: 'Cards', icon: LayoutGrid }]} />
          </div>
        </div>
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border-color)] flex-wrap">
            <span className="text-xs text-[var(--text-tertiary)] font-medium">Active:</span>
            {searchQuery && <Badge tone="cyan">Search: "{searchQuery}"<button onClick={() => setSearchQuery('')} aria-label="Clear search"><X className="w-3 h-3" /></button></Badge>}
            {filterStatus !== 'all' && <Badge tone="cyan" className="capitalize">Status: {filterStatus}<button onClick={() => setFilterStatus('all')} aria-label="Clear status filter"><X className="w-3 h-3" /></button></Badge>}
            {filterType !== 'all' && <Badge tone="cyan" className="capitalize">Type: {filterType}<button onClick={() => setFilterType('all')} aria-label="Clear type filter"><X className="w-3 h-3" /></button></Badge>}
            {filterUrgency !== 'all' && <Badge tone="cyan" className="uppercase">Urgency: {filterUrgency}<button onClick={() => setFilterUrgency('all')} aria-label="Clear urgency filter"><X className="w-3 h-3" /></button></Badge>}
            <Button variant="secondary" size="sm" onClick={() => { setSearchQuery(''); setFilterStatus('all'); setFilterType('all'); setFilterUrgency('all'); }}>Clear all</Button>
            <span className="ml-auto text-xs text-[var(--text-tertiary)]">{displayedReferrals.length} of {referrals.length}</span>
          </div>
        )}
      </div>

      {/* List */}
      {displayedReferrals.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-12 text-center">
          <div className="w-16 h-16 bg-[var(--bg-main)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-[var(--text-tertiary)] opacity-40" />
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">No referrals found</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1 max-w-xs mx-auto">
            {activeFilterCount > 0 ? 'Try adjusting your filters or search query' : 'Create your first referral to get started'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <>
          <div className={TABLE_SHELL}>
            <table className="w-full text-sm">
              <thead><tr className={TH_ROW}>
                <th className={TH}>Ref No.</th><th className={TH}>Patient</th>
                <th className={TH}>Folder #</th><th className={TH}>Attendance #</th>
                <th className={TH}>Type</th><th className={TH}>To / From</th>
                <th className={TH}>Urgency</th><th className={TH}>Status</th>
                <th className={`${TH} whitespace-nowrap`}>Date</th><th className={TH}>Actions</th>
              </tr></thead>
              <tbody>
                {paginatedReferrals.map(ref => (
                  <tr key={ref.id} className={TR}>
                    <td className={TD}><span className="font-mono text-xs font-semibold text-[var(--text-primary)] bg-[var(--bg-main)] px-2 py-1 rounded">{ref.referralNumber}</span></td>
                    <td className={`${TD} sticky left-0 z-10 bg-[var(--bg-card)]`}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[var(--icon-cyan-bg)] flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-[var(--icon-cyan-text)]">{initials(`${ref.patient?.surname} ${ref.patient?.otherNames}`)}</span>
                        </div>
                        <p className="font-medium text-sm text-[var(--text-primary)] truncate">{ref.patient?.surname} {ref.patient?.otherNames}</p>
                      </div>
                    </td>
                    <td className={`${TD} font-mono text-xs`}>{ref.patient?.folderNumber || '—'}</td>
                    <td className={`${TD} font-mono text-xs`}>{ref.attendance?.attendanceNumber || '—'}</td>
                    <td className={TD}><TypeBadge type={ref.referralType} /></td>
                    <td className={TD}>
                      <p className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[200px]">{ref.referralType === 'outgoing' ? ref.referredToFacility : ref.referredFromFacility}</p>
                      {(ref.referredToDoctor || ref.referredFromDoctor) && (
                        <p className="text-[10px] text-[var(--text-tertiary)] truncate flex items-center gap-1"><Stethoscope className="w-2.5 h-2.5" />Dr. {ref.referralType === 'outgoing' ? ref.referredToDoctor : ref.referredFromDoctor}</p>
                      )}
                    </td>
                    <td className={TD}><UrgencyBadge urgency={ref.urgency} /></td>
                    <td className={TD}><StatusBadge status={ref.status} /></td>
                    <td className={`${TD} whitespace-nowrap text-xs text-[var(--text-secondary)]`}>{new Date(ref.referralDate).toLocaleDateString()}</td>
                    <td className={TD}>{rowActions(ref)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={safePage} totalPages={totalPages} itemsPerPage={pageSize} totalItems={displayedReferrals.length} noun="referrals" onChange={setCurrentPage} />
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginatedReferrals.map(ref => (
              <div key={ref.id} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] hover:border-[var(--icon-cyan-text)]/40 hover:shadow-lg transition-all overflow-hidden flex flex-col">
                <div className="p-4 pb-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
                  <div className="flex items-start justify-between gap-3 mb-3"><TypeBadge type={ref.referralType} size="md" /><UrgencyBadge urgency={ref.urgency} size="md" /></div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--icon-cyan-bg)] flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-[var(--icon-cyan-text)]">{initials(`${ref.patient?.surname} ${ref.patient?.otherNames}`)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[var(--text-primary)] truncate">{ref.patient?.surname} {ref.patient?.otherNames}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)] font-mono">{ref.patient?.folderNumber}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-3 flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-tertiary)] flex items-center gap-1"><Hash className="w-3 h-3" /> Ref No.</span>
                    <span className="font-mono text-[11px] font-semibold text-[var(--text-primary)]">{ref.referralNumber}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-tertiary)] flex items-center gap-1"><Hash className="w-3 h-3" /> Attendance #</span>
                    <span className="font-mono text-[11px] font-semibold text-[var(--text-primary)]">{ref.attendance?.attendanceNumber || '—'}</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold mb-1">{ref.referralType === 'outgoing' ? 'Referred To' : 'Referred From'}</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate flex items-center gap-1.5"><Building className="w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0" />{ref.referralType === 'outgoing' ? ref.referredToFacility : ref.referredFromFacility}</p>
                    {(ref.referredToDoctor || ref.referredFromDoctor) && (
                      <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5 flex items-center gap-1.5"><Stethoscope className="w-3 h-3 text-[var(--text-tertiary)]" />Dr. {ref.referralType === 'outgoing' ? ref.referredToDoctor : ref.referredFromDoctor}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold mb-1">Reason</p>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{ref.referralReason}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)] pt-2"><Calendar className="w-3 h-3" />{new Date(ref.referralDate).toLocaleDateString()}</div>
                </div>
                <div className="px-4 py-3 bg-[var(--bg-main)] border-t border-[var(--border-color)] flex items-center justify-between gap-2">
                  <StatusBadge status={ref.status} />
                  {rowActions(ref)}
                </div>
              </div>
            ))}
          </div>
          <Pagination page={safePage} totalPages={totalPages} itemsPerPage={pageSize} totalItems={displayedReferrals.length} noun="referrals" onChange={setCurrentPage} />
        </>
      )}

      {/* ── CREATE REFERRAL MODAL ─────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowModal(false); resetForm(); }} />
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
            <div className="relative bg-[var(--bg-card)] rounded-2xl w-full max-w-3xl max-h-[94vh] flex flex-col overflow-hidden border border-[var(--border-color)] shadow-2xl">
              {/* Header — bg-main, not the old slate gradient */}
              <div className="px-6 py-5 bg-[var(--bg-main)] border-b border-[var(--border-color)] flex-shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-[var(--icon-cyan-bg)] flex items-center justify-center flex-shrink-0">
                      <Send className="w-6 h-6 text-[var(--icon-cyan-text)]" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold truncate text-[var(--text-primary)]">Create New Referral</h2>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">Fill in referral details for {referralType === 'outgoing' ? 'external' : 'internal'} transfer</p>
                    </div>
                  </div>
                  <button onClick={() => { setShowModal(false); resetForm(); }} className="p-1.5 hover:bg-[var(--bg-card)] rounded-lg transition-colors flex-shrink-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close"><X className="w-5 h-5" /></button>
                </div>
                <Segmented aria-label="Referral type" accent="cyan" value={referralType} onChange={(v) => setReferralType(v as 'outgoing' | 'incoming')}
                  options={[{ value: 'outgoing', label: 'Outgoing', icon: ArrowUpRight }, { value: 'incoming', label: 'Incoming', icon: ArrowDownLeft }]} />
                <div className="mt-3 flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2">
                  <Hash className="w-3.5 h-3.5 text-[var(--icon-cyan-text)] flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold">Preview Reference Number</p>
                    <p className="text-sm font-mono font-bold text-[var(--text-primary)] truncate">{previewRefNo}</p>
                  </div>
                  <UrgencyBadge urgency={formData.urgency} />
                </div>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5" style={{ scrollbarWidth: 'thin' }}>
                {/* 1 — Patient: pick once, everything below auto-fills */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Patient Information</h3>
                    {selectedPatient && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]">Details auto-filled from register</span>}
                  </div>
                  <div className="bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)]">
                    <PatientAttendanceSelector
                      patients={patients}
                      attendances={prefilledAttendance && !attendances.some((item: any) => String(item.id || item._id) === String(prefilledAttendance.id || prefilledAttendance._id))
                        ? [...attendances, prefilledAttendance] : attendances}
                      selectedPatientId={selectedPatientId}
                      selectedAttendanceId={selectedAttendanceId}
                      onPatientSelect={setSelectedPatientId}
                      onAttendanceSelect={setSelectedAttendanceId}
                      onClearSelection={() => { setSelectedPatientId(''); setSelectedAttendanceId(''); }}
                      autoSelectMostRecent={!searchParams.get('attendanceId')}
                    />
                  </div>
                  {/* Auto-filled patient summary — read-only, so the desk can verify
                      at a glance instead of re-typing name / folder / age / sex. */}
                  {selectedPatient && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-3">
                      <div><span className="text-[var(--text-tertiary)] block">Patient</span><b className="text-[var(--text-primary)]">{getPatientName(selectedPatient)}</b></div>
                      <div><span className="text-[var(--text-tertiary)] block">Folder #</span><b className="text-[var(--text-primary)]">{selectedPatient.folderNumber || '—'}</b></div>
                      <div><span className="text-[var(--text-tertiary)] block">Age / Sex</span><b className="text-[var(--text-primary)]">{(selectedPatient.ageDisplay || selectedPatient.age || ageFromDob(selectedPatient.dateOfBirth || selectedPatient.dob)) || '—'} · {selectedPatient.gender || selectedPatient.sex || '—'}</b></div>
                      <div><span className="text-[var(--text-tertiary)] block">Contact</span><b className="text-[var(--text-primary)]">{selectedPatient.contact || selectedPatient.phone || selectedPatient.phoneNumber || '—'}</b></div>
                    </div>
                  )}
                </div>

                {/* Current visit info */}
                {selectedPatientId && selectedAttendance && (
                  <div className="px-4 py-3 bg-[var(--icon-cyan-bg)]/50 border border-[var(--border-color)] rounded-lg">
                    <p className="text-xs font-semibold text-[var(--icon-cyan-text)] mb-2 flex items-center gap-1.5"><Stethoscope className="w-3.5 h-3.5" /> Current Visit</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div><span className="text-[var(--text-tertiary)] block">Visit #</span><b className="text-[var(--text-primary)]">{selectedAttendance.attendanceNumber}</b></div>
                      <div><span className="text-[var(--text-tertiary)] block">Date</span><b className="text-[var(--text-primary)]">{new Date(selectedAttendance.dateTime).toLocaleDateString()}</b></div>
                      <div><span className="text-[var(--text-tertiary)] block">Type</span><b className="text-[var(--text-primary)] capitalize">{selectedAttendance.attendanceType}</b></div>
                      <div><span className="text-[var(--text-tertiary)] block">Status</span><b className="text-[var(--text-primary)] capitalize">{selectedAttendance.status}</b></div>
                    </div>
                  </div>
                )}

                {/* 2 — Transfer details */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Building className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">{referralType === 'outgoing' ? 'Refer To' : 'Referred From'}</h3>
                  </div>
                  <div className="space-y-3">
                    {referralType === 'outgoing' ? (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">Facility <span className="text-[var(--icon-red-text)]">*</span></label>
                          <div className="relative">
                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                            <input type="text" required value={formData.referredToFacility}
                              onChange={e => setFormData(p => ({ ...p, referredToFacility: e.target.value }))}
                              placeholder="e.g., Korle Bu Teaching Hospital" className={`${INPUT} pl-10`} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">Doctor</label>
                            <div className="relative">
                              <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                              <input type="text" value={formData.referredToDoctor}
                                onChange={e => setFormData(p => ({ ...p, referredToDoctor: e.target.value }))}
                                placeholder="Doctor's name" className={`${INPUT} pl-10`} />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">Department</label>
                            <div className="relative">
                              <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                              <input type="text" value={formData.referredToDepartment}
                                onChange={e => setFormData(p => ({ ...p, referredToDepartment: e.target.value }))}
                                placeholder="e.g., Cardiology" className={`${INPUT} pl-10`} />
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">Facility <span className="text-[var(--icon-red-text)]">*</span></label>
                          <div className="relative">
                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                            <input type="text" required value={formData.referredFromFacility}
                              onChange={e => setFormData(p => ({ ...p, referredFromFacility: e.target.value }))}
                              placeholder="e.g., Ridge Hospital" className={`${INPUT} pl-10`} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">Referring Doctor</label>
                          <div className="relative">
                            <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                            <input type="text" value={formData.referredFromDoctor}
                              onChange={e => setFormData(p => ({ ...p, referredFromDoctor: e.target.value }))}
                              placeholder="Doctor's name" className={`${INPUT} pl-10`} />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* 3 — Urgency */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Urgency</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { value: 'routine', label: 'Routine', description: 'Standard timeframe', tone: 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]' },
                      { value: 'urgent', label: 'Urgent', description: 'Within 24 hours', tone: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] border-[var(--icon-yellow-text)]/40' },
                      { value: 'stat', label: 'STAT', description: 'Immediate attention', tone: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border-[var(--icon-red-text)]/40' },
                    ].map(opt => {
                      const isActive = formData.urgency === opt.value;
                      return (
                        <button key={opt.value} type="button"
                          onClick={() => setFormData(p => ({ ...p, urgency: opt.value as any }))}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${isActive ? opt.tone + ' shadow-sm' : 'border-[var(--border-color)] bg-[var(--bg-main)] hover:border-[var(--icon-cyan-text)]/40'}`}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={`text-sm font-bold ${isActive ? '' : 'text-[var(--text-primary)]'}`}>{opt.label}</span>
                            {isActive && <BadgeCheck className="w-3.5 h-3.5" />}
                          </div>
                          <p className="text-[10px] text-[var(--text-secondary)]">{opt.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4 — The referral document: Part I when sending, Part II when receiving.
                       Identity fields inside it are already auto-filled above. */}
                <div className="border-t border-[var(--border-color)] pt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">
                        {referralType === 'outgoing' ? 'Part I — Referral by the health worker' : 'Part II — Report back by the receiving facility'}
                      </h3>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${referralType === 'outgoing' ? 'text-[var(--icon-blue-text)] bg-[var(--icon-blue-bg)] border-[var(--border-color)]' : 'text-[var(--icon-green-text)] bg-[var(--icon-green-bg)] border-[var(--border-color)]'}`}>
                      {referralType === 'outgoing' ? 'Travels with the patient' : 'Filed against the referral'}
                    </span>
                  </div>
                  {referralType === 'outgoing' ? (
                    <ReferralPartFields sections={PART_I_SECTIONS} values={partI as unknown as Record<string, string>}
                      onChange={(key, value) => setPartI(prev => ({ ...prev, [key]: value }))} tone="cyan" />
                  ) : (
                    <ReferralPartFields sections={PART_II_SECTIONS} values={partII as unknown as Record<string, string>}
                      onChange={(key, value) => setPartII(prev => ({ ...prev, [key]: value }))} tone="green" />
                  )}
                  {formErrors.length > 0 && (
                    <div className="rounded-lg border border-[var(--icon-red-text)]/30 bg-[var(--icon-red-bg)] px-3 py-2.5">
                      <p className="text-xs font-semibold text-[var(--icon-red-text)]">Complete these before submitting</p>
                      <ul className="text-xs text-[var(--icon-red-text)] mt-1 list-disc list-inside space-y-0.5">
                        {formErrors.map(label => <li key={label}>{label}</li>)}
                      </ul>
                    </div>
                  )}
                </div>

                {/* 5 — Additional Notes: LAST, so the form reads top-to-bottom
                       (patient → destination → urgency → referral document → notes). */}
                <div className="border-t border-[var(--border-color)] pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Additional Notes</h3>
                  </div>
                  <textarea rows={2} value={formData.referralNotes}
                    onChange={e => setFormData(p => ({ ...p, referralNotes: e.target.value }))}
                    placeholder="Anything the receiving facility should know that does not fit the form…"
                    className={`${INPUT} resize-none`} />
                </div>
              </form>

              <div className="px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between gap-3 flex-shrink-0">
                <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</Button>
                <Button variant="soft" accent={referralType === 'outgoing' ? 'cyan' : 'green'} icon={Send} loading={isLoading}
                  disabled={isLoading || !selectedPatientId} onClick={handleSubmit as any}>
                  {isLoading ? 'Creating…' : `Create ${referralType === 'outgoing' ? 'Outgoing' : 'Incoming'} Referral`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
