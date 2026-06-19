// src/components/antenatal/ANCVisitModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Heart, Ruler, Weight, Syringe, AlertTriangle, Droplet, Calendar, Activity } from 'lucide-react';
import { useAntenatalStore } from '../../store/antenatalStore';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../store/toastStore';

interface ANCVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  attendanceId: string;
  bookingId: string;  // The antenatal record ID
  visitNumber?: number;
  existingVisit?: any; // For edit mode
}

export const ANCVisitModal: React.FC<ANCVisitModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  attendanceId,
  bookingId,
  visitNumber = 1,
  existingVisit
}) => {
  const { recordANCVisit, updateANCVisit } = useAntenatalStore();
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Determine if this is edit mode
  const isEditing = !!existingVisit;

  // Form state for ANC visit
  const [formData, setFormData] = useState({
    // Visit Information
    visitDate: existingVisit?.visitDate?.split('T')[0] || new Date().toISOString().split('T')[0],
    gestationalAgeWeeks: existingVisit?.gestationalAgeWeeks || '',
    gestationalAgeDays: existingVisit?.gestationalAgeDays || '',
    
    // Maternal Measurements
    weight: existingVisit?.weight || '',
    bloodPressure: existingVisit?.bloodPressure || '',
    fundalHeight: existingVisit?.fundalHeight || '',
    fetalHeartRate: existingVisit?.fetalHeartRate || '',
    presentation: existingVisit?.presentation || '',
    
    // IPTp (Intermittent Preventive Treatment in pregnancy)
    iptpGiven: existingVisit?.iptpGiven || false,
    iptpDoseNumber: existingVisit?.iptpDoseNumber || 1,
    
    // TT (Tetanus Toxoid)
    ttGiven: existingVisit?.ttGiven || false,
    ttDoseNumber: existingVisit?.ttDoseNumber || 1,
    
    // Other Preventions
    ironGiven: existingVisit?.ironGiven || false,
    folateGiven: existingVisit?.folateGiven || false,
    
    // Malaria
    malariaTestDone: existingVisit?.malariaTestDone || false,
    malariaTestResult: existingVisit?.malariaTestResult || '',
    malariaTreatmentGiven: existingVisit?.malariaTreatmentGiven || false,
    
    // Danger Signs
    dangerSignsPresent: existingVisit?.dangerSignsPresent || false,
    dangerSignsList: existingVisit?.dangerSignsList || [] as string[],
    
    // Referral
    referralMade: existingVisit?.referralMade || false,
    referredTo: existingVisit?.referredTo || '',
    referralReason: existingVisit?.referralReason || '',
    
    // Notes
    notes: existingVisit?.notes || ''
  });

  // Reset form when modal opens/closes
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
        malariaTestDone: existingVisit.malariaTestDone || false,
        malariaTestResult: existingVisit.malariaTestResult || '',
        malariaTreatmentGiven: existingVisit.malariaTreatmentGiven || false,
        dangerSignsPresent: existingVisit.dangerSignsPresent || false,
        dangerSignsList: existingVisit.dangerSignsList || [],
        referralMade: existingVisit.referralMade || false,
        referredTo: existingVisit.referredTo || '',
        referralReason: existingVisit.referralReason || '',
        notes: existingVisit.notes || ''
      });
    } else if (isOpen && !existingVisit) {
      // Reset for new visit
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
        malariaTestDone: false,
        malariaTestResult: '',
        malariaTreatmentGiven: false,
        dangerSignsPresent: false,
        dangerSignsList: [],
        referralMade: false,
        referredTo: '',
        referralReason: '',
        notes: ''
      });
    }
  }, [isOpen, existingVisit]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDangerSignsChange = (sign: string, checked: boolean) => {
    const current = [...formData.dangerSignsList];
    if (checked) {
      current.push(sign);
    } else {
      const index = current.indexOf(sign);
      if (index > -1) current.splice(index, 1);
    }
    setFormData(prev => ({ ...prev, dangerSignsList: current }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
  
    try {
      // Helper function to convert date string to proper DateTime
      const toDateTime = (dateStr: string) => {
        if (!dateStr) return undefined;
        // Convert "2026-06-05" to "2026-06-05T00:00:00.000Z"
        return new Date(dateStr).toISOString();
      };
  
      if (isEditing && existingVisit?.id) {
        // For UPDATE - send ONLY the fields that changed/are allowed to update
        const updateData: any = {};
        
        // Convert date to proper DateTime
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
        
        console.log('Updating visit with data:', { id: existingVisit.id, data: updateData });
        await updateANCVisit(existingVisit.id, updateData);
        success('Success', 'ANC visit updated successfully');
      } else {
        // Create new visit
        const createData = {
          bookingId: bookingId,
          attendanceId: attendanceId,
          visitNumber: visitNumber,
          visitDate: toDateTime(formData.visitDate), // Convert to DateTime
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
          malariaTestDone: formData.malariaTestDone,
          malariaTestResult: formData.malariaTestResult || undefined,
          malariaTreatmentGiven: formData.malariaTreatmentGiven,
          dangerSignsPresent: formData.dangerSignsPresent,
          dangerSignsList: formData.dangerSignsList.length > 0 ? formData.dangerSignsList : undefined,
          referralMade: formData.referralMade,
          referredTo: formData.referredTo || undefined,
          referralReason: formData.referralReason || undefined,
          notes: formData.notes || undefined,
          recordedById: user?.id // Make sure you have user from useAuthStore
        };
        
        console.log('Creating ANC visit:', createData);
        await recordANCVisit(createData);
        success('Success', 'ANC visit recorded successfully');
      }
      
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error details:', err);
      console.error('Response data:', err.response?.data);
      console.error('Validation errors:', err.response?.data?.errors);
      toastError('Error', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const dangerSignsOptions = [
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
    'Prolonged labor'
  ];

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
                {isEditing ? 'Edit ANC Visit' : `Record ANC Visit #${visitNumber}`}
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {isEditing ? 'Update antenatal visit information' : 'Record today\'s antenatal assessment'}
              </p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-[var(--bg-main)] rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Visit Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Visit Date *</label>
                <input
                  type="date"
                  value={formData.visitDate}
                  onChange={(e) => handleChange('visitDate', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg focus:ring-2 focus:ring-pink-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Gestational Age (weeks)</label>
                <input
                  type="number"
                  step="1"
                  value={formData.gestationalAgeWeeks}
                  onChange={(e) => handleChange('gestationalAgeWeeks', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                  placeholder="e.g., 24"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Gestational Age (days)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="6"
                  value={formData.gestationalAgeDays}
                  onChange={(e) => handleChange('gestationalAgeDays', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                  placeholder="e.g., 3"
                />
              </div>
            </div>

            {/* Maternal Measurements */}
            <div className="border-t pt-4">
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-pink-600" />
                Maternal Assessment
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Weight (kg)</label>
                  <div className="flex items-center gap-2">
                    <Weight className="w-4 h-4 text-[var(--text-secondary)]" />
                    <input
                      type="number"
                      step="0.1"
                      value={formData.weight}
                      onChange={(e) => handleChange('weight', e.target.value)}
                      className="flex-1 px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                      placeholder="e.g., 70.5"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Blood Pressure</label>
                  <input
                    type="text"
                    value={formData.bloodPressure}
                    onChange={(e) => handleChange('bloodPressure', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                    placeholder="e.g., 120/80"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fundal Height (cm)</label>
                  <div className="flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-[var(--text-secondary)]" />
                    <input
                      type="number"
                      step="0.5"
                      value={formData.fundalHeight}
                      onChange={(e) => handleChange('fundalHeight', e.target.value)}
                      className="flex-1 px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                      placeholder="e.g., 28"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fetal Heart Rate (bpm)</label>
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-[var(--text-secondary)]" />
                    <input
                      type="number"
                      value={formData.fetalHeartRate}
                      onChange={(e) => handleChange('fetalHeartRate', e.target.value)}
                      className="flex-1 px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                      placeholder="e.g., 140"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Presentation</label>
                  <select
                    value={formData.presentation}
                    onChange={(e) => handleChange('presentation', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                  >
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
            <div className="border-t pt-4">
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <Syringe className="w-4 h-4 text-green-600" />
                Preventions & Treatments
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* IPTp */}
                <div className="border rounded-lg p-3">
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={formData.iptpGiven}
                      onChange={(e) => handleChange('iptpGiven', e.target.checked)}
                      className="rounded"
                    />
                    <span className="font-medium">IPTp Given</span>
                  </label>
                  {formData.iptpGiven && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Dose Number</label>
                      <select
                        value={formData.iptpDoseNumber}
                        onChange={(e) => handleChange('iptpDoseNumber', parseInt(e.target.value))}
                        className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                      >
                        <option value={1}>Dose 1</option>
                        <option value={2}>Dose 2</option>
                        <option value={3}>Dose 3</option>
                        <option value={4}>Dose 4</option>
                        <option value={5}>Dose 5</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* TT */}
                <div className="border rounded-lg p-3">
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={formData.ttGiven}
                      onChange={(e) => handleChange('ttGiven', e.target.checked)}
                      className="rounded"
                    />
                    <span className="font-medium">Tetanus Toxoid (TT) Given</span>
                  </label>
                  {formData.ttGiven && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Dose Number</label>
                      <select
                        value={formData.ttDoseNumber}
                        onChange={(e) => handleChange('ttDoseNumber', parseInt(e.target.value))}
                        className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                      >
                        <option value={1}>Dose 1</option>
                        <option value={2}>Dose 2</option>
                        <option value={3}>Dose 3</option>
                        <option value={4}>Dose 4</option>
                        <option value={5}>Dose 5</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Supplements */}
                <div className="border rounded-lg p-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.ironGiven}
                      onChange={(e) => handleChange('ironGiven', e.target.checked)}
                      className="rounded"
                    />
                    <span>Iron supplements given</span>
                  </label>
                  <label className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      checked={formData.folateGiven}
                      onChange={(e) => handleChange('folateGiven', e.target.checked)}
                      className="rounded"
                    />
                    <span>Folate supplements given</span>
                  </label>
                  <label className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      checked={formData.itnGiven}
                      onChange={(e) => handleChange('itnGiven', e.target.checked)}
                      className="rounded"
                    />
                    <span>ITN (mosquito net) given</span>
                  </label>
                </div>

                {/* Malaria */}
                <div className="border rounded-lg p-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.malariaTestDone}
                      onChange={(e) => handleChange('malariaTestDone', e.target.checked)}
                      className="rounded"
                    />
                    <span>Malaria Test Done</span>
                  </label>
                  {formData.malariaTestDone && (
                    <>
                      <div className="mt-2">
                        <label className="block text-sm font-medium mb-1">Test Result</label>
                        <select
                          value={formData.malariaTestResult}
                          onChange={(e) => handleChange('malariaTestResult', e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                        >
                          <option value="">Select result</option>
                          <option value="Positive">Positive</option>
                          <option value="Negative">Negative</option>
                        </select>
                      </div>
                      {formData.malariaTestResult === 'Positive' && (
                        <label className="flex items-center gap-2 mt-2">
                          <input
                            type="checkbox"
                            checked={formData.malariaTreatmentGiven}
                            onChange={(e) => handleChange('malariaTreatmentGiven', e.target.checked)}
                            className="rounded"
                          />
                          <span>Treatment given</span>
                        </label>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Danger Signs */}
            <div className="border-t pt-4">
              <label className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={formData.dangerSignsPresent}
                  onChange={(e) => handleChange('dangerSignsPresent', e.target.checked)}
                  className="rounded"
                />
                <span className="font-semibold text-orange-600">Danger Signs Present</span>
              </label>
              
              {formData.dangerSignsPresent && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 border rounded-lg">
                  {dangerSignsOptions.map(sign => (
                    <label key={sign} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.dangerSignsList.includes(sign)}
                        onChange={(e) => handleDangerSignsChange(sign, e.target.checked)}
                        className="rounded"
                      />
                      {sign}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Referral */}
            <div className="border-t pt-4">
              <label className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={formData.referralMade}
                  onChange={(e) => handleChange('referralMade', e.target.checked)}
                  className="rounded"
                />
                <span className="font-semibold text-blue-600">Referral Made</span>
              </label>
              
              {formData.referralMade && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Referred To</label>
                    <input
                      type="text"
                      value={formData.referredTo}
                      onChange={(e) => handleChange('referredTo', e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                      placeholder="e.g., Regional Hospital, Specialist"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Reason for Referral</label>
                    <textarea
                      rows={2}
                      value={formData.referralReason}
                      onChange={(e) => handleChange('referralReason', e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                      placeholder="Reason for referral..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="border-t pt-4">
              <label className="block text-sm font-medium mb-1">Clinical Notes</label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                placeholder="Additional clinical notes, observations, or instructions..."
              />
            </div>

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
                {loading ? (isEditing ? 'Updating...' : 'Saving...') : (isEditing ? 'Update Visit' : 'Save Visit')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};