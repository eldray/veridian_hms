import React, { useState, useEffect } from 'react';
import { X, Heart, Thermometer, Activity, Gauge, Weight, Ruler, TrendingUp } from 'lucide-react';
import { BloodPressureInput } from './BloodPressureInput';
import type { VitalsEntry } from '../../types';

interface VitalsFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (vitals: VitalsEntry) => void;
  isLoading: boolean;
  initialData?: VitalsEntry;
  isEditing?: boolean;
}

export const VitalsFormModal: React.FC<VitalsFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  initialData,
  isEditing = false
}) => {
  const [formData, setFormData] = useState<VitalsEntry>({
    bloodPressure: '',
    temperature: undefined,
    pulse: undefined,
    respiration: undefined,
    spo2: undefined,
    weight: undefined,
    height: undefined,
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
        notes: '',
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that at least one vital sign is provided
    const hasAnyValue =
      formData.bloodPressure ||
      formData.temperature !== undefined ||
      formData.pulse !== undefined ||
      formData.respiration !== undefined ||
      formData.spo2 !== undefined ||
      formData.weight !== undefined ||
      formData.height !== undefined;

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
      notes: '',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
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
                <input
                  type="number"
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
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] resize-none disabled:opacity-50 disabled:cursor-not-allowed"
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
};