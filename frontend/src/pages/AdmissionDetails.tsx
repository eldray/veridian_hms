// src/pages/AdmissionDetails.tsx - UPDATED to handle both admission and attendance IDs

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdmissionStore } from '../store/admissionStore';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useWardStore } from '../store/wardStore';
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
  Eye,
  Hospital,
  Moon,
  Sun,
  Building2,
  LogOut,
  RefreshCw
} from 'lucide-react';

export default function AdmissionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    currentAdmission, 
    getAdmission, 
    updateAdmission,
    dischargePatient,
    admissions,
    getAdmissions,
    isLoading: admissionLoading,
    error: admissionError
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
          console.log('🔍 Loading admission details for ID:', id);
          
          // First, try to get admissions list if not already loaded
          if (admissions.length === 0) {
            await getAdmissions();
          }
          
          // Check if the ID is an admission ID
          let admission = admissions.find(a => a.id === id);
          
          // If not found, check if it's an attendance ID (find admission by attendanceId)
          if (!admission) {
            admission = admissions.find(a => a.attendanceId === id);
            if (admission) {
              console.log('✅ Found admission by attendanceId:', admission.id);
            }
          }
          
          // If still not found, try to load directly from API
          if (!admission) {
            try {
              await getAdmission(id);
              admission = currentAdmission;
            } catch (err) {
              console.log('Admission not found by ID, checking attendance...');
            }
          }
          
          if (admission) {
            setFoundAdmission(admission);
            
            // Load patients for patient info
            await loadPatients();
            
            // Load attendance data
            if (admission.attendanceId) {
              let att = await getAttendance(admission.attendanceId);
              if (!att) {
                // Try to get from attendances list
                att = attendances.find(a => a.id === admission.attendanceId);
              }
              setAttendance(att);
            }
          } else {
            // Try to load as attendance directly
            console.log('No admission found, trying as attendance ID...');
            const att = await getAttendance(id);
            if (att) {
              setAttendance(att);
              // Try to find admission for this attendance
              const adm = admissions.find(a => a.attendanceId === att.id);
              if (adm) {
                setFoundAdmission(adm);
              }
              await loadPatients();
            }
          }
          
          // Load wards for location info
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

  // Find patient from store or from attendance
  const getPatient = () => {
    // First try from foundAdmission
    if (foundAdmission?.patient) {
      return foundAdmission.patient;
    }
    
    // Then try from attendance
    if (attendance?.Patient) {
      return attendance.Patient;
    }
    
    // Then search by ID in patients store
    const patientId = foundAdmission?.patientId || foundAdmission?.attendance?.patientId || attendance?.patientId;
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

  // Use foundAdmission or currentAdmission
  const admission = foundAdmission || currentAdmission;

  // Determine admission type display
  const getAdmissionTypeDisplay = () => {
    const admissionType = admission?.admissionType || attendance?.admissionType;
    const encounterCategory = attendance?.encounterCategory;
    
    if (encounterCategory === 'daycase') {
      return { label: 'Day Surgery', icon: <Sun className="w-4 h-4" />, color: 'purple' };
    }
    if (admissionType === 'detention_observation') {
      return { label: 'Detention / Observation', icon: <Moon className="w-4 h-4" />, color: 'orange' };
    }
    if (admissionType === 'antenatal_observation') {
      return { label: 'Antenatal Observation', icon: <Hospital className="w-4 h-4" />, color: 'pink' };
    }
    if (admissionType === 'delivery') {
      return { label: 'Delivery Admission', icon: <Hospital className="w-4 h-4" />, color: 'green' };
    }
    if (admissionType === 'postpartum_observation') {
      return { label: 'Postpartum Observation', icon: <Hospital className="w-4 h-4" />, color: 'cyan' };
    }
    return { label: 'Formal IPD Admission', icon: <Hospital className="w-4 h-4" />, color: 'green' };
  };

  const admissionTypeDisplay = getAdmissionTypeDisplay();

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
        return 'bg-green-100 text-green-700';
      case 'discharged': 
        return 'bg-gray-100 text-gray-700';
      default: 
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getTypeBadge = () => {
    const encounterCategory = attendance?.encounterCategory;
    const admissionType = admission?.admissionType || attendance?.admissionType;
    
    if (encounterCategory === 'daycase') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700 border border-purple-200">
          <Sun className="w-3.5 h-3.5" />
          DAY SURGERY
        </span>
      );
    }
    if (admissionType === 'detention_observation') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700 border border-orange-200">
          <Moon className="w-3.5 h-3.5" />
          OBSERVATION (12-72h)
        </span>
      );
    }
    if (admissionType === 'antenatal_observation') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-pink-100 text-pink-700 border border-pink-200">
          <Hospital className="w-3.5 h-3.5" />
          ANTENATAL OBSERVATION
        </span>
      );
    }
    if (admissionType === 'delivery') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 border border-green-200">
          <Hospital className="w-3.5 h-3.5" />
          IN LABOR / DELIVERY
        </span>
      );
    }
    if (admissionType === 'postpartum_observation') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-cyan-100 text-cyan-700 border border-cyan-200">
          <Hospital className="w-3.5 h-3.5" />
          POSTPARTUM OBSERVATION
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 border border-green-200">
        <Hospital className="w-3.5 h-3.5" />
        FORMAL IPD ADMISSION
      </span>
    );
  };

  const getStatusBadge = () => {
    const isDischarged = admission?.dischargeDate !== null || attendance?.status === 'discharged';
    if (isDischarged) {
      return <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">DISCHARGED</span>;
    }
    return <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">ACTIVE</span>;
  };

  // Calculate length of stay
  const getLengthOfStay = () => {
    const start = new Date(admission?.admissionDate || admission?.createdAt || attendance?.dateTime);
    const end = admission?.dischargeDate ? new Date(admission.dischargeDate) : new Date();
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  // Handle discharge
  const handleDischarge = async () => {
    const attendanceId = attendance?.id || admission?.attendanceId;
    if (!attendanceId) return;
    
    setIsDischarging(true);
    try {
      await dischargePatient(attendanceId, {
        dischargeDate: new Date().toISOString(),
        dischargeStatus: dischargeStatus as any,
        dischargeSummary: dischargeSummary
      });
      
      // Refresh data
      if (admission?.id) {
        await getAdmission(admission.id);
      }
      await getAdmissions();
      
      setShowDischargeModal(false);
      setDischargeSummary('');
      setDischargeStatus('home');
      
      // Navigate back to admissions list
      navigate('/dashboard/admissions');
    } catch (err: any) {
      console.error('Discharge failed:', err);
      alert(err.message || 'Failed to discharge patient');
    } finally {
      setIsDischarging(false);
    }
  };

  const isLoading = loading || admissionLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin mb-4" />
        <p className="text-gray-500">Loading admission details...</p>
      </div>
    );
  }

  if ((!admission && !attendance) || (!admission && !attendance)) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="bg-white rounded-xl p-6 text-center max-w-md border border-gray-200 shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-500 mb-4">
            {'Admission record not found'}
          </p>
          <button
            onClick={() => navigate('/dashboard/admissions')}
            className="px-4 py-2 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-700 hover:text-white transition-all"
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

  // Get the ID for navigation
  const displayId = admission?.id || attendance?.id;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/admissions')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Admission Details</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {admissionTypeDisplay.label} #{admission?.admissionNumber || attendance?.attendanceNumber || 'N/A'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getTypeBadge()}
          {getStatusBadge()}
        </div>
      </div>

      {/* Rest of the component remains the same... */}
      
      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Information Card */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-teal-500" />
                Patient Information
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</p>
                    <p className="text-base font-semibold text-gray-900 mt-0.5">
                      {patient ? `${patient.surname} ${patient.otherNames}` : 'Unknown Patient'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <IdCard className="w-3 h-3" />
                      Folder Number
                    </p>
                    <p className="text-sm text-gray-900 mt-0.5 font-mono">
                      {patient?.folderNumber || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      Contact
                    </p>
                    <p className="text-sm text-gray-900 mt-0.5">
                      {patient?.contact || '—'}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</p>
                    <p className="text-sm text-gray-900 mt-0.5 capitalize">
                      {patient?.gender || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Birth</p>
                    <p className="text-sm text-gray-900 mt-0.5">
                      {formatDateOnly(patient?.dateOfBirth)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Address</p>
                    <p className="text-sm text-gray-900 mt-0.5">
                      {patient?.address || '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Admission Information Card */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-500" />
                Admission Information
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Admission Date</p>
                    <p className="text-sm text-gray-900 mt-0.5">{formatDate(admission?.admissionDate || attendance?.dateTime)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Admission Type</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {admissionTypeDisplay.icon}
                      <span className="text-sm text-gray-900 capitalize">{admissionTypeDisplay.label}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Admitting Doctor</p>
                    <p className="text-sm text-gray-900 mt-0.5 flex items-center gap-1">
                      <Stethoscope className="w-3 h-3 text-gray-400" />
                      {attendance?.createdBy?.fullName || attendance?.User_Attendance_createdByIdToUser?.fullName || '—'}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {admission?.dischargeDate && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Discharge Date</p>
                      <p className="text-sm text-gray-900 mt-0.5">{formatDate(admission.dischargeDate)}</p>
                    </div>
                  )}
                  {lengthOfStay > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Length of Stay</p>
                      <p className="text-sm text-gray-900 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {lengthOfStay} day{lengthOfStay !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Mode</p>
                    <p className="text-sm text-gray-900 mt-0.5 uppercase">
                      {attendance?.paymentMode || '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Location Card */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-teal-500" />
                Location
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Ward</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-gray-400" />
                    {attendance?.Ward?.wardName || attendance?.ward?.wardName || '—'}
                  </p>
                  {attendance?.Ward?.wardType && (
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">{attendance.Ward.wardType}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Bed</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5 flex items-center gap-1">
                    <Bed className="w-3 h-3 text-gray-400" />
                    {attendance?.Bed?.bedNumber || attendance?.bed?.bedNumber || '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Diagnosis Card */}
          {primaryDiagnosis && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-teal-500" />
                  Primary Diagnosis
                </h2>
              </div>
              <div className="p-6">
                <p className="text-sm font-medium text-gray-900">
                  {primaryDiagnosis.name}
                </p>
                {primaryDiagnosis.icdCode && (
                  <p className="text-xs text-gray-400 mt-1">
                    ICD-10 Code: {primaryDiagnosis.icdCode}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Additional Diagnoses Card */}
          {attendance?.AttendanceDiagnosis && 
           attendance.AttendanceDiagnosis.filter((d: any) => d.diagnosisType !== 'primary').length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-teal-500" />
                  Additional Diagnoses
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {attendance.AttendanceDiagnosis
                    .filter((d: any) => d.diagnosisType !== 'primary')
                    .map((diag: any, idx: number) => (
                      <div key={idx} className="pb-2 border-b border-gray-200 last:border-0">
                        <p className="text-sm text-gray-900">
                          {diag.Diagnosis?.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {diag.Diagnosis?.icdCode && (
                            <span className="text-xs text-gray-400">
                              ICD-10: {diag.Diagnosis.icdCode}
                            </span>
                          )}
                          <span className="text-xs capitalize text-gray-400">
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
          {admission?.dischargeSummary && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-500" />
                  Discharge Summary
                </h2>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                  {admission.dischargeSummary}
                </p>
              </div>
            </div>
          )}

          {/* Daily Notes Card */}
          {admission?.dailyNotes && Array.isArray(admission.dailyNotes) && admission.dailyNotes.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-500" />
                  Daily Notes
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {admission.dailyNotes.map((note: any, idx: number) => (
                    <div key={idx} className="pb-3 border-b border-gray-200 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-teal-600">
                          {note.createdBy || note.author || 'Unknown'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(note.createdAt || note.date).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">
                        {note.notes || note.text || note.content}
                      </p>
                      {note.noteType && (
                        <span className="text-xs text-gray-400 mt-1 inline-block">
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
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-500" />
                Quick Stats
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm text-gray-500">Status</span>
                <span className={`text-sm font-medium ${isActive ? 'text-green-600' : 'text-gray-600'}`}>
                  {isActive ? 'ACTIVE' : 'DISCHARGED'}
                </span>
              </div>
              {isDetention && (
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-500">Observation Period</span>
                  <span className="text-sm font-medium text-orange-600">
                    {lengthOfStay} of 72 hours max
                  </span>
                </div>
              )}
              {isDaySurgery && (
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-500">Day Surgery</span>
                  <span className="text-sm font-medium text-purple-600">
                    Same-day discharge
                  </span>
                </div>
              )}
              {lengthOfStay > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-500">Length of Stay</span>
                  <span className="text-sm font-medium text-gray-900">
                    {lengthOfStay} day{lengthOfStay !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-500">Admission #</span>
                <span className="text-xs font-mono text-gray-500">
                  {admission?.admissionNumber || attendance?.attendanceNumber || '—'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-500">Attendance #</span>
                <span className="text-xs font-mono text-gray-500">
                  {attendance?.attendanceNumber || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Clinical Summary Card */}
          {attendance && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-teal-500" />
                  Clinical Summary
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-teal-600">
                      {attendance.AttendanceDiagnosis?.length || 0}
                    </div>
                    <div className="text-xs text-gray-500">Diagnoses</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-teal-600">
                      {attendance.Medication?.length || 0}
                    </div>
                    <div className="text-xs text-gray-500">Medications</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-teal-600">
                      {attendance.LabTest?.length || 0}
                    </div>
                    <div className="text-xs text-gray-500">Lab Tests</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-teal-600">
                      {attendance.Procedure?.length || 0}
                    </div>
                    <div className="text-xs text-gray-500">Procedures</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-6 space-y-3">
              <button
                onClick={() => navigate(`/dashboard/medical-entries/${attendance?.id || admission?.attendanceId}`)}
                className="w-full px-4 py-2.5 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-700 hover:text-white transition-all text-sm font-medium flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                View Medical Records
              </button>
              
              <button
                onClick={() => navigate(`/dashboard/billing?attendanceId=${attendance?.id || admission?.attendanceId}`)}
                className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all text-sm font-medium border border-gray-200"
              >
                View Billing
              </button>

              {/* Discharge Button - Only for active admissions */}
              {isActive && (
                <button
                  onClick={() => setShowDischargeModal(true)}
                  className="w-full px-4 py-2.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-700 hover:text-white transition-all text-sm font-medium flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Discharge Patient
                </button>
              )}

              {/* Ward Management Button */}
              <button
                onClick={() => navigate('/dashboard/wards')}
                className="w-full px-4 py-2.5 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-700 hover:text-white transition-all text-sm font-medium flex items-center justify-center gap-2"
              >
                <Building2 className="w-4 h-4" />
                Ward Management
              </button>
            </div>
          </div>

          {/* Observation Warning (for detention patients) */}
          {isDetention && isActive && lengthOfStay >= 2 && (
            <div className="bg-orange-100 border border-orange-300 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-orange-800">Observation Period Alert</p>
                  <p className="text-xs text-orange-700 mt-1">
                    Patient has been in observation for {lengthOfStay} day(s). 
                    Maximum observation period is 72 hours (3 days). Consider converting to formal IPD or discharging.
                  </p>
                  <button
                    onClick={() => navigate(`/dashboard/medical-entries/${attendance?.id}`)}
                    className="mt-2 px-3 py-1 text-xs font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                  >
                    Review Patient
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Discharge Modal */}
      {showDischargeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Discharge Patient</h3>
              <p className="text-sm text-gray-500 mt-1">
                Please confirm discharge details for {patient ? `${patient.surname} ${patient.otherNames}` : 'patient'}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Discharge Status
                </label>
                <select
                  value={dischargeStatus}
                  onChange={(e) => setDischargeStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="home">Home (Routine Discharge)</option>
                  <option value="transfer">Transfer to Another Facility</option>
                  <option value="expired">Expired</option>
                  <option value="against_medical_advice">Against Medical Advice</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Discharge Summary
                </label>
                <textarea
                  value={dischargeSummary}
                  onChange={(e) => setDischargeSummary(e.target.value)}
                  rows={4}
                  placeholder="Enter discharge summary, follow-up instructions, medications, etc..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowDischargeModal(false)}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDischarge}
                  disabled={isDischarging}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-all"
                >
                  {isDischarging ? 'Processing...' : 'Confirm Discharge'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}