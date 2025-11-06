// src/components/medical-entries/ScansSection.tsx
import React, { useEffect } from 'react';
import { Scan } from '../../types';
import { ScanEntry } from '../../types/medical-entries';
import { useScanTemplateStore } from '../../store/scanTemplateStore';
import { ScanIcon, Plus } from 'lucide-react';

interface ScansSectionProps {
  scans: Scan[];
  currentScan: ScanEntry;
  onScanChange: (scan: ScanEntry) => void;
  onAddScan: () => void;
  canAddEntries: boolean;
}

const ScansSection: React.FC<ScansSectionProps> = ({
  scans,
  currentScan,
  onScanChange,
  onAddScan,
  canAddEntries
}) => {
  const { 
    scanTemplates, 
    bodyParts, 
    getScanTemplates, 
    getScanBodyParts,
    isLoading 
  } = useScanTemplateStore();

  useEffect(() => {
    // Load scan templates and body parts on component mount
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

  // Auto-populate description when scan type is selected
  useEffect(() => {
    if (currentScan.scanType) {
      const selectedTemplate = scanTemplates.find(t => t.name === currentScan.scanType);
      if (selectedTemplate && !currentScan.description) {
        onScanChange({
          ...currentScan,
          description: selectedTemplate.description,
          bodyPart: selectedTemplate.bodyPart
        });
      }
    }
  }, [currentScan.scanType, scanTemplates]);

  const selectedTemplate = scanTemplates.find(t => t.name === currentScan.scanType);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
        <ScanIcon className="w-5 h-5 text-blue-600" />
        Scans & Imaging
      </h2>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Scan Type - Using dropdown with data from backend */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Scan Type</label>
            <select
              value={currentScan.scanType}
              onChange={(e) => onScanChange({ ...currentScan, scanType: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              disabled={!canAddEntries}
            >
              <option value="">Select Scan Type</option>
              {scanTemplates
                .filter(template => template.isActive)
                .map((template) => (
                  <option key={template._id} value={template.name}>
                    {template.name}
                  </option>
                ))
              }
            </select>
          </div>
          
          {/* Description - Auto-populated based on selected scan type */}
          <div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
              <span className="text-sm text-gray-600">
                {selectedTemplate.category || 'N/A'}
              </span>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Duration</label>
              <span className="text-sm text-gray-600">
                {selectedTemplate.duration || 'N/A'} minutes
              </span>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Contrast</label>
              <span className="text-sm text-gray-600">
                {selectedTemplate.contrastRequired ? 'Required' : 'Not Required'}
              </span>
            </div>
            {selectedTemplate.preparationInstructions && (
              <div className="md:col-span-3">
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
          <input
            type="text"
            placeholder="Special instructions"
            value={currentScan.notes}
            onChange={(e) => onScanChange({ ...currentScan, notes: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            disabled={!canAddEntries}
          />
        </div>
        
        {canAddEntries && (
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {scans.map((scan) => (
                  <tr key={scan._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{scan.scanType}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{scan.description}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{scan.bodyPart}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {scanTemplates.find(t => t.name === scan.scanType)?.category || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{scan.priority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScansSection;
