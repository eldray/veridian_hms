// src/pages/insurance-claims/EditPrivateClaim.tsx
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInsuranceStore } from '../../store/insuranceStore';
import { useMedicalServicesStore } from '../../store/medicalServicesStore';
import { usePatientStore } from '../../store/patientStore';
import { useStockStore } from '../../store/stockStore';
import { useToast } from '../../store/toastStore';
import {
  ArrowLeft, Save, Lock, Download, Printer, FileText, User, Calendar,
  Activity, CheckCircle, XCircle, AlertCircle, Clock, Plus, Search, Trash2,
  Stethoscope, FlaskConical, Pill, Building, DollarSign, TrendingUp, Shield,
  Edit, Trash2 as TrashIcon
} from 'lucide-react';

// Types
interface DiagnosisItem {
  id?: string;
  description: string;
  icd10: string;
  diagnosisId?: string;
}

interface ServiceItem {
  id?: string;
  description: string;
  date: string;
  serviceCatalogId?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface MedicineItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  date: string;
  stockItemId?: string;
}

// ============================================
// AUTO-LOAD HELPERS (from attendance bill)
// ============================================
const toNum = (v: any): number => (v === null || v === undefined ? 0 : parseFloat(v.toString()) || 0);

// Split a bill's line items into priced service rows (everything that is not a
// medication). Used to pre-fill the Services & Procedures table.
function buildServicesFromBill(bill: any): ServiceItem[] {
  const lineItems = bill?.BillLineItem || [];
  return lineItems
    .filter((li: any) => !li.isVoided && li.serviceType !== 'medication')
    .map((li: any) => {
      const quantity = li.quantity || 1;
      const unitPrice = toNum(li.unitPrice);
      return {
        id: li.id,
        description: li.description || li.serviceCatalog?.name || 'Service',
        date: li.createdAt ? new Date(li.createdAt).toISOString().split('T')[0] : '',
        serviceCatalogId: li.serviceCatalogId || undefined,
        quantity,
        unitPrice,
        total: toNum(li.lineTotal) || quantity * unitPrice,
      };
    });
}

// Prefer the bill's medication line items (they carry actual prices); fall back to
// the attendance's dispensed medications when the bill has none.
function buildMedicinesFromBill(bill: any, attendance: any): MedicineItem[] {
  const lineItems = (bill?.BillLineItem || []).filter(
    (li: any) => !li.isVoided && li.serviceType === 'medication'
  );

  if (lineItems.length) {
    return lineItems.map((li: any) => {
      const quantity = li.quantity || 1;
      const unitPrice = toNum(li.unitPrice);
      return {
        id: li.id,
        description: li.description || li.serviceCatalog?.name || 'Medication',
        quantity,
        unitPrice,
        total: toNum(li.lineTotal) || quantity * unitPrice,
        date: li.createdAt ? new Date(li.createdAt).toISOString().split('T')[0] : '',
        serviceCatalogId: li.serviceCatalogId || undefined,
      } as MedicineItem;
    });
  }

  const meds = attendance?.Medication || [];
  return meds.map((m: any) => {
    const quantity = m.quantity || 1;
    const unitPrice = toNum(m.unitPrice ?? m.StockItem?.sellingPrice);
    return {
      id: m.id,
      description: m.name,
      quantity,
      unitPrice,
      total: quantity * unitPrice,
      date: m.dispensedAt
        ? new Date(m.dispensedAt).toISOString().split('T')[0]
        : m.prescribedAt
        ? new Date(m.prescribedAt).toISOString().split('T')[0]
        : '',
      stockItemId: m.stockItemId,
    } as MedicineItem;
  });
}

