// src/components/medical-entries/ProceduresSection.tsx
import React from 'react';
import { Procedure } from '../../types';
import { ProcedureEntry } from '../../types/medical-entries';
import { Scissors, Plus } from 'lucide-react';

interface ProceduresSectionProps {
  procedures: Procedure[];
  currentProcedure: ProcedureEntry;
  onProcedureChange: (procedure: ProcedureEntry) => void;
  onAddProcedure: () => void;
  procedureTemplates: any[];
  canAddEntries: boolean;
}

const ProceduresSection: React.FC<ProceduresSectionProps> = ({
  procedures,
  currentProcedure,
  onProcedureChange,
  onAddProcedure,
  procedureTemplates,
  canAddEntries
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
        <Scissors className="w-5 h-5 text-blue-600" />
        Procedures
      </h2>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Procedure</label>
            <select
              value={currentProcedure.templateId}
              onChange={(e) => {
                const template = procedureTemplates.find((t) => t._id === e.target.value);
                onProcedureChange({
                  ...currentProcedure,
                  templateId: e.target.value,
                  name: template?.name || '',
                });
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              disabled={!canAddEntries}
            >
              <option value="">Select procedure...</option>
              {procedureTemplates.map((template) => (
                <option key={template._id} value={template._id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Scheduled Date
            </label>
            <input
              type="datetime-local"
              value={currentProcedure.scheduledDate}
              onChange={(e) => onProcedureChange({ ...currentProcedure, scheduledDate: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              disabled={!canAddEntries}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
            <input
              type="text"
              placeholder="Procedure notes"
              value={currentProcedure.notes}
              onChange={(e) => onProcedureChange({ ...currentProcedure, notes: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              disabled={!canAddEntries}
            />
          </div>
        </div>
        
        {canAddEntries && (
          <button
            onClick={onAddProcedure}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg font-semibold"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Add Procedure
          </button>
        )}
        
        {/* Procedure List */}
        {procedures.length > 0 && (
          <div className="mt-4 border border-gray-300 rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Procedure
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Scheduled
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
                {procedures.map((procedure) => (
                  <tr key={procedure._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{procedure.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(procedure.scheduledDate).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                        Scheduled
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{procedure.notes}</td>
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

export default ProceduresSection;
