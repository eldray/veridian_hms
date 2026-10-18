// src/pages/insurance-claims/EditPrivateClaim.tsx
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInsuranceStore } from '../../store/insuranceStore';
import { useMedicalServicesStore } from '../../store/medicalServicesStore';
import { usePatientStore } from '../../store/patientStore';
import { useStockStore } from '../../store/stockStore';
import { useToast } from '../../store/toastStore';
import { ClaimFrame, ClaimCard, UField, ListSection, TH, ClaimFooter, fmtDate } from '../../components/claims/ClaimUI';
import { Download, Printer, XCircle, Plus, Search, Edit, Trash2 as TrashIcon } from 'lucide-react';

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

const p = (claim: any): any => claim?.patient ?? claim?.Patient ?? {};
const a = (claim: any): any => claim?.attendance ?? claim?.Attendance ?? {};
const billOf = (claim: any): any => claim?.bill ?? claim?.Bill ?? {};

const toNum = (v: any): number => (v === null || v === undefined ? 0 : parseFloat(v.toString()) || 0);

function buildServicesFromBill(bill: any): ServiceItem[] {
  const lineItems = bill?.billLineItem ?? bill?.BillLineItem ?? [];
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

function buildMedicinesFromBill(bill: any, attendance: any): MedicineItem[] {
  const lineItems = (bill?.billLineItem ?? bill?.BillLineItem ?? []).filter(
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
      } as MedicineItem;
    });
  }
  const meds = attendance?.medication ?? attendance?.Medication ?? [];
  return meds.map((m: any) => {
    const quantity = m.quantity || 1;
    const unitPrice = toNum(m.unitPrice ?? m.stockItem?.sellingPrice ?? m.StockItem?.sellingPrice);
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

function AddDiagnosisModalPrivate({ isOpen, onClose, onAdd }: any) {
  const { diagnoses, getDiagnoses } = useMedicalServicesStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<any>(null);

  useEffect(() => { if (isOpen) getDiagnoses(); }, [isOpen, getDiagnoses]);

  const filtered = diagnoses.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.icdCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    if (!selectedDiagnosis) return;
    onAdd({
      description: selectedDiagnosis.name,
      icd10: selectedDiagnosis.icdCode,
      diagnosisId: selectedDiagnosis.id,
    });
    setSelectedDiagnosis(null);
    setSearchTerm('');
    onClose();
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
            {filtered.map((d) => (
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

function AddServiceModal({ isOpen, onClose, onAdd }: any) {
  const { serviceCatalog, getServiceCatalog } = useMedicalServicesStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { if (isOpen) getServiceCatalog({ isActive: true }); }, [isOpen, getServiceCatalog]);

  const filtered = (serviceCatalog || []).filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    if (!selectedService) return;
    const unitPrice = selectedService.pricing?.insurancePrice || selectedService.pricing?.cashPrice || selectedService.cashPrice || 100;
    onAdd({
      description: selectedService.name,
      date: serviceDate,
      serviceCatalogId: selectedService.id,
      quantity,
      unitPrice,
      total: quantity * unitPrice,
    });
    setSelectedService(null);
    setSearchTerm('');
    setQuantity(1);
    onClose();
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
              <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Service Date</label>
              <input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm" />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filtered.map((s) => (
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
                <div className="text-xs text-[var(--text-secondary)]">Code: {s.code} | Price: GHS {(s.pricing?.insurancePrice || s.pricing?.cashPrice || s.cashPrice || 100).toFixed(2)}</div>
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

function AddMedicineModal({ isOpen, onClose, onAdd }: any) {
  const { stockItems, getStockItems } = useStockStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [medicineDate, setMedicineDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (isOpen) getStockItems({ isActive: true, isMedication: true });
  }, [isOpen, getStockItems]);

  const filtered = (stockItems || []).filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.drugCode || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    if (!selectedMedicine) return;
    const unitPrice = selectedMedicine.costPrice || selectedMedicine.sellingPrice || 0;
    onAdd({
      description: selectedMedicine.name,
      date: medicineDate,
      stockItemId: selectedMedicine.id,
      quantity,
      unitPrice,
      total: quantity * unitPrice,
    });
    setSelectedMedicine(null);
    setSearchTerm('');
    setQuantity(1);
    onClose();
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
              <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Date</label>
              <input type="date" value={medicineDate} onChange={(e) => setMedicineDate(e.target.value)} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm" />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filtered.map((m) => (
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
                <div className="text-xs text-[var(--text-secondary)]">Code: {m.drugCode || m.code} | Price: GHS {(m.costPrice || 0).toFixed(2)}</div>
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

function EditServiceModal({ isOpen, onClose, onSave, service }: any) {
  const [formData, setFormData] = useState<any>(null);
  useEffect(() => { if (service) setFormData({ ...service }); }, [service]);

  const handleSave = () => {
    if (!formData) return;
    formData.total = formData.quantity * formData.unitPrice;
    onSave(formData);
    onClose();
  };

  if (!isOpen || !formData) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl max-w-md w-full border border-[var(--border-color)]">
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Edit Service</h3>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-main)] rounded-lg"><XCircle className="w-5 h-5 text-[var(--text-secondary)]" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="bg-[var(--bg-main)] p-2 rounded-lg">
            <p className="text-sm font-medium">{formData.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Quantity</label>
              <input type="number" min="1" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-main)] text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Unit Price (GHS)</label>
              <input type="number" min="0" step="0.01" value={formData.unitPrice} onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-main)] text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)]">Service Date</label>
            <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-main)] text-sm" />
          </div>
          <div className="bg-[var(--icon-purple-bg)] p-2 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Total:</span>
              <span className="font-bold text-[var(--icon-purple-text)]">GHS {(formData.quantity * formData.unitPrice).toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-[var(--border-color)] flex gap-2">
          <button onClick={handleSave} className="flex-1 px-4 py-2 bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded-lg text-sm font-medium">Save Changes</button>
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function EditMedicineModal({ isOpen, onClose, onSave, medicine }: any) {
  const [formData, setFormData] = useState<any>(null);
  useEffect(() => { if (medicine) setFormData({ ...medicine }); }, [medicine]);

  const handleSave = () => {
    if (!formData) return;
    formData.total = formData.quantity * formData.unitPrice;
    onSave(formData);
    onClose();
  };

  if (!isOpen || !formData) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl max-w-md w-full border border-[var(--border-color)]">
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Edit Medicine</h3>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-main)] rounded-lg"><XCircle className="w-5 h-5 text-[var(--text-secondary)]" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="bg-[var(--bg-main)] p-2 rounded-lg">
            <p className="text-sm font-medium">{formData.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Quantity</label>
              <input type="number" min="1" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-main)] text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Unit Price (GHS)</label>
              <input type="number" min="0" step="0.01" value={formData.unitPrice} onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-main)] text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)]">Date</label>
            <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-main)] text-sm" />
          </div>
          <div className="bg-[var(--icon-green-bg)] p-2 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Total:</span>
              <span className="font-bold text-[var(--icon-green-text)]">GHS {(formData.quantity * formData.unitPrice).toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-[var(--border-color)] flex gap-2">
          <button onClick={handleSave} className="flex-1 px-4 py-2 bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded-lg text-sm font-medium">Save Changes</button>
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function EditPrivateClaim() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const isInitialized = useRef(false);

  const {
    currentClaim,
    getInsuranceClaim,
    updateClaimDraft,
    replaceClaimItems,
    finalizeClaim,
    downloadClaimXml,
    printClaim,
    isLoading,
  } = useInsuranceStore();

  const { getDiagnoses, getServiceCatalog } = useMedicalServicesStore();
  const { getStockItems } = useStockStore();

  const [insuranceProvider, setInsuranceProvider] = useState<any>(null);
  const [coveragePercentage, setCoveragePercentage] = useState(80);
  const [policyNumber, setPolicyNumber] = useState('');
  const [memberNumber, setMemberNumber] = useState('');
  const [diagnoses, setDiagnoses] = useState<DiagnosisItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [insuranceCoverage, setInsuranceCoverage] = useState(0);
  const [patientPayable, setPatientPayable] = useState(0);
  const [visitDate, setVisitDate] = useState('');
  const [notes, setNotes] = useState('');
  const [preAuthNumber, setPreAuthNumber] = useState('');
  const [tablesOpen, setTablesOpen] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<any>(null);
  const [editingMedicine, setEditingMedicine] = useState<any>(null);

  const isDraft = currentClaim?.status === 'draft';
  const isFinalized = currentClaim?.status === 'finalized';

  useEffect(() => {
    const serviceTotal = services.reduce((s, x) => s + (x.total || x.quantity * x.unitPrice), 0);
    const medicineTotal = medicines.reduce((s, x) => s + (x.total || x.quantity * x.unitPrice), 0);
    const newSubtotal = serviceTotal + medicineTotal;
    setSubtotal(newSubtotal);
    const covered = newSubtotal * (coveragePercentage / 100);
    setInsuranceCoverage(covered);
    setPatientPayable(newSubtotal - covered);
  }, [services, medicines, coveragePercentage]);

  useEffect(() => {
    if (id) {
      getInsuranceClaim(id);
      getDiagnoses();
      getServiceCatalog({ isActive: true });
      getStockItems({ isActive: true, isMedication: true });
    }
  }, [id]);

  useEffect(() => {
    if (!currentClaim || isInitialized.current) return;
    isInitialized.current = true;

    const patient = p(currentClaim);
    const attendance = a(currentClaim);
    const provider = currentClaim.InsuranceProvider ?? currentClaim.insuranceProvider ?? null;
    const meta = (currentClaim.metadata || {}) as any;

    setInsuranceProvider(provider);
    setCoveragePercentage(provider?.coveragePercentage || 80);
    setPolicyNumber(meta.policyNumber || attendance?.nhisCCC || currentClaim.preAuthNumber || '');
    setMemberNumber(meta.memberNumber || '');
    setVisitDate(
      meta.visitDate ||
        attendance?.dateTime?.split?.('T')?.[0] ||
        new Date().toISOString().split('T')[0],
    );
    setNotes(currentClaim.notes || '');
    setPreAuthNumber(currentClaim.preAuthNumber || '');

    const serverItems: any[] = (currentClaim as any).items ?? [];
    const diagServer = serverItems.filter((i: any) => i.itemCategory === 'diagnosis');
    const serviceServer = serverItems.filter((i: any) => i.itemCategory === 'service');
    const medServer = serverItems.filter((i: any) => i.itemCategory === 'medicine');

    if (diagServer.length) {
      setDiagnoses(diagServer.map((d: any) => ({
        id: d.id,
        description: d.description,
        icd10: d.code,
        diagnosisId: d.diagnosisId,
      })));
    } else if (meta.diagnoses?.length) {
      setDiagnoses(meta.diagnoses);
    } else {
      const attDiags = attendance?.attendanceDiagnosis ?? attendance?.AttendanceDiagnosis ?? [];
      setDiagnoses(attDiags.map((d: any) => ({
        id: d.id,
        description: d.diagnosis?.name || d.Diagnosis?.name || '',
        icd10: d.diagnosis?.icdCode || d.Diagnosis?.icdCode || '',
        diagnosisId: d.diagnosisId,
      })));
    }

    if (serviceServer.length) {
      setServices(serviceServer.map((s: any) => ({
        id: s.id,
        description: s.description,
        date: s.serviceDate ? String(s.serviceDate).split('T')[0] : '',
        serviceCatalogId: s.serviceCatalogId,
        quantity: s.quantity,
        unitPrice: toNum(s.unitPrice),
        total: toNum(s.lineTotal),
      })));
    } else if (meta.services?.length) {
      setServices(meta.services);
    } else {
      setServices(buildServicesFromBill(billOf(currentClaim)));
    }

    if (medServer.length) {
      setMedicines(medServer.map((m: any) => ({
        id: m.id,
        description: m.description,
        quantity: m.quantity,
        unitPrice: toNum(m.unitPrice),
        total: toNum(m.lineTotal),
        date: m.serviceDate ? String(m.serviceDate).split('T')[0] : '',
        stockItemId: m.medicationId,
      })));
    } else if (meta.medicines?.length) {
      setMedicines(meta.medicines);
    } else {
      setMedicines(buildMedicinesFromBill(billOf(currentClaim), attendance));
    }
  }, [currentClaim]);

  const addDiagnosis = (d: DiagnosisItem) => setDiagnoses([...diagnoses, d]);
  const removeDiagnosis = (i: number) => setDiagnoses(diagnoses.filter((_, idx) => idx !== i));

  const addService = (s: ServiceItem) => setServices([...services, s]);
  const removeService = (i: number) => setServices(services.filter((_, idx) => idx !== i));
  const updateService = (s: ServiceItem) => setServices(services.map(x => x.id === s.id ? s : x));

  const addMedicine = (m: MedicineItem) => setMedicines([...medicines, m]);
  const removeMedicine = (i: number) => setMedicines(medicines.filter((_, idx) => idx !== i));
  const updateMedicine = (m: MedicineItem) => setMedicines(medicines.map(x => x.id === m.id ? m : x));

  const buildItemsPayload = () => {
    const out: any[] = [];
    for (const d of diagnoses) {
      if (!d.icd10) continue;
      out.push({
        itemCategory: 'diagnosis',
        code: d.icd10,
        description: d.description,
        quantity: 1,
        unitPrice: 0,
        lineTotal: 0,
        diagnosisId: d.diagnosisId ?? null,
      });
    }
    for (const s of services) {
      out.push({
        itemCategory: 'service',
        code: s.serviceCatalogId || s.description,
        description: s.description,
        quantity: s.quantity,
        unitPrice: s.unitPrice,
        lineTotal: s.total,
        serviceDate: s.date || null,
        serviceCatalogId: s.serviceCatalogId ?? null,
      });
    }
    for (const m of medicines) {
      out.push({
        itemCategory: 'medicine',
        code: m.stockItemId || m.description,
        description: m.description,
        quantity: m.quantity,
        unitPrice: m.unitPrice,
        lineTotal: m.total,
        serviceDate: m.date || null,
        medicationId: m.stockItemId ?? null,
      });
    }
    return out;
  };

  const handleSave = async () => {
    if (!isDraft) return;
    try {
      setIsSubmitting(true);

      await updateClaimDraft(id!, {
        notes,
        preAuthNumber,
        metadata: { policyNumber, memberNumber, coveragePercentage, visitDate },
      });

      const items = buildItemsPayload();
      if (items.length > 0) await replaceClaimItems(id!, items);

      success('Saved', 'Private insurance claim updated successfully');
      await getInsuranceClaim(id!);
    } catch (err: any) {
      toastError('Save Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalize = async () => {
    try {
      await handleSave();
      await finalizeClaim(id!);
      success('Finalized', 'Claim is ready for submission');
      navigate('/dashboard/insurance-claims');
    } catch (err: any) {
      toastError('Finalize Failed', err.message);
    }
  };

  if (isLoading && !currentClaim) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--icon-purple-text)]" />
      </div>
    );
  }

  const patient = p(currentClaim);
  const dobStr = patient?.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : '';
  const ageStr = (() => {
    if (!patient?.dateOfBirth) return '';
    const b = new Date(patient.dateOfBirth), t = new Date();
    let n = t.getFullYear() - b.getFullYear();
    if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) n--;
    return `Age: ${n}yrs`;
  })();
  const locked = !isDraft;
  const addBtn = (label: string, modal: string) => isDraft ? (
    <button type="button" onClick={() => setActiveModal(modal)} className="text-xs border border-white/60 rounded px-2 py-0.5 hover:bg-white/10 normal-case flex items-center gap-1"><Plus className="w-3 h-3" /> {label}</button>
  ) : undefined;
  const money = (n: number) => `GHS ${n.toFixed(2)}`;

  return (
    <>
      <ClaimFrame
        title="Update Claim"
        subtitle={`${currentClaim?.claimNumber ?? ''} · Private insurance`}
        status={<span className={`text-xs px-2 py-1 rounded mr-1 ${isDraft ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{isDraft ? 'DRAFT' : 'FINALIZED'}</span>}
        onClose={() => navigate('/dashboard/insurance-claims')}
        onCollapse={() => setTablesOpen(o => !o)}
        onFinalize={isDraft ? handleFinalize : undefined}
        finalizing={isSubmitting}
      >
        <ClaimCard title="Member Details">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
            <UField label="Insurance Provider" value={insuranceProvider?.name || ''} />
            <UField label="Policy Number" value={policyNumber} onChange={setPolicyNumber} disabled={locked} />
            <UField label="Member / Card No." value={memberNumber} onChange={setMemberNumber} disabled={locked} />
            <UField label="Surname" value={patient?.surname || ''} />
            <UField label="Other Names" value={patient?.otherNames || ''} />
            <UField label="Folder No." value={patient?.folderNumber || ''} />
            <UField label="Gender" value={(patient?.gender || '').toUpperCase()} />
            <UField label="Date of Birth" value={dobStr} icon="calendar" hint={ageStr} />
            <UField label="Date of Service" type="date" value={visitDate} onChange={setVisitDate} disabled={locked} />
          </div>
        </ClaimCard>

        <ClaimCard title="Coverage">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Insurance coverage</label>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={100} value={coveragePercentage} onChange={e => setCoveragePercentage(parseInt(e.target.value))} disabled={locked} className="flex-1" />
                <span className="w-14 text-right text-[15px] text-gray-700 font-medium">{coveragePercentage}%</span>
              </div>
            </div>
            <div className="text-[15px] text-gray-700 space-y-1">
              <div className="flex justify-between"><span>Subtotal</span><span>{money(subtotal)}</span></div>
              <div className="flex justify-between"><span>Insurance pays ({coveragePercentage}%)</span><span>{money(insuranceCoverage)}</span></div>
              <div className="flex justify-between font-semibold border-t pt-1"><span>Patient pays</span><span>{money(patientPayable)}</span></div>
            </div>
          </div>
        </ClaimCard>

        <ListSection title="DIAGNOSES" count={diagnoses.length} open={tablesOpen} emptyText="No diagnoses added..." action={addBtn('Add', 'diagnosis')}>
          <table className="w-full text-sm">
            <thead><tr><TH>#</TH><TH>Diagnosis</TH><TH>ICD10</TH>{isDraft && <TH className="text-center">&nbsp;</TH>}</tr></thead>
            <tbody>
              {diagnoses.map((d, idx) => (
                <tr key={idx} className="border-t border-gray-100">
                  <td className="px-3 py-3 text-gray-500">{idx + 1}.</td>
                  <td className="px-3 py-3 text-gray-700">{d.description}</td>
                  <td className="px-3 py-3 text-gray-700">{d.icd10}</td>
                  {isDraft && <td className="px-3 py-3 text-center"><button type="button" onClick={() => removeDiagnosis(idx)} className="text-red-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </ListSection>

        <ListSection title="SERVICES & PROCEDURES" count={services.length} open={tablesOpen} emptyText="No services added..." action={addBtn('Add', 'service')}>
          <table className="w-full text-sm">
            <thead><tr><TH>#</TH><TH>Description</TH><TH>Date</TH><TH className="text-center">Qty</TH><TH className="text-right">Unit price</TH><TH className="text-right">Total</TH>{isDraft && <TH className="text-center">&nbsp;</TH>}</tr></thead>
            <tbody>
              {services.map((srv, idx) => (
                <tr key={idx} className="border-t border-gray-100">
                  <td className="px-3 py-3 text-gray-500">{idx + 1}.</td>
                  <td className="px-3 py-3 text-gray-700">{srv.description}</td>
                  <td className="px-3 py-3 text-gray-700">{fmtDate(srv.date)}</td>
                  <td className="px-3 py-3 text-center text-gray-700">{srv.quantity}</td>
                  <td className="px-3 py-3 text-right text-gray-700">{money(srv.unitPrice)}</td>
                  <td className="px-3 py-3 text-right text-gray-800 font-medium">{money(srv.quantity * srv.unitPrice)}</td>
                  {isDraft && (
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <button type="button" onClick={() => setEditingService(srv)} className="text-blue-400 hover:text-blue-600 mr-2"><Edit className="w-4 h-4" /></button>
                      <button type="button" onClick={() => removeService(idx)} className="text-red-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </ListSection>

        <ListSection title="MEDICINES" count={medicines.length} open={tablesOpen} emptyText="No medicines added..." action={addBtn('Add', 'medicine')}>
          <table className="w-full text-sm">
            <thead><tr><TH>#</TH><TH>Description</TH><TH>Date</TH><TH className="text-center">Qty</TH><TH className="text-right">Unit price</TH><TH className="text-right">Total</TH>{isDraft && <TH className="text-center">&nbsp;</TH>}</tr></thead>
            <tbody>
              {medicines.map((med, idx) => (
                <tr key={idx} className="border-t border-gray-100">
                  <td className="px-3 py-3 text-gray-500">{idx + 1}.</td>
                  <td className="px-3 py-3 text-gray-700">{med.description}</td>
                  <td className="px-3 py-3 text-gray-700">{fmtDate(med.date)}</td>
                  <td className="px-3 py-3 text-center text-gray-700">{med.quantity}</td>
                  <td className="px-3 py-3 text-right text-gray-700">{money(med.unitPrice)}</td>
                  <td className="px-3 py-3 text-right text-gray-800 font-medium">{money(med.quantity * med.unitPrice)}</td>
                  {isDraft && (
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <button type="button" onClick={() => setEditingMedicine(med)} className="text-blue-400 hover:text-blue-600 mr-2"><Edit className="w-4 h-4" /></button>
                      <button type="button" onClick={() => removeMedicine(idx)} className="text-red-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </ListSection>

        <ClaimCard title="Authorization Codes">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <UField label="Pre-authorization Code(s)" value={preAuthNumber} onChange={setPreAuthNumber} disabled={locked} />
            <UField label="Notes" value={notes} onChange={setNotes} disabled={locked} placeholder="Additional notes…" />
          </div>
        </ClaimCard>

        {isFinalized ? (
          <div className="flex justify-end gap-3 bg-white px-5 py-4 border-t border-gray-200">
            <button type="button" onClick={() => downloadClaimXml(id!)} className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Download className="w-4 h-4" /> Download XML</button>
            <button type="button" onClick={() => printClaim(id!)} className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Printer className="w-4 h-4" /> Print Claim</button>
            <button type="button" onClick={() => navigate('/dashboard/insurance-claims')} className="px-6 py-2 border rounded text-sm" style={{ borderColor: '#ef9a9a', color: '#e57373' }}>Close</button>
          </div>
        ) : (
          <ClaimFooter onCancel={() => navigate('/dashboard/insurance-claims')} onSave={handleSave} saving={isSubmitting} />
        )}
      </ClaimFrame>

      <AddDiagnosisModalPrivate isOpen={activeModal === 'diagnosis'} onClose={() => setActiveModal(null)} onAdd={addDiagnosis} />
      <AddServiceModal isOpen={activeModal === 'service'} onClose={() => setActiveModal(null)} onAdd={addService} />
      <AddMedicineModal isOpen={activeModal === 'medicine'} onClose={() => setActiveModal(null)} onAdd={addMedicine} />
      <EditServiceModal isOpen={!!editingService} onClose={() => setEditingService(null)} onSave={updateService} service={editingService} />
      <EditMedicineModal isOpen={!!editingMedicine} onClose={() => setEditingMedicine(null)} onSave={updateMedicine} medicine={editingMedicine} />
    </>
  );
}