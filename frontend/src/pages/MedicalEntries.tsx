import { useSmartBack } from '../utils/useSmartBack';
// src/pages/MedicalEntries.tsx - UPDATED with Tab View like Antenatal
import { useLiveRefresh } from '../api/realtime';
import { confirmDialog } from '../context/ConfirmDialog';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { usePatientStore } from '../store/patientStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { useWardStore } from '../store/wardStore'; 
import { useToast } from '../store/toastStore';
import { useHospitalStore } from '../store/hospitalStore';
import { generatePDF, openPrintWindow } from '../utils/pdfGenerator';
import { useWorklistStore } from '../store/worklistStore';
import { WorklistPanel } from '../components/worklist/WorklistPanel';
import { PatientAttendanceSelector } from '../components/vitals/PatientAttendanceSelector';
import { AllergyBanner } from '../components/patients/AllergyBanner';
import { PatientVisitHeader } from '../components/ui/PatientVisitHeader';
import { PageHeader } from '../components/ui';
import { getPatientName } from '../utils/patient';
import { getScanDisplayName, humanScanModality } from '../utils/scan';
import { DiagnosisModal } from '../components/medical-entries/modals/DiagnosisModal';
import { LabTestModal } from '../components/medical-entries/modals/LabTestModal';
import { ProcedureModal } from '../components/medical-entries/modals/ProcedureModal';
import { MedicationModal } from '../components/medical-entries/modals/MedicationModal';
import { ScanModal } from '../components/medical-entries/modals/ScanModal';
import { ConsumableModal } from '../components/medical-entries/modals/ConsumableModal';
import { deleteEncounterConsumableUse, getEncounterConsumableUses, finalizeEncounterClinicalRecord, dischargeFromEncounter, completeEncounter } from '../api';
import { ConsumableUsesPanel } from '../components/medical-entries/ConsumableUsesPanel';
import { MedicalEntryEditModal, type MedicalEntryEditType } from '../components/medical-entries/MedicalEntryEditModal';
import {
ClinicalAssessmentModal,
ClinicalAssessmentSummary,
type ClinicalAssessmentValue,
} from '../components/medical-entries/ClinicalAssessmentModal';
import { useAdmissionStore } from '../store/admissionStore';
import HIVTestingPanel from '../components/hivTesting/HIVTestingPanel';
import {
RefreshCw, Stethoscope, Pill, FlaskConical, Info, Building2,
Scissors, Scan, FileText, Activity, AlertCircle, Plus, Trash2,
Hospital, User, Calendar, DollarSign, Heart, Thermometer,
Wind, Droplets, Gauge, Weight, Ruler, CheckCircle, XCircle, Shield,
Printer, History, Eye, Edit, ClipboardList, Microscope, Image,
ArrowRight, ChevronDown, ChevronUp, AlertTriangle, Moon, Sun, Bed, Package, Send,
} from 'lucide-react';

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined =>
entity?._id || entity?.id;

// Define Tabs
type ModalType = 'diagnosis' | 'lab' | 'procedure' | 'medication' | 'scan' | 'consumable' | null;
type EntryTab = 'clinical' | 'orders' | 'vitals' | 'hiv-testing';

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

// ─── Lab result flag ──────────────────────────────────────────────────────────
const labFlag = (value: any, normalRange?: string | null): string => {
if (value === '' || value === null || value === undefined || !normalRange) return '';
const numeric = Number(value);
if (Number.isNaN(numeric)) return '';
const text = String(normalRange).replace(/[–—]/g, '-');
const bound = text.match(/^([<>])\s*(-?\d+(?:\.\d+)?)/);
if (bound) {
const limit = Number(bound[2]);
return bound[1] === '<'
? (numeric < limit ? 'NL' : 'HIGH')
: (numeric > limit ? 'NL' : 'LOW');
}
const range = text.match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/);
if (!range) return '';
const low = Number(range[1]);
const high = Number(range[2]);
if (numeric < low) return 'LOW';
if (numeric > high) return 'HIGH';
return 'NL';
};