// ============================================
// ADD DIAGNOSIS MODAL
// ============================================
function AddDiagnosisModalPrivate({ isOpen, onClose, onAdd, existingDiagnoses }: any) {
  const { diagnoses, getDiagnoses } = useMedicalServicesStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<any>(null);

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
        description: selectedDiagnosis.name,
        icd10: selectedDiagnosis.icdCode,
        diagnosisId: selectedDiagnosis.id
      });
      setSelectedDiagnosis(null);
      setSearchTerm('');
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
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredDiagnoses.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDiagnosis(d)}
                className={`w-full text-left p-2 rounded-lg transition-colors ${
                  selectedDiagnosis?.id === d.id
                    ? 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]'
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
          <button onClick={handleAdd} disabled={!selectedDiagnosis} className="flex-1 px-4 py-2 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-lg disabled:opacity-50 text-sm font-medium">
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

// ============================================
// ADD SERVICE MODAL
// ============================================
function AddServiceModal({ isOpen, onClose, onAdd }: any) {
  const { serviceCatalog, getServiceCatalog } = useMedicalServicesStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (isOpen) getServiceCatalog({ isActive: true });
  }, [isOpen, getServiceCatalog]);

  const filteredServices = (serviceCatalog || []).filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    if (selectedService) {
      const unitPrice = selectedService.pricing?.cashPrice || selectedService.cashPrice || 100;
      onAdd({
        description: selectedService.name,
        date: serviceDate,
        serviceCatalogId: selectedService.id,
        quantity,
        unitPrice,
        total: quantity * unitPrice
      });
      setSelectedService(null);
      setSearchTerm('');
      setQuantity(1);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl max-w-md w-full border border-[var(--border-color)]">
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Add Service</h3>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-main)] rounded-lg">
            <XCircle className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search service..."
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
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredServices.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedService(s)}
                className={`w-full text-left p-2 rounded-lg transition-colors ${
                  selectedService?.id === s.id
                    ? 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]'
                    : 'hover:bg-[var(--bg-main)] text-[var(--text-primary)]'
                }`}
              >
                <div className="font-medium text-sm">{s.name}</div>
                <div className="text-xs text-[var(--text-secondary)]">
                  Code: {s.code} | Price: GHS {(s.pricing?.cashPrice || s.cashPrice || 100).toFixed(2)}
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-[var(--border-color)] flex gap-2">
          <button onClick={handleAdd} disabled={!selectedService} className="flex-1 px-4 py-2 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-lg disabled:opacity-50 text-sm font-medium">
            Add Service
          </button>
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ADD MEDICINE MODAL (FIXED - ADDED THIS)
// ============================================
function AddMedicineModal({ isOpen, onClose, onAdd }: any) {
  const { stockItems, getStockItems } = useStockStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [medicineDate, setMedicineDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (isOpen) getStockItems({ isActive: true, isMedication: true });
  }, [isOpen, getStockItems]);

  const filteredMedicines = (stockItems || []).filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.drugCode || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    if (selectedMedicine) {
      const unitPrice = selectedMedicine.costPrice || selectedMedicine.sellingPrice || 0;
      onAdd({
        description: selectedMedicine.name,
        date: medicineDate,
        stockItemId: selectedMedicine.id,
        quantity,
        unitPrice,
        total: quantity * unitPrice
      });
      setSelectedMedicine(null);
      setSearchTerm('');
      setQuantity(1);
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
              <label className="text-xs font-medium text-[var(--text-secondary)]">Date</label>
              <input
                type="date"
                value={medicineDate}
                onChange={(e) => setMedicineDate(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredMedicines.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMedicine(m)}
                className={`w-full text-left p-2 rounded-lg transition-colors ${
                  selectedMedicine?.id === m.id
                    ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]'
                    : 'hover:bg-[var(--bg-main)] text-[var(--text-primary)]'
                }`}
              >
                <div className="font-medium text-sm">{m.name}</div>
                <div className="text-xs text-[var(--text-secondary)]">
                  Code: {m.drugCode || m.code} | Price: GHS {(m.costPrice || 0).toFixed(2)}
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-[var(--border-color)] flex gap-2">
          <button onClick={handleAdd} disabled={!selectedMedicine} className="flex-1 px-4 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg disabled:opacity-50 text-sm font-medium">
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

// ============================================
// EDIT SERVICE MODAL
// ============================================
function EditServiceModal({ isOpen, onClose, onSave, service }: any) {
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    if (service) setFormData({ ...service });
  }, [service]);

  const handleSave = () => {
    if (formData) {
      formData.total = formData.quantity * formData.unitPrice;
      onSave(formData);
      onClose();
    }
  };

  if (!isOpen || !formData) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl max-w-md w-full border border-[var(--border-color)]">
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Edit Service</h3>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-main)] rounded-lg">
            <XCircle className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="bg-[var(--bg-main)] p-2 rounded-lg">
            <p className="text-sm font-medium">{formData.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Quantity</label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-main)] text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Unit Price (GHS)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-main)] text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)]">Service Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-main)] text-sm"
            />
          </div>
          <div className="bg-[var(--icon-purple-bg)] p-2 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Total:</span>
              <span className="font-bold text-[var(--icon-purple-text)]">GHS {(formData.quantity * formData.unitPrice).toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-[var(--border-color)] flex gap-2">
          <button onClick={handleSave} className="flex-1 px-4 py-2 bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded-lg text-sm font-medium">
            Save Changes
          </button>
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// EDIT MEDICINE MODAL (FIXED - ADDED THIS)
// ============================================
function EditMedicineModal({ isOpen, onClose, onSave, medicine }: any) {
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    if (medicine) setFormData({ ...medicine });
  }, [medicine]);

  const handleSave = () => {
    if (formData) {
      formData.total = formData.quantity * formData.unitPrice;
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
            <p className="text-sm font-medium">{formData.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Quantity</label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-main)] text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Unit Price (GHS)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-main)] text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)]">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-main)] text-sm"
            />
          </div>
          <div className="bg-[var(--icon-green-bg)] p-2 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Total:</span>
              <span className="font-bold text-[var(--icon-green-text)]">GHS {(formData.quantity * formData.unitPrice).toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-[var(--border-color)] flex gap-2">
          <button onClick={handleSave} className="flex-1 px-4 py-2 bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded-lg text-sm font-medium">
            Save Changes
          </button>
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function EditPrivateClaim() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
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

  const { patients } = usePatientStore();
  const { getDiagnoses, serviceCatalog, getServiceCatalog } = useMedicalServicesStore();
  const { getStockItems } = useStockStore();

  // State
  const [insuranceProvider, setInsuranceProvider] = useState<any>(null);
  const [coveragePercentage, setCoveragePercentage] = useState(80);
  const [policyNumber, setPolicyNumber] = useState('');
  const [diagnoses, setDiagnoses] = useState<DiagnosisItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [insuranceCoverage, setInsuranceCoverage] = useState(0);
  const [patientPayable, setPatientPayable] = useState(0);
  const [visitDate, setVisitDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<any>(null);
  const [editingMedicine, setEditingMedicine] = useState<any>(null);

  const isDraft = currentClaim?.status === 'draft';
  const isFinalized = currentClaim?.status === 'submitted';

  // Calculate totals
  useEffect(() => {
    const serviceTotal = services.reduce((sum, s) => sum + (s.total || s.quantity * s.unitPrice), 0);
    const medicineTotal = medicines.reduce((sum, m) => sum + (m.total || m.quantity * m.unitPrice), 0);
    const newSubtotal = serviceTotal + medicineTotal;
    setSubtotal(newSubtotal);
    
    const newInsuranceCoverage = newSubtotal * (coveragePercentage / 100);
    setInsuranceCoverage(newInsuranceCoverage);
    setPatientPayable(newSubtotal - newInsuranceCoverage);
  }, [services, medicines, coveragePercentage]);

  // Load claim data
  useEffect(() => {
    if (id) {
      getInsuranceClaim(id);
      getDiagnoses();
      getServiceCatalog({ isActive: true });
      getStockItems({ isActive: true, isMedication: true });
    }
  }, [id]);

  // Populate form from claim
  useEffect(() => {
    if (!currentClaim || isInitialized.current) return;
    isInitialized.current = true;

    const attendance = currentClaim.Attendance;
    const provider = currentClaim.InsuranceProvider;
    
    setInsuranceProvider(provider);
    setCoveragePercentage(provider?.coveragePercentage || 80);
    setPolicyNumber(attendance?.nhisCCC || currentClaim.preAuthNumber || '');
    setVisitDate(attendance?.dateTime?.split('T')[0] || new Date().toISOString().split('T')[0]);
    setNotes(currentClaim.notes || '');

    // Parse diagnoses from attendance
    const attendanceDiagnoses = attendance?.AttendanceDiagnosis || [];
    setDiagnoses(attendanceDiagnoses.map((d: any) => ({
      id: d.id,
      description: d.Diagnosis?.name || '',
      icd10: d.Diagnosis?.icdCode || '',
      diagnosisId: d.diagnosisId
    })));

    // Services & medicines: prefer saved metadata, otherwise auto-load (priced)
    // from the attendance bill so the user starts from the actual billed items.
    const metadata = (currentClaim.metadata || {}) as any;

    if (metadata.services?.length) {
      setServices(metadata.services);
    } else {
      setServices(buildServicesFromBill(currentClaim.Bill));
    }

    if (metadata.medicines?.length) {
      setMedicines(metadata.medicines);
    } else {
      setMedicines(buildMedicinesFromBill(currentClaim.Bill, attendance));
    }
  }, [currentClaim]);

  const addDiagnosis = (diagnosis: DiagnosisItem) => {
    setDiagnoses([...diagnoses, diagnosis]);
  };

  const removeDiagnosis = (index: number) => {
    setDiagnoses(diagnoses.filter((_, i) => i !== index));
  };

  const addService = (service: ServiceItem) => {
    setServices([...services, service]);
  };

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const updateService = (updatedService: ServiceItem) => {
    setServices(services.map(s => s.id === updatedService.id ? updatedService : s));
  };

  const addMedicine = (medicine: MedicineItem) => {
    setMedicines([...medicines, medicine]);
  };

  const removeMedicine = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const updateMedicine = (updatedMedicine: MedicineItem) => {
    setMedicines(medicines.map(m => m.id === updatedMedicine.id ? updatedMedicine : m));
  };

  const handleSave = async () => {
    if (!isDraft) return;
    
    try {
      setIsSubmitting(true);
      
      const updateData = {
        diagnosisCodes: diagnoses.map(d => d.icd10),
        serviceCodes: services.map(s => s.serviceCatalogId).filter(Boolean),
        medicationCodes: medicines.map(m => m.stockItemId).filter(Boolean),
        notes,
        totalClaimAmount: subtotal,
        approvedAmount: insuranceCoverage,
        metadata: {
          services,
          medicines,
          diagnoses
        }
      };
      
      await updateInsuranceClaim(id!, updateData);
      success('Saved', 'Private insurance claim updated successfully');
      await getInsuranceClaim(id!);
    } catch (err: any) {
      toastError('Save Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalize = async () => {
    await handleSave();
    await finalizeClaim(id!);
    success('Finalized', 'Claim is ready for submission');
    navigate('/dashboard/insurance-claims');
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
            <button onClick={() => navigate('/dashboard/insurance-claims')} className="p-2 hover:bg-[var(--bg-card)] rounded-xl">
              <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
            </button>
            <div className="w-12 h-12 bg-[var(--icon-purple-bg)] rounded-xl flex items-center justify-center">
              <Building className="w-6 h-6 text-[var(--icon-purple-text)]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">Edit Private Insurance Claim</h1>
              <p className="text-sm text-[var(--text-secondary)]">{currentClaim?.claimNumber}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isDraft && (
              <>
                <button onClick={handleSave} disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded-lg">
                  <Save className="w-4 h-4" /> Save Draft
                </button>
                <button onClick={handleFinalize} className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg">
                  <Lock className="w-4 h-4" /> Finalize
                </button>
              </>
            )}
            {isFinalized && (
              <>
                <button onClick={() => generateClaimXML(id!)} className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-lg">
                  <Download className="w-4 h-4" /> XML
                </button>
                <button onClick={() => generateClaimPrint(id!)} className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded-lg">
                  <Printer className="w-4 h-4" /> Print
                </button>
              </>
            )}
          </div>
        </div>

        {/* Status Banner */}
        <div className={`p-3 rounded-xl mb-6 ${isDraft ? 'bg-[var(--icon-yellow-bg)]' : 'bg-[var(--icon-green-bg)]'}`}>
          <div className="flex items-center gap-3">
            {isDraft ? <Clock className="w-5 h-5 text-[var(--icon-yellow-text)]" /> : <CheckCircle className="w-5 h-5 text-[var(--icon-green-text)]" />}
            <span className="text-sm">{isDraft ? 'DRAFT - Private insurance claim requires itemized services' : 'FINALIZED - Ready for submission'}</span>
          </div>
        </div>

        {/* Insurance Provider Details */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] mb-6">
          <div className="bg-[var(--bg-main)] px-4 py-3 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-[var(--icon-purple-text)]" />
              Insurance Provider
            </h2>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Provider</label>
              <p className="text-sm font-medium">{insuranceProvider?.name || '—'}</p>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Policy Number</label>
              <p className="text-sm">{policyNumber || '—'}</p>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Coverage %</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={coveragePercentage}
                  onChange={(e) => setCoveragePercentage(parseInt(e.target.value))}
                  disabled={!isDraft}
                  className="flex-1"
                />
                <span className="text-sm font-bold w-12">{coveragePercentage}%</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Service Date</label>
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                disabled={!isDraft}
                className="w-full px-3 py-1 border rounded-lg bg-[var(--bg-main)] text-sm"
              />
            </div>
          </div>
        </div>

        {/* Diagnoses Section */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] mb-6">
          <div className="bg-[var(--bg-main)] px-4 py-3 border-b flex justify-between items-center">
            <h2 className="font-semibold flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-[var(--icon-purple-text)]" />
              Diagnoses ({diagnoses.length})
            </h2>
            {isDraft && (
              <button onClick={() => setActiveModal('diagnosis')} className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded">
                <Plus className="w-3 h-3" /> Add Diagnosis
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-main)] border-b">
                <tr>
                  <th className="px-3 py-2 text-left text-xs">#</th>
                  <th className="px-3 py-2 text-left text-xs">DESCRIPTION</th>
                  <th className="px-3 py-2 text-left text-xs">ICD-10</th>
                  {isDraft && <th className="px-3 py-2 text-center text-xs">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {diagnoses.length === 0 ? (
                  <tr>
                    <td colSpan={isDraft ? 4 : 3} className="px-3 py-8 text-center text-[var(--text-tertiary)]">No diagnoses added</td>
                  </tr>
                ) : (
                  diagnoses.map((diag, idx) => (
                    <tr key={idx} className="hover:bg-[var(--bg-main)]">
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2">{diag.description}</td>
                      <td className="px-3 py-2 font-mono text-xs">{diag.icd10}</td>
                      {isDraft && (
                        <td className="px-3 py-2 text-center">
                          <button onClick={() => removeDiagnosis(idx)} className="text-red-500 hover:text-red-700">
                            <TrashIcon className="w-4 h-4" />
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

        {/* Services Section */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] mb-6">
          <div className="bg-[var(--bg-main)] px-4 py-3 border-b flex justify-between items-center">
            <h2 className="font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-[var(--icon-purple-text)]" />
              Services & Procedures ({services.length})
            </h2>
            {isDraft && (
              <button onClick={() => setActiveModal('service')} className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded">
                <Plus className="w-3 h-3" /> Add Service
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-main)] border-b">
                <tr>
                  <th className="px-3 py-2 text-left text-xs">#</th>
                  <th className="px-3 py-2 text-left text-xs">SERVICE</th>
                  <th className="px-3 py-2 text-center text-xs">QTY</th>
                  <th className="px-3 py-2 text-right text-xs">UNIT PRICE</th>
                  <th className="px-3 py-2 text-right text-xs">TOTAL</th>
                  {isDraft && <th className="px-3 py-2 text-center text-xs">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {services.length === 0 ? (
                  <tr>
                    <td colSpan={isDraft ? 6 : 5} className="px-3 py-8 text-center text-[var(--text-tertiary)]">No services added</td>
                  </tr>
                ) : (
                  services.map((srv, idx) => (
                    <tr key={idx} className="hover:bg-[var(--bg-main)]">
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2">{srv.description}</td>
                      <td className="px-3 py-2 text-center">{srv.quantity}</td>
                      <td className="px-3 py-2 text-right">GHS {srv.unitPrice.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-medium">GHS {(srv.quantity * srv.unitPrice).toFixed(2)}</td>
                      {isDraft && (
                        <td className="px-3 py-2 text-center">
                          <div className="flex justify-center gap-1">
                            <button onClick={() => setEditingService(srv)} className="text-blue-500"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => removeService(idx)} className="text-red-500"><TrashIcon className="w-4 h-4" /></button>
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

        {/* Medicines Section */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] mb-6">
          <div className="bg-[var(--bg-main)] px-4 py-3 border-b flex justify-between items-center">
            <h2 className="font-semibold flex items-center gap-2">
              <Pill className="w-4 h-4 text-[var(--icon-purple-text)]" />
              Medicines ({medicines.length})
            </h2>
            {isDraft && (
              <button onClick={() => setActiveModal('medicine')} className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded">
                <Plus className="w-3 h-3" /> Add Medicine
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-main)] border-b">
                <tr>
                  <th className="px-3 py-2 text-left text-xs">#</th>
                  <th className="px-3 py-2 text-left text-xs">MEDICATION</th>
                  <th className="px-3 py-2 text-center text-xs">QTY</th>
                  <th className="px-3 py-2 text-right text-xs">UNIT PRICE</th>
                  <th className="px-3 py-2 text-right text-xs">TOTAL</th>
                  {isDraft && <th className="px-3 py-2 text-center text-xs">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {medicines.length === 0 ? (
                  <tr>
                    <td colSpan={isDraft ? 6 : 5} className="px-3 py-8 text-center text-[var(--text-tertiary)]">No medicines added</td>
                  </tr>
                ) : (
                  medicines.map((med, idx) => (
                    <tr key={idx} className="hover:bg-[var(--bg-main)]">
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2">{med.description}</td>
                      <td className="px-3 py-2 text-center">{med.quantity}</td>
                      <td className="px-3 py-2 text-right">GHS {med.unitPrice.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-medium">GHS {(med.quantity * med.unitPrice).toFixed(2)}</td>
                      {isDraft && (
                        <td className="px-3 py-2 text-center">
                          <div className="flex justify-center gap-1">
                            <button onClick={() => setEditingMedicine(med)} className="text-blue-500"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => removeMedicine(idx)} className="text-red-500"><TrashIcon className="w-4 h-4" /></button>
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

        {/* Financial Summary */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] mb-6">
          <div className="bg-[var(--bg-main)] px-4 py-3 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[var(--icon-purple-text)]" />
              Financial Summary
            </h2>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between py-2">
                <span className="text-[var(--text-secondary)]">Subtotal:</span>
                <span className="font-medium">GHS {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-t">
                <span className="text-[var(--text-secondary)]">Insurance Coverage ({coveragePercentage}%):</span>
                <span className="text-[var(--icon-green-text)] font-medium">- GHS {insuranceCoverage.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-t border-b bg-[var(--icon-purple-bg)] p-3 rounded-lg">
                <span className="font-bold">Patient Payable:</span>
                <span className="font-bold text-[var(--icon-purple-text)]">GHS {patientPayable.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
          <div className="bg-[var(--bg-main)] px-4 py-3 border-b">
            <h2 className="font-semibold">Notes</h2>
          </div>
          <div className="p-4">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!isDraft}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-main)] resize-none"
              placeholder="Additional notes..."
            />
            
            {isDraft && (
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button onClick={() => navigate('/dashboard/insurance-claims')} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button onClick={handleSave} disabled={isSubmitting} className="px-6 py-2 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Save
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        <AddDiagnosisModalPrivate
          isOpen={activeModal === 'diagnosis'}
          onClose={() => setActiveModal(null)}
          onAdd={addDiagnosis}
          existingDiagnoses={diagnoses}
        />

        <AddServiceModal
          isOpen={activeModal === 'service'}
          onClose={() => setActiveModal(null)}
          onAdd={addService}
        />

        <AddMedicineModal
          isOpen={activeModal === 'medicine'}
          onClose={() => setActiveModal(null)}
          onAdd={addMedicine}
        />

        <EditServiceModal
          isOpen={!!editingService}
          onClose={() => setEditingService(null)}
          onSave={updateService}
          service={editingService}
        />

        <EditMedicineModal
          isOpen={!!editingMedicine}
          onClose={() => setEditingMedicine(null)}
          onSave={updateMedicine}
          medicine={editingMedicine}
        />
      </div>
    </div>
  );
}