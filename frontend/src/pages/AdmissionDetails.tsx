// src/pages/AdmissionDetails.tsx — Enhanced UI/UX
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdmissionStore } from '../store/admissionStore';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useWardStore } from '../store/wardStore';
import {
  ArrowLeft, User, Calendar, Bed, Activity, FileText, Loader2,
  AlertCircle, Phone, IdCard, Stethoscope, Clock, MapPin,
  UserCircle, ClipboardList, Pill, FlaskConical, Scissors,
  Scan, Eye, Hospital, Moon, Sun, Building2, LogOut, RefreshCw,
  Hash, Info, ChevronRight, TrendingUp, Baby, Heart,
  ShieldCheck, Stethoscope as Steth, BedDouble, CalendarClock,
  CircleDot, BarChart3, AlertTriangle, FileSignature,
} from 'lucide-react';

export default function AdmissionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    currentAdmission, getAdmission, updateAdmission, dischargePatient,
    admissions, getAdmissions, isLoading: admissionLoading, error: admissionError,
  } = useAdmissionStore();
  const { patients, loadPatients } = usePatientStore();
  const { getAttendance, currentAttendance, updateAttendance, attendances, getAttendances } = useAttendanceStore();
  const { getAvailableBeds, wards } = useWardStore();
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
          if (admissions.length === 0) await getAdmissions();
          let admission = admissions.find(a => a.id === id);
          if (!admission) {
            admission = admissions.find(a => a.attendanceId === id);
          }
          if (!admission) {
            try { await getAdmission(id); admission = currentAdmission; } catch {}
          }
          if (admission) {
            setFoundAdmission(admission);
            await loadPatients();
            if (admission.attendanceId) {
              let att = await getAttendance(admission.attendanceId);
              if (!att) att = attendances.find(a => a.id === admission.attendanceId);
              setAttendance(att);
            }
          } else {
            const att = await getAttendance(id);
            if (att) {
              setAttendance(att);
              const adm = admissions.find(a => a.attendanceId === att.id);
              if (adm) setFoundAdmission(adm);
              await loadPatients();
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
    return patients.find(p => p.id === patientId || p._id === patientId);
  };
  const patient = getPatient();

  const getPrimaryDiagnosis = () => {
    if (!attendance?.AttendanceDiagnosis) return null;
    return attendance.AttendanceDiagnosis.find((d: any) => d.diagnosisType === 'primary')?.Diagnosis || null;
  };
  const primaryDiagnosis = getPrimaryDiagnosis();
  const admission = foundAdmission || currentAdmission;

  const getAdmissionTypeDisplay = () => {
    const admissionType = admission?.admissionType || attendance?.admissionType;
    const encounterCategory = attendance?.encounterCategory;
    if (encounterCategory === 'daycase') return { label: 'Day Surgery', icon: <Sun className="w-4 h-4" />, color: 'purple' };
    if (admissionType === 'detention_observation') return { label: 'Detention / Observation', icon: <Moon className="w-4 h-4" />, color: 'orange' };
    if (admissionType === 'antenatal_observation') return { label: 'Antenatal Observation', icon: <Baby className="w-4 h-4" />, color: 'pink' };
    if (admissionType === 'delivery') return { label: 'Delivery Admission', icon: <Heart className="w-4 h-4" />, color: 'green' };
    if (admissionType === 'postpartum_observation') return { label: 'Postpartum Observation', icon: <Baby className="w-4 h-4" />, color: 'cyan' };
    return { label: 'Formal IPD Admission', icon: <Hospital className="w-4 h-4" />, color: 'green' };
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
    const isDischarged = admission?.dischargeDate !== null || attendance?.status === 'discharged';
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
      await getAdmissions();
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
          <p className="text-sm text-[var(--text-secondary)] mb-5">
            The admission record could not be located.
          </p>
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
  const isActive = !admission?.dischargeDate && attendance?.status !== 'discharged';
  const isDetention = admission?.admissionType === 'detention_observation';
  const isDaySurgery = attendance?.encounterCategory === 'daycase';
  const patientName = patient ? (patient.name || patient.fullName || `${patient.surname || ''} ${patient.otherNames || ''}`.trim()) : 'Unknown Patient';
  const initials = patientName.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/admissions')}
            className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-sm shadow-teal-500/20">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">Admission Details</h1>
            <p className="text-xs text-[var(--text-secondary)]">
              {admissionTypeDisplay.label} · #{admission?.admissionNumber || attendance?.attendanceNumber || 'N/A'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {getTypeBadge()}
          {getStatusBadge()}
        </div>
      </div>

      {/* ── Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Main Column ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Patient Information Card */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex items-center gap-2">
              <UserCircle className="w-4 h-4 text-teal-600" />
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Patient Information</h2>
            </div>
            <div className="p-5">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-100 to-teal-50 border border-teal-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-base font-bold text-teal-700">{initials || <User className="w-5 h-5" />}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-[var(--text-primary)]">{patientName}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
                    <span className="inline-flex items-center gap-1 font-mono bg-[var(--bg-main)] px-2 py-0.5 rounded border border-[var(--border-color)]">
                      <Hash className="w-2.5 h-2.5 text-[var(--text-tertiary)]" />
                      {patient?.folderNumber || '—'}
                    </span>
                    <span className="text-[var(--text-secondary)] capitalize">{patient?.gender || '—'}</span>
                    <span className="opacity-40">·</span>
                    <span className="text-[var(--text-secondary)]">
                      {patient?.dateOfBirth
                        ? `${Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 3600000))} yrs`
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 p-2.5 bg-[var(--bg-main)] rounded-lg">
                  <Phone className="w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase text-[var(--text-tertiary)] tracking-wide font-semibold">Contact</p>
                    <p className="text-sm text-[var(--text-primary)] truncate">{patient?.contact || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-[var(--bg-main)] rounded-lg">
                  <Calendar className="w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase text-[var(--text-tertiary)] tracking-wide font-semibold">Date of Birth</p>
                    <p className="text-sm text-[var(--text-primary)] truncate">{formatDateOnly(patient?.dateOfBirth)}</p>
                  </div>
                </div>
                {patient?.address && (
                  <div className="flex items-center gap-2 p-2.5 bg-[var(--bg-main)] rounded-lg sm:col-span-2">
                    <MapPin className="w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase text-[var(--text-tertiary)] tracking-wide font-semibold">Address</p>
                      <p className="text-sm text-[var(--text-primary)] truncate">{patient.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Admission Information */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm">
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
              {lengthOfStay > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Length of Stay</p>
                  <p className="text-sm font-semibold text-teal-600 mt-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {lengthOfStay} day{lengthOfStay !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm">
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

          {/* Primary Diagnosis */}
          {primaryDiagnosis && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm">
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

          {/* Additional Diagnoses */}
          {attendance?.AttendanceDiagnosis &&
            attendance.AttendanceDiagnosis.filter((d: any) => d.diagnosisType !== 'primary').length > 0 && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm">
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
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm">
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
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm">
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

        {/* ── Sidebar Column ── */}
        <div className="space-y-5">

          {/* Quick Stats */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm">
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

          {/* Clinical Summary */}
          {attendance && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-600" />
                <h2 className="text-sm font-bold text-[var(--text-primary)]">Clinical Summary</h2>
              </div>
              <div className="p-5 grid grid-cols-2 gap-2.5">
                {[
                  { count: attendance.AttendanceDiagnosis?.length || 0, label: 'Diagnoses', Icon: Stethoscope, bg: 'bg-teal-50', color: 'text-teal-600' },
                  { count: attendance.Medication?.length || 0, label: 'Medications', Icon: Pill, bg: 'bg-blue-50', color: 'text-blue-600' },
                  { count: attendance.LabTest?.length || 0, label: 'Lab Tests', Icon: FlaskConical, bg: 'bg-purple-50', color: 'text-purple-600' },
                  { count: attendance.Procedure?.length || 0, label: 'Procedures', Icon: Scissors, bg: 'bg-orange-50', color: 'text-orange-600' },
                ].map(s => {
                  const Icon = s.Icon;
                  return (
                    <div key={s.label} className="text-center p-3 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)] hover:shadow-sm transition-shadow">
                      <div className={`w-7 h-7 rounded-md ${s.bg} flex items-center justify-center mx-auto mb-1.5`}>
                        <Icon className={`w-3.5 h-3.5 ${s.color}`} />
                      </div>
                      <div className="text-lg font-bold text-[var(--text-primary)] leading-tight">{s.count}</div>
                      <div className="text-[10px] text-[var(--text-tertiary)] font-medium mt-0.5">{s.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm">
            <div className="p-4 space-y-2.5">
              <button
                onClick={() => navigate(`/dashboard/medical-entries/${attendance?.id || admission?.attendanceId}`)}
                className="w-full px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all text-sm font-semibold flex items-center justify-center gap-2 shadow-sm shadow-teal-500/20"
              >
                <Eye className="w-4 h-4" />
                View Medical Records
              </button>

              <button
                onClick={() => navigate(`/dashboard/billing?attendanceId=${attendance?.id || admission?.attendanceId}`)}
                className="w-full px-4 py-2.5 bg-[var(--bg-main)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border-color)] transition-all text-sm font-medium border border-[var(--border-color)] flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                View Billing
              </button>

              {isActive && (
                <button
                  onClick={() => setShowDischargeModal(true)}
                  className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-semibold flex items-center justify-center gap-2 shadow-sm shadow-green-500/20"
                >
                  <LogOut className="w-4 h-4" />
                  Discharge Patient
                </button>
              )}

              <button
                onClick={() => navigate('/dashboard/wards')}
                className="w-full px-4 py-2.5 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-700 hover:text-white transition-all text-sm font-medium flex items-center justify-center gap-2"
              >
                <Building2 className="w-4 h-4" />
                Ward Management
              </button>
            </div>
          </div>

          {/* Observation Warning */}
          {isDetention && isActive && lengthOfStay >= 2 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-orange-800">Observation Period Alert</p>
                  <p className="text-xs text-orange-700 mt-1 leading-relaxed">
                    Patient has been in observation for <strong>{lengthOfStay}</strong> day(s).
                    Maximum observation period is 72 hours. Consider converting to formal IPD or discharging.
                  </p>
                  <button
                    onClick={() => navigate(`/dashboard/medical-entries/${attendance?.id}`)}
                    className="mt-2.5 px-3 py-1.5 text-xs font-semibold bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all inline-flex items-center gap-1"
                  >
                    Review Patient
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Discharge Modal ── */}
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