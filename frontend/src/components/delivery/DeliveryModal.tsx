import React, { useState, useEffect } from 'react';
import { X, Hospital, Baby, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { useDeliveryStore } from '../../store/deliveryStore';
import { useToast } from '../../store/toastStore';

interface NewbornData {
  id?: string;
  order: number;  // ✅ Changed from babyNumber to order
  birthWeight: number;
  gender: 'male' | 'female' | 'other';
  apgarScore1min?: number;
  apgarScore5min?: number;
  resuscitation: boolean;
  outcome: 'alive' | 'dead_within_24hrs' | 'dead_1_7days' | 'dead_8_28days' | 'referred_out';
  anomalies: string[];
  referredTo?: string;
  // Essential Newborn Care
  breastfeedingWithin30Min: boolean;
  eyeProphylaxisGiven: boolean;
  cordCareMethod: 'dry_cord' | 'chlorhexidine' | 'methylated_spirit' | 'alcohol' | 'other';
  babyWeightAt6to10Days?: number;
  weightAt6to10DaysDate?: string;
}

interface DeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  attendanceId: string;
  patientId: string;
  existingDelivery?: any;
}

export const DeliveryModal: React.FC<DeliveryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  attendanceId,
  patientId,
  existingDelivery
}) => {
  const { recordDelivery, updateDeliveryRecord, isLoading } = useDeliveryStore();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    deliveryDate: new Date().toISOString().split('T')[0],
    deliveryType: 'spontaneous_vertex',
    deliveryOutcome: 'live_birth',
    placeOfDelivery: 'private_hospital',
    attendant: '',
    gestationWeeks: '',
    maternalOutcome: 'alive',
    referralTo: '',
    complications: [] as string[],
    notes: '',
    // ONLY delivery male involvement
    malePartnerPresentDelivery: false,
    // Maternal Death Audit
    maternalDeathsAudited: false,
    auditNotes: '',
  });

  const [newborns, setNewborns] = useState<NewbornData[]>([
    {
      order: 1,  // ✅ Changed from babyNumber to order
      birthWeight: 0,
      gender: 'male',
      resuscitation: false,
      outcome: 'alive',
      anomalies: [],
      breastfeedingWithin30Min: false,
      eyeProphylaxisGiven: false,
      cordCareMethod: 'dry_cord'
    }
  ]);

  useEffect(() => {
    if (existingDelivery) {
      setFormData({
        deliveryDate: existingDelivery.deliveryDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        deliveryType: existingDelivery.deliveryType || 'spontaneous_vertex',
        deliveryOutcome: existingDelivery.deliveryOutcome || 'live_birth',
        placeOfDelivery: existingDelivery.placeOfDelivery || 'private_hospital',
        attendant: existingDelivery.attendant || '',
        gestationWeeks: existingDelivery.gestationWeeks?.toString() || '',
        maternalOutcome: existingDelivery.maternalOutcome || 'alive',
        referralTo: existingDelivery.referralTo || '',
        complications: existingDelivery.complications || [],
        notes: existingDelivery.notes || '',
        malePartnerPresentDelivery: existingDelivery.malePartnerPresentDelivery || false,
        maternalDeathsAudited: existingDelivery.maternalDeathsAudited || false,
        auditNotes: existingDelivery.auditNotes || ''
      });
      
      if (existingDelivery.Newborn && existingDelivery.Newborn.length > 0) {
        setNewborns(existingDelivery.Newborn.map((baby: any, idx: number) => ({
          id: baby.id,
          order: baby.order || idx + 1,  // ✅ Use order field
          birthWeight: baby.birthWeight,
          gender: baby.gender,
          apgarScore1min: baby.apgarScore1min,
          apgarScore5min: baby.apgarScore5min,
          resuscitation: baby.resuscitation,
          outcome: baby.outcome,
          anomalies: baby.anomalies || [],
          referredTo: baby.referredTo,
          breastfeedingWithin30Min: baby.breastfeedingWithin30Min || false,
          eyeProphylaxisGiven: baby.eyeProphylaxisGiven || false,
          cordCareMethod: baby.cordCareMethod || 'dry_cord',
          babyWeightAt6to10Days: baby.babyWeightAt6to10Days,
          weightAt6to10DaysDate: baby.weightAt6to10DaysDate?.split('T')[0]
        })));
      }
    }
  }, [existingDelivery]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleComplicationToggle = (complication: string) => {
    const current = [...formData.complications];
    if (current.includes(complication)) {
      setFormData(prev => ({ ...prev, complications: current.filter(c => c !== complication) }));
    } else {
      setFormData(prev => ({ ...prev, complications: [...current, complication] }));
    }
  };

  const addNewborn = () => {
    setNewborns([...newborns, {
      order: newborns.length + 1,  // ✅ Changed to order
      birthWeight: 0,
      gender: 'male',
      resuscitation: false,
      outcome: 'alive',
      anomalies: [],
      breastfeedingWithin30Min: false,
      eyeProphylaxisGiven: false,
      cordCareMethod: 'dry_cord'
    }]);
  };

  const removeNewborn = (index: number) => {
    const updated = newborns.filter((_, i) => i !== index);
    // Renumber remaining babies
    updated.forEach((baby, idx) => { baby.order = idx + 1; });
    setNewborns(updated);
  };

  const updateNewborn = (index: number, field: string, value: any) => {
    const updated = [...newborns];
    updated[index] = { ...updated[index], [field]: value };
    setNewborns(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate).toISOString() : new Date().toISOString(),
        deliveryType: formData.deliveryType,
        deliveryOutcome: formData.deliveryOutcome,
        placeOfDelivery: formData.placeOfDelivery,
        attendant: formData.attendant,
        gestationWeeks: formData.gestationWeeks ? parseInt(formData.gestationWeeks) : null,
        maternalOutcome: formData.maternalOutcome,
        referralTo: formData.referralTo || undefined,
        complications: formData.complications.length > 0 ? formData.complications : [],
        notes: formData.notes || undefined,
        malePartnerPresentDelivery: formData.malePartnerPresentDelivery,
        maternalDeathsAudited: formData.maternalDeathsAudited,
        auditNotes: formData.maternalDeathsAudited ? formData.auditNotes : undefined,
        
        Newborn: {
          create: newborns.map((baby) => ({
            order: baby.order,  // ✅ NOW THIS WILL WORK
            birthWeight: baby.birthWeight,
            gender: baby.gender,
            apgarScore1min: baby.apgarScore1min || null,
            apgarScore5min: baby.apgarScore5min || null,
            resuscitation: baby.resuscitation,
            outcome: baby.outcome,
            anomalies: baby.anomalies.length > 0 ? baby.anomalies : [],
            referredTo: baby.referredTo || undefined,
            breastfeedingWithin30Min: baby.breastfeedingWithin30Min,
            eyeProphylaxisGiven: baby.eyeProphylaxisGiven,
            cordCareMethod: baby.cordCareMethod,
            babyWeightAt6to10Days: baby.babyWeightAt6to10Days || null,
            weightAt6to10DaysDate: baby.weightAt6to10DaysDate ? new Date(baby.weightAt6to10DaysDate).toISOString() : undefined
          }))
        }
      };

      // Remove attendanceId and patientId from the data
      delete (data as any).attendanceId;
      delete (data as any).patientId;

      if (existingDelivery) {
        await updateDeliveryRecord(existingDelivery.id, data);
        success('Updated', 'Delivery record updated successfully');
      } else {
        await recordDelivery(data);
        success('Created', 'Delivery record created successfully');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Delivery save error:', err);
      toastError('Error', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const complicationOptions = [
    'Pre-eclampsia', 'Eclampsia', 'Postpartum Hemorrhage', 'Retained Placenta',
    'Perineal Tears', 'Episiotomy', 'Shoulder Dystocia', 'Cord Prolapse',
    'Uterine Rupture', 'Maternal Sepsis', 'Transfusion Required'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-[var(--bg-card)] rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-[var(--bg-card)] px-6 py-4 border-b flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Hospital className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-bold">{existingDelivery ? 'Edit Delivery Record' : 'Add Delivery Record'}</h2>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-[var(--bg-main)] rounded"><X className="w-5 h-5" /></button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Basic Delivery Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Delivery Date *</label>
                <input
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => handleChange('deliveryDate', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Delivery Type *</label>
                <select value={formData.deliveryType} onChange={(e) => handleChange('deliveryType', e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg" required>
                  <option value="spontaneous_vertex">Spontaneous Vertex</option>
                  <option value="assisted_breech">Assisted Breech</option>
                  <option value="vacuum">Vacuum</option>
                  <option value="forceps">Forceps</option>
                  <option value="caesarean_section">Caesarean Section</option>
                  <option value="multiple">Multiple</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Delivery Outcome *</label>
                <select value={formData.deliveryOutcome} onChange={(e) => handleChange('deliveryOutcome', e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg" required>
                  <option value="live_birth">Live Birth</option>
                  <option value="stillbirth_fresh">Stillbirth (Fresh)</option>
                  <option value="stillbirth_macerated">Stillbirth (Macerated)</option>
                  <option value="neonatal_death">Neonatal Death</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Place of Delivery</label>
                <select value={formData.placeOfDelivery} onChange={(e) => handleChange('placeOfDelivery', e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg">
                  <option value="private_hospital">Private Hospital</option>
                  <option value="government_hospital">Government Hospital</option>
                  <option value="health_centre">Health Centre</option>
                  <option value="clinic">Clinic</option>
                  <option value="chag_facility">CHAG Facility</option>
                  <option value="private_midwife">Private Midwife</option>
                  <option value="tba_trained">TBA (Trained)</option>
                  <option value="tba_untrained">TBA (Untrained)</option>
                  <option value="home">Home</option>
                  <option value="en_route">En Route</option>
                  <option value="mines_facility">Mines Facility</option>
                  <option value="quasi_govt_institution">Quasi-Govt Institution</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Attendant</label>
                <input type="text" value={formData.attendant} onChange={(e) => handleChange('attendant', e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg" placeholder="Name of attendant" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Referral To</label>
                <input type="text" value={formData.referralTo} onChange={(e) => handleChange('referralTo', e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg" placeholder="If referred, where?" />
              </div>
            </div>

            {/* Maternal Information */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2"><Baby className="w-4 h-4 text-pink-500" /> Maternal Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Maternal Outcome</label>
                  <select value={formData.maternalOutcome} onChange={(e) => handleChange('maternalOutcome', e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg">
                    <option value="alive">Alive</option>
                    <option value="dead_direct_cause">Dead (Direct Cause)</option>
                    <option value="dead_indirect_cause">Dead (Indirect Cause)</option>
                    <option value="dead_unknown">Dead (Unknown)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Gestation (weeks)</label>
                  <input type="number" value={formData.gestationWeeks} onChange={(e) => handleChange('gestationWeeks', e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg" placeholder="e.g., 40" />
                </div>
              </div>
            </div>

            {/* Complications */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-500" /> Complications</h4>
              <div className="grid grid-cols-2 gap-2">
                {complicationOptions.map(comp => (
                  <label key={comp} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.complications.includes(comp)}
                      onChange={() => handleComplicationToggle(comp)}
                      className="rounded"
                    />
                    {comp}
                  </label>
                ))}
              </div>
            </div>

            {/* Newborns Section */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold flex items-center gap-2"><Baby className="w-4 h-4 text-blue-500" /> Newborn Information</h4>
                <button type="button" onClick={addNewborn} className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-700 hover:text-white">
                  <Plus className="w-3 h-3" /> Add Baby
                </button>
              </div>
              
              {newborns.map((baby, idx) => (
                <div key={idx} className="mb-4 p-4 border rounded-lg bg-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="font-medium">Baby #{baby.order}</h5>  {/* ✅ Changed to order */}
                    {newborns.length > 1 && (
                      <button type="button" onClick={() => removeNewborn(idx)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Birth Weight (g) *</label>
                      <input type="number" value={baby.birthWeight} onChange={(e) => updateNewborn(idx, 'birthWeight', parseInt(e.target.value))} className="w-full px-2 py-1 text-sm border rounded" required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Gender *</label>
                      <select value={baby.gender} onChange={(e) => updateNewborn(idx, 'gender', e.target.value)} className="w-full px-2 py-1 text-sm border rounded" required>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">APGAR (1 min)</label>
                      <input type="number" min="0" max="10" value={baby.apgarScore1min || ''} onChange={(e) => updateNewborn(idx, 'apgarScore1min', parseInt(e.target.value))} className="w-full px-2 py-1 text-sm border rounded" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">APGAR (5 min)</label>
                      <input type="number" min="0" max="10" value={baby.apgarScore5min || ''} onChange={(e) => updateNewborn(idx, 'apgarScore5min', parseInt(e.target.value))} className="w-full px-2 py-1 text-sm border rounded" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Outcome</label>
                      <select value={baby.outcome} onChange={(e) => updateNewborn(idx, 'outcome', e.target.value)} className="w-full px-2 py-1 text-sm border rounded">
                        <option value="alive">Alive</option>
                        <option value="dead_within_24hrs">Dead within 24hrs</option>
                        <option value="dead_1_7days">Dead 1-7 days</option>
                        <option value="dead_8_28days">Dead 8-28 days</option>
                        <option value="referred_out">Referred Out</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={baby.resuscitation} onChange={(e) => updateNewborn(idx, 'resuscitation', e.target.checked)} className="rounded" />
                      <label className="text-sm">Resuscitation done</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={baby.breastfeedingWithin30Min} onChange={(e) => updateNewborn(idx, 'breastfeedingWithin30Min', e.target.checked)} className="rounded" />
                      <label className="text-sm">BF within 30 min</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={baby.eyeProphylaxisGiven} onChange={(e) => updateNewborn(idx, 'eyeProphylaxisGiven', e.target.checked)} className="rounded" />
                      <label className="text-sm">Eye prophylaxis given</label>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Cord Care Method</label>
                      <select value={baby.cordCareMethod} onChange={(e) => updateNewborn(idx, 'cordCareMethod', e.target.value)} className="w-full px-2 py-1 text-sm border rounded">
                        <option value="dry_cord">Dry Cord</option>
                        <option value="chlorhexidine">Chlorhexidine</option>
                        <option value="methylated_spirit">Methylated Spirit</option>
                        <option value="alcohol">Alcohol</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Male Involvement & Audit Section */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">GHS Reporting</h4>
              <div className="space-y-3">
                {/* ONLY Delivery male involvement */}
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.malePartnerPresentDelivery}
                    onChange={(e) => handleChange('malePartnerPresentDelivery', e.target.checked)}
                    className="rounded"
                  />
                  Male Partner Present During Delivery
                </label>
                
                {/* Maternal Death Audit */}
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.maternalDeathsAudited}
                    onChange={(e) => handleChange('maternalDeathsAudited', e.target.checked)}
                    className="rounded"
                  />
                  Maternal Death Audited
                </label>
              </div>
              
              {formData.maternalDeathsAudited && (
                <div className="mt-3">
                  <label className="block text-sm font-medium mb-1">Audit Notes</label>
                  <textarea 
                    rows={2} 
                    value={formData.auditNotes} 
                    onChange={(e) => handleChange('auditNotes', e.target.value)} 
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg" 
                    placeholder="Audit findings and recommendations..." 
                  />
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1">Clinical Notes</label>
              <textarea rows={3} value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg" placeholder="Additional clinical notes..." />
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-[var(--bg-main)]">Cancel</button>
              <button type="submit" disabled={loading || isLoading} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {loading || isLoading ? 'Saving...' : (existingDelivery ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};