// src/pages/Referrals.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../store/toastStore';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';
import { generatePDF, openPrintWindow } from '../utils/pdfGenerator';
import { useHospitalStore } from '../store/hospitalStore';
import { documentApi } from '../api/documentApi';
import { useAuthStore } from '../store/authStore';

import {
  ArrowLeft, Send, Printer, UserPlus,
  Users, Clock, CheckCircle, XCircle, Activity,
  Filter, RefreshCw, Building, Stethoscope, Search,
  Download
} from 'lucide-react';
import {
  getReferrals,
  createOutgoingReferral,
  createIncomingReferral,
  updateReferralStatus,
  generateReferralLetter,
  getReferralStats
} from '../api';

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
  createdBy: { fullName: string; role: string };
}

export default function Referrals() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  // In the component, get hospital info
  const { hospital } = useHospitalStore();
// Inside component
  const { user, isAuthenticated } = useAuthStore();  
  // Patient and Attendance stores
  const { patients, loadPatients } = usePatientStore();
  const { attendances, getAttendances } = useAttendanceStore();
  
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [referralType, setReferralType] = useState<'outgoing' | 'incoming'>('outgoing');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showStats, setShowStats] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Patient and Attendance selection
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState('');
  
  const [formData, setFormData] = useState({
    referralReason: '',
    referralNotes: '',
    referredToFacility: '',
    referredToDoctor: '',
    referredToDepartment: '',
    referredFromFacility: '',
    referredFromDoctor: '',
    urgency: 'routine' as 'routine' | 'urgent' | 'stat'
  });

  const hasLoaded = useRef(false);

  // Load patients and attendances on mount
  const loadData = async (force = false) => {
    if (!force && hasLoaded.current) return;
    try {
      setRefreshing(true);
      setIsLoading(true);
      await Promise.all([
        loadPatients(),
        getAttendances()
      ]);
      hasLoaded.current = true;
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

  // Fetch referrals on load and when filter changes
  useEffect(() => {
    fetchReferrals();
    fetchStats();
  }, [filterStatus]);

// Update the fetchReferrals function
const fetchReferrals = async () => {
  try {
    const params: any = {};
    if (filterStatus !== 'all') params.status = filterStatus;
    const response = await getReferrals(params);
    
    console.log('📊 API Response:', response);
    
    let referralsData = [];
    if (response?.data && Array.isArray(response.data)) {
      referralsData = response.data;
    } else if (Array.isArray(response)) {
      referralsData = response;
    } else if (response?.success && Array.isArray(response.data)) {
      referralsData = response.data;
    }
    
    // ✅ Normalize the data - ensure each referral has an id
    const normalizedData = referralsData.map(ref => ({
      ...ref,
      id: ref.id || ref._id,  // Make sure id exists
    }));
    
    console.log('📊 Normalized referrals:', normalizedData);
    setReferrals(normalizedData);
  } catch (err: any) {
    console.error('Failed to fetch referrals:', err);
    toastError('Error', err.response?.data?.message || 'Failed to fetch referrals');
  }
};

  const fetchStats = async () => {
    try {
      const response = await getReferralStats();
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      toastError('Error', 'Please select a patient');
      return;
    }
    
    if (referralType === 'outgoing' && !formData.referredToFacility) {
      toastError('Error', 'Please enter the facility to refer to');
      return;
    }
    
    if (referralType === 'incoming' && !formData.referredFromFacility) {
      toastError('Error', 'Please enter the facility that referred the patient');
      return;
    }
    
    setIsLoading(true);
    try {
      let response;
      if (referralType === 'outgoing') {
        response = await createOutgoingReferral({
          patientId: selectedPatientId,
          attendanceId: selectedAttendanceId || undefined,
          referralReason: formData.referralReason,
          referralNotes: formData.referralNotes,
          urgency: formData.urgency,
          referredToFacility: formData.referredToFacility,
          referredToDoctor: formData.referredToDoctor,
          referredToDepartment: formData.referredToDepartment,
        });
        console.log('✅ Outgoing referral created:', response);
        success('Success', 'Outgoing referral created');
      } else {
        response = await createIncomingReferral({
          patientId: selectedPatientId,
          referralReason: formData.referralReason,
          referralNotes: formData.referralNotes,
          urgency: formData.urgency,
          referredFromFacility: formData.referredFromFacility,
          referredFromDoctor: formData.referredFromDoctor,
        });
        console.log('✅ Incoming referral created:', response);
        success('Success', 'Incoming referral recorded');
      }
      
      setShowModal(false);
      resetForm();
      
      // ✅ Force refresh after a short delay
      setTimeout(() => {
        fetchReferrals();
        fetchStats();
      }, 500);
      
    } catch (err: any) {
      console.error('Error creating referral:', err);
      toastError('Error', err.response?.data?.message || 'Failed to create referral');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await updateReferralStatus(id, status);
      success('Success', `Referral ${status}`);
      fetchReferrals();
      fetchStats();
    } catch (err: any) {
      toastError('Error', err.response?.data?.message || 'Failed to update status');
    }
  };

// Replace your handlePrintLetter function with this
const handlePrintLetter = async (referral: any) => {
  const referralId = referral?.id || referral?._id;
  
  console.log('📄 Referral ID:', referralId);
  console.log('📄 Referral Number:', referral.referralNumber);
  
  if (!referralId) {
    toastError('Error', 'Referral ID is missing');
    return;
  }
  
  try {
    // Step 1: Generate the document
    const response = await documentApi.generateReferralLetter(referralId);
    const documentId = response?.data?.documentId || response?.documentId;
    
    console.log('📄 Document ID:', documentId);
    
    if (!documentId) {
      toastError('Error', 'Failed to generate document');
      return;
    }
    
    // Step 2: Download the PDF using the downloadDocument function (which includes auth)
    const blob = await documentApi.downloadDocument(documentId);
    
    // Step 3: Create a download link and trigger download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referral_${referral.referralNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    success('Success', 'Referral letter downloaded');
    
  } catch (err: any) {
    console.error('❌ Error in handlePrintLetter:', err);
    toastError('Error', err.response?.data?.message || err.message || 'Failed to generate referral letter');
  }
};

const downloadReferralLetter = async (referral: any) => {
  const referralId = referral?.id || referral?._id;
  
  if (!referralId) {
    toastError('Error', 'Referral ID is missing');
    return;
  }
  
  try {
    const response = await documentApi.generateReferralLetter(referralId);
    const documentId = response?.data?.documentId || response?.documentId;
    
    if (documentId) {
      // Download directly instead of opening new tab
      const blob = await documentApi.downloadDocument(documentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `referral_${referral.referralNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      success('Success', 'Referral letter downloaded');
    } else {
      toastError('Error', 'Failed to generate referral letter');
    }
  } catch (err: any) {
    console.error('❌ Error:', err);
    toastError('Error', err.message || 'Failed to download referral letter');
  }
};

  const resetForm = () => {
    setSelectedPatientId('');
    setSelectedAttendanceId('');
    setFormData({
      referralReason: '',
      referralNotes: '',
      referredToFacility: '',
      referredToDoctor: '',
      referredToDepartment: '',
      referredFromFacility: '',
      referredFromDoctor: '',
      urgency: 'routine'
    });
  };

  const handleClearSelection = () => {
    setSelectedPatientId('');
    setSelectedAttendanceId('');
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: any }> = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      accepted: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle }
    };
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" /> {status}
      </span>
    );
  };

  const getUrgencyBadge = (urgency: string) => {
    const colors: Record<string, string> = {
      routine: 'bg-gray-100 text-gray-800',
      urgent: 'bg-orange-100 text-orange-800',
      stat: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[urgency]}`}>
        {urgency.toUpperCase()}
      </span>
    );
  };

  const selectedAttendance = attendances.find(a => a.id === selectedAttendanceId);
  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Send className="w-6 h-6 text-cyan-600" />
              Patient Referrals
            </h1>
            <p className="text-gray-500 text-sm">Manage outgoing and incoming referrals</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { loadData(true); fetchReferrals(); }} disabled={refreshing} className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={() => setShowStats(!showStats)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Activity className="w-4 h-4" /> Stats
          </button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
            <UserPlus className="w-4 h-4" /> New Referral
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {showStats && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div><p className="text-2xl font-bold">{stats.totalReferrals || 0}</p><p className="text-xs text-gray-500">Total Referrals</p></div>
              <Send className="w-8 h-8 text-cyan-600 opacity-50" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div><p className="text-2xl font-bold">{stats.byType?.find((t: any) => t.referralType === 'outgoing')?._count || 0}</p><p className="text-xs text-gray-500">Outgoing</p></div>
              <ArrowLeft className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div><p className="text-2xl font-bold">{stats.byType?.find((t: any) => t.referralType === 'incoming')?._count || 0}</p><p className="text-xs text-gray-500">Incoming</p></div>
              <ArrowLeft className="w-8 h-8 text-green-600 opacity-50 rotate-180" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div><p className="text-2xl font-bold">{stats.byStatus?.find((s: any) => s.status === 'pending')?._count || 0}</p><p className="text-xs text-gray-500">Pending</p></div>
              <Clock className="w-8 h-8 text-yellow-600 opacity-50" />
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium">Filter by status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Referrals List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">Ref No.</th>
                <th className="px-4 py-3 text-left">Patient</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">To/From</th>
                <th className="px-4 py-3 text-left">Urgency</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {referrals.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No referrals found</td></tr>
              ) : (
                referrals.map((ref) => (
                  <tr key={ref.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium">{ref.referralNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{ref.patient?.surname} {ref.patient?.otherNames}</div>
                      <div className="text-xs text-gray-500">{ref.patient?.folderNumber}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${ref.referralType === 'outgoing' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                        {ref.referralType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm max-w-[200px] truncate">
                      {ref.referralType === 'outgoing' ? ref.referredToFacility : ref.referredFromFacility}
                    </td>
                    <td className="px-4 py-3">{getUrgencyBadge(ref.urgency)}</td>
                    <td className="px-4 py-3">{getStatusBadge(ref.status)}</td>
                    <td className="px-4 py-3 text-sm">{new Date(ref.referralDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        {ref.referralType === 'outgoing' && (
                          <button onClick={() => handlePrintLetter(ref)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Print Letter">
                            <Printer className="w-4 h-4" />
                          </button>
                          
                        )}
                        {ref.status === 'pending' && (
                          <>
                            <button onClick={() => handleStatusUpdate(ref.id, 'accepted')} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Accept">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleStatusUpdate(ref.id, 'cancelled')} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Cancel">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {ref.status === 'accepted' && (
                          <button onClick={() => handleStatusUpdate(ref.id, 'completed')} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Complete">
                            <CheckCircle className="w-4 h-4" />
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

      {/* New Referral Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-5 flex justify-between items-center">
              <h2 className="text-lg font-bold">Create New Referral</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              {/* Referral Type */}
              <div className="flex gap-3">
                <button type="button" onClick={() => setReferralType('outgoing')} className={`flex-1 py-2 rounded-lg font-medium ${referralType === 'outgoing' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                  Outgoing (Refer to another facility)
                </button>
                <button type="button" onClick={() => setReferralType('incoming')} className={`flex-1 py-2 rounded-lg font-medium ${referralType === 'incoming' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                  Incoming (Referred from another facility)
                </button>
              </div>

              {/* Patient & Attendance Selector */}
              <PatientAttendanceSelector
                patients={patients}
                attendances={attendances}
                selectedPatientId={selectedPatientId}
                selectedAttendanceId={selectedAttendanceId}
                onPatientSelect={setSelectedPatientId}
                onAttendanceSelect={setSelectedAttendanceId}
                onClearSelection={handleClearSelection}
                autoSelectMostRecent={true}
              />

              {/* Display selected info */}
              {selectedPatientId && selectedAttendance && (
                <div className="p-3 bg-blue-50 rounded-lg text-sm">
                  <div className="flex items-center gap-2 text-blue-700 mb-1">
                    <Stethoscope className="w-4 h-4" />
                    <span className="font-medium">Current Visit Info:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-gray-600">Visit #:</span> {selectedAttendance.attendanceNumber}</div>
                    <div><span className="text-gray-600">Date:</span> {new Date(selectedAttendance.dateTime).toLocaleDateString()}</div>
                    <div><span className="text-gray-600">Type:</span> {selectedAttendance.attendanceType}</div>
                    <div><span className="text-gray-600">Status:</span> {selectedAttendance.status}</div>
                  </div>
                </div>
              )}

              {/* Outgoing Referral Fields */}
              {referralType === 'outgoing' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Referred To Facility *</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text" required
                        value={formData.referredToFacility}
                        onChange={(e) => setFormData({ ...formData, referredToFacility: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="e.g., Korle Bu Teaching Hospital"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Referred To Doctor</label>
                      <div className="relative">
                        <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text" value={formData.referredToDoctor}
                          onChange={(e) => setFormData({ ...formData, referredToDoctor: e.target.value })}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="Doctor's name"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Department</label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text" value={formData.referredToDepartment}
                          onChange={(e) => setFormData({ ...formData, referredToDepartment: e.target.value })}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="e.g., Cardiology"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Incoming Referral Fields */}
              {referralType === 'incoming' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Referred From Facility *</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text" required
                        value={formData.referredFromFacility}
                        onChange={(e) => setFormData({ ...formData, referredFromFacility: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="e.g., Ridge Hospital"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Referring Doctor</label>
                    <div className="relative">
                      <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text" value={formData.referredFromDoctor}
                        onChange={(e) => setFormData({ ...formData, referredFromDoctor: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="Doctor's name"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Common Fields */}
              <div>
                <label className="block text-sm font-medium mb-1">Reason for Referral *</label>
                <textarea
                  rows={3} required
                  value={formData.referralReason}
                  onChange={(e) => setFormData({ ...formData, referralReason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Describe the reason for referral..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Additional Notes</label>
                <textarea
                  rows={2}
                  value={formData.referralNotes}
                  onChange={(e) => setFormData({ ...formData, referralNotes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Any additional information..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Urgency</label>
                <select
                  value={formData.urgency}
                  onChange={(e) => setFormData({ ...formData, urgency: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="stat">STAT (Immediate)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-200">
                <button type="submit" disabled={isLoading} className="flex-1 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50">
                  {isLoading ? 'Creating...' : `Create ${referralType} Referral`}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
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