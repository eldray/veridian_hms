// src/components/antenatal/ANCBookingModal.tsx
import React, { useState } from 'react';
import { X, Calendar, Heart, Ruler, Weight, Syringe, AlertTriangle, Droplet } from 'lucide-react';
import { useAntenatalStore } from '../../store/antenatalStore';
import { useToast } from '../../store/toastStore';

interface ANCBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patientId: string;
  attendanceId: string;
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

export const ANCVisitModal: React.FC<ANCBookingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  patientId,
  attendanceId
}) => {
  const { createBooking } = useAntenatalStore();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pregnancy' | 'history' | 'preventions'>('pregnancy');

  // Form state
  const [formData, setFormData] = useState({
    // Pregnancy Information
    lmp: '',
    edd: '',
    gestationalAgeWeeks: '',
    eddByUltrasound: '',
    
    // Obstetric History
    gravida: 1,
    para: 0,
    previousCSection: false,
    previousComplications: [] as string[],
    previousComplicationsOther: '',
    
    // Medical History
    chronicHypertension: false,
    diabetesMellitus: false,
    heartDisease: false,
    renalDisease: false,
    asthma: false,
    epilepsy: false,
    hivStatus: '' as '' | 'Positive' | 'Negative' | 'Unknown',
    syphilisStatus: '' as '' | 'Positive' | 'Negative' | 'Unknown',
    hepatitisBStatus: '' as '' | 'Positive' | 'Negative' | 'Unknown',
    
    // Booking Measurements
    bookingWeight: '',
    bookingHeight: '',
    bookingBMI: '',
    bookingBP: '',
    bookingHb: '',
    bloodGroup: '',
    rhesusFactor: '' as '' | 'Positive' | 'Negative',
    
    // Preventions at Booking
    ttStatus: '',
    ttDoseGiven: false,
    ttDoseNumber: '',
    iptpGiven: false,
    iptpDoseNumber: '',
    ironGiven: false,
    folateGiven: false,
    itnGiven: false,
    
    // Risk Assessment
    riskLevel: 'low' as 'low' | 'medium' | 'high',
    riskFactors: [] as string[],
    
    // Additional Info
    occupation: '',
    partnerName: '',
    partnerContact: '',
    malePartnerInvolved: false,
    partnerHIVStatus: '' as '' | 'Positive' | 'Negative' | 'Unknown',
    emergencyContact: '',
    emergencyContactPhone: '',
    notes: ''
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-calculate EDD from LMP
  if (field === 'lmp' && value) {
      const lmp = new Date(value);
      if (!isNaN(lmp.getTime())) {
        const edd = new Date(lmp);
        edd.setDate(edd.getDate() + 280);
        const eddStr = edd.toISOString().split('T')[0];
        setFormData(prev => ({ ...prev, edd: eddStr }));
        
        // Calculate gestational age in weeks
        const today = new Date();
        const diffTime = today.getTime() - lmp.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        const weeks = Math.floor(diffDays / 7);
        if (weeks >= 0 && weeks <= 42) {
          setFormData(prev => ({ ...prev, gestationalAgeWeeks: weeks.toString() }));
        }
      }
    }
    
    // Calculate BMI when weight and height are entered
    if ((field === 'bookingWeight' || field === 'bookingHeight') && formData.bookingWeight && formData.bookingHeight) {
      const weight = field === 'bookingWeight' ? parseFloat(value) : parseFloat(formData.bookingWeight);
      const height = field === 'bookingHeight' ? parseFloat(value) : parseFloat(formData.bookingHeight);
      if (weight && height && height > 0) {
        const heightInMeters = height / 100;
        const bmi = weight / (heightInMeters * heightInMeters);
        setFormData(prev => ({ ...prev, bookingBMI: bmi.toFixed(1) }));
      }
    }
  };

  const handleCheckboxArray = (field: string, value: string, checked: boolean) => {
    const current = formData[field as keyof typeof formData] as string[];
    if (checked) {
      setFormData(prev => ({ ...prev, [field]: [...current, value] }));
    } else {
      setFormData(prev => ({ ...prev, [field]: current.filter(v => v !== value) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        patientId,
        attendanceId,
        lmp: formData.lmp || undefined,
        edd: formData.edd || undefined,
        gestationalAgeWeeks: formData.gestationalAgeWeeks ? parseInt(formData.gestationalAgeWeeks) : undefined,
        gravida: formData.gravida,
        para: formData.para,
        previousCSection: formData.previousCSection,
        previousComplications: [...formData.previousComplications, formData.previousComplicationsOther].filter(Boolean),
        chronicHypertension: formData.chronicHypertension,
        diabetesMellitus: formData.diabetesMellitus,
        heartDisease: formData.heartDisease,
        renalDisease: formData.renalDisease,
        asthma: formData.asthma,
        epilepsy: formData.epilepsy,
        hivStatus: formData.hivStatus,
        syphilisStatus: formData.syphilisStatus,
        hepatitisBStatus: formData.hepatitisBStatus,
        bookingWeight: formData.bookingWeight ? parseFloat(formData.bookingWeight) : undefined,
        bookingHeight: formData.bookingHeight ? parseFloat(formData.bookingHeight) : undefined,
        bookingBMI: formData.bookingBMI ? parseFloat(formData.bookingBMI) : undefined,
        bookingBP: formData.bookingBP,
        bookingHb: formData.bookingHb ? parseFloat(formData.bookingHb) : undefined,
        bloodGroup: formData.bloodGroup,
        rhesusFactor: formData.rhesusFactor,
        ttStatus: formData.ttStatus,
        ttDoseGiven: formData.ttDoseGiven,
        ttDoseNumber: formData.ttDoseNumber ? parseInt(formData.ttDoseNumber) : undefined,
        iptpGiven: formData.iptpGiven,
        iptpDoseNumber: formData.iptpDoseNumber ? parseInt(formData.iptpDoseNumber) : undefined,
        ironGiven: formData.ironGiven,
        folateGiven: formData.folateGiven,
        itnGiven: formData.itnGiven,
        riskLevel: formData.riskLevel,
        riskFactors: formData.riskFactors,
        occupation: formData.occupation,
        partnerName: formData.partnerName,
        partnerContact: formData.partnerContact,
        malePartnerInvolved: formData.malePartnerInvolved,
        partnerHIVStatus: formData.partnerHIVStatus || undefined,
        emergencyContact: formData.emergencyContact,
        emergencyContactPhone: formData.emergencyContactPhone,
        notes: formData.notes
      };

      await createBooking(data);
      success('Success', 'Pregnancy record created successfully');
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
              <h2 className="text-xl font-bold text-pink-600">Create Pregnancy Record</h2>
              <p className="text-sm text-[var(--text-secondary)]">Complete antenatal booking form</p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-[var(--bg-main)] rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b px-6">
            <button
              onClick={() => setActiveTab('pregnancy')}
              className={`py-2 px-4 text-sm font-medium flex items-center gap-2 ${
                activeTab === 'pregnancy' ? 'border-b-2 border-pink-500 text-pink-600' : 'text-[var(--text-secondary)]'
              }`}
            >
              <Heart className="w-4 h-4" /> Pregnancy Details
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-4 text-sm font-medium flex items-center gap-2 ${
                activeTab === 'history' ? 'border-b-2 border-pink-500 text-pink-600' : 'text-[var(--text-secondary)]'
              }`}
            >
              <Calendar className="w-4 h-4" /> Obstetric History
            </button>
            <button
              onClick={() => setActiveTab('preventions')}
              className={`py-2 px-4 text-sm font-medium flex items-center gap-2 ${
                activeTab === 'preventions' ? 'border-b-2 border-pink-500 text-pink-600' : 'text-[var(--text-secondary)]'
              }`}
            >
              <Syringe className="w-4 h-4" /> Preventions & Risk
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Tab 1: Pregnancy Details */}
            {activeTab === 'pregnancy' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">LMP (Last Menstrual Period) *</label>
                    <input
                      type="date"
                      value={formData.lmp}
                      onChange={(e) => handleChange('lmp', e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg focus:ring-2 focus:ring-pink-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">EDD (Estimated Due Date)</label>
                    <input
                      type="date"
                      value={formData.edd}
                      onChange={(e) => handleChange('edd', e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                      placeholder="Auto-calculated from LMP"
                    />
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Auto-calculated from LMP (40 weeks)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Gestational Age (weeks)</label>
                    <input
                      type="number"
                      step="1"
                      value={formData.gestationalAgeWeeks}
                      onChange={(e) => handleChange('gestationalAgeWeeks', e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                      placeholder="Auto-calculated from LMP"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Measurements at Booking</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Weight (kg)</label>
                      <div className="flex items-center gap-2">
                        <Weight className="w-4 h-4 text-[var(--text-secondary)]" />
                        <input
                          type="number"
                          step="0.1"
                          value={formData.bookingWeight}
                          onChange={(e) => handleChange('bookingWeight', e.target.value)}
                          className="flex-1 px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                          placeholder="e.g., 65.5"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Height (cm)</label>
                      <div className="flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-[var(--text-secondary)]" />
                        <input
                          type="number"
                          step="0.5"
                          value={formData.bookingHeight}
                          onChange={(e) => handleChange('bookingHeight', e.target.value)}
                          className="flex-1 px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                          placeholder="e.g., 160"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">BMI</label>
                      <input
                        type="text"
                        value={formData.bookingBMI}
                        readOnly
                        className="w-full px-3 py-2 bg-gray-100 border rounded-lg"
                        placeholder="Auto-calculated"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Blood Pressure</label>
                      <input
                        type="text"
                        value={formData.bookingBP}
                        onChange={(e) => handleChange('bookingBP', e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                        placeholder="e.g., 120/80"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Hb Level (g/dL)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.bookingHb}
                        onChange={(e) => handleChange('bookingHb', e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                        placeholder="e.g., 11.5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Blood Group</label>
                      <select
                        value={formData.bloodGroup}
                        onChange={(e) => handleChange('bloodGroup', e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                      >
                        <option value="">Select</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Rhesus Factor</label>
                      <select
                        value={formData.rhesusFactor}
                        onChange={(e) => handleChange('rhesusFactor', e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
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

            {/* Tab 2: Obstetric History */}
            {activeTab === 'history' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Gravida (Total pregnancies) *</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.gravida}
                      onChange={(e) => handleChange('gravida', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Para (Total deliveries) *</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.para}
                      onChange={(e) => handleChange('para', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                      required
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.previousCSection}
                    onChange={(e) => handleChange('previousCSection', e.target.checked)}
                    className="rounded"
                  />
                  <span>Previous C-Section</span>
                </label>

                <div>
                  <label className="block text-sm font-medium mb-2">Previous Complications</label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                    {PREVIOUS_COMPLICATIONS.map(comp => (
                      <label key={comp} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={formData.previousComplications.includes(comp)}
                          onChange={(e) => handleCheckboxArray('previousComplications', comp, e.target.checked)}
                          className="rounded"
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
                    className="mt-2 w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                  />
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Medical History</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      'chronicHypertension', 'diabetesMellitus', 'heartDisease',
                      'renalDisease', 'asthma', 'epilepsy'
                    ].map(condition => (
                      <label key={condition} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData[condition as keyof typeof formData] as boolean}
                          onChange={(e) => handleChange(condition, e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm capitalize">{condition.replace(/([A-Z])/g, ' $1').trim()}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">HIV Status</label>
                    <select
                      value={formData.hivStatus}
                      onChange={(e) => handleChange('hivStatus', e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                    >
                      <option value="">Select</option>
                      <option value="Positive">Positive</option>
                      <option value="Negative">Negative</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Syphilis Status</label>
                    <select
                      value={formData.syphilisStatus}
                      onChange={(e) => handleChange('syphilisStatus', e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                    >
                      <option value="">Select</option>
                      <option value="Positive">Positive</option>
                      <option value="Negative">Negative</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Hepatitis B Status</label>
                    <select
                      value={formData.hepatitisBStatus}
                      onChange={(e) => handleChange('hepatitisBStatus', e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                    >
                      <option value="">Select</option>
                      <option value="Positive">Positive</option>
                      <option value="Negative">Negative</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Occupation</label>
                    <input
                      type="text"
                      value={formData.occupation}
                      onChange={(e) => handleChange('occupation', e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Partner Name</label>
                    <input
                      type="text"
                      value={formData.partnerName}
                      onChange={(e) => handleChange('partnerName', e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Partner Contact</label>
                    <input
                      type="text"
                      value={formData.partnerContact}
                      onChange={(e) => handleChange('partnerContact', e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Partner HIV Status</label>
                    <select
                      value={formData.partnerHIVStatus}
                      onChange={(e) => handleChange('partnerHIVStatus', e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                    >
                      <option value="">Not tested</option>
                      <option value="Positive">Positive</option>
                      <option value="Negative">Negative</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3 mt-6">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.malePartnerInvolved}
                        onChange={(e) => handleChange('malePartnerInvolved', e.target.checked)}
                        className="rounded"
                      />
                      <span className="font-medium">Male Partner Involved in ANC</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Preventions & Risk */}
            {activeTab === 'preventions' && (
              <div className="space-y-5">
                <div className="border rounded-lg p-4 bg-green-50/20">
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <Syringe className="w-4 h-4 text-green-600" />
                    Vaccinations & Preventions at Booking
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.ttDoseGiven}
                        onChange={(e) => handleChange('ttDoseGiven', e.target.checked)}
                        className="rounded"
                      />
                      <span>Tetanus Toxoid (TT) given at booking</span>
                    </label>
                    {formData.ttDoseGiven && (
                      <div className="ml-6">
                        <label className="block text-sm font-medium mb-1">TT Dose Number</label>
                        <select
                          value={formData.ttDoseNumber}
                          onChange={(e) => handleChange('ttDoseNumber', e.target.value)}
                          className="w-48 px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                        >
                          <option value="">Select dose</option>
                          {[1, 2, 3, 4, 5].map(d => <option key={d} value={d}>TT{d}</option>)}
                        </select>
                      </div>
                    )}

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.iptpGiven}
                        onChange={(e) => handleChange('iptpGiven', e.target.checked)}
                        className="rounded"
                      />
                      <span>IPTp given at booking</span>
                    </label>
                    {formData.iptpGiven && (
                      <div className="ml-6">
                        <label className="block text-sm font-medium mb-1">IPTp Dose Number</label>
                        <select
                          value={formData.iptpDoseNumber}
                          onChange={(e) => handleChange('iptpDoseNumber', e.target.value)}
                          className="w-48 px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                        >
                          <option value="">Select dose</option>
                          {[1, 2, 3, 4, 5].map(d => <option key={d} value={d}>Dose {d}</option>)}
                        </select>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-4 pt-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.ironGiven}
                          onChange={(e) => handleChange('ironGiven', e.target.checked)}
                          className="rounded"
                        />
                        <span>Iron supplements given</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.folateGiven}
                          onChange={(e) => handleChange('folateGiven', e.target.checked)}
                          className="rounded"
                        />
                        <span>Folate supplements given</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.itnGiven}
                          onChange={(e) => handleChange('itnGiven', e.target.checked)}
                          className="rounded"
                        />
                        <span>ITN (mosquito net) given</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    Risk Assessment
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Risk Level</label>
                      <select
                        value={formData.riskLevel}
                        onChange={(e) => handleChange('riskLevel', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          formData.riskLevel === 'high' ? 'bg-red-50 border-red-300' :
                          formData.riskLevel === 'medium' ? 'bg-yellow-50 border-yellow-300' :
                          'bg-green-50 border-green-300'
                        }`}
                      >
                        <option value="low">Low Risk</option>
                        <option value="medium">Medium Risk</option>
                        <option value="high">High Risk</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Risk Factors</label>
                      <input
                        type="text"
                        value={formData.riskFactors.join(', ')}
                        onChange={(e) => handleChange('riskFactors', e.target.value.split(',').map(s => s.trim()))}
                        placeholder="e.g., Advanced maternal age, Obesity, Multiple pregnancy"
                        className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                    placeholder="Additional clinical notes, concerns, or observations..."
                  />
                </div>
              </div>
            )}

            {/* Footer */}
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
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Pregnancy Record'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};