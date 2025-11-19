import React, { useMemo } from 'react';
import { Vitals } from '../types';
import { useToast } from '../../store/toastStore';
import {
  Heart,
  Save,
  Thermometer,
  Gauge,
  Wind,
  Droplets,
  Scale,
  Ruler,
  Activity
} from 'lucide-react';

interface VitalsInputFormProps {
  vitalsInput: Omit<Vitals, 'recordedAt' | 'recordedBy' | 'bmi'>;
  onVitalsChange: (vitals: Omit<Vitals, 'recordedAt' | 'recordedBy' | 'bmi'>) => void;
  onSubmit: () => void;
  isLoading: boolean;
  canRecordVitals: boolean;
}

export const VitalsInputForm: React.FC<VitalsInputFormProps> = ({
  vitalsInput,
  onVitalsChange,
  onSubmit,
  isLoading,
  canRecordVitals
}) => {
  const { error } = useToast(); // TOAST INTEGRATION

  const bmi = useMemo(() => {
    if (vitalsInput.weight && vitalsInput.height) {
      const heightInMeters = vitalsInput.height / 100;
      const calculated = vitalsInput.weight / (heightInMeters * heightInMeters);
      return parseFloat(calculated.toFixed(1));
    }
    return undefined;
  }, [vitalsInput.weight, vitalsInput.height]);

  const hasAnyValue =
    vitalsInput.bloodPressure ||
    vitalsInput.temperature !== undefined ||
    vitalsInput.pulse !== undefined ||
    vitalsInput.respiration !== undefined ||
    vitalsInput.spo2 !== undefined ||
    vitalsInput.weight !== undefined ||
    vitalsInput.height !== undefined;

  const handleSubmit = () => {
    if (!hasAnyValue) {
      error('Input Required', 'Please enter at least one vital sign');
      return;
    }
    if (!canRecordVitals) {
      error('Cannot Record', 'Cannot record vitals for this attendance status');
      return;
    }
    onSubmit();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-semibold mb-3 text-gray-900">Record New Vitals</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Blood Pressure */}
        <VitalsInputField
          icon={Gauge}
          label="Blood Pressure"
          placeholder="e.g., 120/80"
          value={vitalsInput.bloodPressure}
          onChange={(value) => onVitalsChange({ ...vitalsInput, bloodPressure: value })}
        />

        {/* Temperature */}
        <VitalsInputField
          icon={Thermometer}
          label="Temperature (°C)"
          placeholder="e.g., 37.0"
          type="number"
          step="0.1"
          value={vitalsInput.temperature?.toString() || ''}
          onChange={(value) => onVitalsChange({ 
            ...vitalsInput, 
            temperature: value ? parseFloat(value) : undefined 
          })}
        />

        {/* Pulse */}
        <VitalsInputField
          icon={Heart}
          label="Pulse (bpm)"
          placeholder="e.g., 72"
          type="number"
          value={vitalsInput.pulse?.toString() || ''}
          onChange={(value) => onVitalsChange({ 
            ...vitalsInput, 
            pulse: value ? parseInt(value, 10) : undefined 
          })}
        />

        {/* Respiration */}
        <VitalsInputField
          icon={Wind}
          label="Respiration (rpm)"
          placeholder="e.g., 16"
          type="number"
          value={vitalsInput.respiration?.toString() || ''}
          onChange={(value) => onVitalsChange({ 
            ...vitalsInput, 
            respiration: value ? parseInt(value, 10) : undefined 
          })}
        />

        {/* SpO2 */}
        <VitalsInputField
          icon={Droplets}
          label="SpO2 (%)"
          placeholder="e.g., 98"
          type="number"
          value={vitalsInput.spo2?.toString() || ''}
          onChange={(value) => onVitalsChange({ 
            ...vitalsInput, 
            spo2: value ? parseInt(value, 10) : undefined 
          })}
        />

        {/* Weight */}
        <VitalsInputField
          icon={Scale}
          label="Weight (kg)"
          placeholder="e.g., 70.5"
          type="number"
          step="0.1"
          value={vitalsInput.weight?.toString() || ''}
          onChange={(value) => onVitalsChange({ 
            ...vitalsInput, 
            weight: value ? parseFloat(value) : undefined 
          })}
        />

        {/* Height */}
        <VitalsInputField
          icon={Ruler}
          label="Height (cm)"
          placeholder="e.g., 170"
          type="number"
          value={vitalsInput.height?.toString() || ''}
          onChange={(value) => onVitalsChange({ 
            ...vitalsInput, 
            height: value ? parseFloat(value) : undefined 
          })}
        />

        {/* BMI (read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">BMI</label>
          <div className="relative">
            <Activity className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={bmi ?? ''}
              readOnly
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end mt-4">
        <button
          onClick={handleSubmit}
          disabled={isLoading || !canRecordVitals || !hasAnyValue}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center gap-2 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Recording...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Record Vitals</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const VitalsInputField: React.FC<{
  icon: React.ComponentType<any>;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  step?: string;
}> = ({ icon: Icon, label, placeholder, value, onChange, type = 'text', step }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type={type}
        step={step}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
      />
    </div>
  </div>
);