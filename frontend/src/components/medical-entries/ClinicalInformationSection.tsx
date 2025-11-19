import React, { useState, useEffect, useRef } from 'react';
import { Diagnosis, DiagnosisTemplate } from '../../types';
import { AlertCircle, Save, CheckCircle2, Stethoscope, FileText, Edit, Clock, User, Search, X, DollarSign, Shield } from 'lucide-react';

interface ClinicalInformationSectionProps {
  chiefComplaint: string;
  diagnosis: Diagnosis | null;
  notes: string;
  diagnosisTemplates: DiagnosisTemplate[];
  onComplaintChange: (complaint: string) => void;
  onDiagnosisChange: (diagnosis: Diagnosis | null) => void;
  onNotesChange: (notes: string) => void;
  canAddEntries: boolean;
  onSave?: (data: { chiefComplaint: string; diagnosis: Diagnosis | null; notes: string }) => void;
  currentUser?: { fullName?: string; username?: string; _id?: string };
  isLoadingDiagnoses?: boolean;
  paymentMode?: 'cash' | 'nhis' | 'private_insurance';
}

interface EditHistory {
  timestamp: string;
  user: string;
  changes: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
}

const ClinicalInformationSection: React.FC<ClinicalInformationSectionProps> = ({
  chiefComplaint,
  diagnosis,
  notes,
  diagnosisTemplates,
  onComplaintChange,
  onDiagnosisChange,
  onNotesChange,
  canAddEntries,
  onSave,
  currentUser,
  isLoadingDiagnoses = false,
  paymentMode = 'cash'
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editHistory, setEditHistory] = useState<EditHistory[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [diagnosisSearch, setDiagnosisSearch] = useState('');
  const [showDiagnosisDropdown, setShowDiagnosisDropdown] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSaveRef = useRef<number>(Date.now());

  // Safe handling of diagnosisTemplates - ensure it's always an array
  const safeDiagnosisTemplates = Array.isArray(diagnosisTemplates) ? diagnosisTemplates : [];
  const hasDiagnosisTemplates = safeDiagnosisTemplates.length > 0;

  // Filter diagnoses based on search - with proper null safety
  const filteredDiagnoses = safeDiagnosisTemplates.filter(diag => {
    if (!diag) return false;
    
    const searchTerm = diagnosisSearch.toLowerCase();
    
    return (
      (diag.name?.toLowerCase() || '').includes(searchTerm) ||
      (diag.icdCode?.toLowerCase() || '').includes(searchTerm) ||
      (diag.description?.toLowerCase() || '').includes(searchTerm)
    );
  });

  // Calculate price based on payment mode - with null safety
  const getDiagnosisPrice = (diagnosisTemplate: DiagnosisTemplate | null) => {
    if (!diagnosisTemplate) return 0;
    return paymentMode === 'cash' 
      ? diagnosisTemplate.cashPrice || 0 
      : diagnosisTemplate.insurancePrice || 0;
  };

  // Auto-save functionality
  useEffect(() => {
    if (hasUnsavedChanges && (chiefComplaint || diagnosis || notes)) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        handleAutoSave();
      }, 30000);

      return () => {
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
      };
    }
  }, [chiefComplaint, diagnosis, notes, hasUnsavedChanges]);

  const handleAutoSave = async () => {
    if (!chiefComplaint.trim() || isSaving) return;

    console.log('🔄 Auto-saving clinical information...');
    setIsSaving(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (onSave) {
        await onSave({ chiefComplaint, diagnosis, notes });
      }

      const changes = [];
      if (chiefComplaint) changes.push({ field: 'Chief Complaint', oldValue: '', newValue: chiefComplaint });
      if (diagnosis) changes.push({ field: 'Diagnosis', oldValue: '', newValue: diagnosis.name || '' });
      if (notes) changes.push({ field: 'Medical Notes', oldValue: '', newValue: notes });

      if (changes.length > 0) {
        const historyEntry: EditHistory = {
          timestamp: new Date().toISOString(),
          user: 'Auto-save',
          changes
        };
        setEditHistory(prev => [historyEntry, ...prev]);
      }

      setHasUnsavedChanges(false);
      lastSaveRef.current = Date.now();
      
      setSaveMessage({ type: 'success', text: 'Clinical information auto-saved' });
      setTimeout(() => setSaveMessage(null), 2000);
      
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!chiefComplaint.trim()) {
      setSaveMessage({ type: 'error', text: 'Chief complaint is required' });
      return;
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const changes = [];
      if (chiefComplaint) changes.push({ field: 'Chief Complaint', oldValue: '', newValue: chiefComplaint });
      if (diagnosis) changes.push({ field: 'Diagnosis', oldValue: '', newValue: diagnosis?.name || '' });
      if (notes) changes.push({ field: 'Medical Notes', oldValue: '', newValue: notes });

      if (changes.length > 0) {
        const historyEntry: EditHistory = {
          timestamp: new Date().toISOString(),
          user: currentUser?.fullName || currentUser?.username || 'User',
          changes
        };
        setEditHistory(prev => [historyEntry, ...prev]);
      }

      if (onSave) {
        await onSave({ chiefComplaint, diagnosis, notes });
      }
      
      setHasUnsavedChanges(false);
      setIsEditing(false);
      setSaveMessage({ type: 'success', text: 'Clinical information saved successfully!' });
      
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to save clinical information' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setHasUnsavedChanges(false);
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setHasUnsavedChanges(true);
    
    switch (field) {
      case 'chiefComplaint':
        onComplaintChange(value);
        break;
      case 'diagnosis':
        onDiagnosisChange(value);
        setDiagnosisSearch(value?.name || '');
        setShowDiagnosisDropdown(false);
        break;
      case 'notes':
        onNotesChange(value);
        break;
    }
  };

  const handleDiagnosisSelect = (selectedTemplate: DiagnosisTemplate) => {
    if (!selectedTemplate) return;
    
    const diagnosisData: Diagnosis = {
      _id: selectedTemplate._id || '',
      name: selectedTemplate.name || '',
      icdCode: selectedTemplate.icdCode || '',
      gdrgCode: selectedTemplate.gdrgCode || '',
      notes: '',
      primary: true,
      date: new Date().toISOString(),
      createdBy: currentUser?._id || currentUser?.username || '',
      cashPrice: selectedTemplate.cashPrice || 0,
      insurancePrice: selectedTemplate.insurancePrice || 0,
      costPrice: selectedTemplate.costPrice || 0,
      isActive: selectedTemplate.isActive ?? true,
      requiresAuthorization: selectedTemplate.requiresAuthorization ?? false,
      tariffCode: selectedTemplate.tariffCode || '',
      vatRate: selectedTemplate.vatRate || 0,
      isTaxable: selectedTemplate.isTaxable ?? false,
      createdAt: selectedTemplate.createdAt || new Date().toISOString(),
      updatedAt: selectedTemplate.updatedAt || new Date().toISOString()
    };
    handleFieldChange('diagnosis', diagnosisData);
  };

  const clearDiagnosis = () => {
    handleFieldChange('diagnosis', null);
    setDiagnosisSearch('');
  };

  const hasChanges = chiefComplaint || diagnosis || notes;
  const canEdit = canAddEntries && !isEditing;

  // Calculate time since last save
  const timeSinceLastSave = Math.floor((Date.now() - lastSaveRef.current) / 1000);
  const showAutoSaveIndicator = hasUnsavedChanges && timeSinceLastSave > 5;

  return (
    <div className="space-y-4">
      {/* Input Section */}
      <div className="bg-[var(--bg-card)] rounded-xl p-6 shadow-sm border border-[var(--border-color)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-[var(--icon-cyan-text)]" />
            Clinical Information
            {showAutoSaveIndicator && (
              <span className="text-xs text-[var(--icon-orange-text)] bg-[var(--icon-orange-bg)] px-1.5 py-0.5 rounded">
                Unsaved • {30 - Math.floor(timeSinceLastSave)}s
              </span>
            )}
          </h2>
          
          <div className="flex items-center gap-2">
            {canEdit && hasChanges && (
              <button
                onClick={handleEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] rounded-lg hover:bg-[var(--icon-yellow-text)] hover:text-white transition-all text-sm"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}
            
            {isEditing && (
              <>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 bg-[var(--bg-main)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--border-color)] transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all disabled:opacity-50 text-sm"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </>
                  )}
                </button>
              </>
            )}
            
            {!hasChanges && canAddEntries && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Start</span>
              </button>
            )}
          </div>
        </div>

        {/* Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column - Chief Complaint & Diagnosis */}
          <div className="space-y-4">
            {/* Chief Complaint */}
            <div className="flex-1">
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
                Chief Complaint *
              </label>
              <textarea
                placeholder="Describe the patient's main concern, symptoms, and history..."
                value={chiefComplaint}
                onChange={(e) => handleFieldChange('chiefComplaint', e.target.value)}
                rows={6}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent transition-all resize-none text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
                required
                disabled={!isEditing && hasChanges}
              />
              <div className="text-xs text-[var(--text-secondary)] mt-1">
                {(chiefComplaint || '').length}/1000
              </div>
            </div>
            
            {/* Diagnosis Search */}
            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
                Diagnosis
                {isLoadingDiagnoses && (
                  <span className="ml-1 text-xs text-[var(--icon-yellow-text)]">(Loading...)</span>
                )}
              </label>
              
              {isLoadingDiagnoses ? (
                <div className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-secondary)] text-sm">
                  Loading diagnoses...
                </div>
              ) : !hasDiagnosisTemplates ? (
                <div className="w-full px-3 py-2 border border-[var(--icon-yellow-bg)] rounded-lg bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] flex items-center gap-1.5 text-sm">
                  <AlertCircle className="w-3.5 h-3.5" />
                  No diagnosis templates
                </div>
              ) : (
                <div className="relative">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                    <input
                      type="text"
                      placeholder="Search diagnoses..."
                      value={diagnosisSearch}
                      onChange={(e) => {
                        setDiagnosisSearch(e.target.value);
                        setShowDiagnosisDropdown(true);
                      }}
                      onFocus={() => setShowDiagnosisDropdown(true)}
                      className="w-full pl-9 pr-8 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent transition-all text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
                      disabled={!isEditing && hasChanges}
                    />
                    {diagnosisSearch && (
                      <button
                        onClick={clearDiagnosis}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Diagnosis Dropdown */}
                  {showDiagnosisDropdown && diagnosisSearch && (
                    <div className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto border border-[var(--border-color)] rounded-lg bg-[var(--bg-card)] shadow-lg">
                      {filteredDiagnoses.length > 0 ? (
                        filteredDiagnoses.map((diag) => (
                          <button
                            key={diag?._id || Math.random()}
                            onClick={() => handleDiagnosisSelect(diag)}
                            className="w-full text-left p-2 hover:bg-[var(--bg-main)] border-b border-[var(--border-color)] last:border-b-0 transition-colors text-sm"
                          >
                            <div className="font-semibold text-[var(--text-primary)]">{diag?.name || 'Unnamed'}</div>
                            <div className="text-xs text-[var(--text-secondary)] font-mono">ICD-10: {diag?.icdCode || 'N/A'}</div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs">
                              <span className={`px-1.5 py-0.5 rounded ${
                                diag?.requiresAuthorization 
                                  ? 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]' 
                                  : 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]'
                              }`}>
                                {diag?.requiresAuthorization ? 'Auth Req' : 'No Auth'}
                              </span>
                              <span className="flex items-center gap-0.5 text-[var(--text-secondary)]">
                                <DollarSign className="w-2.5 h-2.5" />
                                {getDiagnosisPrice(diag).toFixed(2)}
                              </span>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-[var(--text-secondary)] text-center text-sm">No diagnoses found</div>
                      )}
                    </div>
                  )}

                  {/* Selected Diagnosis Display */}
                  {diagnosis && !showDiagnosisDropdown && (
                    <div className="mt-1.5 p-2 bg-[var(--icon-green-bg)] border border-[var(--icon-green-text)] rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-[var(--icon-green-text)] text-sm">{diagnosis.name}</div>
                          <div className="text-xs text-[var(--icon-green-text)]">
                            ICD-10: {diagnosis.icdCode || 'N/A'}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs">
                            <span className={`px-1.5 py-0.5 rounded ${
                              diagnosis.requiresAuthorization 
                                ? 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]' 
                                : 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]'
                            }`}>
                              {diagnosis.requiresAuthorization ? 'Auth Req' : 'No Auth'}
                            </span>
                            <span className="flex items-center gap-0.5 text-[var(--icon-green-text)]">
                              <DollarSign className="w-2.5 h-2.5" />
                              {(paymentMode === 'cash' ? diagnosis.cashPrice : diagnosis.insurancePrice) || 0}
                            </span>
                          </div>
                        </div>
                        {isEditing && (
                          <button
                            onClick={clearDiagnosis}
                            className="text-[var(--icon-red-text)] hover:text-[var(--icon-red-text)]"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Medical Notes */}
          <div className="flex-1">
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
              Medical Notes & Assessment
            </label>
            <textarea
              placeholder="Enter clinical findings, examination results, assessment, and treatment plan..."
              value={notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              rows={8}
              className="w-full min-h-[150px] px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent transition-all resize-none text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
              disabled={!isEditing && hasChanges}
            />
            <div className="text-xs text-[var(--text-secondary)] mt-1">
              {(notes || '').length}/2000
            </div>
          </div>
        </div>

        {/* Save Message & Auto-save Info */}
        <div className="mt-3 space-y-1.5">
          {saveMessage && (
            <div
              className={`p-2 rounded-lg flex items-center gap-2 border text-sm ${
                saveMessage.type === 'success'
                  ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border-[var(--icon-green-text)]'
                  : 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border-[var(--icon-red-text)]'
              }`}
            >
              {saveMessage.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
              <span className="font-medium">{saveMessage.text}</span>
            </div>
          )}
          
          {hasUnsavedChanges && (
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span>Unsaved changes</span>
              <span>Auto-save in {30 - Math.min(timeSinceLastSave, 30)}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Saved Information Display */}
      {hasChanges && (
        <div className="space-y-4">
          {/* Clinical Information Card */}
          <div className="bg-[var(--bg-card)] rounded-xl p-6 shadow-sm border border-[var(--border-color)]">
            <h3 className="text-md font-semibold mb-3 flex items-center gap-1.5 text-[var(--text-primary)]">
              <FileText className="w-4 h-4 text-[var(--icon-green-text)]" />
              Saved Clinical Information
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column - Complaint & Diagnosis */}
              <div className="space-y-3">
                {/* Chief Complaint */}
                {chiefComplaint && (
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Chief Complaint</h4>
                    <div className="p-3 bg-[var(--icon-cyan-bg)] rounded-lg border border-[var(--icon-cyan-text)]">
                      <p className="text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed text-sm">{chiefComplaint}</p>
                    </div>
                  </div>
                )}
                
                {/* Diagnosis */}
                {diagnosis && (
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Diagnosis</h4>
                    <div className="p-3 bg-[var(--icon-green-bg)] rounded-lg border border-[var(--icon-green-text)]">
                      <div className="font-semibold text-[var(--text-primary)] text-sm">{diagnosis.name}</div>
                      <div className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-1">
                        <span className="bg-[var(--bg-main)] px-1.5 py-0.5 rounded font-mono">ICD-10: {diagnosis.icdCode || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <span className={`px-1.5 py-0.5 rounded ${
                          diagnosis.requiresAuthorization 
                            ? 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]' 
                            : 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]'
                        }`}>
                          {diagnosis.requiresAuthorization ? 'Auth Required' : 'No Auth'}
                        </span>
                        <span className="flex items-center gap-0.5 text-[var(--text-primary)]">
                          <DollarSign className="w-3 h-3" />
                          Price: {(paymentMode === 'cash' ? diagnosis.cashPrice : diagnosis.insurancePrice) || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Medical Notes */}
              {notes && (
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Medical Notes</h4>
                  <div className="p-3 bg-[var(--icon-green-bg)] rounded-lg border border-[var(--icon-green-text)]">
                    <p className="text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed text-sm">{notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Last Updated Info */}
            {editHistory.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Last: {new Date(editHistory[0].timestamp).toLocaleString()}</span>
                  <span className="mx-1">•</span>
                  <User className="w-3.5 h-3.5" />
                  <span>By: {editHistory[0].user}</span>
                </div>
              </div>
            )}
          </div>

          {/* Edit History */}
          {editHistory.length > 0 && (
            <div className="bg-[var(--bg-card)] rounded-xl p-6 shadow-sm border border-[var(--border-color)]">
              <h3 className="text-md font-semibold mb-3 flex items-center gap-1.5 text-[var(--text-primary)]">
                <Clock className="w-4 h-4 text-[var(--icon-purple-text)]" />
                Edit History
              </h3>
              
              <div className="space-y-2">
                {editHistory.slice(0, 3).map((entry, index) => (
                  <div key={index} className="border-l-2 border-[var(--icon-purple-bg)] pl-3 py-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                        <User className="w-3 h-3" />
                        <span className="font-medium">{entry.user}</span>
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    
                    <div className="space-y-0.5">
                      {entry.changes.slice(0, 2).map((change, changeIndex) => (
                        <div key={changeIndex} className="text-xs">
                          <span className="font-medium text-[var(--text-primary)]">{change.field}:</span>{' '}
                          <span className="text-[var(--text-secondary)] truncate">{change.newValue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!hasChanges && (
        <div className="bg-[var(--bg-card)] rounded-xl p-6 text-center border border-[var(--border-color)]">
          <FileText className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
          <h3 className="text-md font-semibold text-[var(--text-primary)] mb-1">No Clinical Information</h3>
          <p className="text-[var(--text-secondary)] text-sm mb-3">Enter clinical details to get started</p>
          {canAddEntries && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm"
            >
              Add Clinical Information
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ClinicalInformationSection;