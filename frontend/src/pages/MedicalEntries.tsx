// src/pages/MedicalEntries.tsx - UPDATED with Daycase, Detention, IPD distinction
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { useWardStore } from '../store/wardStore'; // ✅ ADD THIS
import { useToast } from '../store/toastStore';
import { useWorklistStore } from '../store/worklistStore';
import { WorklistPanel } from '../components/worklist/WorklistPanel';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';
import { getPatientName } from '../utils/patient';

import { DiagnosisModal } from '../components/medical-entries/modals/DiagnosisModal';
import { LabTestModal } from '../components/medical-entries/modals/LabTestModal';
import { ProcedureModal } from '../components/medical-entries/modals/ProcedureModal';
import { MedicationModal } from '../components/medical-entries/modals/MedicationModal';
import { ScanModal } from '../components/medical-entries/modals/ScanModal';

import ComplaintInput from '../components/ComplaintInput';
import ODQInput from '../components/medical-entries/ODQInput';
import { useAdmissionStore } from '../store/admissionStore';

import {
  ChevronLeft, RefreshCw, Stethoscope, Pill, FlaskConical, Info,Building2 , 
  Scissors, Scan, FileText, Activity, AlertCircle, Plus, Trash2,
  Hospital, User, Calendar, DollarSign, Clock, Heart, Thermometer,
  Wind, Droplets, Gauge, Weight, Ruler, CheckCircle, XCircle,
  Printer, History, Eye, Edit, ClipboardList, Microscope, Image, Users,
  ArrowRight, ChevronDown, ChevronUp, Moon, Sun, Bed,
} from 'lucide-react';

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined =>
  entity?._id || entity?.id;

type ModalType = 'diagnosis' | 'lab' | 'procedure' | 'medication' | 'scan' | null;

