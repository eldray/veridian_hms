// src/components/medical-entries/modals/ProcedureModal.tsx
import React, { useState } from 'react';
import { X, Search, Scissors, CheckCircle, AlertCircle, DollarSign, Shield, Calendar } from 'lucide-react';
import { useAttendanceStore } from '../../../store/attendanceStore';
import { useToast } from '../../../store/toastStore';

interface ProcedureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  attendanceId: string | null;
  procedures: any[];
  canAdd: boolean;
  userId?: string;
}

export const ProcedureModal: React.FC<ProcedureModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  attendanceId,
  procedures,
  canAdd,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProcedure, setSelectedProcedure] = useState<any>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const { addProcedure } = useAttendanceStore();
  const { success, error } = useToast();

  // Filter procedures
  const filteredProcedures = procedures.filter(proc =>
    proc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proc.procedureCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proc.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectProcedure = (proc: any) => {
    setSelectedProcedure(proc);
    setSearchTerm(proc.name);
    setShowDropdown(false);
    // Set default scheduled date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduledDate(tomorrow.toISOString().slice(0, 16));
  };

  const clearSelection = () => {
    setSelectedProcedure(null);
    setSearchTerm('');
    setScheduledDate('');
    setNotes('');
  };

  const handleSubmit = async () => {
    if (!attendanceId) {
      error('No Attendance', 'Please select an attendance first');
      return;
    }

    if (!selectedProcedure) {
      error('No Procedure', 'Please select a procedure');
      return;
    }

    if (!scheduledDate) {
      error('Missing Date', 'Please select a scheduled date');
      return;
    }

    setIsSubmitting(true);
    try {
      await addProcedure(attendanceId, {
        serviceCatalogId: selectedProcedure.id,
        scheduledDate: scheduledDate,
        notes: notes,
      });

      success('Procedure Scheduled', `${selectedProcedure.name} has been scheduled`);
      clearSelection();
      onSuccess();
    } catch (err: any) {
      error('Schedule Failed', err.message || 'Could not schedule procedure');
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
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Scissors className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Schedule Procedure</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Select a procedure and schedule date
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
            {/* Procedure Search */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--text-primary)]">
                Search Procedure *
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowDropdown(true);
                    if (selectedProcedure) setSelectedProcedure(null);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search procedures..."
                  className="w-full pl-10 pr-3 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] text-sm"
                  disabled={!canAdd}
                />
              </div>

              {/* Dropdown */}
              {showDropdown && searchTerm && filteredProcedures.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto border border-[var(--border-color)] rounded-lg bg-[var(--bg-card)] shadow-lg">
                  {filteredProcedures.map((proc) => (
                    <button
                      key={proc.id}
                      onClick={() => handleSelectProcedure(proc)}
                      className="w-full text-left p-3 hover:bg-[var(--bg-main)] border-b border-[var(--border-color)] last:border-b-0 transition-colors"
                    >
                      <div className="font-semibold text-[var(--text-primary)] text-sm">
                        {proc.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
                        <span className="text-[var(--text-secondary)]">
                          {proc.category || 'General'}
                        </span>
                        <span className="text-[var(--text-secondary)]">
                          Duration: {proc.duration || 30} min
                        </span>
                        {proc.requiresAuthorization && (
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
            </div>

            {/* Selected Procedure Display */}
            {selectedProcedure && (
              <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-[var(--text-primary)] text-sm">
                      {selectedProcedure.name}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Category: {selectedProcedure.category || 'General'} • Duration: {selectedProcedure.duration || 30} min
                    </div>
                  </div>
                  <CheckCircle className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            )}

            {/* Scheduled Date */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--text-primary)]">
                Scheduled Date & Time *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-[var(--text-primary)] text-sm"
                  disabled={!selectedProcedure}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--text-primary)]">
                Notes / Special Instructions (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add special instructions, anesthesia notes, or other details..."
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] text-sm resize-none"
                disabled={!selectedProcedure}
              />
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
              disabled={!selectedProcedure || !scheduledDate || isSubmitting}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Scheduling...
                </div>
              ) : (
                'Schedule Procedure'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};