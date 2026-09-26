// src/pages/FamilyPlanning.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFamilyPlanningStore } from '../store/familyPlanningStore';
import { useWorklistStore } from '../store/worklistStore';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useToast } from '../store/toastStore';
import {
  ChevronLeft, RefreshCw, X, Plus, Edit, Trash2, Eye, Calendar,
  Users, Shield, TrendingUp, Activity, AlertCircle, Search,
  PieChart, BarChart3, Pill , Clock, CheckCircle, User,
  ShieldCheck, History, FileText,
} from 'lucide-react';

const FP_METHODS: Record<string, { value: string; label: string }[]> = {
  modern_short_acting: [
    { value: 'pill_coc', label: 'Combined Oral Pills (COC)' },
    { value: 'pill_pop', label: 'Progestin-Only Pills (POP)' },
    { value: 'injectable_dmpa', label: 'Injectable (DMPA)' },
    { value: 'injectable_net_en', label: 'Injectable (NET-EN)' },
    { value: 'condom_male', label: 'Male Condom' },
    { value: 'condom_female', label: 'Female Condom' },
  ],
  modern_long_acting: [
    { value: 'implant_implanon', label: 'Implant (Implanon)' },
    { value: 'implant_jadelle', label: 'Implant (Jadelle)' },
    { value: 'iud_copper', label: 'IUD (Copper)' },
    { value: 'iud_hormonal', label: 'IUD (Hormonal)' },
  ],
  permanent: [
    { value: 'female_sterilization', label: 'Female Sterilization' },
    { value: 'male_sterilization', label: 'Male Sterilization' },
  ],
  traditional: [
    { value: 'lam', label: 'Lactational Amenorrhea (LAM)' },
    { value: 'withdrawal', label: 'Withdrawal' },
    { value: 'calendar', label: 'Calendar/Rhythm' },
    { value: 'other_traditional', label: 'Other Traditional' },
  ],
  emergency: [
    { value: 'emergency_contraception', label: 'Emergency Contraception' },
  ],
};

const METHOD_LABELS: Record<string, string> = {};
Object.values(FP_METHODS).flat().forEach((m) => { METHOD_LABELS[m.value] = m.label; });

// ── Primitives matching your app tokens ─────────────────────────────────────
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    pending:     'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]',
    in_progress: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]',
    completed:   'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
    admitted:    'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[status?.toLowerCase()] ?? 'bg-[var(--bg-main)] text-[var(--text-secondary)]'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

