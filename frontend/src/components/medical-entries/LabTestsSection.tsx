// src/components/medical-entries/LabTestsSection.tsx
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'requested': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get selected template for display
  const selectedTemplate = currentLab.templateId 
    ? labTestTemplates.find(t => t._id === currentLab.templateId)
    : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
        <FlaskConical className="w-5 h-5 text-blue-600" />
        Lab Tests
      </h2>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Searchable Lab Test Input */}
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Test *</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search lab tests..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={handleSearchFocus}
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                disabled={!canAddEntries}
              />
              {searchQuery && (
                <button
                  onClick={clearSelection}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dropdown */}
            {showDropdown && filteredTemplates.length > 0 && (
              <div 
                ref={dropdownRef}
                className="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto border border-gray-300 rounded-xl bg-white shadow-lg"
              >
                {filteredTemplates.map((template) => (
                  <button
                    key={template._id}
                    onClick={() => handleTemplateSelect(template)}
                    className="w-full text-left p-3 hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                  >
                    <div className="font-semibold text-gray-900">{template.name}</div>
                    <div className="text-sm text-gray-600">
                      {template.category} • {template.investigationCode}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">
                        {template.specimenType}
                      </span>
                      <span className="text-xs font-semibold text-blue-600">
                        ${getLabTestPrice(template).toFixed(2)}
                      </span>
                    </div>
                    {template.requiresAuthorization && (
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                          <Shield className="w-3 h-3" />
                          Authorization Required
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* No results message */}
            {showDropdown && searchQuery && filteredTemplates.length === 0 && (
              <div className="absolute z-10 w-full mt-1 border border-gray-300 rounded-xl bg-white shadow-lg">
                <div className="p-4 text-center text-gray-500">
                  No lab tests found matching "{searchQuery}"
                </div>
              </div>
            )}
          </div>

          {/* Priority Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
            <select
              value={currentLab.priority}
              onChange={(e) => onLabChange({ ...currentLab, priority: e.target.value as 'routine' | 'urgent' | 'stat' })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              disabled={!canAddEntries}
            >
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="stat">STAT</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
            <input
              type="text"
              placeholder="Special instructions"
              value={currentLab.notes || ''}
              onChange={(e) => onLabChange({ ...currentLab, notes: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              disabled={!canAddEntries}
            />
          </div>
        </div>

        {/* Selected Template Details */}
        {selectedTemplate && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
              <span className="text-sm text-gray-600">
                {selectedTemplate.category || 'N/A'}
              </span>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Specimen</label>
              <span className="text-sm text-gray-600">
                {selectedTemplate.specimenType || 'N/A'}
              </span>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Price</label>
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {getLabTestPrice(selectedTemplate).toFixed(2)} ({paymentMode})
              </span>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Authorization</label>
              <span className={`text-sm px-2 py-1 rounded-full ${
                selectedTemplate.requiresAuthorization
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {selectedTemplate.requiresAuthorization ? 'Required' : 'Not Required'}
              </span>
            </div>
            {selectedTemplate.description && (
              <div className="md:col-span-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <span className="text-sm text-gray-600">
                  {selectedTemplate.description}
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Add Button */}
        {canAddEntries && currentLab.templateId && (
          <button
            onClick={onAddLabTest}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg font-semibold"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Add Lab Test
          </button>
        )}
        
        {/* Lab Test List */}
        {labTests.length > 0 && (
          <div className="mt-4 border border-gray-300 rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Test Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {labTests.map((test) => {
                  const template = labTestTemplates.find(t => t._id === test.templateId);
                  return (
                    <tr key={test._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {test.name}
                          {template?.requiresAuthorization && (
                            <Shield className="w-4 h-4 text-orange-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{template?.category || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">{test.priority}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(test.status)}`}>
                          {test.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {paymentMode === 'cash' ? template?.cashPrice : template?.insurancePrice}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{test.notes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Authorization Warning */}
        {labTests.some(test => {
          const template = labTestTemplates.find(t => t._id === test.templateId);
          return template?.requiresAuthorization;
        }) && (
          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-orange-800">Authorization Required</p>
              <p className="text-xs text-orange-700">
                Some lab tests require insurance authorization before they can be processed.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabTestsSection;
