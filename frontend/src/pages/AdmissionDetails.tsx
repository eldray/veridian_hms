// src/pages/AdmissionDetails.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdmissionStore } from '../store/admissionStore';
import { usePatientStore } from '../store/patientStore';
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
  UserCircle
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (id) {
        setLoading(true);
        try {
          await getAdmission(id);
          await loadPatients();
        } catch (err) {
          console.error('Error loading admission:', err);
        } finally {
          setLoading(false);
        }
      }
    };
    loadData();
  }, [id, getAdmission, loadPatients]);

  // Find patient from store
  const getPatient = () => {
    if (!currentAdmission) return null;
    const patientId = currentAdmission.patientId || currentAdmission.patient?.id;
    if (!patientId) return null;
    return patients.find(p => p.id === patientId || p._id === patientId);
  };

  const patient = getPatient();

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
        {getStatusBadge(admission.status)}
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
                      {admission.admittingDoctor || '—'}
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
                  {admission.lengthOfStay > 0 && (
                    <div>
                      <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Length of Stay</p>
                      <p className="text-sm text-[var(--text-primary)] mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[var(--text-tertiary)]" />
                        {admission.lengthOfStay} days
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Admission Source</p>
                    <p className="text-sm text-[var(--text-primary)] mt-0.5 capitalize">{admission.admissionSource || 'Emergency'}</p>
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
                    {admission.ward?.wardName || '—'}
                  </p>
                  {admission.ward?.wardType && (
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5 capitalize">{admission.ward.wardType}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Bed</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5 flex items-center gap-1">
                    <Bed className="w-3 h-3 text-[var(--text-tertiary)]" />
                    {admission.bed?.bedNumber || '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Principal Diagnosis Card */}
          {admission.principalDiagnosis && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
                <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[var(--icon-cyan-text)]" />
                  Principal Diagnosis
                </h2>
              </div>
              <div className="p-6">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {admission.principalDiagnosis.name}
                </p>
                {admission.principalDiagnosis.icdCode && (
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    ICD-10 Code: {admission.principalDiagnosis.icdCode}
                  </p>
                )}
                {admission.principalPresentOnAdmission && (
                  <p className="text-xs text-[var(--text-secondary)] mt-2">
                    Present on Admission: {admission.principalPresentOnAdmission}
                  </p>
                )}
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
                <span className={`text-sm font-medium ${getStatusColor(admission.status)}`}>
                  {admission.status?.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>
              {admission.lengthOfStay > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-[var(--border-color)]">
                  <span className="text-sm text-[var(--text-secondary)]">Length of Stay</span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {admission.lengthOfStay} days
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-[var(--text-secondary)]">Admission #</span>
                <span className="text-xs font-mono text-[var(--text-secondary)]">
                  {admission.admissionNumber}
                </span>
              </div>
            </div>
          </div>

          {/* Attendance Info Card */}
          {admission.attendance && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
                <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[var(--icon-cyan-text)]" />
                  Attendance
                </h2>
              </div>
              <div className="p-6">
                <div>
                  <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    Attendance Number
                  </p>
                  <p className="text-sm font-mono text-[var(--text-primary)] mt-0.5">
                    {admission.attendance.attendanceNumber}
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/dashboard/attendance/${admission.attendanceId}`)}
                  className="mt-4 w-full px-4 py-2 bg-[var(--bg-main)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border-color)] transition-all text-sm font-medium border border-[var(--border-color)]"
                >
                  View Attendance Details
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="p-6 space-y-3">
              <button
                onClick={() => navigate(`/dashboard/medical-entries/${admission.attendanceId}`)}
                className="w-full px-4 py-2.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
              >
                View Medical Records
              </button>
              <button
                onClick={() => navigate(`/dashboard/billing?admissionId=${admission.id}`)}
                className="w-full px-4 py-2.5 bg-[var(--bg-main)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border-color)] transition-all text-sm font-medium border border-[var(--border-color)]"
              >
                View Billing
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}