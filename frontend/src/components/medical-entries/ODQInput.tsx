// src/components/medical-entries/ODQInput.tsx - FIXED (no nested buttons)
import React, { useState, useRef, useEffect } from 'react';
import { Clock, Activity, TrendingUp, AlertCircle, Zap, Shield, X } from 'lucide-react';
import { 
  ONSET_SUGGESTIONS, DURATION_SUGGESTIONS, QUALITY_SUGGESTIONS,
  SEVERITY_SUGGESTIONS, ASSOCIATED_SYMPTOMS, AGGRAVATING_FACTORS,
  RELIEVING_FACTORS
} from '../../data/odqData';

interface ODQInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

interface ODQField {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  placeholder: string;
}

export default function ODQInput({ value, onChange, disabled }: ODQInputProps) {
  const [activeField, setActiveField] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [tempValue, setTempValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse existing ODQ string
  useEffect(() => {
    if (value && Object.keys(fieldValues).length === 0) {
      const parsed: Record<string, string> = {};
      const parts = value.split('; ');
      parts.forEach(part => {
        const match = part.match(/^(Onset|Duration|Quality|Severity|Associated|Aggravated by|Relieved by):\s*(.+)$/);
        if (match) {
          let key = match[1].toLowerCase();
          if (key === 'aggravated by') key = 'aggravating';
          if (key === 'relieved by') key = 'relieving';
          parsed[key] = match[2];
        }
      });
      setFieldValues(parsed);
    }
  }, [value]);

  const getSuggestionsForField = (fieldId: string): string[] => {
    switch (fieldId) {
      case 'onset': return ONSET_SUGGESTIONS.slice(0, 6);
      case 'duration': return DURATION_SUGGESTIONS.slice(0, 6);
      case 'quality': return QUALITY_SUGGESTIONS.slice(0, 6);
      case 'severity': return SEVERITY_SUGGESTIONS.slice(0, 6);
      case 'associated': return ASSOCIATED_SYMPTOMS.slice(0, 6);
      case 'aggravating': return AGGRAVATING_FACTORS.slice(0, 6);
      case 'relieving': return RELIEVING_FACTORS.slice(0, 6);
      default: return [];
    }
  };

  const updateField = (fieldId: string, newValue: string) => {
    if (!newValue.trim()) return;
    
    const updated = { ...fieldValues, [fieldId]: newValue };
    setFieldValues(updated);
    
    const formatted = [];
    if (updated.onset) formatted.push(`Onset: ${updated.onset}`);
    if (updated.duration) formatted.push(`Duration: ${updated.duration}`);
    if (updated.quality) formatted.push(`Quality: ${updated.quality}`);
    if (updated.severity) formatted.push(`Severity: ${updated.severity}`);
    if (updated.associated) formatted.push(`Associated: ${updated.associated}`);
    if (updated.aggravating) formatted.push(`Aggravated by: ${updated.aggravating}`);
    if (updated.relieving) formatted.push(`Relieved by: ${updated.relieving}`);
    
    onChange(formatted.join('; '));
  };

  const openField = (fieldId: string) => {
    setActiveField(fieldId);
    setTempValue(fieldValues[fieldId] || '');
    setSuggestions(getSuggestionsForField(fieldId));
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const closeField = (save: boolean = true) => {
    if (save && activeField && tempValue) {
      updateField(activeField, tempValue);
    }
    setActiveField(null);
    setTempValue('');
    setSuggestions([]);
  };

  const selectSuggestion = (suggestion: string) => {
    if (activeField) {
      setTempValue(suggestion);
      updateField(activeField, suggestion);
      closeField(true);
    }
  };

  const clearField = (fieldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = { ...fieldValues };
    delete updated[fieldId];
    setFieldValues(updated);
    
    const formatted = [];
    if (updated.onset) formatted.push(`Onset: ${updated.onset}`);
    if (updated.duration) formatted.push(`Duration: ${updated.duration}`);
    if (updated.quality) formatted.push(`Quality: ${updated.quality}`);
    if (updated.severity) formatted.push(`Severity: ${updated.severity}`);
    if (updated.associated) formatted.push(`Associated: ${updated.associated}`);
    if (updated.aggravating) formatted.push(`Aggravated by: ${updated.aggravating}`);
    if (updated.relieving) formatted.push(`Relieved by: ${updated.relieving}`);
    
    onChange(formatted.join('; '));
  };

  const fields: ODQField[] = [
    { id: 'onset', label: 'Onset', icon: <Clock className="w-3.5 h-3.5" />, color: 'orange', placeholder: 'When did it start?' },
    { id: 'duration', label: 'Duration', icon: <Clock className="w-3.5 h-3.5" />, color: 'blue', placeholder: 'How long?' },
    { id: 'quality', label: 'Quality', icon: <Activity className="w-3.5 h-3.5" />, color: 'purple', placeholder: 'What does it feel like?' },
    { id: 'severity', label: 'Severity', icon: <TrendingUp className="w-3.5 h-3.5" />, color: 'red', placeholder: 'Rate 1-10' },
    { id: 'associated', label: 'Associated', icon: <AlertCircle className="w-3.5 h-3.5" />, color: 'yellow', placeholder: 'Other symptoms?' },
    { id: 'aggravating', label: 'Aggravates', icon: <Zap className="w-3.5 h-3.5" />, color: 'red', placeholder: 'What makes it worse?' },
    { id: 'relieving', label: 'Relieves', icon: <Shield className="w-3.5 h-3.5" />, color: 'green', placeholder: 'What makes it better?' }
  ];

  const getColorClass = (color: string) => {
    const colors: Record<string, string> = {
      orange: 'border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/20',
      blue: 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/20',
      purple: 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/20',
      red: 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20',
      yellow: 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-950/20',
      green: 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/20',
    };
    return colors[color] || colors.blue;
  };

  const hasValues = Object.values(fieldValues).some(v => v);

  return (
    <div className="space-y-2">
      {/* Compact Field Row - using divs with onClick instead of buttons */}
      <div className="flex flex-wrap gap-1.5">
        {fields.map((field) => {
          const hasValue = !!fieldValues[field.id];
          const isActive = activeField === field.id;
          
          return (
            <div
              key={field.id}
              onClick={() => openField(field.id)}
              className={`
                inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs cursor-pointer transition-all
                ${hasValue 
                  ? `${getColorClass(field.color)} border` 
                  : 'bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-gray-400'
                }
                ${isActive ? 'ring-1 ring-blue-500' : ''}
              `}
            >
              {field.icon}
              <span>{field.label}</span>
              {hasValue && (
                <div
                  onClick={(e) => clearField(field.id, e)}
                  className="ml-0.5 p-0.5 hover:bg-black/10 rounded inline-flex items-center"
                >
                  <X className="w-2.5 h-2.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Active Field Input - Compact */}
      {activeField && (
        <div className={`p-2 rounded-lg border ${getColorClass(fields.find(f => f.id === activeField)?.color || 'blue')}`}>
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') closeField(true);
                  if (e.key === 'Escape') closeField(false);
                }}
                placeholder={fields.find(f => f.id === activeField)?.placeholder}
                className="w-full px-2 py-1 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded focus:ring-1 focus:ring-blue-500 text-[var(--text-primary)]"
              />
            </div>
            <button
              type="button"
              onClick={() => closeField(true)}
              className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
            >
              Save
            </button>
          </div>
          
          {/* Quick Suggestions */}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectSuggestion(suggestion)}
                  className="px-1.5 py-0.5 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded hover:bg-[var(--icon-cyan-bg)] hover:text-[var(--icon-cyan-text)] transition-colors"
                >
                  {suggestion.length > 30 ? suggestion.substring(0, 30) + '...' : suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Compact Summary - only shows when there are values and no active field */}
      {hasValues && !activeField && (
        <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2 flex-wrap">
          <span className="font-medium">ODQ:</span>
          {fieldValues.onset && <span className="inline-flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {fieldValues.onset}</span>}
          {fieldValues.duration && <span className="inline-flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {fieldValues.duration}</span>}
          {fieldValues.quality && <span className="inline-flex items-center gap-0.5"><Activity className="w-2.5 h-2.5" /> {fieldValues.quality}</span>}
        </div>
      )}
    </div>
  );
}