import React from 'react';
import { 
  Medication, 
  LabTest, 
  Procedure, 
  Scan, 
  Diagnosis, 
  ProgressNote,
  DiagnosisTemplate,
  LabTestTemplate,
  ProcedureTemplate,
  StockItem,
  User 
} from '../types';
import { 
  MedicationEntry, 
  LabTestEntry, 
  ProcedureEntry, 
  ScanEntry 
} from '../types/medical-entries';
import {
  ClinicalInformationSection,
  MedicationsSection,
  LabTestsSection,
  ProceduresSection,
  ScansSection
} from '../medical-entries';
import { useToast } from '../../store/toastStore';
import { Stethoscope, FileText, Save } from 'lucide-react';

interface MedicalEntriesFormProps {
  activeTab: 'clinical' | 'medications' | 'labs' | 'procedures' | 'scans' | 'progress';
  onTabChange: (tab: 'clinical' | 'medications' | 'labs' | 'procedures' | 'scans' | 'progress') => void;
  
  // Form state
  chiefComplaint: string;
  diagnosis: Diagnosis | null;
  notes: string;
  medications?: Medication[];
  labTests?: LabTest[];
  procedures?: Procedure[];
  scans?: Scan[];
  progressNotes?: ProgressNote[];
  currentProgressNote: string;
  
  // Current entries
  currentMed: MedicationEntry;
  currentLab: LabTestEntry;
  currentProcedure: ProcedureEntry;
  currentScan: ScanEntry;
  
  // Handlers
  onComplaintChange: (complaint: string) => void;
  onDiagnosisChange: (diagnosis: Diagnosis | null) => void;
  onNotesChange: (notes: string) => void;
  onMedChange: (med: MedicationEntry) => void;
  onLabChange: (lab: LabTestEntry) => void;
  onProcedureChange: (procedure: ProcedureEntry) => void;
  onScanChange: (scan: ScanEntry) => void;
  onProgressNoteChange: (note: string) => void;
  
  // Add handlers
  onAddMedication: () => void;
  onAddLabTest: () => void;
  onAddProcedure: () => void;
  onAddScan: () => void;
  onAddProgressNote: () => void;
  onSubmitMedicalEntries: () => void;
  
  // Data
  diagnosisTemplates: DiagnosisTemplate[];
  labTestTemplates: LabTestTemplate[];
  procedureTemplates: ProcedureTemplate[];
  stockItems: StockItem[];
  
  // UI state
  canAddEntries: boolean;
  isSubmitting: boolean;
  addingProgressNote: boolean;
  currentUser?: User;
  paymentMode?: 'cash' | 'nhis' | 'private_insurance';
}

