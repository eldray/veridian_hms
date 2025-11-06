// src/components/medical-entries/LabTestsSection.tsx
import React from 'react';
import { LabTest } from '../../types';
import { LabTestEntry } from '../../types/medical-entries';
import { FlaskConical, Plus } from 'lucide-react';

interface LabTestsSectionProps {
  labTests: LabTest[];
  currentLab: LabTestEntry;
  onLabChange: (lab: LabTestEntry) => void;
  onAddLabTest: () => void;
  labTestTemplates: any[];
  canAddEntries: boolean;
}

const LabTestsSection: React.FC<LabTestsSectionProps> = ({
  labTests,
  currentLab,
  onLabChange,
  onAddLabTest,
  labTestTemplates,
  canAddEntries
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
        <FlaskConical className="w-5 h-5 text-blue-600" />
        Lab Tests
      </h2>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Test</label>
            <select
              value={currentLab.templateId}
              onChange={(e) => {
                const template = labTestTemplates.find((t) => t._id === e.target.value);
                onLabChange({
                  ...currentLab,
                  templateId: e.target.value,
                  name: template?.name || '',
                });
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              disabled={!canAddEntries}
            >
              <option value="">Select test...</option>
              {labTestTemplates.map((template) => (
                <option key={template._id} value={template._id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
            <select
              value={currentLab.priority}
              onChange={(e) => onLabChange({ ...currentLab, priority: e.target.value as 'routine' | 'urgent' })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              disabled={!canAddEntries}
            >
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
            <input
              type="text"
              placeholder="Special instructions"
              value={currentLab.notes}
              onChange={(e) => onLabChange({ ...currentLab, notes: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              disabled={!canAddEntries}
            />
          </div>
        </div>
        
        {canAddEntries && (
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
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {labTests.map((test) => (
                  <tr key={test._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{test.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{test.priority}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
                        Requested
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{test.notes}</td>
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

export default LabTestsSection;
