import React from 'react';
import { Edit2, Trash2, Calendar, User, MoreVertical, Weight, Ruler } from 'lucide-react';
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

  const getStatusColor = (type: string, value: any): string => {
    if (!value) return 'text-[var(--text-secondary)]';
    
    switch (type) {
      case 'bloodPressure':
        if (typeof value === 'string') {
          const [systolic, diastolic] = value.split('/').map(Number);
          if (systolic >= 90 && systolic <= 120 && diastolic >= 60 && diastolic <= 80) {
            return 'text-[var(--icon-green-text)]';
          } else {
            return 'text-[var(--icon-red-text)]';
          }
        }
        return 'text-[var(--icon-cyan-text)]';
      
      case 'pulse':
        if (value >= 60 && value <= 100) return 'text-[var(--icon-green-text)]';
        return 'text-[var(--icon-red-text)]';
      
      case 'temperature':
        if (value >= 36.1 && value <= 37.2) return 'text-[var(--icon-green-text)]';
        return 'text-[var(--icon-red-text)]';
      
      case 'spo2':
        if (value >= 95) return 'text-[var(--icon-green-text)]';
        return 'text-[var(--icon-red-text)]';
      
      case 'respiration':
        if (value >= 12 && value <= 20) return 'text-[var(--icon-green-text)]';
        return 'text-[var(--icon-red-text)]';
      
      default:
        return 'text-[var(--text-secondary)]';
    }
  };

  if (vitals.length === 0) {
    return (
      <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)] p-6 text-center">
        <div className="text-[var(--text-tertiary)] text-sm">No vitals recorded for this visit</div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)] text-[var(--text-primary)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-color)]">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Vitals History ({vitals.length})</h3>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[var(--bg-main)]">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Time</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">BP</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Temp</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Pulse</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Resp</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">SpO2</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Weight</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Height</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">BMI</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Recorded By</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {vitals.slice().reverse().map((vitalsRecord, index) => (
              <tr key={vitalsRecord.id || index} className="hover:bg-[var(--bg-main)]">
                {/* Time */}
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="text-sm text-[var(--text-primary)]">
                    {new Date(vitalsRecord.recordedAt).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {new Date(vitalsRecord.recordedAt).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </td>

                {/* Blood Pressure */}
                <td className="px-3 py-3 whitespace-nowrap">
                  {vitalsRecord.bloodPressure ? (
                    <div className={`text-sm font-medium ${getStatusColor('bloodPressure', vitalsRecord.bloodPressure)}`}>
                      {vitalsRecord.bloodPressure}
                    </div>
                  ) : (
                    <span className="text-sm text-[var(--text-tertiary)]">-</span>
                  )}
                </td>

                {/* Temperature */}
                <td className="px-3 py-3 whitespace-nowrap">
                  {vitalsRecord.temperature !== undefined ? (
                    <div className={`text-sm font-medium ${getStatusColor('temperature', vitalsRecord.temperature)}`}>
                      {vitalsRecord.temperature}°C
                    </div>
                  ) : (
                    <span className="text-sm text-[var(--text-tertiary)]">-</span>
                  )}
                </td>

                {/* Pulse */}
                <td className="px-3 py-3 whitespace-nowrap">
                  {vitalsRecord.pulse !== undefined ? (
                    <div className={`text-sm font-medium ${getStatusColor('pulse', vitalsRecord.pulse)}`}>
                      {vitalsRecord.pulse}
                    </div>
                  ) : (
                    <span className="text-sm text-[var(--text-tertiary)]">-</span>
                  )}
                </td>

                {/* Respiration */}
                <td className="px-3 py-3 whitespace-nowrap">
                  {vitalsRecord.respiration !== undefined ? (
                    <div className={`text-sm font-medium ${getStatusColor('respiration', vitalsRecord.respiration)}`}>
                      {vitalsRecord.respiration}
                    </div>
                  ) : (
                    <span className="text-sm text-[var(--text-tertiary)]">-</span>
                  )}
                </td>

                {/* SpO2 */}
                <td className="px-3 py-3 whitespace-nowrap">
                  {vitalsRecord.spo2 !== undefined ? (
                    <div className={`text-sm font-medium ${getStatusColor('spo2', vitalsRecord.spo2)}`}>
                      {vitalsRecord.spo2}%
                    </div>
                  ) : (
                    <span className="text-sm text-[var(--text-tertiary)]">-</span>
                  )}
                </td>

                {/* Weight */}
                <td className="px-3 py-3 whitespace-nowrap">
                  {vitalsRecord.weight !== undefined ? (
                    <div className="flex items-center gap-1 text-sm text-[var(--text-primary)]">
                      <Weight className="w-3 h-3 text-[var(--text-tertiary)]" />
                      {vitalsRecord.weight} kg
                    </div>
                  ) : (
                    <span className="text-sm text-[var(--text-tertiary)]">-</span>
                  )}
                </td>

                {/* Height */}
                <td className="px-3 py-3 whitespace-nowrap">
                  {vitalsRecord.height !== undefined ? (
                    <div className="flex items-center gap-1 text-sm text-[var(--text-primary)]">
                      <Ruler className="w-3 h-3 text-[var(--text-tertiary)]" />
                      {vitalsRecord.height} cm
                    </div>
                  ) : (
                    <span className="text-sm text-[var(--text-tertiary)]">-</span>
                  )}
                </td>

                {/* BMI */}
                <td className="px-3 py-3 whitespace-nowrap">
                  {vitalsRecord.bmi !== undefined ? (
                    <div className="text-sm font-medium text-[var(--text-primary)]">
                      {vitalsRecord.bmi}
                    </div>
                  ) : (
                    <span className="text-sm text-[var(--text-tertiary)]">-</span>
                  )}
                </td>

                {/* Recorded By */}
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="text-sm text-[var(--text-primary)]">
                    {getRecordedBy(vitalsRecord)}
                  </div>
                </td>

                {/* Actions */}
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEdit(vitalsRecord)}
                      disabled={isLoading}
                      className="p-1 text-[var(--icon-cyan-text)] hover:bg:[var(--icon-cyan-bg)] rounded transition-colors disabled:opacity-50"
                      title="Edit vitals"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(vitalsRecord)}
                      disabled={isLoading}
                      className="p-1 text-[var(--icon-red-text)] hover:bg:[var(--icon-red-bg)] rounded transition-colors disabled:opacity-50"
                      title="Delete vitals"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notes section */}
      {vitals.some(v => v.notes) && (
        <div className="px-4 py-3 border-t border-[var(--border-color)] bg-[var(--bg-main)]">
          <div className="text-xs text-[var(--text-secondary)]">
            <strong>Notes:</strong> Some records include additional clinical notes. 
            Click the edit button to view full details.
          </div>
        </div>
      )}
    </div>
  );
};