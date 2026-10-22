// src/components/postnatal/PostnatalModal.tsx — clinical palette
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Heart, Baby, Shield, AlertTriangle, ArrowLeft, Calendar, FileText } from 'lucide-react';
import { usePostnatalStore } from '../../store/postnatalStore';
import { useToast } from '../../store/toastStore';

interface PostnatalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  attendanceId: string;
  patientId: string;
  existingPostnatal?: any;
}

type SectionKey = 'maternal' | 'baby' | 'family';

export const PostnatalModal: React.FC<PostnatalModalProps> = ({
  isOpen, onClose, onSuccess, attendanceId, patientId, existingPostnatal,
}) => {
  const navigate = useNavigate();
  const { createPostnatalRecord, updatePostnatalRecord, isLoading } = usePostnatalStore();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>('maternal');

  const [formData, setFormData] = useState({
    maternalCondition: 'good',
    maternalComplications: [] as string[],
    bloodPressure: '',
    temperature: '',
    pulse: '',
    fundalHeight: '',
    lochia: 'normal',
    perinealCondition: 'intact',
    caesareanWound: 'healing',
    breastfeedingStatus: 'exclusive',
    breastfeedingDifficulties: [] as string[],
    latching: 'good',
    babyCondition: 'good',
    babyWeight: '',
    babyTemperature: '',
    babyFeeding: 'good',
    jaundice: false,
    jaundiceSeverity: 'mild',
    cordCondition: 'dry',
    bcgGiven: false,
    opv0Given: false,
    hepB0Given: false,
    familyPlanningDiscussed: false,
    familyPlanningMethodAccepted: '',
    maternalDangerSigns: [] as string[],
    babyDangerSigns: [] as string[],
    malePartnerPresentPNC: false,
    referralMade: false,
    referredTo: '',
    referralReason: '',
    nextVisitDate: '',
    nextVisitType: 'day_42',
    notes: '',
  });

  const handleReferFromPostnatal = () => {
    const params = new URLSearchParams({ patientId, attendanceId, source: 'Postnatal Examination' });
    const reason = [...(formData.maternalDangerSigns || []), ...(formData.babyDangerSigns || []), ...(formData.maternalComplications || [])].filter(Boolean).join('; ')
      || formData.referralReason || 'Postnatal assessment requires referral';
    params.set('reason', reason);
    if (formData.notes) params.set('notes', formData.notes);
    if (formData.referredTo) params.set('facility', formData.referredTo);
    params.set('urgency', (formData.maternalDangerSigns.length || formData.babyDangerSigns.length) ? 'urgent' : 'routine');
    navigate(`/dashboard/referrals?${params.toString()}`);
    onClose();
  };

  const MATERNAL_COMPLICATIONS = [
    'Postpartum Haemorrhage', 'Preeclampsia/Eclampsia', 'Sepsis',
    'Anemia', 'Urinary Retention', 'Constipation', 'Depression',
    'Mastitis', 'Thrombophlebitis', 'Wound Infection',
  ];
  const BREASTFEEDING_DIFFICULTIES = [
    'Poor latch', 'Low milk supply', 'Engorgement', 'Cracked nipples',
    'Painful breastfeeding', 'Baby refuses breast', 'Mastitis',
  ];
  const MATERNAL_DANGER_SIGNS = [
    'Severe headache', 'Blurred vision', 'Heavy bleeding', 'Foul discharge',
    'Severe abdominal pain', 'Difficulty breathing', 'High fever', 'Convulsions',
  ];
  const BABY_DANGER_SIGNS = [
    'Poor feeding', 'Difficulty breathing', 'Yellow skin (jaundice)',
    'Lethargy/Unconscious', 'Fever', 'Hypothermia', 'Cord redness/discharge',
    'Not passing urine/stool', 'Convulsions',
  ];

  useEffect(() => {
    if (existingPostnatal) {
      setFormData({
        maternalCondition: existingPostnatal.maternalCondition || 'good',
        maternalComplications: existingPostnatal.maternalComplications || [],
        bloodPressure: existingPostnatal.bloodPressure || '',
        temperature: existingPostnatal.temperature?.toString() || '',
        pulse: existingPostnatal.pulse?.toString() || '',
        fundalHeight: existingPostnatal.fundalHeight?.toString() || '',
        lochia: existingPostnatal.lochia || 'normal',
        perinealCondition: existingPostnatal.perinealCondition || 'intact',
        caesareanWound: existingPostnatal.caesareanWound || 'healing',
        breastfeedingStatus: existingPostnatal.breastfeedingStatus || 'exclusive',
        breastfeedingDifficulties: existingPostnatal.breastfeedingDifficulties || [],
        latching: existingPostnatal.latching || 'good',
        babyCondition: existingPostnatal.babyCondition || 'good',
        babyWeight: existingPostnatal.babyWeight?.toString() || '',
        babyTemperature: existingPostnatal.babyTemperature?.toString() || '',
        babyFeeding: existingPostnatal.babyFeeding || 'good',
        jaundice: existingPostnatal.jaundice || false,
        jaundiceSeverity: existingPostnatal.jaundiceSeverity || 'mild',
        cordCondition: existingPostnatal.cordCondition || 'dry',
        bcgGiven: existingPostnatal.bcgGiven || false,
        opv0Given: existingPostnatal.opv0Given || false,
        hepB0Given: existingPostnatal.hepB0Given || false,
        familyPlanningDiscussed: existingPostnatal.familyPlanningDiscussed || false,
        familyPlanningMethodAccepted: existingPostnatal.familyPlanningMethodAccepted || '',
        maternalDangerSigns: existingPostnatal.maternalDangerSigns || [],
        babyDangerSigns: existingPostnatal.babyDangerSigns || [],
        malePartnerPresentPNC: existingPostnatal.malePartnerPresentPNC || false,
        referralMade: existingPostnatal.referralMade || false,
        referredTo: existingPostnatal.referredTo || '',
        referralReason: existingPostnatal.referralReason || '',
        nextVisitDate: existingPostnatal.nextVisitDate?.split('T')[0] || '',
        nextVisitType: existingPostnatal.nextVisitType || 'day_42',
        notes: existingPostnatal.notes || '',
      });
    }
  }, [existingPostnatal]);

  const handleChange = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleArrayToggle = (field: string, value: string) => {
    setFormData(prev => {
      const current = prev[field as keyof typeof prev] as string[];
      return current.includes(value)
        ? { ...prev, [field]: current.filter(v => v !== value) }
        : { ...prev, [field]: [...current, value] };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        attendanceId, patientId,
        examinationDate: new Date().toISOString(),
        dayNumber: existingPostnatal?.dayNumber || 1,
        maternalCondition: formData.maternalCondition,
        maternalComplications: formData.maternalComplications.length > 0 ? formData.maternalComplications : [],
        bloodPressure: formData.bloodPressure || undefined,
        temperature: formData.temperature ? parseFloat(formData.temperature) : undefined,
        pulse: formData.pulse ? parseInt(formData.pulse) : undefined,
        fundalHeight: formData.fundalHeight ? parseFloat(formData.fundalHeight) : undefined,
        lochia: formData.lochia,
        perinealCondition: formData.perinealCondition,
        caesareanWound: formData.caesareanWound,
        breastfeedingStatus: formData.breastfeedingStatus,
        breastfeedingDifficulties: formData.breastfeedingDifficulties.length > 0 ? formData.breastfeedingDifficulties : [],
        latching: formData.latching,
        babyCondition: formData.babyCondition,
        babyWeight: formData.babyWeight ? parseFloat(formData.babyWeight) : undefined,
        babyTemperature: formData.babyTemperature ? parseFloat(formData.babyTemperature) : undefined,
        babyFeeding: formData.babyFeeding,
        jaundice: formData.jaundice,
        jaundiceSeverity: formData.jaundice ? formData.jaundiceSeverity : undefined,
        cordCondition: formData.cordCondition,
        bcgGiven: formData.bcgGiven,
        opv0Given: formData.opv0Given,
        hepB0Given: formData.hepB0Given,
        familyPlanningDiscussed: formData.familyPlanningDiscussed,
        familyPlanningMethodAccepted: formData.familyPlanningMethodAccepted || undefined,
        maternalDangerSigns: formData.maternalDangerSigns.length > 0 ? formData.maternalDangerSigns : [],
        babyDangerSigns: formData.babyDangerSigns.length > 0 ? formData.babyDangerSigns : [],
        malePartnerPresentPNC: formData.malePartnerPresentPNC,
        referralMade: formData.referralMade,
        referredTo: formData.referredTo || undefined,
        referralReason: formData.referralReason || undefined,
        nextVisitDate: formData.nextVisitDate ? new Date(formData.nextVisitDate).toISOString() : undefined,
        nextVisitType: formData.nextVisitType as any,
        notes: formData.notes || undefined,
      };
      if (existingPostnatal) {
        await updatePostnatalRecord(existingPostnatal.id, data);
        success('Updated', 'Postnatal record updated successfully');
      } else {
        await createPostnatalRecord(data);
        success('Created', 'Postnatal examination recorded successfully');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Postnatal save error:', err);
      toastError('Error', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const fieldCls = "w-full px-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)] transition-all";
  const labelCls = "block text-[11px] font-semibold text-[var(--text-secondary)] mb-1.5";

  const SECTIONS: { key: SectionKey; label: string; icon: React.ElementType }[] = [
    { key: 'maternal', label: 'Maternal Assessment', icon: Heart },
    { key: 'baby', label: 'Baby Assessment', icon: Baby },
    { key: 'family', label: 'Family Planning & Follow-up', icon: Shield },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-[var(--bg-card)] rounded-xl shadow-xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-[var(--border-color)]">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--icon-cyan-bg)] flex items-center justify-center">
                <Heart className="w-4 h-4 text-[var(--icon-cyan-text)]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                  {existingPostnatal ? 'Edit Postnatal Examination' : 'New Postnatal Examination'}
                </h2>
                <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                  Record postnatal assessment for mother and baby
                </p>
              </div>
            </div>
            <button type="button" onClick={handleReferFromPostnatal}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-cyan-300 text-cyan-700 hover:bg-cyan-50">
                    Refer Patient
                  </button>
                  <button onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)] transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Section tabs */}
          <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-main)] flex-shrink-0 overflow-x-auto">
            {SECTIONS.map(({ key, label, icon: Icon }) => {
              const isActive = activeSection === key;
              return (
                <button key={key} type="button" onClick={() => setActiveSection(key)}
                  className={`flex-1 min-w-[180px] px-4 py-3 text-xs font-semibold flex items-center justify-center gap-2 transition-all relative ${
                    isActive ? 'text-[var(--icon-cyan-text)] bg-[var(--bg-card)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="truncate">{label}</span>
                  {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--icon-cyan-text)]" />}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 space-y-5" style={{ scrollbarWidth: 'thin' }}>

              {/* ── Maternal Assessment ── */}
              {activeSection === 'maternal' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelCls}>Maternal Condition</label>
                      <select value={formData.maternalCondition}
                        onChange={e => handleChange('maternalCondition', e.target.value)} className={fieldCls}>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                        <option value="poor">Poor</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Blood Pressure</label>
                      <input type="text" value={formData.bloodPressure}
                        onChange={e => handleChange('bloodPressure', e.target.value)}
                        placeholder="e.g., 120/80" className={fieldCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Temperature (°C)</label>
                      <input type="number" step="0.1" value={formData.temperature}
                        onChange={e => handleChange('temperature', e.target.value)} className={fieldCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Pulse (bpm)</label>
                      <input type="number" value={formData.pulse}
                        onChange={e => handleChange('pulse', e.target.value)} className={fieldCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Fundal Height (cm)</label>
                      <input type="number" step="0.5" value={formData.fundalHeight}
                        onChange={e => handleChange('fundalHeight', e.target.value)}
                        placeholder="Uterine involution" className={fieldCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Lochia</label>
                      <select value={formData.lochia} onChange={e => handleChange('lochia', e.target.value)} className={fieldCls}>
                        <option value="normal">Normal</option>
                        <option value="heavy">Heavy</option>
                        <option value="foul_smelling">Foul Smelling</option>
                        <option value="scanty">Scanty</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Perineal Condition</label>
                      <select value={formData.perinealCondition}
                        onChange={e => handleChange('perinealCondition', e.target.value)} className={fieldCls}>
                        <option value="intact">Intact</option>
                        <option value="healing">Healing</option>
                        <option value="infected">Infected</option>
                        <option value="dehisced">Dehisced</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Caesarean Wound (if applicable)</label>
                      <select value={formData.caesareanWound}
                        onChange={e => handleChange('caesareanWound', e.target.value)} className={fieldCls}>
                        <option value="healing">Healing</option>
                        <option value="infected">Infected</option>
                        <option value="dehisced">Dehisced</option>
                        <option value="not_applicable">Not Applicable</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-[var(--border-color)] pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-[var(--icon-red-text)]" />
                      <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Maternal Complications</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {MATERNAL_COMPLICATIONS.map(comp => (
                        <label key={comp} className="flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer p-1 rounded hover:bg-[var(--bg-main)] transition-colors">
                          <input type="checkbox" checked={formData.maternalComplications.includes(comp)}
                            onChange={() => handleArrayToggle('maternalComplications', comp)}
                            className="rounded border-[var(--border-color)] text-[var(--icon-red-text)] focus:ring-[var(--icon-red-text)] w-3.5 h-3.5" />
                          {comp}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-[var(--border-color)] pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Baby className="w-3.5 h-3.5 text-[var(--icon-green-text)]" />
                      <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Breastfeeding</h4>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {(['exclusive', 'mixed', 'not_breastfeeding'] as const).map(v => (
                        <label key={v} className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                          <input type="radio" name="breastfeedingStatus" value={v}
                            checked={formData.breastfeedingStatus === v}
                            onChange={e => handleChange('breastfeedingStatus', e.target.value)}
                            className="border-[var(--border-color)] text-[var(--icon-green-text)] focus:ring-[var(--icon-green-text)] w-3.5 h-3.5" />
                          {v === 'not_breastfeeding' ? 'Not Breastfeeding' : v.charAt(0).toUpperCase() + v.slice(1)}
                        </label>
                      ))}
                    </div>
                    <div className="mb-3">
                      <label className={labelCls}>Latching</label>
                      <select value={formData.latching} onChange={e => handleChange('latching', e.target.value)}
                        className={`${fieldCls} md:w-48`}>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                        <option value="poor">Poor</option>
                      </select>
                    </div>
                    <label className={labelCls}>Breastfeeding Difficulties</label>
                    <div className="grid grid-cols-2 gap-2">
                      {BREASTFEEDING_DIFFICULTIES.map(diff => (
                        <label key={diff} className="flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer p-1 rounded hover:bg-[var(--bg-main)] transition-colors">
                          <input type="checkbox" checked={formData.breastfeedingDifficulties.includes(diff)}
                            onChange={() => handleArrayToggle('breastfeedingDifficulties', diff)}
                            className="rounded border-[var(--border-color)] text-[var(--icon-yellow-text)] focus:ring-[var(--icon-yellow-text)] w-3.5 h-3.5" />
                          {diff}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Baby Assessment ── */}
              {activeSection === 'baby' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelCls}>Baby Condition</label>
                      <select value={formData.babyCondition}
                        onChange={e => handleChange('babyCondition', e.target.value)} className={fieldCls}>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                        <option value="poor">Poor</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Baby Weight (kg)</label>
                      <input type="number" step="0.1" value={formData.babyWeight}
                        onChange={e => handleChange('babyWeight', e.target.value)}
                        placeholder="e.g., 3.5" className={fieldCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Baby Temperature (°C)</label>
                      <input type="number" step="0.1" value={formData.babyTemperature}
                        onChange={e => handleChange('babyTemperature', e.target.value)} className={fieldCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Baby Feeding</label>
                      <select value={formData.babyFeeding}
                        onChange={e => handleChange('babyFeeding', e.target.value)} className={fieldCls}>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                        <option value="poor">Poor</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Cord Condition</label>
                      <select value={formData.cordCondition}
                        onChange={e => handleChange('cordCondition', e.target.value)} className={fieldCls}>
                        <option value="dry">Dry</option>
                        <option value="moist">Moist</option>
                        <option value="infected">Infected</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-[var(--border-color)] pt-4">
                    <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer mb-3">
                      <input type="checkbox" checked={formData.jaundice}
                        onChange={e => handleChange('jaundice', e.target.checked)}
                        className="rounded border-[var(--border-color)] text-[var(--icon-yellow-text)] focus:ring-[var(--icon-yellow-text)] w-3.5 h-3.5" />
                      <span className="font-semibold text-[var(--text-primary)]">Jaundice Present</span>
                    </label>
                    {formData.jaundice && (
                      <div className="ml-6 mb-3">
                        <label className={labelCls}>Jaundice Severity</label>
                        <select value={formData.jaundiceSeverity}
                          onChange={e => handleChange('jaundiceSeverity', e.target.value)}
                          className={`${fieldCls} md:w-48`}>
                          <option value="mild">Mild</option>
                          <option value="moderate">Moderate</option>
                          <option value="severe">Severe</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-[var(--border-color)] pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-3.5 h-3.5 text-[var(--icon-green-text)]" />
                      <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Immunizations Given</h4>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { key: 'bcgGiven', label: 'BCG' },
                        { key: 'opv0Given', label: 'OPV0' },
                        { key: 'hepB0Given', label: 'Hep B0' },
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                          <input type="checkbox" checked={formData[key as keyof typeof formData] as boolean}
                            onChange={e => handleChange(key, e.target.checked)}
                            className="rounded border-[var(--border-color)] text-[var(--icon-green-text)] focus:ring-[var(--icon-green-text)] w-3.5 h-3.5" />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-[var(--border-color)] pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-[var(--icon-orange-text)]" />
                      <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Baby Danger Signs</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {BABY_DANGER_SIGNS.map(sign => (
                        <label key={sign} className="flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer p-1 rounded hover:bg-[var(--bg-main)] transition-colors">
                          <input type="checkbox" checked={formData.babyDangerSigns.includes(sign)}
                            onChange={() => handleArrayToggle('babyDangerSigns', sign)}
                            className="rounded border-[var(--border-color)] text-[var(--icon-red-text)] focus:ring-[var(--icon-red-text)] w-3.5 h-3.5" />
                          {sign}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Family Planning & Follow-up ── */}
              {activeSection === 'family' && (
                <div className="space-y-5">
                  {/* Family Planning */}
                  <div className="border border-[var(--border-color)] rounded-lg p-4 bg-[var(--bg-main)]">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-4 h-4 text-[var(--icon-purple-text)]" />
                      <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Family Planning</h4>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer mb-3">
                      <input type="checkbox" checked={formData.familyPlanningDiscussed}
                        onChange={e => handleChange('familyPlanningDiscussed', e.target.checked)}
                        className="rounded border-[var(--border-color)] text-[var(--icon-purple-text)] focus:ring-[var(--icon-purple-text)] w-3.5 h-3.5" />
                      Family Planning Discussed
                    </label>
                    {formData.familyPlanningDiscussed && (
                      <div className="ml-6">
                        <label className={labelCls}>Method Accepted</label>
                        <select value={formData.familyPlanningMethodAccepted}
                          onChange={e => handleChange('familyPlanningMethodAccepted', e.target.value)}
                          className={`${fieldCls} md:w-72`}>
                          <option value="">Select method</option>
                          <optgroup label="Modern Methods">
                            <option value="pills_coc">Combined Oral Pills (COC)</option>
                            <option value="pills_pop">Progestin-Only Pills (POP)</option>
                            <option value="injectable_dmpa">Injectable (DMPA)</option>
                            <option value="injectable_net_en">Injectable (NET-EN)</option>
                            <option value="implant_implanon">Implant (Implanon)</option>
                            <option value="implant_jadelle">Implant (Jadelle)</option>
                            <option value="iud_copper">IUD (Copper)</option>
                            <option value="iud_hormonal">IUD (Hormonal)</option>
                            <option value="condom_male">Male Condom</option>
                            <option value="condom_female">Female Condom</option>
                            <option value="female_sterilization">Female Sterilization</option>
                          </optgroup>
                          <optgroup label="Traditional Methods">
                            <option value="lam">Lactational Amenorrhea (LAM)</option>
                            <option value="withdrawal">Withdrawal</option>
                            <option value="calendar">Calendar/Rhythm</option>
                          </optgroup>
                          <optgroup label="Emergency">
                            <option value="emergency_contraception">Emergency Contraception</option>
                          </optgroup>
                        </select>
                      </div>
                    )}
                    <div className="mt-4 pt-3 border-t border-[var(--border-color)]">
                      <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                        <input type="checkbox" checked={formData.malePartnerPresentPNC}
                          onChange={e => handleChange('malePartnerPresentPNC', e.target.checked)}
                          className="rounded border-[var(--border-color)] text-[var(--icon-cyan-text)] focus:ring-[var(--icon-cyan-text)] w-3.5 h-3.5" />
                        <span className="font-medium text-[var(--text-primary)]">Male Partner Present During PNC</span>
                      </label>
                    </div>
                  </div>

                  {/* Maternal Danger Signs */}
                  <div className="border border-[var(--border-color)] rounded-lg p-4 bg-[var(--bg-main)]">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-[var(--icon-orange-text)]" />
                      <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Maternal Danger Signs</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {MATERNAL_DANGER_SIGNS.map(sign => (
                        <label key={sign} className="flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer p-1 rounded hover:bg-[var(--bg-card)] transition-colors">
                          <input type="checkbox" checked={formData.maternalDangerSigns.includes(sign)}
                            onChange={() => handleArrayToggle('maternalDangerSigns', sign)}
                            className="rounded border-[var(--border-color)] text-[var(--icon-red-text)] focus:ring-[var(--icon-red-text)] w-3.5 h-3.5" />
                          {sign}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Referral */}
                  <div className="border border-[var(--border-color)] rounded-lg p-4 bg-[var(--bg-main)]">
                    <div className="flex items-center gap-2 mb-3">
                      <ArrowLeft className="w-4 h-4 text-[var(--icon-purple-text)]" />
                      <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Referral Information</h4>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer mb-3">
                      <input type="checkbox" checked={formData.referralMade}
                        onChange={e => handleChange('referralMade', e.target.checked)}
                        className="rounded border-[var(--border-color)] text-[var(--icon-purple-text)] focus:ring-[var(--icon-purple-text)] w-3.5 h-3.5" />
                      Referral Made
                    </label>
                    {formData.referralMade && (
                      <div className="grid grid-cols-2 gap-3 ml-6">
                        <div>
                          <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">Referred To</label>
                          <input type="text" value={formData.referredTo}
                            onChange={e => handleChange('referredTo', e.target.value)}
                            placeholder="Facility name" className={fieldCls} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">Reason</label>
                          <input type="text" value={formData.referralReason}
                            onChange={e => handleChange('referralReason', e.target.value)}
                            placeholder="Reason for referral" className={fieldCls} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Next Visit */}
                  <div className="border border-[var(--border-color)] rounded-lg p-4 bg-[var(--bg-main)]">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                      <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Next Visit</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Visit Type</label>
                        <select value={formData.nextVisitType}
                          onChange={e => handleChange('nextVisitType', e.target.value)} className={fieldCls}>
                          <option value="day_7">Day 7</option>
                          <option value="day_14">Day 14</option>
                          <option value="day_28">Day 28</option>
                          <option value="day_42">Day 42 (6 weeks)</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Visit Date</label>
                        <input type="date" value={formData.nextVisitDate}
                          onChange={e => handleChange('nextVisitDate', e.target.value)} className={fieldCls} />
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className={`flex items-center gap-1.5 ${labelCls}`}>
                      <FileText className="w-3 h-3 text-[var(--text-tertiary)]" /> Additional Notes
                    </label>
                    <textarea rows={3} value={formData.notes}
                      onChange={e => handleChange('notes', e.target.value)}
                      placeholder="Any additional observations or instructions..."
                      className={`${fieldCls} resize-none`} />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-[var(--border-color)] bg-[var(--bg-main)] flex-shrink-0">
              <button type="button" onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold border border-[var(--border-color)]
                  text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-all">
                Cancel
              </button>
              <button type="submit" disabled={loading || isLoading}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--icon-cyan-text)] text-white
                  hover:opacity-90 disabled:opacity-50 transition-all">
                {loading || isLoading ? 'Saving…' : (existingPostnatal ? 'Update Record' : 'Save Record')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};