const FlagPill: React.FC<{ flag: string }> = ({ flag }) => {
if (!flag) return <span className="text-[var(--text-tertiary)]">—</span>;
const cls = flag === 'HIGH'
? 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]'
: flag === 'LOW'
? 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]'
: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]';
return <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${cls}`}>{flag}</span>;
};

// ─── Add button ───────────────────────────────────────────────────────────────
const AddBtn: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
<button
onClick={onClick}
className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold
bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]
hover:bg-[var(--icon-cyan-text)] hover:text-[var(--icon-cyan-on-text)] transition-all"
>
<Plus className="w-3 h-3" />{label}
</button>
);

// ─── Inline delete button ─────────────────────────────────────────────────────
const EditBtn: React.FC<{ onClick: () => void }> = ({ onClick }) => (
<button type="button" onClick={onClick} title="Edit entry" aria-label="Edit entry"
className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] transition-all">
<Edit className="w-3.5 h-3.5" />
</button>
);
const DelBtn: React.FC<{ onClick: () => void }> = ({ onClick }) => (
<button
onClick={onClick}
className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] transition-all"
>
<Trash2 className="w-3.5 h-3.5" />
</button>
);

// ─── Table shell ──────────────────────────────────────────────────────────────
const Table: React.FC<{ heads: string[]; colWidths?: string[]; children: React.ReactNode }> = ({ heads, colWidths, children }) => (
<table className={`w-full text-xs ${colWidths ? 'table-fixed' : ''}`}>
<thead className="sticky top-0 z-10 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
<tr>
{heads.map((h, i) => (
<th key={`${h}-${i}`} style={colWidths?.[i] ? { width: colWidths[i] } : undefined}
className="px-3 py-2 text-left font-semibold text-[var(--text-tertiary)] whitespace-nowrap">{h}</th>
))}
</tr>
</thead>
<tbody className="divide-y divide-[var(--border-color)]">{children}</tbody>
</table>
);
const Td: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
<td className={`px-3 py-2 text-[var(--text-secondary)] break-words ${className}`}>{children}</td>
);
const TdPrimary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
<td className="px-3 py-2 text-[var(--text-primary)] font-medium break-words">{children}</td>
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
{getScanDisplayName(scan)}
</p>
<p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
Modality: {humanScanModality(scan)}
{scan.bodyPart && <span> · Body part: {scan.bodyPart}</span>} ·
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
className="flex-1 py-2 rounded-lg text-xs font-semibold bg-[var(--icon-cyan-text)] text-[var(--icon-cyan-on-text)]
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
if (category === 'ipd' && admType === 'detention_observation') {
return (
<span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold
border border-[var(--icon-orange-text)] bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]">
<Moon className="w-3 h-3" /> OBSERVATION (DETENTION)
</span>
);
}
if (status === 'admitted' && category === 'ipd') {
return (
<span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold
border border-[var(--icon-green-text)] bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]">
<Hospital className="w-3 h-3" /> ADMITTED (IPD)
</span>
);
}
if (category === 'daycase') {
return (
<span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold
border border-[var(--icon-purple-text)] bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]">
<Sun className="w-3 h-3" /> DAY SURGERY
</span>
);
}
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
useEffect(() => {
if (isOpen) {
getWards();
getAvailableBeds();
}
}, [isOpen]);
useEffect(() => {
if (selectedWardId) {
const wardBeds = availableBeds.filter(bed =>
  bed.wardId === selectedWardId &&
  !bed.isOccupied &&
  !bed.currentPatient &&
  !bed.currentPatientId
);
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
className="flex-1 py-2 rounded-lg text-sm font-semibold bg-[var(--icon-cyan-text)] text-[var(--icon-cyan-on-text)]
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
bg-[var(--icon-cyan-text)] text-[var(--icon-cyan-on-text)] hover:opacity-90 disabled:opacity-40 transition-all"
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
const location = useLocation();
const goBack = useSmartBack('/dashboard/medical-waiting-list');
const { success, error: toastError } = useToast();
const { patients, loadPatients, fetchPatient, currentPatient } = usePatientStore();
const { attendanceId } = useParams();
const [searchParams, setSearchParams] = useSearchParams();
const { createAdmission, convertDetentionToIPD } = useAdmissionStore();
const { updateBed } = useWardStore();
const {
attendances, currentAttendance, getAttendance, getAttendances, refreshAttendance,
updateAttendance,
removeDiagnosis, removeLabTest, removeProcedure, removeMedication, removeScan,
updateScanStatus, updateLabTestStatus, updateProcedureStatus, updateMedicationStatus, updateDiagnosis, canAddMedicalEntries, getVitalsByAttendance, calculateBill,
} = useAttendanceStore();
const {
diagnoses, labTestTemplates, procedureTemplates, scanTemplates,
getDiagnoses, getLabTestTemplates, getProcedureTemplates, getScanTemplates,
} = useMedicalServicesStore();
const { stockItems, getStockItems } = useStockStore();
const { user, hasRole } = useAuthStore();
const { hospital } = useHospitalStore();
const [isLoading, setIsLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);
const [selectedPatientId, setSelectedPatientId] = useState('');
const [selectedAttendanceId, setSelectedAttendanceId] = useState('');
const [latestVitals, setLatestVitals] = useState<any>(null);
const [allVitals, setAllVitals] = useState<any[]>([]); // Added for vitals tab
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
const [treatmentPlanEntries, setTreatmentPlanEntries] = useState<{ author: string; authorId?: string | null; date: string; text: string; editedBy?: string; editedById?: string | null; editedAt?: string }[]>([]);
const [isEditingTreatmentPlan, setIsEditingTreatmentPlan] = useState(false);
const [savingTreatmentPlan, setSavingTreatmentPlan] = useState(false);
const [treatmentNoteDraft, setTreatmentNoteDraft] = useState('');
const [treatmentEntryMode, setTreatmentEntryMode] = useState<'plan' | 'progress'>('progress');
const [followUpDate, setFollowUpDate] = useState('');
const [referringFacility, setReferringFacility] = useState('');
const [referralDirection, setReferralDirection] = useState<'from' | 'to'>('from');
const [savingGeneralInfo, setSavingGeneralInfo] = useState(false);
const [treatmentNotes, setTreatmentNotes] = useState<{ author: string; date: string; text: string }[]>([]);
const [physicianNotes, setPhysicianNotes] = useState<{ author: string; date: string; text: string }[]>([]);
const [modalType, setModalType] = useState<ModalType>(null);
const [medicationSectionTab, setMedicationSectionTab] = useState<'medications' | 'consumables'>('medications');
const [activeTab, setActiveTab] = useState<EntryTab>(() => {
const hash = window.location.hash.replace('#', '');
if (hash === 'orders') return 'orders';
if (hash === 'vitals') return 'vitals';
return 'clinical';
});
const selectTab = (tab: EntryTab) => {
setActiveTab(tab);
window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${tab}`);
};
const [assessmentOpen, setAssessmentOpen] = useState(false);
const [assessmentDirty, setAssessmentDirty] = useState(false);
const [assessmentSaveStatus, setAssessmentSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
const [consumableUses, setConsumableUses] = useState<any[]>([]);
const [editingConsumable, setEditingConsumable] = useState<any | null>(null);
const [editingEntry, setEditingEntry] = useState<{ type: MedicalEntryEditType; entry: any } | null>(null);
const [savingEntry, setSavingEntry] = useState(false);
const [editingNote, setEditingNote] = useState<{ type: 'treatment' | 'physician' | 'plan'; index: number } | null>(null);
const [editingNoteText, setEditingNoteText] = useState('');
const [savingNote, setSavingNote] = useState(false);
const currentAttendanceRef = useRef(currentAttendance);
currentAttendanceRef.current = currentAttendance;
const assessmentValue: ClinicalAssessmentValue = {
complaints: presentedComplaints,
history: hpc,
odq,
examination: physicalExam,
reviewOfSystems,
physicalExamStructured,
};
const saveAssessment = useCallback((next: ClinicalAssessmentValue) => {
setPresentedComplaints(next.complaints);
setHpc(next.history);
setOdq(next.odq);
setPhysicalExam(next.examination);
setReviewOfSystems(next.reviewOfSystems);
setPhysicalExamStructured(next.physicalExamStructured);
setAssessmentDirty(true);
setAssessmentSaveStatus('idle');
}, []);
const loadConsumableUses = async (id: string) => {
const response = await getEncounterConsumableUses(id);
const data = response?.data;
setConsumableUses(Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []);
};
const loadData = async () => {
setRefreshing(true);
const secondaryLoads = Promise.all([
getAttendances({ live: true, limit: 500 }),
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
useLiveRefresh(['encounters'], async () => {
if (!selectedAttendanceId || modalType) return;
await refreshAttendance(selectedAttendanceId);
const v = await getVitalsByAttendance(selectedAttendanceId).catch(() => null);
if (v) {
    setLatestVitals(v.length ? v[v.length - 1] : null);
    setAllVitals(v); // Update full list for vitals tab
}
});
useEffect(() => { loadData(); }, []);
useEffect(() => {
if (!selectedAttendanceId) return;
getVitalsByAttendance(selectedAttendanceId)
.then(v => {
    const list = Array.isArray(v) ? v : [];
    setAllVitals(list);
    setLatestVitals(list.length ? list[list.length - 1] : null);
})
.catch(() => { setLatestVitals(null); setAllVitals([]); });
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
setSelectedAttendanceId(attendanceId);
}, [attendanceId]);
const requestedEntry = searchParams.get('entry');
useEffect(() => {
if (!requestedEntry || !selectedAttendanceId) return;
const openable: ModalType[] = ['diagnosis', 'lab', 'procedure', 'medication', 'scan', 'consumable'];
if (openable.includes(requestedEntry as ModalType)) {
setModalType(requestedEntry as ModalType);
if (requestedEntry === 'diagnosis') selectTab('clinical');
else selectTab('orders');
}
const remaining = new URLSearchParams(searchParams);
remaining.delete('entry');
setSearchParams(remaining, { replace: true });
}, [requestedEntry, selectedAttendanceId, searchParams, setSearchParams]);
useEffect(() => {
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
setReferringFacility(att.referringFacility || '');
setReferralDirection(clinicalNotes.referralDirection === 'to' ? 'to' : 'from');
setTreatmentNotes(clinicalNotes.treatmentNotes || (att as any).treatmentNotes || []);
setPhysicianNotes(clinicalNotes.physicianNotes || (att as any).physicianNotes || []);
const savedPlan = (att as any).treatmentPlan ?? clinicalNotes.treatmentPlan ?? '';
setTreatmentPlan(savedPlan);
const savedPlanEntries = Array.isArray(clinicalNotes.treatmentPlanEntries) ? clinicalNotes.treatmentPlanEntries : [];
const legacyPlanAudit = clinicalNotes.treatmentPlanAudit || {};
setTreatmentPlanEntries(savedPlanEntries.length ? savedPlanEntries : savedPlan ? [{ author: legacyPlanAudit.updatedByName || 'Previously recorded', authorId: legacyPlanAudit.updatedById || null, date: legacyPlanAudit.updatedAt || (att as any).updatedAt || (att as any).createdAt || new Date().toISOString(), text: savedPlan }] : []);
})
.catch((error: Error) => {
if (active) toastError('Clinical notes unavailable', error.message || 'Could not load saved clinical notes');
});
return () => { active = false; };
}, [selectedAttendanceId, getAttendance, toastError]);
const selectedPatient = (currentPatient?.id === selectedPatientId ? currentPatient : undefined)
|| patients.find(p => getEntityId(p) === selectedPatientId)
|| null;
const handlePrintMedicalRecord = () => {
if (!selectedAttendanceId || !currentAttendance) {
toastError('No visit selected', 'Select a patient attendance before printing the medical record.');
return;
}
const loggedTreatmentNotes = treatmentNotes
.map(note => [note.date ? new Date(note.date).toLocaleString() : '', note.author, note.text].filter(Boolean).join(' · '))
.filter(Boolean)
.join('\n');
const attendanceRecord = currentAttendance as any;
const clinicalRecord = {
...attendanceRecord,
complaints: presentedComplaints || attendanceRecord.complaints || attendanceRecord.chiefComplaint || '',
examination: [
hpc ? `History of presenting complaint: ${hpc}` : '',
odq ? `Onset / duration / quality: ${odq}` : '',
physicalExam || attendanceRecord.examination || attendanceRecord.physicalExamination || '',
].filter(Boolean).join('\n'),
assessment: assessment || attendanceRecord.assessment || '',
medicalNotes: [
treatmentPlan ? `Treatment plan:\n${treatmentPlan}` : '',
loggedTreatmentNotes ? `Treatment notes:\n${loggedTreatmentNotes}` : '',
].filter(Boolean).join('\n') || attendanceRecord.medicalNotes || attendanceRecord.notes || '',
vitals: latestVitals ? [latestVitals] : attendanceRecord.Vitals || attendanceRecord.vitals || [],
};
const html = generatePDF('visitSummary', {
attendance: clinicalRecord,
patient: selectedPatient || attendanceRecord.Patient || attendanceRecord.patient,
}, hospital);
openPrintWindow(html, `Medical-Record-${attendanceRecord.attendanceNumber || selectedAttendanceId}`);
};
const canAddEntries = currentAttendance ? canAddMedicalEntries(currentAttendance) : false;
const isClinicalFinalized = Boolean((currentAttendance as any)?.finalizedAt);
const assessmentSignature = JSON.stringify(assessmentValue);
useEffect(() => {
if (!assessmentDirty || !selectedAttendanceId || !canAddEntries || isClinicalFinalized) return;
let cancelled = false;
const timer = window.setTimeout(async () => {
if (cancelled) return;
setAssessmentSaveStatus('saving');
try {
const clinicalNotes = {
...(currentAttendanceRef.current && typeof currentAttendanceRef.current.clinicalNotes === 'object' && !Array.isArray(currentAttendanceRef.current.clinicalNotes)
? currentAttendanceRef.current.clinicalNotes
: {}),
historyPresentingComplaint: hpc || null,
onsetDurationQuality: odq || null,
physicalExamination: physicalExam || null,
reviewOfSystems,
physicalExamStructured,
assessmentDraftAudit: {
updatedById: user?.id || null,
updatedByName: user?.fullName || user?.username || 'Unknown user',
updatedAt: new Date().toISOString(),
},
};
await updateAttendance(selectedAttendanceId, {
complaints: presentedComplaints,
historyPresentingComplaint: hpc,
onsetDurationQuality: odq,
reviewOfSystems,
physicalExamination: physicalExam,
physicalExamStructured,
clinicalNotes,
updatedById: user?.id,
});
if (!cancelled) {
setAssessmentDirty(false);
setAssessmentSaveStatus('saved');
}
} catch (error) {
if (!cancelled) {
setAssessmentDirty(false);
setAssessmentSaveStatus('error');
toastError('Clinical draft autosave failed', (error as any)?.response?.data?.message || (error as Error)?.message || 'Please reopen the assessment and make a small edit to retry.');
}
}
}, 900);
return () => { cancelled = true; window.clearTimeout(timer); };
}, [assessmentDirty, assessmentSignature, selectedAttendanceId, canAddEntries, isClinicalFinalized, hpc, odq, physicalExam, reviewOfSystems, physicalExamStructured, presentedComplaints, user?.id, user?.fullName, user?.username, updateAttendance, toastError]);

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
const requestedScans = scansList.filter(s => ['requested', 'scheduled', 'in_progress'].includes(s.status));
const completedScans = scansList.filter(s => s.status === 'completed');
const openOrderCount = labTestsList.filter((item: any) => ['requested', 'in_progress'].includes(item.status)).length
+ requestedScans.length
+ proceduresList.filter((item: any) => ['scheduled', 'in_progress'].includes(item.status)).length
+ medicationsList.filter((m: any) => m.status === 'prescribed').length + consumableUses.length;
const vitalRows: any[] = (currentAttendance as any)?.Vitals?.length
? (currentAttendance as any).Vitals
: (latestVitals ? [latestVitals] : []);
const hasVitalValue = (field: string) => vitalRows.some((row: any) => row?.[field] !== null && row?.[field] !== undefined && row?.[field] !== '');
const hasStructuredNotes = (values?: Record<string, string>) =>
!!values && Object.values(values).some((value) => typeof value === 'string' && value.trim());
const recordedAllergies = (selectedPatient as any)?.allergies || (currentAttendance as any)?.Patient?.allergies || [];
const finalizeGaps: string[] = [];
if (!presentedComplaints.trim()) finalizeGaps.push('presenting complaint');
if (!hpc.trim()) finalizeGaps.push('history of presenting complaint');
if (!assessment.trim()) finalizeGaps.push('clinical assessment');
if (!treatmentPlan.trim()) finalizeGaps.push('treatment plan');
if (!clinicalOutcome) finalizeGaps.push('clinical outcome at end of visit');
if (!(currentAttendance as any)?.providerId && !user?.id) finalizeGaps.push('responsible clinician');
const missingVitals = ([['blood pressure', 'bloodPressure'], ['temperature', 'temperature'],
['pulse', 'pulse'], ['respiratory rate', 'respiration']] as const)
.filter(([, field]) => !hasVitalValue(field)).map(([label]) => label);
if (missingVitals.length) finalizeGaps.push(`vitals (${missingVitals.join(', ')})`);
if (!hasStructuredNotes(reviewOfSystems)) finalizeGaps.push('structured review of systems');
if (!physicalExam.trim()) finalizeGaps.push('narrative physical examination');
if (!hasStructuredNotes(physicalExamStructured)) finalizeGaps.push('structured physical examination');
if (allergyReviewStatus === 'not_reviewed') finalizeGaps.push('allergy review');
if (allergyReviewStatus === 'no_known_allergies' && recordedAllergies.length > 0) finalizeGaps.push('allergy reconciliation with the recorded allergies');
if (allergyReviewStatus === 'allergies_present' && !allergyReviewNotes.trim() && recordedAllergies.length === 0) finalizeGaps.push('allergy details / reaction');
const handleClearSelection = async () => {
if (treatmentNoteDraft.trim() && !(await confirmDialog({ title: 'Discard progress note?', message: 'The progress note you are typing has not been saved. Leave this patient record and discard it?', confirmText: 'Discard', type: 'warning' }))) return;
setSelectedPatientId(''); setSelectedAttendanceId('');
setPresentedComplaints(''); setHpc(''); setOdq('');
setPhysicalExam(''); setAssessment(''); setReviewOfSystems({}); setPhysicalExamStructured({});
setAllergyReviewStatus('not_reviewed'); setAllergyReviewNotes(''); setClinicalOutcome('');
setTreatmentPlan(''); setTreatmentPlanEntries([]); setTreatmentNoteDraft(''); setFollowUpDate('');
setReferringFacility(''); setReferralDirection('from');
setTreatmentNotes([]); setPhysicianNotes([]);
setPhysicianNoteText('');
};
const handleSaveGeneralInfo = async () => {
if (!selectedAttendanceId || !canAddEntries || isClinicalFinalized) return;
setSavingGeneralInfo(true);
try {
const existingClinicalNotes = currentAttendance?.clinicalNotes && typeof currentAttendance.clinicalNotes === 'object' && !Array.isArray(currentAttendance.clinicalNotes)
? currentAttendance.clinicalNotes as Record<string, any>
: {};
await updateAttendance(selectedAttendanceId, {
followUpDate: followUpDate ? new Date(followUpDate) : null,
referringFacility: referringFacility.trim() || null,
clinicalNotes: { ...existingClinicalNotes, referralDirection },
updatedById: user?.id,
});
success('Saved', 'Follow-up and referral details updated');
await getAttendance(selectedAttendanceId);
} catch (err: any) {
toastError('Save failed', err?.response?.data?.message || err.message || 'Could not save follow-up and referral details');
} finally {
setSavingGeneralInfo(false);
}
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
treatmentPlanAudit: treatmentPlan !== (currentAttendance as any)?.treatmentPlan
                ? { updatedById: user?.id || null, updatedByName: user?.fullName || user?.username || 'Unknown user', updatedAt: new Date().toISOString() }
                : (currentAttendance?.clinicalNotes as any)?.treatmentPlanAudit || null,
clinicalNotesAudit: (currentAttendance?.clinicalNotes as any)?.clinicalNotesAudit || null,
reviewOfSystems,
physicalExamStructured,
referralDirection,
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
referringFacility: referringFacility.trim() || null,
updatedById: user?.id,
});
success('Saved', 'Clinical information updated');
await getAttendance(selectedAttendanceId);
} catch (err: any) { toastError('Save failed', err?.response?.data?.message || err.message); }
};
const handleFinalizeClinical = async () => {
if (!selectedAttendanceId) return;
if (assessmentDirty || assessmentSaveStatus === 'saving') {
toastError('Draft still saving', 'Wait for the clinical assessment draft to finish saving before signing the record.');
return;
}
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
toastError('Cannot finalize clinical record',
err?.response?.data?.message || err.message || 'Complete all required clinical sections first.');
}
};
const handleCompleteAttendance = async () => {
if (!selectedAttendanceId || !currentAttendance) return;
const confirmed = await confirmDialog({
title: 'Complete OPD attendance',
message: 'The clinical record has been signed. Close this OPD attendance now? Any outstanding laboratory, scan or pharmacy work will remain visible in its respective worklist.',
confirmText: 'Complete attendance',
type: 'info',
});
if (!confirmed) return;
try {
await completeEncounter(selectedAttendanceId);
success('Attendance completed', 'This OPD visit has been closed.');
await getAttendance(selectedAttendanceId);
await getAttendances();
} catch (err: any) {
toastError('Could not complete attendance',
err?.response?.data?.message || err.message || 'Please refresh and try again.');
}
};
const handleSaveTreatmentNote = async () => {
if (!selectedAttendanceId || !treatmentNoteDraft.trim()) return;
setSavingTreatmentPlan(true);
const now = new Date().toISOString();
const actorName = user?.fullName || user?.username || 'Unknown user';
try {
const existingClinicalNotes = currentAttendance?.clinicalNotes && typeof currentAttendance.clinicalNotes === 'object' && !Array.isArray(currentAttendance.clinicalNotes)
? currentAttendance.clinicalNotes as Record<string, any>
: {};
if (treatmentEntryMode === 'plan') {
const newPlanEntry = { author: actorName, authorId: user?.id || null, date: now, text: treatmentNoteDraft.trim() };
const updatedPlanEntries = [...treatmentPlanEntries, newPlanEntry];
const treatmentPlanAudit = { updatedById: user?.id || null, updatedByName: actorName, updatedAt: now };
await updateAttendance(selectedAttendanceId, {
treatmentPlan: treatmentNoteDraft.trim(),
clinicalNotes: { ...existingClinicalNotes, treatmentPlanEntries: updatedPlanEntries, treatmentPlanAudit },
updatedById: user?.id,
});
setTreatmentPlan(treatmentNoteDraft.trim());
setTreatmentPlanEntries(updatedPlanEntries);
success('Treatment plan entry added', `Entered by ${actorName}`);
} else {
const newNote = { author: actorName, authorId: user?.id || null, date: now, text: treatmentNoteDraft.trim() };
const updatedNotes = [...treatmentNotes, newNote];
await updateAttendance(selectedAttendanceId, {
clinicalNotes: { ...existingClinicalNotes, treatmentNotes: updatedNotes },
updatedById: user?.id,
});
setTreatmentNotes(updatedNotes);
success('Clinical note added', `Entered by ${actorName}`);
}
setTreatmentNoteDraft('');
setIsEditingTreatmentPlan(false);
await getAttendance(selectedAttendanceId);
} catch (err: any) {
toastError('Save failed', err?.response?.data?.message || err.message || 'Could not save the entry');
} finally {
setSavingTreatmentPlan(false);
}
};
const handleDeleteItem = async (type: string, id: string) => {
if (!selectedAttendanceId) return;
try {
const order = type === 'lab' ? labTestsList.find((item: any) => item.id === id)
: type === 'scan' ? scansList.find((item: any) => item.id === id)
: type === 'procedure' ? proceduresList.find((item: any) => item.id === id)
: type === 'medication' ? medicationsList.find((item: any) => item.id === id)
: null;
const willCancel = order?.status === 'in_progress';
const fn: Record<string, () => Promise<void>> = {
diagnosis: () => removeDiagnosis(selectedAttendanceId, id),
lab: () => removeLabTest(selectedAttendanceId, id),
procedure: () => removeProcedure(selectedAttendanceId, id),
medication: () => removeMedication(selectedAttendanceId, id),
scan: () => removeScan(selectedAttendanceId, id),
};
await fn[type]?.();
success(willCancel ? 'Cancelled' : 'Deleted', willCancel
? `${type} had already started and is now marked as cancelled`
: `${type} entry removed because work had not started`);
await getAttendance(selectedAttendanceId);
await calculateBill(selectedAttendanceId);
} catch (err: any) { toastError('Delete failed', err.message); }
};
const handleEditNote = (type: 'treatment' | 'physician' | 'plan', index: number) => {
const note = (type === 'treatment' ? treatmentNotes : type === 'plan' ? treatmentPlanEntries : physicianNotes)[index];
if (!note) return;
setEditingNote({ type, index });
setEditingNoteText(note.text || '');
};
const handleSaveNoteEdit = async () => {
if (!selectedAttendanceId || !editingNote || !editingNoteText.trim()) return;
setSavingNote(true);
try {
if (editingNote.type === 'plan') {
const updatedPlans = treatmentPlanEntries.map((note, i) => i === editingNote.index ? { ...note, text: editingNoteText.trim(), editedById: user?.id || null, editedBy: user?.fullName || user?.username || 'Unknown user', editedAt: new Date().toISOString() } : note);
const latestPlan = updatedPlans[updatedPlans.length - 1]?.text || '';
const clinicalNotes = { ...(currentAttendance && typeof currentAttendance.clinicalNotes === 'object' && !Array.isArray(currentAttendance.clinicalNotes) ? currentAttendance.clinicalNotes : {}), treatmentPlanEntries: updatedPlans, treatmentPlanAudit: { updatedById: user?.id || null, updatedByName: user?.fullName || user?.username || 'Unknown user', updatedAt: new Date().toISOString() } };
await updateAttendance(selectedAttendanceId, { treatmentPlan: latestPlan, clinicalNotes, updatedById: user?.id });
setTreatmentPlanEntries(updatedPlans);
setTreatmentPlan(latestPlan);
} else if (editingNote.type === 'treatment') {
const updatedNotes = treatmentNotes.map((note, i) => i === editingNote.index ? {
...note,
text: editingNoteText.trim(),
editedById: user?.id || null,
editedBy: user?.fullName || user?.username || 'Unknown user',
editedAt: new Date().toISOString(),
} : note);
const clinicalNotes = {
...(currentAttendance && typeof currentAttendance.clinicalNotes === 'object' && !Array.isArray(currentAttendance.clinicalNotes) ? currentAttendance.clinicalNotes : {}),
treatmentNotes: updatedNotes,
};
await updateAttendance(selectedAttendanceId, { clinicalNotes, updatedById: user?.id });
setTreatmentNotes(updatedNotes);
} else {
const updatedNotes = physicianNotes.map((note, i) => i === editingNote.index ? {
...note,
text: editingNoteText.trim(),
editedById: user?.id || null,
editedBy: user?.fullName || user?.username || 'Unknown user',
editedAt: new Date().toISOString(),
} : note);
await updateAttendance(selectedAttendanceId, { physicianNotes: updatedNotes, updatedById: user?.id });
setPhysicianNotes(updatedNotes);
}
success('Saved', 'Note updated');
setEditingNote(null);
setEditingNoteText('');
await getAttendance(selectedAttendanceId);
} catch (err: any) { toastError('Note update failed', err.message || 'Could not update note'); }
finally { setSavingNote(false); }
};
const handleSaveEntryEdit = async (values: any) => {
if (!selectedAttendanceId || !editingEntry) return;
const { type, entry } = editingEntry;
setSavingEntry(true);
try {
if (type === 'diagnosis') await updateDiagnosis(selectedAttendanceId, entry.id, { ...values, classification: values.classification || null });
else if (type === 'lab') await updateLabTestStatus(selectedAttendanceId, entry.id, { status: entry.status, priority: values.priority, notes: values.notes });
else if (type === 'scan') await updateScanStatus(selectedAttendanceId, entry.id, { status: entry.status === 'scheduled' ? 'requested' : entry.status, priority: values.priority, notes: values.notes });
else if (type === 'procedure') await updateProcedureStatus(selectedAttendanceId, entry.id, { status: entry.status, scheduledDate: values.scheduledDate || null, notes: values.notes });
else if (type === 'medication') await updateMedicationStatus(selectedAttendanceId, entry.id, { status: entry.status, dosage: values.dosage, frequency: values.frequency, duration: values.duration });
success('Saved', 'Medical entry updated');
await getAttendance(selectedAttendanceId);
await calculateBill(selectedAttendanceId);
setEditingEntry(null);
} catch (err: any) { toastError('Update failed', err?.response?.data?.message || err.message || 'Could not update medical entry'); }
finally { setSavingEntry(false); }
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
const handleDaySurgery = () => {
setPendingAdmissionType('day_surgery');
setShowBedWardModal(true);
};
const executeDaySurgery = async (bedId: string, wardId: string, wardName: string, bedNumber: string) => {
if (!selectedAttendanceId || !currentAttendance || !selectedPatient) return;
setIsProcessing(true);
try {
await updateBed(bedId, {
isOccupied: true,
currentPatientId: selectedPatientId
});
await updateAttendance(selectedAttendanceId, {
encounterCategory: 'daycase',
status: 'admitted',
attendanceType: 'surgery',
bedId: bedId,
wardId: wardId,
updatedById: user?.id
});
success('Day Surgery', `Patient assigned to Bed ${bedNumber} in ${wardName} for day surgery`);
await refreshAttendance(selectedAttendanceId);
setShowBedWardModal(false);
setPendingAdmissionType(null);
} catch (err: any) {
toastError('Day Surgery Failed', err.response?.data?.message || err.message);
} finally {
setIsProcessing(false);
}
};
const handleDetainPatient = () => {
setPendingAdmissionType('detention');
setShowBedWardModal(true);
};
const executeDetention = async (bedId: string, wardId: string, wardName: string, bedNumber: string) => {
if (!selectedAttendanceId || !currentAttendance || !selectedPatient) return;
setIsProcessing(true);
try {
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
await refreshAttendance(selectedAttendanceId);
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
const handleDirectAdmit = () => {
setPendingAdmissionType('ipd');
setShowBedWardModal(true);
};
const executeAdmission = async (bedId: string, wardId: string, wardName: string, bedNumber: string, admissionNotes: string) => {
if (!selectedAttendanceId || !currentAttendance || !selectedPatient) return;
setIsProcessing(true);
try {
await createAdmission({
attendanceId: selectedAttendanceId,
bedId,
wardId,
admissionType: selectedAdmissionClass,
admissionSource: selectedAdmissionSource,
admissionDate: new Date().toISOString(),
});
success('Admitted', `Patient admitted to Bed ${bedNumber} in ${wardName} as formal IPD`);
await refreshAttendance(selectedAttendanceId);
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
const handleConvertToIPD = async () => {
if (!selectedAttendanceId || !currentAttendance) return;
try {
await convertDetentionToIPD(selectedAttendanceId, {
admissionType: 'emergency',
decisionReason: 'Clinical deterioration requiring full admission',
clinicalNotes: treatmentPlan || 'Patient requires continued care beyond observation period'
});
success('Converted', 'Patient converted to formal IPD admission');
await refreshAttendance(selectedAttendanceId);
} catch (err: any) {
toastError('Conversion Failed', err.response?.data?.message || err.message);
}
};
const handleDischargeFromObservation = async () => {
if (!selectedAttendanceId || !currentAttendance) return;
if (currentAttendance.status === 'discharged') {
toastError('Already discharged', 'This encounter is already closed. Refresh the record before taking further action.');
return;
}
setIsProcessing(true);
try {
await dischargeFromEncounter(selectedAttendanceId, { dischargeStatus: 'home' });
success('Discharged', 'Patient discharged from observation and bed occupancy updated.');
await refreshAttendance(selectedAttendanceId);
} catch (err: any) {
toastError('Discharge Failed', err.response?.data?.message || err.message || 'The patient could not be discharged.');
} finally {
setIsProcessing(false);
}
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
className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--icon-cyan-text)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] transition-all">
<Send className="w-3.5 h-3.5" /> Refer patient
</button>
);
}
if (category === 'ipd' && admissionType === 'detention_observation') {
return (
<div className="flex gap-2">
<button
onClick={handleConvertToIPD}
className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]
hover:bg-[var(--icon-purple-text)] hover:text-[var(--icon-purple-on-text)] transition-all"
>
<ArrowRight className="w-3.5 h-3.5" /> Convert to IPD
</button>
<button
onClick={handleDischargeFromObservation}
className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]
hover:bg-[var(--icon-green-text)] hover:text-[var(--icon-green-on-text)] transition-all"
>
<CheckCircle className="w-3.5 h-3.5" /> Discharge
</button>
<button type="button" onClick={handleReferPatient} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--icon-cyan-text)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] transition-all">
<ArrowRight className="w-3.5 h-3.5" /> Refer
</button>
</div>
);
}
if (status === 'admitted' && category === 'ipd') {
return (
<div className="flex flex-wrap gap-2">
<button onClick={() => navigate(`/dashboard/admissions/${currentAttendance?.Admission?.id || ''}`)}
className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] hover:bg-[var(--icon-green-text)] hover:text-[var(--icon-green-on-text)] transition-all">
<Hospital className="w-3.5 h-3.5" /> Manage Admission
</button>
<button type="button" onClick={handleReferPatient} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--icon-cyan-text)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] transition-all">
<ArrowRight className="w-3.5 h-3.5" /> Refer
</button>
</div>
);
}
return (
<div className="flex gap-2">
<button
onClick={handleDaySurgery}
className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]
hover:bg-[var(--icon-purple-text)] hover:text-[var(--icon-purple-on-text)] transition-all"
>
<Sun className="w-3.5 h-3.5" /> Day Surgery
</button>
<button
onClick={handleDetainPatient}
className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]
hover:bg-[var(--icon-orange-text)] hover:text-[var(--icon-orange-on-text)] transition-all"
>
<Moon className="w-3.5 h-3.5" /> Detain/Observe
</button>
<button
onClick={handleDirectAdmit}
className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]
hover:bg-[var(--icon-green-text)] hover:text-[var(--icon-green-on-text)] transition-all"
>
<Hospital className="w-3.5 h-3.5" /> Admit (IPD)
</button>
<button type="button" onClick={handleReferPatient} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--icon-cyan-text)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] transition-all">
<ArrowRight className="w-3.5 h-3.5" /> Refer
</button>
</div>
);
};
if (isLoading) return (
<div className="min-h-[60vh] flex items-center justify-center">
<div className="text-center">
<div className="w-10 h-10 border-2 border-[var(--icon-cyan-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
<p className="text-sm text-[var(--text-secondary)]">Loading medical entries…</p>
</div>
</div>
);
const paymentLabel = (() => {
const mode = currentAttendance?.paymentMode;
if (mode === 'nhis') return 'NHIS';
if (mode === 'private_insurance') return 'PRIVATE INS.';
return 'CASH';
})();
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
<PageHeader
title="Medical Entries"
subtitle="Clinical documentation"
icon={FileText}
accent="cyan"
onBack={goBack}
actions={(
<>
<button
onClick={handlePrintMedicalRecord}
disabled={!selectedAttendanceId || !currentAttendance}
title={!selectedAttendanceId ? 'Select a patient attendance to print its medical record' : 'Print selected patient medical record'}
className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)]
text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
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
</>
)}
/>
{/* ── PATIENT / ATTENDANCE SELECTOR ───────────────────────────────── */}
<PatientAttendanceSelector
patients={patients}
attendances={attendances}
selectedPatientId={selectedPatientId}
selectedAttendanceId={selectedAttendanceId}
onPatientSelect={(pid) => {
setSelectedPatientId(pid);
void getAttendances({ patientId: pid }).catch(() => {});
}}
onAttendanceSelect={setSelectedAttendanceId}
onClearSelection={handleClearSelection}
/>
{/* ── MAIN CONTENT (when attendance selected) ──────────────────────── */}
{selectedAttendanceId && currentAttendance ? (
<>
{/* ── PATIENT BANNER ─────────────────────────────────────────── */}
<PatientVisitHeader
patient={selectedPatient}
attendance={currentAttendance}
accent="cyan"
fields={[
{ label: 'Payment', value: paymentLabel },
{ label: 'Balance', value: `GHS ${(currentAttendance.outstandingBalance || 0).toFixed(2)}` },
]}
aside={
<>
<PatientStatusBadge
attendance={currentAttendance}
admissionType={currentAttendance.admissionType}
/>
{getActionButtons()}
</>
}
/>
<div className="flex flex-wrap items-stretch gap-2 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] px-5 py-4"
style={{ boxShadow: 'var(--shadow-sm)' }}>
<AllergyBanner
patientId={selectedPatientId}
allergies={selectedPatient?.allergies}
allergyReviewStatus={allergyReviewStatus}
className="min-w-0 flex-1 basis-[320px]"
/>
{(
(selectedPatient?.medicalHistories?.length || 0) > 0 ||
(selectedPatient?.surgicalHistories?.length || 0) > 0 ||
(selectedPatient?.familyHistories?.length || 0) > 0 ||
selectedPatient?.additionalInfo?.bloodType
) && (
<div className="min-w-0 flex-1 basis-[320px] rounded-lg border px-4 py-3" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-main)' }}>
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
<section data-ipd-banner className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] overflow-hidden shadow-sm dark:shadow-black/20"
aria-label="Active inpatient admission">
<div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
<div className="flex items-start gap-3 min-w-0">
<div className="w-10 h-10 rounded-xl bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] flex items-center justify-center flex-shrink-0">
<Hospital className="w-5 h-5" />
</div>
<div className="min-w-0">
<div className="flex flex-wrap items-center gap-2">
<h3 className="text-sm font-bold text-[var(--text-primary)]">Active Inpatient Admission</h3>
<span className="rounded-full bg-[var(--icon-cyan-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--icon-cyan-text)] ring-1 ring-inset ring-[var(--icon-cyan-text)]">IPD</span>
{linkedAdmission?.admissionNumber && <span className="text-[10px] font-mono text-[var(--text-tertiary)]">#{linkedAdmission.admissionNumber}</span>}
</div>
<p className="mt-1 text-xs font-medium text-[var(--text-secondary)]">
{currentAttendance?.Ward?.wardName || currentAttendance?.ward?.wardName || (currentAttendance as any)?.Bed?.Ward?.wardName || linkedAdmission?.attendance?.Ward?.wardName || linkedAdmission?.attendance?.ward?.wardName || linkedAdmission?.ward?.wardName || 'Ward not assigned'}
{' · '}
{currentAttendance?.Bed?.bedNumber || currentAttendance?.bed?.bedNumber || linkedAdmission?.attendance?.Bed?.bedNumber || linkedAdmission?.attendance?.bed?.bedNumber || linkedAdmission?.bed?.bedNumber
? `Bed ${currentAttendance?.Bed?.bedNumber || currentAttendance?.bed?.bedNumber || linkedAdmission?.attendance?.Bed?.bedNumber || linkedAdmission?.attendance?.bed?.bedNumber || linkedAdmission?.bed?.bedNumber}`
: 'Bed not assigned'}
{linkedAdmission?.admissionDate ? ` · Admitted ${new Date(linkedAdmission.admissionDate).toLocaleDateString()}` : ''}
</p>
<p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
Continue documenting progress, diagnoses, medications, investigations and treatment here. Use Admission Details for the stay overview and nursing/bed coordination.
</p>
</div>
</div>
<div className="flex flex-wrap gap-2 sm:justify-end">
{linkedAdmission?.id && (
<button type="button" onClick={() => navigate(`/dashboard/admissions/${linkedAdmission.id}`)}
className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--icon-cyan-bg)] px-3 py-2 text-xs font-semibold text-[var(--icon-cyan-text)] hover:opacity-85 transition-colors">
<Bed className="w-3.5 h-3.5" /> Admission Details
</button>
)}
<button type="button" onClick={() => navigate(`/dashboard/nursing/patient/${selectedAttendanceId}`)}
className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--icon-cyan-text)] transition-colors">
<ClipboardList className="w-3.5 h-3.5" /> Nursing
</button>
<button type="button" onClick={() => navigate(`/dashboard/vitals/${selectedAttendanceId}`)}
className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--icon-cyan-text)] transition-colors">
<Activity className="w-3.5 h-3.5" /> Observations
</button>
</div>
</div>
</section>
)}
{/* ── VITALS STRIP (Persistent Summary) ───────────────────────────────── */}
{latestVitals && (
<div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] px-5 py-3"
style={{ boxShadow: 'var(--shadow-sm)' }}>
<div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
{[
{ icon: <Gauge className="w-3.5 h-3.5 text-[var(--icon-blue-text)]" />, value: latestVitals.bloodPressure || '—', label: 'BP', type: 'bp' },
{ icon: <Thermometer className="w-3.5 h-3.5 text-[var(--icon-yellow-text)]" />, value: latestVitals.temperature ? `${latestVitals.temperature}°` : '—', label: 'Temp', type: 'temp' },
{ icon: <Heart className="w-3.5 h-3.5 text-[var(--icon-red-text)]" />, value: latestVitals.pulse || '—', label: 'Pulse', type: 'pulse' },
{ icon: <Wind className="w-3.5 h-3.5 text-[var(--icon-cyan-text)]" />, value: latestVitals.respiration || '—', label: 'Resp', type: null },
{ icon: <Droplets className="w-3.5 h-3.5 text-[var(--icon-blue-text)]" />, value: latestVitals.spo2 ? `${latestVitals.spo2}%` : '—', label: 'SpO₂', type: 'spo2' },
{ icon: <Weight className="w-3.5 h-3.5 text-[var(--icon-yellow-text)]" />, value: latestVitals.weight ? `${latestVitals.weight}kg` : '—', label: 'Weight', type: null },
{ icon: <Ruler className="w-3.5 h-3.5 text-[var(--icon-cyan-text)]" />, value: latestVitals.height ? `${latestVitals.height}cm` : '—', label: 'Height', type: null },
{ icon: <Activity className="w-3.5 h-3.5 text-[var(--icon-purple-text)]" />, value: latestVitals.bmi || '—', label: 'BMI', type: null },
{ icon: <Activity className="w-3.5 h-3.5 text-[var(--icon-purple-text)]" />, value: latestVitals.muac || '—', label: 'MUAC', type: null },
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
{/* TAB BAR */}
<div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
<div className="flex items-center border-b border-[var(--border-color)] px-1">
<div className="flex overflow-x-auto">
{[
{ key: 'clinical' as EntryTab, label: 'Clinical', icon: <Stethoscope className="w-3.5 h-3.5" />, count: diagnosesList.length },
{ key: 'orders' as EntryTab, label: 'Orders', icon: <ClipboardList className="w-3.5 h-3.5" />, count: openOrderCount },
{ key: 'vitals' as EntryTab, label: 'Vitals History', icon: <Activity className="w-3.5 h-3.5" />, count: allVitals.length },
...(hasRole(['admin', 'doctor', 'nurse', 'midwife']) ? [{ key: 'hiv-testing' as EntryTab, label: 'HIV Counselling / HTS', icon: <Shield className="w-3.5 h-3.5" />, count: 0 }] : []),
].map(tab => {
const isActive = activeTab === tab.key;
return (
<button key={tab.key} onClick={() => selectTab(tab.key)}
className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-semibold border-b-2 whitespace-nowrap transition-all ${isActive
? 'border-[var(--icon-cyan-text)] text-[var(--icon-cyan-text)]'
: 'border-transparent text-[var(--text-secondary)] hover:text-[var(--icon-cyan-text)]'
}`}>
{tab.icon}{tab.label}
{tab.count > 0 && (
<span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[var(--bg-main)] text-[var(--text-tertiary)]">{tab.count}</span>
)}
</button>
);
})}
</div>
</div>
</div>

            {/* ── CLINICAL TAB ── */}
            {activeTab === 'clinical' && (
                <div className="space-y-4">
                    {/* The assessment and the safety/outcome review are two halves of one consultation
                        record, so they sit beside each other instead of pushing each other down. */}
                    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
                        <div className="min-w-0 space-y-4">
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
                                <div className="p-3 space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--text-secondary)]">
                                        <span>Responsible clinician: <span className="font-semibold text-[var(--text-primary)]">{user?.fullName || user?.username || 'Not assigned'}</span></span>
                                        <span className={assessmentSaveStatus === 'error' ? 'font-semibold text-[var(--icon-red-text)]' : 'text-[var(--text-tertiary)]'}>
                                            {isClinicalFinalized ? 'Signed clinical record — read-only' : assessmentSaveStatus === 'saving' ? 'Saving draft…' : assessmentSaveStatus === 'saved' ? 'Draft saved' : assessmentSaveStatus === 'error' ? 'Autosave failed — edit to retry' : 'Draft not yet changed'}
                                        </span>
                                    </div>
                                    <ClinicalAssessmentSummary
                                        value={assessmentValue}
                                        onEdit={() => setAssessmentOpen(true)}
                                        editDisabled={!canAddEntries || isClinicalFinalized}
                                    />
                                </div>
                            </section>
                        </div>
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
                                            ? <p className="text-[10px] text-[var(--icon-yellow-text)]">Existing patient allergies: {existingAllergies.map((a: any) => [a.allergen, a.reaction, a.severity].filter(Boolean).join(' — ')).join('; ')}</p>
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
                                    <div className="space-y-2">
                                        {!isClinicalFinalized && finalizeGaps.length > 0 && (
                                            <p className="rounded-lg border border-[var(--icon-yellow-text)] bg-[var(--icon-yellow-bg)] px-3 py-2 text-[10px] leading-relaxed text-[var(--icon-yellow-text)]">
                                                <span className="font-bold uppercase tracking-wider">Still needed to sign</span> — {finalizeGaps.join(', ')}
                                            </p>
                                        )}
                                        <div className="flex justify-end gap-2">
                                            <button type="button" onClick={handleFinalizeClinical}
                                                disabled={Boolean((currentAttendance as any)?.finalizedAt)}
                                                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold border border-[var(--icon-green-text)] text-[var(--icon-green-text)] hover:bg-[var(--icon-green-bg)] disabled:opacity-50">
                                                <CheckCircle className="w-3.5 h-3.5" /> {(currentAttendance as any)?.finalizedAt ? 'Finalized' : 'Finalize & Sign'}
                                            </button>
                                            {currentAttendance?.encounterCategory === 'opd' &&
                                                currentAttendance?.status === 'pending' && isClinicalFinalized && (
                                                    <button type="button" onClick={handleCompleteAttendance}
                                                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] hover:opacity-85 transition-colors">
                                                        <CheckCircle className="w-3.5 h-3.5" /> Complete Attendance
                                                    </button>
                                                )}
                                            <button
                                                onClick={handleSaveClinical} disabled={isClinicalFinalized}
                                                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50
                      bg-[var(--icon-cyan-text)] text-[var(--icon-cyan-on-text)] hover:opacity-90 transition-all"
                                            >
                                                <CheckCircle className="w-3.5 h-3.5" /> Save Clinical Info
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* ── DIAGNOSIS ─────────────────────────────────────────── */}
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
                                                    {item.diagnosis?.name || item.Diagnosis?.name || '—'}
                                                    {item.notes && <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{item.notes}</p>}
                                                </TdPrimary>
                                                <Td className="font-mono">{item.icdCode || item.diagnosis?.icdCode || item.Diagnosis?.icdCode || '—'}</Td>
                                                <Td><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.cls}`}>{c.label}</span></Td>
                                                <Td>{item.User?.fullName || item.user?.fullName || item.createdBy?.fullName || 'Unknown user'}</Td>
                                                <Td>{new Date(item.date || item.createdAt).toLocaleString()}</Td>
                                                <Td>{canAddEntries && <><EditBtn onClick={() => setEditingEntry({ type: 'diagnosis', entry: item })} /><DelBtn onClick={() => handleDeleteItem('diagnosis', item.id)} /></>}</Td>
                                            </tr>
                                        );
                                    })}
                                </Table>
                            )}
                    </SectionCard>

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
                                            disabled={!canAddEntries || isClinicalFinalized}
                                            className="w-full px-3 py-1.5 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]" />
                                    ),
                                },
                                {
                                    label: 'Referral',
                                    content: (() => {
                                        const attendanceReferral = (currentAttendance as any)?.referral;
                                        const referralRecord = Array.isArray(attendanceReferral)
                                            ? attendanceReferral.find((item: any) => item?.referralType === 'outgoing' || item?.referralType === 'incoming') || attendanceReferral[0]
                                            : attendanceReferral;
                                        const isOutgoing = referralRecord?.referralType === 'outgoing'
                                            || (!referralRecord && referralDirection === 'to');
                                        const facility = isOutgoing
                                            ? referralRecord?.referredToFacility || (referralDirection === 'to' ? referringFacility : '')
                                            : referralRecord?.referredFromFacility || referringFacility;
                                        return (
                                            <div className="min-h-[34px] rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-primary)]">
                                                {facility?.trim()
                                                    ? <span><span className="font-semibold">{isOutgoing ? 'Referred to' : 'Referred from'}:</span> {facility}</span>
                                                    : <span className="text-[var(--text-tertiary)]">No referral data</span>}
                                            </div>
                                        );
                                    })(),
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
                        <div className="flex justify-end border-t border-[var(--border-color)] bg-[var(--bg-main)] px-4 py-2.5">
                            <button type="button" onClick={handleSaveGeneralInfo} disabled={!canAddEntries || isClinicalFinalized || savingGeneralInfo}
                                className="rounded-lg bg-[var(--icon-cyan-text)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50">
                                {savingGeneralInfo ? 'Saving…' : 'Save follow-up & referral'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── ORDERS TAB ── */}
            {activeTab === 'orders' && (
                <div className="space-y-4">
                    {/* Medication and consumable tabs live in the section header, above their content. */}
                    <section className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
                        <div className="flex min-w-0 items-center gap-1 overflow-x-auto border-b border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2">
                            <button type="button" onClick={() => setMedicationSectionTab('medications')}
                                className={`shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold transition-colors ${medicationSectionTab === 'medications' ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'}`}>
                                Prescribed Medications <span className="ml-1 inline-block opacity-75">({medicationsList.length})</span>
                            </button>
                            <button type="button" onClick={() => setMedicationSectionTab('consumables')}
                                className={`shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold transition-colors ${medicationSectionTab === 'consumables' ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'}`}>
                                Consumables Issued <span className="ml-1 inline-block opacity-75">({consumableUses.length})</span>
                            </button>
                        </div>
                        <div className="p-3">

                    {/* ── MEDICATIONS: prescription beside the dispensed record ── */}
                    {medicationSectionTab === 'medications' && (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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
                                        <div className="w-full min-w-0 overflow-x-auto">
                                            <Table heads={['Medication', 'Dosage', 'Frequency', 'Days', 'Route', 'Status', 'Prescribed by / date', '']}>
                                            {medicationsList.map((med: any) => (
                                                <tr key={med.id} className="hover:bg-[var(--bg-main)] transition-colors align-top">
                                                    <TdPrimary>
                                                        {med.name}
                                                        
                                                    </TdPrimary>
                                                    <Td>{med.dosage || '—'}</Td>
                                                    <Td>{med.frequency || '—'}</Td>
                                                    <Td>{med.duration || '—'}</Td>
                                                    <Td>{med.route || '—'}</Td>
                                                    <Td><StatusBadge status={med.status} /></Td>
                                                    <Td>
                                                        <p>{med.prescribedAt ? new Date(med.prescribedAt).toLocaleString() : med.createdAt ? new Date(med.createdAt).toLocaleString() : '—'}</p>
                                                        <p className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">{med.User_Medication_prescribedByIdToUser?.fullName || med.prescribedBy?.fullName || 'Unknown user'}</p>
                                                    </Td>
                                                    <Td>
                                                        {canAddEntries && med.status === 'prescribed'
                                                            ? <><EditBtn onClick={() => setEditingEntry({ type: 'medication', entry: med })} /><DelBtn onClick={() => handleDeleteItem('medication', med.id)} /></>
                                                            : med.status === 'dispensed'
                                                                ? <CheckCircle className="w-3.5 h-3.5 text-[var(--icon-green-text)]" />
                                                                : null}
                                                    </Td>
                                                </tr>
                                            ))}
                                            </Table>
                                        </div>
                                    )}
                            </SectionCard>
                            <SectionCard
                                icon={<CheckCircle className="w-4 h-4 text-[var(--icon-cyan-text)]" />}
                                title="Dispensed History"
                                count={dispensedMeds.length}
                                countColor="bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]"
                            >
                                {dispensedMeds.length === 0
                                    ? <EmptyState icon={<CheckCircle className="w-9 h-9" />} label="No medications dispensed yet" />
                                    : (
                                        <Table heads={['Medication', 'Qty', 'Unit Cost', 'Total', 'Dispensed']}
                                            colWidths={['32%', '10%', '16%', '16%', '26%']}>
                                            {dispensedMeds.map((med: any) => {
                                                const unitCost = Number(med.dispensedUnitCost ?? med.unitCost ?? 0);
                                                const qty = Number(med.dispensedQuantity ?? med.quantity ?? 0);
                                                return (
                                                    <tr key={med.id} className="hover:bg-[var(--bg-main)] transition-colors align-top">
                                                        <TdPrimary>
                                                            {med.name}
                                                            {(med.dosage || med.frequency) && (
                                                                <p className="text-[10px] font-normal text-[var(--text-tertiary)] mt-0.5">
                                                                    {[med.dosage, med.frequency].filter(Boolean).join(' · ')}
                                                                </p>
                                                            )}
                                                        </TdPrimary>
                                                        <Td>{qty || '—'}</Td>
                                                        <Td>GHS {unitCost.toFixed(2)}</Td>
                                                        <Td className="font-semibold text-[var(--text-primary)]">GHS {(unitCost * qty).toFixed(2)}</Td>
                                                        <Td>
                                                            <p>{med.dispensedAt ? new Date(med.dispensedAt).toLocaleString() : '—'}</p>
                                                            {med.User_Medication_dispensedByIdToUser?.fullName && (
                                                                <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{med.User_Medication_dispensedByIdToUser.fullName}</p>
                                                            )}
                                                        </Td>
                                                    </tr>
                                                );
                                            })}
                                        </Table>
                                    )}
                            </SectionCard>
                        </div>
                    )}

                    {/* Consumables are stock issued against the visit: recording one deducts stock
                        immediately, with no prescription/dispense step. */}
                    {medicationSectionTab === 'consumables' && (
                        <SectionCard
                            icon={<Package className="w-4 h-4 text-[var(--icon-cyan-text)]" />}
                            title="Consumables Issued"
                            count={consumableUses.length}
                            maxH="max-h-96"
                            action={canAddEntries && <AddBtn onClick={() => { setEditingConsumable(null); setModalType('consumable'); }} label="Add consumable" />}
                        >
                            <ConsumableUsesPanel uses={consumableUses}
                                onEdit={canAddEntries ? use => { setEditingConsumable(use); setModalType('consumable'); } : undefined}
                                onDelete={canAddEntries ? deleteConsumableUse : undefined} />
                        </SectionCard>
                    )}

                        </div>
                    </section>

                    {/* ── LABS: the request beside the results that came back ── */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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
                                    <Table heads={['Test', 'Priority', 'Status', 'Requested', 'Requested by', '']}>
                                        {labTestsList.map((t: any) => (
                                            <tr key={t.id} className="hover:bg-[var(--bg-main)] transition-colors align-top">
                                                <TdPrimary>
                                                    {t.ServiceCatalog?.name || t.LabTestTemplate?.name || t.name || 'Lab test'}
                                                    {t.notes && <p className="text-[10px] font-normal text-[var(--text-tertiary)] mt-0.5 whitespace-pre-wrap">{t.notes}</p>}
                                                </TdPrimary>
                                                <Td>
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${t.priority === 'stat' ? 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]' :
                                                        t.priority === 'urgent' ? 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]' :
                                                            'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
                                                        }`}>{t.priority || 'routine'}</span>
                                                </Td>
                                                <Td><StatusBadge status={t.status} /></Td>
                                                <Td>{t.requestedAt ? new Date(t.requestedAt).toLocaleString() : t.createdAt ? new Date(t.createdAt).toLocaleString() : '—'}</Td>
                                                <Td>{t.User_LabTest_createdByIdToUser?.fullName || t.createdBy?.fullName || 'Unknown user'}</Td>
                                                <Td>{canAddEntries && (t.status === 'requested' || t.status === 'in_progress') && <><EditBtn onClick={() => setEditingEntry({ type: 'lab', entry: t })} /><DelBtn onClick={() => handleDeleteItem('lab', t.id)} /></>}</Td>
                                            </tr>
                                        ))}
                                    </Table>
                                )}
                        </SectionCard>
                        <SectionCard
                            icon={<CheckCircle className="w-4 h-4 text-[var(--icon-green-text)]" />}
                            title="Investigation Results"
                            count={labTestsList.filter((t: any) => t.status === 'completed').length}
                            countColor="bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]"
                            maxH="max-h-80"
                        >
                            {labTestsList.filter((t: any) => t.status === 'completed').length === 0
                                ? <EmptyState icon={<FlaskConical className="w-9 h-9" />} label="No results available yet" />
                                : (
                                    <Table heads={['Parameter', 'Result', 'Unit', 'Reference', 'Flag']}
                                        colWidths={['36%', '14%', '12%', '24%', '14%']}>
                                        {labTestsList.filter((t: any) => t.status === 'completed').map((test: any) => {
                                            const params: any[] = Array.isArray(test.result?.parameters) ? test.result.parameters : [];
                                            const rows = params.length > 0
                                                ? params
                                                : [{
                                                    name: 'Result',
                                                    value: test.result && typeof test.result === 'object' ? (test.result.value ?? '—') : (test.result ?? '—'),
                                                    unit: test.units,
                                                    normalRange: test.normalRange,
                                                }];
                                            return (
                                                <React.Fragment key={test.id}>
                                                    <tr className="bg-[var(--bg-main)]">
                                                        <td colSpan={5} className="px-3 py-2">
                                                            <p className="text-[var(--text-primary)] font-semibold">
                                                                {test.ServiceCatalog?.name || test.LabTestTemplate?.name || test.name || 'Lab test'}
                                                            </p>
                                                            {test.notes && (
                                                                <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 whitespace-pre-wrap">{test.notes}</p>
                                                            )}
                                                            {test.result?.summary && (
                                                                <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 whitespace-pre-wrap">{test.result.summary}</p>
                                                            )}
                                                            <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                                                                {test.completedAt ? new Date(test.completedAt).toLocaleString() : '—'}
                                                                {test.User_LabTest_performedByIdToUser?.fullName && ` · Result by ${test.User_LabTest_performedByIdToUser.fullName}`}
                                                                {test.User_LabTest_createdByIdToUser?.fullName && ` · Requested by ${test.User_LabTest_createdByIdToUser.fullName}`}
                                                            </p>
                                                        </td>
                                                    </tr>
                                                    {rows.map((param: any, idx: number) => (
                                                        <tr key={`${test.id}-${idx}`} className="hover:bg-[var(--bg-main)] transition-colors align-top">
                                                            <Td className="text-[var(--text-primary)]">{param.name || '—'}</Td>
                                                            <Td className="font-mono font-semibold text-[var(--text-primary)]">
                                                                {param.value === '' || param.value === null || param.value === undefined ? '—' : String(param.value)}
                                                            </Td>
                                                            <Td>{param.unit || test.units || '—'}</Td>
                                                            <Td>{param.normalRange || test.normalRange || '—'}</Td>
                                                            <Td><FlagPill flag={param.flag || labFlag(param.value, param.normalRange || test.normalRange)} /></Td>
                                                        </tr>
                                                    ))}
                                                </React.Fragment>
                                            );
                                        })}
                                    </Table>
                                )}
                        </SectionCard>
                    </div>

                    {/* ── SCANS: the request beside the radiology report ───── */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <SectionCard
                            icon={<Scan className="w-4 h-4 text-[var(--icon-purple-text)]" />}
                            title="Scans Requested"
                            count={scansList.length}
                            countColor="bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]"
                            action={canAddEntries && <AddBtn onClick={() => setModalType('scan')} label="Request" />}
                        >
                            {scansList.length === 0
                                ? <EmptyState icon={<Scan className="w-9 h-9" />} label="No scans requested" />
                                : (
                                    <Table heads={['Study', 'Body Part', 'Priority', 'Status', 'Requested', 'Requested by', '']}>
                                        {scansList.map((scan: any) => (
                                            <tr key={scan.id} className="hover:bg-[var(--bg-main)] transition-colors align-top">
                                                <TdPrimary>
                                                    {getScanDisplayName(scan)}
                                                    <p className="text-[10px] font-normal text-[var(--text-tertiary)] mt-0.5">
                                                        {humanScanModality(scan)}
                                                    </p>

                                                </TdPrimary>
                                                <Td>{scan.bodyPart || '—'}</Td>
                                                <Td>
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${scan.priority === 'stat' ? 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]' :
                                                        scan.priority === 'urgent' ? 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]' :
                                                            'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
                                                        }`}>{scan.priority || 'routine'}</span>
                                                </Td>
                                                <Td><StatusBadge status={scan.status} /></Td>
                                                <Td>{scan.requestedAt ? new Date(scan.requestedAt).toLocaleString() : scan.createdAt ? new Date(scan.createdAt).toLocaleString() : '—'}</Td>
                                                <Td>{scan.User_Scan_createdByIdToUser?.fullName || scan.createdBy?.fullName || 'Unknown user'}</Td>
                                                <Td>{canAddEntries && (scan.status === 'requested' || scan.status === 'in_progress') && <><EditBtn onClick={() => setEditingEntry({ type: 'scan', entry: scan })} /><DelBtn onClick={() => handleDeleteItem('scan', scan.id)} /></>}</Td>
                                            </tr>
                                        ))}
                                    </Table>
                                )}
                        </SectionCard>
                        <SectionCard
                            icon={<CheckCircle className="w-4 h-4 text-[var(--icon-green-text)]" />}
                            title="Scan Results"
                            count={completedScans.length}
                            countColor="bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]"
                            maxH="max-h-80"
                        >
                            {completedScans.length === 0
                                ? <EmptyState icon={<Microscope className="w-9 h-9" />} label="No scan results yet" />
                                : (
                                    <Table heads={['Study', 'Findings', 'Impression', '']}
                                        colWidths={['24%', '40%', '32%', '4%']}>
                                        {completedScans.map((scan: any) => (
                                            <tr key={scan.id} className="hover:bg-[var(--bg-main)] transition-colors align-top">
                                                <TdPrimary>
                                                    {getScanDisplayName(scan)}
                                                    <p className="text-[10px] font-normal text-[var(--text-tertiary)] mt-0.5">
                                                        {humanScanModality(scan)}
                                                    </p>
                                                    {scan.bodyPart && <p className="text-[10px] font-normal text-[var(--text-tertiary)] mt-0.5">{scan.bodyPart}</p>}
                                                    {scan.description && <p className="text-[10px] font-normal text-[var(--text-tertiary)] mt-0.5 whitespace-pre-wrap">{scan.description}</p>}
                                                    <p className="text-[10px] font-normal text-[var(--text-tertiary)] mt-1">
                                                        {scan.completedAt ? new Date(scan.completedAt).toLocaleString() : '—'}
                                                        {scan.User_Scan_performedByIdToUser?.fullName && ` · Reported by ${scan.User_Scan_performedByIdToUser.fullName}`}
                                                        {scan.User_Scan_createdByIdToUser?.fullName && ` · Requested by ${scan.User_Scan_createdByIdToUser.fullName}`}
                                                    </p>
                                                </TdPrimary>
                                                <Td className="whitespace-pre-wrap">{scan.findings || scan.result || '—'}</Td>
                                                <Td className="whitespace-pre-wrap">{scan.impression || '—'}</Td>
                                                <Td className="px-1">
                                                    {canAddEntries && <span className="text-[10px] text-[var(--text-tertiary)]" title="Completed reports are locked. Use the documented clinical correction workflow.">Locked</span>}
                                                </Td>
                                            </tr>
                                        ))}
                                    </Table>
                                )}
                        </SectionCard>
                    </div>

                    {/* ── PROCEDURES ────────────────────────────────────────── */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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
                                    <Table heads={['Procedure', '', 'Entered date', 'Status', '', 'Entered by USER', '']}>
                                        {proceduresList.map((proc: any) => (
                                            <tr key={proc.id} className="hover:bg-[var(--bg-main)] transition-colors align-top">
                                                <TdPrimary>
                                                    {proc.ServiceCatalog?.name || proc.ProcedureTemplate?.name || proc.name}
                                                </TdPrimary>
                                                <Td />
                                                <Td>{proc.createdAt ? new Date(proc.createdAt).toLocaleDateString() : '—'}</Td>
                                                <Td><StatusBadge status={proc.status} /></Td>
                                                <Td />
                                                <Td>{proc.User_Procedure_createdByIdToUser?.fullName || proc.createdBy?.fullName || 'Unknown user'}</Td>
                                                <Td>{canAddEntries && (proc.status === 'scheduled' || proc.status === 'in_progress') && <><EditBtn onClick={() => setEditingEntry({ type: 'procedure', entry: proc })} /><DelBtn onClick={() => handleDeleteItem('procedure', proc.id)} /></>}</Td>
                                            </tr>
                                        ))}
                                    </Table>
                                )}
                        </SectionCard>
                        <SectionCard
                            icon={<CheckCircle className="w-4 h-4 text-[var(--icon-green-text)]" />}
                            title="Procedure Results"
                            count={proceduresList.filter((p: any) => p.status === 'completed').length}
                            countColor="bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]"
                            maxH="max-h-80"
                        >
                            {proceduresList.filter((p: any) => p.status === 'completed').length === 0
                                ? <EmptyState icon={<Scissors className="w-9 h-9" />} label="No completed procedures yet" />
                                : (
                                    <Table heads={['Procedure', 'Outcome & Complications', 'Notes']}
                                        colWidths={['26%', '34%', '40%']}>
                                        {proceduresList.filter((p: any) => p.status === 'completed').map((proc: any) => (
                                            <tr key={proc.id} className="hover:bg-[var(--bg-main)] transition-colors align-top">
                                                <TdPrimary>
                                                    {proc.ServiceCatalog?.name || proc.ProcedureTemplate?.name || proc.name}
                                                    <p className="text-[10px] font-normal text-[var(--text-tertiary)] mt-1">
                                                        {proc.performedAt ? new Date(proc.performedAt).toLocaleString() : proc.scheduledDate ? new Date(proc.scheduledDate).toLocaleString() : '—'}
                                                        {proc.User_Procedure_performedByIdToUser?.fullName && ` · ${proc.User_Procedure_performedByIdToUser.fullName}`}
                                                    </p>
                                                </TdPrimary>
                                                <Td className="whitespace-pre-wrap">
                                                    <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">Outcome</span>
                                                    <p>{proc.outcome || '—'}</p>
                                                    <span className="text-[10px] font-semibold text-[var(--text-tertiary)] mt-1 block">Complications</span>
                                                    <p>{proc.complications || 'None recorded'}</p>
                                                </Td>
                                                <Td className="whitespace-pre-wrap">
                                                    {proc.postOperativeNotes || proc.notes || '—'}
                                                    {proc.intraOperativeNotes && (
                                                        <p className="text-[10px] text-[var(--text-tertiary)] mt-1 whitespace-pre-wrap">{proc.intraOperativeNotes}</p>
                                                    )}
                                                </Td>
                                            </tr>
                                        ))}
                                    </Table>
                                )}
                        </SectionCard>
                    </div>
                </div>
            )}

            {/* ── CONFIDENTIAL HIV COUNSELLING / HTS TAB ── */}
            {activeTab === 'hiv-testing' && hasRole(['admin', 'doctor', 'nurse', 'midwife']) && selectedPatientId && (
                <HIVTestingPanel patientId={selectedPatientId} attendanceId={selectedAttendanceId || undefined} />
            )}

            {/* ── VITALS TAB ── */}
            {activeTab === 'vitals' && (
                <div className="p-4">
                    <SectionCard icon={<Activity className="w-4 h-4 text-[var(--icon-purple-text)]" />} title="Vitals History" count={allVitals.length} maxH="max-h-[600px]">
                        {allVitals.length === 0
                            ? <EmptyState icon={<Activity className="w-8 h-8" />} label="No vitals recorded for this visit" />
                            : (
                                <Table heads={['Date / Time', 'BP', 'Temp', 'Pulse', 'Resp', 'SpO₂', 'Weight', 'Height', 'BMI', 'MUAC', 'Recorded by']}>
                                    {[...allVitals].reverse().map((v: any) => (
                                        <tr key={v.id || v.recordedAt} className="hover:bg-[var(--bg-main)] transition-colors">
                                            <Td>{new Date(v.recordedAt || v.createdAt).toLocaleString()}</Td>
                                            <Td className="font-semibold">{v.bloodPressure || '—'}</Td>
                                            <Td>{v.temperature ? `${v.temperature}°C` : '—'}</Td>
                                            <Td>{v.pulse || '—'}</Td>
                                            <Td>{v.respiration || '—'}</Td>
                                            <Td>{v.spo2 ? `${v.spo2}%` : '—'}</Td>
                                            <Td>{v.weight ? `${v.weight}kg` : '—'}</Td>
                                            <Td>{v.height ? `${v.height}cm` : '—'}</Td>
                                            <Td>{v.bmi || '—'}</Td>
                                            <Td>{v.muac || '—'}</Td>
                                            <Td>{v.User?.fullName || v.user?.fullName || 'Unknown user'}</Td>
                                        </tr>
                                    ))}
                                </Table>
                            )}
                    </SectionCard>
                </div>
            )}
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="w-72 xl:w-80 flex-shrink-0 sticky top-20">
            <div
                className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden flex flex-col"
                style={{
                    height: 'calc(100vh - 100px)',
                    boxShadow: 'var(--shadow-sm)',
                }}
            >
                {/* Clinical notes are the chronological, author-attributed visit log. */}
                <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex-shrink-0">
                    <span className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                        <ClipboardList className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                        Clinical Notes
                        {treatmentNotes.length > 0 && <span className="rounded-full bg-[var(--icon-cyan-bg)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--icon-cyan-text)]">{treatmentNotes.length}</span>}
                    </span>
                    {canAddEntries && !isClinicalFinalized && (
                        <button type="button" onClick={() => { setTreatmentEntryMode('progress'); setTreatmentNoteDraft(''); setIsEditingTreatmentPlan(true); }}
                            className="inline-flex items-center gap-1 rounded-lg bg-[var(--icon-cyan-text)] px-3 py-2 text-[11px] font-semibold text-white hover:opacity-90">
                            <Plus className="h-3.5 w-3.5" /> Add note
                        </button>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[var(--bg-card)]" style={{ minHeight: 0, scrollbarWidth: 'thin' }}>
                    {treatmentNotes.length > 0 ? [...treatmentNotes].map((note, i) => (
                        <NoteCard key={`${note.date}-${i}`} author={note.author} date={note.date} text={note.text}
                            editedBy={(note as any).editedBy} editedAt={(note as any).editedAt}
                            onEdit={canAddEntries && !isClinicalFinalized ? () => handleEditNote('treatment', i) : undefined}
                        />
                    )) : (
                        <div className="py-6 text-center text-[11px] text-[var(--text-tertiary)]">No clinical notes recorded for this visit.</div>
                    )}
                </div>
                {/* Treatment Plan has its own author-attributed entry timeline. */}
                <div className="border-t border-[var(--border-color)] bg-[var(--bg-main)] px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]"><FileText className="h-3 w-3" /> Treatment Plan {treatmentPlanEntries.length > 0 && <span className="rounded-full bg-[var(--icon-cyan-bg)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--icon-cyan-text)]">{treatmentPlanEntries.length}</span>}</span>
                        {canAddEntries && !isClinicalFinalized && <button type="button" onClick={() => { setTreatmentEntryMode('plan'); setTreatmentNoteDraft(''); setIsEditingTreatmentPlan(true); }} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-3 py-2 text-[11px] font-semibold text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)]"><Plus className="h-3.5 w-3.5" /> Add plan</button>}
                    </div>
                    <div className="mt-2 space-y-2">{treatmentPlanEntries.length ? treatmentPlanEntries.map((entry, i) => <NoteCard key={`${entry.date}-${i}`} author={entry.author || 'Unknown user'} date={entry.date} text={entry.text} editedBy={entry.editedBy} editedAt={entry.editedAt} onEdit={canAddEntries && !isClinicalFinalized ? () => handleEditNote('plan', i) : undefined} />) : <div className="py-4 text-center text-[11px] text-[var(--text-tertiary)]">No treatment plan entries recorded for this visit.</div>}</div>
                </div>
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
    {isEditingTreatmentPlan && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onMouseDown={e => { if (e.target === e.currentTarget && !savingTreatmentPlan) { setTreatmentNoteDraft(''); setIsEditingTreatmentPlan(false); } }}>
            <div role="dialog" aria-modal="true" aria-labelledby="treatment-note-modal-title"
                className="w-full max-w-2xl overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl">
                <div className="flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-main)] px-5 py-4">
                    <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[var(--icon-cyan-text)]" />
                        <div>
                            <h3 id="treatment-note-modal-title" className="text-sm font-bold text-[var(--text-primary)]">{treatmentEntryMode === 'plan' ? 'Add Treatment Plan Entry' : 'Add Clinical Note'}</h3>
                            <p className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">This entry will be saved with the staff user and date/time.</p>
                        </div>
                    </div>
                    <button type="button" aria-label="Close add note" disabled={savingTreatmentPlan}
                        onClick={() => { setTreatmentNoteDraft(''); setIsEditingTreatmentPlan(false); }}
                        className="rounded-md p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--border-color)] disabled:opacity-50">
                        <XCircle className="h-4 w-4" />
                    </button>
                </div>
                <div className="max-h-[70vh] space-y-2 overflow-y-auto p-5">
                    <label htmlFor="treatment-note-draft" className="block text-xs font-semibold text-[var(--text-secondary)]">{treatmentEntryMode === 'plan' ? 'Planned management and instructions' : 'Clinical note'}</label>
                    <textarea id="treatment-note-draft" value={treatmentNoteDraft} onChange={e => setTreatmentNoteDraft(e.target.value)}
                        rows={8} autoFocus
                        placeholder={treatmentEntryMode === 'plan' ? 'Enter the planned management and patient instructions…' : 'Enter the clinical note for this visit…'}
                        className="w-full resize-y rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-3 text-sm leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)]" />
                </div>
                <div className="flex flex-col-reverse gap-2 border-t border-[var(--border-color)] p-4 sm:flex-row sm:justify-end">
                    <button type="button" onClick={() => { setTreatmentNoteDraft(''); setIsEditingTreatmentPlan(false); }}
                        disabled={savingTreatmentPlan}
                        className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] disabled:opacity-50">Cancel</button>
                    <button type="button" onClick={handleSaveTreatmentNote} disabled={savingTreatmentPlan || !treatmentNoteDraft.trim()}
                        className="rounded-lg bg-[var(--icon-cyan-text)] px-5 py-2 text-xs font-semibold text-white disabled:opacity-50">
                        {savingTreatmentPlan ? 'Saving…' : treatmentEntryMode === 'plan' ? 'Save Treatment Plan' : 'Save Clinical Note'}
                    </button>
                </div>
            </div>
        </div>
    )}
    <ClinicalAssessmentModal
        isOpen={assessmentOpen}
        onClose={() => setAssessmentOpen(false)}
        value={assessmentValue}
        readOnly={!canAddEntries || isClinicalFinalized}
        onSave={saveAssessment}
    />
    {/* ── MODALS ─────────────────────────────────────────────────────────── */}
    {editingNote && <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/50" onClick={() => !savingNote && setEditingNote(null)} /><div className="relative w-full max-w-lg rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl"><div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]"><h3 className="text-sm font-bold text-[var(--text-primary)]">{editingNote?.type === 'plan' ? 'Edit Treatment Plan Entry' : 'Edit Clinical Note'}</h3><button disabled={savingNote} onClick={() => setEditingNote(null)} className="text-[var(--text-tertiary)]"><XCircle className="w-4 h-4" /></button></div><div className="p-4"><textarea value={editingNoteText} onChange={e => setEditingNoteText(e.target.value)} rows={6} className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] p-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)]" /></div><div className="flex gap-2 p-4 border-t border-[var(--border-color)]"><button disabled={savingNote || !editingNoteText.trim()} onClick={handleSaveNoteEdit} className="flex-1 rounded-lg bg-[var(--icon-cyan-text)] text-[var(--icon-cyan-on-text)] py-2 text-sm font-semibold disabled:opacity-50">{savingNote ? 'Saving…' : editingNote?.type === 'plan' ? 'Save plan entry' : 'Save note'}</button><button disabled={savingNote} onClick={() => setEditingNote(null)} className="px-4 rounded-lg border border-[var(--border-color)] text-sm">Cancel</button></div></div></div>}
    {editingEntry && <MedicalEntryEditModal type={editingEntry.type} entry={editingEntry.entry} saving={savingEntry} onClose={() => setEditingEntry(null)} onSave={handleSaveEntryEdit} />}
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
        allergies={recordedAllergies}
        onSwitchToConsumable={() => { setEditingConsumable(null); setModalType('consumable'); }}
        userId={user?.id} userName={user?.fullName} />
    <ConsumableModal isOpen={modalType === 'consumable'} onClose={() => { setModalType(null); setEditingConsumable(null); }} onSuccess={afterConsumableUse}
        encounterId={selectedAttendanceId} stockItems={stockItems} canAdd={canAddEntries} existingUse={editingConsumable}
        onSwitchToPrescription={() => { setEditingConsumable(null); setModalType('medication'); }} />
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
                if (treatmentNoteDraft.trim() && !(await confirmDialog({ title: 'Discard unsaved entry?', message: 'The entry you are typing has not been saved. Open another patient and discard it?', confirmText: 'Discard', type: 'warning' }))) return;
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
const NoteCard: React.FC<{ author: string; date?: string; text?: string; editedBy?: string; editedAt?: string; children?: React.ReactNode; onEdit?: () => void; onDelete?: () => void }> = ({ author, date, text, editedBy, editedAt, children, onEdit, onDelete }) => (
<div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)]">
<div className="flex items-center justify-between mb-1.5">
<span className="text-[10px] font-bold text-[var(--icon-cyan-text)]">{author}</span>
{date && <span className="text-[9px] text-[var(--text-tertiary)]">{new Date(date).toLocaleString()}</span>}
{(onEdit || onDelete) && <span className="flex items-center gap-1">{onEdit && <button onClick={onEdit} title="Edit note" className="p-1 rounded hover:bg-[var(--icon-cyan-bg)] hover:text-[var(--icon-cyan-text)]"><Edit className="w-3 h-3" /></button>}{onDelete && <button onClick={onDelete} title="Delete note" className="p-1 rounded hover:bg-[var(--icon-red-bg)] hover:text-[var(--icon-red-text)]"><Trash2 className="w-3 h-3" /></button>}</span>}
</div>
{text && <p className="text-[11px] text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{text}</p>}
{editedBy && <p className="mt-1 text-[9px] text-[var(--text-tertiary)]">Edited by {editedBy}{editedAt ? ` · ${new Date(editedAt).toLocaleString()}` : ''}</p>}
{children}
</div>
);
const NoteField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
<p className="text-[11px] text-[var(--text-primary)] leading-relaxed mb-1">
<span className="font-bold text-[var(--text-secondary)]">{label} — </span>{value}
</p>
);