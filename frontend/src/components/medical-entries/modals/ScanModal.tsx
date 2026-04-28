// src/components/medical-entries/modals/ScanModal.tsx
import React, { useState } from 'react';
import { X, Search, Scan, CheckCircle, AlertCircle, DollarSign, Shield, Clock } from 'lucide-react';
import { useAttendanceStore } from '../../../store/attendanceStore';
import { useToast } from '../../../store/toastStore';

interface ScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  attendanceId: string | null;
  scans: any[];
  canAdd: boolean;
  userId?: string;
}

export const ScanModal: React.FC<ScanModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  attendanceId,
  scans,
  canAdd,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScan, setSelectedScan] = useState<any>(null);
  const [priority, setPriority] = useState<'routine' | 'urgent'>('routine');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const { addScan } = useAttendanceStore();
  const { success, error } = useToast();

  // Filter scans
  const filteredScans = scans.filter(scan =>
    scan.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    scan.scanCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    scan.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectScan = (scan: any) => {
    setSelectedScan(scan);
    setSearchTerm(scan.name);
    setShowDropdown(false);
  };

  const clearSelection = () => {
    setSelectedScan(null);
    setSearchTerm('');
    setPriority('routine');
    setNotes('');
  };

  const handleSubmit = async () => {
    if (!attendanceId) {
      error('No Attendance', 'Please select an attendance first');
      return;
    }

    if (!selectedScan) {
      error('No Scan', 'Please select a scan');
      return;
    }

    setIsSubmitting(true);
    try {
      await addScan(attendanceId, {
        serviceCatalogId: selectedScan.id,
        priority: priority,
        notes: notes,
      });

      success('Scan Ordered', `${selectedScan.name} has been ordered`);
      clearSelection();
      onSuccess();
    } catch (err: any) {
      error('Order Failed', err.message || 'Could not order scan');
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
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Scan className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Order Scan</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Select an imaging study
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
            {/* Scan Search */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--text-primary)]">
                Search Scan *
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowDropdown(true);
                    if (selectedScan) setSelectedScan(null);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search scans (X-ray, CT, MRI, Ultrasound)..."
                  className="w-full pl-10 pr-3 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] text-sm"
                  disabled={!canAdd}
                />
              </div>

              {/* Dropdown */}
              {showDropdown && searchTerm && filteredScans.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto border border-[var(--border-color)] rounded-lg bg-[var(--bg-card)] shadow-lg">
                  {filteredScans.map((scan) => (
                    <button
                      key={scan.id}
                      onClick={() => handleSelectScan(scan)}
                      className="w-full text-left p-3 hover:bg-[var(--bg-main)] border-b border-[var(--border-color)] last:border-b-0 transition-colors"
                    >
                      <div className="font-semibold text-[var(--text-primary)] text-sm">
                        {scan.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
                        <span className="text-[var(--text-secondary)]">
                          {scan.category || 'General'}
                        </span>
                        <span className="text-[var(--text-secondary)]">
                          Body Part: {scan.bodyPart || 'N/A'}
                        </span>
                        <span className="text-[var(--text-secondary)]">
                          Duration: {scan.duration || 30} min
                        </span>
                        {scan.contrastRequired && (
                          <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                            Contrast
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Scan Display */}
            {selectedScan && (
              <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-[var(--text-primary)] text-sm">
                      {selectedScan.name}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Category: {selectedScan.category || 'General'} • Body Part: {selectedScan.bodyPart || 'N/A'}
                    </div>
                    {selectedScan.preparationInstructions && (
                      <div className="text-xs text-[var(--text-secondary)] mt-1">
                        Prep: {selectedScan.preparationInstructions}
                      </div>
                    )}
                  </div>
                  <CheckCircle className="w-5 h-5 text-red-600" />
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
                      ? 'bg-red-100 text-red-700 border border-red-300'
                      : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:bg-[var(--border-color)]'
                  }`}
                >
                  Urgent
                </button>
              </div>
            </div>

            {/* Clinical Notes */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--text-primary)]">
                Clinical Notes / Indications (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add clinical indications, suspected findings, or special instructions..."
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] text-sm resize-none"
                disabled={!selectedScan}
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
              disabled={!selectedScan || isSubmitting}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Ordering...
                </div>
              ) : (
                'Order Scan'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};