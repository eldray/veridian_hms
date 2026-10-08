// src/components/antenatal/ANCVisitModal.tsx — Enhanced UI/UX
import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Heart, Ruler, Weight, Syringe, AlertTriangle, Droplet,
  Calendar, Activity, Baby, ClipboardList, Shield, Send,
  FileText, CheckCircle2, ChevronRight, ChevronLeft,
  Info, Stethoscope, Save, AlertCircle, Thermometer,
  Eye, CircleDot, Plus, BadgeCheck, MapPin, Hospital,
  TestTube, TrendingUp, AlertOctagon,
} from 'lucide-react';
import { useAntenatalStore } from '../../store/antenatalStore';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../store/toastStore';

interface ANCVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  attendanceId: string;
  bookingId: string;
  visitNumber?: number;
  existingVisit?: any;
}

const DANGER_SIGNS_OPTIONS = [
  'Severe headache',
  'Blurred vision',
  'Convulsions',
  'Severe abdominal pain',
  'Vaginal bleeding',
  'Fever',
  'Reduced fetal movement',
  'Breathlessness',
  'Swelling of hands/face',
  'Ruptured membranes',
  'Prolonged labor',
];

// Group danger signs by category for better clinical scanning
const DANGER_SIGN_GROUPS = {
  'Neurological': ['Severe headache', 'Blurred vision', 'Convulsions'],
  'Obstetric': ['Vaginal bleeding', 'Ruptured membranes', 'Prolonged labor', 'Reduced fetal movement'],
  'Systemic': ['Fever', 'Breathlessness', 'Severe abdominal pain', 'Swelling of hands/face'],
};

const PRESENTATION_OPTIONS = [
  { value: 'cephalic', label: 'Cephalic', description: 'Head down (normal)', color: 'green' },
  { value: 'breech', label: 'Breech', description: 'Feet/buttocks first', color: 'yellow' },
  { value: 'transverse', label: 'Transverse', description: 'Sideways lie', color: 'orange' },
  { value: 'oblique', label: 'Oblique', description: 'Diagonal lie', color: 'red' },
];

type TabKey = 'assessment' | 'preventions' | 'alerts';

const TABS: { key: TabKey; label: string; icon: React.ElementType; description: string }[] = [
  { key: 'assessment', label: 'Assessment', icon: Stethoscope, description: 'Maternal & fetal measurements' },
  { key: 'preventions', label: 'Preventions', icon: Syringe, description: 'Vaccines, supplements & treatment' },
  { key: 'alerts', label: 'Alerts & Referral', icon: AlertTriangle, description: 'Danger signs, referral & notes' },
];

// ── Helpers ──
const isBPElevated = (bp: string): 'normal' | 'elevated' | 'critical' | 'unknown' => {
  if (!bp || !bp.includes('/')) return 'unknown';
  const [sys, dia] = bp.split('/').map(n => parseInt(n.trim()));
  if (isNaN(sys) || isNaN(dia)) return 'unknown';
  if (sys >= 160 || dia >= 110) return 'critical';
  if (sys >= 140 || dia >= 90) return 'elevated';
  return 'normal';
};

const isFHRAbnormal = (fhr: string | number): 'normal' | 'low' | 'high' | 'unknown' => {
  const n = Number(fhr);
  if (!n) return 'unknown';
  if (n < 110) return 'low';
  if (n > 160) return 'high';
  return 'normal';
};

// Fundal height vs GA check (±3cm tolerance)
const checkFundalHeight = (fh: number | string, gaWeeks: number | string): 'ok' | 'low' | 'high' | 'unknown' => {
  const f = Number(fh);
  const g = Number(gaWeeks);
  if (!f || !g) return 'unknown';
  const diff = f - g;
  if (diff < -3) return 'low';
  if (diff > 3) return 'high';
  return 'ok';
};

