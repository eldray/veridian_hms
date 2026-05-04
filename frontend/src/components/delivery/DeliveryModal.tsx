// src/components/delivery/DeliveryModal.tsx
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useDeliveryStore } from '../../store/deliveryStore';
import { useToast } from '../../store/toastStore';

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
  const { createDelivery, updateDelivery, isLoading } = useDeliveryStore();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    deliveryType: 'spontaneous_vertex',
    deliveryOutcome: 'live_birth',
    placeOfDelivery: 'hospital',
    attendant: '',
    birthWeight: '',
    gestationWeeks: '',
    apgarScore1min: '',
    apgarScore5min: '',
    resusCitationDone: false,
    numberOfBabies: 1,
    maternalOutcome: 'alive',
    maternalComplications: [] as string[],
    episiotomy: false,
    perinealTears: false,
    retainedPlacenta: false,
    postpartumHaemorrhage: false,
    familyPlanningDiscussed: false,
    notes: ''
  });

  useEffect(() => {
    if (existingDelivery) {
      setFormData({
        deliveryType: existingDelivery.deliveryType || 'spontaneous_vertex',
        deliveryOutcome: existingDelivery.deliveryOutcome || 'live_birth',
        placeOfDelivery: existingDelivery.placeOfDelivery || 'hospital',
        attendant: existingDelivery.attendant || '',
        birthWeight: existingDelivery.birthWeight?.toString() || '',
        gestationWeeks: existingDelivery.gestationWeeks?.toString() || '',
        apgarScore1min: existingDelivery.apgarScore1min?.toString() || '',
        apgarScore5min: existingDelivery.apgarScore5min?.toString() || '',
        resusCitationDone: existingDelivery.resusCitationDone || false,
        numberOfBabies: existingDelivery.numberOfBabies || 1,
        maternalOutcome: existingDelivery.maternalOutcome || 'alive',
        maternalComplications: existingDelivery.maternalComplications || [],
        episiotomy: existingDelivery.episiotomy || false,
        perinealTears: existingDelivery.perinealTears || false,
        retainedPlacenta: existingDelivery.retainedPlacenta || false,
        postpartumHaemorrhage: existingDelivery.postpartumHaemorrhage || false,
        familyPlanningDiscussed: existingDelivery.familyPlanningDiscussed || false,
        notes: existingDelivery.notes || ''
      });
    }
  }, [existingDelivery]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        attendanceId,
        patientId,
        ...formData,
        birthWeight: formData.birthWeight ? parseFloat(formData.birthWeight) : undefined,
        gestationWeeks: formData.gestationWeeks ? parseInt(formData.gestationWeeks) : undefined,
        apgarScore1min: formData.apgarScore1min ? parseInt(formData.apgarScore1min) : undefined,
        apgarScore5min: formData.apgarScore5min ? parseInt(formData.apgarScore5min) : undefined,
      };

      if (existingDelivery) {
        await updateDelivery(existingDelivery.id, data);
        success('Updated', 'Delivery record updated successfully');
      } else {
        await createDelivery(data);
        success('Created', 'Delivery record created successfully');
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
        <div className="relative bg-[var(--bg-card)] rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-[var(--bg-card)] px-6 py-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-bold">{existingDelivery ? 'Edit Delivery Record' : 'Add Delivery Record'}</h2>
            <button onClick={onClose} className="p-1 hover:bg-[var(--bg-main)] rounded"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
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
                  <option value="hospital">Hospital</option>
                  <option value="health_centre">Health Centre</option>
                  <option value="clinic">Clinic</option>
                  <option value="home">Home</option>
                  <option value="en_route">En Route</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Attendant</label>
                <input type="text" value={formData.attendant} onChange={(e) => handleChange('attendant', e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Birth Weight (g)</label>
                <input type="number" value={formData.birthWeight} onChange={(e) => handleChange('birthWeight', e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg" placeholder="e.g., 3200" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Gestation (weeks)</label>
                <input type="number" value={formData.gestationWeeks} onChange={(e) => handleChange('gestationWeeks', e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg" placeholder="e.g., 40" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Apgar Score (1 min)</label>
                <input type="number" min="0" max="10" value={formData.apgarScore1min} onChange={(e) => handleChange('apgarScore1min', e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Apgar Score (5 min)</label>
                <input type="number" min="0" max="10" value={formData.apgarScore5min} onChange={(e) => handleChange('apgarScore5min', e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg" />
              </div>
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
                <label className="block text-sm font-medium mb-1">Number of Babies</label>
                <input type="number" min="1" max="4" value={formData.numberOfBabies} onChange={(e) => handleChange('numberOfBabies', parseInt(e.target.value))} className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg" />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Complications</h4>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2"><input type="checkbox" checked={formData.episiotomy} onChange={(e) => handleChange('episiotomy', e.target.checked)} className="rounded" /> Episiotomy</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={formData.perinealTears} onChange={(e) => handleChange('perinealTears', e.target.checked)} className="rounded" /> Perineal Tears</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={formData.retainedPlacenta} onChange={(e) => handleChange('retainedPlacenta', e.target.checked)} className="rounded" /> Retained Placenta</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={formData.postpartumHaemorrhage} onChange={(e) => handleChange('postpartumHaemorrhage', e.target.checked)} className="rounded" /> Postpartum Haemorrhage</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={formData.resusCitationDone} onChange={(e) => handleChange('resusCitationDone', e.target.checked)} className="rounded" /> Resuscitation Done</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={formData.familyPlanningDiscussed} onChange={(e) => handleChange('familyPlanningDiscussed', e.target.checked)} className="rounded" /> Family Planning Discussed</label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea rows={3} value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg" />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {loading ? 'Saving...' : (existingDelivery ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};