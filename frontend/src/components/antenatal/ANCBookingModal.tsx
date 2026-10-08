// src/components/antenatal/ANCBookingModal.tsx — Enhanced UI/UX
import React, { useState, useMemo, useEffect } from 'react';
import {
  X, Calendar, Heart, Ruler, Weight, Syringe, AlertTriangle,
  Droplet, Baby, Activity, Shield, User, Users, Phone,
  FileText, CheckCircle2, ChevronRight, ChevronLeft,
  Info, TestTube, Stethoscope, MapPin, Droplets, Percent,
  BadgeCheck, CircleDot, Plus, Minus, Eye, Save, AlertCircle
} from 'lucide-react';
import { useAntenatalStore } from '../../store/antenatalStore';
import { useToast } from '../../store/toastStore';

interface ANCBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patientId: string;
  attendanceId: string;
  existingRecord?: any;
}

const PREVIOUS_COMPLICATIONS = [
  'Pre-eclampsia',
  'Gestational diabetes',
  'Preterm delivery',
  'Postpartum hemorrhage',
  'Placenta previa',
  'Placental abruption',
  'Intrauterine growth restriction',
  'Stillbirth',
  'Neonatal death',
  'Congenital anomalies'
];

const MEDICAL_CONDITIONS = [
  { key: 'chronicHypertension', label: 'Chronic Hypertension', icon: Activity },
  { key: 'diabetesMellitus', label: 'Diabetes Mellitus', icon: Droplet },
  { key: 'heartDisease', label: 'Heart Disease', icon: Heart },
  { key: 'renalDisease', label: 'Renal Disease', icon: Droplets },
  { key: 'asthma', label: 'Asthma', icon: Activity },
  { key: 'epilepsy', label: 'Epilepsy', icon: Activity },
];

type TabKey = 'pregnancy' | 'history' | 'preventions';

const TABS: { key: TabKey; label: string; icon: React.ElementType; description: string }[] = [
  { key: 'pregnancy', label: 'Pregnancy', icon: Baby, description: 'LMP, EDD & booking measurements' },
  { key: 'history', label: 'History', icon: Calendar, description: 'Obstetric & medical history' },
  { key: 'preventions', label: 'Preventions', icon: Syringe, description: 'Vaccines, supplements & risk' },
];

// Helper: risk level config
const RISK_CONFIG: Record<string, { bg: string; border: string; text: string; label: string; dot: string }> = {
  low: {
    bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700',
    label: 'Low Risk', dot: 'bg-green-500',
  },
  medium: {
    bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700',
    label: 'Medium Risk', dot: 'bg-yellow-500',
  },
  high: {
    bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700',
    label: 'High Risk', dot: 'bg-red-500',
  },
};

