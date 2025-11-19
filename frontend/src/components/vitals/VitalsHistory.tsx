import React from 'react';
import { Edit2, Trash2, TrendingUp, Calendar, User } from 'lucide-react';
import type { Vitals } from '../../types';

interface VitalsHistoryProps {
  vitals: Vitals[];
  onEdit: (vitals: Vitals) => void;
  onDelete: (vitals: Vitals) => void;
  isLoading?: boolean;
}

export const VitalsHistory: React.FC<VitalsHistoryProps> = ({ 
  vitals, 
  onEdit, 
  onDelete, 
  isLoading = false 
}) => {
  const getRecordedBy = (vitals: Vitals): string => {
    if (typeof vitals.recordedBy === 'string') {
      return vitals.recordedBy;
    }
    return vitals.recordedBy?.fullName || 'Unknown';
  };

  const getVitalColor = (type: string, value: any): string => {
    if (!value) return 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]';
    
    switch (type) {
      case 'bloodPressure':
        if (typeof value === 'string') {
          const [systolic, diastolic] = value.split('/').map(Number);
          if (systolic >= 90 && systolic <= 120 && diastolic >= 60 && diastolic <= 80) {
            return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border-[var(--icon-green-bg)]';
          } else {
            return 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border-[var(--icon-red-bg)]';
          }
        }
        return 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border-[var(--icon-cyan-bg)]';
      
      case 'pulse':
        if (value >= 60 && value <= 100) return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border-[var(--icon-green-bg)]';
        return 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border-[var(--icon-red-bg)]';
      
      case 'temperature':
        if (value >= 36.1 && value <= 37.2) return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border-[var(--icon-green-bg)]';
        return 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border-[var(--icon-red-bg)]';
      
      case 'spo2':
        if (value >= 95) return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border-[var(--icon-green-bg)]';
        return 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border-[var(--icon-red-bg)]';
      
      default:
        return 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border-[var(--icon-cyan-bg)]';
    }
  };

  if (vitals.length === 0) {
    return (
      <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center border border-[var(--border-color)]">
        <TrendingUp className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Vitals Recorded</h3>
        <p className="text-[var(--text-secondary)]">No vital signs have been recorded for this visit yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-6 shadow-sm border border-[var(--border-color)]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-[var(--icon-cyan-text)]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Vitals History</h3>
            <p className="text-sm text-[var(--text-secondary)]">{vitals.length} record{vitals.length !== 1 ? 's' : ''} found</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        {vitals.slice().reverse().map((vitalsRecord, index) => (
          <div 
            key={vitalsRecord.id || index} 
            className="border border-[var(--border-color)] rounded-lg p-4 hover:border-[var(--icon-cyan-text)] transition-all duration-200 bg-[var(--bg-main)]"
          >
            {/* Header with timestamp and actions */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-sm text-[var(--text-secondary)]">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">
                    {new Date(vitalsRecord.recordedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm text-[var(--text-secondary)]">
                  <span className="text-[var(--text-tertiary)]">•</span>
                  <span>{new Date(vitalsRecord.recordedAt).toLocaleTimeString()}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onEdit(vitalsRecord)}
                  disabled={isLoading}
                  className="p-2 text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Edit vitals"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(vitalsRecord)}
                  disabled={isLoading}
                  className="p-2 text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete vitals"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Vital Signs Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              {vitalsRecord.bloodPressure && (
                <div className={`rounded-lg p-3 border ${getVitalColor('bloodPressure', vitalsRecord.bloodPressure)}`}>
                  <div className="text-xs font-semibold uppercase tracking-wide mb-1">Blood Pressure</div>
                  <div className="font-bold text-lg">{vitalsRecord.bloodPressure}</div>
                  <div className="text-xs opacity-75">mmHg</div>
                </div>
              )}
              
              {vitalsRecord.pulse !== undefined && (
                <div className={`rounded-lg p-3 border ${getVitalColor('pulse', vitalsRecord.pulse)}`}>
                  <div className="text-xs font-semibold uppercase tracking-wide mb-1">Pulse</div>
                  <div className="font-bold text-lg">{vitalsRecord.pulse}</div>
                  <div className="text-xs opacity-75">bpm</div>
                </div>
              )}
              
              {vitalsRecord.temperature !== undefined && (
                <div className={`rounded-lg p-3 border ${getVitalColor('temperature', vitalsRecord.temperature)}`}>
                  <div className="text-xs font-semibold uppercase tracking-wide mb-1">Temperature</div>
                  <div className="font-bold text-lg">{vitalsRecord.temperature}</div>
                  <div className="text-xs opacity-75">°C</div>
                </div>
              )}
              
              {vitalsRecord.spo2 !== undefined && (
                <div className={`rounded-lg p-3 border ${getVitalColor('spo2', vitalsRecord.spo2)}`}>
                  <div className="text-xs font-semibold uppercase tracking-wide mb-1">SpO2</div>
                  <div className="font-bold text-lg">{vitalsRecord.spo2}</div>
                  <div className="text-xs opacity-75">%</div>
                </div>
              )}
            </div>

            {/* Additional Measurements */}
            {(vitalsRecord.weight !== undefined || vitalsRecord.height !== undefined) && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                {vitalsRecord.weight !== undefined && (
                  <div className="bg-[var(--bg-main)] rounded-lg p-3 border border-[var(--border-color)]">
                    <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1">Weight</div>
                    <div className="font-semibold text-[var(--text-primary)]">{vitalsRecord.weight} kg</div>
                  </div>
                )}
                {vitalsRecord.height !== undefined && (
                  <div className="bg-[var(--bg-main)] rounded-lg p-3 border border-[var(--border-color)]">
                    <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1">Height</div>
                    <div className="font-semibold text-[var(--text-primary)]">{vitalsRecord.height} cm</div>
                  </div>
                )}
                {vitalsRecord.bmi !== undefined && (
                  <div className="bg-[var(--bg-main)] rounded-lg p-3 border border-[var(--border-color)]">
                    <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1">BMI</div>
                    <div className="font-semibold text-[var(--text-primary)]">{vitalsRecord.bmi}</div>
                  </div>
                )}
              </div>
            )}

            {/* Notes and Recorded By */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
              {vitalsRecord.notes && (
                <div className="text-sm text-[var(--text-secondary)] flex-1">
                  <span className="font-medium">Notes:</span> {vitalsRecord.notes}
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                <User className="w-3 h-3" />
                <span>Recorded by: {getRecordedBy(vitalsRecord)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};