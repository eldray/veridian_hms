// src/pages/MedicalEntries.tsx - UPDATED with Daycase, Detention, IPD distinction
import { useLiveRefresh } from '../api/realtime';
import { confirmDialog } from '../context/ConfirmDialog';
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
import { AllergyBanner } from '../components/patients/AllergyBanner';
import { getPatientName } from '../utils/patient';

import { DiagnosisModal } from '../components/medical-entries/modals/DiagnosisModal';
import { LabTestModal } from '../components/medical-entries/modals/LabTestModal';
import { ProcedureModal } from '../components/medical-entries/modals/ProcedureModal';
import { MedicationModal } from '../components/medical-entries/modals/MedicationModal';
import { ScanModal } from '../components/medical-entries/modals/ScanModal';
import { ConsumableModal } from '../components/medical-entries/modals/ConsumableModal';
import { deleteEncounterConsumableUse, getEncounterConsumableUses, finalizeEncounterClinicalRecord, dischargeFromEncounter } from '../api';
import { ConsumableUsesPanel } from '../components/medical-entries/ConsumableUsesPanel';

import ComplaintInput from '../components/ComplaintInput';
import ODQInput from '../components/medical-entries/ODQInput';
import { useAdmissionStore } from '../store/admissionStore';

import {
  ChevronLeft, RefreshCw, Stethoscope, Pill, FlaskConical, Info, Building2,
  Scissors, Scan, FileText, Activity, AlertCircle, Plus, Trash2,
  Hospital, User, Calendar, DollarSign, Clock, Heart, Thermometer,
  Wind, Droplets, Gauge, Weight, Ruler, CheckCircle, XCircle,
  Printer, History, Eye, Edit, ClipboardList, Microscope, Image, Users,
  ArrowRight, ChevronDown, ChevronUp, AlertTriangle, Moon, Sun, Bed, Package, Send,
} from 'lucide-react';

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined =>
  entity?._id || entity?.id;