export const ANCBookingModal: React.FC<ANCBookingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  patientId,
  attendanceId,
  existingRecord,
}) => {
  const { registerAntenatalBooking, updateAntenatalRecord } = useAntenatalStore();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('pregnancy');

  const isEditing = !!existingRecord;

  const [formData, setFormData] = useState({
    lmp: existingRecord?.lmp?.split('T')[0] || '',
    edd: existingRecord?.edd?.split('T')[0] || '',
    gestationalAgeWeeks: existingRecord?.gestationalAgeWeeks?.toString() || '',

    gravida: existingRecord?.gravida || 1,
    para: existingRecord?.para || 0,
    previousCSection: existingRecord?.previousCSection || false,
    previousComplications: existingRecord?.previousComplications || [] as string[],
    previousComplicationsOther: '',

    chronicHypertension: existingRecord?.chronicHypertension || false,
    diabetesMellitus: existingRecord?.diabetesMellitus || false,
    heartDisease: existingRecord?.heartDisease || false,
    renalDisease: existingRecord?.renalDisease || false,
    asthma: existingRecord?.asthma || false,
    epilepsy: existingRecord?.epilepsy || false,
    hivStatus: existingRecord?.hivStatus || '',
    syphilisStatus: existingRecord?.syphilisStatus || '',
    hepatitisBStatus: existingRecord?.hepatitisBStatus || '',

    bookingWeight: existingRecord?.bookingWeight?.toString() || '',
    bookingHeight: existingRecord?.bookingHeight?.toString() || '',
    bookingBMI: existingRecord?.bookingBMI?.toString() || '',
    bookingBP: existingRecord?.bookingBP || '',
    bookingHb: existingRecord?.bookingHb?.toString() || '',
    bloodGroup: existingRecord?.bloodGroup || '',
    rhesusFactor: existingRecord?.rhesusFactor || '',

    ttDosesGiven: existingRecord?.ttDosesGiven || 0,
    iptpDosesGiven: existingRecord?.iptpDosesGiven || 0,
    ironGiven: existingRecord?.ironGiven || false,
    folateGiven: existingRecord?.folateGiven || false,
    itnGiven: existingRecord?.itnGiven || false,

    riskLevel: existingRecord?.riskLevel || 'low',
    riskFactors: existingRecord?.riskFactors || [] as string[],

    occupation: existingRecord?.occupation || '',
    partnerName: existingRecord?.partnerName || '',
    partnerContact: existingRecord?.partnerContact || '',
    malePartnerInvolved: existingRecord?.malePartnerInvolved || false,
    partnerHIVStatus: existingRecord?.partnerHIVStatus || '',
    emergencyContact: existingRecord?.emergencyContact || '',
    emergencyContactPhone: existingRecord?.emergencyContactPhone || '',
    notes: existingRecord?.notes || '',
  });

  // Reset active tab when modal opens
  useEffect(() => {
    if (isOpen) setActiveTab('pregnancy');
  }, [isOpen]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Auto-calc EDD + GA
    if (!isEditing && field === 'lmp' && value) {
      const lmp = new Date(value);
      if (!isNaN(lmp.getTime())) {
        const edd = new Date(lmp);
        edd.setDate(edd.getDate() + 280);
        const eddStr = edd.toISOString().split('T')[0];

        const today = new Date();
        const diffDays = (today.getTime() - lmp.getTime()) / (1000 * 60 * 60 * 24);
        const weeks = Math.floor(diffDays / 7);

        setFormData(prev => ({
          ...prev,
          edd: eddStr,
          ...(weeks >= 0 && weeks <= 42 ? { gestationalAgeWeeks: weeks.toString() } : {}),
        }));
      }
    }

    // Auto-calc BMI
    if ((field === 'bookingWeight' || field === 'bookingHeight') && formData.bookingWeight && formData.bookingHeight) {
      const weight = field === 'bookingWeight' ? parseFloat(value) : parseFloat(formData.bookingWeight);
      const height = field === 'bookingHeight' ? parseFloat(value) : parseFloat(formData.bookingHeight);
      if (weight && height && height > 0) {
        const h = height / 100;
        const bmi = weight / (h * h);
        setFormData(prev => ({ ...prev, bookingBMI: bmi.toFixed(1) }));
      }
    }
  };

  const handleIPTpGiven = () => {
    const next = formData.iptpDosesGiven + 1;
    if (next <= 5) {
      setFormData(prev => ({ ...prev, iptpDosesGiven: next }));
      success('IPTp', `Dose ${next} of 5 recorded`);
    } else {
      toastError('IPTp', 'Maximum 5 doses reached');
    }
  };

  const handleTTGiven = () => {
    const next = formData.ttDosesGiven + 1;
    if (next <= 5) {
      setFormData(prev => ({ ...prev, ttDosesGiven: next }));
      success('TT', `Dose ${next} of 5 recorded`);
    } else {
      toastError('TT', 'Maximum 5 doses reached');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditing && existingRecord?.id) {
        const updateData = {
          gravida: formData.gravida,
          para: formData.para,
          riskLevel: formData.riskLevel,
        };
        await updateAntenatalRecord(existingRecord.id, updateData);
        success('Success', 'Pregnancy record updated successfully');
      } else {
        const createData = {
          patientId,
          attendanceId,
          lmp: formData.lmp,
          gravida: formData.gravida,
          para: formData.para,
          riskLevel: formData.riskLevel || 'low',
        };
        await registerAntenatalBooking(createData);
        success('Success', 'Pregnancy record created successfully');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toastError('Error', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Completion progress per tab
  const tabProgress = useMemo(() => {
    const pregnancy = [
      !isEditing ? !!formData.lmp : true,
      !!formData.bookingWeight,
      !!formData.bookingHeight,
      !!formData.bookingBP,
      !!formData.bloodGroup,
    ];
    const history = [
      !!formData.gravida,
      formData.para !== undefined && formData.para !== null,
    ];
    const preventions = [
      !!formData.riskLevel,
    ];
    const pct = (arr: boolean[]) => Math.round((arr.filter(Boolean).length / arr.length) * 100);
    return {
      pregnancy: pct(pregnancy),
      history: pct(history),
      preventions: pct(preventions),
    } as Record<TabKey, number>;
  }, [formData, isEditing]);

  const currentRisk = RISK_CONFIG[formData.riskLevel] || RISK_CONFIG.low;
  const currentTabIndex = TABS.findIndex(t => t.key === activeTab);

  const goNext = () => {
    const next = TABS[currentTabIndex + 1];
    if (next) setActiveTab(next.key);
  };
  const goPrev = () => {
    const prev = TABS[currentTabIndex - 1];
    if (prev) setActiveTab(prev.key);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
        <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col overflow-hidden">

          {/* ───────── Header ───────── */}
          <div className="relative bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-5 text-white flex-shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
                  <Baby className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold truncate">
                    {isEditing ? 'Edit Pregnancy Record' : 'New Antenatal Booking'}
                  </h2>
                  <p className="text-xs text-white/80 mt-0.5">
                    {isEditing
                      ? 'Update antenatal booking information'
                      : 'Complete antenatal booking form — first visit only'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick summary strip */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-2">
                <p className="text-[10px] text-white/70 uppercase tracking-wide">Gravida</p>
                <p className="text-sm font-bold">{formData.gravida}</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-2">
                <p className="text-[10px] text-white/70 uppercase tracking-wide">Para</p>
                <p className="text-sm font-bold">{formData.para}</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-2">
                <p className="text-[10px] text-white/70 uppercase tracking-wide">Gestation</p>
                <p className="text-sm font-bold">
                  {formData.gestationalAgeWeeks ? `${formData.gestationalAgeWeeks}w` : '—'}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-2 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${currentRisk.dot}`} />
                <div className="min-w-0">
                  <p className="text-[10px] text-white/70 uppercase tracking-wide">Risk</p>
                  <p className="text-sm font-bold truncate">{currentRisk.label}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ───────── Tabs ───────── */}
          <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-main)] flex-shrink-0 overflow-x-auto">
            {TABS.map((tab, idx) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              const progress = tabProgress[tab.key];
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 min-w-[140px] px-4 py-3 text-sm font-medium flex items-center gap-2.5 transition-all relative ${
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

          {/* ───────── Form ───────── */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6">

              {/* Tab header */}
              <div className="mb-5 pb-4 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                  {React.createElement(TABS[currentTabIndex].icon, {
                    className: 'w-4 h-4 text-pink-600',
                  })}
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {TABS[currentTabIndex].label} Details
                  </h3>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {TABS[currentTabIndex].description}
                </p>
              </div>

              {/* ─────── TAB 1: PREGNANCY ─────── */}
              {activeTab === 'pregnancy' && (
                <div className="space-y-6">
                  {!isEditing ? (
                    <div className="bg-pink-50/50 border border-pink-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-pink-600" />
                        <h4 className="text-sm font-semibold text-pink-700">
                          Pregnancy Dating
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                            LMP <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={formData.lmp}
                            onChange={(e) => handleChange('lmp', e.target.value)}
                            className="w-full px-3 py-2.5 text-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                            required
                          />
                          <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                            Last menstrual period
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                            EDD
                          </label>
                          <input
                            type="date"
                            value={formData.edd}
                            onChange={(e) => handleChange('edd', e.target.value)}
                            className="w-full px-3 py-2.5 text-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-pink-500 transition-all"
                          />
                          <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                            Auto-calculated (40w from LMP)
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                            Gestational Age (weeks)
                          </label>
                          <input
                            type="number"
                            step="1"
                            value={formData.gestationalAgeWeeks}
                            onChange={(e) => handleChange('gestationalAgeWeeks', e.target.value)}
                            className="w-full px-3 py-2.5 text-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-pink-500 transition-all"
                            placeholder="Auto"
                          />
                          <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                            Calculated from LMP
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                      <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-blue-800 mb-1">
                          Dating information (locked)
                        </p>
                        <div className="grid grid-cols-3 gap-3 mt-2">
                          <div>
                            <p className="text-[10px] text-blue-600 uppercase font-semibold">LMP</p>
                            <p className="text-xs font-medium text-[var(--text-primary)]">
                              {formData.lmp ? new Date(formData.lmp).toLocaleDateString() : '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-blue-600 uppercase font-semibold">EDD</p>
                            <p className="text-xs font-medium text-[var(--text-primary)]">
                              {formData.edd ? new Date(formData.edd).toLocaleDateString() : '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-blue-600 uppercase font-semibold">Gestation</p>
                            <p className="text-xs font-medium text-[var(--text-primary)]">
                              {formData.gestationalAgeWeeks || '—'} weeks
                            </p>
                          </div>
                        </div>
                        <p className="text-[10px] text-blue-600 mt-2">
                          LMP and EDD cannot be changed after creation.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Measurements */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Stethoscope className="w-4 h-4 text-teal-600" />
                      <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                        Booking Measurements
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                          Weight (kg)
                        </label>
                        <div className="relative">
                          <Weight className="w-3.5 h-3.5 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="number"
                            step="0.1"
                            value={formData.bookingWeight}
                            onChange={(e) => handleChange('bookingWeight', e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-teal-500 transition-all"
                            placeholder="65.5"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                          Height (cm)
                        </label>
                        <div className="relative">
                          <Ruler className="w-3.5 h-3.5 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="number"
                            step="0.5"
                            value={formData.bookingHeight}
                            onChange={(e) => handleChange('bookingHeight', e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-teal-500 transition-all"
                            placeholder="160"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                          BMI
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formData.bookingBMI}
                            readOnly
                            className="w-full px-3 py-2.5 text-sm bg-gray-100 border border-[var(--border-color)] rounded-lg font-semibold text-[var(--text-primary)]"
                            placeholder="Auto"
                          />
                          {formData.bookingBMI && (
                            <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              parseFloat(formData.bookingBMI) < 18.5 ? 'bg-yellow-100 text-yellow-700' :
                              parseFloat(formData.bookingBMI) < 25 ? 'bg-green-100 text-green-700' :
                              parseFloat(formData.bookingBMI) < 30 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {parseFloat(formData.bookingBMI) < 18.5 ? 'Under' :
                               parseFloat(formData.bookingBMI) < 25 ? 'Normal' :
                               parseFloat(formData.bookingBMI) < 30 ? 'Over' : 'Obese'}
                            </span>
                          )}
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
                            value={formData.bookingBP}
                            onChange={(e) => handleChange('bookingBP', e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-teal-500 transition-all"
                            placeholder="120/80"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                          Hb Level (g/dL)
                        </label>
                        <div className="relative">
                          <TestTube className="w-3.5 h-3.5 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="number"
                            step="0.1"
                            value={formData.bookingHb}
                            onChange={(e) => handleChange('bookingHb', e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-teal-500 transition-all"
                            placeholder="11.5"
                          />
                        </div>
                        {formData.bookingHb && parseFloat(formData.bookingHb) < 11 && (
                          <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-2.5 h-2.5" /> Below normal (anaemia)
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                          Blood Group
                        </label>
                        <select
                          value={formData.bloodGroup}
                          onChange={(e) => handleChange('bloodGroup', e.target.value)}
                          className="w-full px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-teal-500 transition-all"
                        >
                          <option value="">Select</option>
                          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                          Rhesus Factor
                        </label>
                        <select
                          value={formData.rhesusFactor}
                          onChange={(e) => handleChange('rhesusFactor', e.target.value)}
                          className="w-full px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-teal-500 transition-all"
                        >
                          <option value="">Select</option>
                          <option value="Positive">Positive (+)</option>
                          <option value="Negative">Negative (-)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─────── TAB 2: HISTORY ─────── */}
              {activeTab === 'history' && (
                <div className="space-y-6">
                  {/* Obstetric */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-4 h-4 text-pink-600" />
                      <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                        Obstetric History
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                          Gravida (total pregnancies) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.gravida}
                          onChange={(e) => handleChange('gravida', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-pink-500 transition-all"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                          Para (total deliveries) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.para}
                          onChange={(e) => handleChange('para', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-pink-500 transition-all"
                          required
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2.5 p-3 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)] cursor-pointer hover:border-pink-300 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.previousCSection}
                        onChange={(e) => handleChange('previousCSection', e.target.checked)}
                        className="rounded border-gray-300 text-pink-600 focus:ring-pink-500 w-4 h-4"
                      />
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        Previous C-Section
                      </span>
                    </label>
                  </div>

                  {/* Previous complications */}
                  <div>
                    <label className="block text-xs font-semibold mb-2 text-[var(--text-primary)]">
                      Previous Complications
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto p-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg">
                      {PREVIOUS_COMPLICATIONS.map(comp => (
                        <label key={comp} className="flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer p-1 rounded hover:bg-[var(--bg-card)] transition-colors">
                          <input
                            type="checkbox"
                            checked={formData.previousComplications.includes(comp)}
                            onChange={(e) => {
                              const current = [...formData.previousComplications];
                              if (e.target.checked) current.push(comp);
                              else {
                                const i = current.indexOf(comp);
                                if (i > -1) current.splice(i, 1);
                              }
                              handleChange('previousComplications', current);
                            }}
                            className="rounded border-gray-300 text-pink-600 focus:ring-pink-500 w-3.5 h-3.5"
                          />
                          {comp}
                        </label>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={formData.previousComplicationsOther}
                      onChange={(e) => handleChange('previousComplicationsOther', e.target.value)}
                      placeholder="Other complications (specify)"
                      className="mt-2 w-full px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-pink-500 transition-all"
                    />
                  </div>

                  {/* Medical history */}
                  <div className="border-t border-[var(--border-color)] pt-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Heart className="w-4 h-4 text-rose-600" />
                      <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                        Medical History
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {MEDICAL_CONDITIONS.map(({ key, label, icon: Icon }) => {
                        const checked = formData[key as keyof typeof formData] as boolean;
                        return (
                          <label
                            key={key}
                            className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                              checked
                                ? 'bg-rose-50 border-rose-200'
                                : 'bg-[var(--bg-main)] border-[var(--border-color)] hover:border-rose-200'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => handleChange(key, e.target.checked)}
                              className="rounded border-gray-300 text-rose-600 focus:ring-rose-500 w-4 h-4"
                            />
                            <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${checked ? 'text-rose-600' : 'text-[var(--text-tertiary)]'}`} />
                            <span className="text-xs font-medium text-[var(--text-primary)]">{label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Infection screening */}
                  <div className="border-t border-[var(--border-color)] pt-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-4 h-4 text-blue-600" />
                      <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                        Infection Screening
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { field: 'hivStatus', label: 'HIV Status' },
                        { field: 'syphilisStatus', label: 'Syphilis Status' },
                        { field: 'hepatitisBStatus', label: 'Hepatitis B Status' },
                      ].map(({ field, label }) => (
                        <div key={field}>
                          <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                            {label}
                          </label>
                          <select
                            value={(formData as any)[field]}
                            onChange={(e) => handleChange(field, e.target.value)}
                            className="w-full px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                          >
                            <option value="">Select</option>
                            <option value="Positive">Positive</option>
                            <option value="Negative">Negative</option>
                            <option value="Unknown">Unknown</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Partner & social */}
                  <div className="border-t border-[var(--border-color)] pt-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-4 h-4 text-cyan-600" />
                      <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                        Partner & Social Information
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">Occupation</label>
                        <input
                          type="text"
                          value={formData.occupation}
                          onChange={(e) => handleChange('occupation', e.target.value)}
                          className="w-full px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-cyan-500 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">Partner Name</label>
                        <input
                          type="text"
                          value={formData.partnerName}
                          onChange={(e) => handleChange('partnerName', e.target.value)}
                          className="w-full px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-cyan-500 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">Partner Contact</label>
                        <div className="relative">
                          <Phone className="w-3.5 h-3.5 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={formData.partnerContact}
                            onChange={(e) => handleChange('partnerContact', e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-cyan-500 transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">Partner HIV Status</label>
                        <select
                          value={formData.partnerHIVStatus}
                          onChange={(e) => handleChange('partnerHIVStatus', e.target.value)}
                          className="w-full px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-cyan-500 transition-all"
                        >
                          <option value="">Not tested</option>
                          <option value="Positive">Positive</option>
                          <option value="Negative">Negative</option>
                          <option value="Unknown">Unknown</option>
                        </select>
                      </div>
                    </div>

                    <label className={`flex items-center gap-2.5 p-3 mt-3 rounded-lg border cursor-pointer transition-all ${
                      formData.malePartnerInvolved
                        ? 'bg-cyan-50 border-cyan-200'
                        : 'bg-[var(--bg-main)] border-[var(--border-color)]'
                    }`}>
                      <input
                        type="checkbox"
                        checked={formData.malePartnerInvolved}
                        onChange={(e) => handleChange('malePartnerInvolved', e.target.checked)}
                        className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 w-4 h-4"
                      />
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        Male partner involved in ANC
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* ─────── TAB 3: PREVENTIONS & RISK ─────── */}
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
                      {/* TT */}
                      <div className="flex items-center justify-between p-3.5 bg-white rounded-lg border border-green-100">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
                            <Syringe className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--text-primary)]">Tetanus Toxoid (TT)</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((d) => (
                                  <div
                                    key={d}
                                    className={`w-4 h-1.5 rounded-full ${
                                      d <= formData.ttDosesGiven ? 'bg-green-500' : 'bg-gray-200'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-[10px] font-medium text-[var(--text-secondary)]">
                                {formData.ttDosesGiven}/5
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleTTGiven}
                          disabled={formData.ttDosesGiven >= 5}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          <Plus className="w-3 h-3" />
                          Dose {formData.ttDosesGiven + 1}
                        </button>
                      </div>

                      {/* IPTp */}
                      <div className="flex items-center justify-between p-3.5 bg-white rounded-lg border border-blue-100">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                            <Droplet className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--text-primary)]">IPTp (SP)</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((d) => (
                                  <div
                                    key={d}
                                    className={`w-4 h-1.5 rounded-full ${
                                      d <= formData.iptpDosesGiven ? 'bg-blue-500' : 'bg-gray-200'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-[10px] font-medium text-[var(--text-secondary)]">
                                {formData.iptpDosesGiven}/5
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleIPTpGiven}
                          disabled={formData.iptpDosesGiven >= 5}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          <Plus className="w-3 h-3" />
                          Dose {formData.iptpDosesGiven + 1}
                        </button>
                      </div>

                      {/* Supplements */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                        {[
                          { key: 'ironGiven', label: 'Iron', icon: Droplet, color: 'red' },
                          { key: 'folateGiven', label: 'Folate', icon: Percent, color: 'purple' },
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

                  {/* Risk */}
                  <div className="border border-[var(--border-color)] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                        Risk Assessment
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                      {(['low', 'medium', 'high'] as const).map((level) => {
                        const cfg = RISK_CONFIG[level];
                        const isActive = formData.riskLevel === level;
                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => handleChange('riskLevel', level)}
                            className={`p-3 rounded-lg border-2 text-left transition-all ${
                              isActive
                                ? `${cfg.bg} ${cfg.border} shadow-sm`
                                : 'bg-[var(--bg-main)] border-[var(--border-color)] hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                              <span className={`text-sm font-semibold ${isActive ? cfg.text : 'text-[var(--text-primary)]'}`}>
                                {cfg.label}
                              </span>
                              {isActive && <BadgeCheck className={`w-3.5 h-3.5 ml-auto ${cfg.text}`} />}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                        Risk Factors
                      </label>
                      <input
                        type="text"
                        value={formData.riskFactors.join(', ')}
                        onChange={(e) =>
                          handleChange('riskFactors', e.target.value.split(',').map(s => s.trim()).filter(Boolean))
                        }
                        placeholder="e.g., Advanced maternal age, Obesity, Multiple pregnancy"
                        className="w-full px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-orange-500 transition-all"
                      />
                      {formData.riskFactors.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {formData.riskFactors.map((rf, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded-md text-[10px] font-medium border border-orange-100"
                            >
                              {rf}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
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
                      placeholder="Additional clinical notes, concerns, or observations…"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ───────── Footer ───────── */}
            <div className="flex-shrink-0 border-t border-[var(--border-color)] bg-[var(--bg-card)] px-6 py-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                {/* Nav prev/next */}
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

                {/* Actions */}
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
                        {isEditing ? 'Updating…' : 'Creating…'}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {isEditing ? 'Update Record' : 'Create Record'}
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