// src/pages/EditInsuranceClaim.tsx - COMPLETE REDESIGNED VERSION

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInsuranceStore } from '../store/insuranceStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { useStockStore } from '../store/stockStore';
import { usePatientStore } from '../store/patientStore';
import api from '../api/api';
import { useToast } from '../store/toastStore';
import {
  ArrowLeft,
  Save,
  Lock,
  Download,
  Printer,
  FileText,
  User,
  Calendar,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Plus,
  Search,
  Trash2,
  Edit,
  Stethoscope,
  FlaskConical,
  Pill,
  Scissors,
  Scan,
  Hospital,
  ClipboardList,
  Building,
  Hash,
  Calendar as CalendarIcon,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

// ==========================================
// TYPES
// ==========================================

interface DiagnosisItem {
  id?: string;
  gdrgCode: string;
  description: string;
  diagnosis: string;
  icd10: string;
  diagnosisId?: string;
  diagnosisType?: string;
}

interface InvestigationItem {
  id?: string;
  gdrgCode: string;
  description: string;
  date: string;
  serviceCatalogId?: string;
}

interface MedicineItem {
  id?: string;
  code: string;
  description: string;
  quantity: number;
  date: string;
  prescription: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  stockItemId?: string;
  serviceCatalogId?: string;
}

// ==========================================
// ADD DIAGNOSIS MODAL
// ==========================================

interface AddDiagnosisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (diagnosis: DiagnosisItem) => void;
  existingDiagnoses: DiagnosisItem[];
}

function AddDiagnosisModal({ isOpen, onClose, onAdd, existingDiagnoses }: AddDiagnosisModalProps) {
  const { diagnoses, getDiagnoses } = useMedicalServicesStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<any>(null);
  const [gdrgCode, setGdrgCode] = useState('');

  useEffect(() => {
    if (isOpen) getDiagnoses();
  }, [isOpen, getDiagnoses]);

  const filteredDiagnoses = diagnoses.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.icdCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    if (selectedDiagnosis) {
      onAdd({
        gdrgCode: gdrgCode || 'OPDC06A',
        description: selectedDiagnosis.name,
        diagnosis: selectedDiagnosis.name,
        icd10: selectedDiagnosis.icdCode,
        diagnosisId: selectedDiagnosis.id
      });
      setSelectedDiagnosis(null);
      setSearchTerm('');
      setGdrgCode('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl max-w-md w-full border border-[var(--border-color)]">
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Add Diagnosis</h3>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-main)] rounded-lg">
            <XCircle className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search by diagnosis name or ICD-10 code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)]">G-DRG Code</label>
            <input
              type="text"
              value={gdrgCode}
              onChange={(e) => setGdrgCode(e.target.value.toUpperCase())}
              placeholder="e.g., OPDC06A"
              className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredDiagnoses.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDiagnosis(d)}
                className={`w-full text-left p-2 rounded-lg transition-colors ${
                  selectedDiagnosis?.id === d.id
                    ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
                    : 'hover:bg-[var(--bg-main)] text-[var(--text-primary)]'
                }`}
              >
                <div className="font-medium text-sm">{d.name}</div>
                <div className="text-xs text-[var(--text-secondary)]">ICD-10: {d.icdCode}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-[var(--border-color)] flex gap-2">
          <button
            onClick={handleAdd}
            disabled={!selectedDiagnosis}
            className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white disabled:opacity-50 text-sm font-medium"
          >
            Add Diagnosis
          </button>
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// ADD INVESTIGATION MODAL
// ==========================================

interface AddInvestigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (investigation: InvestigationItem) => void;
  type: 'lab' | 'scan';
}

