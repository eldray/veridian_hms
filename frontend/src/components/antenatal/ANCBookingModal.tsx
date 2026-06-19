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
  existingRecord?: any; // For edit mode
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

export const ANCBookingModal: React.FC<ANCBookingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  patientId,
  attendanceId,
  existingRecord
}) => {
  const { registerAntenatalBooking, updateAntenatalRecord } = useAntenatalStore();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pregnancy' | 'history' | 'preventions'>('pregnancy');

  // Determine if this is edit mode
  const isEditing = !!existingRecord;

  // Form state
  const [formData, setFormData] = useState({
    // Pregnancy Information (ONLY for first booking)
    lmp: existingRecord?.lmp?.split('T')[0] || '',
    edd: existingRecord?.edd?.split('T')[0] || '',
    gestationalAgeWeeks: existingRecord?.gestationalAgeWeeks?.toString() || '',
    
    // Obstetric History
    gravida: existingRecord?.gravida || 1,
    para: existingRecord?.para || 0,
    previousCSection: existingRecord?.previousCSection || false,
    previousComplications: existingRecord?.previousComplications || [] as string[],
    previousComplicationsOther: '',
    
    // Medical History
    chronicHypertension: existingRecord?.chronicHypertension || false,
    diabetesMellitus: existingRecord?.diabetesMellitus || false,
    heartDisease: existingRecord?.heartDisease || false,
    renalDisease: existingRecord?.renalDisease || false,
    asthma: existingRecord?.asthma || false,
    epilepsy: existingRecord?.epilepsy || false,
    hivStatus: existingRecord?.hivStatus || '',
    syphilisStatus: existingRecord?.syphilisStatus || '',
    hepatitisBStatus: existingRecord?.hepatitisBStatus || '',
    
    // Booking Measurements
    bookingWeight: existingRecord?.bookingWeight?.toString() || '',
    bookingHeight: existingRecord?.bookingHeight?.toString() || '',
    bookingBMI: existingRecord?.bookingBMI?.toString() || '',
    bookingBP: existingRecord?.bookingBP || '',
    bookingHb: existingRecord?.bookingHb?.toString() || '',
    bloodGroup: existingRecord?.bloodGroup || '',
    rhesusFactor: existingRecord?.rhesusFactor || '',
    
    // Preventions (track doses sequentially)
    ttDosesGiven: existingRecord?.ttDosesGiven || 0,
    iptpDosesGiven: existingRecord?.iptpDosesGiven || 0,
    ironGiven: existingRecord?.ironGiven || false,
    folateGiven: existingRecord?.folateGiven || false,
    itnGiven: existingRecord?.itnGiven || false,
    
    // Risk Assessment
    riskLevel: existingRecord?.riskLevel || 'low',
    riskFactors: existingRecord?.riskFactors || [] as string[],
    
    // Additional Info
    occupation: existingRecord?.occupation || '',
    partnerName: existingRecord?.partnerName || '',
    partnerContact: existingRecord?.partnerContact || '',
    malePartnerInvolved: existingRecord?.malePartnerInvolved || false,
    partnerHIVStatus: existingRecord?.partnerHIVStatus || '',
    emergencyContact: existingRecord?.emergencyContact || '',
    emergencyContactPhone: existingRecord?.emergencyContactPhone || '',
    notes: existingRecord?.notes || ''
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-calculate EDD from LMP (only for new booking)
    if (!isEditing && field === 'lmp' && value) {
      const lmp = new Date(value);
      if (!isNaN(lmp.getTime())) {
        const edd = new Date(lmp);
        edd.setDate(edd.getDate() + 280);
        const eddStr = edd.toISOString().split('T')[0];
        setFormData(prev => ({ ...prev, edd: eddStr }));
        
        const today = new Date();
        const diffTime = today.getTime() - lmp.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        const weeks = Math.floor(diffDays / 7);
        if (weeks >= 0 && weeks <= 42) {
          setFormData(prev => ({ ...prev, gestationalAgeWeeks: weeks.toString() }));
        }
      }
    }
    
    // Calculate BMI
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

  // Handle sequential IPTp dose increment
  const handleIPTpGiven = () => {
    const nextDose = formData.iptpDosesGiven + 1;
    if (nextDose <= 5) {
      setFormData(prev => ({ ...prev, iptpDosesGiven: nextDose }));
      success('IPTp', `Dose ${nextDose} of 5 recorded`);
    } else {
      toastError('IPTp', 'Maximum 5 doses reached');
    }
  };

  // Handle sequential TT dose increment
  const handleTTGiven = () => {
    const nextDose = formData.ttDosesGiven + 1;
    if (nextDose <= 5) {
      setFormData(prev => ({ ...prev, ttDosesGiven: nextDose }));
      success('TT', `Dose ${nextDose} of 5 recorded`);
    } else {
      toastError('TT', 'Maximum 5 doses reached');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
  
    try {
      if (isEditing && existingRecord?.id) {
        // For UPDATE - only send updatable fields
        const updateData = {
          gravida: formData.gravida,
          para: formData.para,
          riskLevel: formData.riskLevel,
          // Add other updatable fields as needed
        };
        await updateAntenatalRecord(existingRecord.id, updateData);
        success('Success', 'Pregnancy record updated successfully');
      } else {
        // For CREATE - ONLY send fields backend expects
        const createData = {
          patientId,
          attendanceId,
          lmp: formData.lmp,  // Required
          gravida: formData.gravida,  // Required
          para: formData.para,  // Required
          riskLevel: formData.riskLevel || 'low',  // Optional with default
        };
        
        console.log('Sending to backend:', createData);
        await registerAntenatalBooking(createData);
        success('Success', 'Pregnancy record created successfully');
      }
      
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error:', err.response?.data);
      console.error('Validation errors:', err.response?.data?.errors);  
      toastError('Error', err.response?.data?.message || err.message);
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
              <h2 className="text-xl font-bold text-pink-600">
                {isEditing ? 'Edit Pregnancy Record' : 'Create Pregnancy Record'}
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {isEditing ? 'Update antenatal booking information' : 'Complete antenatal booking form (first visit only)'}
              </p>
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
                {!isEditing ? (
                  // First-time booking - can set LMP
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
                ) : (
                  // Edit mode - show readonly info
                  <div className="bg-gray-50 rounded-lg p-4 border">
                    <p className="text-sm text-[var(--text-secondary)]">
                      <strong>LMP:</strong> {formData.lmp ? new Date(formData.lmp).toLocaleDateString() : 'Not recorded'} | 
                      <strong> EDD:</strong> {formData.edd ? new Date(formData.edd).toLocaleDateString() : 'N/A'} |
                      <strong> Gestation:</strong> {formData.gestationalAgeWeeks || '?'} weeks
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-2">LMP and EDD cannot be changed after creation</p>
                  </div>
                )}

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
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const current = [...formData.previousComplications];
                            if (checked) {
                              current.push(comp);
                            } else {
                              const index = current.indexOf(comp);
                              if (index > -1) current.splice(index, 1);
                            }
                            handleChange('previousComplications', current);
                          }}
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
                    Vaccinations & Preventions
                  </h3>
                  
                  <div className="space-y-4">
                    {/* TT Doses - Sequential */}
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div>
                        <span className="font-medium">Tetanus Toxoid (TT)</span>
                        <p className="text-xs text-[var(--text-secondary)]">Doses given: {formData.ttDosesGiven} of 5</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleTTGiven}
                        disabled={formData.ttDosesGiven >= 5}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        + Record TT Dose {formData.ttDosesGiven + 1}
                      </button>
                    </div>

                    {/* IPTp Doses - Sequential */}
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div>
                        <span className="font-medium">IPTp (Sulfadoxine-Pyrimethamine)</span>
                        <p className="text-xs text-[var(--text-secondary)]">Doses given: {formData.iptpDosesGiven} of 5</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleIPTpGiven}
                        disabled={formData.iptpDosesGiven >= 5}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        + Record IPTp Dose {formData.iptpDosesGiven + 1}
                      </button>
                    </div>

                    {/* Supplements */}
                    <div className="flex flex-wrap gap-4 pt-2 border-t">
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
                {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Record' : 'Create Pregnancy Record')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};