const StatCard = ({ title, value, icon: Icon, bgVar, colorVar }: any) => (
  <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-1">{title}</p>
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bgVar}`}>
        <Icon className={`w-5 h-5 ${colorVar}`} />
      </div>
    </div>
  </div>
);

// Family Planning Service Modal — same look and feel as the rest of the app
const FamilyPlanningServiceModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  attendanceId: string;
  patientId: string;
  existingService?: any;
  patient?: any;
}> = ({ isOpen, onClose, onSuccess, attendanceId, patientId, existingService, patient }) => {
  const { createService, updateService } = useFamilyPlanningStore();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    serviceDate: new Date().toISOString().split('T')[0],
    method: '',
    methodCategory: '',
    isNewAcceptor: false,
    counsellingGiven: true,
    informedConsent: true,
    sideEffects: '',
    contraindications: '',
    nextFollowUpDate: '',
    isPostpartum: false,
    isPostAbortion: false,
    postpartumWeeks: '',
    notes: '',
  });

  useEffect(() => {
    if (existingService) {
      setFormData({
        serviceDate: existingService.serviceDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        method: existingService.method || '',
        methodCategory: existingService.methodCategory || '',
        isNewAcceptor: existingService.isNewAcceptor || false,
        counsellingGiven: existingService.counsellingGiven ?? true,
        informedConsent: existingService.informedConsent ?? true,
        sideEffects: existingService.sideEffects || '',
        contraindications: existingService.contraindications || '',
        nextFollowUpDate: existingService.nextFollowUpDate?.split('T')[0] || '',
        isPostpartum: existingService.isPostpartum || false,
        isPostAbortion: existingService.isPostAbortion || false,
        postpartumWeeks: existingService.postpartumWeeks?.toString() || '',
        notes: existingService.notes || '',
      });
    }
  }, [existingService]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'method' && value) {
        const cat = Object.entries(FP_METHODS).find(([, arr]) => arr.some(m => m.value === value))?.[0];
        if (cat) next.methodCategory = cat;
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendanceId) { toastError('Error', 'No attendance selected'); return; }
    setLoading(true);
    try {
      const data: any = {
        patientId,
        attendanceId,
        serviceDate: new Date(formData.serviceDate).toISOString(),
        method: formData.method,
        methodCategory: formData.methodCategory,
        isNewAcceptor: formData.isNewAcceptor,
        counsellingGiven: formData.counsellingGiven,
        informedConsent: formData.informedConsent,
        sideEffects: formData.sideEffects || undefined,
        contraindications: formData.contraindications || undefined,
        nextFollowUpDate: formData.nextFollowUpDate ? new Date(formData.nextFollowUpDate).toISOString() : undefined,
        isPostpartum: formData.isPostpartum,
        isPostAbortion: formData.isPostAbortion,
        postpartumWeeks: formData.postpartumWeeks ? parseInt(formData.postpartumWeeks) : undefined,
        notes: formData.notes || undefined,
      };
      if (existingService) {
        await updateService(existingService.id, data);
        success('Updated', 'FP service updated');
      } else {
        await createService(data);
        success('Recorded', 'FP service recorded');
      }
      onSuccess();
    } catch (err: any) {
      toastError('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-[var(--bg-card)] rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-[var(--border-color)]">

          {/* Header */}
          <div className="sticky top-0 bg-[var(--bg-main)] px-5 py-3.5 border-b border-[var(--border-color)] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {existingService ? 'Edit Family Planning Record' : 'Record Family Planning Service'}
                </p>
                {patient && (
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                    {patient.surname} {patient.otherNames} · {patient.folderNumber}
                  </p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)] transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: 'thin' }}>

            {/* Section 1: Service Date */}
            <div className="bg-[var(--bg-main)] rounded-lg p-4 border border-[var(--border-color)]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-3 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Service Information
              </h4>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Service Date *</label>
                <input type="date" value={formData.serviceDate}
                  onChange={e => handleChange('serviceDate', e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
              </div>
            </div>

            {/* Section 2: Method */}
            <div className="bg-purple-50/40 rounded-lg p-4 border border-purple-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-3 flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5" /> Method Selection
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">FP Method *</label>
                  <select value={formData.method}
                    onChange={e => handleChange('method', e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                    <option value="">Select method</option>
                    {Object.entries(FP_METHODS).map(([cat, methods]) => (
                      <optgroup key={cat} label={cat.replace(/_/g, ' ').toUpperCase()}>
                        {methods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {formData.methodCategory && (
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Category</label>
                    <input type="text" readOnly value={formData.methodCategory.replace(/_/g, ' ')}
                      className="w-full px-3 py-2 text-xs text-[var(--text-secondary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)] cursor-pointer">
                    <input type="checkbox" checked={formData.isNewAcceptor}
                      onChange={e => handleChange('isNewAcceptor', e.target.checked)}
                      className="rounded border-[var(--border-color)]" />
                    <span className="text-xs font-medium text-[var(--text-primary)]">New Acceptor</span>
                  </label>
                  <label className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)] cursor-pointer">
                    <input type="checkbox" checked={formData.counsellingGiven}
                      onChange={e => handleChange('counsellingGiven', e.target.checked)}
                      className="rounded border-[var(--border-color)]" />
                    <span className="text-xs font-medium text-[var(--text-primary)]">Counselling Given</span>
                  </label>
                  <label className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)] cursor-pointer">
                    <input type="checkbox" checked={formData.informedConsent}
                      onChange={e => handleChange('informedConsent', e.target.checked)}
                      className="rounded border-[var(--border-color)]" />
                    <span className="text-xs font-medium text-[var(--text-primary)]">Informed Consent</span>
                  </label>
                  <label className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)] cursor-pointer">
                    <input type="checkbox" checked={formData.isPostpartum}
                      onChange={e => handleChange('isPostpartum', e.target.checked)}
                      className="rounded border-[var(--border-color)]" />
                    <span className="text-xs font-medium text-[var(--text-primary)]">Postpartum</span>
                  </label>
                  <label className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)] cursor-pointer col-span-2">
                    <input type="checkbox" checked={formData.isPostAbortion}
                      onChange={e => handleChange('isPostAbortion', e.target.checked)}
                      className="rounded border-[var(--border-color)]" />
                    <span className="text-xs font-medium text-[var(--text-primary)]">Post-Abortion</span>
                  </label>
                </div>

                {formData.isPostpartum && (
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Postpartum Weeks</label>
                    <input type="number" value={formData.postpartumWeeks}
                      onChange={e => handleChange('postpartumWeeks', e.target.value)}
                      placeholder="e.g. 6"
                      className="w-full px-3 py-2 text-xs text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Clinical Details */}
            <div className="bg-[var(--bg-main)] rounded-lg p-4 border border-[var(--border-color)]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-3 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> Clinical Details
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Side Effects Reported</label>
                  <textarea rows={2} value={formData.sideEffects}
                    onChange={e => handleChange('sideEffects', e.target.value)}
                    placeholder="e.g. nausea, headache, spotting…"
                    className="w-full px-3 py-2 text-xs text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Contraindications</label>
                  <textarea rows={2} value={formData.contraindications}
                    onChange={e => handleChange('contraindications', e.target.value)}
                    placeholder="Any contraindications noted…"
                    className="w-full px-3 py-2 text-xs text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Next Follow-up Date</label>
                  <input type="date" value={formData.nextFollowUpDate}
                    onChange={e => handleChange('nextFollowUpDate', e.target.value)}
                    className="w-full px-3 py-2 text-xs text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Notes</label>
                  <textarea rows={3} value={formData.notes}
                    onChange={e => handleChange('notes', e.target.value)}
                    placeholder="Additional observations, instructions…"
                    className="w-full px-3 py-2 text-xs text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none" />
                </div>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="px-5 py-3.5 border-t border-[var(--border-color)] bg-[var(--bg-main)] flex justify-end gap-3 flex-shrink-0">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-card)] text-xs font-medium">
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} disabled={loading || !formData.method}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-xs font-semibold">
              {loading ? 'Saving…' : existingService ? 'Update' : 'Record Service'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function FamilyPlanning() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { patients, loadPatients } = usePatientStore();
  const {
    services, statistics, methodMix, isLoading,
    getServices, deleteService, getStatistics, getMethodMix,
  } = useFamilyPlanningStore();
  const { worklistItems, fetchWorklist, isLoading: worklistLoading } = useWorklistStore();

  const [activeTab, setActiveTab] = useState<'queue' | 'register' | 'statistics' | 'method-mix'>('queue');
  const [queueTab, setQueueTab] = useState<'pending' | 'recent'>('pending');
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => { loadPatients(); }, []);

  useEffect(() => {
    if (activeTab === 'queue') {
      // Reuse the existing 'maternal' worklist — no backend changes needed
      fetchWorklist('maternal').catch(() => {});
    } else if (activeTab === 'register') {
      getServices({ startDate: dateRange.start, endDate: dateRange.end });
    } else if (activeTab === 'statistics') {
      getStatistics({ startDate: dateRange.start, endDate: dateRange.end });
    } else if (activeTab === 'method-mix') {
      getMethodMix({ startDate: dateRange.start, endDate: dateRange.end });
    }
  }, [activeTab, dateRange]);

  // Worklist queue split
  const pendingQueue = useMemo(
    () => worklistItems.filter(i => !i.hasBeenAttended && i.status !== 'completed'),
    [worklistItems]
  );
  const recentQueue = useMemo(
    () => worklistItems.filter(i => i.hasBeenAttended || i.status === 'completed'),
    [worklistItems]
  );
  const queueSource = queueTab === 'pending' ? pendingQueue : recentQueue;
  const filteredQueue = useMemo(() => {
    if (!searchQuery) return queueSource;
    const q = searchQuery.toLowerCase();
    return queueSource.filter(i =>
      i.patient?.name?.toLowerCase().includes(q) ||
      i.patient?.folderNumber?.toLowerCase().includes(q)
    );
  }, [queueSource, searchQuery]);

  const filteredServices = useMemo(() => {
    if (!searchQuery) return services;
    const q = searchQuery.toLowerCase();
    return services.filter(s =>
      s.patient?.surname?.toLowerCase().includes(q) ||
      s.patient?.otherNames?.toLowerCase().includes(q) ||
      s.patient?.folderNumber?.toLowerCase().includes(q) ||
      METHOD_LABELS[s.method]?.toLowerCase().includes(q)
    );
  }, [services, searchQuery]);

  const selectedPatient = patients.find(p => (p as any).id === selectedPatientId || (p as any)._id === selectedPatientId) || null;

  const stats = {
    waiting: pendingQueue.length,
    highRisk: pendingQueue.filter(i => i.riskLevel === 'high').length,
    recent: recentQueue.length,
    totalMonth: services.length,
  };

  const openNew = (item?: any) => {
    if (item) {
      setSelectedAttendanceId(item.attendanceId);
      setSelectedPatientId(item.patientId);
    } else {
      setSelectedAttendanceId('');
      setSelectedPatientId('');
    }
    setEditingService(null);
    setShowModal(true);
  };

  const handleEdit = (service: any) => {
    setEditingService(service);
    setSelectedAttendanceId(service.attendanceId);
    setSelectedPatientId(service.patientId);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this FP service record?')) return;
    try {
      await deleteService(id);
      success('Deleted', 'FP service deleted');
      getServices({ startDate: dateRange.start, endDate: dateRange.end });
    } catch (err: any) { toastError('Delete failed', err.message); }
  };

  const handleModalSuccess = () => {
    setShowModal(false);
    setEditingService(null);
    if (activeTab === 'queue') fetchWorklist('maternal');
    else getServices({ startDate: dateRange.start, endDate: dateRange.end });
  };

  if (isLoading && !services.length && !worklistItems.length) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">Loading Family Planning…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)]
              text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all text-xs font-medium">
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="h-5 w-px bg-[var(--border-color)]" />
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Shield className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[var(--text-primary)] leading-tight">Family Planning</h1>
              <p className="text-[10px] text-[var(--text-tertiary)] leading-tight">Queue · Register · Statistics · Method Mix</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openNew()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
              bg-purple-100 text-purple-700 hover:bg-purple-700 hover:text-white transition-all">
            <Plus className="w-3.5 h-3.5" /> New FP Service
          </button>
          <button
            onClick={() => activeTab === 'queue' ? fetchWorklist('maternal') : getServices({ startDate: dateRange.start, endDate: dateRange.end })}
            disabled={worklistLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)]
              text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all text-xs font-medium disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${worklistLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Date filter (non-queue tabs) */}
      {activeTab !== 'queue' && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <Calendar className="w-4 h-4 text-[var(--text-tertiary)]" />
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Period:</span>
            <input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-1.5 text-xs text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg" />
            <span className="text-[var(--text-tertiary)] text-xs">to</span>
            <input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-1.5 text-xs text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg" />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Waiting" value={stats.waiting} icon={Users}
          bgVar="bg-[var(--icon-cyan-bg)]" colorVar="text-[var(--icon-cyan-text)]" />
        <StatCard title="High Risk" value={stats.highRisk} icon={AlertCircle}
          bgVar="bg-[var(--icon-red-bg)]" colorVar="text-[var(--icon-red-text)]" />
        <StatCard title="Recent Visits" value={stats.recent} icon={History}
          bgVar="bg-[var(--icon-purple-bg)]" colorVar="text-[var(--icon-purple-text)]" />
        <StatCard title="This Month" value={stats.totalMonth} icon={TrendingUp}
          bgVar="bg-[var(--icon-green-bg)]" colorVar="text-[var(--icon-green-text)]" />
      </div>

      {/* Tabs */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-1 flex gap-1">
        {[
          { id: 'queue', label: 'Queue', icon: Users },
          { id: 'register', label: 'Register', icon: FileText },
          { id: 'statistics', label: 'Statistics', icon: BarChart3 },
          { id: 'method-mix', label: 'Method Mix', icon: PieChart },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-purple-500 text-white shadow'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]'
            }`}>
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── QUEUE TAB ── */}
      {activeTab === 'queue' && (
        <div className="space-y-3">
          <div className="border-b border-[var(--border-color)]">
            <div className="flex gap-4 px-1">
              {[
                { id: 'pending', label: 'Pending', icon: Clock, count: pendingQueue.length },
                { id: 'recent',  label: 'Recent Visits', icon: CheckCircle, count: recentQueue.length },
              ].map(t => (
                <button key={t.id} onClick={() => setQueueTab(t.id as any)}
                  className={`px-4 py-2 text-sm font-medium transition-all flex items-center gap-2 ${
                    queueTab === t.id
                      ? 'text-purple-600 border-b-2 border-purple-500'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}>
                  <t.icon className="w-4 h-4" />
                  {t.label}
                  {t.count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      queueTab === t.id ? 'bg-purple-100 text-purple-700' : 'bg-[var(--bg-main)] text-[var(--text-secondary)]'
                    }`}>{t.count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-[var(--text-tertiary)]" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by patient name or folder number..."
                className="flex-1 px-3 py-1.5 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]" />
            </div>
          </div>

          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <h2 className="text-xs font-semibold text-[var(--text-primary)]">
                {queueTab === 'pending' ? 'Waiting for Family Planning Service' : 'FP Visits Completed Today'}
                <span className="ml-2 text-[var(--text-tertiary)]">({filteredQueue.length})</span>
              </h2>
            </div>

            {filteredQueue.length === 0 ? (
              <div className="p-12 text-center">
                {queueTab === 'pending' ? (
                  <>
                    <CheckCircle className="w-12 h-12 text-[var(--icon-green-text)] mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-[var(--text-secondary)]">No patients waiting</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">All FP patients have been attended to</p>
                  </>
                ) : (
                  <>
                    <History className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-[var(--text-secondary)]">No FP visits completed today</p>
                  </>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Patient</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Folder #</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Type</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Status</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                        {queueTab === 'pending' ? 'Waiting' : 'Completed'}
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {filteredQueue.map(item => (
                      <tr key={item.id}
                        className="hover:bg-[var(--bg-main)] transition-colors cursor-pointer"
                        onClick={() => openNew(item)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-100">
                              <User className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-medium text-[var(--text-primary)] text-sm">{item.patient?.name}</p>
                              <p className="text-[10px] text-[var(--text-secondary)]">
                                {item.patient?.age} yrs • {item.patient?.gender}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--text-primary)]">
                          {item.patient?.folderNumber}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">
                            {item.visitType?.replace(/_/g, ' ') || 'FP'}
                          </span>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">
                          {queueTab === 'pending'
                            ? `${Math.floor((item.waitTime || 0) / 60)}h ${(item.waitTime || 0) % 60}m`
                            : (item.completedAt ? new Date(item.completedAt).toLocaleTimeString() : '—')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={e => { e.stopPropagation(); openNew(item); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-all ${
                              queueTab === 'pending'
                                ? 'bg-purple-100 text-purple-700 hover:bg-purple-700 hover:text-white'
                                : 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] hover:bg-[var(--icon-purple-text)] hover:text-white'
                            }`}>
                            {queueTab === 'pending'
                              ? <><Eye className="w-3 h-3" /> Start FP</>
                              : <><FileText className="w-3 h-3" /> View</>}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── REGISTER TAB ── */}
      {activeTab === 'register' && (
        <div className="space-y-4">
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-[var(--text-tertiary)]" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by patient name, folder number, or method..."
                className="flex-1 px-3 py-1.5 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg" />
            </div>
          </div>

          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Date</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Patient</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Method</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Category</th>
                    <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">New</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Provider</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Follow-up</th>
                    <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {filteredServices.length === 0 ? (
                    <tr><td colSpan={8} className="px-3 py-10 text-center text-[var(--text-tertiary)]">
                      <Shield className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p>No FP services recorded in this period</p>
                    </td></tr>
                  ) : filteredServices.map(service => (
                    <tr key={service.id} className="hover:bg-[var(--bg-main)] transition-colors">
                      <td className="px-3 py-2.5">{new Date(service.serviceDate).toLocaleDateString()}</td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-[var(--text-primary)]">{service.patient?.surname} {service.patient?.otherNames}</p>
                        <p className="text-[10px] text-[var(--text-tertiary)]">{service.patient?.folderNumber}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700">
                          {METHOD_LABELS[service.method] || service.method}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[10px] text-[var(--text-secondary)] capitalize">
                        {service.methodCategory?.replace(/_/g, ' ')}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {service.isNewAcceptor
                          ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]">NEW</span>
                          : <span className="text-[var(--text-tertiary)]">—</span>}
                      </td>
                      <td className="px-3 py-2.5">{service.providedBy?.fullName || '—'}</td>
                      <td className="px-3 py-2.5 text-[10px] text-[var(--text-secondary)]">
                        {service.nextFollowUpDate ? new Date(service.nextFollowUpDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-0.5 justify-center">
                          <button onClick={() => handleEdit(service)}
                            className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] transition-all">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(service.id)}
                            className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── STATISTICS TAB ── */}
      {activeTab === 'statistics' && statistics && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard title="Total Services" value={statistics.totalServices || 0} icon={Users}
              bgVar="bg-[var(--icon-purple-bg)]" colorVar="text-[var(--icon-purple-text)]" />
            <StatCard title="New Acceptors" value={statistics.newAcceptors || 0} icon={Plus}
              bgVar="bg-[var(--icon-green-bg)]" colorVar="text-[var(--icon-green-text)]" />
            <StatCard title="CYP" value={statistics.cyp || 0} icon={TrendingUp}
              bgVar="bg-[var(--icon-blue-bg)]" colorVar="text-[var(--icon-blue-text)]" />
            <StatCard title="Current Users" value={statistics.currentUsers || 0} icon={Activity}
              bgVar="bg-[var(--icon-orange-bg)]" colorVar="text-[var(--icon-orange-text)]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Method Mix</h3>
              <div className="space-y-2">
                {Object.entries(statistics.methodMix || {}).map(([method, count]: [string, any]) => (
                  <div key={method} className="flex items-center justify-between">
                    <span className="text-xs text-[var(--text-secondary)]">{METHOD_LABELS[method] || method}</span>
                    <span className="text-xs font-bold text-[var(--text-primary)]">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Category Mix</h3>
              <div className="space-y-2">
                {Object.entries(statistics.categoryMix || {}).map(([cat, count]: [string, any]) => (
                  <div key={cat} className="flex items-center justify-between">
                    <span className="text-xs text-[var(--text-secondary)] capitalize">{cat.replace(/_/g, ' ')}</span>
                    <span className="text-xs font-bold text-[var(--text-primary)]">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── METHOD MIX TAB ── */}
      {activeTab === 'method-mix' && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Method Mix Breakdown</h3>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
              <tr>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Method</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Category</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Count</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Percentage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {methodMix.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-10 text-center text-[var(--text-tertiary)]">No data available</td></tr>
              ) : methodMix.map((item, idx) => (
                <tr key={idx} className="hover:bg-[var(--bg-main)] transition-colors">
                  <td className="px-3 py-2.5">{METHOD_LABELS[item.method] || item.method}</td>
                  <td className="px-3 py-2.5 capitalize">{item.category?.replace(/_/g, ' ')}</td>
                  <td className="px-3 py-2.5 text-center font-bold">{item.count}</td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-20 h-2 bg-[var(--bg-main)] rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500" style={{ width: `${item.percentage}%` }} />
                      </div>
                      <span className="text-[10px] font-semibold">{item.percentage}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* FP Service Modal */}
      <FamilyPlanningServiceModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingService(null); }}
        onSuccess={handleModalSuccess}
        attendanceId={selectedAttendanceId}
        patientId={selectedPatientId}
        existingService={editingService}
        patient={selectedPatient}
      />
    </div>
  );
}