export const MedicalEntriesForm: React.FC<MedicalEntriesFormProps> = ({
  activeTab,
  onTabChange,
  chiefComplaint,
  diagnosis,
  notes,
  medications = [],
  labTests = [],
  procedures = [],
  scans = [],
  progressNotes = [],
  currentProgressNote,
  currentMed,
  currentLab,
  currentProcedure,
  currentScan,
  onComplaintChange,
  onDiagnosisChange,
  onNotesChange,
  onMedChange,
  onLabChange,
  onProcedureChange,
  onScanChange,
  onProgressNoteChange,
  onAddMedication,
  onAddLabTest,
  onAddProcedure,
  onAddScan,
  onAddProgressNote,
  onSubmitMedicalEntries,
  diagnosisTemplates,
  labTestTemplates,
  procedureTemplates,
  stockItems,
  canAddEntries,
  isSubmitting,
  addingProgressNote,
  currentUser,
  paymentMode = 'cash'
}) => {
  const { success, error } = useToast(); // TOAST INTEGRATION
  
  // Safe tab counts with proper array access
  const tabCounts = {
    clinical: chiefComplaint || diagnosis || notes ? 1 : 0,
    medications: medications?.length || 0,
    labs: labTests?.length || 0,
    procedures: procedures?.length || 0,
    scans: scans?.length || 0,
    progress: progressNotes?.length || 0
  };

  const tabs = [
    { id: 'clinical', label: 'Clinical', icon: Stethoscope, count: tabCounts.clinical },
    { id: 'medications', label: 'Medications', icon: FileText, count: tabCounts.medications },
    { id: 'labs', label: 'Lab Tests', icon: FileText, count: tabCounts.labs },
    { id: 'procedures', label: 'Procedures', icon: Stethoscope, count: tabCounts.procedures },
    { id: 'scans', label: 'Scans', icon: FileText, count: tabCounts.scans },
    { id: 'progress', label: 'Progress', icon: FileText, count: tabCounts.progress }
  ];

  const handleSubmit = () => {
    // Validate if there's any data to save
    const hasData = 
      chiefComplaint || 
      diagnosis || 
      notes || 
      medications.length > 0 ||
      labTests.length > 0 ||
      procedures.length > 0 ||
      scans.length > 0 ||
      progressNotes.length > 0;

    if (!hasData) {
      error('No Data', 'Please add some medical entries before saving');
      return;
    }

    onSubmitMedicalEntries();
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-gray-900">
          <FileText className="w-4 h-4 text-blue-600" />
          Medical Entries
        </h2>
        
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id as any)}
                className={`flex items-center gap-1 px-3 py-2 border-b-2 transition-all whitespace-nowrap text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 font-semibold'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <IconComponent className="w-3 h-3" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                    activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === 'clinical' && (
            <ClinicalInformationSection
              chiefComplaint={chiefComplaint}
              diagnosis={diagnosis}
              notes={notes}
              diagnosisTemplates={diagnosisTemplates}
              onComplaintChange={onComplaintChange}
              onDiagnosisChange={onDiagnosisChange}
              onNotesChange={onNotesChange}
              canAddEntries={canAddEntries}
              currentUser={currentUser}
              paymentMode={paymentMode}
            />
          )}

          {activeTab === 'medications' && (
            <MedicationsSection
              medications={medications || []}
              currentMed={currentMed}
              onMedChange={onMedChange}
              onAddMedication={onAddMedication}
              stockItems={stockItems}
              canAddEntries={canAddEntries}
              paymentMode={paymentMode}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'labs' && (
            <LabTestsSection
              labTests={labTests || []}
              currentLab={currentLab}
              onLabChange={onLabChange}
              onAddLabTest={onAddLabTest}
              labTestTemplates={labTestTemplates}
              canAddEntries={canAddEntries}
              paymentMode={paymentMode}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'procedures' && (
            <ProceduresSection
              procedures={procedures || []}
              currentProcedure={currentProcedure}
              onProcedureChange={onProcedureChange}
              onAddProcedure={onAddProcedure}
              procedureTemplates={procedureTemplates}
              canAddEntries={canAddEntries}
              paymentMode={paymentMode}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'scans' && (
            <ScansSection
              scans={scans || []}
              currentScan={currentScan}
              onScanChange={onScanChange}
              onAddScan={onAddScan}
              canAddEntries={canAddEntries}
              paymentMode={paymentMode}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'progress' && (
            <ProgressNotesSection
              progressNotes={progressNotes || []}
              currentProgressNote={currentProgressNote}
              onProgressNoteChange={onProgressNoteChange}
              onAddProgressNote={onAddProgressNote}
              addingProgressNote={addingProgressNote}
              canAddEntries={canAddEntries}
            />
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center gap-2 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Medical Entries</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const ProgressNotesSection: React.FC<{
  progressNotes: ProgressNote[];
  currentProgressNote: string;
  onProgressNoteChange: (note: string) => void;
  onAddProgressNote: () => void;
  addingProgressNote: boolean;
  canAddEntries: boolean;
}> = ({
  progressNotes = [],
  currentProgressNote,
  onProgressNoteChange,
  onAddProgressNote,
  addingProgressNote,
  canAddEntries
}) => (
  <div className="space-y-3">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Progress Note
      </label>
      <textarea
        placeholder="Enter progress note..."
        value={currentProgressNote}
        onChange={(e) => onProgressNoteChange(e.target.value)}
        rows={3}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none text-sm"
        disabled={!canAddEntries}
      />
    </div>
    <button
      onClick={onAddProgressNote}
      disabled={!currentProgressNote.trim() || addingProgressNote || !canAddEntries}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 text-sm"
    >
      {addingProgressNote ? 'Adding...' : 'Add Progress Note'}
    </button>

    {progressNotes.length > 0 && (
      <div className="mt-3 space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Previous Notes</h4>
        {progressNotes.map((note, index) => (
          <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-700 text-sm">{note.note}</p>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(note.createdAt).toLocaleString()} • By: {note.createdBy}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);