export const ANCVisitModal: React.FC<ANCVisitModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  attendanceId,
  bookingId,
  visitNumber = 1,
  existingVisit,
}) => {
  const { recordANCVisit, updateANCVisit } = useAntenatalStore();
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('assessment');

  const isEditing = !!existingVisit;

  const [formData, setFormData] = useState({
    visitDate: existingVisit?.visitDate?.split('T')[0] || new Date().toISOString().split('T')[0],
    gestationalAgeWeeks: existingVisit?.gestationalAgeWeeks || '',
    gestationalAgeDays: existingVisit?.gestationalAgeDays || '',

    weight: existingVisit?.weight || '',
    bloodPressure: existingVisit?.bloodPressure || '',
    fundalHeight: existingVisit?.fundalHeight || '',
    fetalHeartRate: existingVisit?.fetalHeartRate || '',
    presentation: existingVisit?.presentation || '',

    iptpGiven: existingVisit?.iptpGiven || false,
    iptpDoseNumber: existingVisit?.iptpDoseNumber || 1,
    ttGiven: existingVisit?.ttGiven || false,
    ttDoseNumber: existingVisit?.ttDoseNumber || 1,
    ironGiven: existingVisit?.ironGiven || false,
    folateGiven: existingVisit?.folateGiven || false,
    itnGiven: existingVisit?.itnGiven || false,

    malariaTestDone: existingVisit?.malariaTestDone || false,
    malariaTestResult: existingVisit?.malariaTestResult || '',
    malariaTreatmentGiven: existingVisit?.malariaTreatmentGiven || false,

    dangerSignsPresent: existingVisit?.dangerSignsPresent || false,
    dangerSignsList: existingVisit?.dangerSignsList || [] as string[],

    referralMade: existingVisit?.referralMade || false,
    referredTo: existingVisit?.referredTo || '',
    referralReason: existingVisit?.referralReason || '',

    notes: existingVisit?.notes || '',
  });

  // Reset active tab when modal opens
  useEffect(() => {
    if (isOpen) setActiveTab('assessment');
  }, [isOpen]);

  // Load existing visit data when it changes
  useEffect(() => {
    if (isOpen && existingVisit) {
      setFormData({
        visitDate: existingVisit.visitDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        gestationalAgeWeeks: existingVisit.gestationalAgeWeeks || '',
        gestationalAgeDays: existingVisit.gestationalAgeDays || '',
        weight: existingVisit.weight || '',
        bloodPressure: existingVisit.bloodPressure || '',
        fundalHeight: existingVisit.fundalHeight || '',
        fetalHeartRate: existingVisit.fetalHeartRate || '',
        presentation: existingVisit.presentation || '',
        iptpGiven: existingVisit.iptpGiven || false,
        iptpDoseNumber: existingVisit.iptpDoseNumber || 1,
        ttGiven: existingVisit.ttGiven || false,
        ttDoseNumber: existingVisit.ttDoseNumber || 1,
        ironGiven: existingVisit.ironGiven || false,
        folateGiven: existingVisit.folateGiven || false,
        itnGiven: existingVisit.itnGiven || false,
        malariaTestDone: existingVisit.malariaTestDone || false,
        malariaTestResult: existingVisit.malariaTestResult || '',
        malariaTreatmentGiven: existingVisit.malariaTreatmentGiven || false,
        dangerSignsPresent: existingVisit.dangerSignsPresent || false,
        dangerSignsList: existingVisit.dangerSignsList || [],
        referralMade: existingVisit.referralMade || false,
        referredTo: existingVisit.referredTo || '',
        referralReason: existingVisit.referralReason || '',
        notes: existingVisit.notes || '',
      });
    } else if (isOpen && !existingVisit) {
      setFormData({
        visitDate: new Date().toISOString().split('T')[0],
        gestationalAgeWeeks: '',
        gestationalAgeDays: '',
        weight: '',
        bloodPressure: '',
        fundalHeight: '',
        fetalHeartRate: '',
        presentation: '',
        iptpGiven: false,
        iptpDoseNumber: 1,
        ttGiven: false,
        ttDoseNumber: 1,
        ironGiven: false,
        folateGiven: false,
        itnGiven: false,
        malariaTestDone: false,
        malariaTestResult: '',
        malariaTreatmentGiven: false,
        dangerSignsPresent: false,
        dangerSignsList: [],
        referralMade: false,
        referredTo: '',
        referralReason: '',
        notes: '',
      });
    }
  }, [isOpen, existingVisit]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDangerSignsChange = (sign: string, checked: boolean) => {
    const current = [...formData.dangerSignsList];
    if (checked) current.push(sign);
    else {
      const i = current.indexOf(sign);
      if (i > -1) current.splice(i, 1);
    }
    setFormData(prev => ({ ...prev, dangerSignsList: current }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const toDateTime = (dateStr: string) =>
        dateStr ? new Date(dateStr).toISOString() : undefined;

      if (isEditing && existingVisit?.id) {
        const updateData: any = {};
        if (formData.visitDate) updateData.visitDate = toDateTime(formData.visitDate);
        if (formData.gestationalAgeWeeks) updateData.gestationalAgeWeeks = parseInt(formData.gestationalAgeWeeks);
        if (formData.gestationalAgeDays) updateData.gestationalAgeDays = parseInt(formData.gestationalAgeDays);
        if (formData.weight) updateData.weight = parseFloat(formData.weight);
        if (formData.bloodPressure) updateData.bloodPressure = formData.bloodPressure;
        if (formData.fundalHeight) updateData.fundalHeight = parseFloat(formData.fundalHeight);
        if (formData.fetalHeartRate) updateData.fetalHeartRate = parseInt(formData.fetalHeartRate);
        if (formData.presentation) updateData.presentation = formData.presentation;

        updateData.iptpGiven = formData.iptpGiven;
        if (formData.iptpGiven) updateData.iptpDoseNumber = formData.iptpDoseNumber;

        updateData.ttGiven = formData.ttGiven;
        if (formData.ttGiven) updateData.ttDoseNumber = formData.ttDoseNumber;

        updateData.itnGiven = formData.itnGiven;
        updateData.ironGiven = formData.ironGiven;
        updateData.folateGiven = formData.folateGiven;

        updateData.malariaTestDone = formData.malariaTestDone;
        if (formData.malariaTestResult) updateData.malariaTestResult = formData.malariaTestResult;
        updateData.malariaTreatmentGiven = formData.malariaTreatmentGiven;

        updateData.dangerSignsPresent = formData.dangerSignsPresent;
        if (formData.dangerSignsList.length > 0) updateData.dangerSignsList = formData.dangerSignsList;

        updateData.referralMade = formData.referralMade;
        if (formData.referredTo) updateData.referredTo = formData.referredTo;
        if (formData.referralReason) updateData.referralReason = formData.referralReason;

        if (formData.notes) updateData.notes = formData.notes;

        await updateANCVisit(existingVisit.id, updateData);
        success('Success', 'ANC visit updated successfully');
      } else {
        const createData = {
          bookingId,
          attendanceId,
          visitNumber,
          visitDate: toDateTime(formData.visitDate),
          gestationalAgeWeeks: formData.gestationalAgeWeeks ? parseInt(formData.gestationalAgeWeeks) : undefined,
          gestationalAgeDays: formData.gestationalAgeDays ? parseInt(formData.gestationalAgeDays) : undefined,
          weight: formData.weight ? parseFloat(formData.weight) : undefined,
          bloodPressure: formData.bloodPressure || undefined,
          fundalHeight: formData.fundalHeight ? parseFloat(formData.fundalHeight) : undefined,
          fetalHeartRate: formData.fetalHeartRate ? parseInt(formData.fetalHeartRate) : undefined,
          presentation: formData.presentation || undefined,
          iptpGiven: formData.iptpGiven,
          iptpDoseNumber: formData.iptpGiven ? formData.iptpDoseNumber : undefined,
          ttGiven: formData.ttGiven,
          ttDoseNumber: formData.ttGiven ? formData.ttDoseNumber : undefined,
          ironGiven: formData.ironGiven,
          folateGiven: formData.folateGiven,
          itnGiven: formData.itnGiven,
          malariaTestDone: formData.malariaTestDone,
          malariaTestResult: formData.malariaTestResult || undefined,
          malariaTreatmentGiven: formData.malariaTreatmentGiven,
          dangerSignsPresent: formData.dangerSignsPresent,
          dangerSignsList: formData.dangerSignsList.length > 0 ? formData.dangerSignsList : undefined,
          referralMade: formData.referralMade,
          referredTo: formData.referredTo || undefined,
          referralReason: formData.referralReason || undefined,
          notes: formData.notes || undefined,
          recordedById: user?.id,
        };

        await recordANCVisit(createData);
        success('Success', 'ANC visit recorded successfully');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toastError('Error', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Derived ──
  const bpStatus = isBPElevated(formData.bloodPressure);
  const fhrStatus = isFHRAbnormal(formData.fetalHeartRate);
  const fhStatus = checkFundalHeight(formData.fundalHeight, formData.gestationalAgeWeeks);
  const hasCriticalVitals = bpStatus === 'critical' || fhrStatus === 'low' || fhrStatus === 'high';
  const totalDangerSigns = formData.dangerSignsList.length;

  // Tab completion %
  const tabProgress = useMemo(() => {
    const assessment = [
      !!formData.visitDate,
      !!formData.gestationalAgeWeeks,
      !!formData.bloodPressure,
      !!formData.weight,
      !!formData.fetalHeartRate,
    ];
    const preventions = [
      formData.iptpGiven || formData.ttGiven || formData.ironGiven || formData.folateGiven,
    ];
    const alerts = [
      !formData.dangerSignsPresent || formData.dangerSignsList.length > 0,
      !formData.referralMade || !!formData.referredTo,
    ];
    const pct = (arr: boolean[]) => Math.round((arr.filter(Boolean).length / arr.length) * 100);
    return {
      assessment: pct(assessment),
      preventions: pct(preventions),
      alerts: pct(alerts),
    } as Record<TabKey, number>;
  }, [formData]);

  const currentTabIndex = TABS.findIndex(t => t.key === activeTab);
  const goNext = () => {
    const n = TABS[currentTabIndex + 1];
    if (n) setActiveTab(n.key);
  };
  const goPrev = () => {
    const p = TABS[currentTabIndex - 1];
    if (p) setActiveTab(p.key);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
        <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col overflow-hidden">

        {/* ───── Header ───── */}
        <div className="relative bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 px-6 py-5 text-white flex-shrink-0">
          {/* Decorative accent */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-400 via-cyan-400 to-transparent" />

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-teal-500/15 border border-teal-400/30 flex items-center justify-center flex-shrink-0">
                <Stethoscope className="w-6 h-6 text-teal-300" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold truncate text-white">
                  {isEditing ? 'Edit ANC Visit' : `Record ANC Visit #${visitNumber}`}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isEditing
                    ? 'Update antenatal visit information'
                    : "Record today's antenatal assessment"}
                </p>
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

          {/* Live summary strip */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Gestation</p>
              <p className="text-sm font-bold text-white">
                {formData.gestationalAgeWeeks
                  ? `${formData.gestationalAgeWeeks}w${formData.gestationalAgeDays ? ` ${formData.gestationalAgeDays}d` : ''}`
                  : '—'}
              </p>
            </div>
            <div className="bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">BP</p>
              <p className="text-sm font-bold flex items-center gap-1 text-white">
                {formData.bloodPressure || '—'}
                {bpStatus === 'critical' && <AlertCircle className="w-3 h-3 text-red-400" />}
                {bpStatus === 'elevated' && <AlertCircle className="w-3 h-3 text-yellow-400" />}
              </p>
            </div>
            <div className="bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">FHR</p>
              <p className="text-sm font-bold flex items-center gap-1 text-white">
                {formData.fetalHeartRate ? `${formData.fetalHeartRate} bpm` : '—'}
                {fhrStatus !== 'normal' && fhrStatus !== 'unknown' && (
                  <AlertCircle className="w-3 h-3 text-red-400" />
                )}
              </p>
            </div>
            <div className="bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Danger Signs</p>
              <p className="text-sm font-bold flex items-center gap-1 text-white">
                {totalDangerSigns > 0 ? `${totalDangerSigns} flagged` : 'None'}
                {totalDangerSigns > 0 && <AlertOctagon className="w-3 h-3 text-red-400" />}
              </p>
            </div>
          </div>

          {/* Critical vital warning banner */}
          {hasCriticalVitals && (
            <div className="mt-3 flex items-center gap-2 bg-red-500/20 border border-red-400/40 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 text-red-300 flex-shrink-0" />
              <p className="text-xs font-semibold text-red-200">
                Critical vitals detected — consider escalation or referral
              </p>
            </div>
          )}
        </div>

          {/* ───── Tabs ───── */}
          <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-main)] flex-shrink-0 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              const progress = tabProgress[tab.key];
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 min-w-[150px] px-4 py-3 text-sm font-medium flex items-center gap-2.5 transition-all relative ${
                    isActive
                      ? 'text-pink-600 bg-[var(--bg-card)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]/50'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                    isActive ? 'bg-pink-100 text-pink-600' : 'bg-[var(--bg-card)] text-[var(--text-tertiary)]'
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate">{tab.label}</span>
                      {progress === 100 && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="flex-1 h-1 bg-[var(--border-color)] rounded-full overflow-hidden max-w-[80px]">
                        <div
                          className={`h-full rounded-full transition-all ${
                            progress === 100 ? 'bg-green-500' : 'bg-pink-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-[var(--text-tertiary)]">{progress}%</span>
                    </div>
                  </div>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* ───── Form ───── */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6">

              {/* Tab header */}
              <div className="mb-5 pb-4 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                  {React.createElement(TABS[currentTabIndex].icon, {
                    className: 'w-4 h-4 text-pink-600',
                  })}
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {TABS[currentTabIndex].label}
                  </h3>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {TABS[currentTabIndex].description}
                </p>
              </div>

              {/* ───── TAB 1: ASSESSMENT ───── */}
              {activeTab === 'assessment' && (
                <div className="space-y-6">
                  {/* Visit date & GA */}
                  <div className="bg-pink-50/50 border border-pink-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-pink-600" />
                      <h4 className="text-sm font-semibold text-pink-700">Visit Information</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                          Visit Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={formData.visitDate}
                          onChange={(e) => handleChange('visitDate', e.target.value)}
                          className="w-full px-3 py-2.5 text-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                          Gestational Age (weeks)
                        </label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="42"
                          value={formData.gestationalAgeWeeks}
                          onChange={(e) => handleChange('gestationalAgeWeeks', e.target.value)}
                          className="w-full px-3 py-2.5 text-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-pink-500 transition-all"
                          placeholder="e.g., 24"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                          Gestational Age (days)
                        </label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="6"
                          value={formData.gestationalAgeDays}
                          onChange={(e) => handleChange('gestationalAgeDays', e.target.value)}
                          className="w-full px-3 py-2.5 text-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-pink-500 transition-all"
                          placeholder="0–6"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Maternal Assessment */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="w-4 h-4 text-teal-600" />
                      <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                        Maternal Assessment
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                          Weight (kg)
                        </label>
                        <div className="relative">
                          <Weight className="w-3.5 h-3.5 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="number"
                            step="0.1"
                            value={formData.weight}
                            onChange={(e) => handleChange('weight', e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-teal-500 transition-all"
                            placeholder="70.5"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                          Blood Pressure
                        </label>
                        <div className="relative">
                          <Activity className="w-3.5 h-3.5 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={formData.bloodPressure}
                            onChange={(e) => handleChange('bloodPressure', e.target.value)}
                            className={`w-full pl-9 pr-20 py-2.5 text-sm bg-[var(--bg-main)] border rounded-lg focus:ring-2 transition-all ${
                              bpStatus === 'critical'
                                ? 'border-red-400 focus:ring-red-500 bg-red-50/40'
                                : bpStatus === 'elevated'
                                  ? 'border-yellow-400 focus:ring-yellow-500 bg-yellow-50/40'
                                  : 'border-[var(--border-color)] focus:ring-teal-500'
                            }`}
                            placeholder="120/80"
                          />
                          {bpStatus !== 'unknown' && (
                            <span
                              className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                bpStatus === 'critical'
                                  ? 'bg-red-100 text-red-700'
                                  : bpStatus === 'elevated'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {bpStatus === 'critical' ? 'High!' : bpStatus === 'elevated' ? 'Elevated' : 'Normal'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                          Fundal Height (cm)
                        </label>
                        <div className="relative">
                          <Ruler className="w-3.5 h-3.5 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="number"
                            step="0.5"
                            value={formData.fundalHeight}
                            onChange={(e) => handleChange('fundalHeight', e.target.value)}
                            className={`w-full pl-9 pr-3 py-2.5 text-sm bg-[var(--bg-main)] border rounded-lg focus:ring-2 transition-all ${
                              fhStatus === 'low' || fhStatus === 'high'
                                ? 'border-yellow-400 focus:ring-yellow-500'
                                : 'border-[var(--border-color)] focus:ring-teal-500'
                            }`}
                            placeholder="28"
                          />
                        </div>
                        {fhStatus !== 'ok' && fhStatus !== 'unknown' && formData.gestationalAgeWeeks && (
                          <p className="text-[10px] text-yellow-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-2.5 h-2.5" />
                            {fhStatus === 'low'
                              ? 'Smaller than GA (±3cm) — consider IUGR'
                              : 'Larger than GA (±3cm) — consider polyhydramnios/multiple'}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                          Fetal Heart Rate (bpm)
                        </label>
                        <div className="relative">
                          <Heart className="w-3.5 h-3.5 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="number"
                            value={formData.fetalHeartRate}
                            onChange={(e) => handleChange('fetalHeartRate', e.target.value)}
                            className={`w-full pl-9 pr-20 py-2.5 text-sm bg-[var(--bg-main)] border rounded-lg focus:ring-2 transition-all ${
                              fhrStatus === 'low' || fhrStatus === 'high'
                                ? 'border-red-400 focus:ring-red-500 bg-red-50/40'
                                : 'border-[var(--border-color)] focus:ring-teal-500'
                            }`}
                            placeholder="140"
                          />
                          {formData.fetalHeartRate && fhrStatus !== 'unknown' && (
                            <span
                              className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                fhrStatus === 'normal'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {fhrStatus === 'normal' ? 'Normal' : fhrStatus === 'low' ? 'Low' : 'High'}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                          Normal range: 110–160 bpm
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Presentation */}
                  <div className="border-t border-[var(--border-color)] pt-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Baby className="w-4 h-4 text-pink-600" />
                      <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                        Fetal Presentation
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {PRESENTATION_OPTIONS.map((opt) => {
                        const isActive = formData.presentation === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleChange('presentation', isActive ? '' : opt.value)}
                            className={`p-3 rounded-lg border-2 text-left transition-all ${
                              isActive
                                ? 'border-pink-400 bg-pink-50 shadow-sm'
                                : 'border-[var(--border-color)] bg-[var(--bg-main)] hover:border-pink-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-sm font-semibold ${isActive ? 'text-pink-700' : 'text-[var(--text-primary)]'}`}>
                                {opt.label}
                              </span>
                              {isActive && <BadgeCheck className="w-3.5 h-3.5 text-pink-600" />}
                            </div>
                            <p className="text-[10px] text-[var(--text-secondary)]">{opt.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ───── TAB 2: PREVENTIONS ───── */}
              {activeTab === 'preventions' && (
                <div className="space-y-6">
                  {/* Vaccinations */}
                  <div className="bg-gradient-to-br from-green-50 to-teal-50 border border-green-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Syringe className="w-4 h-4 text-green-600" />
                      <h4 className="text-sm font-semibold text-green-800">
                        Vaccinations & Preventative Care
                      </h4>
                    </div>

                    <div className="space-y-3">
                      {/* IPTp */}
                      <div className={`p-3.5 rounded-lg border transition-all ${
                        formData.iptpGiven
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-white border-[var(--border-color)]'
                      }`}>
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.iptpGiven}
                            onChange={(e) => handleChange('iptpGiven', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                          />
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                            <Droplet className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">
                              IPTp (Sulfadoxine-Pyrimethamine)
                            </p>
                            <p className="text-[10px] text-[var(--text-secondary)]">
                              Intermittent preventive treatment
                            </p>
                          </div>
                        </label>
                        {formData.iptpGiven && (
                          <div className="mt-3 pt-3 border-t border-blue-100">
                            <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                              Dose Number
                            </label>
                            <div className="flex gap-1.5">
                              {[1, 2, 3, 4, 5].map((d) => (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() => handleChange('iptpDoseNumber', d)}
                                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    formData.iptpDoseNumber === d
                                      ? 'bg-blue-600 text-white shadow-sm'
                                      : 'bg-white border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-blue-300'
                                  }`}
                                >
                                  D{d}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* TT */}
                      <div className={`p-3.5 rounded-lg border transition-all ${
                        formData.ttGiven
                          ? 'bg-green-50 border-green-200'
                          : 'bg-white border-[var(--border-color)]'
                      }`}>
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.ttGiven}
                            onChange={(e) => handleChange('ttGiven', e.target.checked)}
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500 w-4 h-4"
                          />
                          <div className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0">
                            <Syringe className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">
                              Tetanus Toxoid (TT)
                            </p>
                            <p className="text-[10px] text-[var(--text-secondary)]">
                              Neonatal tetanus prevention
                            </p>
                          </div>
                        </label>
                        {formData.ttGiven && (
                          <div className="mt-3 pt-3 border-t border-green-100">
                            <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                              Dose Number
                            </label>
                            <div className="flex gap-1.5">
                              {[1, 2, 3, 4, 5].map((d) => (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() => handleChange('ttDoseNumber', d)}
                                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    formData.ttDoseNumber === d
                                      ? 'bg-green-600 text-white shadow-sm'
                                      : 'bg-white border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-green-300'
                                  }`}
                                >
                                  D{d}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Supplements */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[
                          { key: 'ironGiven', label: 'Iron', icon: Droplet, color: 'red' },
                          { key: 'folateGiven', label: 'Folate', icon: Activity, color: 'purple' },
                          { key: 'itnGiven', label: 'ITN', icon: Shield, color: 'teal' },
                        ].map(({ key, label, icon: Icon }) => {
                          const checked = formData[key as keyof typeof formData] as boolean;
                          return (
                            <label
                              key={key}
                              className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                                checked
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-white border-[var(--border-color)] hover:border-green-200'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => handleChange(key, e.target.checked)}
                                className="rounded border-gray-300 text-green-600 focus:ring-green-500 w-4 h-4"
                              />
                              <Icon className={`w-3.5 h-3.5 ${checked ? 'text-green-600' : 'text-[var(--text-tertiary)]'}`} />
                              <span className="text-xs font-medium text-[var(--text-primary)]">
                                {label} given
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Malaria Screening */}
                  <div className={`border rounded-xl p-4 transition-all ${
                    formData.malariaTestDone
                      ? formData.malariaTestResult === 'Positive'
                        ? 'bg-red-50/50 border-red-200'
                        : 'bg-green-50/40 border-green-200'
                      : 'bg-[var(--bg-main)] border-[var(--border-color)]'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      <TestTube className="w-4 h-4 text-orange-600" />
                      <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                        Malaria Screening
                      </h4>
                    </div>

                    <label className="flex items-center gap-2.5 cursor-pointer mb-3">
                      <input
                        type="checkbox"
                        checked={formData.malariaTestDone}
                        onChange={(e) => handleChange('malariaTestDone', e.target.checked)}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 w-4 h-4"
                      />
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        Malaria Test Done
                      </span>
                    </label>

                    {formData.malariaTestDone && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[var(--border-color)]">
                        <div>
                          <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                            Test Result
                          </label>
                          <div className="flex gap-2">
                            {['Positive', 'Negative'].map((r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => handleChange('malariaTestResult', r)}
                                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                                  formData.malariaTestResult === r
                                    ? r === 'Positive'
                                      ? 'bg-red-600 text-white shadow-sm'
                                      : 'bg-green-600 text-white shadow-sm'
                                    : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-gray-300'
                                }`}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>
                        {formData.malariaTestResult === 'Positive' && (
                          <label className="flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all bg-white border-red-200 hover:border-red-300 self-end">
                            <input
                              type="checkbox"
                              checked={formData.malariaTreatmentGiven}
                              onChange={(e) => handleChange('malariaTreatmentGiven', e.target.checked)}
                              className="rounded border-gray-300 text-red-600 focus:ring-red-500 w-4 h-4"
                            />
                            <span className="text-sm font-medium text-[var(--text-primary)]">
                              Treatment given
                            </span>
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ───── TAB 3: ALERTS & REFERRAL ───── */}
              {activeTab === 'alerts' && (
                <div className="space-y-6">
                  {/* Danger Signs */}
                  <div className={`border rounded-xl p-4 transition-all ${
                    formData.dangerSignsPresent
                      ? 'bg-red-50/50 border-red-200'
                      : 'bg-[var(--bg-main)] border-[var(--border-color)]'
                  }`}>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.dangerSignsPresent}
                        onChange={(e) => handleChange('dangerSignsPresent', e.target.checked)}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500 w-4 h-4"
                      />
                      <div className="w-9 h-9 rounded-lg bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0">
                        <AlertOctagon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-red-700">Danger Signs Present</p>
                        <p className="text-[10px] text-[var(--text-secondary)]">
                          Flag any obstetric warning signs observed
                        </p>
                      </div>
                      {totalDangerSigns > 0 && (
                        <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
                          {totalDangerSigns}
                        </span>
                      )}
                    </label>

                    {formData.dangerSignsPresent && (
                      <div className="mt-4 pt-4 border-t border-red-200 space-y-4">
                        {Object.entries(DANGER_SIGN_GROUPS).map(([group, signs]) => (
                          <div key={group}>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-red-600 mb-2">
                              {group}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {signs.map((sign) => {
                                const checked = formData.dangerSignsList.includes(sign);
                                return (
                                  <label
                                    key={sign}
                                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-xs ${
                                      checked
                                        ? 'bg-red-100 border-red-300 text-red-800 font-medium'
                                        : 'bg-white border-[var(--border-color)] text-[var(--text-secondary)] hover:border-red-200'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) => handleDangerSignsChange(sign, e.target.checked)}
                                      className="rounded border-gray-300 text-red-600 focus:ring-red-500 w-3.5 h-3.5"
                                    />
                                    {sign}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Referral */}
                  <div className={`border rounded-xl p-4 transition-all ${
                    formData.referralMade
                      ? 'bg-blue-50/50 border-blue-200'
                      : 'bg-[var(--bg-main)] border-[var(--border-color)]'
                  }`}>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.referralMade}
                        onChange={(e) => handleChange('referralMade', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                        <Send className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-blue-700">Referral Made</p>
                        <p className="text-[10px] text-[var(--text-secondary)]">
                          Patient referred for higher-level care
                        </p>
                      </div>
                    </label>

                    {formData.referralMade && (
                      <div className="mt-4 pt-4 border-t border-blue-200 space-y-3">
                        <div>
                          <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                            Referred To
                          </label>
                          <div className="relative">
                            <Hospital className="w-3.5 h-3.5 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={formData.referredTo}
                              onChange={(e) => handleChange('referredTo', e.target.value)}
                              className="w-full pl-9 pr-3 py-2.5 text-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                              placeholder="e.g., Regional Hospital, Specialist Clinic"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                            Reason for Referral
                          </label>
                          <textarea
                            rows={3}
                            value={formData.referralReason}
                            onChange={(e) => handleChange('referralReason', e.target.value)}
                            className="w-full px-3 py-2.5 text-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 resize-none transition-all"
                            placeholder="Reason for referral…"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="flex items-center gap-2 text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                      <FileText className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                      Clinical Notes
                    </label>
                    <textarea
                      rows={4}
                      value={formData.notes}
                      onChange={(e) => handleChange('notes', e.target.value)}
                      className="w-full px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-pink-500 resize-none transition-all"
                      placeholder="Additional clinical notes, observations, or instructions…"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ───── Footer ───── */}
            <div className="flex-shrink-0 border-t border-[var(--border-color)] bg-[var(--bg-card)] px-6 py-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={goPrev}
                    disabled={currentTabIndex === 0}
                    className="flex items-center gap-1 px-3 py-2 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={currentTabIndex === TABS.length - 1}
                    className="flex items-center gap-1 px-3 py-2 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-lg hover:from-pink-700 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold shadow-sm shadow-pink-500/20 transition-all"
                  >
                    {loading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {isEditing ? 'Updating…' : 'Saving…'}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {isEditing ? 'Update Visit' : 'Save Visit'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};