function AddInvestigationModal({ isOpen, onClose, onAdd, type }: AddInvestigationModalProps) {
  const { labTestTemplates, scanTemplates, getLabTestTemplates, getScanTemplates } = useMedicalServicesStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (isOpen) {
      if (type === 'lab') getLabTestTemplates();
      else getScanTemplates();
    }
  }, [isOpen, type, getLabTestTemplates, getScanTemplates]);

  const items = type === 'lab' ? labTestTemplates : scanTemplates;
  const codeField = type === 'lab' ? 'investigationCode' : 'investigationCode';

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item[codeField] || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    if (selectedItem) {
      onAdd({
        gdrgCode: selectedItem[codeField] || selectedItem.code || 'INVE000',
        description: selectedItem.name,
        date: serviceDate,
        serviceCatalogId: selectedItem.id
      });
      setSelectedItem(null);
      setSearchTerm('');
      setServiceDate(new Date().toISOString().split('T')[0]);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl max-w-md w-full border border-[var(--border-color)]">
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Add {type === 'lab' ? 'Lab Test' : 'Scan'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-main)] rounded-lg">
            <XCircle className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder={`Search ${type === 'lab' ? 'lab test' : 'scan'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)]">Service Date</label>
            <input
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`w-full text-left p-2 rounded-lg transition-colors ${
                  selectedItem?.id === item.id
                    ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
                    : 'hover:bg-[var(--bg-main)] text-[var(--text-primary)]'
                }`}
              >
                <div className="font-medium text-sm">{item.name}</div>
                <div className="text-xs text-[var(--text-secondary)]">Code: {item[codeField] || item.code}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-[var(--border-color)] flex gap-2">
          <button
            onClick={handleAdd}
            disabled={!selectedItem}
            className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white disabled:opacity-50 text-sm font-medium"
          >
            Add Investigation
          </button>
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// ADD MEDICINE MODAL
// ==========================================

interface AddMedicineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (medicine: MedicineItem) => void;
}

function AddMedicineModal({ isOpen, onClose, onAdd }: AddMedicineModalProps) {
  const { stockItems, getStockItems } = useStockStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [duration, setDuration] = useState('');

  useEffect(() => {
    if (isOpen) getStockItems();
  }, [isOpen, getStockItems]);

  const filteredItems = stockItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.drugCode || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    if (selectedItem) {
      const prescription = `${dosage} ${frequency} x ${duration}`.trim();
      onAdd({
        code: selectedItem.drugCode,
        description: selectedItem.name,
        quantity,
        date: serviceDate,
        prescription: prescription || 'As prescribed',
        dosage,
        frequency,
        duration,
        stockItemId: selectedItem.id
      });
      setSelectedItem(null);
      setSearchTerm('');
      setQuantity(1);
      setDosage('');
      setFrequency('');
      setDuration('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl max-w-md w-full border border-[var(--border-color)]">
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Add Medicine</h3>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-main)] rounded-lg">
            <XCircle className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search medicine by name or drug code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Quantity</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Service Date</label>
              <input
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Dosage</label>
              <input
                type="text"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="e.g., 500mg"
                className="w-full px-2 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Frequency</label>
              <input
                type="text"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                placeholder="e.g., BD"
                className="w-full px-2 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Duration</label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g., 7 days"
                className="w-full px-2 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-xs"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`w-full text-left p-2 rounded-lg transition-colors ${
                  selectedItem?.id === item.id
                    ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
                    : 'hover:bg-[var(--bg-main)] text-[var(--text-primary)]'
                }`}
              >
                <div className="font-medium text-sm">{item.name}</div>
                <div className="text-xs text-[var(--text-secondary)]">Code: {item.drugCode}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-[var(--border-color)] flex gap-2">
          <button
            onClick={handleAdd}
            disabled={!selectedItem}
            className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white disabled:opacity-50 text-sm font-medium"
          >
            Add Medicine
          </button>
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// EDIT MEDICINE MODAL
// ==========================================

interface EditMedicineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (medicine: MedicineItem) => void;
  medicine: MedicineItem | null;
}

function EditMedicineModal({ isOpen, onClose, onSave, medicine }: EditMedicineModalProps) {
  const [formData, setFormData] = useState<MedicineItem | null>(null);

  useEffect(() => {
    if (medicine) {
      setFormData({ ...medicine });
    }
  }, [medicine]);

  const handleSave = () => {
    if (formData) {
      onSave(formData);
      onClose();
    }
  };

  if (!isOpen || !formData) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl max-w-md w-full border border-[var(--border-color)]">
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Edit Medicine</h3>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-main)] rounded-lg">
            <XCircle className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="bg-[var(--bg-main)] p-2 rounded-lg">
            <p className="text-sm font-medium text-[var(--text-primary)]">{formData.description}</p>
            <p className="text-xs text-[var(--text-secondary)]">Code: {formData.code}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Quantity</label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Service Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Dosage</label>
              <input
                type="text"
                value={formData.dosage || ''}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                className="w-full px-2 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Frequency</label>
              <input
                type="text"
                value={formData.frequency || ''}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className="w-full px-2 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Duration</label>
              <input
                type="text"
                value={formData.duration || ''}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full px-2 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-xs"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)]">Prescription</label>
            <textarea
              value={formData.prescription}
              onChange={(e) => setFormData({ ...formData, prescription: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
            />
          </div>
        </div>
        <div className="p-4 border-t border-[var(--border-color)] flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded-lg hover:bg-[var(--icon-blue-text)] hover:text-white text-sm font-medium"
          >
            Save Changes
          </button>
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function EditInsuranceClaim() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError, warning } = useToast();
  const isInitialized = useRef(false);

  const {
    currentClaim,
    getInsuranceClaim,
    updateInsuranceClaim,
    finalizeClaim,
    generateClaimXML,
    generateClaimPrint,
    isLoading
  } = useInsuranceStore();

  const { patients, getPatient } = usePatientStore();
  const { getDiagnoses } = useMedicalServicesStore();

  // State
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingMedicine, setEditingMedicine] = useState<MedicineItem | null>(null);
  
  // Form state
  const [memberNoLabel, setMemberNoLabel] = useState('');
  const [memberNo, setMemberNo] = useState('');
  const [surname, setSurname] = useState('');
  const [otherNames, setOtherNames] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [age, setAge] = useState('');

  const [patientNhisNumber, setPatientNhisNumber] = useState('');
  const [cccCode, setCccCode] = useState('');
  const [folderNumber, setFolderNumber] = useState('');
  
  const [typeOfService, setTypeOfService] = useState<string[]>([]);
  const [serviceOutcome, setServiceOutcome] = useState('');
  const [datesOfService, setDatesOfService] = useState<string[]>(['', '', '', '']);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  
  const [diagnoses, setDiagnoses] = useState<DiagnosisItem[]>([]);
  const [investigations, setInvestigations] = useState<InvestigationItem[]>([]);
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  
  const [principalGDRG, setPrincipalGDRG] = useState('');
  const [principalGDRGDescription, setPrincipalGDRGDescription] = useState('');
  const [physicianId, setPhysicianId] = useState('');
  const [preAuthCodes, setPreAuthCodes] = useState('');
  const [typeOfAttendance, setTypeOfAttendance] = useState('GEN');
  // Add these state variables with the others
  const [serviceTypeCategory, setServiceTypeCategory] = useState<'OPD' | 'IPD'>('OPD');
  const [primaryServiceType, setPrimaryServiceType] = useState<'Outpatient' | 'Inpatient' | 'Diagnostic'>('Outpatient');
  const [visitDates, setVisitDates] = useState<string[]>(['', '', '', '']);
  const [admissionDate, setAdmissionDate] = useState('');
  const [dischargeDate, setDischargeDate] = useState('');
  const [lengthOfStay, setLengthOfStay] = useState(0);

  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableGDRGs, setAvailableGDRGs] = useState<any[]>([]);

  // Specialty options (MDC codes)
  const specialties = [
    { code: 'ASUR', name: 'Adult Surgery' },
    { code: 'DENT', name: 'Dental and Maxillofacial Surgery' },
    { code: 'ENTH', name: 'Ear, Nose and Throat Surgery' },
    { code: 'MEDI', name: 'Medicine' },
    { code: 'OBGY', name: 'Obstetrics and Gynaecology' },
    { code: 'OPDC', name: 'OPD Consultation' },
    { code: 'OPHT', name: 'Ophthalmology' },
    { code: 'ORTH', name: 'Orthopaedics' },
    { code: 'PAED', name: 'Paediatrics' },
    { code: 'PSUR', name: 'Paediatric Surgery' },
    { code: 'RSUR', name: 'Reconstructive Surgery' }
  ];

// Add this after the state declarations (~line 350)
const validateNHISClaim = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check if NHIS claim needs validation
  if (currentClaim?.InsuranceProvider?.type !== 'nhis') {
    return { isValid: true, errors: [] };
  }
  
  // 1. NHIS CCC number required
  if (!cccCode && !patientNhisNumber) {
    errors.push('NHIS CCC number is required for NHIS claims');
  }
  
  // 2. At least one diagnosis required
  if (diagnoses.length === 0) {
    errors.push('At least one primary diagnosis is required');
  }
  
  // 3. Primary diagnosis required
  const hasPrimaryDiagnosis = diagnoses.some(d => d.diagnosisType === 'primary');
  if (diagnoses.length > 0 && !hasPrimaryDiagnosis) {
    errors.push('A primary diagnosis must be selected (mark one diagnosis as primary)');
  }
  
  // 4. Principal GDRG required (unless auto-detect is enabled)
  if (!principalGDRG) {
    errors.push('Principal GDRG is required - either select manually or enable auto-detect');
  }
  
  // 5. Date of service required
  if (primaryServiceType === 'Outpatient') {
    const hasVisitDate = visitDates.some(d => d);
    if (!hasVisitDate) {
      errors.push('At least one visit date is required');
    }
  } else if (primaryServiceType === 'Inpatient') {
    if (!admissionDate) {
      errors.push('Admission date is required');
    }
    if (!dischargeDate) {
      errors.push('Discharge date is required');
    }
  } else if (primaryServiceType === 'Diagnostic') {
    if (!visitDates[0]) {
      errors.push('Service date is required');
    }
  }
  
  // 6. Service outcome required
  if (!serviceOutcome) {
    errors.push('Service outcome is required');
  }
  
  // 7. Type of attendance required (if NHIS)
  if (!typeOfAttendance) {
    errors.push('Type of attendance is required for NHIS claims');
  }
  
  return { isValid: errors.length === 0, errors };
};

  // Load claim data
  useEffect(() => {
    if (id) {
      loadClaim();
      getDiagnoses();
      loadGDRGTariffs();
    }
  }, [id]);

  const loadClaim = async () => {
    try {
      await getInsuranceClaim(id!);
    } catch (error: any) {
      toastError('Load Failed', 'Could not load claim data');
      navigate('/dashboard/insurance-claims');
    }
  };

  
  // Populate form when currentClaim loads
  useEffect(() => {
    // Skip if already initialized or no currentClaim
    if (!currentClaim || isInitialized.current) return;
    
    // Mark as initialized
    isInitialized.current = true;
  
    const patient = currentClaim.Patient;
    const attendance = currentClaim.Attendance;
  
    // MEMBER DETAILS
    const permanentNhisNumber = patient?.nhisNumber;
    const cccCodeValue = attendance?.nhisCCC;
    const folderNumberValue = patient?.folderNumber;
  
    if (permanentNhisNumber) {
      setPatientNhisNumber(permanentNhisNumber);
    } else if (cccCodeValue) {
      setCccCode(cccCodeValue);
    }
    
    if (folderNumberValue) setFolderNumber(folderNumberValue);
    
    setSurname(patient?.surname || '');
    setOtherNames(patient?.otherNames || '');
    setGender(patient?.gender || '');
    setDateOfBirth(patient?.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : '');
    
    if (patient?.dateOfBirth) {
      const birthDate = new Date(patient.dateOfBirth);
      const today = new Date();
      let ageYears = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        ageYears--;
      }
      setAge(`${ageYears} yrs`);
    }
  
    // SERVICE INFORMATION
    const serviceType = currentClaim.typeOfService === 'IPD' ? ['Inpatient'] : 
                        currentClaim.typeOfService === 'OPD' ? ['Outpatient'] : 
                        attendance?.Admission ? ['Inpatient'] : ['Outpatient'];
    setTypeOfService(serviceType);
    
    const outcome = currentClaim.serviceOutcome === 'DISC' ? 'Discharged' :
                    currentClaim.serviceOutcome === 'CONT' ? 'CONT' :
                    attendance?.status === 'completed' ? 'Discharged' : 'CONT';
    setServiceOutcome(outcome);
    
    if (currentClaim.datesOfService?.length) {
      const dates = [...datesOfService];
      currentClaim.datesOfService.forEach((date: string, i: number) => {
        if (i < 4) dates[i] = date;
      });
      setDatesOfService(dates);
    } else if (attendance?.dateTime) {
      setDatesOfService([attendance.dateTime.split('T')[0], '', '', '']);
    }
  
    // SPECIALTIES
    const mdcFromGdrg = currentClaim.principalGDRG?.slice(0, 4) || 
                        currentClaim.mdcCode || 
                        'OPDC';
    setSelectedSpecialties([mdcFromGdrg]);
  
    // DIAGNOSES
    const attendanceDiagnoses = attendance?.AttendanceDiagnosis || [];
    const mappedDiagnoses: DiagnosisItem[] = attendanceDiagnoses.map((d: any, idx: number) => ({
      tempId: idx,
      gdrgCode: currentClaim.principalGDRG || 'OPDC06A',
      description: d.Diagnosis?.name || '',
      diagnosis: d.Diagnosis?.name || '',
      icd10: d.Diagnosis?.icdCode || '',
      diagnosisId: d.diagnosisId,
      diagnosisType: d.diagnosisType
    }));
    setDiagnoses(mappedDiagnoses);
  
    // INVESTIGATIONS
    const labTests = (attendance?.LabTest || []).map((l: any) => ({
      tempId: l.id,
      gdrgCode: l.ServiceCatalog?.investigationCode || l.ServiceCatalog?.nhisServiceCode || '',
      description: l.ServiceCatalog?.name || l.name || '',
      date: l.requestedAt ? new Date(l.requestedAt).toISOString().split('T')[0] : 
             l.createdAt ? new Date(l.createdAt).toISOString().split('T')[0] : '',
      serviceCatalogId: l.serviceCatalogId,
      type: 'lab'
    }));
    
    const scans = (attendance?.Scan || []).map((s: any) => ({
      tempId: s.id,
      gdrgCode: s.ServiceCatalog?.investigationCode || s.ServiceCatalog?.nhisServiceCode || '',
      description: s.ServiceCatalog?.name || s.name || '',
      date: s.requestedAt ? new Date(s.requestedAt).toISOString().split('T')[0] : 
             s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : '',
      serviceCatalogId: s.serviceCatalogId,
      type: 'scan'
    }));
    
    setInvestigations([...labTests, ...scans]);
  
    // MEDICINES
    const medications = (attendance?.Medication || []).map((m: any) => ({
      tempId: m.id,
      code: m.StockItem?.drugCode || m.ServiceCatalog?.code || '',
      description: m.name,
      quantity: m.quantity || 1,
      date: m.dispensedAt ? new Date(m.dispensedAt).toISOString().split('T')[0] : 
             m.prescribedAt ? new Date(m.prescribedAt).toISOString().split('T')[0] : '',
      prescription: `${m.dosage || ''} ${m.frequency || ''} x ${m.duration || ''}`.trim() || 'As prescribed',
      dosage: m.dosage || '',
      frequency: m.frequency || '',
      duration: m.duration || '',
      stockItemId: m.stockItemId,
      serviceCatalogId: m.serviceCatalogId
    }));
    setMedicines(medications);
  
    // PRINCIPAL GDRG
    setPrincipalGDRG(currentClaim.principalGDRG || '');
    if (availableGDRGs.length > 0) {
      const selectedGdrg = availableGDRGs.find(g => g.gdrgCode === currentClaim.principalGDRG);
      if (selectedGdrg) setPrincipalGDRGDescription(selectedGdrg.description || '');
    }
  
    // AUTHORIZATION CODES
    setPhysicianId(currentClaim.createdById || '');
    setPreAuthCodes(currentClaim.preAuthNumber || '');
    setNotes(currentClaim.notes || '');
  
  }, [currentClaim]); // ✅ Remove availableGDRGs and specialties from dependencies

  const isDraft = currentClaim?.status === 'draft';
  const isFinalized = currentClaim?.status === 'submitted';

  // Calculate length of stay when dates change
useEffect(() => {
  if (admissionDate && dischargeDate) {
    const start = new Date(admissionDate);
    const end = new Date(dischargeDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    setLengthOfStay(days > 0 ? days : 1);
  } else {
    setLengthOfStay(0);
  }
}, [admissionDate, dischargeDate]);


  // ✅ Update description when availableGDRGs loads and principalGDRG is set
  useEffect(() => {
    if (availableGDRGs.length > 0 && principalGDRG) {
      const selectedGdrg = availableGDRGs.find(g => g.gdrgCode === principalGDRG);
      if (selectedGdrg && selectedGdrg.description !== principalGDRGDescription) {
        setPrincipalGDRGDescription(selectedGdrg.description);
      }
    }
  }, [availableGDRGs, principalGDRG]);
  
  // Auto-check Pharmacy when medicines are added
useEffect(() => {
  if (medicines.length > 0 && !typeOfService.includes('Pharmacy')) {
    setTypeOfService(prev => [...prev, 'Pharmacy']);
  }
}, [medicines.length]);

// Then update the loadGDRGTariffs function inside the component:
const loadGDRGTariffs = async () => {
  try {
    // ✅ Use authenticated API client
    const response = await api.get('/gdrg');
    
    // ✅ Safely extract array from response
    let tariffs = [];
    if (response.data?.data && Array.isArray(response.data.data)) {
      tariffs = response.data.data;
    } else if (Array.isArray(response.data)) {
      tariffs = response.data;
    } else if (response.data?.tariffs && Array.isArray(response.data.tariffs)) {
      tariffs = response.data.tariffs;
    } else {
      tariffs = [];
    }
    
    setAvailableGDRGs(tariffs);
  } catch (error) {
    console.error('Error loading GDRG tariffs:', error);
    setAvailableGDRGs([]); // Fallback to empty array
  }
};

// Filter specialties based on service type
const getFilteredSpecialties = () => {
  if (serviceTypeCategory === 'OPD') {
    // OPD specialties
    return specialties.filter(s => ['OPDC', 'MEDI', 'PAED', 'DENT', 'OPHT', 'ENTH'].includes(s.code));
  } else {
    // IPD specialties
    return specialties.filter(s => ['ASUR', 'OBGY', 'ORTH', 'PSUR', 'RSUR'].includes(s.code));
  }
};

// Get GDRG options filtered by specialty
const getFilteredGDRGs = () => {
  const selectedSpecialty = selectedSpecialties[0] || '';
  if (!selectedSpecialty) return availableGDRGs;
  
  return availableGDRGs.filter(g => {
    const gdrgPrefix = g.gdrgCode?.slice(0, 4);
    return gdrgPrefix === selectedSpecialty;
  });
};

// Handle service type change
const handleServiceTypeChange = (type: 'OPD' | 'IPD') => {
  setServiceTypeCategory(type);
  setTypeOfService([type === 'OPD' ? 'Outpatient' : 'Inpatient']);
  
  // Reset specialties when switching
  if (type === 'OPD') {
    setSelectedSpecialties(['OPDC']);
  } else {
    setSelectedSpecialties(['MEDI']);
  }
};

  // Handlers
  const toggleSpecialty = (code: string) => {
    if (selectedSpecialties.includes(code)) {
      setSelectedSpecialties(selectedSpecialties.filter(s => s !== code));
    } else {
      setSelectedSpecialties([...selectedSpecialties, code]);
    }
  };

  const addDiagnosis = (diagnosis: DiagnosisItem) => {
    setDiagnoses([...diagnoses, diagnosis]);
  };

  const removeDiagnosis = (index: number) => {
    setDiagnoses(diagnoses.filter((_, i) => i !== index));
  };

  const addInvestigation = (investigation: InvestigationItem) => {
    setInvestigations([...investigations, investigation]);
  };

  const removeInvestigation = (index: number) => {
    setInvestigations(investigations.filter((_, i) => i !== index));
  };

  const addMedicine = (medicine: MedicineItem) => {
    setMedicines([...medicines, medicine]);
  };

  const removeMedicine = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const updateMedicine = (updatedMedicine: MedicineItem) => {
    setMedicines(medicines.map(m => 
      m.id === updatedMedicine.id ? updatedMedicine : m
    ));
  };

  const updateDatesOfService = (index: number, value: string) => {
    const newDates = [...datesOfService];
    newDates[index] = value;
    setDatesOfService(newDates);
  };

  const handlePrincipalGDRGChange = (gdrgCode: string) => {
    setPrincipalGDRG(gdrgCode);
    const selected = availableGDRGs.find(g => g.gdrgCode === gdrgCode);
    setPrincipalGDRGDescription(selected?.description || '');
  };

  const handleSave = async () => {
    if (!isDraft) return;
    
    try {
      setIsSubmitting(true);
      
      // Prepare dates based on primary service type
      let datesOfServiceArray: string[] = [];
      if (primaryServiceType === 'Outpatient') {
        datesOfServiceArray = visitDates.filter(d => d);
      } else if (primaryServiceType === 'Inpatient') {
        if (admissionDate && dischargeDate) {
          const start = new Date(admissionDate);
          const end = new Date(dischargeDate);
          const current = new Date(start);
          while (current <= end) {
            datesOfServiceArray.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
          }
        }
      } else if (primaryServiceType === 'Diagnostic') {
        if (visitDates[0]) datesOfServiceArray = [visitDates[0]];
      }
      
      // Map service outcome to code
      let serviceOutcomeCode = 'CONT';
      if (serviceOutcome === 'Discharged') serviceOutcomeCode = 'DISC';
      else if (serviceOutcome === 'Died') serviceOutcomeCode = 'DIED';
      else if (serviceOutcome === 'Transferred Out') serviceOutcomeCode = 'TRFO';
      else if (serviceOutcome === 'Absconded') serviceOutcomeCode = 'ABS';
      
      // Map primary service type to code
      let typeOfServiceCode = 'OPD';
      if (primaryServiceType === 'Inpatient') typeOfServiceCode = 'IPD';
      else if (primaryServiceType === 'Diagnostic') typeOfServiceCode = 'DIAG';
      
      const updateData = {
        principalGDRG,
        preAuthNumber: preAuthCodes,
        notes,
        datesOfService: datesOfServiceArray,
        diagnosisCodes: diagnoses.map(d => d.icd10),
        labTestCodes: investigations.filter(i => i.gdrgCode.startsWith('INVE')).map(i => i.gdrgCode),
        scanCodes: investigations.filter(i => !i.gdrgCode.startsWith('INVE')).map(i => i.gdrgCode),
        medicationCodes: medicines.map(m => m.code),
        mdcCode: selectedSpecialties[0] || '',
        typeOfService: typeOfServiceCode,
        serviceOutcome: serviceOutcomeCode,
        // Store secondary options
        isUnbundled: typeOfService.includes('Unbundled'),
        isAllInclusive: typeOfService.includes('All-Inclusive'),
        hasPharmacy: typeOfService.includes('Pharmacy') || medicines.length > 0,
      };
      
      await updateInsuranceClaim(id!, updateData);
      success('Saved', 'Claim updated successfully');
      await loadClaim();
    } catch (err: any) {
      toastError('Save Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalize = async () => {
    if (!isDraft) return;
    
    try {
      setIsSubmitting(true);
      await handleSave();
      await finalizeClaim(id!);
      success('Finalized', 'Claim is ready for submission');
      navigate('/dashboard/insurance-claims');
    } catch (err: any) {
      toastError('Finalize Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !currentClaim) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--icon-purple-text)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] p-6">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard/insurance-claims')}
              className="p-2 hover:bg-[var(--bg-card)] rounded-xl transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
            </button>
            <div className="w-12 h-12 bg-[var(--icon-purple-bg)] rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-[var(--icon-purple-text)]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">UPDATE CLAIM</h1>
              <p className="text-sm text-[var(--text-secondary)]">{currentClaim?.claimNumber}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isDraft && (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded-lg hover:bg-[var(--icon-blue-text)] hover:text-white disabled:opacity-50 text-sm"
                >
                  <Save className="w-4 h-4" />
                  {isSubmitting ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  onClick={handleFinalize}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white disabled:opacity-50 text-sm"
                >
                  <Lock className="w-4 h-4" />
                  Save & Finalize
                </button>
              </>
            )}
            {isFinalized && (
              <>
                <button
                  onClick={() => generateClaimXML(id!)}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-lg hover:bg-[var(--icon-purple-text)] hover:text-white text-sm"
                >
                  <Download className="w-4 h-4" />
                  Download XML
                </button>
                <button
                  onClick={() => generateClaimPrint(id!)}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded-lg hover:bg-[var(--icon-blue-text)] hover:text-white text-sm"
                >
                  <Printer className="w-4 h-4" />
                  Print Claim
                </button>
              </>
            )}
          </div>
        </div>

        {/* Status Banner */}
        <div className={`p-3 rounded-xl mb-6 ${isDraft ? 'bg-[var(--icon-yellow-bg)] border border-[var(--icon-yellow-text)]' : 'bg-[var(--icon-green-bg)] border border-[var(--icon-green-text)]'}`}>
          <div className="flex items-center gap-3">
            {isDraft ? <Clock className="w-5 h-5 text-[var(--icon-yellow-text)]" /> : <CheckCircle className="w-5 h-5 text-[var(--icon-green-text)]" />}
            <span className="text-sm text-[var(--text-primary)]">
              {isDraft ? 'DRAFT - Please review all information before finalizing' : 'FINALIZED - Claim ready for submission'}
            </span>
          </div>
        </div>

        {/* Main Form */}
        <div className="space-y-6">
          
        {/* Member Details Section */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
          <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
            <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <User className="w-4 h-4 text-[var(--icon-cyan-text)]" />
              Member Details
            </h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              
              {/* NHIS Member Number - Permanent */}
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">NHIS Member No</label>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {patientNhisNumber || '—'}
                </p>
                {!patientNhisNumber && (
                  <span className="text-[10px] text-[var(--icon-yellow-text)]">Not linked to NHIS</span>
                )}
              </div>
              
              {/* CCC Code - Temporary per visit */}
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">CCC Code</label>
                <p className="text-sm font-mono text-[var(--text-primary)]">
                  {cccCode || '—'}
                </p>
                {cccCode && (
                  <span className="text-[10px] text-[var(--text-tertiary)]">Claim Check Code</span>
                )}
              </div>
              
              {/* Folder Number */}
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Folder No</label>
                <p className="text-sm text-[var(--text-primary)]">{folderNumber || '—'}</p>
              </div>
              
              {/* Surname */}
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Surname</label>
                <p className="text-sm text-[var(--text-primary)]">{surname || '—'}</p>
              </div>
              
              {/* Other Names */}
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Other Names</label>
                <p className="text-sm text-[var(--text-primary)]">{otherNames || '—'}</p>
              </div>
              
              {/* Gender */}
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Gender</label>
                <p className="text-sm text-[var(--text-primary)]">{gender?.toUpperCase() || '—'}</p>
              </div>
              
              {/* Date of Birth */}
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Date of Birth</label>
                <p className="text-sm text-[var(--text-primary)]">{dateOfBirth || '—'}</p>
              </div>
              
              {/* Age */}
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Age</label>
                <p className="text-sm text-[var(--text-primary)]">{age || '—'}</p>
              </div>
              
            </div>
            
            {/* Info note for draft mode */}
            {isDraft && (
              <div className="mt-4 pt-3 border-t border-[var(--border-color)]">
                <p className="text-xs text-[var(--icon-yellow-text)] flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  To change patient details (Name, DOB, Gender), edit in Patient Management
                </p>
              </div>
            )}
          </div>
        </div>

          {/* Service Information Section */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
              <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                Service Information
              </h2>
            </div>
            <div className="p-4">
              
              {/* Primary Service Type - Radio buttons (only ONE can be selected) */}
              <div className="mb-4">
                <label className="text-sm font-medium text-[var(--text-primary)] mb-2 block">Type of Service</label>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="primaryServiceType"
                      checked={primaryServiceType === 'Outpatient'}
                      onChange={() => {
                        setPrimaryServiceType('Outpatient');
                        setTypeOfService(prev => ['Outpatient', ...prev.filter(t => t !== 'Inpatient' && t !== 'Diagnostic')]);
                      }}
                      disabled={!isDraft}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-[var(--text-primary)]">Outpatient (OPD)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="primaryServiceType"
                      checked={primaryServiceType === 'Inpatient'}
                      onChange={() => {
                        setPrimaryServiceType('Inpatient');
                        setTypeOfService(prev => ['Inpatient', ...prev.filter(t => t !== 'Outpatient' && t !== 'Diagnostic')]);
                      }}
                      disabled={!isDraft}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-[var(--text-primary)]">Inpatient (IPD)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="primaryServiceType"
                      checked={primaryServiceType === 'Diagnostic'}
                      onChange={() => {
                        setPrimaryServiceType('Diagnostic');
                        setTypeOfService(prev => ['Diagnostic', ...prev.filter(t => t !== 'Outpatient' && t !== 'Inpatient')]);
                      }}
                      disabled={!isDraft}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-[var(--text-primary)]">Diagnostic</span>
                  </label>
                </div>
              </div>
              
              {/* Secondary Options - Checkboxes (can be multiple) */}
              <div className="mb-4 pl-1">
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={typeOfService.includes('Unbundled')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTypeOfService([...typeOfService, 'Unbundled']);
                        } else {
                          setTypeOfService(typeOfService.filter(t => t !== 'Unbundled'));
                        }
                      }}
                      disabled={!isDraft}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-[var(--text-primary)]">Unbundled</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={typeOfService.includes('All-Inclusive')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTypeOfService([...typeOfService, 'All-Inclusive']);
                        } else {
                          setTypeOfService(typeOfService.filter(t => t !== 'All-Inclusive'));
                        }
                      }}
                      disabled={!isDraft}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-[var(--text-primary)]">All-Inclusive</span>
                  </label>
                  
                  {/* Pharmacy - Auto-checked when medicines exist, can also be manually checked */}
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={typeOfService.includes('Pharmacy') || medicines.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTypeOfService([...typeOfService, 'Pharmacy']);
                        } else {
                          setTypeOfService(typeOfService.filter(t => t !== 'Pharmacy'));
                        }
                      }}
                      disabled={!isDraft}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-[var(--text-primary)]">
                      Pharmacy 
                      {medicines.length > 0 && (
                        <span className="ml-1 text-xs text-[var(--icon-green-text)]">({medicines.length} items)</span>
                      )}
                    </span>
                  </label>
                </div>
              </div>
              
              {/* Service Outcome */}
              <div className="mb-4">
                <label className="text-sm font-medium text-[var(--text-primary)] mb-2 block">Service Outcome</label>
                <div className="flex flex-wrap gap-4">
                  {['Discharged', 'Died', 'Transferred Out', 'Absconded'].map(option => (
                    <label key={option} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="serviceOutcome"
                        checked={serviceOutcome === option}
                        onChange={() => setServiceOutcome(option)}
                        disabled={!isDraft}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-[var(--text-primary)]">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Dates Section - Different for OPD vs IPD */}
              <div className="pt-4 border-t border-[var(--border-color)]">
                {primaryServiceType === 'Outpatient' ? (
                  <div>
                    <label className="text-sm font-medium text-[var(--text-primary)] mb-2 block">Visit Dates</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {['1st Visit', '2nd Visit', '3rd Visit', '4th Visit'].map((label, idx) => (
                        <div key={idx}>
                          <label className="text-xs text-[var(--text-secondary)]">{label}</label>
                          <input
                            type="date"
                            value={visitDates[idx]}
                            onChange={(e) => {
                              const newDates = [...visitDates];
                              newDates[idx] = e.target.value;
                              setVisitDates(newDates);
                            }}
                            disabled={!isDraft}
                            className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : primaryServiceType === 'Inpatient' ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-[var(--text-primary)] mb-1 block">Admission Date</label>
                      <input
                        type="date"
                        value={admissionDate}
                        onChange={(e) => setAdmissionDate(e.target.value)}
                        disabled={!isDraft}
                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[var(--text-primary)] mb-1 block">Discharge Date</label>
                      <input
                        type="date"
                        value={dischargeDate}
                        onChange={(e) => setDischargeDate(e.target.value)}
                        disabled={!isDraft}
                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[var(--text-primary)] mb-1 block">Length of Stay</label>
                      <p className="px-3 py-2 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)] text-[var(--text-primary)]">
                        {lengthOfStay > 0 ? `${lengthOfStay} day(s)` : '—'}
                      </p>
                    </div>
                  </div>
                ) : (
                  // Diagnostic - single date
                  <div>
                    <label className="text-sm font-medium text-[var(--text-primary)] mb-1 block">Service Date</label>
                    <input
                      type="date"
                      value={visitDates[0]}
                      onChange={(e) => {
                        const newDates = [...visitDates];
                        newDates[0] = e.target.value;
                        setVisitDates(newDates);
                      }}
                      disabled={!isDraft}
                      className="w-full md:w-1/3 px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Specialties Attended Section */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
              <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Building className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                Specialties Attended
              </h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {specialties.map(specialty => (
                  <button
                    key={specialty.code}
                    type="button"
                    onClick={() => toggleSpecialty(specialty.code)}
                    disabled={!isDraft}
                    className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                      selectedSpecialties.includes(specialty.code)
                        ? 'bg-[var(--icon-cyan-bg)] border-[var(--icon-cyan-text)] text-[var(--icon-cyan-text)]'
                        : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                    }`}
                  >
                    {specialty.code}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Diagnoses Table */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)] flex justify-between items-center">
              <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                Diagnoses ({diagnoses.length})
              </h2>
              {isDraft && (
                <button
                  onClick={() => setActiveModal('diagnosis')}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded hover:bg-[var(--icon-cyan-text)] hover:text-white"
                >
                  <Plus className="w-3 h-3" /> Add Diagnosis
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">#</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">GDRG</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">DESCRIPTION</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">DIAGNOSIS</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">ICD10</th>
                    {isDraft && <th className="px-3 py-2 text-center text-xs font-medium text-[var(--text-secondary)]">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {diagnoses.length === 0 ? (
                    <tr><td colSpan={isDraft ? 6 : 5} className="px-3 py-8 text-center text-[var(--text-tertiary)]">No diagnoses added</td></tr>
                  ) : (
                    diagnoses.map((diag, idx) => (
                      <tr key={idx} className="hover:bg-[var(--bg-main)]">
                        <td className="px-3 py-2 text-[var(--text-secondary)]">{idx + 1}.</td>
                        <td className="px-3 py-2 font-mono text-sm">{diag.gdrgCode}</td>
                        <td className="px-3 py-2 text-[var(--text-primary)]">{diag.description}</td>
                        <td className="px-3 py-2 text-[var(--text-primary)]">{diag.diagnosis}</td>
                        <td className="px-3 py-2 font-mono text-sm">{diag.icd10}</td>
                        {isDraft && (
                          <td className="px-3 py-2 text-center">
                            <button onClick={() => removeDiagnosis(idx)} className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Investigations Table */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)] flex justify-between items-center">
              <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                Investigations ({investigations.length})
              </h2>
              {isDraft && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveModal('lab')}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded hover:bg-[var(--icon-purple-text)] hover:text-white"
                  >
                    <Plus className="w-3 h-3" /> Add Lab
                  </button>
                  <button
                    onClick={() => setActiveModal('scan')}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded hover:bg-[var(--icon-blue-text)] hover:text-white"
                  >
                    <Plus className="w-3 h-3" /> Add Scan
                  </button>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">#</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">GDRG</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">DESCRIPTION</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">DATE</th>
                    {isDraft && <th className="px-3 py-2 text-center text-xs font-medium text-[var(--text-secondary)]">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {investigations.length === 0 ? (
                    <tr><td colSpan={isDraft ? 5 : 4} className="px-3 py-8 text-center text-[var(--text-tertiary)]">No investigations added</td></tr>
                  ) : (
                    investigations.map((inv, idx) => (
                      <tr key={idx} className="hover:bg-[var(--bg-main)]">
                        <td className="px-3 py-2 text-[var(--text-secondary)]">{idx + 1}.</td>
                        <td className="px-3 py-2 font-mono text-sm">{inv.gdrgCode}</td>
                        <td className="px-3 py-2 text-[var(--text-primary)]">{inv.description}</td>
                        <td className="px-3 py-2 text-[var(--text-secondary)]">{inv.date}</td>
                        {isDraft && (
                          <td className="px-3 py-2 text-center">
                            <button onClick={() => removeInvestigation(idx)} className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Medicines Table */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)] flex justify-between items-center">
              <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Pill className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                Medicines ({medicines.length})
              </h2>
              {isDraft && (
                <button
                  onClick={() => setActiveModal('medicine')}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded hover:bg-[var(--icon-green-text)] hover:text-white"
                >
                  <Plus className="w-3 h-3" /> Add Medicine
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">#</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">CODE</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">DESCRIPTION</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-[var(--text-secondary)]">QTY</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">DATE</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">PRESCRIPTION</th>
                    {isDraft && <th className="px-3 py-2 text-center text-xs font-medium text-[var(--text-secondary)]">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {medicines.length === 0 ? (
                    <tr><td colSpan={isDraft ? 7 : 6} className="px-3 py-8 text-center text-[var(--text-tertiary)]">No medicines added</td></tr>
                  ) : (
                    medicines.map((med, idx) => (
                      <tr key={idx} className="hover:bg-[var(--bg-main)]">
                        <td className="px-3 py-2 text-[var(--text-secondary)]">{idx + 1}.</td>
                        <td className="px-3 py-2 font-mono text-xs">{med.code}</td>
                        <td className="px-3 py-2 text-[var(--text-primary)]">{med.description}</td>
                        <td className="px-3 py-2 text-center text-[var(--text-primary)]">{med.quantity}</td>
                        <td className="px-3 py-2 text-[var(--text-secondary)]">{med.date}</td>
                        <td className="px-3 py-2 text-xs text-[var(--text-secondary)] max-w-[200px] truncate">{med.prescription}</td>
                        {isDraft && (
                          <td className="px-3 py-2 text-center">
                            <div className="flex justify-center gap-1">
                              <button onClick={() => setEditingMedicine(med)} className="text-blue-500 hover:text-blue-700">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button onClick={() => removeMedicine(idx)} className="text-red-500 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Principal GDRG Section */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
              <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Hash className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                Principal GDRG
              </h2>
            </div>
            <div className="p-4">
              <div className="bg-[var(--icon-yellow-bg)] p-3 rounded-lg mb-4">
                <p className="text-xs text-[var(--text-secondary)]">
                  If you are not certain of the Principal GDRG, then, it is recommended to leave this section blank and the system will automatically identify the most appropriate Principal GDRG for the claim.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[var(--text-primary)] mb-1 block">Select Principal GDRG</label>
                  <select
                    value={principalGDRG}
                    onChange={(e) => handlePrincipalGDRGChange(e.target.value)}
                    disabled={!isDraft}
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] font-mono text-sm"
                  >
                    <option value="">-- Auto-detect --</option>
                    {Array.isArray(availableGDRGs) && availableGDRGs.map(g => (
                      <option key={g.id} value={g.gdrgCode}>
                        {g.gdrgCode} - {g.description}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--text-primary)] mb-1 block">Description</label>
                  <p className="px-3 py-2 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] text-sm">
                    {principalGDRGDescription || '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Authorization Codes Section */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
              <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Lock className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                Authorization Codes
              </h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[var(--text-primary)] mb-1 block">Physician Name/ID</label>
                  <input
                    type="text"
                    value={physicianId}
                    onChange={(e) => setPhysicianId(e.target.value)}
                    disabled={!isDraft}
                    placeholder="Enter physician ID"
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--text-primary)] mb-1 block">Pre-authorization Code(s)</label>
                  <input
                    type="text"
                    value={preAuthCodes}
                    onChange={(e) => setPreAuthCodes(e.target.value)}
                    disabled={!isDraft}
                    placeholder="Enter pre-authorization codes"
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
                  />
                </div>
              </div>
              
              {isDraft && (
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border-color)]">
                  <button
                    onClick={() => navigate('/dashboard/insurance-claims')}
                    className="px-4 py-2 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-main)]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {isSubmitting ? 'Saving...' : 'SAVE'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddDiagnosisModal
        isOpen={activeModal === 'diagnosis'}
        onClose={() => setActiveModal(null)}
        onAdd={addDiagnosis}
        existingDiagnoses={diagnoses}
      />

      <AddInvestigationModal
        isOpen={activeModal === 'lab'}
        onClose={() => setActiveModal(null)}
        onAdd={addInvestigation}
        type="lab"
      />

      <AddInvestigationModal
        isOpen={activeModal === 'scan'}
        onClose={() => setActiveModal(null)}
        onAdd={addInvestigation}
        type="scan"
      />

      <AddMedicineModal
        isOpen={activeModal === 'medicine'}
        onClose={() => setActiveModal(null)}
        onAdd={addMedicine}
      />

      <EditMedicineModal
        isOpen={!!editingMedicine}
        onClose={() => setEditingMedicine(null)}
        onSave={updateMedicine}
        medicine={editingMedicine}
      />
    </div>
  );
}