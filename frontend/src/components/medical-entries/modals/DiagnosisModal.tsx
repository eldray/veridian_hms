// src/components/medical-entries/modals/DiagnosisModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Search, Stethoscope, AlertCircle, CheckCircle, DollarSign, Shield } from 'lucide-react';
import { useAttendanceStore } from '../../../store/attendanceStore';
import { useToast } from '../../../store/toastStore';

interface DiagnosisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  attendanceId: string | null;
  diagnoses: any[];
  canAdd: boolean;
  userId?: string;
}

export const DiagnosisModal: React.FC<DiagnosisModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  attendanceId,
  diagnoses,
  canAdd,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [isPrimary, setIsPrimary] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const { addDiagnosis } = useAttendanceStore();
  const { success, error } = useToast();

  // Filter diagnoses based on search
  const filteredDiagnoses = diagnoses.filter(d =>
    d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.icdCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectDiagnosis = (diagnosis: any) => {
    setSelectedDiagnosis(diagnosis);
    setSearchTerm(`${diagnosis.name} (${diagnosis.icdCode})`);
    setShowDropdown(false);
  };

  const clearSelection = () => {
    setSelectedDiagnosis(null);
    setSearchTerm('');
    setNotes('');
    setIsPrimary(true);
  };

  const handleSubmit = async () => {
    if (!attendanceId) {
      error('No Attendance', 'Please select an attendance first');
      return;
    }

    if (!selectedDiagnosis) {
      error('No Diagnosis', 'Please select a diagnosis');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDiagnosis(attendanceId, {
        diagnosisId: selectedDiagnosis.id,
        notes: notes,
        primary: isPrimary,
      });

      success('Diagnosis Added', `${selectedDiagnosis.name} has been added`);
      clearSelection();
      onSuccess();
    } catch (err: any) {
      error('Add Failed', err.message || 'Could not add diagnosis');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-[var(--bg-card)] rounded-xl shadow-xl max-w-lg w-full border border-[var(--border-color)]">
          {/* Header */}
          <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-[var(--icon-cyan-text)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Add Diagnosis</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Select a diagnosis from the catalog
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--bg-main)] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[var(--text-secondary)]" />
            </button>
          </div>

          {/* Form */}
          <div className="p-6 space-y-5">
            {/* Diagnosis Search */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--text-primary)]">
                Search Diagnosis *
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowDropdown(true);
                    if (selectedDiagnosis) setSelectedDiagnosis(null);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search by name or ICD-10 code..."
                  className="w-full pl-10 pr-3 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] text-sm"
                  disabled={!canAdd}
                />
              </div>

              {/* Dropdown */}
              {showDropdown && searchTerm && filteredDiagnoses.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto border border-[var(--border-color)] rounded-lg bg-[var(--bg-card)] shadow-lg">
                  {filteredDiagnoses.map((diagnosis) => (
                    <button
                      key={diagnosis.id}
                      onClick={() => handleSelectDiagnosis(diagnosis)}
                      className="w-full text-left p-3 hover:bg-[var(--bg-main)] border-b border-[var(--border-color)] last:border-b-0 transition-colors"
                    >
                      <div className="font-semibold text-[var(--text-primary)] text-sm">
                        {diagnosis.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <span className="font-mono text-[var(--text-secondary)]">
                          ICD-10: {diagnosis.icdCode}
                        </span>
                        {diagnosis.requiresAuthorization && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)] rounded">
                            <Shield className="w-3 h-3" />
                            Auth Required
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showDropdown && searchTerm && filteredDiagnoses.length === 0 && (
                <div className="absolute z-20 mt-1 w-full p-4 text-center border border-[var(--border-color)] rounded-lg bg-[var(--bg-card)]">
                  <AlertCircle className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2" />
                  <p className="text-sm text-[var(--text-secondary)]">No diagnoses found</p>
                  <p className="text-xs text-[var(--text-tertiary)]">Try a different search term</p>
                </div>
              )}
            </div>

            {/* Selected Diagnosis Display */}
            {selectedDiagnosis && (
              <div className="bg-[var(--icon-green-bg)] rounded-lg p-3 border border-[var(--icon-green-text)]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-[var(--text-primary)] text-sm">
                      {selectedDiagnosis.name}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                      ICD-10: {selectedDiagnosis.icdCode}
                    </div>
                    {selectedDiagnosis.morbidityGroup && (
                      <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Morbidity: {selectedDiagnosis.morbidityGroup.replace(/_/g, ' ')}
                      </div>
                    )}
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
            )}

            {/* Primary Diagnosis Toggle */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-[var(--text-primary)]">
                Primary Diagnosis
              </label>
              <button
                onClick={() => setIsPrimary(!isPrimary)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isPrimary ? 'bg-[var(--icon-cyan-text)]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPrimary ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-[var(--text-secondary)] -mt-2">
              Primary diagnosis is the main reason for this visit
            </p>

            {/* Notes */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--text-primary)]">
                Clinical Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add clinical notes, findings, or comments..."
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] text-sm resize-none"
              />
            </div>

            {/* Consultation Fee Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Consultation Fee Applied</p>
                  <p className="text-xs text-blue-600">
                    Adding a diagnosis will automatically apply the GHS 50.00 consultation fee to the patient's bill.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-[var(--border-color)] px-6 py-4 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-colors text-sm font-medium text-[var(--text-primary)]"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedDiagnosis || isSubmitting}
              className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Adding...
                </div>
              ) : (
                'Add Diagnosis'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};