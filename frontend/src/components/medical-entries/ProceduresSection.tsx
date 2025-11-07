// src/components/medical-entries/ProceduresSection.tsx - UPDATED WITH SEARCH AND AUTO-DATE
import React, { useState, useEffect } from 'react';
import { Procedure, ProcedureTemplate } from '../../types';
import { ProcedureEntry } from '../../types/medical-entries';
import { Scissors, Plus, DollarSign, Shield, AlertCircle, Search, X, Calendar } from 'lucide-react';

interface ProceduresSectionProps {
  procedures: Procedure[];
  currentProcedure: ProcedureEntry;
  onProcedureChange: (procedure: ProcedureEntry) => void;
  onAddProcedure: () => void;
  procedureTemplates: ProcedureTemplate[];
  canAddEntries: boolean;
  paymentMode?: 'cash' | 'nhis' | 'private_insurance';
  currentUser?: { fullName?: string; username?: string; _id?: string };
}

const ProceduresSection: React.FC<ProceduresSectionProps> = ({
  procedures,
  currentProcedure,
  onProcedureChange,
  onAddProcedure,
  procedureTemplates,
  canAddEntries,
  paymentMode = 'cash',
  currentUser
}) => {
  const [procedureSearch, setProcedureSearch] = useState('');
  const [showProcedureDropdown, setShowProcedureDropdown] = useState(false);
  const [filteredProcedureTemplates, setFilteredProcedureTemplates] = useState<ProcedureTemplate[]>([]);

  // Filter procedure templates based on search
  useEffect(() => {
    if (procedureSearch.trim()) {
      const filtered = procedureTemplates
        .filter(template => template.isActive)
        .filter(template =>
          template.name.toLowerCase().includes(procedureSearch.toLowerCase()) ||
          template.description?.toLowerCase().includes(procedureSearch.toLowerCase()) ||
          template.category?.toLowerCase().includes(procedureSearch.toLowerCase()) ||
          template.procedureCode?.toLowerCase().includes(procedureSearch.toLowerCase()) ||
          template.department?.toLowerCase().includes(procedureSearch.toLowerCase())
        );
      setFilteredProcedureTemplates(filtered);
    } else {
      setFilteredProcedureTemplates([]);
    }
  }, [procedureSearch, procedureTemplates]);

  // Set default scheduled date to current date and time when component mounts or when procedure is selected
  useEffect(() => {
    if (!currentProcedure.scheduledDate && currentProcedure.templateId) {
      const now = new Date();
      // Format for datetime-local input (YYYY-MM-DDTHH:MM)
      const formattedDate = now.toISOString().slice(0, 16);
      onProcedureChange({
        ...currentProcedure,
        scheduledDate: formattedDate
      });
    }
  }, [currentProcedure.templateId, currentProcedure.scheduledDate, onProcedureChange]);

  const getProcedurePrice = (template: ProcedureTemplate) => {
    return paymentMode === 'cash' ? template.cashPrice : template.insurancePrice;
  };

  const handleProcedureSelect = (template: ProcedureTemplate) => {
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 16);
    
    onProcedureChange({
      ...currentProcedure,
      templateId: template._id,
      name: template.name,
      scheduledDate: formattedDate, // Auto-set to current date/time
      status: 'scheduled',
      createdBy: currentUser?._id || currentUser?.username || ''
    });
    setProcedureSearch(template.name);
    setShowProcedureDropdown(false);
  };

  const clearProcedureSelection = () => {
    onProcedureChange({
      ...currentProcedure,
      templateId: '',
      name: '',
      scheduledDate: ''
    });
    setProcedureSearch('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const selectedTemplate = procedureTemplates.find(t => t._id === currentProcedure.templateId);

  // Format date for display
  const formatScheduledDate = (dateString: string) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
        <Scissors className="w-5 h-5 text-blue-600" />
        Procedures
      </h2>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Procedure Search */}
          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Search Procedure
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by procedure name, description, category, or code..."
                value={procedureSearch}
                onChange={(e) => {
                  setProcedureSearch(e.target.value);
                  setShowProcedureDropdown(true);
                }}
                onFocus={() => setShowProcedureDropdown(true)}
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                disabled={!canAddEntries}
              />
              {procedureSearch && (
                <button
                  onClick={clearProcedureSelection}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Procedure Search Results */}
            {showProcedureDropdown && procedureSearch && (
              <div className="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto border border-gray-300 rounded-xl bg-white shadow-lg">
                {filteredProcedureTemplates.length > 0 ? (
                  filteredProcedureTemplates.map((template) => (
                    <button
                      key={template._id}
                      onClick={() => handleProcedureSelect(template)}
                      className="w-full text-left p-3 hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                    >
                      <div className="font-semibold text-gray-900">{template.name}</div>
                      <div className="text-sm text-gray-600">
                        {template.description}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs">
                        <span className="text-gray-500">Category: {template.category}</span>
                        <span className="text-gray-500">Department: {template.department}</span>
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
                          {getProcedurePrice(template).toFixed(2)} ({paymentMode})
                        </span>
                        <span className="text-gray-500 font-mono">
                          Code: {template.procedureCode}
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-gray-500 text-center">
                    No procedures found matching "{procedureSearch}"
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Scheduled Date with Auto-set Current Time */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Scheduled Date & Time
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="datetime-local"
                  value={currentProcedure.scheduledDate}
                  onChange={(e) => onProcedureChange({ ...currentProcedure, scheduledDate: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  disabled={!canAddEntries || !currentProcedure.templateId}
                />
              </div>
              <button
                onClick={() => {
                  const now = new Date();
                  const formattedDate = now.toISOString().slice(0, 16);
                  onProcedureChange({
                    ...currentProcedure,
                    scheduledDate: formattedDate
                  });
                }}
                disabled={!canAddEntries || !currentProcedure.templateId}
                className="px-4 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all disabled:opacity-50 flex items-center gap-2 text-sm font-semibold"
                title="Set to current date and time"
              >
                <Calendar className="w-4 h-4" />
                Now
              </button>
            </div>
            {currentProcedure.scheduledDate && (
              <div className="text-sm text-gray-600 mt-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-green-600" />
                Scheduled for: {formatScheduledDate(currentProcedure.scheduledDate)}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
            <input
              type="text"
              placeholder="Procedure notes, special instructions..."
              value={currentProcedure.notes || ''}
              onChange={(e) => onProcedureChange({ ...currentProcedure, notes: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              disabled={!canAddEntries}
            />
          </div>
        </div>

        {/* Template Details */}
        {selectedTemplate && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
              <span className="text-sm text-gray-600">
                {selectedTemplate.category || 'N/A'}
              </span>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Department</label>
              <span className="text-sm text-gray-600">
                {selectedTemplate.department || 'N/A'}
              </span>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Duration</label>
              <span className="text-sm text-gray-600">
                {selectedTemplate.duration || 'N/A'} minutes
              </span>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Procedure Code</label>
              <span className="text-sm text-gray-600 font-mono">
                {selectedTemplate.procedureCode || 'N/A'}
              </span>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Price</label>
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {getProcedurePrice(selectedTemplate).toFixed(2)}
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
          </div>
        )}
        
        {/* Add Procedure Button */}
        {canAddEntries && selectedTemplate && currentProcedure.scheduledDate && (
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
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Scheduled
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
                {procedures.map((procedure) => {
                  const template = procedureTemplates.find(t => t._id === procedure.templateId);
                  return (
                    <tr key={procedure._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {procedure.name}
                          {template?.requiresAuthorization && (
                            <Shield className="w-4 h-4 text-orange-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{template?.category || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{template?.department || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatScheduledDate(procedure.scheduledDate)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(procedure.status)}`}>
                          {procedure.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {paymentMode === 'cash' ? template?.cashPrice : template?.insurancePrice}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{procedure.notes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Authorization Warning */}
        {procedures.some(procedure => {
          const template = procedureTemplates.find(t => t._id === procedure.templateId);
          return template?.requiresAuthorization;
        }) && (
          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-orange-800">Authorization Required</p>
              <p className="text-xs text-orange-700">
                Some procedures require insurance authorization before they can be performed.
              </p>
            </div>
          </div>
        )}

        {/* No procedures found message */}
        {procedures.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Scissors className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg">No procedures added yet</p>
            <p className="text-sm">Use the search above to add medical procedures</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProceduresSection;
