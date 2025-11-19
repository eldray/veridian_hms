import React, { useState, useRef, useEffect } from 'react';
import { LabTest, LabTestTemplate } from '../../types';
import { LabTestEntry } from '../../types/medical-entries';
import { FlaskConical, Plus, DollarSign, Shield, AlertCircle, Search, X } from 'lucide-react';

interface LabTestsSectionProps {
  labTests: LabTest[];
  currentLab: LabTestEntry;
  onLabChange: (lab: LabTestEntry) => void;
  onAddLabTest: () => void;
  labTestTemplates: LabTestTemplate[];
  canAddEntries: boolean;
  paymentMode?: 'cash' | 'nhis' | 'private_insurance';
  currentUser?: { fullName?: string; username?: string; _id?: string };
}

const LabTestsSection: React.FC<LabTestsSectionProps> = ({
  labTests,
  currentLab,
  onLabChange,
  onAddLabTest,
  labTestTemplates,
  canAddEntries,
  paymentMode = 'cash',
  currentUser
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredTemplates, setFilteredTemplates] = useState<LabTestTemplate[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter templates based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTemplates(labTestTemplates.filter(template => template.isActive));
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = labTestTemplates.filter(template => 
        template.isActive && (
          template.name?.toLowerCase().includes(query) ||
          template.category?.toLowerCase().includes(query) ||
          template.investigationCode?.toLowerCase().includes(query) ||
          template.description?.toLowerCase().includes(query)
        )
      );
      setFilteredTemplates(filtered);
    }
  }, [searchQuery, labTestTemplates]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getLabTestPrice = (template: LabTestTemplate) => {
    return paymentMode === 'cash' ? template.cashPrice : template.insurancePrice;
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

  const handleTemplateSelect = (template: LabTestTemplate) => {
    onLabChange({
      ...currentLab,
      templateId: template._id,
      name: template.name,
      status: 'requested'
    });
    setSearchQuery(template.name);
    setShowDropdown(false);
  };

  const clearSelection = () => {
    onLabChange({
      ...currentLab,
      templateId: '',
      name: ''
    });
    setSearchQuery('');
    setShowDropdown(false);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setShowDropdown(true);
  };

  const handleSearchFocus = () => {
    setShowDropdown(true);
  };

  // Get selected template for display
  const selectedTemplate = currentLab.templateId 
    ? labTestTemplates.find(t => t._id === currentLab.templateId)
    : null;

  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-6 shadow-sm border border-[var(--border-color)]">
      <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
        <FlaskConical className="w-5 h-5 text-[var(--icon-cyan-text)]" />
        Lab Tests
      </h2>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Searchable Lab Test Input */}
          <div className="relative">
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Test *</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search lab tests..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={handleSearchFocus}
                className="w-full pl-9 pr-8 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent transition-all text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
                disabled={!canAddEntries}
              />
              {searchQuery && (
                <button
                  onClick={clearSelection}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown */}
            {showDropdown && filteredTemplates.length > 0 && (
              <div 
                ref={dropdownRef}
                className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto border border-[var(--border-color)] rounded-lg bg-[var(--bg-card)] shadow-lg"
              >
                {filteredTemplates.map((template) => (
                  <button
                    key={template._id}
                    onClick={() => handleTemplateSelect(template)}
                    className="w-full text-left p-2 hover:bg-[var(--bg-main)] border-b border-[var(--border-color)] last:border-b-0 transition-colors text-sm"
                  >
                    <div className="font-semibold text-[var(--text-primary)]">{template.name}</div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      {template.category} • {template.investigationCode}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-[var(--text-secondary)]">
                        {template.specimenType}
                      </span>
                      <span className="text-xs font-semibold text-[var(--icon-cyan-text)]">
                        ${getLabTestPrice(template).toFixed(2)}
                      </span>
                    </div>
                    {template.requiresAuthorization && (
                      <div className="mt-0.5">
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)] rounded">
                          <Shield className="w-2.5 h-2.5" />
                          Auth Required
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* No results message */}
            {showDropdown && searchQuery && filteredTemplates.length === 0 && (
              <div className="absolute z-10 w-full mt-1 border border-[var(--border-color)] rounded-lg bg-[var(--bg-card)] shadow-lg">
                <div className="p-3 text-center text-[var(--text-secondary)] text-sm">
                  No lab tests found
                </div>
              </div>
            )}
          </div>

          {/* Priority Selection */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Priority</label>
            <select
              value={currentLab.priority}
              onChange={(e) => onLabChange({ ...currentLab, priority: e.target.value as 'routine' | 'urgent' | 'stat' })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent transition-all text-sm text-[var(--text-primary)]"
              disabled={!canAddEntries}
            >
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="stat">STAT</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Notes</label>
            <input
              type="text"
              placeholder="Special instructions"
              value={currentLab.notes || ''}
              onChange={(e) => onLabChange({ ...currentLab, notes: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent transition-all text-sm text-[var(--text-primary)]"
              disabled={!canAddEntries}
            />
          </div>
        </div>

        {/* Selected Template Details */}
        {selectedTemplate && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-[var(--icon-cyan-bg)] rounded-lg border border-[var(--icon-cyan-text)]">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-0.5">Category</label>
              <span className="text-xs text-[var(--text-primary)]">
                {selectedTemplate.category || 'N/A'}
              </span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-0.5">Specimen</label>
              <span className="text-xs text-[var(--text-primary)]">
                {selectedTemplate.specimenType || 'N/A'}
              </span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-0.5">Price</label>
              <span className="text-xs text-[var(--text-primary)] flex items-center gap-0.5">
                <DollarSign className="w-2.5 h-2.5" />
                {getLabTestPrice(selectedTemplate).toFixed(2)} ({paymentMode})
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
          </div>
        )}
        
        {/* Add Button */}
        {canAddEntries && currentLab.templateId && (
          <button
            onClick={onAddLabTest}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Lab Test
          </button>
        )}
        
        {/* Lab Test List */}
        {labTests.length > 0 && (
          <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
            <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
              <h4 className="font-semibold text-[var(--text-primary)]">Requested Lab Tests</h4>
            </div>
            <div className="divide-y divide-[var(--border-color)]">
              {labTests.map((test) => {
                const template = labTestTemplates.find(t => t._id === test.templateId);
                return (
                  <div key={test._id} className="p-4 hover:bg-[var(--bg-main)] transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-[var(--text-primary)]">{test.name}</span>
                          {template?.requiresAuthorization && (
                            <Shield className="w-3.5 h-3.5 text-[var(--icon-orange-text)]" />
                          )}
                        </div>
                        <div className="text-sm text-[var(--text-secondary)] space-y-0.5">
                          <div>Category: {template?.category || 'N/A'} • Priority: {test.priority}</div>
                          <div>Status: <span className={`px-1.5 py-0.5 text-xs font-semibold rounded border ${getStatusColor(test.status)}`}>
                            {test.status.replace('_', ' ')}
                          </span></div>
                          {test.notes && (
                            <div>Notes: {test.notes}</div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const updatedTests = labTests.filter(t => t._id !== test._id);
                          // You'll need to pass a setLabTests function to update the parent state
                        }}
                        className="text-[var(--icon-red-text)] hover:text-[var(--icon-red-text)] ml-4"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Authorization Warning */}
        {labTests.some(test => {
          const template = labTestTemplates.find(t => t._id === test.templateId);
          return template?.requiresAuthorization;
        }) && (
          <div className="p-3 bg-[var(--icon-orange-bg)] border border-[var(--icon-orange-text)] rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[var(--icon-orange-text)] flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[var(--icon-orange-text)]">Authorization Required</p>
              <p className="text-xs text-[var(--icon-orange-text)]">
                Some lab tests require insurance authorization.
              </p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {labTests.length === 0 && (
          <div className="text-center py-6 text-[var(--text-secondary)]">
            <FlaskConical className="w-10 h-10 mx-auto mb-3 text-[var(--text-tertiary)]" />
            <p className="text-sm">No lab tests added yet</p>
            <p className="text-xs">Use the search above to add lab tests</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabTestsSection;