// src/pages/FamilyPlanning.tsx — Enhanced UI/UX
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { confirmDialog } from '../context/ConfirmDialog';
import { useLiveRefresh } from '../api/realtime';
import { useFamilyPlanningStore } from '../store/familyPlanningStore';
import { useWorklistStore } from '../store/worklistStore';
import { WorklistViewControls } from '../components/worklist/WorklistViewControls';
import { usePatientStore } from '../store/patientStore';
import { useToast } from '../store/toastStore';
import {
  RefreshCw, X, Plus, Edit, Trash2, Eye, Calendar,
  Users, Shield, TrendingUp, Activity, AlertCircle,
  PieChart, BarChart3, Pill, Clock, CheckCircle, User,
  ShieldCheck, History, FileText, LayoutGrid, List,
  ChevronRight, Info, Heart, Baby, Syringe,
  BadgeCheck, Save, AlertTriangle, UserCheck, Stethoscope,
  Target,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  humanStatus,
  PageHeader,
  Pagination,
  SearchInput,
  Segmented,
  StatCard,
  statusTone,
  Tabs,
  TD,
  TD_MONO,
  TH,
  TH_ROW,
  TR,
  cn,
  type BadgeTone,
} from '../components/ui';

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
const CATEGORY_TONES: Record<string, BadgeTone> = {
  modern_short_acting: 'cyan',
  modern_long_acting: 'purple',
  permanent: 'red',
  traditional: 'orange',
  emergency: 'yellow',
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <Badge tone={statusTone(status)} dot size="sm">{humanStatus(status)}</Badge>
);

const CategoryBadge: React.FC<{ category: string }> = ({ category }) => (
  <Badge tone={CATEGORY_TONES[category] ?? 'blue'} size="sm">
    {CATEGORY_LABELS[category] || category?.replace(/_/g, ' ') || '—'}
  </Badge>
);

const initials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');

type QueueViewMode = 'table' | 'cards';
type FpTab = 'queue' | 'register' | 'statistics' | 'method-mix';

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
  const { createService, updateService, getClientDetails } = useFamilyPlanningStore();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [maternalEvents, setMaternalEvents] = useState<{ deliveries: any[]; postnatalRecords: any[]; abortions: any[] }>({ deliveries: [], postnatalRecords: [], abortions: [] });

  const [formData, setFormData] = useState({
    serviceDate: new Date().toISOString().split('T')[0],
    method: '',
    methodCategory: '',
    isNewAcceptor: false,
    counsellingGiven: true,
    informedConsent: false,
    sideEffects: '',
    contraindications: '',
    nextFollowUpDate: '',
    isPostpartum: false,
    isPostAbortion: false,
    postpartumWeeks: '',
    postpartumDeliveryRecordId: '',
    postnatalRecordId: '',
    postAbortionRecordId: '',
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
        informedConsent: existingService.informedConsent ?? false,
        sideEffects: existingService.sideEffects || '',
        contraindications: existingService.contraindications || '',
        nextFollowUpDate: existingService.nextFollowUpDate?.split('T')[0] || '',
        isPostpartum: existingService.isPostpartum || false,
        isPostAbortion: existingService.isPostAbortion || false,
        postpartumWeeks: existingService.postpartumWeeks?.toString() || '',
        postpartumDeliveryRecordId: existingService.postpartumDeliveryRecordId || '',
        postnatalRecordId: existingService.postnatalRecordId || '',
        postAbortionRecordId: existingService.postAbortionRecordId || '',
        notes: existingService.notes || '',
      });
    } else if (isOpen && !existingService) {
      setFormData({
        serviceDate: new Date().toISOString().split('T')[0],
        method: '',
        methodCategory: '',
        isNewAcceptor: false,
        counsellingGiven: true,
        informedConsent: false,
        sideEffects: '',
        contraindications: '',
        nextFollowUpDate: '',
        isPostpartum: false,
        isPostAbortion: false,
        postpartumWeeks: '',
        postpartumDeliveryRecordId: '',
        postnatalRecordId: '',
        postAbortionRecordId: '',
        notes: '',
      });
    }
  }, [isOpen, existingService]);

  useEffect(() => {
    if (!isOpen || !patientId) {
      setMaternalEvents({ deliveries: [], postnatalRecords: [], abortions: [] });
      return;
    }
    getClientDetails(patientId)
      .then((details: any) => setMaternalEvents(details?.maternalEvents || { deliveries: [], postnatalRecords: [], abortions: [] }))
      .catch(() => setMaternalEvents({ deliveries: [], postnatalRecords: [], abortions: [] }));
  }, [isOpen, patientId, getClientDetails]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'method' && value) {
        const cat = METHOD_CATEGORY_OF[value];
        if (cat) next.methodCategory = cat;
      }
      if (field === 'isPostpartum') {
        if (value) next.isPostAbortion = false;
        if (value) next.postAbortionRecordId = '';
        else {
          next.postpartumDeliveryRecordId = '';
          next.postnatalRecordId = '';
        }
      }
      if (field === 'isPostAbortion') {
        if (value) {
          next.isPostpartum = false;
          next.postpartumDeliveryRecordId = '';
          next.postnatalRecordId = '';
        } else {
          next.postAbortionRecordId = '';
        }
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendanceId && !existingService) { toastError('Error', 'Select a patient from the queue before recording a new family-planning service'); return; }
    setLoading(true);
    try {
      const data: any = {
        patientId,
        ...(attendanceId ? { attendanceId } : {}),
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
        postpartumDeliveryRecordId: formData.isPostpartum ? (formData.postpartumDeliveryRecordId || null) : null,
        postnatalRecordId: formData.isPostpartum ? (formData.postnatalRecordId || null) : null,
        postAbortionRecordId: formData.isPostAbortion ? (formData.postAbortionRecordId || null) : null,
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

                <p className="text-xs text-[var(--text-secondary)] rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] px-3 py-2">
                  New-acceptor status is calculated from the patient’s dated family-planning history to keep monthly returns consistent.
                </p>

                {/* Toggle grid */}
                <div className="grid grid-cols-2 gap-2">
                  {[
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
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">Link to Delivery (if recorded here)</label>
                      <select value={formData.postpartumDeliveryRecordId}
                        onChange={e => handleChange('postpartumDeliveryRecordId', e.target.value)}
                        className="w-full px-3 py-2.5 text-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg">
                        <option value="">Not linked / delivery at another facility</option>
                        {maternalEvents.deliveries.map((event: any) => (
                          <option key={event.id} value={event.id}>
                            {new Date(event.deliveryDate).toLocaleDateString()} — {String(event.deliveryType || 'Delivery').replace(/_/g, ' ')} ({String(event.deliveryOutcome || 'Outcome not recorded').replace(/_/g, ' ')})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">Link to Postnatal Visit (optional)</label>
                      <select value={formData.postnatalRecordId}
                        onChange={e => handleChange('postnatalRecordId', e.target.value)}
                        className="w-full px-3 py-2.5 text-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg">
                        <option value="">Not linked</option>
                        {maternalEvents.postnatalRecords.map((event: any) => (
                          <option key={event.id} value={event.id}>
                            {new Date(event.examinationDate).toLocaleDateString()} — Postnatal visit{event.familyPlanningMethodAccepted ? '; FP: ' + event.familyPlanningMethodAccepted : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">Postpartum Weeks</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.postpartumWeeks}
                      onChange={e => handleChange('postpartumWeeks', e.target.value)}
                      placeholder="e.g. 6"
                      className="w-full px-3 py-2.5 text-sm text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    />
                    </div>
                  </div>
                )}

                {formData.isPostAbortion && (
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">Link to Abortion Record (if recorded here)</label>
                    <select value={formData.postAbortionRecordId}
                      onChange={e => handleChange('postAbortionRecordId', e.target.value)}
                      className="w-full px-3 py-2.5 text-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg">
                      <option value="">Not linked / event at another facility</option>
                      {maternalEvents.abortions.map((event: any) => (
                        <option key={event.id} value={event.id}>
                          {new Date(event.abortionDate).toLocaleDateString()} — {String(event.abortionType || 'Abortion').replace(/_/g, ' ')}
                          {event.postAbortionFPAccepted ? '; accepted ' + (event.fpMethodAccepted || 'method') : ''}
                        </option>
                      ))}
                    </select>
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
  const { worklistItems, fetchWorklist, view, isLoading: worklistLoading } = useWorklistStore();

  const [activeTab, setActiveTab] = useState<FpTab>('queue');
  const [queueView, setQueueView] = useState<QueueViewMode>(() => {
    const saved = localStorage.getItem('fpQueueView');
    return (saved as QueueViewMode) || 'table';
  });
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string>('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [queuePage, setQueuePage] = useState(1);
  const [registerPage, setRegisterPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => { loadPatients(); }, []);

  useEffect(() => {
    localStorage.setItem('fpQueueView', queueView);
  }, [queueView]);

  useEffect(() => {
    // The register count is shown in the header and on the tab from every section,
    // so services are loaded on arrival rather than only after opening the register.
    getServices({ startDate: dateRange.start, endDate: dateRange.end });
    if (activeTab === 'queue') {
      fetchWorklist('maternal').catch(() => {});
    } else if (activeTab === 'statistics') {
      getStatistics({ startDate: dateRange.start, endDate: dateRange.end });
    } else if (activeTab === 'method-mix') {
      getMethodMix({ startDate: dateRange.start, endDate: dateRange.end });
    }
  }, [activeTab, dateRange]);

  // The waiting list is live: a client must leave it as soon as their service is recorded.
  useLiveRefresh(['encounters', 'nursing'], () => {
    if (activeTab === 'queue') {
      fetchWorklist('maternal', { silent: true }).catch(() => {});
    }
  });

  // The server answers each view separately: open visits, recently closed visits, and closed
  // visits still owing an investigation. Only the search term narrows the list here.
  const filteredQueue = useMemo(() => {
    if (!searchQuery) return worklistItems;
    const q = searchQuery.toLowerCase();
    return worklistItems.filter(i =>
      i.patient?.name?.toLowerCase().includes(q) ||
      i.patient?.folderNumber?.toLowerCase().includes(q) ||
      i.attendanceNumber?.toLowerCase().includes(q)
    );
  }, [worklistItems, searchQuery]);

  const filteredServices = useMemo(() => {
    if (!searchQuery) return services;
    const q = searchQuery.toLowerCase();
    return services.filter(s =>
      s.patient?.surname?.toLowerCase().includes(q) ||
      s.patient?.otherNames?.toLowerCase().includes(q) ||
      s.patient?.folderNumber?.toLowerCase().includes(q) ||
      s.attendance?.attendanceNumber?.toLowerCase().includes(q) ||
      METHOD_LABELS[s.method]?.toLowerCase().includes(q)
    );
  }, [services, searchQuery]);

  const selectedPatient = patients.find(p => (p as any).id === selectedPatientId || (p as any)._id === selectedPatientId) || null;

  const queueTotalPages = Math.ceil(filteredQueue.length / itemsPerPage);
  const paginatedQueue = filteredQueue.slice((queuePage - 1) * itemsPerPage, queuePage * itemsPerPage);
  const registerTotalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const paginatedServices = filteredServices.slice((registerPage - 1) * itemsPerPage, registerPage * itemsPerPage);

  useEffect(() => { setQueuePage(1); }, [view, searchQuery]);
  useEffect(() => { setRegisterPage(1); }, [searchQuery, dateRange.start, dateRange.end]);

  const isDone = view === 'completed';
  const isOutstanding = view === 'outstanding';
  const viewLabel = isDone ? 'Completed' : isOutstanding ? 'Awaiting' : 'Waiting';

  const stats = {
    inQueue: worklistItems.length,
    highRisk: worklistItems.filter((i: any) => i.riskLevel === 'high').length,
    urgent: worklistItems.filter((i: any) => i.priority === 'urgent' || i.priority === 'stat').length,
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

  // The waiting list is the entry point for a new service; a closed visit opens its record instead.
  const handleQueueClick = (item: any) => {
    if (view === 'pending') {
      openNew(item);
      return;
    }
    navigate(`/dashboard/maternal/${item.attendanceId}`);
  };

  const handleEdit = (service: any) => {
    setEditingService(service);
    setSelectedAttendanceId(service.attendanceId);
    setSelectedPatientId(service.patientId);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog({ title: 'Delete FP record', message: 'Delete this FP service record?', confirmText: 'Delete' }))) return;
    try {
      await deleteService(id);
      success('Deleted', 'FP service deleted');
      getServices({ startDate: dateRange.start, endDate: dateRange.end });
    } catch (err: any) { toastError('Delete failed', err.message); }
  };

  const handleModalSuccess = () => {
    const recordedNewService = !editingService;
    setShowModal(false);
    setEditingService(null);
    fetchWorklist('maternal').catch(() => {});
    getServices({ startDate: dateRange.start, endDate: dateRange.end });
    // A service recorded from the waiting list is the hand-off point: show it in the register
    // so the clinician can confirm what was saved instead of hunting for the row.
    if (recordedNewService) setActiveTab('register');
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
      <PageHeader
        title="Family Planning"
        subtitle="Waiting list, service register and monthly returns in one flow"
        meta={`${stats.inQueue} ${viewLabel.toLowerCase()} • ${services.length} service${services.length === 1 ? '' : 's'} this period`}
        icon={ShieldCheck}
        accent="purple"
        backTo="/dashboard"
        actions={(
          <>
            <Button variant="secondary" icon={Plus} onClick={() => setActiveTab('queue')}>Select Client</Button>
            <Button
              icon={RefreshCw}
              loading={worklistLoading}
              onClick={() => activeTab === 'queue'
                ? fetchWorklist('maternal')
                : getServices({ startDate: dateRange.start, endDate: dateRange.end })}
            >
              Refresh
            </Button>
          </>
        )}
        tabs={(
          <Tabs<FpTab>
            tabs={[
              { key: 'queue', label: 'Waiting List', icon: Users, count: view === 'pending' ? stats.inQueue : undefined },
              { key: 'register', label: 'Service Register', icon: FileText, count: services.length },
              { key: 'statistics', label: 'Statistics', icon: BarChart3 },
              { key: 'method-mix', label: 'Method Mix', icon: PieChart },
            ]}
            active={activeTab}
            onChange={setActiveTab}
            accent="purple"
            aria-label="Family planning sections"
          />
        )}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label={isDone ? 'Completed' : isOutstanding ? 'Awaiting Results' : 'Waiting'}
          value={stats.inQueue}
          icon={Users}
          accent="cyan"
          hint={isDone ? 'Visits closed in the last 72 hours' : isOutstanding ? 'Closed visits still owing an investigation' : 'Pending FP service'}
          onClick={() => setActiveTab('queue')}
        />
        <StatCard
          label="High Risk"
          value={stats.highRisk}
          icon={AlertCircle}
          accent="red"
          hint={stats.highRisk > 0 ? 'Needs priority attention' : 'None flagged'}
          onClick={() => setActiveTab('queue')}
        />
        <StatCard
          label="Urgent / STAT"
          value={stats.urgent}
          icon={AlertTriangle}
          accent="orange"
          hint="Priority clients in this list"
          onClick={() => setActiveTab('queue')}
        />
        <StatCard
          label="This Period"
          value={stats.totalMonth}
          icon={TrendingUp}
          accent="green"
          hint="Services recorded"
          onClick={() => setActiveTab('register')}
        />
      </div>

      {/* ── Period filter (register and reports) ── */}
      {activeTab !== 'queue' && (
        <Card>
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
            <span className="ml-auto text-xs text-[var(--text-tertiary)]">
              {activeTab === 'register' ? `${filteredServices.length} record${filteredServices.length === 1 ? '' : 's'}` : 'Report period'}
            </span>
          </div>
        </Card>
      )}

      {/* ═══════════ QUEUE TAB ═══════════ */}
      {activeTab === 'queue' && (
        <div className="space-y-3">
          {/* To do, completed, and the requests still owed on visits already closed */}
          <Card>
            <WorklistViewControls department="maternal" />
          </Card>

          <Card>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <SearchInput
                className="flex-1"
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by patient name, folder number, or attendance number…"
              />
              <Segmented
                options={[
                  { value: 'table', label: 'Table', icon: List },
                  { value: 'cards', label: 'Cards', icon: LayoutGrid },
                ]}
                value={queueView}
                onChange={setQueueView}
                accent="purple"
                aria-label="Queue layout"
              />
            </div>
          </Card>

          {/* Queue content */}
          {filteredQueue.length === 0 ? (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-12 text-center shadow-sm">
              {isOutstanding ? (
                <>
                  <div className="w-16 h-16 bg-[var(--icon-green-bg)] rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-[var(--icon-green-text)]" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">No closed visit is owing a result</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">Every investigation requested before discharge has been answered</p>
                </>
              ) : isDone ? (
                <>
                  <div className="w-16 h-16 bg-[var(--bg-main)] rounded-full flex items-center justify-center mx-auto mb-4">
                    <History className="w-8 h-8 text-[var(--text-tertiary)]" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">No visits completed in the last 72 hours</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-[var(--icon-green-bg)] rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-[var(--icon-green-text)]" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">All caught up</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">No patients waiting for FP service</p>
                </>
              )}
            </div>
          ) : queueView === 'table' ? (
            <Card padded={false}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className={TH_ROW}>
                    <tr>
                      <th className={TH}>Patient</th>
                      <th className={TH}>Folder #</th>
                      <th className={TH}>Attendance #</th>
                      <th className={TH}>Visit date</th>
                      <th className={TH}>Visit type</th>
                      <th className={TH}>Status</th>
                      <th className={TH}>{isDone ? 'Completed' : isOutstanding ? 'Owed' : 'Waiting'}</th>
                      <th className={cn(TH, 'text-center')}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedQueue.map((item: any) => (
                      <tr
                        key={item.id}
                        className={cn(TR, 'cursor-pointer')}
                        onClick={() => handleQueueClick(item)}
                      >
                        <td className={TD}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--icon-purple-bg)]">
                              {initials(item.patient?.name || '') ? (
                                <span className="text-[11px] font-bold text-[var(--icon-purple-text)]">
                                  {initials(item.patient?.name || '')}
                                </span>
                              ) : (
                                <User className="w-4 h-4 text-[var(--icon-purple-text)]" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-[var(--text-primary)] text-sm truncate">{item.patient?.name}</p>
                              <p className="text-xs text-[var(--text-secondary)]">
                                {item.patient?.age} years • {item.patient?.gender}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className={TD_MONO}>{item.patient?.folderNumber || '—'}</td>
                        <td className={TD_MONO}>{item.attendanceNumber || '—'}</td>
                        <td className={cn(TD, 'text-xs text-[var(--text-secondary)]')}>
                          {item.attendanceDateTime ? new Date(item.attendanceDateTime).toLocaleString() : '—'}
                        </td>
                        <td className={TD}>
                          {item.visitType ? (
                            <Badge tone="cyan" size="sm">{item.visitType.replace(/_/g, ' ')}</Badge>
                          ) : (
                            <span className="text-[var(--text-tertiary)]">—</span>
                          )}
                        </td>
                        <td className={TD}><StatusBadge status={isOutstanding ? item.attendanceStatus : item.status} /></td>
                        <td className={cn(TD, 'text-xs text-[var(--text-secondary)]')}>
                          {isOutstanding ? (
                            <div className="text-xs">
                              <p className="font-medium text-[var(--text-primary)] max-w-[200px] truncate">
                                {(item.outstanding || []).map((o: any) => o.name).join(', ') || '—'}
                              </p>
                              <p className="text-[10px] text-[var(--text-tertiary)]">
                                {item.outstandingCount || 0} owed · closed {Math.floor((item.waitTime || 0) / 60)}h {(item.waitTime || 0) % 60}m ago
                              </p>
                            </div>
                          ) : isDone ? (
                            item.completedAt ? new Date(item.completedAt).toLocaleTimeString() : '—'
                          ) : (
                            `${Math.floor((item.waitTime || 0) / 60)}h ${(item.waitTime || 0) % 60}m`
                          )}
                        </td>
                        <td className={cn(TD, 'text-center')}>
                          <Button
                            size="sm"
                            variant="soft"
                            accent={isDone ? 'blue' : isOutstanding ? 'orange' : 'purple'}
                            icon={isDone || isOutstanding ? FileText : Eye}
                            className="mx-auto"
                            onClick={e => { e.stopPropagation(); handleQueueClick(item); }}
                          >
                            {isDone ? 'View Record' : isOutstanding ? 'View Visit' : 'Start FP'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            /* ── Queue Cards view ── */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {paginatedQueue.map((item: any) => (
                <button
                  key={item.id}
                  onClick={() => handleQueueClick(item)}
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
                        <span className="font-mono">· {item.attendanceNumber || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <StatusBadge status={isOutstanding ? item.attendanceStatus : item.status} />
                        {item.visitType && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">
                            {item.visitType.replace(/_/g, ' ')}
                          </span>
                        )}
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
                      {isOutstanding
                        ? `${item.outstandingCount || 0} owed`
                        : isDone
                          ? (item.completedAt ? new Date(item.completedAt).toLocaleTimeString() : 'Completed')
                          : `${Math.floor((item.waitTime || 0) / 60)}h ${(item.waitTime || 0) % 60}m`}
                    </span>
                  </div>

                  {/* CTA */}
                  <div className="mt-auto px-4 py-2.5 bg-[var(--bg-main)] border-t border-[var(--border-color)] flex items-center justify-between text-xs font-semibold text-purple-600 group-hover:bg-purple-50 transition-colors">
                    {isDone ? 'View record' : isOutstanding ? 'View visit' : 'Start FP service'}
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          )}

          <Pagination
            page={queuePage}
            totalPages={queueTotalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredQueue.length}
            noun="clients"
            onChange={setQueuePage}
          />
        </div>
      )}

      {/* ═══════════ SERVICE REGISTER TAB ═══════════ */}
      {activeTab === 'register' && (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <SearchInput
                className="flex-1"
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by patient name, folder number, or method…"
              />
              <span className="text-xs text-[var(--text-tertiary)] whitespace-nowrap">
                {filteredServices.length} record{filteredServices.length !== 1 ? 's' : ''}
              </span>
            </div>
          </Card>

          <Card title={`Service Register (${filteredServices.length})`} icon={FileText} accent="purple" padded={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={TH_ROW}>
                  <tr>
                    <th className={TH}>Date</th>
                    <th className={TH}>Patient</th>
                    <th className={TH}>Folder #</th>
                    <th className={TH}>Attendance #</th>
                    <th className={TH}>Method</th>
                    <th className={TH}>Category</th>
                    <th className={cn(TH, 'text-center')}>New</th>
                    <th className={TH}>Provider</th>
                    <th className={TH}>Follow-up</th>
                    <th className={cn(TH, 'text-center')}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.length === 0 ? (
                    <tr><td colSpan={10} className="px-3 py-12 text-center">
                      <Shield className="w-10 h-10 mx-auto mb-2 text-[var(--text-tertiary)] opacity-30" />
                      <p className="text-sm text-[var(--text-secondary)] font-medium">No FP services recorded in this period</p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-1">Try adjusting the date range above</p>
                    </td></tr>
                  ) : paginatedServices.map(service => (
                    <tr key={service.id} className={TR}>
                      <td className={cn(TD, 'text-[var(--text-secondary)]')}>
                        {new Date(service.serviceDate).toLocaleDateString()}
                      </td>
                      <td className={TD}>
                        <p className="font-medium text-[var(--text-primary)]">
                          {service.patient?.surname} {service.patient?.otherNames}
                        </p>
                      </td>
                      <td className={TD_MONO}>{service.patient?.folderNumber || '—'}</td>
                      <td className={TD_MONO}>{service.attendance?.attendanceNumber || '—'}</td>
                      <td className={TD}>
                        <Badge tone="purple" size="sm">{METHOD_LABELS[service.method] || service.method}</Badge>
                      </td>
                      <td className={TD}><CategoryBadge category={service.methodCategory} /></td>
                      <td className={cn(TD, 'text-center')}>
                        {service.isNewAcceptor ? (
                          <Badge tone="green" size="sm">NEW</Badge>
                        ) : (
                          <span className="text-[var(--text-tertiary)]">—</span>
                        )}
                      </td>
                      <td className={TD}>{service.providedBy?.fullName || '—'}</td>
                      <td className={cn(TD, 'text-[var(--text-secondary)]')}>
                        {service.nextFollowUpDate ? new Date(service.nextFollowUpDate).toLocaleDateString() : '—'}
                      </td>
                      <td className={cn(TD, 'text-center')}>
                        <div className="flex gap-1 justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            iconOnly
                            icon={Edit}
                            aria-label="Edit service"
                            onClick={() => handleEdit(service)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            iconOnly
                            icon={Trash2}
                            aria-label="Delete service"
                            className="hover:text-[var(--icon-red-text)]"
                            onClick={() => handleDelete(service.id)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Pagination
            page={registerPage}
            totalPages={registerTotalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredServices.length}
            noun="records"
            onChange={setRegisterPage}
          />
        </div>
      )}

      {/* ═══════════ STATISTICS TAB ═══════════ */}
      {activeTab === 'statistics' && statistics && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total Services" value={statistics.totalServices || 0} icon={Users} accent="purple" />
            <StatCard label="New Acceptors" value={statistics.newAcceptors || 0} icon={UserCheck} accent="green" />
            <StatCard label="CYP (Couple-Years)" value={statistics.cyp || 0} icon={TrendingUp} accent="blue" />
            <StatCard label="Current Users" value={statistics.currentUsers || 0} icon={Activity} accent="orange" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card title="Method Mix" icon={Pill} accent="purple">
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
            </Card>

            <Card title="Category Mix" icon={BarChart3} accent="purple">
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
            </Card>
          </div>

          <Button variant="secondary" icon={FileText} onClick={() => setActiveTab('register')}>
            Open the register for this period
          </Button>
        </div>
      )}

      {/* ═══════════ METHOD MIX TAB ═══════════ */}
      {activeTab === 'method-mix' && (
        <div className="space-y-4">
          <Card
            title={`Method Mix Breakdown (${methodMix.length} method${methodMix.length === 1 ? '' : 's'})`}
            icon={PieChart}
            accent="purple"
            padded={false}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={TH_ROW}>
                  <tr>
                    <th className={TH}>Method</th>
                    <th className={TH}>Category</th>
                    <th className={cn(TH, 'text-center')}>Count</th>
                    <th className={TH}>Distribution</th>
                  </tr>
                </thead>
                <tbody>
                  {methodMix.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-12 text-center">
                      <PieChart className="w-10 h-10 mx-auto mb-2 text-[var(--text-tertiary)] opacity-30" />
                      <p className="text-sm text-[var(--text-secondary)]">No data available</p>
                    </td></tr>
                  ) : methodMix.map((item, idx) => (
                    <tr key={idx} className={TR}>
                      <td className={TD}>{METHOD_LABELS[item.method] || item.method}</td>
                      <td className={TD}><CategoryBadge category={item.category} /></td>
                      <td className={cn(TD, 'text-center font-semibold')}>{item.count}</td>
                      <td className={TD}>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 bg-[var(--bg-main)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full transition-all"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-[var(--text-primary)]">
                            {item.percentage}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Button variant="secondary" icon={BarChart3} onClick={() => setActiveTab('statistics')}>
            Back to statistics
          </Button>
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