// src/components/delivery/DeliveryModal.tsx — clinical palette
import React, { useState, useEffect } from 'react';
import { X, Hospital, Baby, AlertTriangle, Plus, Trash2, FileText } from 'lucide-react';
import { useDeliveryStore } from '../../store/deliveryStore';
import { useToast } from '../../store/toastStore';

interface NewbornData {
  id?: string;
  order: number;
  birthWeight: number;
  gender: 'male' | 'female' | 'other';
  apgarScore1min?: number;
  apgarScore5min?: number;
  resuscitation: boolean;
  outcome: '' | 'alive' | 'dead_within_24hrs' | 'dead_1_7days' | 'dead_8_28days' | 'referred_out';
  anomalies: string[];
  referredTo?: string;
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
  isOpen, onClose, onSuccess, attendanceId, patientId, existingDelivery,
}) => {
  const { recordDelivery, updateDeliveryRecord, isLoading } = useDeliveryStore();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    deliveryDate: new Date().toISOString().split('T')[0],
    deliveryType: 'spontaneous_vertex',
    deliveryOutcome: '',
    placeOfDelivery: 'private_hospital',
    attendant: '',
    gestationWeeks: '',
    maternalOutcome: '',
    referralTo: '',
    complications: [] as string[],
    notes: '',
    malePartnerPresentDelivery: false,
    maternalDeathsAudited: false,
    auditNotes: '',
  });

  const [newborns, setNewborns] = useState<NewbornData[]>([{
    order: 1,
    birthWeight: 0,
    gender: 'male',
    resuscitation: false,
    outcome: '',
    anomalies: [],
    breastfeedingWithin30Min: false,
    eyeProphylaxisGiven: false,
    cordCareMethod: 'dry_cord',
  }]);

  useEffect(() => {
    if (existingDelivery) {
      setFormData({
        deliveryDate: existingDelivery.deliveryDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        deliveryType: existingDelivery.deliveryType || 'spontaneous_vertex',
        deliveryOutcome: existingDelivery.deliveryOutcome || '',
        placeOfDelivery: existingDelivery.placeOfDelivery || 'private_hospital',
        attendant: existingDelivery.attendant || '',
        gestationWeeks: existingDelivery.gestationWeeks?.toString() || '',
        maternalOutcome: existingDelivery.maternalOutcome || '',
        referralTo: existingDelivery.referralTo || '',
        complications: existingDelivery.complications || [],
        notes: existingDelivery.notes || '',
        malePartnerPresentDelivery: existingDelivery.malePartnerPresentDelivery || false,
        maternalDeathsAudited: existingDelivery.maternalDeathsAudited || false,
        auditNotes: existingDelivery.auditNotes || '',
      });
      if (existingDelivery.Newborn?.length > 0) {
        setNewborns(existingDelivery.Newborn.map((baby: any, idx: number) => ({
          id: baby.id,
          order: baby.order || idx + 1,
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
          weightAt6to10DaysDate: baby.weightAt6to10DaysDate?.split('T')[0],
        })));
      }
    }
  }, [existingDelivery]);

  const handleChange = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleComplicationToggle = (complication: string) => {
    const current = [...formData.complications];
    setFormData(prev => ({
      ...prev,
      complications: current.includes(complication)
        ? current.filter(c => c !== complication)
        : [...current, complication],
    }));
  };

  const addNewborn = () => {
    setNewborns([...newborns, {
      order: newborns.length + 1,
      birthWeight: 0, gender: 'male', resuscitation: false, outcome: '',
      anomalies: [], breastfeedingWithin30Min: false, eyeProphylaxisGiven: false,
      cordCareMethod: 'dry_cord',
    }]);
  };

  const removeNewborn = (index: number) => {
    const updated = newborns.filter((_, i) => i !== index);
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
          create: newborns.map(baby => ({
            order: baby.order,
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
            weightAt6to10DaysDate: baby.weightAt6to10DaysDate ? new Date(baby.weightAt6to10DaysDate).toISOString() : undefined,
          })),
        },
      };
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
    'Uterine Rupture', 'Maternal Sepsis', 'Transfusion Required',
  ];

  if (!isOpen) return null;

  const fieldCls = "w-full px-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)] transition-all";
  const labelCls = "block text-[11px] font-semibold text-[var(--text-secondary)] mb-1.5";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-[var(--bg-card)] rounded-xl shadow-xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-[var(--border-color)]">

          {/* Header (flat, tokenised) */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--icon-green-bg)] flex items-center justify-center">
                <Hospital className="w-4 h-4 text-[var(--icon-green-text)]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                  {existingDelivery ? 'Edit Delivery Record' : 'Add Delivery Record'}
                </h2>
                <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                  Record labour, birth and immediate newborn care
                </p>
              </div>
            </div>
            <button onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)] transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 space-y-5" style={{ scrollbarWidth: 'thin' }}>

              {/* Basic Delivery Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Delivery Date *</label>
                  <input type="date" value={formData.deliveryDate}
                    onChange={e => handleChange('deliveryDate', e.target.value)} required className={fieldCls} />
                </div>
                <div>
                  <label className={labelCls}>Delivery Type *</label>
                  <select value={formData.deliveryType}
                    onChange={e => handleChange('deliveryType', e.target.value)} required className={fieldCls}>
                    <option value="spontaneous_vertex">Spontaneous Vertex</option>
                    <option value="assisted_breech">Assisted Breech</option>
                    <option value="vacuum">Vacuum</option>
                    <option value="forceps">Forceps</option>
                    <option value="caesarean_section">Caesarean Section</option>
                    <option value="multiple">Multiple</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Delivery Outcome *</label>
                  <select value={formData.deliveryOutcome}
                    onChange={e => handleChange('deliveryOutcome', e.target.value)} required className={fieldCls}>
                    <option value="" disabled>Select confirmed outcome</option>
                    <option value="live_birth">Live Birth</option>
                    <option value="stillbirth_fresh">Stillbirth (Fresh)</option>
                    <option value="stillbirth_macerated">Stillbirth (Macerated)</option>
                    <option value="neonatal_death">Neonatal Death</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Place of Delivery</label>
                  <select value={formData.placeOfDelivery}
                    onChange={e => handleChange('placeOfDelivery', e.target.value)} className={fieldCls}>
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
                  <label className={labelCls}>Attendant</label>
                  <input type="text" value={formData.attendant}
                    onChange={e => handleChange('attendant', e.target.value)}
                    placeholder="Name of attendant" className={fieldCls} />
                </div>
                <div>
                  <label className={labelCls}>Referral To</label>
                  <input type="text" value={formData.referralTo}
                    onChange={e => handleChange('referralTo', e.target.value)}
                    placeholder="If referred, where?" className={fieldCls} />
                </div>
              </div>

              {/* Maternal Information */}
              <div className="border-t border-[var(--border-color)] pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Baby className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                  <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Maternal Information</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Maternal Outcome *</label>
                    <select value={formData.maternalOutcome}
                      onChange={e => handleChange('maternalOutcome', e.target.value)} required className={fieldCls}>
                      <option value="" disabled>Select confirmed maternal outcome</option>
                      <option value="alive">Alive</option>
                      <option value="dead_direct_cause">Dead (Direct Cause)</option>
                      <option value="dead_indirect_cause">Dead (Indirect Cause)</option>
                      <option value="dead_unknown">Dead (Unknown)</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Gestation (weeks)</label>
                    <input type="number" value={formData.gestationWeeks}
                      onChange={e => handleChange('gestationWeeks', e.target.value)}
                      placeholder="e.g., 40" className={fieldCls} />
                  </div>
                </div>
              </div>

              {/* Complications */}
              <div className="border-t border-[var(--border-color)] pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-[var(--icon-orange-text)]" />
                  <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Complications</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {complicationOptions.map(comp => (
                    <label key={comp}
                      className="flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer p-1 rounded hover:bg-[var(--bg-main)] transition-colors">
                      <input type="checkbox" checked={formData.complications.includes(comp)}
                        onChange={() => handleComplicationToggle(comp)}
                        className="rounded border-[var(--border-color)] text-[var(--icon-red-text)] focus:ring-[var(--icon-red-text)] w-3.5 h-3.5" />
                      {comp}
                    </label>
                  ))}
                </div>
              </div>

              {/* Newborns Section */}
              <div className="border-t border-[var(--border-color)] pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Baby className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                    <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Newborn Information</h4>
                  </div>
                  <button type="button" onClick={addNewborn}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold
                      bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all">
                    <Plus className="w-3 h-3" /> Add Baby
                  </button>
                </div>

                {newborns.map((baby, idx) => (
                  <div key={idx} className="mb-3 p-4 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)]">
                    <div className="flex justify-between items-center mb-3">
                      <h5 className="text-xs font-bold text-[var(--text-primary)]">Baby #{baby.order}</h5>
                      {newborns.length > 1 && (
                        <button type="button" onClick={() => removeNewborn(idx)}
                          className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">Birth Weight (g) *</label>
                        <input type="number" value={baby.birthWeight}
                          onChange={e => updateNewborn(idx, 'birthWeight', parseInt(e.target.value))} required
                          className={fieldCls} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">Gender *</label>
                        <select value={baby.gender} onChange={e => updateNewborn(idx, 'gender', e.target.value)} required className={fieldCls}>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">APGAR (1 min)</label>
                        <input type="number" min="0" max="10" value={baby.apgarScore1min || ''}
                          onChange={e => updateNewborn(idx, 'apgarScore1min', parseInt(e.target.value))} className={fieldCls} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">APGAR (5 min)</label>
                        <input type="number" min="0" max="10" value={baby.apgarScore5min || ''}
                          onChange={e => updateNewborn(idx, 'apgarScore5min', parseInt(e.target.value))} className={fieldCls} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">Outcome</label>
                        <select value={baby.outcome} onChange={e => updateNewborn(idx, 'outcome', e.target.value)} required className={fieldCls}>
                          <option value="" disabled>Select outcome</option>
                          <option value="alive">Alive</option>
                          <option value="dead_within_24hrs">Dead within 24hrs</option>
                          <option value="dead_1_7days">Dead 1-7 days</option>
                          <option value="dead_8_28days">Dead 8-28 days</option>
                          <option value="referred_out">Referred Out</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">Cord Care Method</label>
                        <select value={baby.cordCareMethod} onChange={e => updateNewborn(idx, 'cordCareMethod', e.target.value)} className={fieldCls}>
                          <option value="dry_cord">Dry Cord</option>
                          <option value="chlorhexidine">Chlorhexidine</option>
                          <option value="methylated_spirit">Methylated Spirit</option>
                          <option value="alcohol">Alcohol</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                        <input type="checkbox" checked={baby.resuscitation}
                          onChange={e => updateNewborn(idx, 'resuscitation', e.target.checked)}
                          className="rounded border-[var(--border-color)] text-[var(--icon-red-text)] focus:ring-[var(--icon-red-text)] w-3.5 h-3.5" />
                        Resuscitation done
                      </label>
                      <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                        <input type="checkbox" checked={baby.breastfeedingWithin30Min}
                          onChange={e => updateNewborn(idx, 'breastfeedingWithin30Min', e.target.checked)}
                          className="rounded border-[var(--border-color)] text-[var(--icon-green-text)] focus:ring-[var(--icon-green-text)] w-3.5 h-3.5" />
                        BF within 30 min
                      </label>
                      <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                        <input type="checkbox" checked={baby.eyeProphylaxisGiven}
                          onChange={e => updateNewborn(idx, 'eyeProphylaxisGiven', e.target.checked)}
                          className="rounded border-[var(--border-color)] text-[var(--icon-green-text)] focus:ring-[var(--icon-green-text)] w-3.5 h-3.5" />
                        Eye prophylaxis given
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              {/* GHS Reporting */}
              <div className="border-t border-[var(--border-color)] pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-[var(--icon-purple-text)]" />
                  <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">GHS Reporting</h4>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                    <input type="checkbox" checked={formData.malePartnerPresentDelivery}
                      onChange={e => handleChange('malePartnerPresentDelivery', e.target.checked)}
                      className="rounded border-[var(--border-color)] text-[var(--icon-cyan-text)] focus:ring-[var(--icon-cyan-text)] w-3.5 h-3.5" />
                    Male Partner Present During Delivery
                  </label>
                  <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                    <input type="checkbox" checked={formData.maternalDeathsAudited}
                      onChange={e => handleChange('maternalDeathsAudited', e.target.checked)}
                      className="rounded border-[var(--border-color)] text-[var(--icon-red-text)] focus:ring-[var(--icon-red-text)] w-3.5 h-3.5" />
                    Maternal Death Audited
                  </label>
                </div>
                {formData.maternalDeathsAudited && (
                  <div className="mt-3">
                    <label className={labelCls}>Audit Notes</label>
                    <textarea rows={2} value={formData.auditNotes}
                      onChange={e => handleChange('auditNotes', e.target.value)}
                      placeholder="Audit findings and recommendations..." className={`${fieldCls} resize-none`} />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="border-t border-[var(--border-color)] pt-4">
                <label className={labelCls}>Clinical Notes</label>
                <textarea rows={3} value={formData.notes}
                  onChange={e => handleChange('notes', e.target.value)}
                  placeholder="Additional clinical notes..."
                  className={`${fieldCls} resize-none`} />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-[var(--border-color)] bg-[var(--bg-main)] flex-shrink-0">
              <button type="button" onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold border border-[var(--border-color)]
                  text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-all">
                Cancel
              </button>
              <button type="submit" disabled={loading || isLoading}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--icon-green-text)] text-white
                  hover:opacity-90 disabled:opacity-50 transition-all">
                {loading || isLoading ? 'Saving…' : (existingDelivery ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};