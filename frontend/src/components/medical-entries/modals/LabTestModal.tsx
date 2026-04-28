// src/components/medical-entries/modals/LabTestModal.tsx
import React, { useState } from 'react';
import { X, Search, FlaskConical, CheckCircle, AlertCircle, DollarSign, Shield, Clock } from 'lucide-react';
import { useAttendanceStore } from '../../../store/attendanceStore';
import { useToast } from '../../../store/toastStore';

interface LabTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  attendanceId: string | null;
  labTests: any[];
  canAdd: boolean;
  userId?: string;
}

export const LabTestModal: React.FC<LabTestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  attendanceId,
  labTests,
  canAdd,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [priority, setPriority] = useState<'routine' | 'urgent' | 'stat'>('routine');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const { addLabTest } = useAttendanceStore();
  const { success, error } = useToast();

  // Filter lab tests based on search (using ServiceCatalog items)
  const filteredTests = labTests.filter(test =>
    test.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    test.investigationCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    test.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectTest = (test: any) => {
    setSelectedTest(test);
    setSearchTerm(test.name);
    setShowDropdown(false);
  };

  const clearSelection = () => {
    setSelectedTest(null);
    setSearchTerm('');
    setPriority('routine');
    setNotes('');
  };

  const handleSubmit = async () => {
    if (!attendanceId) {
      error('No Attendance', 'Please select an attendance first');
      return;
    }

    if (!selectedTest) {
      error('No Lab Test', 'Please select a lab test');
      return;
    }

    setIsSubmitting(true);
    try {
      await addLabTest(attendanceId, {
        serviceCatalogId: selectedTest.id,
        priority: priority,
        notes: notes,
      });

      success('Lab Test Added', `${selectedTest.name} has been requested`);
      clearSelection();
      onSuccess();
    } catch (err: any) {
      error('Add Failed', err.message || 'Could not add lab test');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get price based on payment mode (from component props or context)
  const getTestPrice = (test: any) => {
    // Price would come from ServicePricing via test.pricing
    if (test.pricing) {
      return test.pricing.cashPrice || 0;
    }
    return test.cashPrice || 0;
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
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Request Lab Test</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Select a laboratory investigation
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
            {/* Lab Test Search */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--text-primary)]">
                Select Lab Test *
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowDropdown(true);
                    if (selectedTest) setSelectedTest(null);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search lab tests..."
                  className="w-full pl-10 pr-3 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] text-sm"
                  disabled={!canAdd}
                />
              </div>

              {/* Dropdown */}
              {showDropdown && searchTerm && filteredTests.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto border border-[var(--border-color)] rounded-lg bg-[var(--bg-card)] shadow-lg">
                  {filteredTests.map((test) => (
                    <button
                      key={test.id}
                      onClick={() => handleSelectTest(test)}
                      className="w-full text-left p-3 hover:bg-[var(--bg-main)] border-b border-[var(--border-color)] last:border-b-0 transition-colors"
                    >
                      <div className="font-semibold text-[var(--text-primary)] text-sm">
                        {test.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
                        <span className="text-[var(--text-secondary)]">
                          {test.category || 'General'}
                        </span>
                        <span className="text-[var(--text-secondary)]">
                          Specimen: {test.specimenType || 'N/A'}
                        </span>
                        {test.requiresAuthorization && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)] rounded">
                            <Shield className="w-3 h-3" />
                            Auth Required
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--icon-cyan-text)] mt-1">
                        GHS {getTestPrice(test).toFixed(2)}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showDropdown && searchTerm && filteredTests.length === 0 && (
                <div className="absolute z-20 mt-1 w-full p-4 text-center border border-[var(--border-color)] rounded-lg bg-[var(--bg-card)]">
                  <AlertCircle className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2" />
                  <p className="text-sm text-[var(--text-secondary)]">No lab tests found</p>
                </div>
              )}
            </div>

            {/* Selected Test Display */}
            {selectedTest && (
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-[var(--text-primary)] text-sm">
                      {selectedTest.name}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Category: {selectedTest.category || 'General'} • Specimen: {selectedTest.specimenType || 'N/A'}
                    </div>
                    <div className="text-xs text-[var(--icon-cyan-text)] mt-1 font-medium">
                      GHS {getTestPrice(selectedTest).toFixed(2)}
                    </div>
                  </div>
                  <CheckCircle className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            )}

            {/* Priority Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--text-primary)]">
                Priority
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPriority('routine')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    priority === 'routine'
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:bg-[var(--border-color)]'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 inline mr-1" />
                  Routine
                </button>
                <button
                  onClick={() => setPriority('urgent')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    priority === 'urgent'
                      ? 'bg-orange-100 text-orange-700 border border-orange-300'
                      : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:bg-[var(--border-color)]'
                  }`}
                >
                  Urgent
                </button>
                <button
                  onClick={() => setPriority('stat')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    priority === 'stat'
                      ? 'bg-red-100 text-red-700 border border-red-300'
                      : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:bg-[var(--border-color)]'
                  }`}
                >
                  STAT
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--text-primary)]">
                Clinical Notes / Indications (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add clinical indications, suspected diagnosis, or special instructions..."
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] text-sm resize-none"
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
              disabled={!selectedTest || isSubmitting}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Requesting...
                </div>
              ) : (
                'Request Lab Test'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};