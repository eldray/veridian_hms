// src/components/vitals/VitalsFormModal.tsx - WITH ANC FIELDS
import React, { useState, useEffect } from 'react';
import { X, Heart, Thermometer, Activity, Gauge, Weight, Ruler, TrendingUp, Baby, Shield, Droplet } from 'lucide-react';
import { BloodPressureInput } from './BloodPressureInput';
import type { VitalsEntry } from '../../types';

interface VitalsFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (vitals: VitalsEntry) => void;
  isLoading: boolean;
  initialData?: VitalsEntry;
  isEditing?: boolean;
  isAntenatal?: boolean;
  attendanceId?: string | null;
  attendanceType?: string;
}

export const VitalsFormModal: React.FC<VitalsFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  initialData,
  isEditing = false,
  isAntenatal = false,
  attendanceId,
  attendanceType,
}) => {
  const [formData, setFormData] = useState<VitalsEntry>({
    bloodPressure: '',
    temperature: undefined,
    pulse: undefined,
    respiration: undefined,
    spo2: undefined,
    weight: undefined,
    height: undefined,
    // ANC fields
    fetalHeartRate: undefined,
    fundalHeight: undefined,
    presentingPart: '',
    fetalMovement: false,
    oedema: false,
    notes: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        bloodPressure: initialData.bloodPressure || '',
        temperature: initialData.temperature,
        pulse: initialData.pulse,
        respiration: initialData.respiration,
        spo2: initialData.spo2,
        weight: initialData.weight,
        height: initialData.height,
        fetalHeartRate: initialData.fetalHeartRate,
        fundalHeight: initialData.fundalHeight,
        presentingPart: initialData.presentingPart || '',
        fetalMovement: initialData.fetalMovement || false,
        oedema: initialData.oedema || false,
        notes: initialData.notes || '',
      });
    } else {
      setFormData({
        bloodPressure: '',
        temperature: undefined,
        pulse: undefined,
        respiration: undefined,
        spo2: undefined,
        weight: undefined,
        height: undefined,
        fetalHeartRate: undefined,
        fundalHeight: undefined,
        presentingPart: '',
        fetalMovement: false,
        oedema: false,
        notes: '',
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const hasAnyValue =
      formData.bloodPressure ||
      formData.temperature !== undefined ||
      formData.pulse !== undefined ||
      formData.respiration !== undefined ||
      formData.spo2 !== undefined ||
      formData.weight !== undefined ||
      formData.height !== undefined ||
      (isAntenatal && (
        formData.fetalHeartRate !== undefined ||
        formData.fundalHeight !== undefined ||
        formData.presentingPart ||
        formData.fetalMovement ||
        formData.oedema
      ));

    if (!hasAnyValue) {
      alert('Please enter at least one vital sign');
      return;
    }

    onSubmit(formData);
  };

  const handleReset = () => {
    setFormData({
      bloodPressure: '',
      temperature: undefined,
      pulse: undefined,
      respiration: undefined,
      spo2: undefined,
      weight: undefined,
      height: undefined,
      fetalHeartRate: undefined,
      fundalHeight: undefined,
      presentingPart: '',
      fetalMovement: false,
      oedema: false,
      notes: '',
    });
  };

  const handleClose = () => {
    setFormData({
      bloodPressure: '',
      temperature: undefined,
      pulse: undefined,
      respiration: undefined,
      spo2: undefined,
      weight: undefined,
      height: undefined,
      fetalHeartRate: undefined,
      fundalHeight: undefined,
      presentingPart: '',
      fetalMovement: false,
      oedema: false,
      notes: '',
    });
    onClose();
  };

  // Presenting part options
  const presentingPartOptions = [
    { value: 'cephalic', label: 'Cephalic (Head down)' },
    { value: 'breech', label: 'Breech (Feet down)' },
    { value: 'transverse', label: 'Transverse (Sideways)' },
    { value: 'unknown', label: 'Unknown/Not determined' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto border border-[var(--border-color)]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)] sticky top-0 bg-[var(--bg-card)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[var(--icon-red-bg)] rounded-lg flex items-center justify-center">
              <Heart className="w-4 h-4 text-[var(--icon-red-text)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {isEditing ? 'Edit Vitals' : 'Record New Vitals'}
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {isEditing ? 'Update patient vital signs' : 'Enter patient vital signs'}
                {isAntenatal && ' (includes antenatal assessment)'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-[var(--bg-main)] rounded-lg transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Blood Pressure */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
              <Gauge className="w-4 h-4 text-[var(--icon-cyan-text)]" />
              Blood Pressure
            </label>
            <BloodPressureInput
              value={formData.bloodPressure}
              onChange={(value) => setFormData(prev => ({ ...prev, bloodPressure: value }))}
              disabled={isLoading}
            />
          </div>

          {/* Compact Grid Layout */}
          <div className="grid grid-cols-2 gap-4">
            {/* Temperature */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-[var(--icon-orange-text)]" />
                Temperature
              </label>
              <div className="relative">
                <input                  type="number"
                  step="0.1"
                  placeholder="36.6"
                  value={formData.temperature || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    temperature: e.target.value ? parseFloat(e.target.value) : undefined 
                  }))}
                  disabled={isLoading}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed pr-10"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-[var(--text-secondary)]">°C</span>
              </div>
            </div>

            {/* Pulse */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[var(--icon-green-text)]" />
                Pulse
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="72"
                  value={formData.pulse || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    pulse: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                  disabled={isLoading}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed pr-16"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-[var(--text-secondary)]">bpm</span>
              </div>
            </div>

            {/* Respiration */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[var(--icon-purple-text)]" />
                Respiration
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="16"
                  value={formData.respiration || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    respiration: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                  disabled={isLoading}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed pr-16"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-[var(--text-secondary)]">bpm</span>
              </div>
            </div>

            {/* SpO2 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[var(--icon-red-text)]" />
                SpO2
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="98"
                  value={formData.spo2 || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    spo2: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                  disabled={isLoading}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed pr-8"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-[var(--text-secondary)]">%</span>
              </div>
            </div>

            {/* Weight */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                <Weight className="w-4 h-4 text-[var(--icon-yellow-text)]" />
                Weight
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  placeholder="65.5"
                  value={formData.weight || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    weight: e.target.value ? parseFloat(e.target.value) : undefined 
                  }))}
                  disabled={isLoading}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed pr-12"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-[var(--text-secondary)]">kg</span>
              </div>
            </div>

            {/* Height */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                <Ruler className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                Height
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="170"
                  value={formData.height || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    height: e.target.value ? parseFloat(e.target.value) : undefined 
                  }))}
                  disabled={isLoading}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed pr-12"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-[var(--text-secondary)]">cm</span>
              </div>
            </div>
          </div>

          {/* ✅ ANC SPECIFIC FIELDS - Only show if attendance is antenatal */}
          {isAntenatal && (
            <div className="border-t border-[var(--border-color)] pt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Baby className="w-5 h-5 text-pink-500" />
                <h3 className="text-md font-semibold text-[var(--text-primary)]">Antenatal Assessment</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Fetal Heart Rate */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                    <Heart className="w-4 h-4 text-pink-500" />
                    Fetal Heart Rate (bpm)
                  </label>
                  <input
                    type="number"
                    step="1"
                    placeholder="120-160"
                    value={formData.fetalHeartRate || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      fetalHeartRate: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                    disabled={isLoading}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-[var(--text-primary)]"
                  />
                </div>

                {/* Fundal Height */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-pink-500" />
                    Fundal Height (cm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="24-32"
                    value={formData.fundalHeight || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      fundalHeight: e.target.value ? parseFloat(e.target.value) : undefined 
                    }))}
                    disabled={isLoading}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-[var(--text-primary)]"
                  />
                </div>

                {/* Presenting Part */}
                <div className="space-y-2 col-span-2">
                  <label className="block text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                    <Shield className="w-4 h-4 text-pink-500" />
                    Presenting Part
                  </label>
                  <select
                    value={formData.presentingPart}
                    onChange={(e) => setFormData(prev => ({ ...prev, presentingPart: e.target.value }))}
                    disabled={isLoading}
                    className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-[var(--text-primary)]"
                  >
                    <option value="">Select presenting part...</option>
                    {presentingPartOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Checkboxes */}
                <div className="col-span-2 flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.fetalMovement}
                      onChange={(e) => setFormData(prev => ({ ...prev, fetalMovement: e.target.checked }))}
                      disabled={isLoading}
                      className="w-4 h-4 rounded border-[var(--border-color)] text-pink-500 focus:ring-pink-500"
                    />
                    <span className="text-sm text-[var(--text-primary)]">Fetal Movement Present</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.oedema}
                      onChange={(e) => setFormData(prev => ({ ...prev, oedema: e.target.checked }))}
                      disabled={isLoading}
                      className="w-4 h-4 rounded border-[var(--border-color)] text-pink-500 focus:ring-pink-500"
                    />
                    <span className="text-sm text-[var(--text-primary)]">Oedema Present</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Additional Notes
            </label>
            <textarea
              placeholder="Enter any additional observations or comments..."
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              disabled={isLoading}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-[var(--border-color)]">
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-3 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex-1 justify-center"
            >
              <Heart className="w-4 h-4" />
              {isLoading ? 'Saving...' : (isEditing ? 'Update Vitals' : 'Record Vitals')}
            </button>
            
            <button
              type="button"
              onClick={handleReset}
              disabled={isLoading}
              className="px-4 py-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear All
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}