// src/components/medical-entries/ScansSection.tsx - UPDATED WITH SEARCH INPUT
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
  canAddEntries: boolean;
  paymentMode?: 'cash' | 'nhis' | 'private_insurance';
  currentUser?: { fullName?: string; username?: string; _id?: string };
}

const ScansSection: React.FC<ScansSectionProps> = ({
  scans,
  currentScan,
  onScanChange,
  onAddScan,
  canAddEntries,
  paymentMode = 'cash',
  currentUser
}) => {
  const [scanSearch, setScanSearch] = useState('');
  const [showScanDropdown, setShowScanDropdown] = useState(false);
  const [filteredScanTemplates, setFilteredScanTemplates] = useState<ScanTemplate[]>([]);

  const { 
    scanTemplates, 
    bodyParts, 
    getScanTemplates, 
    getScanBodyParts,
    isLoading 
  } = useScanTemplateStore();

  useEffect(() => {
    const loadData = async () => {
      try {
        await getScanTemplates();
        await getScanBodyParts();
      } catch (error) {
        console.error('Failed to load scan data:', error);
      }
    };
    
    loadData();
  }, [getScanTemplates, getScanBodyParts]);

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
    return paymentMode === 'cash' ? template.cashPrice : template.insurancePrice;
  };

  const handleScanSelect = (template: ScanTemplate) => {
    onScanChange({
      ...currentScan,
      scanType: template.name,
      description: template.description,
      bodyPart: template.bodyPart,
      status: 'requested'
    });
    setScanSearch(template.name);
    setShowScanDropdown(false);
  };

  const clearScanSelection = () => {
    onScanChange({
      ...currentScan,
      scanType: '',
      description: '',
      bodyPart: ''
    });
    setScanSearch('');
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

  const selectedTemplate = scanTemplates.find(t => t.name === currentScan.scanType);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
        <ScanIcon className="w-5 h-5 text-blue-600" />
        Scans & Imaging
      </h2>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Scan Type - Using search input with dropdown */}
          <div className="md:col-span-2 lg:col-span-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Search Scan Type
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by scan name, description, category, or body part..."
                value={scanSearch}
                onChange={(e) => {
                  setScanSearch(e.target.value);
                  setShowScanDropdown(true);
                }}
                onFocus={() => setShowScanDropdown(true)}
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                disabled={!canAddEntries || isLoading}
              />
              {scanSearch && (
                <button
                  onClick={clearScanSelection}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Scan Search Results */}
            {showScanDropdown && scanSearch && (
              <div className="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto border border-gray-300 rounded-xl bg-white shadow-lg">
                {filteredScanTemplates.length > 0 ? (
                  filteredScanTemplates.map((template) => (
                    <button
                      key={template._id}
                      onClick={() => handleScanSelect(template)}
                      className="w-full text-left p-3 hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                    >
                      <div className="font-semibold text-gray-900">{template.name}</div>
                      <div className="text-sm text-gray-600">
                        {template.description}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs">
                        <span className="text-gray-500">Category: {template.category}</span>
                        <span className="text-gray-500">Body Part: {template.bodyPart}</span>
                        <span className="text-gray-500">Duration: {template.duration}min</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs">
                        <span className={`px-2 py-1 rounded-full ${
                          template.requiresAuthorization
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {template.requiresAuthorization ? 'Auth Required' : 'No Auth'}
                        </span>
                        <span className="flex items-center gap-1 text-gray-600">
                          <DollarSign className="w-3 h-3" />
                          {getScanPrice(template).toFixed(2)} ({paymentMode})
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-gray-500 text-center">
                    No scans found matching "{scanSearch}"
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Description - Auto-populated but editable */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
            <input
              type="text"
              placeholder="Scan description"
              value={currentScan.description}
              onChange={(e) => onScanChange({ ...currentScan, description: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              disabled={!canAddEntries}
            />
          </div>
          
          {/* Body Part - Using dropdown with data from backend */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Body Part</label>
            <select
              value={currentScan.bodyPart}
              onChange={(e) => onScanChange({ ...currentScan, bodyPart: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
            <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
            <select
              value={currentScan.priority}
              onChange={(e) => onScanChange({ ...currentScan, priority: e.target.value as 'routine' | 'urgent' })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              disabled={!canAddEntries}
            >
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
        
        {/* Additional scan details that can be auto-populated */}
        {currentScan.scanType && selectedTemplate && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
              <span className="text-sm text-gray-600">
                {selectedTemplate.category || 'N/A'}
              </span>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Scan Code</label>
              <span className="text-sm text-gray-600 font-mono">
                {selectedTemplate.scanCode || 'N/A'}
              </span>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Duration</label>
              <span className="text-sm text-gray-600">
                {selectedTemplate.duration || 'N/A'} minutes
              </span>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Price</label>
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {getScanPrice(selectedTemplate).toFixed(2)}
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
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Scan Type</label>
              <span className="text-sm text-gray-600">
                {selectedTemplate.scanType || 'N/A'}
              </span>
            </div>
            {selectedTemplate.contrastRequired && (
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Contrast</label>
                <span className="text-sm text-gray-600 bg-yellow-100 px-2 py-1 rounded-full">
                  Contrast Required
                </span>
              </div>
            )}
            {selectedTemplate.preparationInstructions && (
              <div className="md:col-span-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Preparation Instructions</label>
                <span className="text-sm text-gray-600">
                  {selectedTemplate.preparationInstructions}
                </span>
              </div>
            )}
          </div>
        )}
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
          <textarea
            placeholder="Special instructions, clinical indications, or specific areas of interest..."
            value={currentScan.notes || ''}
            onChange={(e) => onScanChange({ ...currentScan, notes: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
            disabled={!canAddEntries}
          />
        </div>
        
        {canAddEntries && currentScan.scanType && currentScan.description && (
          <button
            onClick={onAddScan}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg font-semibold"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Add Scan
          </button>
        )}
        
        {/* Scan List */}
        {scans.length > 0 && (
          <div className="mt-4 border border-gray-300 rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Scan Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Body Part
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {scans.map((scan) => {
                  const template = scanTemplates.find(t => t.name === scan.scanType);
                  return (
                    <tr key={scan._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {scan.scanType}
                          {template?.requiresAuthorization && (
                            <Shield className="w-4 h-4 text-orange-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{scan.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{scan.bodyPart}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {template?.category || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">{scan.priority}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(scan.status)}`}>
                          {scan.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {paymentMode === 'cash' ? template?.cashPrice : template?.insurancePrice}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Authorization Warning */}
        {scans.some(scan => {
          const template = scanTemplates.find(t => t.name === scan.scanType);
          return template?.requiresAuthorization;
        }) && (
          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-orange-800">Authorization Required</p>
              <p className="text-xs text-orange-700">
                Some scans require insurance authorization before they can be performed.
              </p>
            </div>
          </div>
        )}

        {/* No scans found message */}
        {scans.length === 0 && !isLoading && (
          <div className="text-center py-8 text-gray-500">
            <ScanIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg">No scans added yet</p>
            <p className="text-sm">Use the search above to add imaging studies</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScansSection;
