// src/pages/FamilyPlanning.tsx — Enhanced UI/UX
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
  PieChart, BarChart3, Pill, Clock, CheckCircle, User,
  ShieldCheck, History, FileText, LayoutGrid, List, Filter,
  ChevronRight, Info, Heart, Baby, Syringe, Percent,
  BadgeCheck, Save, AlertTriangle, UserCheck, Stethoscope,
  TrendingDown, Target,
} from 'lucide-react';

const FP_METHODS: Record<string, { value: string; label: string; icon?: React.ElementType }[]> = {
  modern_short_acting: [
    { value: 'pill_coc', label: 'Combined Oral Pills (COC)', icon: Pill },
    { value: 'pill_pop', label: 'Progestin-Only Pills (POP)', icon: Pill },
    { value: 'injectable_dmpa', label: 'Injectable (DMPA)', icon: Syringe },
    { value: 'injectable_net_en', label: 'Injectable (NET-EN)', icon: Syringe },
    { value: 'condom_male', label: 'Male Condom', icon: Shield },
    { value: 'condom_female', label: 'Female Condom', icon: Shield },
  ],
  modern_long_acting: [
    { value: 'implant_implanon', label: 'Implant (Implanon)', icon: Activity },
    { value: 'implant_jadelle', label: 'Implant (Jadelle)', icon: Activity },
    { value: 'iud_copper', label: 'IUD (Copper)', icon: Target },
    { value: 'iud_hormonal', label: 'IUD (Hormonal)', icon: Target },
  ],
  permanent: [
    { value: 'female_sterilization', label: 'Female Sterilization', icon: ShieldCheck },
    { value: 'male_sterilization', label: 'Male Sterilization', icon: ShieldCheck },
  ],
  traditional: [
    { value: 'lam', label: 'Lactational Amenorrhea (LAM)', icon: Baby },
    { value: 'withdrawal', label: 'Withdrawal', icon: Heart },
    { value: 'calendar', label: 'Calendar / Rhythm', icon: Calendar },
    { value: 'other_traditional', label: 'Other Traditional', icon: Info },
  ],
  emergency: [
    { value: 'emergency_contraception', label: 'Emergency Contraception', icon: AlertCircle },
  ],
};

const METHOD_LABELS: Record<string, string> = {};
const METHOD_CATEGORY_OF: Record<string, string> = {};
Object.entries(FP_METHODS).forEach(([cat, methods]) => {
  methods.forEach(m => {
    METHOD_LABELS[m.value] = m.label;
    METHOD_CATEGORY_OF[m.value] = cat;
  });
});

const CATEGORY_LABELS: Record<string, string> = {
  modern_short_acting: 'Short-Acting',
  modern_long_acting: 'Long-Acting',
  permanent: 'Permanent',
  traditional: 'Traditional',
  emergency: 'Emergency',
};

// ── Shared primitives ──
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

const CategoryBadge: React.FC<{ category: string }> = ({ category }) => {
  const map: Record<string, string> = {
    modern_short_acting: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    modern_long_acting:  'bg-purple-100 text-purple-700 border-purple-200',
    permanent:           'bg-red-100 text-red-700 border-red-200',
    traditional:         'bg-orange-100 text-orange-700 border-orange-200',
    emergency:           'bg-yellow-100 text-yellow-700 border-yellow-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${map[category] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
      {CATEGORY_LABELS[category] || category?.replace(/_/g, ' ') || '—'}
    </span>
  );
};

const StatCard = ({
  title, value, subtitle, icon: Icon, bgVar, colorVar, trend,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  bgVar: string;
  colorVar: string;
  trend?: { value: string; positive?: boolean };
}) => (
  <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] hover:shadow-sm transition-shadow">
    <div className="flex items-start justify-between mb-2">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bgVar}`}>
        <Icon className={`w-5 h-5 ${colorVar}`} />
      </div>
      {trend && (
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          trend.positive ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]'
                         : 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]'
        }`}>
          {trend.value}
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-[var(--text-primary)] leading-tight">{value}</p>
    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{title}</p>
    {subtitle && <p className="text-[10px] text-[var(--text-tertiary)] mt-1">{subtitle}</p>}
  </div>
);

const initials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');

type QueueViewMode = 'table' | 'cards';

// ─────────────────────────────────────────────────────────────
// FP Service Modal — redesigned with sections and live preview
// ─────────────────────────────────────────────────────────────
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
    if (isOpen && existingService) {
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
    } else if (isOpen && !existingService) {
      setFormData({
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
    }
  }, [isOpen, existingService]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'method' && value) {
        const cat = METHOD_CATEGORY_OF[value];
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

  const selectedMethod = formData.method ? METHOD_LABELS[formData.method] : null;
  const selectedCategory = formData.methodCategory ? CATEGORY_LABELS[formData.methodCategory] : null;
  const isLongActing = formData.methodCategory === 'modern_long_acting' || formData.methodCategory === 'permanent';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
        <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[94vh] flex flex-col overflow-hidden border border-[var(--border-color)]">

          {/* Header */}
          <div className="relative bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 px-6 py-5 text-white flex-shrink-0">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-400 via-fuchsia-400 to-transparent" />
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-6 h-6 text-purple-300" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold truncate text-white">
                    {existingService ? 'Edit Family Planning Record' : 'Record Family Planning Service'}
                  </h2>
                  {patient && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {patient.surname} {patient.otherNames} · <span className="font-mono">{patient.folderNumber}</span>
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 text-slate-300 hover:text-white"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live preview */}
            {selectedMethod && (
              <div className="mt-4 flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2">
                <BadgeCheck className="w-4 h-4 text-purple-300 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Selected Method</p>
                  <p className="text-sm font-bold text-white truncate">{selectedMethod}</p>
                </div>
                {selectedCategory && (
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30 flex-shrink-0">
                    {selectedCategory}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5" style={{ scrollbarWidth: 'thin' }}>

            {/* Section 1: Service Date */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-purple-600" />
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">Service Information</h4>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                  Service Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.serviceDate}
                  onChange={e => handleChange('serviceDate', e.target.value)}
                  required
                  className="w-full px-3 py-2.5 text-sm text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                />
              </div>
            </div>

            {/* Section 2: Method */}
            <div className="bg-purple-50/40 rounded-xl p-4 border border-purple-100">
              <div className="flex items-center gap-2 mb-3">
                <Pill className="w-4 h-4 text-purple-600" />
                <h4 className="text-sm font-semibold text-purple-800">Method Selection</h4>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                    FP Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.method}
                    onChange={e => handleChange('method', e.target.value)}
                    required
                    className="w-full px-3 py-2.5 text-sm text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  >
                    <option value="">Select method…</option>
                    {Object.entries(FP_METHODS).map(([cat, methods]) => (
                      <optgroup key={cat} label={(CATEGORY_LABELS[cat] || cat).toUpperCase()}>
                        {methods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {formData.methodCategory && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/60 border border-purple-100">
                    <Info className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                    <span className="text-xs text-[var(--text-primary)]">
                      Auto-categorized as
                    </span>
                    <CategoryBadge category={formData.methodCategory} />
                  </div>
                )}

                {/* Toggle grid */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'isNewAcceptor', label: 'New Acceptor', icon: UserCheck },
                    { key: 'counsellingGiven', label: 'Counselling Given', icon: Info },
                    { key: 'informedConsent', label: 'Informed Consent', icon: ShieldCheck },
                    { key: 'isPostpartum', label: 'Postpartum', icon: Baby },
                    { key: 'isPostAbortion', label: 'Post-Abortion', icon: Heart },
                  ].map(({ key, label, icon: Icon }) => {
                    const checked = formData[key as keyof typeof formData] as boolean;
                    return (
                      <label
                        key={key}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                          checked
                            ? 'bg-purple-50 border-purple-300 shadow-sm'
                            : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-purple-200'
                        } ${key === 'isPostAbortion' ? 'col-span-2' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => handleChange(key, e.target.checked)}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                        />
                        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${checked ? 'text-purple-600' : 'text-[var(--text-tertiary)]'}`} />
                        <span className={`text-xs font-medium ${checked ? 'text-purple-800' : 'text-[var(--text-primary)]'}`}>
                          {label}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {formData.isPostpartum && (
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                      Postpartum Weeks
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.postpartumWeeks}
                      onChange={e => handleChange('postpartumWeeks', e.target.value)}
                      placeholder="e.g. 6"
                      className="w-full px-3 py-2.5 text-sm text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Clinical Details */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Stethoscope className="w-4 h-4 text-teal-600" />
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">Clinical Details</h4>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                      Side Effects Reported
                    </label>
                    <textarea
                      rows={3}
                      value={formData.sideEffects}
                      onChange={e => handleChange('sideEffects', e.target.value)}
                      placeholder="e.g. nausea, headache, spotting…"
                      className="w-full px-3 py-2.5 text-sm text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                      Contraindications
                    </label>
                    <textarea
                      rows={3}
                      value={formData.contraindications}
                      onChange={e => handleChange('contraindications', e.target.value)}
                      placeholder="Any contraindications noted…"
                      className="w-full px-3 py-2.5 text-sm text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                    Next Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={formData.nextFollowUpDate}
                    onChange={e => handleChange('nextFollowUpDate', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                  />
                  {isLongActing && !formData.nextFollowUpDate && (
                    <p className="text-[10px] text-orange-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Long-acting methods typically need a follow-up
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={e => handleChange('notes', e.target.value)}
                    placeholder="Additional observations, instructions…"
                    className="w-full px-3 py-2.5 text-sm text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none transition-all"
                  />
                </div>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !formData.method}
              className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold shadow-sm shadow-purple-500/20 transition-all"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {existingService ? 'Update Record' : 'Record Service'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────
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
  const [queueView, setQueueView] = useState<QueueViewMode>(() => {
    const saved = localStorage.getItem('fpQueueView');
    return (saved as QueueViewMode) || 'table';
  });
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => { loadPatients(); }, []);

  useEffect(() => {
    localStorage.setItem('fpQueueView', queueView);
  }, [queueView]);

  useEffect(() => {
    if (activeTab === 'queue') {
      fetchWorklist('maternal').catch(() => {});
    } else if (activeTab === 'register') {
      getServices({ startDate: dateRange.start, endDate: dateRange.end });
    } else if (activeTab === 'statistics') {
      getStatistics({ startDate: dateRange.start, endDate: dateRange.end });
    } else if (activeTab === 'method-mix') {
      getMethodMix({ startDate: dateRange.start, endDate: dateRange.end });
    }
  }, [activeTab, dateRange]);

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
    <div className="space-y-5 p-4 sm:p-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-sm shadow-purple-500/20">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">Family Planning</h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Queue · Register · Statistics · Method Mix
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => openNew()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 shadow-sm shadow-purple-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New FP Service</span>
            <span className="sm:hidden">New</span>
          </button>
          <button
            onClick={() => activeTab === 'queue' ? fetchWorklist('maternal') : getServices({ startDate: dateRange.start, endDate: dateRange.end })}
            disabled={worklistLoading}
            className="p-2 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${worklistLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Waiting"
          value={stats.waiting}
          subtitle="Pending FP service"
          icon={Users}
          bgVar="bg-[var(--icon-cyan-bg)]"
          colorVar="text-[var(--icon-cyan-text)]"
        />
        <StatCard
          title="High Risk"
          value={stats.highRisk}
          subtitle={stats.highRisk > 0 ? 'Needs priority attention' : 'None flagged'}
          icon={AlertCircle}
          bgVar="bg-[var(--icon-red-bg)]"
          colorVar="text-[var(--icon-red-text)]"
        />
        <StatCard
          title="Recent Visits"
          value={stats.recent}
          subtitle="Completed today"
          icon={History}
          bgVar="bg-[var(--icon-purple-bg)]"
          colorVar="text-[var(--icon-purple-text)]"
        />
        <StatCard
          title="This Month"
          value={stats.totalMonth}
          subtitle="Services recorded"
          icon={TrendingUp}
          bgVar="bg-[var(--icon-green-bg)]"
          colorVar="text-[var(--icon-green-text)]"
        />
      </div>

      {/* ── Tabs ── */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-1 flex gap-1 shadow-sm">
        {[
          { id: 'queue', label: 'Queue', icon: Users },
          { id: 'register', label: 'Register', icon: FileText },
          { id: 'statistics', label: 'Statistics', icon: BarChart3 },
          { id: 'method-mix', label: 'Method Mix', icon: PieChart },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Date filter (non-queue tabs) ── */}
      {activeTab !== 'queue' && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <Calendar className="w-4 h-4 text-[var(--text-tertiary)]" />
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Period:</span>
            <input
              type="date"
              value={dateRange.start}
              onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-1.5 text-xs text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-purple-500 transition-all"
            />
            <span className="text-[var(--text-tertiary)] text-xs">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-1.5 text-xs text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-purple-500 transition-all"
            />
          </div>
        </div>
      )}

      {/* ═══════════ QUEUE TAB ═══════════ */}
      {activeTab === 'queue' && (
        <div className="space-y-3">
          {/* Queue sub-tabs + view toggle */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] px-3">
              <div className="flex gap-1">
                {[
                  { id: 'pending', label: 'Pending', icon: Clock, count: pendingQueue.length },
                  { id: 'recent', label: 'Recent Visits', icon: CheckCircle, count: recentQueue.length },
                ].map(t => {
                  const Icon = t.icon;
                  const isActive = queueTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setQueueTab(t.id as any)}
                      className={`px-4 py-3 text-sm font-medium transition-all flex items-center gap-2 relative ${
                        isActive
                          ? 'text-purple-600'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {t.label}
                      {t.count > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive ? 'bg-purple-100 text-purple-700' : 'bg-[var(--bg-main)] text-[var(--text-secondary)]'
                        }`}>{t.count}</span>
                      )}
                      {isActive && (
                        <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-purple-500 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* View toggle */}
              <div className="hidden lg:flex items-center bg-[var(--bg-main)] rounded-lg p-1 border border-[var(--border-color)] my-2">
                <button
                  onClick={() => setQueueView('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    queueView === 'table'
                      ? 'bg-[var(--bg-card)] text-purple-700 shadow-sm'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <List className="w-3.5 h-3.5" /> Table
                </button>
                <button
                  onClick={() => setQueueView('cards')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    queueView === 'cards'
                      ? 'bg-[var(--bg-card)] text-purple-700 shadow-sm'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" /> Cards
                </button>
              </div>
            </div>

            {/* Search + mobile filter */}
            <div className="p-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by patient name or folder number…"
                    className="w-full pl-10 pr-9 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:ring-2 focus:ring-purple-500 transition-all"
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
                {/* Mobile view toggle */}
                <div className="lg:hidden flex items-center bg-[var(--bg-main)] rounded-lg p-1 border border-[var(--border-color)]">
                  <button
                    onClick={() => setQueueView('table')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      queueView === 'table' ? 'bg-[var(--bg-card)] text-purple-700 shadow-sm' : 'text-[var(--text-tertiary)]'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setQueueView('cards')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      queueView === 'cards' ? 'bg-[var(--bg-card)] text-purple-700 shadow-sm' : 'text-[var(--text-tertiary)]'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Queue content */}
          {filteredQueue.length === 0 ? (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-12 text-center shadow-sm">
              {queueTab === 'pending' ? (
                <>
                  <div className="w-16 h-16 bg-[var(--icon-green-bg)] rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-[var(--icon-green-text)]" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">All caught up</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">No patients waiting for FP service</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-[var(--bg-main)] rounded-full flex items-center justify-center mx-auto mb-4">
                    <History className="w-8 h-8 text-[var(--text-tertiary)]" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">No visits completed today</p>
                </>
              )}
            </div>
          ) : queueView === 'table' ? (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm">
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
                      <tr
                        key={item.id}
                        className="hover:bg-purple-50/30 transition-colors cursor-pointer group"
                        onClick={() => openNew(item)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-purple-50 border border-purple-200">
                              {initials(item.patient?.name || '') ? (
                                <span className="text-[11px] font-bold text-purple-700">
                                  {initials(item.patient?.name || '')}
                                </span>
                              ) : (
                                <User className="w-4 h-4 text-purple-600" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-[var(--text-primary)] text-sm truncate">{item.patient?.name}</p>
                              <p className="text-[10px] text-[var(--text-secondary)]">
                                {item.patient?.age} yrs · {item.patient?.gender}
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
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-all bg-purple-100 text-purple-700 hover:bg-purple-700 hover:text-white"
                          >
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
            </div>
          ) : (
            /* ── Queue Cards view ── */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredQueue.map(item => (
                <button
                  key={item.id}
                  onClick={() => openNew(item)}
                  className="text-left bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] hover:border-purple-400 hover:shadow-lg transition-all overflow-hidden group flex flex-col"
                >
                  {/* Header */}
                  <div className="flex items-start gap-3 p-4 pb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 border border-purple-200 flex items-center justify-center flex-shrink-0">
                      {initials(item.patient?.name || '') ? (
                        <span className="text-sm font-bold text-purple-700">
                          {initials(item.patient?.name || '')}
                        </span>
                      ) : (
                        <User className="w-5 h-5 text-purple-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                        {item.patient?.name}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] mt-0.5">
                        <span className="font-mono">#{item.patient?.folderNumber}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <StatusBadge status={item.status} />
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">
                          {item.visitType?.replace(/_/g, ' ') || 'FP'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="px-4 pb-3 flex items-center gap-3 text-[11px] text-[var(--text-secondary)]">
                    <span>{item.patient?.age} yrs</span>
                    <span className="opacity-40">·</span>
                    <span>{item.patient?.gender}</span>
                    <span className="opacity-40">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {queueTab === 'pending'
                        ? `${Math.floor((item.waitTime || 0) / 60)}h ${(item.waitTime || 0) % 60}m`
                        : (item.completedAt ? new Date(item.completedAt).toLocaleTimeString() : '—')}
                    </span>
                  </div>

                  {/* CTA */}
                  <div className="mt-auto px-4 py-2.5 bg-[var(--bg-main)] border-t border-[var(--border-color)] flex items-center justify-between text-xs font-semibold text-purple-600 group-hover:bg-purple-50 transition-colors">
                    {queueTab === 'pending' ? 'Start FP service' : 'View record'}
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ REGISTER TAB ═══════════ */}
      {activeTab === 'register' && (
        <div className="space-y-4">
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-[var(--text-tertiary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by patient name, folder number, or method…"
                className="flex-1 px-3 py-2 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:ring-2 focus:ring-purple-500 transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                  <X className="w-4 h-4" />
                </button>
              )}
              <span className="ml-2 text-[11px] text-[var(--text-tertiary)] font-medium">
                {filteredServices.length} record{filteredServices.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm">
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
                    <tr><td colSpan={8} className="px-3 py-12 text-center">
                      <Shield className="w-10 h-10 mx-auto mb-2 text-[var(--text-tertiary)] opacity-30" />
                      <p className="text-sm text-[var(--text-secondary)] font-medium">No FP services recorded in this period</p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-1">Try adjusting the date range above</p>
                    </td></tr>
                  ) : filteredServices.map(service => (
                    <tr key={service.id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="px-3 py-2.5 text-[var(--text-secondary)]">
                        {new Date(service.serviceDate).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-semibold text-[var(--text-primary)]">
                          {service.patient?.surname} {service.patient?.otherNames}
                        </p>
                        <p className="text-[10px] text-[var(--text-tertiary)] font-mono">{service.patient?.folderNumber}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700">
                          {METHOD_LABELS[service.method] || service.method}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <CategoryBadge category={service.methodCategory} />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {service.isNewAcceptor ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]">
                            NEW
                          </span>
                        ) : (
                          <span className="text-[var(--text-tertiary)]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--text-primary)]">
                        {service.providedBy?.fullName || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--text-secondary)]">
                        {service.nextFollowUpDate ? new Date(service.nextFollowUpDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-0.5 justify-center">
                          <button
                            onClick={() => handleEdit(service)}
                            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] transition-all"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(service.id)}
                            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] transition-all"
                            title="Delete"
                          >
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

      {/* ═══════════ STATISTICS TAB ═══════════ */}
      {activeTab === 'statistics' && statistics && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              title="Total Services"
              value={statistics.totalServices || 0}
              icon={Users}
              bgVar="bg-[var(--icon-purple-bg)]"
              colorVar="text-[var(--icon-purple-text)]"
            />
            <StatCard
              title="New Acceptors"
              value={statistics.newAcceptors || 0}
              icon={UserCheck}
              bgVar="bg-[var(--icon-green-bg)]"
              colorVar="text-[var(--icon-green-text)]"
            />
            <StatCard
              title="CYP (Couple-Years)"
              value={statistics.cyp || 0}
              icon={TrendingUp}
              bgVar="bg-[var(--icon-blue-bg)]"
              colorVar="text-[var(--icon-blue-text)]"
            />
            <StatCard
              title="Current Users"
              value={statistics.currentUsers || 0}
              icon={Activity}
              bgVar="bg-[var(--icon-orange-bg)]"
              colorVar="text-[var(--icon-orange-text)]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Pill className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Method Mix</h3>
              </div>
              {Object.keys(statistics.methodMix || {}).length === 0 ? (
                <p className="text-xs text-[var(--text-tertiary)] text-center py-6">No data for this period</p>
              ) : (
                <div className="space-y-2.5">
                  {Object.entries(statistics.methodMix || {}).map(([method, count]: [string, any]) => (
                    <div key={method} className="flex items-center justify-between gap-3">
                      <span className="text-xs text-[var(--text-secondary)] truncate flex-1">
                        {METHOD_LABELS[method] || method}
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-16 h-1.5 bg-[var(--bg-main)] rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, count * 10)}%` }} />
                        </div>
                        <span className="text-xs font-bold text-[var(--text-primary)] w-6 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-fuchsia-600" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Category Mix</h3>
              </div>
              {Object.keys(statistics.categoryMix || {}).length === 0 ? (
                <p className="text-xs text-[var(--text-tertiary)] text-center py-6">No data for this period</p>
              ) : (
                <div className="space-y-2.5">
                  {Object.entries(statistics.categoryMix || {}).map(([cat, count]: [string, any]) => (
                    <div key={cat} className="flex items-center justify-between gap-3">
                      <CategoryBadge category={cat} />
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-16 h-1.5 bg-[var(--bg-main)] rounded-full overflow-hidden">
                          <div className="h-full bg-fuchsia-500 rounded-full" style={{ width: `${Math.min(100, count * 10)}%` }} />
                        </div>
                        <span className="text-xs font-bold text-[var(--text-primary)] w-6 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ METHOD MIX TAB ═══════════ */}
      {activeTab === 'method-mix' && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex items-center gap-2">
            <PieChart className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Method Mix Breakdown</h3>
            <span className="ml-auto text-[11px] text-[var(--text-tertiary)]">
              {methodMix.length} method{methodMix.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Method</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Category</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Count</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Distribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {methodMix.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-12 text-center">
                    <PieChart className="w-10 h-10 mx-auto mb-2 text-[var(--text-tertiary)] opacity-30" />
                    <p className="text-sm text-[var(--text-secondary)]">No data available</p>
                  </td></tr>
                ) : methodMix.map((item, idx) => (
                  <tr key={idx} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                      {METHOD_LABELS[item.method] || item.method}
                    </td>
                    <td className="px-4 py-3">
                      <CategoryBadge category={item.category} />
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-[var(--text-primary)]">
                      {item.count}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-[var(--bg-main)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full transition-all"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-[var(--text-primary)]">
                          {item.percentage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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