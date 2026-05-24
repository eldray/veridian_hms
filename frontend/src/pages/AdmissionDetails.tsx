// src/pages/AdmissionDetails.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdmissionStore } from '../store/admissionStore';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Bed, 
  Activity, 
  FileText, 
  Loader2,
  AlertCircle,
  Phone,
  IdCard,
  Stethoscope,
  Clock,
  MapPin,
  UserCircle,
  ClipboardList,
  Pill,
  FlaskConical,
  Scissors,
  Scan,
  Eye
} from 'lucide-react';

export default function AdmissionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    currentAdmission, 
    getAdmission, 
    isLoading: admissionLoading,
    error: admissionError
  } = useAdmissionStore();
  const { patients, loadPatients } = usePatientStore();
  const { getAttendance, currentAttendance } = useAttendanceStore();
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      if (id) {
        setLoading(true);
        try {
          // Load admission
          await getAdmission(id);
          
          // Load patients for patient info
          await loadPatients();
          
          // If admission has attendanceId, load attendance data
          if (currentAdmission?.attendanceId || currentAdmission?.attendance?.id) {
            const attendanceId = currentAdmission.attendanceId || currentAdmission.attendance?.id;
            if (attendanceId) {
              const att = await getAttendance(attendanceId);
              setAttendance(att);
            }
          }
        } catch (err) {
          console.error('Error loading admission:', err);
        } finally {
          setLoading(false);
        }
      }
    };
    loadData();
  }, [id, getAdmission, loadPatients, getAttendance]);

  // Find patient from store or from attendance
  const getPatient = () => {
    // First try from admission
    if (currentAdmission?.patient) {
      return currentAdmission.patient;
    }
    
    // Then try from attendance
    if (attendance?.patient) {
      return attendance.patient;
    }
    
    // Then search by ID in patients store
    const patientId = currentAdmission?.patientId || currentAdmission?.attendance?.patientId;
    if (!patientId) return null;
    
    return patients.find(p => p.id === patientId || p._id === patientId);
  };

  const patient = getPatient();

  // Get primary diagnosis from attendance
  const getPrimaryDiagnosis = () => {
    if (!attendance?.AttendanceDiagnosis) return null;
    const primary = attendance.AttendanceDiagnosis.find(
      (d: any) => d.diagnosisType === 'primary'
    );
    return primary?.Diagnosis || null;
  };

  const primaryDiagnosis = getPrimaryDiagnosis();

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatDateOnly = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'admitted': 
        return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]';
      case 'discharged': 
        return 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]';
      default: 
        return 'bg-[var(--bg-main)] text-[var(--text-secondary)]';
    }
  };

  const getEncounterCategoryBadge = () => {
    if (attendance?.encounterCategory === 'daycase') {
      return (
        <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
          DETAINED (OBSERVATION)
        </span>
      );
    }
    if (attendance?.encounterCategory === 'ipd') {
      return (
        <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
          FORMAL ADMISSION (IPD)
        </span>
      );
    }
    return null;
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'admitted':
        return <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>ACTIVE</span>;
      case 'discharged':
        return <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>DISCHARGED</span>;
      default:
        return <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>{status?.toUpperCase() || 'UNKNOWN'}</span>;
    }
  };

  // Calculate length of stay
  const getLengthOfStay = () => {
    const start = new Date(currentAdmission?.admissionDate || currentAdmission?.createdAt);
    const end = currentAdmission?.dischargeDate ? new Date(currentAdmission.dischargeDate) : new Date();
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const isLoading = loading || admissionLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-[var(--icon-cyan-text)] animate-spin mb-4" />
        <p className="text-[var(--text-secondary)]">Loading admission details...</p>
      </div>
    );
  }

  if (admissionError || !currentAdmission) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="bg-[var(--bg-card)] rounded-xl p-6 text-center max-w-md border border-[var(--border-color)]">
          <AlertCircle className="w-12 h-12 text-[var(--icon-red-text)] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Error</h2>
          <p className="text-[var(--text-secondary)] mb-4">
            {admissionError || 'Admission record not found'}
          </p>
          <button
            onClick={() => navigate('/dashboard/admissions')}
            className="px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all"
          >
            Back to Admissions
          </button>
        </div>
      </div>
    );
  }

  const admission = currentAdmission;
  const lengthOfStay = getLengthOfStay();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/admissions')}
            className="p-2 rounded-lg hover:bg-[var(--bg-main)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Admission Details</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Admission #{admission.admissionNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getEncounterCategoryBadge()}
          {getStatusBadge(admission.status || attendance?.status)}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Information Card */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
              <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-[var(--icon-cyan-text)]" />
                Patient Information
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Full Name</p>
                    <p className="text-base font-semibold text-[var(--text-primary)] mt-0.5">
                      {patient ? `${patient.surname} ${patient.otherNames}` : 'Unknown Patient'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1">
                      <IdCard className="w-3 h-3" />
                      Folder Number
                    </p>
                    <p className="text-sm text-[var(--text-primary)] mt-0.5 font-mono">
                      {patient?.folderNumber || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      Contact
                    </p>
                    <p className="text-sm text-[var(--text-primary)] mt-0.5">
                      {patient?.contact || '—'}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Gender</p>
                    <p className="text-sm text-[var(--text-primary)] mt-0.5 capitalize">
                      {patient?.gender || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Date of Birth</p>
                    <p className="text-sm text-[var(--text-primary)] mt-0.5">
                      {formatDateOnly(patient?.dateOfBirth)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Address</p>
                    <p className="text-sm text-[var(--text-primary)] mt-0.5">
                      {patient?.address || '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Admission Information Card */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
              <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[var(--icon-cyan-text)]" />
                Admission Information
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Admission Date</p>
                    <p className="text-sm text-[var(--text-primary)] mt-0.5">{formatDate(admission.admissionDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Admission Type</p>
                    <p className="text-sm text-[var(--text-primary)] mt-0.5 capitalize">{admission.admissionType || 'Emergency'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Admitting Doctor</p>
                    <p className="text-sm text-[var(--text-primary)] mt-0.5 flex items-center gap-1">
                      <Stethoscope className="w-3 h-3 text-[var(--text-tertiary)]" />
                      {attendance?.createdBy?.fullName || admission.admittingDoctor || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Encounter Type</p>
                    <p className="text-sm text-[var(--text-primary)] mt-0.5 capitalize">
                      {attendance?.encounterCategory === 'ipd' ? 'Inpatient (IPD)' : 
                       attendance?.encounterCategory === 'daycase' ? 'Daycase/Observation' : 
                       attendance?.attendanceType || '—'}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {admission.dischargeDate && (
                    <div>
                      <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Discharge Date</p>
                      <p className="text-sm text-[var(--text-primary)] mt-0.5">{formatDate(admission.dischargeDate)}</p>
                    </div>
                  )}
                  {lengthOfStay > 0 && (
                    <div>
                      <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Length of Stay</p>
                      <p className="text-sm text-[var(--text-primary)] mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[var(--text-tertiary)]" />
                        {lengthOfStay} day{lengthOfStay !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Admission Source</p>
                    <p className="text-sm text-[var(--text-primary)] mt-0.5 capitalize">{admission.admissionSource || 'Emergency'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Payment Mode</p>
                    <p className="text-sm text-[var(--text-primary)] mt-0.5 uppercase">
                      {attendance?.paymentMode || '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Location Card */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
              <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[var(--icon-cyan-text)]" />
                Location
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Ward</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">
                    {attendance?.ward?.wardName || admission.ward?.wardName || '—'}
                  </p>
                  {attendance?.ward?.wardType && (
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5 capitalize">{attendance.ward.wardType}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Bed</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5 flex items-center gap-1">
                    <Bed className="w-3 h-3 text-[var(--text-tertiary)]" />
                    {attendance?.bed?.bedNumber || admission.bed?.bedNumber || '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Diagnosis Card */}
          {primaryDiagnosis && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
                <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-[var(--icon-cyan-text)]" />
                  Primary Diagnosis
                </h2>
              </div>
              <div className="p-6">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {primaryDiagnosis.name}
                </p>
                {primaryDiagnosis.icdCode && (
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    ICD-10 Code: {primaryDiagnosis.icdCode}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Additional Diagnoses Card */}
          {attendance?.AttendanceDiagnosis && 
           attendance.AttendanceDiagnosis.filter((d: any) => d.diagnosisType !== 'primary').length > 0 && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
                <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-[var(--icon-cyan-text)]" />
                  Additional Diagnoses
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {attendance.AttendanceDiagnosis
                    .filter((d: any) => d.diagnosisType !== 'primary')
                    .map((diag: any, idx: number) => (
                      <div key={idx} className="pb-2 border-b border-[var(--border-color)] last:border-0">
                        <p className="text-sm text-[var(--text-primary)]">
                          {diag.Diagnosis?.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {diag.Diagnosis?.icdCode && (
                            <span className="text-xs text-[var(--text-tertiary)]">
                              ICD-10: {diag.Diagnosis.icdCode}
                            </span>
                          )}
                          <span className="text-xs capitalize text-[var(--text-tertiary)]">
                            Type: {diag.diagnosisType}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Discharge Summary Card */}
          {admission.dischargeSummary && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
                <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[var(--icon-cyan-text)]" />
                  Discharge Summary
                </h2>
              </div>
              <div className="p-6">
                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                  {admission.dischargeSummary}
                </p>
              </div>
            </div>
          )}

          {/* Daily Notes Card (for IPD) */}
          {admission.dailyNotes && Array.isArray(admission.dailyNotes) && admission.dailyNotes.length > 0 && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
                <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[var(--icon-cyan-text)]" />
                  Daily Notes
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {admission.dailyNotes.map((note: any, idx: number) => (
                    <div key={idx} className="pb-3 border-b border-[var(--border-color)] last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-[var(--icon-cyan-text)]">
                          {note.createdBy || 'Unknown'}
                        </span>
                        <span className="text-xs text-[var(--text-tertiary)]">
                          {new Date(note.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                        {note.notes}
                      </p>
                      {note.noteType && (
                        <span className="text-xs text-[var(--text-tertiary)] mt-1 inline-block">
                          Type: {note.noteType}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Quick Stats Card */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
              <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Activity className="w-5 h-5 text-[var(--icon-cyan-text)]" />
                Quick Stats
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-[var(--border-color)]">
                <span className="text-sm text-[var(--text-secondary)]">Status</span>
                <span className={`text-sm font-medium ${getStatusColor(admission.status || attendance?.status)}`}>
                  {admission.status?.toUpperCase() || attendance?.status?.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>
              {lengthOfStay > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-[var(--border-color)]">
                  <span className="text-sm text-[var(--text-secondary)]">Length of Stay</span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {lengthOfStay} day{lengthOfStay !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-[var(--text-secondary)]">Admission #</span>
                <span className="text-xs font-mono text-[var(--text-secondary)]">
                  {admission.admissionNumber}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-[var(--text-secondary)]">Attendance #</span>
                <span className="text-xs font-mono text-[var(--text-secondary)]">
                  {attendance?.attendanceNumber || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Clinical Summary Card */}
          {attendance && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
                <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-[var(--icon-cyan-text)]" />
                  Clinical Summary
                </h2>
              </div>
              <div className="p-6 space-y-4">
                {/* Counts */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-[var(--bg-main)] rounded-lg">
                    <div className="text-2xl font-bold text-[var(--icon-cyan-text)]">
                      {attendance.AttendanceDiagnosis?.length || 0}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">Diagnoses</div>
                  </div>
                  <div className="text-center p-3 bg-[var(--bg-main)] rounded-lg">
                    <div className="text-2xl font-bold text-[var(--icon-cyan-text)]">
                      {attendance.Medication?.length || 0}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">Medications</div>
                  </div>
                  <div className="text-center p-3 bg-[var(--bg-main)] rounded-lg">
                    <div className="text-2xl font-bold text-[var(--icon-cyan-text)]">
                      {attendance.LabTest?.length || 0}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">Lab Tests</div>
                  </div>
                  <div className="text-center p-3 bg-[var(--bg-main)] rounded-lg">
                    <div className="text-2xl font-bold text-[var(--icon-cyan-text)]">
                      {attendance.Procedure?.length || 0}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">Procedures</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="p-6 space-y-3">
              <button
                onClick={() => navigate(`/dashboard/medical-entries/${attendance?.id || admission.attendanceId}`)}
                className="w-full px-4 py-2.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                View Medical Records
              </button>
              <button
                onClick={() => navigate(`/dashboard/billing?attendanceId=${attendance?.id || admission.attendanceId}`)}
                className="w-full px-4 py-2.5 bg-[var(--bg-main)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border-color)] transition-all text-sm font-medium border border-[var(--border-color)]"
              >
                View Billing
              </button>
              {attendance?.encounterCategory === 'daycase' && (
                <button
                  onClick={() => navigate(`/dashboard/medical-entries/${attendance.id}`)}
                  className="w-full px-4 py-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all text-sm font-medium"
                >
                  Complete Observation
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}