type ModalType = 'diagnosis' | 'lab' | 'procedure' | 'medication' | 'scan' | 'consumable' | null;

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
    requested: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]',
    scheduled: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]',
    prescribed: 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]',
    dispensed: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
    completed: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
    cancelled: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]',
    pending: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]',
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
  const [findings, setFindings] = useState(scan.findings || '');
  const [impression, setImpression] = useState(scan.impression || '');
  const [result, setResult] = useState(scan.result || '');

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
  onConfirm: (bedId: string, wardId: string, wardName: string, bedNumber: string, admissionNotes: string) => Promise<void>;
  admissionType: 'day_surgery' | 'detention' | 'ipd';
  isLoading: boolean;
  admissionNotes: string;
  onAdmissionNotesChange: (value: string) => void;
  selectedAdmissionClass: 'emergency' | 'elective' | 'transfer';
  onAdmissionClassChange: (value: 'emergency' | 'elective' | 'transfer') => void;
  selectedAdmissionSource: 'home' | 'referral' | 'another_facility' | 'opd' | 'emergency';
  onAdmissionSourceChange: (value: 'home' | 'referral' | 'another_facility' | 'opd' | 'emergency') => void;
}> = ({ isOpen, onClose, onConfirm, admissionType, isLoading, admissionNotes, onAdmissionNotesChange, selectedAdmissionClass, onAdmissionClassChange, selectedAdmissionSource, onAdmissionSourceChange }) => {
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
    onConfirm(selectedBedId, selectedWardId, selectedWardName, selectedBedNumber, admissionNotes);
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

          {admissionType === 'ipd' && (
            <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="admission-class" className="block text-xs font-semibold text-[var(--text-secondary)]">Admission type</label>
                <select id="admission-class" value={selectedAdmissionClass} onChange={event => onAdmissionClassChange(event.target.value as 'emergency' | 'elective' | 'transfer')} className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--icon-cyan-text)]/40">
                  <option value="emergency">Emergency</option>
                  <option value="elective">Elective</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="admission-source" className="block text-xs font-semibold text-[var(--text-secondary)]">Admission source</label>
                <select id="admission-source" value={selectedAdmissionSource} onChange={event => onAdmissionSourceChange(event.target.value as 'home' | 'referral' | 'another_facility' | 'opd' | 'emergency')} className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--icon-cyan-text)]/40">
                  <option value="opd">OPD</option>
                  <option value="emergency">Emergency unit</option>
                  <option value="referral">Referral</option>
                  <option value="another_facility">Another facility</option>
                  <option value="home">Home / direct presentation</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="admission-notes" className="block text-xs font-semibold text-[var(--text-secondary)]">
                Reason for admission / initial admission note <span className="text-[var(--text-tertiary)] font-normal">(recommended)</span>
              </label>
              <textarea
                id="admission-notes"
                value={admissionNotes}
                onChange={event => onAdmissionNotesChange(event.target.value)}
                rows={3}
                maxLength={4000}
                placeholder="Document why inpatient admission is required, key clinical concerns, and the initial plan. Detailed progress notes remain in Medical Entries."
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--icon-cyan-text)]/40 resize-y"
              />
              <p className="text-[10px] text-[var(--text-tertiary)]">This is saved with the encounter's medical notes. Keep ongoing progress notes in Medical Entries to avoid duplication.</p>
            </div>
            </>
          )}

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
                        className={`p-3 rounded-lg border text-left transition-all ${isSelected
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
                          className={`p-2 rounded-lg border text-center transition-all ${selectedBedId === bed.id
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

  const { patients, loadPatients, fetchPatient, currentPatient } = usePatientStore();
  const { attendanceId } = useParams();
  const [searchParams] = useSearchParams();
  const { createAdmission, getAdmissions, convertDetentionToIPD, getDetentionPatients, getFormalIPDPatients } = useAdmissionStore();
  const { updateAttendance } = useAttendanceStore();
  const { updateBed } = useWardStore();
  const {
    attendances, currentAttendance, getAttendance, getAttendances, refreshAttendance,
    removeDiagnosis, removeLabTest, removeProcedure, removeMedication, removeScan,
    updateScanStatus, canAddMedicalEntries, getVitalsByAttendance, calculateBill,
  } = useAttendanceStore();

  const {
    diagnoses, labTestTemplates, procedureTemplates, scanTemplates,
    getDiagnoses, getLabTestTemplates, getProcedureTemplates, getScanTemplates,
  } = useMedicalServicesStore();

  const { stockItems, getStockItems } = useStockStore();
  const { user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState('');
  const [latestVitals, setLatestVitals] = useState<any>(null);
  const [scanResultFor, setScanResultFor] = useState<any>(null);
  const [savingResult, setSavingResult] = useState(false);
  const [showWorklist, setShowWorklist] = useState(false);
  const [showDetentionModal, setShowDetentionModal] = useState(false);
  // Bed/Ward selection modal state
  const [showBedWardModal, setShowBedWardModal] = useState(false);
  const [pendingAdmissionType, setPendingAdmissionType] = useState<'day_surgery' | 'detention' | 'ipd' | null>(null);
  const [detentionHours, setDetentionHours] = useState(24);
  const [detentionReason, setDetentionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [admissionNotes, setAdmissionNotes] = useState('');
  const [selectedAdmissionClass, setSelectedAdmissionClass] = useState<'emergency' | 'elective' | 'transfer'>('emergency');
  const [selectedAdmissionSource, setSelectedAdmissionSource] = useState<'home' | 'referral' | 'another_facility' | 'opd' | 'emergency'>('opd');

  const [presentedComplaints, setPresentedComplaints] = useState('');
  const [hpc, setHpc] = useState('');
  const [odq, setOdq] = useState('');
  const [physicalExam, setPhysicalExam] = useState('');
  const [assessment, setAssessment] = useState('');
  const [reviewOfSystems, setReviewOfSystems] = useState<Record<string, string>>({});
  const [physicalExamStructured, setPhysicalExamStructured] = useState<Record<string, string>>({});
  const [allergyReviewStatus, setAllergyReviewStatus] = useState<'not_reviewed' | 'no_known_allergies' | 'allergies_present'>('not_reviewed');
  const [allergyReviewNotes, setAllergyReviewNotes] = useState('');
  const [clinicalOutcome, setClinicalOutcome] = useState<'improved' | 'stable' | 'unchanged' | 'deteriorated' | 'deceased' | 'unknown' | ''>('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  // Keep the unsaved progress-note draft separate from the persistent treatment plan.
  const [treatmentNoteDraft, setTreatmentNoteDraft] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [treatmentNotes, setTreatmentNotes] = useState<{ author: string; date: string; text: string }[]>([]);
  const [physicianNoteText, setPhysicianNoteText] = useState('');
  const [physicianNotes, setPhysicianNotes] = useState<{ author: string; date: string; text: string }[]>([]);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [clinicalModal, setClinicalModal] = useState<'reviewOfSystems' | 'physicalExam' | null>(null);
  const [consumableUses, setConsumableUses] = useState<any[]>([]);
  const [editingConsumable, setEditingConsumable] = useState<any | null>(null);

  const loadConsumableUses = async (id: string) => {
    const response = await getEncounterConsumableUses(id);
    const data = response?.data;
    setConsumableUses(Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []);
  };

  const loadData = async () => {
    setRefreshing(true);
    const secondaryLoads = Promise.all([
      getAttendances(),
      getStockItems(),
      getDiagnoses(),
      getLabTestTemplates(),
      getProcedureTemplates(),
      getScanTemplates(),
    ]).then(
      () => null,
      (error: unknown) => error,
    );

    try {
      await loadPatients();
    } catch (err: any) {
      toastError('Patient list failed to load', err.message || 'Could not load patients');
    } finally {
      setIsLoading(false);
    }

    const secondaryError = await secondaryLoads;
    if (secondaryError) {
      const message = secondaryError instanceof Error
        ? secondaryError.message
        : 'Some consultation data could not be loaded';
      toastError('Consultation data failed to load', message);
    }
    setRefreshing(false);
  };

  // Live updates for the visit being worked on (vitals taken by the nurse, results back from the lab ...).
  // Refreshes only that visit, never the shared list, and waits while a form is open so nothing is overwritten.
  useLiveRefresh(['encounters'], async () => {
    if (!selectedAttendanceId || modalType) return;
    await refreshAttendance(selectedAttendanceId);
    const v = await getVitalsByAttendance(selectedAttendanceId).catch(() => null);
    if (v) setLatestVitals(v.length ? v[v.length - 1] : null);
  });

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!selectedAttendanceId) return;
    getVitalsByAttendance(selectedAttendanceId)
      .then(v => setLatestVitals(v?.length ? v[v.length - 1] : null))
      .catch(() => setLatestVitals(null));
  }, [selectedAttendanceId]);

  useEffect(() => {
    if (!selectedAttendanceId) {
      setConsumableUses([]);
      return;
    }
    loadConsumableUses(selectedAttendanceId).catch((err: Error) => {
      toastError('Consumable history unavailable', err.message || 'Could not load consumable usage');
    });
  }, [selectedAttendanceId]);

  useEffect(() => {
    if (!selectedPatientId) return;
    let active = true;
    fetchPatient(selectedPatientId).catch((error: Error) => {
      if (active) {
        toastError('Patient history unavailable', error.message || 'Could not load patient medical history');
      }
    });
    return () => {
      active = false;
    };
  }, [selectedPatientId, fetchPatient, toastError]);

  useEffect(() => {
    if (!attendanceId) return;
    // Select the route attendance directly; the selected-attendance loader below
    // fetches its record once and also derives the patient selection.
    setSelectedAttendanceId(attendanceId);
  }, [attendanceId]);

  // Load encounter clinical notes once per selected attendance. This used to be duplicated,
  // causing two identical requests and competing state updates whenever staff changed visits.
  useEffect(() => {
    // Discard any unsaved progress-note text when changing visits.
    setTreatmentNoteDraft('');
    if (!selectedAttendanceId) return;
    let active = true;
    getAttendance(selectedAttendanceId)
      .then(att => {
        if (!active || !att) return;
        const patientId = typeof att.patientId === 'object' ? getEntityId(att.patientId as any) : att.patientId;
        if (patientId) setSelectedPatientId(patientId);
        const clinicalNotes = att.clinicalNotes && typeof att.clinicalNotes === 'object' && !Array.isArray(att.clinicalNotes)
          ? att.clinicalNotes as Record<string, any>
          : {};
        setPresentedComplaints(att.complaints || '');
        setHpc((att as any).historyPresentingComplaint ?? clinicalNotes.historyPresentingComplaint ?? '');
        setOdq(clinicalNotes.onsetDurationQuality || (att as any).onsetDurationQuality || '');
        setPhysicalExam(att.physicalExamination ?? clinicalNotes.physicalExamination ?? '');
        setAssessment(att.assessment ?? clinicalNotes.assessment ?? '');
        setReviewOfSystems((att.reviewOfSystems || clinicalNotes.reviewOfSystems || {}) as Record<string, string>);
        setPhysicalExamStructured((att.physicalExamStructured || clinicalNotes.physicalExamStructured || {}) as Record<string, string>);
        setAllergyReviewStatus(att.allergyReviewStatus || 'not_reviewed');
        setAllergyReviewNotes(att.allergyReviewNotes || '');
        setClinicalOutcome(att.clinicalOutcome || '');
        const followUp = (att as any).followUpDate ? new Date((att as any).followUpDate) : null;
        setFollowUpDate(followUp && Number.isFinite(followUp.getTime()) ? followUp.toISOString().slice(0, 16) : '');
        setTreatmentNotes(clinicalNotes.treatmentNotes || (att as any).treatmentNotes || []);
        setPhysicianNotes(clinicalNotes.physicianNotes || (att as any).physicianNotes || []);
        setTreatmentPlan((att as any).treatmentPlan ?? clinicalNotes.treatmentPlan ?? '');
      })
      .catch((error: Error) => {
        if (active) toastError('Clinical notes unavailable', error.message || 'Could not load saved clinical notes');
      });
    return () => { active = false; };
  }, [selectedAttendanceId, getAttendance, toastError]);

  const selectedPatient = (currentPatient?.id === selectedPatientId ? currentPatient : undefined)
    || patients.find(p => getEntityId(p) === selectedPatientId)
    || null;
  const canAddEntries = currentAttendance ? canAddMedicalEntries(currentAttendance) : false;
  const isClinicalFinalized = Boolean((currentAttendance as any)?.finalizedAt);
  const linkedAdmission = (currentAttendance as any)?.Admission || (currentAttendance as any)?.admission || null;
  const isActiveInpatient = currentAttendance?.encounterCategory === 'ipd'
    && currentAttendance?.status === 'admitted'
    && linkedAdmission?.status !== 'cancelled';

  const diagnosesList = currentAttendance?.AttendanceDiagnosis || [];
  const labTestsList = currentAttendance?.LabTest || [];
  const proceduresList = currentAttendance?.Procedure || [];
  const medicationsList = currentAttendance?.Medication || [];
  const scansList = currentAttendance?.Scan || [];
  const dispensedMeds = medicationsList.filter(m => m.status === 'dispensed');
  const requestedScans = scansList.filter(s => s.status === 'requested' || s.status === 'scheduled');
  const completedScans = scansList.filter(s => s.status === 'completed');

  const handleClearSelection = async () => {
    if (treatmentNoteDraft.trim() && !(await confirmDialog({ title: 'Discard progress note?', message: 'The progress note you are typing has not been saved. Leave this patient record and discard it?', confirmText: 'Discard', type: 'warning' }))) return;
    setSelectedPatientId(''); setSelectedAttendanceId('');
    setPresentedComplaints(''); setHpc(''); setOdq('');
    setPhysicalExam(''); setAssessment(''); setReviewOfSystems({}); setPhysicalExamStructured({});
    setAllergyReviewStatus('not_reviewed'); setAllergyReviewNotes(''); setClinicalOutcome('');
    setTreatmentPlan(''); setTreatmentNoteDraft(''); setFollowUpDate('');
    setTreatmentNotes([]); setPhysicianNotes([]);
    setPhysicianNoteText('');
  };

  const handleSaveClinical = async () => {
    if (!selectedAttendanceId) return;
    try {
      const clinicalNotes = {
        ...(currentAttendance && typeof currentAttendance.clinicalNotes === 'object' && !Array.isArray(currentAttendance.clinicalNotes)
          ? currentAttendance.clinicalNotes
          : {}),
        historyPresentingComplaint: hpc || null,
        onsetDurationQuality: odq || null,
        physicalExamination: physicalExam || null,
        treatmentPlan: treatmentPlan || null,
        assessment: assessment || null,
        reviewOfSystems,
        physicalExamStructured,
      };

      await updateAttendance(selectedAttendanceId, {
        complaints: presentedComplaints,
        historyPresentingComplaint: hpc,
        reviewOfSystems,
        physicalExamination: physicalExam,
        physicalExamStructured,
        assessment,
        treatmentPlan,
        allergyReviewStatus,
        allergyReviewNotes,
        clinicalOutcome: clinicalOutcome || null,
        providerId: user?.id,
        clinicalNotes,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        updatedById: user?.id,
      });
      success('Saved', 'Clinical information updated');
      await getAttendance(selectedAttendanceId);
    } catch (err: any) { toastError('Save failed', err.message); }
  };

  const handleFinalizeClinical = async () => {
    if (!selectedAttendanceId) return;
    try {
      await updateAttendance(selectedAttendanceId, {
        complaints: presentedComplaints,
        historyPresentingComplaint: hpc,
        reviewOfSystems,
        physicalExamination: physicalExam,
        physicalExamStructured,
        assessment,
        treatmentPlan,
        allergyReviewStatus,
        allergyReviewNotes,
        clinicalOutcome: clinicalOutcome || null,
        providerId: user?.id,
      });
      await finalizeEncounterClinicalRecord(selectedAttendanceId);
      success('Clinical record finalized', 'The clinical assessment has been signed and finalized.');
      await getAttendance(selectedAttendanceId);
    } catch (err: any) {
      toastError('Cannot finalize clinical record', err.message || 'Complete all required clinical sections first.');
    }
  };

  // Add this function alongside handleSaveClinical
  const handleSaveTreatmentNote = async () => {
    if (!selectedAttendanceId || !treatmentNoteDraft.trim()) return;
    const newNote = {
      author: user?.fullName || 'Physician',
      date: new Date().toISOString(),
      text: treatmentNoteDraft.trim(),
    };
    const updatedNotes = [...treatmentNotes, newNote];
    try {
      const clinicalNotes = {
        ...(currentAttendance && typeof currentAttendance.clinicalNotes === 'object' && !Array.isArray(currentAttendance.clinicalNotes)
          ? currentAttendance.clinicalNotes
          : {}),
        treatmentNotes: updatedNotes,
      };

      await updateAttendance(selectedAttendanceId, {
        clinicalNotes,
        updatedById: user?.id,
      });
      setTreatmentNotes(updatedNotes);
      setTreatmentNoteDraft(''); // clear only the unsaved note draft; preserve the treatment plan
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
      // Reserve the bed, update attendance and create the admission in one backend transaction.
      await createAdmission({
        attendanceId: selectedAttendanceId,
        bedId,
        wardId,
        admissionType: 'detention_observation',
        admissionSource: 'opd',
        admissionDate: new Date().toISOString(),
        admissionNotes: [
          admissionNotes.trim(),
          `[Detention] ${detentionReason || 'Placed under observation for monitoring'}. Expected observation period: ${detentionHours} hours. Bed: ${bedNumber}, Ward: ${wardName}`,
        ].filter(Boolean).join(' '),
      });

      success('Detained', `Patient placed under observation for ${detentionHours} hours in Bed ${bedNumber}, ${wardName}`);
      await getAttendance(selectedAttendanceId);
      await getAttendances();
      await getDetentionPatients();
      await getAdmissions();
      await getFormalIPDPatients();
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

  const executeAdmission = async (bedId: string, wardId: string, wardName: string, bedNumber: string, admissionNotes: string) => {
    if (!selectedAttendanceId || !currentAttendance || !selectedPatient) return;

    setIsProcessing(true);
    try {
      // The backend reserves the bed, updates attendance and creates the admission atomically.
      await createAdmission({
        attendanceId: selectedAttendanceId,
        bedId,
        wardId,
        admissionType: selectedAdmissionClass,
        admissionSource: selectedAdmissionSource,
        admissionDate: new Date().toISOString(),
      });

      success('Admitted', `Patient admitted to Bed ${bedNumber} in ${wardName} as formal IPD`);
      await getAttendance(selectedAttendanceId);
      await getAttendances();
      await getAdmissions();
      await getDetentionPatients();
      await getFormalIPDPatients();
      setShowBedWardModal(false);
      setPendingAdmissionType(null);
      setAdmissionNotes('');
      setSelectedAdmissionClass('emergency');
      setSelectedAdmissionSource('opd');
    } catch (err: any) {
      toastError('Admission Failed', err.response?.data?.message || err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle bed/ward confirmation
  const handleBedWardConfirm = async (bedId: string, wardId: string, wardName: string, bedNumber: string, admissionNotes = '') => {
    switch (pendingAdmissionType) {
      case 'day_surgery':
        await executeDaySurgery(bedId, wardId, wardName, bedNumber);
        break;
      case 'detention':
        await executeDetention(bedId, wardId, wardName, bedNumber);
        break;
      case 'ipd':
        await executeAdmission(bedId, wardId, wardName, bedNumber, admissionNotes);
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
    if (currentAttendance.status === 'discharged') {
      toastError('Already discharged', 'This encounter is already closed. Refresh the record before taking further action.');
      return;
    }

    setIsProcessing(true);
    try {
      // Use the encounter terminal-transition endpoint, not a generic attendance update.
      // The backend closes the admission and releases bed/ward occupancy transactionally.
      await dischargeFromEncounter(selectedAttendanceId, { dischargeStatus: 'home' });
      success('Discharged', 'Patient discharged from observation and bed occupancy updated.');
      await Promise.all([
        getAttendance(selectedAttendanceId),
        getAttendances(),
        getDetentionPatients(),
        getAdmissions(),
        getFormalIPDPatients(),
      ]);
    } catch (err: any) {
      toastError('Discharge Failed', err.response?.data?.message || err.message || 'The patient could not be discharged.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteItem = async (type: string, id: string) => {
    if (!selectedAttendanceId) return;
    try {
      const fn: Record<string, () => Promise<void>> = {
        diagnosis: () => removeDiagnosis(selectedAttendanceId, id),
        lab: () => removeLabTest(selectedAttendanceId, id),
        procedure: () => removeProcedure(selectedAttendanceId, id),
        medication: () => removeMedication(selectedAttendanceId, id),
        scan: () => removeScan(selectedAttendanceId, id),
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
        if (s < 90 || d < 60) return 'text-[var(--icon-yellow-text)]';
        return 'text-[var(--icon-green-text)]';
      }
      case 'temp': return value > 38 ? 'text-[var(--icon-red-text)]' : value < 35 ? 'text-[var(--icon-yellow-text)]' : 'text-[var(--icon-green-text)]';
      case 'pulse': return (value > 100 || value < 60) ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-green-text)]';
      case 'spo2': return value < 95 ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-green-text)]';
      default: return 'text-[var(--text-primary)]';
    }
  };

  const afterModal = async () => {
    setModalType(null);
    if (selectedAttendanceId) {
      await getAttendance(selectedAttendanceId);
      await calculateBill(selectedAttendanceId);
      await loadConsumableUses(selectedAttendanceId);
    }
  };

  const afterConsumableUse = async () => {
    setModalType(null);
    setEditingConsumable(null);
    try {
      await afterModal();
      await getStockItems();
    } catch (err: any) {
      toastError('Encounter refresh failed', err.message || 'Consumable was recorded but data could not be refreshed');
    }
  };

  const deleteConsumableUse = async (use: any) => {
    if (!(await confirmDialog({ title: 'Delete consumable use', message: `Delete ${use.StockItem?.name || 'this consumable use'}? Stock will be restored.`, confirmText: 'Delete' }))) return;
    try {
      await deleteEncounterConsumableUse(selectedAttendanceId, use.id);
      success('Consumable use deleted', 'The stock was restored.');
      await loadConsumableUses(selectedAttendanceId);
      await getStockItems();
    } catch (err: any) {
      toastError('Could not delete consumable use', err?.response?.data?.message || err.message);
    }
  };

  // Get action buttons - modified to show the new handlers
  const handleReferPatient = () => {
    if (!selectedPatientId) {
      toastError('Patient required', 'Select a patient before starting a referral.');
      return;
    }
    if (!selectedAttendanceId) {
      toastError('Attendance required', 'Select the patient visit you are referring from.');
      return;
    }
    const params = new URLSearchParams({ patientId: selectedPatientId, attendanceId: selectedAttendanceId, source: 'Medical Entries' });
    if (selectedPatient) params.set('patientName', getPatientName(selectedPatient));
    const complaints = String(presentedComplaints || currentAttendance?.complaints || '');
    const diagnosis = diagnosesList.map((d: any) => d.diagnosis?.name || d.diagnosisName || d.name).filter(Boolean).join(', ');
    const structuredReview = Object.entries(reviewOfSystems).filter(([, value]) => String(value || '').trim()).map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`).join('; ');
    const structuredExam = Object.entries(physicalExamStructured).filter(([, value]) => String(value || '').trim()).map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`).join('; ');
    const notes = [hpc, odq, physicalExam, structuredReview && `Review of systems: ${structuredReview}`, structuredExam && `Structured physical examination: ${structuredExam}`, assessment].filter(Boolean).join('\n');
    if (complaints) params.set('complaints', complaints);
    if (diagnosis) params.set('diagnosis', diagnosis);
    if (notes) params.set('notes', notes);
    if (treatmentPlan) params.set('treatment', treatmentPlan);
    params.set('reason', complaints || diagnosis || assessment || 'Clinical assessment requires referral');
    navigate('/dashboard/referrals', { state: { referralContext: Object.fromEntries(params.entries()), openCreateReferral: true } });
  };

  const getActionButtons = () => {
    const category = currentAttendance?.encounterCategory;
    const status = currentAttendance?.status;
    const admissionType = currentAttendance?.admissionType;

    if (status === 'discharged' || status === 'completed') {
      return (
        <button type="button" onClick={handleReferPatient}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-cyan-300 text-cyan-700 hover:bg-cyan-50 transition-all">
          <Send className="w-3.5 h-3.5" /> Refer patient
        </button>
      );
    }

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
          <button type="button" onClick={handleReferPatient} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-cyan-300 text-cyan-700 hover:bg-cyan-50 transition-all">
            <ArrowRight className="w-3.5 h-3.5" /> Refer
          </button>
        </div>
      );
    }

    // Formal IPD patient
    if (status === 'admitted' && category === 'ipd') {
      return (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigate(`/dashboard/admissions/${currentAttendance?.Admission?.id || ''}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] hover:bg-[var(--icon-green-text)] hover:text-white transition-all">
            <Hospital className="w-3.5 h-3.5" /> Manage Admission
          </button>
          <button type="button" onClick={handleReferPatient} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-cyan-300 text-cyan-700 hover:bg-cyan-50 transition-all">
            <ArrowRight className="w-3.5 h-3.5" /> Refer
          </button>
        </div>
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
        <button type="button" onClick={handleReferPatient} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-cyan-300 text-cyan-700 hover:bg-cyan-50 transition-all">
          <ArrowRight className="w-3.5 h-3.5" /> Refer
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
    if (mode === 'nhis') return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]';
    if (mode === 'private_insurance') return 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]';
    return 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]';
  })();

  const paymentLabel = (() => {
    const mode = currentAttendance?.paymentMode;
    if (mode === 'nhis') return 'NHIS';
    if (mode === 'private_insurance') return 'PRIVATE INS.';
    return 'CASH';
  })();

  // ─── Status badge class ───────────────────────────────────────────────────
  const statusBadgeClass = (() => {
    const s = currentAttendance?.status;
    if (s === 'admitted') return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]';
    if (s === 'completed') return 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]';
    if (s === 'pending') return 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]';
    if (s === 'discharged') return 'bg-[var(--icon-gray-bg)] text-[var(--text-secondary)]';
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
          setAdmissionNotes('');
          setSelectedAdmissionClass('emergency');
          setSelectedAdmissionSource('opd');
        }}
        onConfirm={handleBedWardConfirm}
        admissionType={pendingAdmissionType || 'ipd'}
        isLoading={isProcessing}
        admissionNotes={admissionNotes}
        onAdmissionNotesChange={setAdmissionNotes}
        selectedAdmissionClass={selectedAdmissionClass}
        onAdmissionClassChange={setSelectedAdmissionClass}
        selectedAdmissionSource={selectedAdmissionSource}
        onAdmissionSourceChange={setSelectedAdmissionSource}
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
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-[var(--text-primary)] leading-tight">Medical Entries</h1>
              </div>
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
            <AllergyBanner
              patientId={selectedPatientId}
              allergies={selectedPatient?.allergies}
              allergyReviewStatus={allergyReviewStatus}
              className="mt-3"
            />
            {(
              (selectedPatient?.allergies?.length || 0) > 0 ||
              (selectedPatient?.medicalHistories?.length || 0) > 0 ||
              (selectedPatient?.surgicalHistories?.length || 0) > 0 ||
              (selectedPatient?.familyHistories?.length || 0) > 0 ||
              selectedPatient?.additionalInfo?.bloodType
            ) && (
              <div className="mt-4 rounded-lg border px-4 py-3" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-main)' }}>
                <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                  <AlertTriangle className="h-3.5 w-3.5 text-[var(--icon-yellow-text)]" />
                  Medical history
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedPatient?.additionalInfo?.bloodType && (
                    <span className="rounded-md bg-[var(--bg-card)] px-2 py-1 text-[11px] text-[var(--text-secondary)]">
                      Blood type: <strong className="text-[var(--text-primary)]">{selectedPatient?.additionalInfo?.bloodType}</strong>
                    </span>
                  )}
                  {selectedPatient?.allergies?.map((allergy) => (
                    <span key={allergy.id || allergy.allergen} className="rounded-md bg-[var(--icon-red-bg)] px-2 py-1 text-[11px] text-[var(--icon-red-text)]">
                      Allergy: <strong>{allergy.allergen}</strong>
                      {allergy.reaction ? ` — ${allergy.reaction}` : ''}
                      {allergy.severity ? ` (${allergy.severity})` : ''}
                    </span>
                  ))}
                  {selectedPatient?.medicalHistories?.map((history) => (
                    <span key={history.id || history.condition} className="rounded-md bg-[var(--bg-card)] px-2 py-1 text-[11px] text-[var(--text-secondary)]">
                      Condition: <strong className="text-[var(--text-primary)]">{history.condition}</strong>
                      {history.notes ? ` — ${history.notes}` : ''}
                    </span>
                  ))}
                  {selectedPatient?.surgicalHistories?.map((history) => (
                    <span key={history.id || history.procedure} className="rounded-md bg-[var(--bg-card)] px-2 py-1 text-[11px] text-[var(--text-secondary)]">
                      Surgery: <strong className="text-[var(--text-primary)]">{history.procedure}</strong>
                      {history.surgeryDate ? ` (${new Date(history.surgeryDate).toLocaleDateString()})` : ''}
                    </span>
                  ))}
                  {selectedPatient?.familyHistories?.map((history) => (
                    <span key={history.id || `${history.relation}-${history.condition}`} className="rounded-md bg-[var(--bg-card)] px-2 py-1 text-[11px] text-[var(--text-secondary)]">
                      Family: <strong className="text-[var(--text-primary)]">{history.relation}</strong>
                      {` — ${history.condition}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── INPATIENT CONTEXT: keep IPD work linked to this admission ── */}
          {isActiveInpatient && (
            <section className="rounded-xl border border-teal-200 dark:border-teal-900/70 bg-gradient-to-r from-teal-50/90 to-cyan-50/70 dark:from-teal-950/25 dark:to-cyan-950/15 overflow-hidden"
              aria-label="Active inpatient admission">
              <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center flex-shrink-0">
                    <Hospital className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">Active Inpatient Admission</h3>
                      <span className="rounded-full bg-teal-100 dark:bg-teal-900/50 px-2 py-0.5 text-[10px] font-bold text-teal-800 dark:text-teal-200">IPD</span>
                      {linkedAdmission?.admissionNumber && <span className="text-[10px] font-mono text-[var(--text-secondary)]">#{linkedAdmission.admissionNumber}</span>}
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {currentAttendance?.Ward?.wardName || currentAttendance?.ward?.wardName || 'Ward not assigned'}
                      {' · '}
                      {currentAttendance?.Bed?.bedNumber || currentAttendance?.bed?.bedNumber
                        ? `Bed ${currentAttendance?.Bed?.bedNumber || currentAttendance?.bed?.bedNumber}`
                        : 'Bed not assigned'}
                      {linkedAdmission?.admissionDate ? ` · Admitted ${new Date(linkedAdmission.admissionDate).toLocaleDateString()}` : ''}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                      Continue documenting progress, diagnoses, medications, investigations and treatment here. Use Admission Details for the stay overview and nursing/bed coordination.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {linkedAdmission?.id && (
                    <button type="button" onClick={() => navigate(`/dashboard/admissions/${linkedAdmission.id}`)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800 transition-colors">
                      <Bed className="w-3.5 h-3.5" /> Admission Details
                    </button>
                  )}
                  <button type="button" onClick={() => navigate(`/dashboard/nursing/patient/${selectedAttendanceId}`)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-teal-500 transition-colors">
                    <ClipboardList className="w-3.5 h-3.5" /> Nursing
                  </button>
                  <button type="button" onClick={() => navigate(`/dashboard/vitals/${selectedAttendanceId}`)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-teal-500 transition-colors">
                    <Activity className="w-3.5 h-3.5" /> Observations
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* ── VITALS STRIP ───────────────────────────────────────────── */}
          {latestVitals && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] px-5 py-3"
              style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
                {[
                  { icon: <Gauge className="w-3.5 h-3.5 text-blue-500" />, value: latestVitals.bloodPressure || '—', label: 'BP', type: 'bp' },
                  { icon: <Thermometer className="w-3.5 h-3.5 text-orange-500" />, value: latestVitals.temperature ? `${latestVitals.temperature}°` : '—', label: 'Temp', type: 'temp' },
                  { icon: <Heart className="w-3.5 h-3.5 text-red-500" />, value: latestVitals.pulse || '—', label: 'Pulse', type: 'pulse' },
                  { icon: <Wind className="w-3.5 h-3.5 text-teal-500" />, value: latestVitals.respiration || '—', label: 'Resp', type: null },
                  { icon: <Droplets className="w-3.5 h-3.5 text-sky-500" />, value: latestVitals.spo2 ? `${latestVitals.spo2}%` : '—', label: 'SpO₂', type: 'spo2' },
                  { icon: <Weight className="w-3.5 h-3.5 text-amber-500" />, value: latestVitals.weight ? `${latestVitals.weight}kg` : '—', label: 'Weight', type: null },
                  { icon: <Ruler className="w-3.5 h-3.5 text-cyan-500" />, value: latestVitals.height ? `${latestVitals.height}cm` : '—', label: 'Height', type: null },
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

              {/* Group 1: clinical history and examination */}
              <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                    <div>
                      <h3 className="text-xs font-bold text-[var(--text-primary)]">History & Examination</h3>
                      <p className="text-[10px] text-[var(--text-tertiary)]">Presenting complaints, history, review of systems, examination and ODQ</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-[var(--text-tertiary)]">1 · Clinical assessment</span>
                </div>
                <div className="p-3">
              <div className="text-[10px] text-[var(--text-secondary)] mb-3">
                Responsible clinician: <span className="font-semibold text-[var(--text-primary)]">{user?.fullName || user?.username || 'Not assigned'}</span>
                {isClinicalFinalized && <span className="ml-2 text-emerald-700 font-semibold">Signed clinical record — read-only</span>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left sub-col */}
                <div className="space-y-3">
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3.5">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]"><FileText className="w-3 h-3" /> Presented Complaints</label>
                      <button type="button" onClick={() => setClinicalModal('reviewOfSystems')} disabled={!canAddEntries || isClinicalFinalized}
                        className="inline-flex items-center gap-1 rounded-md border border-[var(--border-color)] px-2 py-1 text-[10px] font-semibold text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] disabled:opacity-50">
                        <ClipboardList className="w-3 h-3" /> Structured data
                      </button>
                    </div>
                    <ComplaintInput value={presentedComplaints} onChange={setPresentedComplaints}
                      placeholder="Search or type complaints…" disabled={!canAddEntries || isClinicalFinalized} />
                    {Object.values(reviewOfSystems).some(value => String(value || '').trim()) && (
                      <p className="mt-2 text-[10px] text-[var(--text-secondary)]">Structured review recorded: {Object.entries(reviewOfSystems).filter(([, value]) => String(value || '').trim()).map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`).join(' · ')}</p>
                    )}
                  </div>
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3.5">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                      <History className="w-3 h-3" /> History of Presenting Complaint
                    </label>
                    <textarea value={hpc} onChange={e => setHpc(e.target.value)} rows={3}
                      disabled={!canAddEntries || isClinicalFinalized}
                      placeholder="History of presenting complaint…"
                      className="w-full px-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg
                        focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)] resize-none
                        text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-all" />
                  </div>
                </div>
                {/* Right sub-col */}
                <div className="space-y-3">
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3.5">
                    <div className="flex items-center justify-between gap-2 mb-2">
                       <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]"><Stethoscope className="w-3 h-3" /> Physical Examination</label>
                       <button type="button" onClick={() => setClinicalModal('physicalExam')} disabled={!canAddEntries || isClinicalFinalized}
                         className="inline-flex items-center gap-1 rounded-md border border-[var(--border-color)] px-2 py-1 text-[10px] font-semibold text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] disabled:opacity-50">
                         <ClipboardList className="w-3 h-3" /> Structured PE
                       </button>
                     </div>
                    <textarea value={physicalExam} onChange={e => setPhysicalExam(e.target.value)} rows={3}
                      disabled={!canAddEntries || isClinicalFinalized}
                      placeholder="Physical examination findings…"
                      className="w-full px-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg
                        focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)] resize-none
                        text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-all" />
                    {Object.values(physicalExamStructured).some(value => String(value || '').trim()) && (
                      <p className="mt-2 text-[10px] text-[var(--text-secondary)]">Structured findings recorded: {Object.entries(physicalExamStructured).filter(([, value]) => String(value || '').trim()).map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`).join(' · ')}</p>
                    )}
                  </div>
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3.5">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                      <Clock className="w-3 h-3" /> ODQ (Onset · Duration · Quality)
                    </label>
                    <ODQInput value={odq} onChange={setOdq} disabled={!canAddEntries || isClinicalFinalized} />
                  </div>
                </div>
              </div>
                </div>
              </section>

              {/* Group 2: allergy safety and outcome */}
              <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
                  <AlertTriangle className="w-4 h-4 text-[var(--icon-yellow-text)]" />
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-primary)]">Safety Review & Visit Outcome</h3>
                    <p className="text-[10px] text-[var(--text-tertiary)]">Confirm allergy status and record the patient's condition at the end of the visit</p>
                  </div>
                </div>
                <div className="p-3 space-y-3">
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3.5 space-y-3">
                <div className="flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-[var(--icon-yellow-text)]" /><h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Allergy Review</h3></div>
                <select value={allergyReviewStatus} onChange={e => setAllergyReviewStatus(e.target.value as typeof allergyReviewStatus)} disabled={!canAddEntries || isClinicalFinalized}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]">
                  <option value="not_reviewed">Not reviewed</option><option value="no_known_allergies">No known allergies (confirmed)</option><option value="allergies_present">Allergies present / recorded</option>
                </select>
                {(() => { const existingAllergies = (selectedPatient as any)?.allergies || (currentAttendance as any)?.Patient?.allergies || [];
                  return Array.isArray(existingAllergies) && existingAllergies.length > 0
                    ? <p className="text-[10px] text-amber-600">Existing patient allergies: {existingAllergies.map((a: any) => [a.allergen, a.reaction, a.severity].filter(Boolean).join(' — ')).join('; ')}</p>
                    : <p className="text-[10px] text-[var(--text-tertiary)]">No patient allergy entries are currently recorded.</p>; })()}
                <textarea value={allergyReviewNotes} onChange={e => setAllergyReviewNotes(e.target.value)} rows={2} disabled={!canAddEntries || isClinicalFinalized}
                  placeholder="Allergy/reaction details or review notes…" className="w-full px-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]" />
              </div>
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">Clinical Condition at End of Visit</label>
                <select value={clinicalOutcome} onChange={e => setClinicalOutcome(e.target.value as typeof clinicalOutcome)} disabled={!canAddEntries || isClinicalFinalized}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]">
                  <option value="">Not recorded</option><option value="improved">Improved</option><option value="stable">Stable</option><option value="unchanged">Unchanged</option><option value="deteriorated">Deteriorated</option><option value="deceased">Deceased</option><option value="unknown">Unknown / unable to assess</option>
                </select>
              </div>

              {/* Save clinical */}
              {canAddEntries && (
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={handleFinalizeClinical}
                    disabled={Boolean((currentAttendance as any)?.finalizedAt)}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold border border-emerald-600 text-emerald-700 disabled:opacity-50">
                    <CheckCircle className="w-3.5 h-3.5" /> {(currentAttendance as any)?.finalizedAt ? 'Finalized' : 'Finalize & Sign'}
                  </button>
                  <button
                    onClick={handleSaveClinical} disabled={isClinicalFinalized}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50
                      bg-[var(--icon-cyan-text)] text-white hover:opacity-90 transition-all"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Save Clinical Info
                  </button>
                </div>
              )}

                </div>
              </section>

              {/* Group 3: diagnoses and orders */}
              <div className="flex items-center gap-2 px-1 pt-1">
                <div className="h-5 w-1 rounded-full bg-[var(--icon-cyan-text)]" />
                <div>
                  <h3 className="text-xs font-bold text-[var(--text-primary)]">Diagnoses, Investigations & Treatment Orders</h3>
                  <p className="text-[10px] text-[var(--text-tertiary)]">Diagnoses, laboratory tests, scans, procedures, medications and consumables for this attendance</p>
                </div>
              </div>

              {/* The existing diagnosis, lab, procedure, medication, scan and consumable panels remain in place. */}
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
                              {t.ServiceCatalog?.name || t.LabTestTemplate?.name || t.name || 'Lab test'}
                              {t.notes && <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 line-clamp-1">{t.notes}</p>}
                            </TdPrimary>
                            <Td>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${t.priority === 'stat' ? 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]' :
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
                            <TdPrimary>{test.ServiceCatalog?.name || test.LabTestTemplate?.name || test.name || 'Lab test'}</TdPrimary>
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
                            primary: { label: 'Primary', cls: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]' },
                            additional: { label: 'Additional', cls: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' },
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
                            <TdPrimary>{proc.ServiceCatalog?.name || proc.ProcedureTemplate?.name || proc.name}</TdPrimary>
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

              <SectionCard
                icon={<Package className="w-4 h-4 text-[var(--icon-cyan-text)]" />}
                title="Consumables Used"
                count={consumableUses.length}
                action={canAddEntries && <AddBtn onClick={() => { setEditingConsumable(null); setModalType('consumable'); }} label="Add consumable" />}
              >
                <ConsumableUsesPanel uses={consumableUses}
                  onEdit={canAddEntries ? use => { setEditingConsumable(use); setModalType('consumable'); } : undefined}
                  onDelete={canAddEntries ? deleteConsumableUse : undefined} />
              </SectionCard>

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
                            <TdPrimary>{scan.scanType || scan.ServiceCatalog?.name || scan.ScanTemplate?.name || 'Scan'}</TdPrimary>
                            <Td>{scan.bodyPart || '—'}</Td>
                            <Td>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${scan.priority === 'stat' ? 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]' :
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
                              {scan.scanType || scan.ServiceCatalog?.name || scan.ScanTemplate?.name || 'Scan'}
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
                <div className="p-3 border-b border-[var(--border-color)] bg-[var(--bg-card)] flex-shrink-0">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">Clinical Impression</label>
                  <textarea value={assessment} onChange={e => setAssessment(e.target.value)} rows={3} disabled={!canAddEntries || isClinicalFinalized}
                    placeholder="Working or final clinical impression…" className="w-full px-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] disabled:opacity-60" />
                </div>
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
                      value={treatmentNoteDraft}
                      onChange={e => setTreatmentNoteDraft(e.target.value)}
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

      {clinicalModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setClinicalModal(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="clinical-structured-modal-title" className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--border-color)] bg-[var(--bg-card)] px-5 py-4">
              <div><h2 id="clinical-structured-modal-title" className="text-sm font-bold text-[var(--text-primary)]">{clinicalModal === 'reviewOfSystems' ? 'Structured Review of Systems' : 'Structured Physical Examination'}</h2>
                <p className="mt-1 text-[10px] text-[var(--text-secondary)]">Record only what was assessed. Leave unassessed systems blank.</p></div>
              <button type="button" onClick={() => setClinicalModal(null)} aria-label="Close structured clinical form" className="rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-main)]">Close</button>
            </div>
            <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
              {(clinicalModal === 'reviewOfSystems' ? ['General','Cardiovascular','Respiratory','Gastrointestinal','Genitourinary','Neurological','Musculoskeletal','Skin','ENT/Eyes','Endocrine','Psychiatric','Other'] : ['General appearance','Cardiovascular','Respiratory','Abdomen','Neurological','Musculoskeletal','Skin','ENT/Eyes','Other']).map(system => {
                const key = system.toLowerCase().replace(/[^a-z]+/g, '_');
                const values = clinicalModal === 'reviewOfSystems' ? reviewOfSystems : physicalExamStructured;
                const setValues = clinicalModal === 'reviewOfSystems' ? setReviewOfSystems : setPhysicalExamStructured;
                return <label key={key} className="text-[11px] font-medium text-[var(--text-secondary)]"><span className="mb-1 block">{system}</span>
                  <textarea value={values[key] || ''} rows={2} onChange={e => setValues((prev: Record<string, string>) => ({ ...prev, [key]: e.target.value }))} disabled={!canAddEntries || isClinicalFinalized}
                    placeholder={clinicalModal === 'reviewOfSystems' ? 'Not assessed / symptoms and findings' : 'Not examined / findings'} className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-primary)] disabled:opacity-60" />
                </label>;
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-color)] px-5 py-4">
              <p className="text-[10px] text-[var(--text-tertiary)]">The summary appears under its corresponding clinical field. Click Save Clinical to persist all changes.</p>
              <button type="button" onClick={() => setClinicalModal(null)} className="rounded-lg bg-[var(--icon-cyan-text)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90">Done</button>
            </div>
          </section>
        </div>
      )}

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
      <ConsumableModal isOpen={modalType === 'consumable'} onClose={() => { setModalType(null); setEditingConsumable(null); }} onSuccess={afterConsumableUse}
        encounterId={selectedAttendanceId} stockItems={stockItems} canAdd={canAddEntries} existingUse={editingConsumable} />
      <ScanModal isOpen={modalType === 'scan'} onClose={() => setModalType(null)} onSuccess={afterModal}
        attendanceId={selectedAttendanceId} scans={scanTemplates} canAdd={canAddEntries}
        userId={user?.id} userName={user?.fullName} />

      {scanResultFor && (
        <ScanResultForm scan={scanResultFor} onSaveResult={handleSaveScanResult}
          onClose={() => setScanResultFor(null)} saving={savingResult} />
      )}

      {showWorklist && (
        <WorklistPanel department="medical"
          onSelectPatient={async (patientId, item) => {
            if (treatmentNoteDraft.trim() && !(await confirmDialog({ title: 'Discard progress note?', message: 'The progress note you are typing has not been saved. Open another patient and discard it?', confirmText: 'Discard', type: 'warning' }))) return;
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