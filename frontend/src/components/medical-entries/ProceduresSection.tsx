import React, { useState, useEffect, useCallback } from 'react';
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
  currentUser?: { fullName?: string; username?: string; id?: string };
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
          template.name?.toLowerCase().includes(procedureSearch.toLowerCase()) ||
          template.description?.toLowerCase().includes(procedureSearch.toLowerCase()) ||
          template.category?.toLowerCase().includes(procedureSearch.toLowerCase()) ||
          template.procedureCode?.toLowerCase().includes(procedureSearch.toLowerCase())
        );
      setFilteredProcedureTemplates(filtered);
    } else {
      setFilteredProcedureTemplates([]);
    }
  }, [procedureSearch, procedureTemplates]);

  // ✅ FIXED: Set default scheduled date without infinite loop
  useEffect(() => {
    if (currentProcedure.templateId && !currentProcedure.scheduledDate) {
      const now = new Date();
      const formattedDate = now.toISOString().slice(0, 16);
      onProcedureChange({
        ...currentProcedure,
        scheduledDate: formattedDate
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProcedure.templateId, currentProcedure.scheduledDate]);

  // ✅ FIXED: Get procedure price with safety checks
  const getProcedurePrice = (template: ProcedureTemplate) => {
    if (!template) return 0;
    const price = paymentMode === 'cash' ? template.cashPrice : template.insurancePrice;
    return price || 0;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border-[var(--icon-cyan-bg)]';
      case 'in_progress': return 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] border-[var(--icon-yellow-bg)]';
      case 'completed': return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border-[var(--icon-green-bg)]';
      case 'cancelled': return 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border-[var(--icon-red-bg)]';
      default: return 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]';
    }
  };

  const handleProcedureSelect = (template: ProcedureTemplate) => {
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 16);
    
    onProcedureChange({
      ...currentProcedure,
      templateId: template.id,
      name: template.name,
      scheduledDate: formattedDate,
      status: 'scheduled',
      createdBy: currentUser?.id || currentUser?.username || ''
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

  const selectedTemplate = procedureTemplates.find(t => t.id === currentProcedure.templateId);

  // Format date for display
  const formatScheduledDate = (dateString: string) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-6 shadow-sm border border-[var(--border-color)]">
      <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
        <Scissors className="w-5 h-5 text-[var(--icon-cyan-text)]" />
        Procedures
      </h2>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Procedure Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
              Search Procedure
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              <input
                type="text"
                placeholder="Search procedures..."
                value={procedureSearch}
                onChange={(e) => {
                  setProcedureSearch(e.target.value);
                  setShowProcedureDropdown(true);
                }}
                onFocus={() => setShowProcedureDropdown(true)}
                className="w-full pl-9 pr-8 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent transition-all text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
                disabled={!canAddEntries}
              />
              {procedureSearch && (
                <button
                  onClick={clearProcedureSelection}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Procedure Search Results */}
            {showProcedureDropdown && procedureSearch && (
              <div className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto border border-[var(--border-color)] rounded-lg bg-[var(--bg-card)] shadow-lg">
                {filteredProcedureTemplates.length > 0 ? (
                  filteredProcedureTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleProcedureSelect(template)}
                      className="w-full text-left p-2 hover:bg-[var(--bg-main)] border-b border-[var(--border-color)] last:border-b-0 transition-colors text-sm"
                    >
                      <div className="font-semibold text-[var(--text-primary)]">{template.name}</div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        {template.category} • {template.duration || 30}min
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
                          {/* ✅ FIXED: Safe toFixed */}
                          {(getProcedurePrice(template) || 0).toFixed(2)}
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-[var(--text-secondary)] text-center text-sm">
                    No procedures found
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Scheduled Date */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
              Scheduled Date & Time
            </label>
            <div className="flex gap-1.5">
              <div className="flex-1 relative">
                <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                <input
                  type="datetime-local"
                  value={currentProcedure.scheduledDate || ''}
                  onChange={(e) => onProcedureChange({ ...currentProcedure, scheduledDate: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent transition-all text-sm text-[var(--text-primary)]"
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
                className="px-3 py-2 bg-[var(--bg-main)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--border-color)] transition-all disabled:opacity-50 flex items-center gap-1 text-xs font-semibold"
                title="Set to current time"
              >
                <Calendar className="w-3.5 h-3.5" />
                Now
              </button>
            </div>
            {currentProcedure.scheduledDate && (
              <div className="text-xs text-[var(--icon-green-text)] mt-1 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                {formatScheduledDate(currentProcedure.scheduledDate)}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Notes</label>
            <input
              type="text"
              placeholder="Procedure notes"
              value={currentProcedure.notes || ''}
              onChange={(e) => onProcedureChange({ ...currentProcedure, notes: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent transition-all text-sm text-[var(--text-primary)]"
              disabled={!canAddEntries}
            />
          </div>
        </div>

        {/* Template Details */}
        {selectedTemplate && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-[var(--icon-cyan-bg)] rounded-lg border border-[var(--icon-cyan-text)]">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-0.5">Category</label>
              <span className="text-xs text-[var(--text-primary)]">
                {selectedTemplate.category || 'N/A'}
              </span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-0.5">Department</label>
              <span className="text-xs text-[var(--text-primary)]">
                {selectedTemplate.department || 'N/A'}
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
                {/* ✅ FIXED: Safe toFixed */}
                {(getProcedurePrice(selectedTemplate) || 0).toFixed(2)}
              </span>
            </div>
          </div>
        )}
        
        {/* Add Procedure Button */}
        {canAddEntries && selectedTemplate && currentProcedure.scheduledDate && (
          <button
            onClick={onAddProcedure}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Procedure
          </button>
        )}
        
        {/* Procedure List */}
        {procedures.length > 0 && (
          <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
            <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
              <h4 className="font-semibold text-[var(--text-primary)]">Scheduled Procedures</h4>
            </div>
            <div className="divide-y divide-[var(--border-color)]">
              {procedures.map((procedure) => {
                const template = procedureTemplates.find(t => t.id === procedure.templateId);
                return (
                  <div key={procedure.id} className="p-4 hover:bg-[var(--bg-main)] transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-[var(--text-primary)]">{procedure.name}</span>
                          {template?.requiresAuthorization && (
                            <Shield className="w-3.5 h-3.5 text-[var(--icon-orange-text)]" />
                          )}
                        </div>
                        <div className="text-sm text-[var(--text-secondary)] space-y-0.5">
                          <div>Category: {template?.category || 'N/A'} • Department: {template?.department || 'N/A'}</div>
                          <div>Scheduled: {formatScheduledDate(procedure.scheduledDate)}</div>
                          <div>Status: <span className={`px-1.5 py-0.5 text-xs font-semibold rounded border ${getStatusColor(procedure.status)}`}>
                            {procedure.status?.replace('_', ' ') || 'Unknown'}
                          </span></div>
                          {procedure.notes && (
                            <div>Notes: {procedure.notes}</div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          // You'll need to pass a remove function as prop
                          console.log('Remove procedure:', procedure.id);
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
        {procedures.some(procedure => {
          const template = procedureTemplates.find(t => t.id === procedure.templateId);
          return template?.requiresAuthorization;
        }) && (
          <div className="p-3 bg-[var(--icon-orange-bg)] border border-[var(--icon-orange-text)] rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[var(--icon-orange-text)] flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[var(--icon-orange-text)]">Authorization Required</p>
              <p className="text-xs text-[var(--icon-orange-text)]">
                Some procedures require insurance authorization.
              </p>
            </div>
          </div>
        )}

        {/* No procedures found message */}
        {procedures.length === 0 && (
          <div className="text-center py-6 text-[var(--text-secondary)]">
            <Scissors className="w-10 h-10 mx-auto mb-3 text-[var(--text-tertiary)]" />
            <p className="text-sm">No procedures added yet</p>
            <p className="text-xs">Use the search above to add procedures</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProceduresSection;