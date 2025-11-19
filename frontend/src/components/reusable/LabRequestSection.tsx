// src/components/reusable/LabRequestSection.tsx - UPDATED
import React from 'react';
import { LabTestTemplate, Attendance } from '../types';
import { LabTestEntry } from '../types/medical-entries';
import { Plus, AlertCircle } from 'lucide-react';

interface LabRequestSectionProps {
  currentLabRequest: LabTestEntry;
  onLabRequestChange: (request: LabTestEntry) => void;
  onRequestLabTest: () => void;
  labTestTemplates: LabTestTemplate[];
  selectedAttendance: Attendance | undefined;
  isRequestingLab: boolean;
}

export const LabRequestSection: React.FC<LabRequestSectionProps> = ({
  currentLabRequest,
  onLabRequestChange,
  onRequestLabTest,
  labTestTemplates,
  selectedAttendance,
  isRequestingLab
}) => {
  const canRequestLab = selectedAttendance && 
    (selectedAttendance.status === 'pending' || selectedAttendance.status === 'active');

  return (
    <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] p-6">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <Plus className="w-5 h-5 text-[var(--icon-blue-text)]" />
        Request New Lab Test
      </h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Lab Test *
          </label>
          <select
            value={currentLabRequest.templateId}
            onChange={(e) => {
              const template = labTestTemplates.find(t => t._id === e.target.value);
              onLabRequestChange({
                ...currentLabRequest,
                templateId: e.target.value,
                name: template?.name || ''
              });
            }}
            className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
          >
            <option value="">Select lab test...</option>
            {labTestTemplates.map((template) => (
              <option key={template._id} value={template._id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Priority
          </label>
          <select
            value={currentLabRequest.priority}
            onChange={(e) => onLabRequestChange({
              ...currentLabRequest,
              priority: e.target.value as 'routine' | 'urgent'
            })}
            className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
          >
            <option value="routine">Routine</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={currentLabRequest.notes}
            onChange={(e) => onLabRequestChange({
              ...currentLabRequest,
              notes: e.target.value
            })}
            rows={2}
            placeholder="Any special instructions or notes..."
            className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
          />
        </div>

        <button
          onClick={onRequestLabTest}
          disabled={isRequestingLab || !currentLabRequest.templateId || !canRequestLab}
          className="w-full px-4 py-3 bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded-lg hover:bg-[var(--icon-blue-text)] hover:text-white transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRequestingLab ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              Requesting...
            </>
          ) : (
            'Request Lab Test'
          )}
        </button>

        {!canRequestLab && (
          <div className="bg-[var(--icon-yellow-bg)] border border-[var(--icon-yellow-text)] rounded-lg p-3">
            <div className="flex items-center gap-2 text-[var(--icon-yellow-text)] text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Cannot request lab tests for {selectedAttendance?.status} attendance</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};