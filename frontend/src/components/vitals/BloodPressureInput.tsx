import React, { useState, useEffect } from 'react';

interface BloodPressureInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const BloodPressureInput: React.FC<BloodPressureInputProps> = ({ 
  value, 
  onChange, 
  disabled = false 
}) => {
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');

  const handleSystolicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 3);
    setSystolic(val);
    if (val && diastolic) {
      onChange(`${val}/${diastolic}`);
    } else if (val) {
      onChange(val);
    } else {
      onChange('');
    }
  };

  const handleDiastolicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 3);
    setDiastolic(val);
    if (systolic && val) {
      onChange(`${systolic}/${val}`);
    } else if (systolic) {
      onChange(systolic);
    } else {
      onChange('');
    }
  };

  // Parse existing value
  useEffect(() => {
    if (value && value.includes('/')) {
      const [sys, dia] = value.split('/');
      setSystolic(sys || '');
      setDiastolic(dia || '');
    } else if (value) {
      setSystolic(value);
      setDiastolic('');
    } else {
      setSystolic('');
      setDiastolic('');
    }
  }, [value]);

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        placeholder="120"
        value={systolic}
        onChange={handleSystolicChange}
        disabled={disabled}
        className="w-20 px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent text-center text-[var(--text-primary)] placeholder-[var(--text-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed"
        maxLength={3}
      />
      <span className="text-[var(--text-secondary)]">/</span>
      <input
        type="text"
        placeholder="80"
        value={diastolic}
        onChange={handleDiastolicChange}
        disabled={disabled}
        className="w-20 px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent text-center text-[var(--text-primary)] placeholder-[var(--text-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed"
        maxLength={3}
      />
      <span className="text-sm text-[var(--text-secondary)]">mmHg</span>
    </div>
  );
};