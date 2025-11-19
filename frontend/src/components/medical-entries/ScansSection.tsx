import React, { useState, useEffect } from 'react';
import { Scan, ScanTemplate } from '../../types';
import { ScanEntry } from '../../types/medical-entries';
import { useScanTemplateStore } from '../../store/scanTemplateStore';
import { ScanIcon, Plus, DollarSign, Shield, AlertCircle, Search, X } from 'lucide-react';

interface ScansSectionProps {
  scans: Scan[];
  currentScan: ScanEntry;
  onScanChange: (scan: ScanEntry) => void;
  onAddScan: () => void;
  scanTemplates: ScanTemplate[]; // ✅ ADDED
  canAddEntries: boolean;
  paymentMode?: 'cash' | 'nhis' | 'private_insurance';
  currentUser?: { fullName?: string; username?: string; _id?: string };
  onRemoveScan?: (scanId: string) => void; // ✅ ADDED
}

const ScansSection: React.FC<ScansSectionProps> = ({
  scans,
  currentScan,
  onScanChange,
  onAddScan,
  scanTemplates, // ✅ ADDED
  canAddEntries,
  paymentMode = 'cash',
  currentUser,
  onRemoveScan // ✅ ADDED
}) => {
  const [scanSearch, setScanSearch] = useState('');
  const [showScanDropdown, setShowScanDropdown] = useState(false);
  const [filteredScanTemplates, setFilteredScanTemplates] = useState<ScanTemplate[]>([]);

  // ✅ FIXED: Only use store for body parts and loading states
  const { 
    bodyParts, 
    getScanBodyParts,
    isLoading 
  } = useScanTemplateStore();

  useEffect(() => {
    const loadData = async () => {
      try {
        await getScanBodyParts(); // ✅ Only load body parts
      } catch (error) {
        console.error('Failed to load scan data:', error);
      }
    };
    
    loadData();
  }, [getScanBodyParts]);

  // Filter scan templates based on search
  useEffect(() => {
    if (scanSearch.trim()) {
      const filtered = scanTemplates
        .filter(template => template.isActive)
        .filter(template =>
          template.name.toLowerCase().includes(scanSearch.toLowerCase()) ||
          template.description?.toLowerCase().includes(scanSearch.toLowerCase()) ||
          template.category?.toLowerCase().includes(scanSearch.toLowerCase()) ||
          template.bodyPart?.toLowerCase().includes(scanSearch.toLowerCase()) ||
          template.scanCode?.toLowerCase().includes(scanSearch.toLowerCase())
        );
      setFilteredScanTemplates(filtered);
    } else {
      setFilteredScanTemplates([]);
    }
  }, [scanSearch, scanTemplates]);

  const getScanPrice = (template: ScanTemplate) => {
    switch (paymentMode) {
      case 'cash': return template.cashPrice || 0;
      case 'nhis': return template.nhisPrice || template.cashPrice || 0;
      case 'private_insurance': return template.insurancePrice || template.cashPrice || 0;
      default: return template.cashPrice || 0;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'requested': return 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] border-[var(--icon-yellow-bg)]';
      case 'in_progress': return 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border-[var(--icon-cyan-bg)]';
      case 'completed': return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border-[var(--icon-green-bg)]';
      case 'cancelled': return 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border-[var(--icon-red-bg)]';
      default: return 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]';
    }
  };

  // ✅ FIXED: Include templateId when selecting template
  const handleScanSelect = (template: ScanTemplate) => {
    onScanChange({
      ...currentScan,
      templateId: template.id || template._id, // ✅ ADDED
      scanType: template.name,
      description: template.description || '',
      bodyPart: template.bodyPart || '',
      status: 'requested'
    });
    setScanSearch(template.name);
    setShowScanDropdown(false);
  };

  const clearScanSelection = () => {
    onScanChange({
      ...currentScan,
      templateId: '', // ✅ ADDED
      scanType: '',
      description: '',
      bodyPart: ''
    });
    setScanSearch('');
  };

  const selectedTemplate = scanTemplates.find(t => 
    t.id === currentScan.templateId || t._id === currentScan.templateId || t.name === currentScan.scanType
  );

  // ✅ FIXED: Handle scan removal
  const handleRemoveScan = (scanId: string) => {
    if (onRemoveScan) {
      onRemoveScan(scanId);
    } else {
      console.warn('onRemoveScan callback not provided');
    }
  };

  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-6 shadow-sm border border-[var(--border-color)]">
      <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
        <ScanIcon className="w-5 h-5 text-[var(--icon-cyan-text)]" />
        Scans & Imaging
      </h2>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Scan Type - Using search input with dropdown */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
              Search Scan Type
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              <input
                type="text"
                placeholder="Search scans..."
                value={scanSearch}
                onChange={(e) => {
                  setScanSearch(e.target.value);
                  setShowScanDropdown(true);
                }}
                onFocus={() => setShowScanDropdown(true)}
                className="w-full pl-9 pr-8 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent transition-all text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
                disabled={!canAddEntries || isLoading}
              />
              {scanSearch && (
                <button
                  onClick={clearScanSelection}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Scan Search Results */}
            {showScanDropdown && scanSearch && (
              <div className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto border border-[var(--border-color)] rounded-lg bg-[var(--bg-card)] shadow-lg">
                {filteredScanTemplates.length > 0 ? (
                  filteredScanTemplates.map((template) => (
                    <button
                      key={template.id || template._id} // ✅ FIXED: Consistent ID
                      onClick={() => handleScanSelect(template)}
                      className="w-full text-left p-2 hover:bg-[var(--bg-main)] border-b border-[var(--border-color)] last:border-b-0 transition-colors text-sm"
                    >
                      <div className="font-semibold text-[var(--text-primary)]">{template.name}</div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        {template.category} • {template.bodyPart}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs">
                        <span className={`px-1.5 py-0.5 rounded ${
                          template.requiresAuthorization
                            ? 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]'
                            : 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]'
                        }`}>
                          {template.requiresAuthorization ? 'Auth Req' : 'No Auth'}
                        </span>
                        <span className="flex items-center gap-0.5 text-[var(--text-secondary)]">
                          <DollarSign className="w-2.5 h-2.5" />
                          {getScanPrice(template).toFixed(2)}
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-[var(--text-secondary)] text-center text-sm">
                    No scans found
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Description - Auto-populated but editable */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Description</label>
            <input
              type="text"
              placeholder="Scan description"
              value={currentScan.description}
              onChange={(e) => onScanChange({ ...currentScan, description: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent transition-all text-sm text-[var(--text-primary)]"
              disabled={!canAddEntries}
            />
          </div>
          
          {/* Body Part - Using dropdown with data from backend */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Body Part</label>
            <select
              value={currentScan.bodyPart}
              onChange={(e) => onScanChange({ ...currentScan, bodyPart: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent transition-all text-sm text-[var(--text-primary)]"
              disabled={!canAddEntries}
            >
              <option value="">Select Body Part</option>
              {bodyParts.map((bodyPart) => (
                <option key={bodyPart} value={bodyPart}>
                  {bodyPart}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Priority</label>
            <select
              value={currentScan.priority}
              onChange={(e) => onScanChange({ ...currentScan, priority: e.target.value as 'routine' | 'urgent' })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent transition-all text-sm text-[var(--text-primary)]"
              disabled={!canAddEntries}
            >
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
        
        {/* Additional scan details that can be auto-populated */}
        {currentScan.scanType && selectedTemplate && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-[var(--icon-cyan-bg)] rounded-lg border border-[var(--icon-cyan-text)]">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-0.5">Category</label>
              <span className="text-xs text-[var(--text-primary)]">
                {selectedTemplate.category || 'N/A'}
              </span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-0.5">Duration</label>
              <span className="text-xs text-[var(--text-primary)]">
                {selectedTemplate.duration || 'N/A'} min
              </span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-0.5">Price</label>
              <span className="text-xs text-[var(--text-primary)] flex items-center gap-0.5">
                <DollarSign className="w-2.5 h-2.5" />
                {getScanPrice(selectedTemplate).toFixed(2)}
              </span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-0.5">Auth</label>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                selectedTemplate.requiresAuthorization
                  ? 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]'
                  : 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]'
              }`}>
                {selectedTemplate.requiresAuthorization ? 'Required' : 'Not Required'}
              </span>
            </div>
            {selectedTemplate.contrastRequired && (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-0.5">Contrast</label>
                <span className="text-xs text-[var(--text-primary)] bg-[var(--icon-yellow-bg)] px-1.5 py-0.5 rounded">
                  Contrast Required
                </span>
              </div>
            )}
          </div>
        )}
        
        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Notes</label>
          <textarea
            placeholder="Special instructions, clinical indications..."
            value={currentScan.notes || ''}
            onChange={(e) => onScanChange({ ...currentScan, notes: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent transition-all resize-none text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
            disabled={!canAddEntries}
          />
        </div>
        
        {canAddEntries && currentScan.scanType && currentScan.description && (
          <button
            onClick={onAddScan}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Scan
          </button>
        )}
        
        {/* Scan List */}
        {scans.length > 0 && (
          <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
            <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
              <h4 className="font-semibold text-[var(--text-primary)]">Requested Scans</h4>
            </div>
            <div className="divide-y divide-[var(--border-color)]">
              {scans.map((scan) => {
                const template = scanTemplates.find(t => 
                  t.id === scan.templateId || t._id === scan.templateId || t.name === scan.scanType
                );
                return (
                  <div key={scan.id || scan._id} className="p-4 hover:bg-[var(--bg-main)] transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-[var(--text-primary)]">{scan.scanType}</span>
                          {template?.requiresAuthorization && (
                            <Shield className="w-3.5 h-3.5 text-[var(--icon-orange-text)]" />
                          )}
                        </div>
                        <div className="text-sm text-[var(--text-secondary)] space-y-0.5">
                          <div>Body Part: {scan.bodyPart} • Priority: {scan.priority}</div>
                          <div>Status: <span className={`px-1.5 py-0.5 text-xs font-semibold rounded border ${getStatusColor(scan.status)}`}>
                            {scan.status.replace('_', ' ')}
                          </span></div>
                          {scan.notes && (
                            <div>Notes: {scan.notes}</div>
                          )}
                        </div>
                      </div>
                      {canAddEntries && onRemoveScan && (
                        <button
                          onClick={() => handleRemoveScan(scan.id || scan._id)}
                          className="text-[var(--icon-red-text)] hover:text-[var(--icon-red-text)] ml-4 px-2 py-1 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Authorization Warning */}
        {scans.some(scan => {
          const template = scanTemplates.find(t => 
            t.id === scan.templateId || t._id === scan.templateId || t.name === scan.scanType
          );
          return template?.requiresAuthorization;
        }) && (
          <div className="p-3 bg-[var(--icon-orange-bg)] border border-[var(--icon-orange-text)] rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[var(--icon-orange-text)] flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[var(--icon-orange-text)]">Authorization Required</p>
              <p className="text-xs text-[var(--icon-orange-text)]">
                Some scans require insurance authorization.
              </p>
            </div>
          </div>
        )}

        {/* No scans found message */}
        {scans.length === 0 && !isLoading && (
          <div className="text-center py-6 text-[var(--text-secondary)]">
            <ScanIcon className="w-10 h-10 mx-auto mb-3 text-[var(--text-tertiary)]" />
            <p className="text-sm">No scans added yet</p>
            <p className="text-xs">Use the search above to add imaging studies</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScansSection;