// src/components/antenatal/ANCVisitModal.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Heart, Ruler, Weight, Syringe, AlertTriangle, Activity, FileText } from 'lucide-react';
import { useAntenatalStore } from '../../store/antenatalStore';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../store/toastStore';

interface ANCVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  attendanceId: string;
  patientId: string;
  bookingId: string;
  visitNumber?: number;
  existingVisit?: any;
  booking?: { gravida?: number; para?: number } | null;
}

export const ANCVisitModal: React.FC<ANCVisitModalProps> = ({
  isOpen, onClose, onSuccess, attendanceId, patientId, bookingId,
  visitNumber = 1, existingVisit, booking,
}) => {
  const navigate = useNavigate();
  const { recordANCVisit, updateANCVisit } = useAntenatalStore();
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const isEditing = !!existingVisit;

  const [formData, setFormData] = useState({
    visitDate: existingVisit?.visitDate?.split('T')[0] || new Date().toISOString().split('T')[0],
    gestationalAgeWeeks: existingVisit?.gestationalAgeWeeks || '',
    gestationalAgeDays: existingVisit?.gestationalAgeDays || '',
    weight: existingVisit?.weight || '',
    gravida: existingVisit?.gravida ?? booking?.gravida ?? '',
    para: existingVisit?.para ?? booking?.para ?? '',
    fundalHeight: existingVisit?.fundalHeight || '',
    fetalHeartRate: existingVisit?.fetalHeartRate || '',
    presentation: existingVisit?.presentation || '',
    iptpGiven: existingVisit?.iptpGiven || false,
    iptpDoseNumber: existingVisit?.iptpDoseNumber || 1,
    ttGiven: existingVisit?.ttGiven || false,
    ttDoseNumber: existingVisit?.ttDoseNumber || 1,
    itnGiven: existingVisit?.itnGiven || false,
    ironGiven: existingVisit?.ironGiven || false,
    folateGiven: existingVisit?.folateGiven || false,
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

  useEffect(() => {
    if (isOpen && existingVisit) {
      setFormData({
        visitDate: existingVisit.visitDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        gestationalAgeWeeks: existingVisit.gestationalAgeWeeks || '',
        gestationalAgeDays: existingVisit.gestationalAgeDays || '',
        weight: existingVisit.weight || '',
        gravida: existingVisit.gravida ?? booking?.gravida ?? '',
        para: existingVisit.para ?? booking?.para ?? '',
        fundalHeight: existingVisit.fundalHeight || '',
        fetalHeartRate: existingVisit.fetalHeartRate || '',
        presentation: existingVisit.presentation || '',
        iptpGiven: existingVisit.iptpGiven || false,
        iptpDoseNumber: existingVisit.iptpDoseNumber || 1,
        ttGiven: existingVisit.ttGiven || false,
        ttDoseNumber: existingVisit.ttDoseNumber || 1,
        itnGiven: existingVisit.itnGiven || false,
        ironGiven: existingVisit.ironGiven || false,
        folateGiven: existingVisit.folateGiven || false,
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
        gestationalAgeWeeks: '', gestationalAgeDays: '', weight: '',
        gravida: booking?.gravida ?? '', para: booking?.para ?? '',
        fundalHeight: '', fetalHeartRate: '', presentation: '',
        iptpGiven: false, iptpDoseNumber: 1,
        ttGiven: false, ttDoseNumber: 1,
        itnGiven: false, ironGiven: false, folateGiven: false,
        malariaTestDone: false, malariaTestResult: '', malariaTreatmentGiven: false,
        dangerSignsPresent: false, dangerSignsList: [],
        referralMade: false, referredTo: '', referralReason: '', notes: '',
      });
    }
  }, [isOpen, existingVisit, booking?.gravida, booking?.para]);

  const handleReferFromVisit = () => {
    const params = new URLSearchParams({ patientId, attendanceId, source: 'Antenatal Visit' });
    const reason = [formData.referralReason, ...(formData.dangerSignsList || [])].filter(Boolean).join('; ');
    if (reason) params.set('reason', reason);
    if (formData.notes) params.set('notes', formData.notes);
    if (formData.referredTo) params.set('facility', formData.referredTo);
    params.set('urgency', (formData.dangerSignsList || []).length ? 'urgent' : 'routine');
    navigate(`/dashboard/referrals?${params.toString()}`);
    onClose();
  };

  const handleChange = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

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
      const toDateTime = (dateStr: string) => (dateStr ? new Date(dateStr).toISOString() : undefined);

      if (isEditing && existingVisit?.id) {
        const updateData: any = {};
        if (formData.visitDate) updateData.visitDate = toDateTime(formData.visitDate);
        if (formData.gestationalAgeWeeks) updateData.gestationalAgeWeeks = parseInt(formData.gestationalAgeWeeks);
        if (formData.gestationalAgeDays) updateData.gestationalAgeDays = parseInt(formData.gestationalAgeDays);
        if (formData.weight) updateData.weight = parseFloat(formData.weight);
        if (formData.gravida !== '') updateData.gravida = parseInt(formData.gravida as any);
        if (formData.para !== '') updateData.para = parseInt(formData.para as any);
        if (formData.fundalHeight) updateData.fundalHeight = parseFloat(formData.fundalHeight);
        if (formData.fetalHeartRate) updateData.fetalHeartRate = parseInt(formData.fetalHeartRate);
        if (formData.presentation) updateData.presentation = formData.presentation;
        updateData.iptpGiven = formData.iptpGiven;
        if (formData.iptpGiven) updateData.iptpDoseNumber = formData.iptpDoseNumber;
        updateData.ttGiven = formData.ttGiven;
        if (formData.ttGiven) updateData.ttDoseNumber = formData.ttDoseNumber;
        updateData.ironGiven = formData.ironGiven;
        updateData.folateGiven = formData.folateGiven;
        updateData.itnGiven = formData.itnGiven;
        updateData.malariaTestDone = formData.malariaTestDone;
        if (formData.malariaTestResult) updateData.malariaTestResult = formData.malariaTestResult;
        updateData.malariaTreatmentGiven = formData.malariaTreatmentGiven;
        updateData.dangerSignsPresent = formData.dangerSignsPresent;
        if (formData.dangerSignsList.length > 0) updateData.dangerSignsList = formData.dangerSignsList;
        updateData.referralMade = formData.referralMade;
        if (formData.referredTo) updateData.referredTo = formData.referredTo;
        if (formData.referralReason) updateData.returnInstructions = formData.referralReason;
        if (formData.notes) updateData.returnInstructions = formData.notes;
        await updateANCVisit(existingVisit.id, updateData);
        success('Updated', 'ANC visit updated successfully');
      } else {
        const createData = {
          bookingId, attendanceId, visitNumber,
          visitDate: toDateTime(formData.visitDate),
          gestationalAgeWeeks: formData.gestationalAgeWeeks ? parseInt(formData.gestationalAgeWeeks) : undefined,
          gestationalAgeDays: formData.gestationalAgeDays ? parseInt(formData.gestationalAgeDays) : undefined,
          weight: formData.weight ? parseFloat(formData.weight) : undefined,
          gravida: formData.gravida !== '' ? parseInt(formData.gravida as any) : undefined,
          para: formData.para !== '' ? parseInt(formData.para as any) : undefined,
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
          returnInstructions: formData.notes || formData.referralReason || undefined,
          recordedById: user?.id,
        };
        await recordANCVisit(createData);
        success('Recorded', 'ANC visit recorded successfully');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toastError('Error', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const dangerSignsOptions = [
    'Severe headache', 'Blurred vision', 'Convulsions', 'Severe abdominal pain',
    'Vaginal bleeding', 'Fever', 'Reduced fetal movement', 'Breathlessness',
    'Swelling of hands/face', 'Ruptured membranes', 'Prolonged labor',
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-[var(--bg-card)] rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-[var(--border-color)]">

          {/* ── Header (flat, tokenised) ── */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--icon-cyan-bg)] flex items-center justify-center">
                <Activity className="w-4 h-4 text-[var(--icon-cyan-text)]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                  {isEditing ? 'Edit ANC Visit' : `Record ANC Visit #${visitNumber}`}
                </h2>
                <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                  {isEditing ? 'Update antenatal visit information' : "Record today's antenatal assessment"}
                </p>
              </div>
            </div>
            <button type="button" onClick={handleReferFromVisit}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-cyan-300 text-cyan-700 hover:bg-cyan-50">
                    Refer Patient
                  </button>
                  <button onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)] transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 space-y-5" style={{ scrollbarWidth: 'thin' }}>

              {/* Basic visit info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1.5">Visit Date *</label>
                  <input type="date" value={formData.visitDate}
                    onChange={e => handleChange('visitDate', e.target.value)} required
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg
                      text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)] transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1.5">Gestational Age (weeks)</label>
                  <input type="number" step="1" value={formData.gestationalAgeWeeks}
                    onChange={e => handleChange('gestationalAgeWeeks', e.target.value)}
                    placeholder="e.g., 24"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg
                      text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)] transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1.5">Gestational Age (days)</label>
                  <input type="number" step="1" min="0" max="6" value={formData.gestationalAgeDays}
                    onChange={e => handleChange('gestationalAgeDays', e.target.value)}
                    placeholder="e.g., 3"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg
                      text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)] transition-all" />
                </div>
              </div>

              {/* Maternal assessment */}
              <div className="border-t border-[var(--border-color)] pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                  <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Maternal Assessment</h3>
                  <span className="text-[10px] font-normal text-[var(--text-tertiary)]">(Blood pressure is taken from Vitals)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1.5">Weight (kg)</label>
                    <div className="relative">
                      <Weight className="w-3.5 h-3.5 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input type="number" step="0.1" value={formData.weight}
                        onChange={e => handleChange('weight', e.target.value)}
                        placeholder="e.g., 70.5"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg
                          text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)] transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1.5">Gravida (G) *</label>
                    <input type="number" min="0" required value={formData.gravida}
                      onChange={e => handleChange('gravida', e.target.value)}
                      placeholder="Total pregnancies"
                      className="w-full px-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg
                        text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)] transition-all" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1.5">Para (P) *</label>
                    <input type="number" min="0" required value={formData.para}
                      onChange={e => handleChange('para', e.target.value)}
                      placeholder="Total deliveries"
                      className="w-full px-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg
                        text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)] transition-all" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1.5">Fundal Height (cm)</label>
                    <div className="relative">
                      <Ruler className="w-3.5 h-3.5 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input type="number" step="0.5" value={formData.fundalHeight}
                        onChange={e => handleChange('fundalHeight', e.target.value)}
                        placeholder="e.g., 28"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg
                          text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)] transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1.5">Fetal Heart Rate (bpm)</label>
                    <div className="relative">
                      <Heart className="w-3.5 h-3.5 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input type="number" value={formData.fetalHeartRate}
                        onChange={e => handleChange('fetalHeartRate', e.target.value)}
                        placeholder="e.g., 140"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg
                          text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)] transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1.5">Presentation</label>
                    <select value={formData.presentation}
                      onChange={e => handleChange('presentation', e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg
                        text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)] transition-all">
                      <option value="">Select</option>
                      <option value="cephalic">Cephalic (Head down)</option>
                      <option value="breech">Breech</option>
                      <option value="transverse">Transverse</option>
                      <option value="oblique">Oblique</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Preventions */}
              <div className="border-t border-[var(--border-color)] pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Syringe className="w-4 h-4 text-[var(--icon-green-text)]" />
                  <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Preventions & Treatments</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* IPTp */}
                  <div className="border border-[var(--border-color)] rounded-lg p-3 bg-[var(--bg-main)]">
                    <label className="flex items-center gap-2 mb-2 cursor-pointer">
                      <input type="checkbox" checked={formData.iptpGiven}
                        onChange={e => handleChange('iptpGiven', e.target.checked)}
                        className="rounded border-[var(--border-color)] text-[var(--icon-cyan-text)] focus:ring-[var(--icon-cyan-text)]" />
                      <span className="text-xs font-semibold text-[var(--text-primary)]">IPTp Given</span>
                    </label>
                    {formData.iptpGiven && (
                      <div>
                        <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">Dose Number</label>
                        <select value={formData.iptpDoseNumber}
                          onChange={e => handleChange('iptpDoseNumber', parseInt(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg
                            text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)]">
                          {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>Dose {n}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* TT */}
                  <div className="border border-[var(--border-color)] rounded-lg p-3 bg-[var(--bg-main)]">
                    <label className="flex items-center gap-2 mb-2 cursor-pointer">
                      <input type="checkbox" checked={formData.ttGiven}
                        onChange={e => handleChange('ttGiven', e.target.checked)}
                        className="rounded border-[var(--border-color)] text-[var(--icon-purple-text)] focus:ring-[var(--icon-purple-text)]" />
                      <span className="text-xs font-semibold text-[var(--text-primary)]">Tetanus Toxoid (TT) Given</span>
                    </label>
                    {formData.ttGiven && (
                      <div>
                        <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">Dose Number</label>
                        <select value={formData.ttDoseNumber}
                          onChange={e => handleChange('ttDoseNumber', parseInt(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg
                            text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-purple-text)]">
                          {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>Dose {n}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Supplements */}
                  <div className="border border-[var(--border-color)] rounded-lg p-3 bg-[var(--bg-main)]">
                    {[
                      { k: 'ironGiven', label: 'Iron supplements given' },
                      { k: 'folateGiven', label: 'Folate supplements given' },
                      { k: 'itnGiven', label: 'ITN (mosquito net) given' },
                    ].map(({ k, label }) => (
                      <label key={k} className="flex items-center gap-2 py-1 cursor-pointer">
                        <input type="checkbox" checked={(formData as any)[k]}
                          onChange={e => handleChange(k, e.target.checked)}
                          className="rounded border-[var(--border-color)] text-[var(--icon-green-text)] focus:ring-[var(--icon-green-text)]" />
                        <span className="text-xs text-[var(--text-primary)]">{label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Malaria */}
                  <div className="border border-[var(--border-color)] rounded-lg p-3 bg-[var(--bg-main)]">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.malariaTestDone}
                        onChange={e => handleChange('malariaTestDone', e.target.checked)}
                        className="rounded border-[var(--border-color)] text-[var(--icon-yellow-text)] focus:ring-[var(--icon-yellow-text)]" />
                      <span className="text-xs font-semibold text-[var(--text-primary)]">Malaria Test Done</span>
                    </label>
                    {formData.malariaTestDone && (
                      <>
                        <div className="mt-2">
                          <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">Test Result</label>
                          <select value={formData.malariaTestResult}
                            onChange={e => handleChange('malariaTestResult', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg
                              text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-yellow-text)]">
                            <option value="">Select result</option>
                            <option value="Positive">Positive</option>
                            <option value="Negative">Negative</option>
                          </select>
                        </div>
                        {formData.malariaTestResult === 'Positive' && (
                          <label className="flex items-center gap-2 mt-2 cursor-pointer">
                            <input type="checkbox" checked={formData.malariaTreatmentGiven}
                              onChange={e => handleChange('malariaTreatmentGiven', e.target.checked)}
                              className="rounded border-[var(--border-color)] text-[var(--icon-red-text)] focus:ring-[var(--icon-red-text)]" />
                            <span className="text-xs text-[var(--text-primary)]">Treatment given</span>
                          </label>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Danger Signs */}
              <div className="border-t border-[var(--border-color)] pt-4">
                <label className="flex items-center gap-2 mb-3 cursor-pointer">
                  <input type="checkbox" checked={formData.dangerSignsPresent}
                    onChange={e => handleChange('dangerSignsPresent', e.target.checked)}
                    className="rounded border-[var(--border-color)] text-[var(--icon-red-text)] focus:ring-[var(--icon-red-text)]" />
                  <AlertTriangle className="w-3.5 h-3.5 text-[var(--icon-red-text)]" />
                  <span className="text-xs font-bold text-[var(--icon-red-text)] uppercase tracking-wider">Danger Signs Present</span>
                </label>
                {formData.dangerSignsPresent && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)]">
                    {dangerSignsOptions.map(sign => (
                      <label key={sign} className="flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer p-1 rounded hover:bg-[var(--bg-card)] transition-colors">
                        <input type="checkbox" checked={formData.dangerSignsList.includes(sign)}
                          onChange={e => handleDangerSignsChange(sign, e.target.checked)}
                          className="rounded border-[var(--border-color)] text-[var(--icon-red-text)] focus:ring-[var(--icon-red-text)] w-3.5 h-3.5" />
                        {sign}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Referral */}
              <div className="border-t border-[var(--border-color)] pt-4">
                <label className="flex items-center gap-2 mb-3 cursor-pointer">
                  <input type="checkbox" checked={formData.referralMade}
                    onChange={e => handleChange('referralMade', e.target.checked)}
                    className="rounded border-[var(--border-color)] text-[var(--icon-cyan-text)] focus:ring-[var(--icon-cyan-text)]" />
                  <span className="text-xs font-bold text-[var(--icon-cyan-text)] uppercase tracking-wider">Referral Made</span>
                </label>
                {formData.referralMade && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1.5">Referred To</label>
                      <input type="text" value={formData.referredTo}
                        onChange={e => handleChange('referredTo', e.target.value)}
                        placeholder="e.g., Regional Hospital, Specialist"
                        className="w-full px-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg
                          text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)]" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1.5">Reason for Referral</label>
                      <textarea rows={2} value={formData.referralReason}
                        onChange={e => handleChange('referralReason', e.target.value)}
                        placeholder="Reason for referral..."
                        className="w-full px-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg resize-none
                          text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)]" />
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="border-t border-[var(--border-color)] pt-4">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-secondary)] mb-1.5">
                  <FileText className="w-3.5 h-3.5 text-[var(--text-tertiary)]" /> Clinical Notes
                </label>
                <textarea rows={3} value={formData.notes}
                  onChange={e => handleChange('notes', e.target.value)}
                  placeholder="Additional clinical notes, observations, or instructions..."
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg resize-none
                    text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)]" />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-[var(--border-color)] bg-[var(--bg-main)] flex-shrink-0">
              <button type="button" onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold border border-[var(--border-color)]
                  text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-all">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--icon-cyan-text)] text-white
                  hover:opacity-90 disabled:opacity-50 transition-all">
                {loading ? (isEditing ? 'Updating…' : 'Saving…') : (isEditing ? 'Update Visit' : 'Save Visit')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};