// ─── Reusable section card ───────────────────────────────────────────────────
const SectionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  count?: number;
  countColor?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  maxH?: string;
}> = ({ icon, title, count, countColor = 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]', action, children, maxH = 'max-h-72' }) => (
  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden flex flex-col">
    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex-shrink-0">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold text-[var(--text-primary)] tracking-tight">{title}</span>
        {count !== undefined && count > 0 && (
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${countColor}`}>{count}</span>
        )}
      </div>
      {action}
    </div>
    <div className={`${maxH} overflow-y-auto`} style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border-color) transparent' }}>
      {children}
    </div>
  </div>
);

// ─── Empty state ─────────────────────────────────────────────────────────────
const EmptyState: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex flex-col items-center justify-center py-10 gap-2">
    <div className="opacity-20">{icon}</div>
    <p className="text-xs text-[var(--text-tertiary)]">{label}</p>
  </div>
);

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    requested:   'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]',
    scheduled:   'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]',
    prescribed:  'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]',
    dispensed:   'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
    completed:   'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
    cancelled:   'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]',
    pending:     'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]',
    in_progress: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]',
  };
  const cls = map[status?.toLowerCase()] ?? 'bg-[var(--bg-main)] text-[var(--text-secondary)]';
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>
      {status?.replace('_', ' ')}
    </span>
  );
};

// ─── Add button ───────────────────────────────────────────────────────────────
const AddBtn: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold
      bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]
      hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all"
  >
    <Plus className="w-3 h-3" />{label}
  </button>
);

// ─── Inline delete button ─────────────────────────────────────────────────────
const DelBtn: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] transition-all"
  >
    <Trash2 className="w-3.5 h-3.5" />
  </button>
);

// ─── Table shell ──────────────────────────────────────────────────────────────
const Table: React.FC<{ heads: string[]; children: React.ReactNode }> = ({ heads, children }) => (
  <table className="w-full text-xs">
    <thead className="sticky top-0 z-10 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
      <tr>
        {heads.map(h => (
          <th key={h} className="px-3 py-2 text-left font-semibold text-[var(--text-tertiary)] whitespace-nowrap">{h}</th>
        ))}
      </tr>
    </thead>
    <tbody className="divide-y divide-[var(--border-color)]">{children}</tbody>
  </table>
);

const Td: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <td className={`px-3 py-2 text-[var(--text-secondary)] ${className}`}>{children}</td>
);

const TdPrimary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <td className="px-3 py-2 text-[var(--text-primary)] font-medium">{children}</td>
);

// ─── Scan result modal ────────────────────────────────────────────────────────
const ScanResultForm: React.FC<{
  scan: any;
  onSaveResult: (id: string, data: any) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}> = ({ scan, onSaveResult, onClose, saving }) => {
  const [findings, setFindings]     = useState(scan.findings || '');
  const [impression, setImpression] = useState(scan.impression || '');
  const [result, setResult]         = useState(scan.result || '');

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-xl border border-[var(--border-color)] overflow-hidden"
        style={{ boxShadow: 'var(--shadow-md)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
          <div className="flex items-center gap-2">
            <Image className="w-4 h-4 text-[var(--icon-cyan-text)]" />
            <span className="text-sm font-bold text-[var(--text-primary)]">Enter Scan Results</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--border-color)] text-[var(--text-tertiary)] transition-colors">
            <XCircle className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Scan info */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)]">
            <div className="w-8 h-8 rounded-lg bg-[var(--icon-cyan-bg)] flex items-center justify-center flex-shrink-0">
              <Scan className="w-4 h-4 text-[var(--icon-cyan-text)]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                {scan.scanType || scan.ServiceCatalog?.name}
              </p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                {scan.bodyPart && <span>Body part: {scan.bodyPart} · </span>}
                Requested by {scan.requestedBy?.fullName || 'Unknown'} on {new Date(scan.requestedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {[
            { label: 'Findings', value: findings, set: setFindings, rows: 5, placeholder: 'Describe radiological findings in detail…' },
            { label: 'Impression / Conclusion', value: impression, set: setImpression, rows: 3, placeholder: 'Clinical impression based on findings…' },
            { label: 'Additional Notes', value: result, set: setResult, rows: 2, placeholder: 'Any supplementary comments…' },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{f.label}</label>
              <textarea
                value={f.value}
                onChange={e => f.set(e.target.value)}
                rows={f.rows}
                placeholder={f.placeholder}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg
                  text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]
                  focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)] resize-none transition-all"
              />
            </div>
          ))}

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => onSaveResult(scan.id, { findings, impression, result, status: 'completed', completedAt: new Date().toISOString() })}
              disabled={saving}
              className="flex-1 py-2 rounded-lg text-xs font-semibold bg-[var(--icon-cyan-text)] text-white
                hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {saving ? 'Saving…' : 'Save Results'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-xs font-semibold border border-[var(--border-color)]
                text-[var(--text-secondary)] hover:bg-[var(--bg-main)] transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Patient Status Badge Component ──────────────────────────────────────────
const PatientStatusBadge: React.FC<{ attendance: any; admissionType?: string }> = ({ attendance, admissionType }) => {
  const status = attendance?.status;
  const category = attendance?.encounterCategory;
  const admType = admissionType || attendance?.admissionType;

  // IPD with detention observation
  if (category === 'ipd' && admType === 'detention_observation') {
    return (
      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold
        border border-[var(--icon-orange-text)] bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]">
        <Moon className="w-3 h-3" /> OBSERVATION (DETENTION)
      </span>
    );
  }
  
  // IPD formal admission
  if (status === 'admitted' && category === 'ipd') {
    return (
      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold
        border border-[var(--icon-green-text)] bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]">
        <Hospital className="w-3 h-3" /> ADMITTED (IPD)
      </span>
    );
  }
  
  // Day surgery (daycase)
  if (category === 'daycase') {
    return (
      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold
        border border-[var(--icon-purple-text)] bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]">
        <Sun className="w-3 h-3" /> DAY SURGERY
      </span>
    );
  }
  
  // OPD
  if (category === 'opd' || !category) {
    return (
      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold
        border border-[var(--icon-cyan-text)] bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">
        <User className="w-3 h-3" /> OUTPATIENT (OPD)
      </span>
    );
  }

  return null;
};

// ─── NEW: Bed/Ward Selection Modal ───────────────────────────────────────────
const BedWardSelectionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bedId: string, wardId: string, wardName: string, bedNumber: string) => Promise<void>;
  admissionType: 'day_surgery' | 'detention' | 'ipd';
  isLoading: boolean;
}> = ({ isOpen, onClose, onConfirm, admissionType, isLoading }) => {
  const { wards, beds, getWards, getBeds, getAvailableBeds, availableBeds, isLoading: wardsLoading } = useWardStore();
  const [selectedWardId, setSelectedWardId] = useState('');
  const [selectedBedId, setSelectedBedId] = useState('');
  const [availableBedsInWard, setAvailableBedsInWard] = useState<any[]>([]);
  const [selectedWardName, setSelectedWardName] = useState('');
  const [selectedBedNumber, setSelectedBedNumber] = useState('');

  // Load wards on mount
  useEffect(() => {
    if (isOpen) {
      getWards();
      getAvailableBeds();
    }
  }, [isOpen]);

  // Filter available beds when ward changes
  useEffect(() => {
    if (selectedWardId) {
      const wardBeds = availableBeds.filter(bed => bed.wardId === selectedWardId);
      setAvailableBedsInWard(wardBeds);
      setSelectedBedId('');
      setSelectedBedNumber('');
    } else {
      setAvailableBedsInWard([]);
    }
  }, [selectedWardId, availableBeds]);

  const handleWardSelect = (wardId: string, wardName: string) => {
    setSelectedWardId(wardId);
    setSelectedWardName(wardName);
  };

  const handleBedSelect = (bedId: string, bedNumber: string) => {
    setSelectedBedId(bedId);
    setSelectedBedNumber(bedNumber);
  };

  const handleConfirm = () => {
    if (!selectedWardId || !selectedBedId) {
      return;
    }
    onConfirm(selectedBedId, selectedWardId, selectedWardName, selectedBedNumber);
  };

  const getTitle = () => {
    switch (admissionType) {
      case 'day_surgery': return 'Assign Bed for Day Surgery';
      case 'detention': return 'Assign Bed for Observation/Detention';
      case 'ipd': return 'Assign Bed for Admission (IPD)';
      default: return 'Assign Bed';
    }
  };

  const getSubtitle = () => {
    switch (admissionType) {
      case 'day_surgery': return 'Patient will be discharged same day after procedure';
      case 'detention': return 'Patient will be under observation for 12-72 hours';
      case 'ipd': return 'Formal admission for ongoing treatment';
      default: return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-2xl border border-[var(--border-color)] overflow-hidden"
        style={{ boxShadow: 'var(--shadow-md)' }}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
          <div className="flex items-center gap-2">
            <Bed className="w-4 h-4 text-[var(--icon-cyan-text)]" />
            <span className="text-sm font-bold text-[var(--text-primary)]">{getTitle()}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--border-color)] text-[var(--text-tertiary)] transition-colors">
            <XCircle className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Info banner */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--icon-cyan-bg)]/10 border border-[var(--icon-cyan-text)]/20">
            <Info className="w-4 h-4 text-[var(--icon-cyan-text)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">Bed Assignment Required</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{getSubtitle()}</p>
            </div>
          </div>

          {wardsLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-[var(--icon-cyan-text)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Step 1: Select Ward */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] mb-2">
                  <Building2 className="w-3.5 h-3.5" />
                  Step 1: Select Ward
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {wards.filter(w => w.isActive !== false).map((ward) => {
                    const availableCount = availableBeds.filter(b => b.wardId === ward.id).length;
                    const isSelected = selectedWardId === ward.id;
                    return (
                      <button
                        key={ward.id}
                        onClick={() => handleWardSelect(ward.id, ward.wardName)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          isSelected 
                            ? 'border-[var(--icon-cyan-text)] bg-[var(--icon-cyan-bg)]/20 ring-1 ring-[var(--icon-cyan-text)]'
                            : 'border-[var(--border-color)] hover:border-[var(--icon-cyan-text)] hover:bg-[var(--bg-main)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-[var(--text-primary)]">{ward.wardName}</span>
                          {availableCount > 0 ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]">
                              {availableCount} beds
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]">
                              Full
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                          Total beds: {ward.totalBeds} · Occupied: {ward.occupiedBeds || 0}
                        </p>
                      </button>
                    );
                  })}
                  {wards.length === 0 && (
                    <div className="col-span-2 text-center py-4 text-[var(--text-tertiary)]">
                      No wards available. Please create a ward first.
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: Select Bed (only if ward selected) */}
              {selectedWardId && (
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] mb-2">
                    <Bed className="w-3.5 h-3.5" />
                    Step 2: Select Bed in {selectedWardName}
                  </label>
                  {availableBedsInWard.length === 0 ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--icon-red-bg)]/10 border border-[var(--icon-red-text)]/20">
                      <AlertTriangle className="w-4 h-4 text-[var(--icon-red-text)]" />
                      <span className="text-xs text-[var(--text-secondary)]">No available beds in this ward. Please select another ward.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {availableBedsInWard.map((bed) => (
                        <button
                          key={bed.id}
                          onClick={() => handleBedSelect(bed.id, bed.bedNumber)}
                          className={`p-2 rounded-lg border text-center transition-all ${
                            selectedBedId === bed.id
                              ? 'border-[var(--icon-cyan-text)] bg-[var(--icon-cyan-bg)]/20 ring-1 ring-[var(--icon-cyan-text)]'
                              : 'border-[var(--border-color)] hover:border-[var(--icon-cyan-text)] hover:bg-[var(--bg-main)]'
                          }`}
                        >
                          <Bed className="w-4 h-4 mx-auto mb-1 text-[var(--text-secondary)]" />
                          <span className="text-xs font-semibold text-[var(--text-primary)]">Bed {bed.bedNumber}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-[var(--border-color)] bg-[var(--bg-main)]">
          <button
            onClick={handleConfirm}
            disabled={!selectedWardId || !selectedBedId || isLoading}
            className="flex-1 py-2 rounded-lg text-sm font-semibold bg-[var(--icon-cyan-text)] text-white 
              hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? 'Processing...' : 'Confirm Assignment'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-semibold border border-[var(--border-color)]
              text-[var(--text-secondary)] hover:bg-[var(--bg-main)] transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};


const PhysicianNoteInput: React.FC<{
  attendanceId: string;
  userName: string;
  userId?: string;
  onSaved: () => void;
}> = ({ attendanceId, userName, userId, onSaved }) => {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const { updateAttendance, currentAttendance } = useAttendanceStore();
  const { success, error: toastError } = useToast();

  const handleSave = async () => {
    if (!text.trim() || !attendanceId) return;
    setSaving(true);
    const newNote = {
      author: userName,
      createdBy: { fullName: userName, id: userId },
      createdAt: new Date().toISOString(),
      content: text.trim(),
    };
    const existing = (currentAttendance as any)?.physicianNotes || [];
    try {
      await updateAttendance(attendanceId, {
        physicianNotes: [...existing, newNote],
        updatedById: userId,
      });
      setText('');
      success('Saved', 'Physician note added');
      onSaved();
    } catch (err: any) {
      toastError('Save failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex-shrink-0">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={3}
        placeholder="Add physician note…"
        className="w-full px-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg
          focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)] resize-none
          text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-all"
      />
      <button
        onClick={handleSave}
        disabled={saving || !text.trim()}
        className="mt-2 w-full py-1.5 rounded-lg text-xs font-semibold
          bg-[var(--icon-cyan-text)] text-white hover:opacity-90 disabled:opacity-40 transition-all"
      >
        {saving ? 'Saving…' : 'Add Note'}
      </button>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function MedicalEntries() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const { patients, loadPatients } = usePatientStore();
  const { attendanceId } = useParams();
  const [searchParams] = useSearchParams();
  const { createAdmission, getAdmissions, convertDetentionToIPD, getDetentionPatients, getFormalIPDPatients } = useAdmissionStore();
  const { updateAttendance } = useAttendanceStore();
  const { updateBed } = useWardStore();
  const {
    attendances, currentAttendance, getAttendance, getAttendances,
    removeDiagnosis, removeLabTest, removeProcedure, removeMedication, removeScan,
    updateScanStatus, canAddMedicalEntries, getVitalsByAttendance, calculateBill,
  } = useAttendanceStore();

  const {
    diagnoses, labTestTemplates, procedureTemplates, scanTemplates,
    getDiagnoses, getLabTestTemplates, getProcedureTemplates, getScanTemplates,
  } = useMedicalServicesStore();

  const { stockItems, getStockItems } = useStockStore();
  const { user } = useAuthStore();

  const [isLoading, setIsLoading]             = useState(true);
  const [refreshing, setRefreshing]           = useState(false);
  const [selectedPatientId, setSelectedPatientId]       = useState('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState('');
  const [latestVitals, setLatestVitals]       = useState<any>(null);
  const [scanResultFor, setScanResultFor]     = useState<any>(null);
  const [savingResult, setSavingResult]       = useState(false);
  const [showWorklist, setShowWorklist]       = useState(false);
  const [showDetentionModal, setShowDetentionModal] = useState(false);
    // Bed/Ward selection modal state
  const [showBedWardModal, setShowBedWardModal] = useState(false);
  const [pendingAdmissionType, setPendingAdmissionType] = useState<'day_surgery' | 'detention' | 'ipd' | null>(null);
  const [detentionHours, setDetentionHours]   = useState(24);
  const [detentionReason, setDetentionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [presentedComplaints, setPresentedComplaints] = useState('');
  const [hpc, setHpc]                         = useState('');
  const [odq, setOdq]                         = useState('');
  const [physicalExam, setPhysicalExam]       = useState('');
  const [treatmentPlan, setTreatmentPlan]     = useState('');
  const [followUpDate, setFollowUpDate]       = useState('');
  const [treatmentNotes, setTreatmentNotes] = useState<{ author: string; date: string; text: string }[]>([]);
  const [physicianNoteText, setPhysicianNoteText] = useState('');
  const [physicianNotes, setPhysicianNotes] = useState<{ author: string; date: string; text: string }[]>([]);
  const [modalType, setModalType]             = useState<ModalType>(null);

  const loadData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadPatients(), getAttendances(), getStockItems(),
        getDiagnoses(), getLabTestTemplates(), getProcedureTemplates(), getScanTemplates(),
      ]);
    } catch (err: any) {
      toastError('Load failed', err.message);
    } finally {
      setRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!selectedAttendanceId) return;
    getVitalsByAttendance(selectedAttendanceId)
      .then(v => setLatestVitals(v?.length ? v[v.length - 1] : null))
      .catch(() => setLatestVitals(null));
  }, [selectedAttendanceId]);

  useEffect(() => {
    if (!attendanceId) return;
    // Load the specific attendance directly (don't gate on the paginated global list,
    // which may not contain it) and derive the patient from the loaded record.
    setSelectedAttendanceId(attendanceId);
    getAttendance(attendanceId)
      .then(att => { if (att?.patientId) setSelectedPatientId(att.patientId); })
      .catch(() => {});
  }, [attendanceId]);

  useEffect(() => {
    if (!selectedAttendanceId) return;
    getAttendance(selectedAttendanceId).then(att => {
      if (!att) return;
      setPresentedComplaints(att.complaints || '');
      setHpc((att as any).historyPresentingComplaint || '');
      setOdq((att as any).onsetDurationQuality || '');
      setPhysicalExam((att as any).physicalExamination || '');
      setFollowUpDate((att as any).followUpDate ? new Date((att as any).followUpDate).toISOString().slice(0, 16) : '');
      setTreatmentNotes((att as any).treatmentNotes || []);
      setPhysicianNotes((att as any).physicianNotes || []);
      setTreatmentPlan('');
    });
  }, [selectedAttendanceId]);

  useEffect(() => {
    if (!selectedAttendanceId) return;
    getAttendance(selectedAttendanceId).then(att => {
      if (!att) return;
      setPresentedComplaints(att.complaints || '');
      setHpc((att as any).historyPresentingComplaint || '');
      setOdq((att as any).onsetDurationQuality || '');
      setPhysicalExam((att as any).physicalExamination || '');
      setFollowUpDate((att as any).followUpDate ? new Date((att as any).followUpDate).toISOString().slice(0, 16) : '');
      // Load persisted treatment notes
      setTreatmentNotes((att as any).treatmentNotes || []);
      // Clear treatment plan input (it's now a draft field, not the saved value)
      setTreatmentPlan('');
    });
  }, [selectedAttendanceId]);

  const selectedPatient  = patients.find(p => getEntityId(p) === selectedPatientId)
    || (currentAttendance as any)?.Patient || null;
  const canAddEntries    = currentAttendance ? canAddMedicalEntries(currentAttendance) : false;

  const diagnosesList    = currentAttendance?.AttendanceDiagnosis || [];
  const labTestsList     = currentAttendance?.LabTest || [];
  const proceduresList   = currentAttendance?.Procedure || [];
  const medicationsList  = currentAttendance?.Medication || [];
  const scansList        = currentAttendance?.Scan || [];
  const dispensedMeds    = medicationsList.filter(m => m.status === 'dispensed');
  const requestedScans   = scansList.filter(s => s.status === 'requested' || s.status === 'scheduled');
  const completedScans   = scansList.filter(s => s.status === 'completed');

  const handleClearSelection = () => {
    setSelectedPatientId(''); setSelectedAttendanceId('');
    setPresentedComplaints(''); setHpc(''); setOdq('');
    setPhysicalExam(''); setTreatmentPlan(''); setFollowUpDate('');
    setTreatmentNotes([]); setPhysicianNotes([]); // ← add these
    setPhysicianNoteText('');
  };

  const handleSaveClinical = async () => {
    if (!selectedAttendanceId) return;
    try {
      await updateAttendance(selectedAttendanceId, {
        complaints: presentedComplaints,
        historyPresentingComplaint: hpc,
        onsetDurationQuality: odq,
        physicalExamination: physicalExam,
        treatmentPlan,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        updatedById: user?.id,
      });
      success('Saved', 'Clinical information updated');
      await getAttendance(selectedAttendanceId);
    } catch (err: any) { toastError('Save failed', err.message); }
  };

  // Add this function alongside handleSaveClinical
  const handleSaveTreatmentNote = async () => {
    if (!selectedAttendanceId || !treatmentPlan.trim()) return;
    const newNote = {
      author: user?.fullName || 'Physician',
      date: new Date().toISOString(),
      text: treatmentPlan.trim(),
    };
    const updatedNotes = [...treatmentNotes, newNote];
    try {
      await updateAttendance(selectedAttendanceId, {
        treatmentNotes: updatedNotes,
        updatedById: user?.id,
      });
      setTreatmentNotes(updatedNotes);
      setTreatmentPlan(''); // clear input after saving
      success('Saved', 'Treatment note added');
      await getAttendance(selectedAttendanceId);
    } catch (err: any) {
      toastError('Save failed', err.message);
    }
  };

  const handleSavePhysicianNote = async () => {
    if (!selectedAttendanceId || !physicianNoteText.trim()) return;
    const newNote = {
      author: user?.fullName || 'Physician',
      date: new Date().toISOString(),
      text: physicianNoteText.trim(),
    };
    const updatedNotes = [...physicianNotes, newNote];
    try {
      await updateAttendance(selectedAttendanceId, {
        physicianNotes: updatedNotes,
        updatedById: user?.id,
      });
      setPhysicianNotes(updatedNotes);
      setPhysicianNoteText('');
      success('Saved', 'Physician note added');
      await getAttendance(selectedAttendanceId);
    } catch (err: any) {
      toastError('Save failed', err.message);
    }
  };

  // ─── DAY SURGERY (Daycase) with Bed Assignment ─────────────────────────────
  const handleDaySurgery = () => {
    setPendingAdmissionType('day_surgery');
    setShowBedWardModal(true);
  };

  const executeDaySurgery = async (bedId: string, wardId: string, wardName: string, bedNumber: string) => {
    if (!selectedAttendanceId || !currentAttendance || !selectedPatient) return;
    
    setIsProcessing(true);
    try {
      // Update the bed to occupied
      await updateBed(bedId, { 
        isOccupied: true, 
        currentPatientId: selectedPatientId 
      });

      // Update attendance
      await updateAttendance(selectedAttendanceId, { 
        encounterCategory: 'daycase', 
        status: 'admitted',
        attendanceType: 'surgery',
        bedId: bedId,
        wardId: wardId,
        updatedById: user?.id 
      });
      
      success('Day Surgery', `Patient assigned to Bed ${bedNumber} in ${wardName} for day surgery`);
      await getAttendance(selectedAttendanceId);
      await getAttendances();
      setShowBedWardModal(false);
      setPendingAdmissionType(null);
    } catch (err: any) { 
      toastError('Day Surgery Failed', err.response?.data?.message || err.message); 
    } finally {
      setIsProcessing(false);
    }
  };


  // ─── DETENTION / OBSERVATION with Bed Assignment ───────────────────────────
  const handleDetainPatient = () => {
    setPendingAdmissionType('detention');
    setShowBedWardModal(true);
  };

  const executeDetention = async (bedId: string, wardId: string, wardName: string, bedNumber: string) => {
    if (!selectedAttendanceId || !currentAttendance || !selectedPatient) return;
    
    setIsProcessing(true);
    try {
      // Update the bed to occupied
      await updateBed(bedId, { 
        isOccupied: true, 
        currentPatientId: selectedPatientId 
      });

      // Create admission with detention_observation type
      await createAdmission({
        attendanceId: selectedAttendanceId,
        admissionType: 'detention_observation',
        admissionSource: 'opd',
        admissionDate: new Date().toISOString(),
      });
      
      // Update attendance
      await updateAttendance(selectedAttendanceId, { 
        encounterCategory: 'ipd', 
        status: 'admitted',
        admissionType: 'detention_observation',
        bedId: bedId,
        wardId: wardId,
        medicalNotes: `${currentAttendance.medicalNotes || ''}\n\n[Detention] ${detentionReason || 'Placed under observation for monitoring'}. Expected observation period: ${detentionHours} hours. Bed: ${bedNumber}, Ward: ${wardName}`,
        updatedById: user?.id 
      });
      
      success('Detained', `Patient placed under observation for ${detentionHours} hours in Bed ${bedNumber}, ${wardName}`);
      await getAttendance(selectedAttendanceId);
      await getAttendances();
      await getDetentionPatients();
      setShowBedWardModal(false);
      setPendingAdmissionType(null);
      setDetentionHours(24);
      setDetentionReason('');
    } catch (err: any) { 
      toastError('Detention Failed', err.response?.data?.message || err.message); 
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── FORMAL IPD ADMISSION with Bed Assignment ──────────────────────────────
  const handleDirectAdmit = () => {
    setPendingAdmissionType('ipd');
    setShowBedWardModal(true);
  };

  const executeAdmission = async (bedId: string, wardId: string, wardName: string, bedNumber: string) => {
    if (!selectedAttendanceId || !currentAttendance || !selectedPatient) return;
    
    setIsProcessing(true);
    try {
      // Update the bed to occupied
      await updateBed(bedId, { 
        isOccupied: true, 
        currentPatientId: selectedPatientId 
      });

      // Create formal admission
      await createAdmission({
        attendanceId: selectedAttendanceId,
        admissionType: 'emergency',
        admissionSource: 'opd',
        admissionDate: new Date().toISOString(),
      });
      
      // Update attendance
      await updateAttendance(selectedAttendanceId, { 
        encounterCategory: 'ipd', 
        status: 'admitted',
        admissionType: 'emergency',
        bedId: bedId,
        wardId: wardId,
        updatedById: user?.id 
      });
      
      success('Admitted', `Patient admitted to Bed ${bedNumber} in ${wardName} as formal IPD`);
      await getAttendance(selectedAttendanceId);
      await getAdmissions();
      await getFormalIPDPatients();
      setShowBedWardModal(false);
      setPendingAdmissionType(null);
    } catch (err: any) { 
      toastError('Admission Failed', err.response?.data?.message || err.message); 
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle bed/ward confirmation
  const handleBedWardConfirm = async (bedId: string, wardId: string, wardName: string, bedNumber: string) => {
    switch (pendingAdmissionType) {
      case 'day_surgery':
        await executeDaySurgery(bedId, wardId, wardName, bedNumber);
        break;
      case 'detention':
        await executeDetention(bedId, wardId, wardName, bedNumber);
        break;
      case 'ipd':
        await executeAdmission(bedId, wardId, wardName, bedNumber);
        break;
      default:
        break;
    }
  };

  // ─── CONVERT DETENTION TO FORMAL IPD ───────────────────────────────────────
  const handleConvertToIPD = async () => {
    if (!selectedAttendanceId || !currentAttendance) return;
    try {
      await convertDetentionToIPD(selectedAttendanceId, {
        admissionType: 'emergency',
        decisionReason: 'Clinical deterioration requiring full admission',
        clinicalNotes: treatmentPlan || 'Patient requires continued care beyond observation period'
      });
      
      success('Converted', 'Patient converted to formal IPD admission');
      await getAttendance(selectedAttendanceId);
      await getAdmissions();
      await getDetentionPatients();
      await getFormalIPDPatients();
    } catch (err: any) { 
      toastError('Conversion Failed', err.response?.data?.message || err.message); 
    }
  };

  // ─── DISCHARGE FROM OBSERVATION ────────────────────────────────────────────
  const handleDischargeFromObservation = async () => {
    if (!selectedAttendanceId || !currentAttendance) return;
    try {
      await updateAttendance(selectedAttendanceId, { 
        status: 'discharged',
        bedId: null,
        updatedById: user?.id 
      });
      success('Discharged', 'Patient discharged from observation');
      await getAttendance(selectedAttendanceId);
      await getDetentionPatients();
    } catch (err: any) { 
      toastError('Discharge Failed', err.message); 
    }
  };

  const handleDeleteItem = async (type: string, id: string) => {
    if (!selectedAttendanceId) return;
    try {
      const fn: Record<string, () => Promise<void>> = {
        diagnosis:  () => removeDiagnosis(selectedAttendanceId, id),
        lab:        () => removeLabTest(selectedAttendanceId, id),
        procedure:  () => removeProcedure(selectedAttendanceId, id),
        medication: () => removeMedication(selectedAttendanceId, id),
        scan:       () => removeScan(selectedAttendanceId, id),
      };
      await fn[type]?.();
      success('Removed', `${type} entry deleted`);
      await getAttendance(selectedAttendanceId);
      await calculateBill(selectedAttendanceId);
    } catch (err: any) { toastError('Delete failed', err.message); }
  };

  const handleSaveScanResult = async (scanId: string, resultData: any) => {
    if (!selectedAttendanceId) return;
    setSavingResult(true);
    try {
      await updateScanStatus(selectedAttendanceId, scanId, { ...resultData, performedById: user?.id, performedAt: new Date().toISOString() });
      success('Saved', 'Scan results recorded');
      await getAttendance(selectedAttendanceId);
      setScanResultFor(null);
    } catch (err: any) { toastError('Save failed', err.message); }
    finally { setSavingResult(false); }
  };

  const getVitalColor = (type: string, value: any) => {
    if (!value) return 'text-[var(--text-tertiary)]';
    switch (type) {
      case 'bp': {
        const [s, d] = String(value).split('/').map(Number);
        if (s > 140 || d > 90) return 'text-[var(--icon-red-text)]';
        if (s < 90  || d < 60) return 'text-[var(--icon-yellow-text)]';
        return 'text-[var(--icon-green-text)]';
      }
      case 'temp':  return value > 38 ? 'text-[var(--icon-red-text)]' : value < 35 ? 'text-[var(--icon-yellow-text)]' : 'text-[var(--icon-green-text)]';
      case 'pulse': return (value > 100 || value < 60) ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-green-text)]';
      case 'spo2':  return value < 95 ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-green-text)]';
      default:      return 'text-[var(--text-primary)]';
    }
  };

  const afterModal = async () => {
    setModalType(null);
    if (selectedAttendanceId) { await getAttendance(selectedAttendanceId); await calculateBill(selectedAttendanceId); }
  };

  // Get action buttons - modified to show the new handlers
  const getActionButtons = () => {
    const category = currentAttendance?.encounterCategory;
    const status = currentAttendance?.status;
    const admissionType = currentAttendance?.admissionType;
    
    if (status === 'discharged' || status === 'completed') return null;
    
    // Detention/Observation patient
    if (category === 'ipd' && admissionType === 'detention_observation') {
      return (
        <div className="flex gap-2">
          <button
            onClick={handleConvertToIPD}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
              bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]
              hover:bg-[var(--icon-purple-text)] hover:text-white transition-all"
          >
            <ArrowRight className="w-3.5 h-3.5" /> Convert to IPD
          </button>
          <button
            onClick={handleDischargeFromObservation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
              bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]
              hover:bg-[var(--icon-green-text)] hover:text-white transition-all"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Discharge
          </button>
        </div>
      );
    }
    
    // Formal IPD patient
    if (status === 'admitted' && category === 'ipd') {
      return (
        <button
          onClick={() => navigate(`/dashboard/admissions/${currentAttendance?.Admission?.id || ''}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
            bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]
            hover:bg-[var(--icon-green-text)] hover:text-white transition-all"
        >
          <Hospital className="w-3.5 h-3.5" /> Manage Admission
        </button>
      );
    }
    
    // Not admitted yet - show options
    return (
      <div className="flex gap-2">
        <button
          onClick={handleDaySurgery}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
            bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]
            hover:bg-[var(--icon-purple-text)] hover:text-white transition-all"
        >
          <Sun className="w-3.5 h-3.5" /> Day Surgery
        </button>
        <button
          onClick={handleDetainPatient}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
            bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]
            hover:bg-[var(--icon-orange-text)] hover:text-white transition-all"
        >
          <Moon className="w-3.5 h-3.5" /> Detain/Observe
        </button>
        <button
          onClick={handleDirectAdmit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
            bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]
            hover:bg-[var(--icon-green-text)] hover:text-white transition-all"
        >
          <Hospital className="w-3.5 h-3.5" /> Admit (IPD)
        </button>
      </div>
    );
  };

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-[var(--icon-cyan-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-[var(--text-secondary)]">Loading medical entries…</p>
      </div>
    </div>
  );

  // ─── Payment mode badge ───────────────────────────────────────────────────
  const paymentBadge = (() => {
    const mode = currentAttendance?.paymentMode;
    if (mode === 'nhis')             return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]';
    if (mode === 'private_insurance') return 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]';
    return 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]';
  })();

  const paymentLabel = (() => {
    const mode = currentAttendance?.paymentMode;
    if (mode === 'nhis')             return 'NHIS';
    if (mode === 'private_insurance') return 'PRIVATE INS.';
    return 'CASH';
  })();

  // ─── Status badge class ───────────────────────────────────────────────────
  const statusBadgeClass = (() => {
    const s = currentAttendance?.status;
    if (s === 'admitted')  return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]';
    if (s === 'completed') return 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]';
    if (s === 'pending')   return 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]';
    if (s === 'discharged')return 'bg-[var(--icon-gray-bg)] text-[var(--text-secondary)]';
    return 'bg-[var(--bg-main)] text-[var(--text-secondary)]';
  })();

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Bed/Ward Selection Modal */}
      <BedWardSelectionModal
        isOpen={showBedWardModal}
        onClose={() => {
          setShowBedWardModal(false);
          setPendingAdmissionType(null);
        }}
        onConfirm={handleBedWardConfirm}
        admissionType={pendingAdmissionType || 'ipd'}
        isLoading={isProcessing}
      />

      {/* Detention Modal */}
      {showDetentionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-md border border-[var(--border-color)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-[var(--icon-orange-text)]" />
                <span className="text-sm font-bold text-[var(--text-primary)]">Place Under Observation</span>
              </div>
              <button onClick={() => setShowDetentionModal(false)} className="p-1 rounded hover:bg-[var(--border-color)]">
                <XCircle className="w-4 h-4 text-[var(--text-tertiary)]" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  Expected Observation Period (hours)
                </label>
                <select
                  value={detentionHours}
                  onChange={(e) => setDetentionHours(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm"
                >
                  <option value={12}>12 hours (Half day)</option>
                  <option value={24}>24 hours (1 day)</option>
                  <option value={36}>36 hours (1.5 days)</option>
                  <option value={48}>48 hours (2 days)</option>
                  <option value={72}>72 hours (3 days)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  Reason for Observation
                </label>
                <textarea
                  value={detentionReason}
                  onChange={(e) => setDetentionReason(e.target.value)}
                  rows={3}
                  placeholder="e.g., Chest pain observation, Head injury monitoring, Suspected malaria with unstable vitals..."
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleDetainPatient}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold bg-[var(--icon-orange-text)] text-white hover:opacity-90"
                >
                  Start Observation
                </button>
                <button
                  onClick={() => setShowDetentionModal(false)}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-main)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/medical-waiting-list')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)]
              text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all text-xs font-medium"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <Users className="w-3.5 h-3.5" />
            Waiting List
          </button>

          <div className="h-5 w-px bg-[var(--border-color)]" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--icon-cyan-bg)] flex items-center justify-center">
              <FileText className="w-4 h-4 text-[var(--icon-cyan-text)]" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[var(--text-primary)] leading-tight">Medical Entries</h1>
              <p className="text-[10px] text-[var(--text-tertiary)] leading-tight">Clinical documentation</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)]
              text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all text-xs font-medium"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          <button
            onClick={loadData}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)]
              text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all text-xs font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* ── PATIENT / ATTENDANCE SELECTOR ───────────────────────────────── */}
      <PatientAttendanceSelector
        patients={patients}
        attendances={attendances}
        selectedPatientId={selectedPatientId}
        selectedAttendanceId={selectedAttendanceId}
        onPatientSelect={setSelectedPatientId}
        onAttendanceSelect={setSelectedAttendanceId}
        onClearSelection={handleClearSelection}
      />

      {/* ── MAIN CONTENT (when attendance selected) ──────────────────────── */}
      {selectedAttendanceId && currentAttendance ? (
        <>
          {/* ── PATIENT BANNER ─────────────────────────────────────────── */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] px-5 py-4"
            style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex flex-wrap items-center justify-between gap-4">

              {/* Identity */}
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[var(--icon-cyan-bg)] flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-[var(--icon-cyan-text)]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[var(--text-primary)] leading-tight">
                    {getPatientName(selectedPatient)}
                  </h2>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    {selectedPatient?.age || '—'} yrs · {selectedPatient?.gender} · {selectedPatient?.folderNumber} · {selectedPatient?.contact}
                  </p>
                </div>
              </div>

              {/* Badges + actions */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Payment mode */}
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${paymentBadge}`}>{paymentLabel}</span>

                {/* Status */}
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${statusBadgeClass}`}>
                  {currentAttendance.status?.toUpperCase()}
                </span>

                {/* Patient Type Badge */}
                <PatientStatusBadge 
                  attendance={currentAttendance} 
                  admissionType={currentAttendance.admissionType} 
                />

                {/* Balance warning */}
                {currentAttendance.outstandingBalance > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]">
                    Balance: GHS {currentAttendance.outstandingBalance.toFixed(2)}
                  </span>
                )}

                {/* Action buttons */}
                {getActionButtons()}
              </div>
            </div>
          </div>

          {/* ── VITALS STRIP ───────────────────────────────────────────── */}
          {latestVitals && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] px-5 py-3"
              style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
                {[
                  { icon: <Gauge  className="w-3.5 h-3.5 text-blue-500" />, value: latestVitals.bloodPressure || '—', label: 'BP', type: 'bp' },
                  { icon: <Thermometer className="w-3.5 h-3.5 text-orange-500" />, value: latestVitals.temperature ? `${latestVitals.temperature}°` : '—', label: 'Temp', type: 'temp' },
                  { icon: <Heart  className="w-3.5 h-3.5 text-red-500" />,  value: latestVitals.pulse || '—', label: 'Pulse', type: 'pulse' },
                  { icon: <Wind   className="w-3.5 h-3.5 text-teal-500" />, value: latestVitals.respiration || '—', label: 'Resp', type: null },
                  { icon: <Droplets className="w-3.5 h-3.5 text-sky-500" />, value: latestVitals.spo2 ? `${latestVitals.spo2}%` : '—', label: 'SpO₂', type: 'spo2' },
                  { icon: <Weight className="w-3.5 h-3.5 text-amber-500" />, value: latestVitals.weight ? `${latestVitals.weight}kg` : '—', label: 'Weight', type: null },
                  { icon: <Ruler  className="w-3.5 h-3.5 text-cyan-500" />, value: latestVitals.height ? `${latestVitals.height}cm` : '—', label: 'Height', type: null },
                  { icon: <Activity className="w-3.5 h-3.5 text-violet-500" />, value: latestVitals.bmi || '—', label: 'BMI', type: null },
                  { icon: <Activity className="w-3.5 h-3.5 text-indigo-500" />, value: latestVitals.muac || '—', label: 'MUAC', type: null },
                ].map((v, i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5">
                    {v.icon}
                    <span className={`text-xs font-bold leading-tight ${v.type ? getVitalColor(v.type, v.value) : 'text-[var(--text-primary)]'}`}>
                      {v.value}
                    </span>
                    <span className="text-[9px] text-[var(--text-tertiary)] leading-tight">{v.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TWO-COLUMN LAYOUT ────────────────────────────────────────── */}
          <div className="flex gap-4 items-start">

            {/* LEFT — Main content */}
            <div className="flex-1 min-w-0 space-y-4">

              {/* Clinical presentation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left sub-col */}
                <div className="space-y-3">
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3.5">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                      <FileText className="w-3 h-3" /> Presented Complaints
                    </label>
                    <ComplaintInput value={presentedComplaints} onChange={setPresentedComplaints}
                      placeholder="Search or type complaints…" disabled={!canAddEntries} />
                  </div>
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3.5">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                      <History className="w-3 h-3" /> History of Presenting Complaint
                    </label>
                    <textarea value={hpc} onChange={e => setHpc(e.target.value)} rows={3}
                      disabled={!canAddEntries}
                      placeholder="History of presenting complaint…"
                      className="w-full px-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg
                        focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)] resize-none
                        text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-all" />
                  </div>
                </div>
                {/* Right sub-col */}
                <div className="space-y-3">
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3.5">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                      <Stethoscope className="w-3 h-3" /> Physical Examination
                    </label>
                    <textarea value={physicalExam} onChange={e => setPhysicalExam(e.target.value)} rows={3}
                      disabled={!canAddEntries}
                      placeholder="Physical examination findings…"
                      className="w-full px-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg
                        focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)] resize-none
                        text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-all" />
                  </div>
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3.5">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                      <Clock className="w-3 h-3" /> ODQ (Onset · Duration · Quality)
                    </label>
                    <ODQInput value={odq} onChange={setOdq} disabled={!canAddEntries} />
                  </div>
                </div>
              </div>

              {/* Save clinical */}
              {canAddEntries && (
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveClinical}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold
                      bg-[var(--icon-cyan-text)] text-white hover:opacity-90 transition-all"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Save Clinical Info
                  </button>
                </div>
              )}

              {/* The rest of the sections remain the same as your original */}
              {/* ... (Diagnosis, Lab, Procedures, Medications, Scans sections) ... */}
              
              {/* ── INVESTIGATIONS ─────────────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Requested lab tests */}
                <SectionCard
                  icon={<FlaskConical className="w-4 h-4 text-[var(--icon-purple-text)]" />}
                  title="Investigations Requested"
                  count={labTestsList.length}
                  countColor="bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]"
                  action={canAddEntries && <AddBtn onClick={() => setModalType('lab')} label="Request" />}
                  maxH="max-h-80"
                >
                  {labTestsList.length === 0
                    ? <EmptyState icon={<FlaskConical className="w-9 h-9" />} label="No lab tests requested" />
                    : (
                      <Table heads={['Test', 'Priority', 'Status', 'Date', '']}>
                        {labTestsList.map((t: any) => (
                          <tr key={t.id} className="hover:bg-[var(--bg-main)] transition-colors">
                            <TdPrimary>
                              {t.ServiceCatalog?.name || t.name}
                              {t.notes && <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 line-clamp-1">{t.notes}</p>}
                            </TdPrimary>
                            <Td>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                t.priority === 'stat'   ? 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]' :
                                t.priority === 'urgent' ? 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]' :
                                'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
                              }`}>{t.priority || 'routine'}</span>
                            </Td>
                            <Td><StatusBadge status={t.status} /></Td>
                            <Td>{t.requestedAt ? new Date(t.requestedAt).toLocaleDateString() : t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}</Td>
                            <Td>{canAddEntries && t.status === 'requested' && <DelBtn onClick={() => handleDeleteItem('lab', t.id)} />}</Td>
                          </tr>
                        ))}
                      </Table>
                    )}
                </SectionCard>

                {/* Lab results */}
                <SectionCard
                  icon={<CheckCircle className="w-4 h-4 text-[var(--icon-green-text)]" />}
                  title="Investigation Results"
                  count={labTestsList.filter((t: any) => t.status === 'completed').length}
                  countColor="bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]"
                  maxH="max-h-80"
                >
                  {/* ... keep your existing lab results rendering ... */}
                  {labTestsList.filter((t: any) => t.status === 'completed').length === 0
                    ? <EmptyState icon={<FlaskConical className="w-9 h-9" />} label="No results available yet" />
                    : (
                      <Table heads={['Test / Parameter', 'Result', 'Range', 'Flag', 'Date']}>
                        {labTestsList.filter((t: any) => t.status === 'completed').map((test: any) => (
                          <tr key={test.id} className="hover:bg-[var(--bg-main)] transition-colors">
                            <TdPrimary>{test.ServiceCatalog?.name || test.name}</TdPrimary>
                            <Td>{typeof test.result === 'object' ? JSON.stringify(test.result) : (test.result || '—')}</Td>
                            <Td>{test.normalRange || '—'}</Td>
                            <Td><StatusBadge status={test.status} /></Td>
                            <Td>{test.completedAt ? new Date(test.completedAt).toLocaleDateString() : '—'}</Td>
                          </tr>
                        ))}
                      </Table>
                    )}
                </SectionCard>
              </div>

              {/* ── DIAGNOSIS + PROCEDURES ────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Diagnosis */}
                <SectionCard
                  icon={<Stethoscope className="w-4 h-4 text-[var(--icon-cyan-text)]" />}
                  title="Diagnosis (ICD-10)"
                  count={diagnosesList.length}
                  action={canAddEntries && <AddBtn onClick={() => setModalType('diagnosis')} label="Add" />}
                >
                  {diagnosesList.length === 0
                    ? <EmptyState icon={<Stethoscope className="w-9 h-9" />} label="No diagnoses added" />
                    : (
                      <Table heads={['Diagnosis', 'ICD-10', 'Type', 'By', 'Date', '']}>
                        {diagnosesList.map((item: any) => {
                          const t = item.diagnosisType || (item.primary ? 'primary' : 'additional');
                          const cfg: Record<string, { label: string; cls: string }> = {
                            provisional: { label: 'Provisional', cls: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]' },
                            primary:     { label: 'Primary',     cls: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]' },
                            additional:  { label: 'Additional',  cls: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' },
                          };
                          const c = cfg[t] ?? cfg.additional;
                          return (
                            <tr key={item.id} className="hover:bg-[var(--bg-main)] transition-colors">
                              <TdPrimary>
                                {item.Diagnosis?.name}
                                {item.notes && <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{item.notes}</p>}
                              </TdPrimary>
                              <Td className="font-mono">{item.Diagnosis?.icdCode || '—'}</Td>
                              <Td><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.cls}`}>{c.label}</span></Td>
                              <Td>{item.createdBy?.fullName || '—'}</Td>
                              <Td>{new Date(item.createdAt).toLocaleDateString()}</Td>
                              <Td>{canAddEntries && <DelBtn onClick={() => handleDeleteItem('diagnosis', item.id)} />}</Td>
                            </tr>
                          );
                        })}
                      </Table>
                    )}
                </SectionCard>

                {/* Procedures */}
                <SectionCard
                  icon={<Scissors className="w-4 h-4 text-[var(--icon-orange-text)]" />}
                  title="Procedures & Scheduling"
                  count={proceduresList.length}
                  countColor="bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]"
                  action={canAddEntries && <AddBtn onClick={() => setModalType('procedure')} label="Schedule" />}
                >
                  {proceduresList.length === 0
                    ? <EmptyState icon={<Scissors className="w-9 h-9" />} label="No procedures scheduled" />
                    : (
                      <Table heads={['Procedure', 'Scheduled', 'Status', 'Notes', 'By', '']}>
                        {proceduresList.map((proc: any) => (
                          <tr key={proc.id} className="hover:bg-[var(--bg-main)] transition-colors">
                            <TdPrimary>{proc.ServiceCatalog?.name || proc.name}</TdPrimary>
                            <Td>{proc.scheduledDate ? new Date(proc.scheduledDate).toLocaleString() : '—'}</Td>
                            <Td><StatusBadge status={proc.status} /></Td>
                            <Td className="max-w-[120px] truncate">{proc.notes || '—'}</Td>
                            <Td>{proc.requestedBy || user?.fullName || '—'}</Td>
                            <Td>{canAddEntries && proc.status === 'scheduled' && <DelBtn onClick={() => handleDeleteItem('procedure', proc.id)} />}</Td>
                          </tr>
                        ))}
                      </Table>
                    )}
                </SectionCard>
              </div>

              {/* ── MEDICATIONS ───────────────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Prescribed */}
                <SectionCard
                  icon={<Pill className="w-4 h-4 text-[var(--icon-green-text)]" />}
                  title="Prescribed Medications"
                  count={medicationsList.length}
                  countColor="bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]"
                  action={canAddEntries && <AddBtn onClick={() => setModalType('medication')} label="Prescribe" />}
                >
                  {medicationsList.length === 0
                    ? <EmptyState icon={<Pill className="w-9 h-9" />} label="No medications prescribed" />
                    : (
                      <Table heads={['Medication', 'Dosage', 'Frequency', 'Duration', 'Status', '']}>
                        {medicationsList.map((med: any) => (
                          <tr key={med.id} className="hover:bg-[var(--bg-main)] transition-colors">
                            <TdPrimary>{med.name}</TdPrimary>
                            <Td>{med.dosage || '—'}</Td>
                            <Td>{med.frequency || '—'}</Td>
                            <Td>{med.duration || '—'}</Td>
                            <Td><StatusBadge status={med.status} /></Td>
                            <Td>
                              {canAddEntries && med.status === 'prescribed'
                                ? <DelBtn onClick={() => handleDeleteItem('medication', med.id)} />
                                : med.status === 'dispensed'
                                  ? <CheckCircle className="w-3.5 h-3.5 text-[var(--icon-green-text)]" />
                                  : null}
                            </Td>
                          </tr>
                        ))}
                      </Table>
                    )}
                </SectionCard>

                {/* Dispensed history */}
                <SectionCard
                  icon={<CheckCircle className="w-4 h-4 text-[var(--icon-cyan-text)]" />}
                  title="Dispensed History"
                  count={dispensedMeds.length}
                >
                  {dispensedMeds.length === 0
                    ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-1">
                        <div className="opacity-20"><CheckCircle className="w-9 h-9" /></div>
                        <p className="text-xs text-[var(--text-tertiary)]">No medications dispensed yet</p>
                        {medicationsList.filter(m => m.status === 'prescribed').length > 0 && (
                          <p className="text-[11px] text-[var(--icon-yellow-text)]">
                            {medicationsList.filter(m => m.status === 'prescribed').length} awaiting dispensing
                          </p>
                        )}
                      </div>
                    )
                    : (
                      <Table heads={['Medication', 'Qty', 'Unit Cost', 'Total', 'Dispensed', 'By']}>
                        {dispensedMeds.map((med: any) => (
                          <tr key={med.id} className="hover:bg-[var(--bg-main)] transition-colors">
                            <TdPrimary>{med.name}</TdPrimary>
                            <Td>{med.quantity}</Td>
                            <Td>GHS {(med.unitCost || 0).toFixed(2)}</Td>
                            <Td>GHS {((med.unitCost || 0) * med.quantity).toFixed(2)}</Td>
                            <Td>{med.dispensedAt ? new Date(med.dispensedAt).toLocaleString() : '—'}</Td>
                            <Td>{med.dispensedBy?.fullName || '—'}</Td>
                          </tr>
                        ))}
                      </Table>
                    )}
                </SectionCard>
              </div>

              {/* ── SCANS ─────────────────────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Requested scans */}
                <SectionCard
                  icon={<Scan className="w-4 h-4 text-[var(--icon-purple-text)]" />}
                  title="Scans Requested"
                  count={requestedScans.length}
                  countColor="bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]"
                  action={canAddEntries && <AddBtn onClick={() => setModalType('scan')} label="Request" />}
                >
                  {requestedScans.length === 0
                    ? <EmptyState icon={<Scan className="w-9 h-9" />} label="No scans requested" />
                    : (
                      <Table heads={['Scan', 'Body Part', 'Priority', 'Status', 'Requested', '']}>
                        {requestedScans.map((scan: any) => (
                          <tr key={scan.id} className="hover:bg-[var(--bg-main)] transition-colors">
                            <TdPrimary>{scan.scanType || scan.ServiceCatalog?.name}</TdPrimary>
                            <Td>{scan.bodyPart || '—'}</Td>
                            <Td>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                scan.priority === 'stat'   ? 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]' :
                                scan.priority === 'urgent' ? 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]' :
                                'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
                              }`}>{scan.priority || 'routine'}</span>
                            </Td>
                            <Td><StatusBadge status={scan.status} /></Td>
                            <Td>{new Date(scan.requestedAt).toLocaleDateString()}</Td>
                            <Td>{canAddEntries && (scan.status === 'requested' || scan.status === 'scheduled') && <DelBtn onClick={() => handleDeleteItem('scan', scan.id)} />}</Td>
                          </tr>
                        ))}
                      </Table>
                    )}
                </SectionCard>

                {/* Scan results */}
                <SectionCard
                  icon={<CheckCircle className="w-4 h-4 text-[var(--icon-green-text)]" />}
                  title="Scan Results"
                  count={completedScans.length}
                  countColor="bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]"
                >
                  {completedScans.length === 0
                    ? <EmptyState icon={<Microscope className="w-9 h-9" />} label="No scan results yet" />
                    : (
                      <Table heads={['Scan', 'Findings', 'Impression', 'Completed', '']}>
                        {completedScans.map((scan: any) => (
                          <tr key={scan.id} className="hover:bg-[var(--bg-main)] transition-colors">
                            <TdPrimary>
                              {scan.scanType || scan.ServiceCatalog?.name}
                              {scan.bodyPart && <p className="text-[10px] text-[var(--text-tertiary)]">{scan.bodyPart}</p>}
                            </TdPrimary>
                            <Td className="max-w-[150px] truncate">{scan.findings || '—'}</Td>
                            <Td className="max-w-[150px] truncate">{scan.impression || '—'}</Td>
                            <Td>{scan.completedAt ? new Date(scan.completedAt).toLocaleDateString() : '—'}</Td>
                            <Td>
                              {canAddEntries && (
                                <button onClick={() => setScanResultFor(scan)}
                                  className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] transition-all">
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </Td>
                          </tr>
                        ))}
                      </Table>
                    )}
                </SectionCard>
              </div>

              {/* ── GENERAL INFO ──────────────────────────────────────── */}
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
                  <Calendar className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">General Information</span>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {
                      label: 'Follow-up Date',
                      content: (
                        <input type="datetime-local" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)}
                          disabled={!canAddEntries}
                          className="w-full px-3 py-1.5 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]" />
                      ),
                    },
                    {
                      label: 'Referred To/From',
                      content: <div className="px-3 py-1.5 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)]">{currentAttendance?.referringFacility || '—'}</div>,
                    },
                    {
                      label: 'Admission Status',
                      content: (
                        <div className="px-3 py-1.5 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg">
                          {currentAttendance?.Admission ? (
                            <span className="text-[var(--text-primary)]">
                              Admitted ({currentAttendance.Admission.admissionNumber})
                              {currentAttendance.admissionType && (
                                <span className="ml-1 text-[var(--text-tertiary)]">
                                  - {currentAttendance.admissionType === 'detention_observation' ? 'Observation' : currentAttendance.admissionType}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-[var(--text-secondary)]">Not Admitted</span>
                          )}
                        </div>
                      ),
                    },
                    {
                      label: 'Last Modified By',
                      content: <div className="px-3 py-1.5 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] truncate">{currentAttendance?.updatedBy?.fullName || currentAttendance?.createdBy?.fullName || user?.fullName || '—'} · {new Date(currentAttendance?.updatedAt || currentAttendance?.createdAt).toLocaleString()}</div>,
                    },
                  ].map(f => (
                    <div key={f.label}>
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">{f.label}</p>
                      {f.content}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          {/* RIGHT SIDEBAR */}
          <div className="w-72 xl:w-80 flex-shrink-0">
            <div
              className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden flex flex-col"
              style={{
                position: 'sticky',
                top: '80px',
                height: 'calc(100vh - 100px)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {/* ── PHYSICIAN NOTES ── */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex-shrink-0">
                <ClipboardList className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                <span className="text-xs font-semibold text-[var(--text-primary)]">Physician Notes</span>
              </div>

              {/* Logged notes list */}
              <div
                className="overflow-y-auto p-3 space-y-2 bg-[var(--bg-main)]"
                style={{ flex: '1 1 0', minHeight: 0, scrollbarWidth: 'thin' }}
              >
                {physicianNotes.length > 0 ? (
                  [...physicianNotes].reverse().map((note, i) => (
                    <NoteCard key={i} author={note.author} date={note.date} text={note.text} />
                  ))
                ) : (
                  <p className="text-center text-[10px] text-[var(--text-tertiary)] pt-6">No physician notes yet</p>
                )}
              </div>

              {/* Physician notes input */}
              {canAddEntries && (
                <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex-shrink-0">
                  <textarea
                    value={physicianNoteText}
                    onChange={e => setPhysicianNoteText(e.target.value)}
                    rows={3}
                    placeholder="Add physician note…"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg
                      focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)] resize-none
                      text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-all"
                  />
                  <button
                    onClick={handleSavePhysicianNote}
                    disabled={!physicianNoteText.trim()}
                    className="mt-2 w-full py-1.5 rounded-lg text-xs font-semibold
                      bg-[var(--icon-cyan-text)] text-white hover:opacity-90 disabled:opacity-40 transition-all"
                  >
                    Add Note
                  </button>
                </div>
              )}

              {/* ── DIVIDER ── */}
              <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-main)] border-t border-b border-[var(--border-color)] flex-shrink-0">
                <div className="flex-1 h-px bg-[var(--border-color)]" />
                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
                  <FileText className="w-3 h-3" /> Treatment Plan
                </span>
                <div className="flex-1 h-px bg-[var(--border-color)]" />
              </div>

              {/* Logged treatment notes */}
              <div
                className="overflow-y-auto p-3 space-y-2 bg-[var(--bg-main)]"
                style={{ flex: '1 1 0', minHeight: 0, scrollbarWidth: 'thin' }}
              >
                {treatmentNotes.length > 0 ? (
                  [...treatmentNotes].reverse().map((note, i) => (
                    <NoteCard key={i} author={note.author} date={note.date} text={note.text} />
                  ))
                ) : (
                  <p className="text-center text-[10px] text-[var(--text-tertiary)] pt-6">No treatment notes yet</p>
                )}
              </div>

              {/* Treatment plan input */}
              {canAddEntries && (
                <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex-shrink-0">
                  <textarea
                    value={treatmentPlan}
                    onChange={e => setTreatmentPlan(e.target.value)}
                    rows={3}
                    placeholder="Add treatment note…"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg
                      focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)] resize-none
                      text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-all"
                  />
                  <button
                    onClick={handleSaveTreatmentNote}
                    className="mt-2 w-full py-1.5 rounded-lg text-xs font-semibold
                      bg-[var(--icon-cyan-text)] text-white hover:opacity-90 transition-all"
                  >
                    Add Note
                  </button>
                </div>
              )}
            </div>
          </div>
          </div>
        </>
      ) : selectedPatientId && !selectedAttendanceId ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
          <AlertCircle className="w-10 h-10 text-[var(--icon-yellow-text)] opacity-60" />
          <div className="text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)]">No Attendance Selected</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Select an existing attendance to view or add medical entries.</p>
          </div>
        </div>
      ) : null}

      {/* ── MODALS ─────────────────────────────────────────────────────────── */}
      <DiagnosisModal isOpen={modalType === 'diagnosis'} onClose={() => setModalType(null)} onSuccess={afterModal}
        attendanceId={selectedAttendanceId} diagnoses={diagnoses} canAdd={canAddEntries}
        userId={user?.id} userName={user?.fullName} />
      <LabTestModal isOpen={modalType === 'lab'} onClose={() => setModalType(null)} onSuccess={afterModal}
        attendanceId={selectedAttendanceId} labTests={labTestTemplates} canAdd={canAddEntries}
        userId={user?.id} userName={user?.fullName} />
      <ProcedureModal isOpen={modalType === 'procedure'} onClose={() => setModalType(null)} onSuccess={afterModal}
        attendanceId={selectedAttendanceId} procedures={procedureTemplates} canAdd={canAddEntries}
        userId={user?.id} userName={user?.fullName} />
      <MedicationModal isOpen={modalType === 'medication'} onClose={() => setModalType(null)} onSuccess={afterModal}
        attendanceId={selectedAttendanceId} stockItems={stockItems} canAdd={canAddEntries}
        userId={user?.id} userName={user?.fullName} />
      <ScanModal isOpen={modalType === 'scan'} onClose={() => setModalType(null)} onSuccess={afterModal}
        attendanceId={selectedAttendanceId} scans={scanTemplates} canAdd={canAddEntries}
        userId={user?.id} userName={user?.fullName} />

      {scanResultFor && (
        <ScanResultForm scan={scanResultFor} onSaveResult={handleSaveScanResult}
          onClose={() => setScanResultFor(null)} saving={savingResult} />
      )}

      {showWorklist && (
        <WorklistPanel department="medical"
          onSelectPatient={(patientId, item) => {
            setSelectedPatientId(patientId);
            if (item.attendanceId) setSelectedAttendanceId(item.attendanceId);
            setShowWorklist(false);
          }}
          onClose={() => setShowWorklist(false)} />
      )}
    </div>

    
  );
}

// ─── Note display helpers ─────────────────────────────────────────────────────
const NoteCard: React.FC<{ author: string; date?: string; text?: string; children?: React.ReactNode }> = ({ author, date, text, children }) => (
  <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)]">
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-[10px] font-bold text-[var(--icon-cyan-text)]">{author}</span>
      {date && <span className="text-[9px] text-[var(--text-tertiary)]">{new Date(date).toLocaleString()}</span>}
    </div>
    {text && <p className="text-[11px] text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{text}</p>}
    {children}
  </div>
);

const NoteField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <p className="text-[11px] text-[var(--text-primary)] leading-relaxed mb-1">
    <span className="font-bold text-[var(--text-secondary)]">{label} — </span>{value}
  </p>
);