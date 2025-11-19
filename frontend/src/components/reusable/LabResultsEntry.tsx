// src/components/reusable/LabResultsEntry.tsx - UPDATED
import React from 'react';
import { LabTest, Patient, Attendance } from '../types';
import { Activity, AlertCircle } from 'lucide-react';

interface LabResultsEntryProps {
  selectedTest: { attendanceId: string; testId: string } | null;
  selectedTestData: LabTest | undefined;
  selectedPatient: Patient | undefined;
  selectedAttendance: Attendance | undefined;
  result: string;
  normalRange: string;
  units: string;
  notes: string;
  onResultChange: (result: string) => void;
  onNormalRangeChange: (range: string) => void;
  onUnitsChange: (units: string) => void;
  onNotesChange: (notes: string) => void;
  onSubmitResult: () => void;
  onCancel: () => void;
  isLoading: boolean;
  canUpdateLabTest: boolean;
}

export const LabResultsEntry: React.FC<LabResultsEntryProps> = ({
  selectedTest,
  selectedTestData,
  selectedPatient,
  selectedAttendance,
  result,
  normalRange,
  units,
  notes,
  onResultChange,
  onNormalRangeChange,
  onUnitsChange,
  onNotesChange,
  onSubmitResult,
  onCancel,
  isLoading,
  canUpdateLabTest
}) => {
  if (!selectedTest) {
    return (
      <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-[var(--icon-blue-text)]" />
          Enter Test Result
        </h2>
        <div className="text-center py-8">
          <Activity className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
          <p className="text-[var(--text-secondary)] text-sm">Select a test from the left to enter results</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] p-6">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-[var(--icon-blue-text)]" />
        Enter Test Result
      </h2>
      
      <div className="space-y-4">
        <div className="bg-[var(--icon-blue-bg)] rounded-lg p-4 border border-[var(--icon-blue-text)]">
          <p className="text-xs text-[var(--icon-blue-text)] font-medium mb-1">Selected Test</p>
          <p className="font-bold text-lg text-[var(--icon-blue-text)] mb-1">{selectedTestData?.name}</p>
          {selectedPatient && (
            <p className="text-[var(--icon-blue-text)] text-sm">
              Patient: <span className="font-semibold">{selectedPatient.fullName}</span>
            </p>
          )}
          {selectedTestData?.priority === 'urgent' && (
            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-bold bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] rounded-full border border-[var(--icon-red-text)]">
              URGENT
            </span>
          )}
          {!canUpdateLabTest && (
            <div className="bg-[var(--icon-red-bg)] border border-[var(--icon-red-text)] rounded-lg p-2 mt-2">
              <div className="flex items-center gap-1 text-[var(--icon-red-text)] text-xs">
                <AlertCircle className="w-3 h-3" />
                <span className="font-medium">Cannot update lab results for {selectedAttendance?.status} attendance</span>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Test Result <span className="text-[var(--icon-red-text)]">*</span>
          </label>
          <textarea
            value={result}
            onChange={(e) => onResultChange(e.target.value)}
            rows={3}
            placeholder="Enter detailed test results..."
            className="w-full px-3 py-2 text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Normal Range
            </label>
            <input
              type="text"
              value={normalRange}
              onChange={(e) => onNormalRangeChange(e.target.value)}
              placeholder="e.g., 0-100"
              className="w-full px-3 py-2 text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Units
            </label>
            <input
              type="text"
              value={units}
              onChange={(e) => onUnitsChange(e.target.value)}
              placeholder="e.g., mg/dL"
              className="w-full px-3 py-2 text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Additional Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={2}
            placeholder="Any additional observations or notes..."
            className="w-full px-3 py-2 text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onSubmitResult}
            disabled={isLoading || !result.trim() || !canUpdateLabTest}
            className="flex-1 px-4 py-3 bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded-lg hover:bg-[var(--icon-blue-text)] hover:text-white transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              'Submit Result'
            )}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-3 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-main)] transition-all duration-200 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};