// src/components/medical-entries/ClinicalInformationSection.tsx
import React, { useState } from 'react';
import { Diagnosis } from '../../types';
import { AlertCircle, Save, CheckCircle2, Stethoscope, FileText, Edit, Clock, User } from 'lucide-react';

interface ClinicalInformationSectionProps {
  chiefComplaint: string;
  diagnosis: Diagnosis | null;
  notes: string;
  diagnosisTemplates: any[];
  onComplaintChange: (complaint: string) => void;
  onDiagnosisChange: (diagnosis: Diagnosis | null) => void;
  onNotesChange: (notes: string) => void;
  canAddEntries: boolean;
  onSave?: (data: { chiefComplaint: string; diagnosis: Diagnosis | null; notes: string }) => void;
  currentUser?: { fullName?: string; username?: string };
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
  currentUser
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editHistory, setEditHistory] = useState<EditHistory[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async () => {
    if (!chiefComplaint.trim()) {
      setSaveMessage({ type: 'error', text: 'Chief complaint is required' });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Record edit history
      const changes = [];
      if (chiefComplaint) changes.push({ field: 'Chief Complaint', oldValue: '', newValue: chiefComplaint });
      if (diagnosis) changes.push({ field: 'Diagnosis', oldValue: '', newValue: diagnosis.name });
      if (notes) changes.push({ field: 'Medical Notes', oldValue: '', newValue: notes });

      if (changes.length > 0) {
        const historyEntry: EditHistory = {
          timestamp: new Date().toISOString(),
          user: currentUser?.fullName || currentUser?.username || 'Unknown User',
          changes
        };
        setEditHistory(prev => [historyEntry, ...prev]);
      }

      if (onSave) {
        onSave({ chiefComplaint, diagnosis, notes });
      }
      
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
    // Reset form state if needed
  };

  const hasChanges = chiefComplaint || diagnosis || notes;
  const canEdit = canAddEntries && !isEditing;

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900">
            <Stethoscope className="w-5 h-5 text-blue-600" />
            Clinical Information
          </h2>
          
          <div className="flex items-center gap-3">
            {canEdit && hasChanges && (
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition-all"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
            )}
            
            {isEditing && (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </>
            )}
            
            {!hasChanges && canAddEntries && (
              <button
                onClick={handleSave}
                disabled={isSaving || !chiefComplaint.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Clinical Info</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Chief Complaint & Diagnosis */}
          <div className="space-y-6">
            {/* Chief Complaint */}
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Chief Complaint *
              </label>
              <textarea
                placeholder="Describe the patient's main concern, symptoms, and history..."
                value={chiefComplaint}
                onChange={(e) => onComplaintChange(e.target.value)}
                rows={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                required
                disabled={!isEditing && hasChanges}
              />
              <div className="text-xs text-gray-500 mt-1">
                {chiefComplaint.length}/1000 characters
              </div>
            </div>
            
            {/* Diagnosis */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Diagnosis
                {!diagnosisTemplates && (
                  <span className="ml-2 text-xs text-yellow-600">(Loading...)</span>
                )}
              </label>
              
              {!diagnosisTemplates ? (
                <div className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-500">
                  Loading diagnoses...
                </div>
              ) : diagnosisTemplates.length === 0 ? (
                <div className="w-full px-4 py-3 border border-yellow-300 rounded-xl bg-yellow-50 text-yellow-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  No diagnosis templates available
                </div>
              ) : (
                <select
                  value={diagnosis?._id || ''}
                  onChange={(e) => {
                    const selected = diagnosisTemplates.find(d => d._id === e.target.value);
                    onDiagnosisChange(selected || null);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  disabled={!isEditing && hasChanges}
                >
                  <option value="">Select diagnosis...</option>
                  {diagnosisTemplates.map((diag) => (
                    <option key={diag._id} value={diag._id}>
                      {diag.name} {diag.icdCode ? `(${diag.icdCode})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Right Column - Medical Notes */}
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Medical Notes & Assessment
            </label>
            <textarea
              placeholder="Enter clinical findings, examination results, assessment, and treatment plan..."
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={12}
              className="w-full h-full min-h-[200px] px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
              disabled={!isEditing && hasChanges}
            />
            <div className="text-xs text-gray-500 mt-1">
              {notes.length}/2000 characters
            </div>
          </div>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div
            className={`mt-4 p-3 rounded-xl flex items-center gap-3 border ${
              saveMessage.type === 'success'
                ? 'bg-green-50 text-green-800 border-green-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {saveMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">{saveMessage.text}</span>
          </div>
        )}
      </div>

      {/* Saved Information Display */}
      {hasChanges && (
        <div className="space-y-6">
          {/* Clinical Information Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
              <FileText className="w-5 h-5 text-green-600" />
              Saved Clinical Information
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Complaint & Diagnosis */}
              <div className="space-y-4">
                {/* Chief Complaint */}
                {chiefComplaint && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Chief Complaint</h4>
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{chiefComplaint}</p>
                    </div>
                  </div>
                )}
                
                {/* Diagnosis */}
                {diagnosis && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Diagnosis</h4>
                    <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                      <div className="font-semibold text-gray-900 text-lg">{diagnosis.name}</div>
                      {diagnosis.icdCode && (
                        <div className="text-sm text-gray-600 mt-2 flex items-center gap-2">
                          <span className="bg-gray-100 px-2 py-1 rounded-md font-mono">ICD-10: {diagnosis.icdCode}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Medical Notes */}
              {notes && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Medical Notes & Assessment</h4>
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200 h-full">
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Last Updated Info */}
            {editHistory.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Last updated: {new Date(editHistory[0].timestamp).toLocaleString()}</span>
                  <span className="mx-2">•</span>
                  <User className="w-4 h-4" />
                  <span>By: {editHistory[0].user}</span>
                </div>
              </div>
            )}
          </div>

          {/* Edit History */}
          {editHistory.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
                <Clock className="w-5 h-5 text-purple-600" />
                Edit History
              </h3>
              
              <div className="space-y-4">
                {editHistory.map((entry, index) => (
                  <div key={index} className="border-l-4 border-purple-200 pl-4 py-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-4 h-4" />
                        <span className="font-medium">{entry.user}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(entry.timestamp).toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      {entry.changes.map((change, changeIndex) => (
                        <div key={changeIndex} className="text-sm">
                          <span className="font-medium text-gray-700">{change.field}:</span>{' '}
                          <span className="text-gray-600">{change.newValue}</span>
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Clinical Information</h3>
          <p className="text-gray-600 mb-4">Enter clinical details to get started</p>
          {canAddEntries && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
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
