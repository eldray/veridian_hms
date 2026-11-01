// src/pages/AdmissionDetails.tsx — Redesigned: top action bar, Antenatal-style sections
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdmissionStore } from '../store/admissionStore';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useWardStore } from '../store/wardStore';
import {
  ArrowLeft, User, Calendar, Activity, FileText, Loader2,
  AlertCircle, Phone, Stethoscope, Clock, MapPin,
  CheckCircle, UserCircle, ClipboardList, Pill, FlaskConical, Scissors,
  Eye, Hospital, Moon, Sun, Building2, LogOut, RefreshCw,
  Hash, ChevronRight, TrendingUp, Baby, Heart,
  ShieldCheck, BedDouble, CalendarClock, CircleDot, BarChart3,
  AlertTriangle, FileSignature, Stethoscope as Steth,
} from 'lucide-react';

export default function AdmissionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    currentAdmission, getAdmission, dischargePatient,
    admissions, getAdmissions, isLoading: admissionLoading,
  } = useAdmissionStore();
  const { patients, currentPatient, fetchPatient } = usePatientStore();
  const { getAttendance, currentAttendance, attendances } = useAttendanceStore();
  const { getAvailableBeds } = useWardStore();
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<any>(null);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [dischargeStatus, setDischargeStatus] = useState('home');
  const [dischargeSummary, setDischargeSummary] = useState('');
  const [isDischarging, setIsDischarging] = useState(false);
  const [foundAdmission, setFoundAdmission] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      if (id) {
        setLoading(true);
        try {
          let admission: any =
            admissions.find(a => a.id === id) || admissions.find(a => a.attendanceId === id) || null;
          if (!admission) admission = await getAdmission(id);

          if (admission) {
            setFoundAdmission(admission);
            if (admission.attendanceId) {
              const att = await getAttendance(admission.attendanceId).catch(() => null);
              setAttendance(att || attendances.find(a => a.id === admission.attendanceId) || null);
            }
          } else {
            const att = await getAttendance(id).catch(() => null);
            if (att) {
              setAttendance(att);
              let adm = admissions.find(a => a.attendanceId === att.id);
              if (!adm) {
                await getAdmissions({ status: 'active', limit: 500 }).catch(() => undefined);
                adm = useAdmissionStore.getState().admissions.find(a => a.attendanceId === att.id);
              }
              if (adm) setFoundAdmission(adm);
            }
          }
          await getAvailableBeds();
        } catch (err) {
          console.error('Error loading admission:', err);
        } finally {
          setLoading(false);
        }
      }
    };
    loadData();
  }, [id, getAdmission, getAdmissions, admissions.length]);

  const getPatient = () => {
    if (foundAdmission?.patient) return foundAdmission.patient;
    if (attendance?.Patient) return attendance.Patient;
    const patientId = foundAdmission?.patientId || foundAdmission?.attendance?.patientId || attendance?.patientId;
    if (!patientId) return null;
    return patients.find(p => p.id === patientId || p._id === patientId)
      || (currentPatient?.id === patientId ? currentPatient : undefined);
  };
  const patient = getPatient();

  const linkedPatientId = String(
    foundAdmission?.patientId || foundAdmission?.attendance?.patientId || attendance?.patientId || ''
  );
  useEffect(() => {
    if (!linkedPatientId) return;
    if (foundAdmission?.patient || attendance?.Patient) return;
    if (currentPatient?.id === linkedPatientId) return;
    if (patients.some(p => p.id === linkedPatientId)) return;
    void fetchPatient(linkedPatientId).catch(() => undefined);
  }, [linkedPatientId, foundAdmission, attendance, currentPatient?.id, patients, fetchPatient]);

  const getPrimaryDiagnosis = () => {
    if (!attendance?.AttendanceDiagnosis) return null;
    return attendance.AttendanceDiagnosis.find((d: any) => d.diagnosisType === 'primary')?.Diagnosis || null;
  };
  const primaryDiagnosis = getPrimaryDiagnosis();
  const admission = foundAdmission || currentAdmission;

  const getAdmissionTypeDisplay = () => {
    const admissionType = admission?.admissionType || attendance?.admissionType;
    const encounterCategory = attendance?.encounterCategory;
    if (encounterCategory === 'daycase') return { label: 'Day Surgery', icon: <Sun className="w-4 h-4" /> };
    if (admissionType === 'detention_observation') return { label: 'Detention / Observation', icon: <Moon className="w-4 h-4" /> };
    if (admissionType === 'antenatal_observation') return { label: 'Antenatal Observation', icon: <Baby className="w-4 h-4" /> };
    if (admissionType === 'delivery') return { label: 'Delivery Admission', icon: <Heart className="w-4 h-4" /> };
    if (admissionType === 'postpartum_observation') return { label: 'Postpartum Observation', icon: <Baby className="w-4 h-4" /> };
    return { label: 'Formal IPD Admission', icon: <Hospital className="w-4 h-4" /> };
  };
  const admissionTypeDisplay = getAdmissionTypeDisplay();

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch { return 'Invalid Date'; }
  };
  const formatDateOnly = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return 'Invalid Date'; }
  };

  const getTypeBadge = () => {
    const encounterCategory = attendance?.encounterCategory;
    const admissionType = admission?.admissionType || attendance?.admissionType;
    const base = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border';
    if (encounterCategory === 'daycase') {
      return <span className={`${base} bg-purple-100 text-purple-700 border-purple-200`}><Sun className="w-3 h-3" />DAY SURGERY</span>;
    }
    if (admissionType === 'detention_observation') {
      return <span className={`${base} bg-orange-100 text-orange-700 border-orange-200`}><Moon className="w-3 h-3" />OBSERVATION</span>;
    }
    if (admissionType === 'antenatal_observation') {
      return <span className={`${base} bg-pink-100 text-pink-700 border-pink-200`}><Baby className="w-3 h-3" />ANTENATAL OBS</span>;
    }
    if (admissionType === 'delivery') {
      return <span className={`${base} bg-green-100 text-green-700 border-green-200`}><Heart className="w-3 h-3" />IN LABOR</span>;
    }
    if (admissionType === 'postpartum_observation') {
      return <span className={`${base} bg-cyan-100 text-cyan-700 border-cyan-200`}><Baby className="w-3 h-3" />POSTPARTUM OBS</span>;
    }
    return <span className={`${base} bg-green-100 text-green-700 border-green-200`}><Hospital className="w-3 h-3" />IPD ADMISSION</span>;
  };

  const getStatusBadge = () => {
    if (admission?.status === 'cancelled') {
      return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200"><AlertCircle className="w-3 h-3" />CANCELLED</span>;
    }
    const isDischarged = Boolean(admission?.dischargeDate) || attendance?.status === 'discharged';
    if (isDischarged) {
      return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200"><CheckCircle className="w-3 h-3" />DISCHARGED</span>;
    }
    return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200"><CircleDot className="w-3 h-3 animate-pulse" />ACTIVE</span>;
  };

  const getLengthOfStay = () => {
    const start = new Date(admission?.admissionDate || admission?.createdAt || attendance?.dateTime);
    const end = admission?.dischargeDate ? new Date(admission.dischargeDate) : new Date();
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleDischarge = async () => {
    const attendanceId = attendance?.id || admission?.attendanceId;
    if (!attendanceId) return;
    setIsDischarging(true);
    try {
      await dischargePatient(attendanceId, {
        dischargeDate: new Date().toISOString(),
        dischargeStatus: dischargeStatus as any,
        dischargeSummary: dischargeSummary,
      });
      if (admission?.id) await getAdmission(admission.id);
      setShowDischargeModal(false);
      setDischargeSummary('');
      setDischargeStatus('home');
      navigate('/dashboard/admissions');
    } catch (err: any) {
      alert(err.message || 'Failed to discharge patient');
    } finally {
      setIsDischarging(false);
    }
  };

  const isLoading = loading || admissionLoading;

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-teal-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">Loading admission details…</p>
        </div>
      </div>
    );
  }

  if (!admission && !attendance) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-[var(--bg-card)] rounded-2xl p-8 text-center max-w-md border border-[var(--border-color)] shadow-sm">
          <div className="w-14 h-14 rounded-full bg-red-50 mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Admission Not Found</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-5">The admission record could not be located.</p>
          <button
            onClick={() => navigate('/dashboard/admissions')}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-semibold transition-all"
          >
            Back to Admissions
          </button>
        </div>
      </div>
    );
  }

  const lengthOfStay = getLengthOfStay();
  const isActive = admission?.status !== 'cancelled' && !admission?.dischargeDate && attendance?.status !== 'discharged' && attendance?.status !== 'completed';
  const isDetention = admission?.admissionType === 'detention_observation';
  const isDaySurgery = attendance?.encounterCategory === 'daycase';
  const patientName = patient ? (patient.name || patient.fullName || `${patient.surname || ''} ${patient.otherNames || ''}`.trim()) : 'Unknown Patient';
  const initials = patientName.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
  const attendanceId = attendance?.id || admission?.attendanceId;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* ── PAGE HEADER ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/admissions')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)]
              text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all text-xs font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="h-5 w-px bg-[var(--border-color)]" />
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-sm shadow-teal-500/20">
              <ClipboardList className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[var(--text-primary)] leading-tight">Admission Details</h1>
              <p className="text-[10px] text-[var(--text-tertiary)] leading-tight">
                {admissionTypeDisplay.label} · #{admission?.admissionNumber || attendance?.attendanceNumber || 'N/A'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {getTypeBadge()}
          {getStatusBadge()}
        </div>
      </div>

      {/* ── ACTION BAR (moved to the top) ────────────────────────── */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] px-3 py-2 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => navigate(`/dashboard/medical-entries/${attendanceId}`)}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-700 transition-colors shadow-sm shadow-teal-500/20"
        >
          <Stethoscope className="w-3.5 h-3.5" />
          Clinical entries
        </button>
        <button
          onClick={() => navigate(`/dashboard/nursing/patient/${attendanceId}`)}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-teal-500 hover:bg-[var(--bg-main)] transition-colors"
        >
          <ClipboardList className="w-3.5 h-3.5" />
          Nursing care
        </button>
        <button
          onClick={() => navigate(`/dashboard/vitals/${attendanceId}`)}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-teal-500 hover:bg-[var(--bg-main)] transition-colors"
        >
          <Activity className="w-3.5 h-3.5" />
          Observations
        </button>
        <button
          onClick={() => navigate(`/dashboard/billing?attendanceId=${attendanceId}`)}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-teal-500 hover:bg-[var(--bg-main)] transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          Billing
        </button>
        <button
          onClick={() => navigate('/dashboard/wards')}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-indigo-500 hover:bg-[var(--bg-main)] transition-colors"
        >
          <Building2 className="w-3.5 h-3.5" />
          Ward management
        </button>
        <div className="flex-1" />
        {isActive && (
          <button
            onClick={() => setShowDischargeModal(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3.5 py-2 text-xs font-semibold text-green-700 hover:bg-green-600 hover:text-white transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Discharge
          </button>
        )}
      </div>

      {/* ── PATIENT BANNER ─────────────────────────────────────── */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-100 to-teal-50 border border-teal-200 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-teal-700">{initials || <User className="w-5 h-5" />}</span>
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-[var(--text-primary)] truncate">{patientName}</p>
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mt-0.5 flex-wrap">
                <span className="inline-flex items-center gap-1 font-mono bg-[var(--bg-main)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">
                  <Hash className="w-2.5 h-2.5 text-[var(--text-tertiary)]" />
                  {patient?.folderNumber || '—'}
                </span>
                <span className="capitalize">{patient?.gender || '—'}</span>
                <span className="opacity-40">·</span>
                <span>
                  {patient?.dateOfBirth
                    ? `${Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 3600000))} yrs`
                    : '—'}
                </span>
                {patient?.contact && (
                  <>
                    <span className="opacity-40">·</span>
                    <span className="inline-flex items-center gap-1"><Phone className="w-2.5 h-2.5" />{patient.contact}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] bg-[var(--bg-main)] px-2 py-1 rounded-full border border-[var(--border-color)] text-[var(--text-secondary)] flex items-center gap-1">
              <CalendarClock className="w-2.5 h-2.5" />
              Admitted {formatDateOnly(admission?.admissionDate || attendance?.dateTime)}
            </span>
            {lengthOfStay > 0 && (
              <span className="text-[10px] font-bold bg-teal-50 text-teal-700 px-2 py-1 rounded-full border border-teal-200 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {lengthOfStay} day{lengthOfStay !== 1 ? 's' : ''}
              </span>
            )}
            <span className="text-[10px] bg-[var(--bg-main)] px-2 py-1 rounded-full border border-[var(--border-color)] text-[var(--text-secondary)] flex items-center gap-1">
              <Building2 className="w-2.5 h-2.5" />
              {attendance?.Ward?.wardName || '—'} · {attendance?.Bed?.bedNumber || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* ── ALERT: Detention over 48h ───────────────────────────── */}
      {isDetention && isActive && lengthOfStay >= 2 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-orange-800">Observation Period Alert</p>
            <p className="text-xs text-orange-700 mt-1 leading-relaxed">
              Patient has been in observation for <strong>{lengthOfStay}</strong> day(s). Maximum observation period is 72 hours. Consider converting to formal IPD or discharging.
            </p>
          </div>
          <button
            onClick={() => navigate(`/dashboard/medical-entries/${attendanceId}`)}
            className="px-3 py-1.5 text-xs font-semibold bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all inline-flex items-center gap-1 flex-shrink-0"
          >
            Review <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ── BODY GRID ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Main column ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Admission Information */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-600" />
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Admission Information</h2>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Admission Date</p>
                <p className="text-sm text-[var(--text-primary)] mt-1 flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                  {formatDate(admission?.admissionDate || attendance?.dateTime)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Admission Type</p>
                <div className="flex items-center gap-2 mt-1 text-sm text-[var(--text-primary)]">
                  {admissionTypeDisplay.icon}
                  <span>{admissionTypeDisplay.label}</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Admitting Doctor</p>
                <p className="text-sm text-[var(--text-primary)] mt-1 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                  {attendance?.createdBy?.fullName || attendance?.User_Attendance_createdByIdToUser?.fullName || '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Payment Mode</p>
                <p className="text-sm text-[var(--text-primary)] mt-1 uppercase flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                  {attendance?.paymentMode?.replace(/_/g, ' ') || '—'}
                </p>
              </div>
              {admission?.dischargeDate && (
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Discharge Date</p>
                  <p className="text-sm text-[var(--text-primary)] mt-1">{formatDate(admission.dischargeDate)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-600" />
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Location</h2>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-[var(--bg-main)] rounded-lg">
                <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-teal-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Ward</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {attendance?.Ward?.wardName || attendance?.ward?.wardName || '—'}
                  </p>
                  {attendance?.Ward?.wardType && (
                    <p className="text-[10px] text-[var(--text-tertiary)] capitalize">{attendance.Ward.wardType}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[var(--bg-main)] rounded-lg">
                <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <BedDouble className="w-4 h-4 text-teal-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Bed</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)] font-mono">
                    {attendance?.Bed?.bedNumber || attendance?.bed?.bedNumber || '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Clinical Snapshot (Inpatient Care Workspace) */}
          {attendance && admission?.status !== 'cancelled' && (
            <div className="rounded-xl border border-teal-200 dark:border-teal-900/60 bg-gradient-to-br from-teal-50/80 to-cyan-50/60 dark:from-teal-950/20 dark:to-cyan-950/10 overflow-hidden">
              <div className="px-5 py-3 border-b border-teal-200/80 dark:border-teal-900/60 flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-700 dark:text-teal-300" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold text-[var(--text-primary)]">Inpatient Clinical Snapshot</h2>
                  <p className="text-[11px] text-[var(--text-secondary)]">Notes stay in Medical Entries; nursing and observations in their modules.</p>
                </div>
                <span className="hidden sm:inline-flex items-center rounded-full border border-teal-200 dark:border-teal-900 px-2 py-1 text-[10px] font-semibold text-teal-800 dark:text-teal-200">
                  {isActive ? 'IN CARE' : 'RECORD VIEW'}
                </span>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]/80 p-3">
                  <p className="text-[10px] uppercase tracking-wide font-bold text-[var(--text-tertiary)] mb-1">Presenting complaint</p>
                  <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{attendance?.complaints || 'Not documented yet'}</p>
                </div>
                <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]/80 p-3">
                  <p className="text-[10px] uppercase tracking-wide font-bold text-[var(--text-tertiary)] mb-1">Primary diagnosis</p>
                  <p className="text-sm text-[var(--text-primary)]">{primaryDiagnosis?.name || primaryDiagnosis?.description || primaryDiagnosis?.code || 'Not recorded yet'}</p>
                </div>
                <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]/80 p-3 sm:col-span-2">
                  <p className="text-[10px] uppercase tracking-wide font-bold text-[var(--text-tertiary)] mb-1">Assessment and treatment plan</p>
                  <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{attendance?.assessment || attendance?.treatmentPlan || 'Open Medical Entries to document the assessment and inpatient plan.'}</p>
                </div>
                {attendance?.medicalNotes && (
                  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]/80 p-3 sm:col-span-2">
                    <p className="text-[10px] uppercase tracking-wide font-bold text-[var(--text-tertiary)] mb-1">Encounter notes / admission context</p>
                    <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap break-words">{attendance.medicalNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Additional Diagnoses */}
          {attendance?.AttendanceDiagnosis &&
            attendance.AttendanceDiagnosis.filter((d: any) => d.diagnosisType !== 'primary').length > 0 && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-teal-600" />
                <h2 className="text-sm font-bold text-[var(--text-primary)]">Additional Diagnoses</h2>
              </div>
              <div className="divide-y divide-[var(--border-color)]">
                {attendance.AttendanceDiagnosis
                  .filter((d: any) => d.diagnosisType !== 'primary')
                  .map((diag: any, idx: number) => (
                    <div key={idx} className="p-4">
                      <p className="text-sm text-[var(--text-primary)]">{diag.Diagnosis?.name}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {diag.Diagnosis?.icdCode && (
                          <span className="text-[10px] font-mono bg-[var(--bg-main)] px-1.5 py-0.5 rounded border border-[var(--border-color)] text-[var(--text-secondary)]">
                            ICD-10: {diag.Diagnosis.icdCode}
                          </span>
                        )}
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-100">
                          {diag.diagnosisType}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Discharge Summary */}
          {admission?.dischargeSummary && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-teal-600" />
                <h2 className="text-sm font-bold text-[var(--text-primary)]">Discharge Summary</h2>
              </div>
              <div className="p-5">
                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                  {admission.dischargeSummary}
                </p>
              </div>
            </div>
          )}

          {/* Daily Notes */}
          {admission?.dailyNotes && Array.isArray(admission.dailyNotes) && admission.dailyNotes.length > 0 && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <h2 className="text-sm font-bold text-[var(--text-primary)]">Daily Notes</h2>
                <span className="ml-auto text-[10px] font-semibold bg-[var(--bg-card)] border border-[var(--border-color)] px-2 py-0.5 rounded-full text-[var(--text-secondary)]">
                  {admission.dailyNotes.length}
                </span>
              </div>
              <div className="divide-y divide-[var(--border-color)]">
                                {admission.dailyNotes.map((note: any, idx: number) => (
                  <div key={idx} className="p-4">
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <span className="text-xs font-semibold text-teal-600">
                        {note.createdBy || note.author || 'Unknown'}
                      </span>
                      <span className="text-[10px] text-[var(--text-tertiary)]">
                        {new Date(note.createdAt || note.date).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                      {note.notes || note.text || note.content}
                    </p>
                    {note.noteType && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)] mt-2 inline-block">
                        Type: {note.noteType}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar column ── */}
        <div className="space-y-4">

          {/* Quick Stats */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-600" />
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Quick Stats</h2>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-[var(--border-color)]">
                <span className="text-xs text-[var(--text-secondary)]">Status</span>
                <span className={`text-xs font-semibold uppercase tracking-wide ${isActive ? 'text-green-600' : 'text-gray-500'}`}>
                  {isActive ? 'Active' : 'Discharged'}
                </span>
              </div>
              {isDetention && (
                <div className="flex justify-between items-center py-2 border-b border-[var(--border-color)]">
                  <span className="text-xs text-[var(--text-secondary)]">Observation</span>
                  <span className="text-xs font-medium text-orange-600">
                    {lengthOfStay} / 72h max
                  </span>
                </div>
              )}
              {isDaySurgery && (
                <div className="flex justify-between items-center py-2 border-b border-[var(--border-color)]">
                  <span className="text-xs text-[var(--text-secondary)]">Day Surgery</span>
                  <span className="text-xs font-medium text-purple-600">Same-day DC</span>
                </div>
              )}
              {lengthOfStay > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-[var(--border-color)]">
                  <span className="text-xs text-[var(--text-secondary)]">Length of Stay</span>
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    {lengthOfStay} day{lengthOfStay !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 border-b border-[var(--border-color)]">
                <span className="text-xs text-[var(--text-secondary)]">Admission #</span>
                <span className="text-[10px] font-mono bg-[var(--bg-main)] px-2 py-0.5 rounded border border-[var(--border-color)] text-[var(--text-secondary)]">
                  {admission?.admissionNumber || attendance?.attendanceNumber || '—'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-xs text-[var(--text-secondary)]">Attendance #</span>
                <span className="text-[10px] font-mono bg-[var(--bg-main)] px-2 py-0.5 rounded border border-[var(--border-color)] text-[var(--text-secondary)]">
                  {attendance?.attendanceNumber || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Clinical Summary + Current Location — compact, merged */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Clinical Summary</h2>
            </div>

            {attendance && (
              <div className="p-4 grid grid-cols-4 gap-1.5">
                {[
                  { count: attendance.AttendanceDiagnosis?.length || 0, label: 'Dx', Icon: Stethoscope, color: 'text-teal-600', bg: 'bg-teal-50' },
                  { count: attendance.Medication?.length || 0, label: 'Rx', Icon: Pill, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { count: attendance.LabTest?.length || 0, label: 'Labs', Icon: FlaskConical, color: 'text-purple-600', bg: 'bg-purple-50' },
                  { count: attendance.Procedure?.length || 0, label: 'Proc', Icon: Scissors, color: 'text-orange-600', bg: 'bg-orange-50' },
                ].map(s => {
                  const Icon = s.Icon;
                  return (
                    <div key={s.label} className="text-center py-2 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]">
                      <div className={`w-6 h-6 rounded ${s.bg} flex items-center justify-center mx-auto mb-1`}>
                        <Icon className={`w-3 h-3 ${s.color}`} />
                      </div>
                      <div className="text-sm font-bold text-[var(--text-primary)] leading-none">{s.count}</div>
                      <div className="text-[9px] text-[var(--text-tertiary)] font-medium mt-0.5 uppercase tracking-wide">{s.label}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Current Location — folded into the same card */}
            <div className="border-t border-[var(--border-color)] px-4 py-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Building2 className="w-3 h-3 text-teal-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Current Location</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="rounded-md bg-[var(--bg-main)] border border-[var(--border-color)] px-2 py-1.5">
                  <p className="text-[9px] uppercase tracking-wide font-semibold text-[var(--text-tertiary)]">Ward</p>
                  <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {attendance?.Ward?.wardName || '—'}
                  </p>
                </div>
                <div className="rounded-md bg-[var(--bg-main)] border border-[var(--border-color)] px-2 py-1.5">
                  <p className="text-[9px] uppercase tracking-wide font-semibold text-[var(--text-tertiary)]">Bed</p>
                  <p className="text-xs font-mono font-semibold text-[var(--text-primary)]">
                    {attendance?.Bed?.bedNumber || '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Diagnosis (kept — no change) */}
          {primaryDiagnosis && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-teal-600" />
                <h2 className="text-sm font-bold text-[var(--text-primary)]">Primary Diagnosis</h2>
              </div>
              <div className="p-5">
                <p className="text-sm font-medium text-[var(--text-primary)]">{primaryDiagnosis.name}</p>
                {primaryDiagnosis.icdCode && (
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5 inline-flex items-center gap-1 font-mono bg-[var(--bg-main)] px-2 py-0.5 rounded border border-[var(--border-color)]">
                    ICD-10: {primaryDiagnosis.icdCode}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── DISCHARGE MODAL ───────────────────────────────────── */}
      {showDischargeModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDischargeModal(false)} />
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
            <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl max-w-md w-full border border-[var(--border-color)] overflow-hidden">

              <div className="relative bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 px-6 py-5 text-white">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-400 via-teal-400 to-transparent" />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-400/30 flex items-center justify-center flex-shrink-0">
                      <LogOut className="w-5 h-5 text-green-300" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-white truncate">Discharge Patient</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{patientName}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowDischargeModal(false)}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 text-slate-300 hover:text-white">
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                    Discharge Status
                  </label>
                  <select
                    value={dischargeStatus}
                    onChange={(e) => setDischargeStatus(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                  >
                    <option value="home">Home (Routine Discharge)</option>
                    <option value="transfer">Transfer to Another Facility</option>
                    <option value="expired">Expired</option>
                    <option value="against_medical_advice">Against Medical Advice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                    Discharge Summary
                  </label>
                  <textarea
                    value={dischargeSummary}
                    onChange={(e) => setDischargeSummary(e.target.value)}
                    rows={4}
                    placeholder="Enter discharge summary, follow-up instructions, medications, etc…"
                    className="w-full px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-green-500 resize-none transition-all"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between gap-3">
                <button
                  onClick={() => setShowDischargeModal(false)}
                  className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDischarge}
                  disabled={isDischarging}
                  className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-semibold shadow-sm shadow-green-500/20 transition-all"
                >
                  {isDischarging ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4" />
                      Confirm Discharge
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