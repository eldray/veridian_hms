// src/components/postnatal/PostnatalModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Heart, Baby, Shield, AlertTriangle, ArrowLeft, Calendar } from 'lucide-react';
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

export const PostnatalModal: React.FC<PostnatalModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  attendanceId,
  patientId,
  existingPostnatal
}) => {
  const { createPostnatalRecord, updatePostnatalRecord, isLoading } = usePostnatalStore();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'maternal' | 'baby' | 'family'>('maternal');
  const [formData, setFormData] = useState({
    // Maternal assessment
    maternalCondition: 'good',
    maternalComplications: [] as string[],
    bloodPressure: '',
    temperature: '',
    pulse: '',
    fundalHeight: '',
    lochia: 'normal',
    perinealCondition: 'intact',
    caesareanWound: 'healing',
    
    // Breastfeeding
    breastfeedingStatus: 'exclusive',
    breastfeedingDifficulties: [] as string[],
    latching: 'good',
    
    // Baby assessment
    babyCondition: 'good',
    babyWeight: '',
    babyTemperature: '',
    babyFeeding: 'good',
    jaundice: false,
    jaundiceSeverity: 'mild',
    cordCondition: 'dry',
    
    // Immunizations
    bcgGiven: false,
    opv0Given: false,
    hepB0Given: false,
    
    // Family Planning
    familyPlanningDiscussed: false,
    familyPlanningMethodAccepted: '',
    
    // Danger signs
    maternalDangerSigns: [] as string[],
    babyDangerSigns: [] as string[],
    
    malePartnerPresentPNC: false,
    exclusiveBFAtDischarge: false,  // ✅ Add comma here
    
    // Referral
    referralMade: false,
    referredTo: '',
    referralReason: '',
    
    // Next visit
    nextVisitDate: '',
    nextVisitType: 'day_42',
    notes: ''
  });

  const MATERNAL_COMPLICATIONS = [
    'Postpartum Haemorrhage', 'Preeclampsia/Eclampsia', 'Sepsis', 
    'Anemia', 'Urinary Retention', 'Constipation', 'Depression',
    'Mastitis', 'Thrombophlebitis', 'Wound Infection'
  ];

  const BREASTFEEDING_DIFFICULTIES = [
    'Poor latch', 'Low milk supply', 'Engorgement', 'Cracked nipples',
    'Painful breastfeeding', 'Baby refuses breast', 'Mastitis'
  ];

  const MATERNAL_DANGER_SIGNS = [
    'Severe headache', 'Blurred vision', 'Heavy bleeding', 'Foul discharge',
    'Severe abdominal pain', 'Difficulty breathing', 'High fever', 'Convulsions'
  ];

  const BABY_DANGER_SIGNS = [
    'Poor feeding', 'Difficulty breathing', 'Yellow skin (jaundice)',
    'Lethargy/Unconscious', 'Fever', 'Hypothermia', 'Cord redness/discharge',
    'Not passing urine/stool', 'Convulsions'
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
        exclusiveBFAtDischarge: existingPostnatal.exclusiveBFAtDischarge || false,  // ✅ Add comma here
        referralMade: existingPostnatal.referralMade || false,
        referredTo: existingPostnatal.referredTo || '',
        referralReason: existingPostnatal.referralReason || '',
        nextVisitDate: existingPostnatal.nextVisitDate?.split('T')[0] || '',
        nextVisitType: existingPostnatal.nextVisitType || 'day_42',
        notes: existingPostnatal.notes || ''
      });
    }
  }, [existingPostnatal]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayToggle = (field: string, value: string) => {
    setFormData(prev => {
      const current = prev[field as keyof typeof prev] as string[];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(v => v !== value) };
      } else {
        return { ...prev, [field]: [...current, value] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        attendanceId,
        patientId,
        examinationDate: new Date().toISOString(),
        dayNumber: existingPostnatal?.dayNumber || 1,
        maternalCondition: formData.maternalCondition,
        maternalComplications: formData.maternalComplications,
        bloodPressure: formData.bloodPressure,
        temperature: formData.temperature ? parseFloat(formData.temperature) : undefined,
        pulse: formData.pulse ? parseInt(formData.pulse) : undefined,
        fundalHeight: formData.fundalHeight ? parseFloat(formData.fundalHeight) : undefined,
        lochia: formData.lochia,
        perinealCondition: formData.perinealCondition,
        caesareanWound: formData.caesareanWound,
        breastfeedingStatus: formData.breastfeedingStatus,
        breastfeedingDifficulties: formData.breastfeedingDifficulties,
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
        maternalDangerSigns: formData.maternalDangerSigns,
        babyDangerSigns: formData.babyDangerSigns,
        malePartnerPresentPNC: formData.malePartnerPresentPNC,
        exclusiveBFAtDischarge: formData.exclusiveBFAtDischarge,
        
        referralMade: formData.referralMade,
        referredTo: formData.referredTo || undefined,
        referralReason: formData.referralReason || undefined,
        nextVisitDate: formData.nextVisitDate || undefined,
        nextVisitType: formData.nextVisitType as any,
        notes: formData.notes
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
      toastError('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-[var(--bg-card)] rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-[var(--bg-card)] px-6 py-4 border-b flex justify-between items-center z-10">
            <div>
              <h2 className="text-lg font-bold">{existingPostnatal ? 'Edit Postnatal Examination' : 'New Postnatal Examination'}</h2>
              <p className="text-sm text-[var(--text-secondary)]">Record postnatal assessment for mother and baby</p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-[var(--bg-main)] rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Section Tabs */}
          <div className="flex border-b px-6 bg-[var(--bg-main)]">
            <button
              onClick={() => setActiveSection('maternal')}
              className={`py-2 px-4 text-sm font-medium flex items-center gap-2 transition-all ${
                activeSection === 'maternal' 
                  ? 'border-b-2 border-pink-500 text-pink-600' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Heart className="w-4 h-4" />
              Maternal Assessment
            </button>
            <button
              onClick={() => setActiveSection('baby')}
              className={`py-2 px-4 text-sm font-medium flex items-center gap-2 transition-all ${
                activeSection === 'baby' 
                  ? 'border-b-2 border-pink-500 text-pink-600' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Baby className="w-4 h-4" />
              Baby Assessment
            </button>
            <button
              onClick={() => setActiveSection('family')}
              className={`py-2 px-4 text-sm font-medium flex items-center gap-2 transition-all ${
                activeSection === 'family' 
                  ? 'border-b-2 border-pink-500 text-pink-600' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Heart className="w-4 h-4" />
              Family Planning & Follow-up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Section 1: Maternal Assessment */}
            {activeSection === 'maternal' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Maternal Condition</label>
                    <select
                      value={formData.maternalCondition}
                      onChange={(e) => handleChange('maternalCondition', e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                    >
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Blood Pressure</label>
                    <input
                      type="text"
                      value={formData.bloodPressure}
                      onChange={(e) => handleChange('bloodPressure', e.target.value)}
                      placeholder="e.g., 120/80"
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Temperature (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.temperature}
                      onChange={(e) => handleChange('temperature', e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Pulse (bpm)</label>
                    <input
                      type="number"
                      value={formData.pulse}
                      onChange={(e) => handleChange('pulse', e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Fundal Height (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={formData.fundalHeight}
                      onChange={(e) => handleChange('fundalHeight', e.target.value)}
                      placeholder="Uterine involution"
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Lochia</label>
                    <select
                      value={formData.lochia}
                      onChange={(e) => handleChange('lochia', e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                    >
                      <option value="normal">Normal</option>
                      <option value="heavy">Heavy</option>
                      <option value="foul_smelling">Foul Smelling</option>
                      <option value="scanty">Scanty</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Perineal Condition</label>
                    <select
                      value={formData.perinealCondition}
                      onChange={(e) => handleChange('perinealCondition', e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                    >
                      <option value="intact">Intact</option>
                      <option value="healing">Healing</option>
                      <option value="infected">Infected</option>
                      <option value="dehisced">Dehisced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Caesarean Wound (if applicable)</label>
                    <select
                      value={formData.caesareanWound}
                      onChange={(e) => handleChange('caesareanWound', e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                    >
                      <option value="healing">Healing</option>
                      <option value="infected">Infected</option>
                      <option value="dehisced">Dehisced</option>
                      <option value="not_applicable">Not Applicable</option>
                    </select>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <label className="block text-sm font-medium mb-2">Maternal Complications</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {MATERNAL_COMPLICATIONS.map(comp => (
                      <label key={comp} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={formData.maternalComplications.includes(comp)}
                          onChange={() => handleArrayToggle('maternalComplications', comp)}
                          className="rounded"
                        />
                        {comp}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <label className="block text-sm font-medium mb-2">Breastfeeding Status</label>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="breastfeedingStatus"
                        value="exclusive"
                        checked={formData.breastfeedingStatus === 'exclusive'}
                        onChange={(e) => handleChange('breastfeedingStatus', e.target.value)}
                      />
                      Exclusive
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="breastfeedingStatus"
                        value="mixed"
                        checked={formData.breastfeedingStatus === 'mixed'}
                        onChange={(e) => handleChange('breastfeedingStatus', e.target.value)}
                      />
                      Mixed
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="breastfeedingStatus"
                        value="not_breastfeeding"
                        checked={formData.breastfeedingStatus === 'not_breastfeeding'}
                        onChange={(e) => handleChange('breastfeedingStatus', e.target.value)}
                      />
                      Not Breastfeeding
                    </label>
                  </div>

                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-1">Latching</label>
                    <select
                      value={formData.latching}
                      onChange={(e) => handleChange('latching', e.target.value)}
                      className="w-48 px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                    >
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                    </select>
                  </div>

                  <label className="block text-sm font-medium mb-2">Breastfeeding Difficulties</label>
                  <div className="grid grid-cols-2 gap-2">
                    {BREASTFEEDING_DIFFICULTIES.map(diff => (
                      <label key={diff} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={formData.breastfeedingDifficulties.includes(diff)}
                          onChange={() => handleArrayToggle('breastfeedingDifficulties', diff)}
                          className="rounded"
                        />
                        {diff}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Section 2: Baby Assessment */}
            {activeSection === 'baby' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Baby Condition</label>
                    <select
                      value={formData.babyCondition}
                      onChange={(e) => handleChange('babyCondition', e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                    >
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Baby Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.babyWeight}
                      onChange={(e) => handleChange('babyWeight', e.target.value)}
                      placeholder="e.g., 3.5"
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Baby Temperature (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.babyTemperature}
                      onChange={(e) => handleChange('babyTemperature', e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Baby Feeding</label>
                    <select
                      value={formData.babyFeeding}
                      onChange={(e) => handleChange('babyFeeding', e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                    >
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Cord Condition</label>
                    <select
                      value={formData.cordCondition}
                      onChange={(e) => handleChange('cordCondition', e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                    >
                      <option value="dry">Dry</option>
                      <option value="moist">Moist</option>
                      <option value="infected">Infected</option>
                    </select>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <label className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      checked={formData.jaundice}
                      onChange={(e) => handleChange('jaundice', e.target.checked)}
                      className="rounded"
                    />
                    <span className="font-medium">Jaundice Present</span>
                  </label>
                  {formData.jaundice && (
                    <div className="ml-6 mb-3">
                      <label className="block text-sm font-medium mb-1">Jaundice Severity</label>
                      <select
                        value={formData.jaundiceSeverity}
                        onChange={(e) => handleChange('jaundiceSeverity', e.target.value)}
                        className="w-48 px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                      >
                        <option value="mild">Mild</option>
                        <option value="moderate">Moderate</option>
                        <option value="severe">Severe</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Immunizations Given</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.bcgGiven}
                        onChange={(e) => handleChange('bcgGiven', e.target.checked)}
                        className="rounded"
                      />
                      BCG
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.opv0Given}
                        onChange={(e) => handleChange('opv0Given', e.target.checked)}
                        className="rounded"
                      />
                      OPV0
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.hepB0Given}
                        onChange={(e) => handleChange('hepB0Given', e.target.checked)}
                        className="rounded"
                      />
                      Hep B0
                    </label>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <label className="block text-sm font-medium mb-2">Baby Danger Signs</label>
                  <div className="grid grid-cols-2 gap-2">
                    {BABY_DANGER_SIGNS.map(sign => (
                      <label key={sign} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={formData.babyDangerSigns.includes(sign)}
                          onChange={() => handleArrayToggle('babyDangerSigns', sign)}
                          className="rounded"
                        />
                        {sign}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Section 3: Family Planning & Follow-up */}
            {activeSection === 'family' && (
              <div className="space-y-5">
                {/* Family Planning Section */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                    Family Planning
                  </h4>
                  
                  <label className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      checked={formData.familyPlanningDiscussed}
                      onChange={(e) => handleChange('familyPlanningDiscussed', e.target.checked)}
                      className="rounded"
                    />
                    <span>Family Planning Discussed</span>
                  </label>
                  
                  {formData.familyPlanningDiscussed && (
                    <div className="ml-6 space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Method Accepted</label>
                        <select
                          value={formData.familyPlanningMethodAccepted}
                          onChange={(e) => handleChange('familyPlanningMethodAccepted', e.target.value)}
                          className="w-full md:w-64 px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                        >
                          <option value="">Select method</option>
                          {/* Modern Methods */}
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
                          {/* Traditional Methods */}
                          <optgroup label="Traditional Methods">
                            <option value="lam">Lactational Amenorrhea (LAM)</option>
                            <option value="withdrawal">Withdrawal</option>
                            <option value="calendar">Calendar/Rhythm</option>
                          </optgroup>
                          {/* Emergency */}
                          <optgroup label="Emergency">
                            <option value="emergency_contraception">Emergency Contraception</option>
                          </optgroup>
                        </select>
                      </div>
                      
                      {/* ✅ NEW: Exclusive Breastfeeding at Discharge */}
                      <label className="flex items-center gap-2 mt-2">
                        <input
                          type="checkbox"
                          checked={formData.exclusiveBFAtDischarge}
                          onChange={(e) => handleChange('exclusiveBFAtDischarge', e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm font-medium">Exclusively Breastfeeding at Discharge</span>
                      </label>
                    </div>
                  )}
                  
                  {/* ✅ NEW: Male Partner Involvement in PNC */}
                  <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.malePartnerPresentPNC}
                        onChange={(e) => handleChange('malePartnerPresentPNC', e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">Male Partner Present During PNC</span>
                    </label>
                  </div>
                </div>

                {/* Maternal Danger Signs */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[var(--icon-orange-text)]" />
                    Maternal Danger Signs
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {MATERNAL_DANGER_SIGNS.map(sign => (
                      <label key={sign} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={formData.maternalDangerSigns.includes(sign)}
                          onChange={() => handleArrayToggle('maternalDangerSigns', sign)}
                          className="rounded"
                        />
                        {sign}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Referral Information */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4 text-[var(--icon-purple-text)]" />
                    Referral Information
                  </h4>
                  <label className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      checked={formData.referralMade}
                      onChange={(e) => handleChange('referralMade', e.target.checked)}
                      className="rounded"
                    />
                    <span>Referral Made</span>
                  </label>
                  {formData.referralMade && (
                    <div className="grid grid-cols-2 gap-3 ml-6">
                      <div>
                        <label className="block text-xs font-medium mb-1">Referred To</label>
                        <input
                          type="text"
                          value={formData.referredTo}
                          onChange={(e) => handleChange('referredTo', e.target.value)}
                          placeholder="Facility name"
                          className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Reason</label>
                        <input
                          type="text"
                          value={formData.referralReason}
                          onChange={(e) => handleChange('referralReason', e.target.value)}
                          placeholder="Reason for referral"
                          className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Next Visit */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                    Next Visit
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Visit Type</label>
                      <select
                        value={formData.nextVisitType}
                        onChange={(e) => handleChange('nextVisitType', e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                      >
                        <option value="day_7">Day 7</option>
                        <option value="day_14">Day 14</option>
                        <option value="day_28">Day 28</option>
                        <option value="day_42">Day 42 (6 weeks)</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Visit Date</label>
                      <input
                        type="date"
                        value={formData.nextVisitDate}
                        onChange={(e) => handleChange('nextVisitDate', e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Notes */}
                <div>
                  <label className="block text-sm font-medium mb-1">Additional Notes</label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    placeholder="Any additional observations or instructions..."
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="sticky bottom-0 bg-[var(--bg-card)] pt-4 border-t flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded-lg hover:bg-[var(--bg-main)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : (existingPostnatal ? 'Update Record' : 'Save Record')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};