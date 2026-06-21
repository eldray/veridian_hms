// src/pages/insurance-claims/EditCorporateClaim.tsx
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInsuranceStore } from '../../store/insuranceStore';
import { useMedicalServicesStore } from '../../store/medicalServicesStore';
import { useStockStore } from '../../store/stockStore';
import { useToast } from '../../store/toastStore';
import {
  ArrowLeft, Save, Lock, Printer, User, Calendar,
  Activity, CheckCircle, XCircle, Clock, Plus, Search,
  Stethoscope, Building, CreditCard, AlertTriangle, Pill,
  Edit, Trash2 as TrashIcon, Briefcase
} from 'lucide-react';

// ============================================
// TYPES
// ============================================
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
  serviceCatalogId?: string;
}

// ============================================
// AUTO-LOAD HELPERS (from attendance bill)
// ============================================
const toNum = (v: any): number => (v === null || v === undefined ? 0 : parseFloat(v.toString()) || 0);

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
function AddDiagnosisModalCorporate({ isOpen, onClose, onAdd }: any) {
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
          <button onClick={handleAdd} disabled={!selectedDiagnosis} className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg disabled:opacity-50 text-sm font-medium">
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
      // Prefer the corporate tariff, then insurance, then cash.
      const unitPrice =
        selectedService.pricing?.corporatePrice ||
        selectedService.pricing?.insurancePrice ||
        selectedService.pricing?.cashPrice ||
        selectedService.cashPrice ||
        100;
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
                    ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
                    : 'hover:bg-[var(--bg-main)] text-[var(--text-primary)]'
                }`}
              >
                <div className="font-medium text-sm">{s.name}</div>
                <div className="text-xs text-[var(--text-secondary)]">
                  Code: {s.code} | GHS {(s.pricing?.corporatePrice || s.pricing?.cashPrice || s.cashPrice || 100).toFixed(2)}
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-[var(--border-color)] flex gap-2">
          <button onClick={handleAdd} disabled={!selectedService} className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg disabled:opacity-50 text-sm font-medium">
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
// ADD MEDICINE MODAL
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
      const unitPrice = selectedMedicine.sellingPrice || selectedMedicine.costPrice || 0;
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
                  Code: {m.drugCode || m.code} | GHS {(m.sellingPrice || m.costPrice || 0).toFixed(2)}
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
// EDIT LINE ITEM MODAL (shared for service + medicine)
// ============================================
function EditLineItemModal({ isOpen, onClose, onSave, item, title }: any) {
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    if (item) setFormData({ ...item });
  }, [item]);

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
          <h3 className="text-lg font-bold text-[var(--text-primary)]">{title}</h3>
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
          <div className="bg-[var(--icon-cyan-bg)] p-2 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Total:</span>
              <span className="font-bold text-[var(--icon-cyan-text)]">GHS {(formData.quantity * formData.unitPrice).toFixed(2)}</span>
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
export default function EditCorporateClaim() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const isInitialized = useRef(false);

  const {
    currentClaim,
    getInsuranceClaim,
    updateInsuranceClaim,
    finalizeClaim,
    generateClaimPrint,
    isLoading
  } = useInsuranceStore();

  const { getDiagnoses, getServiceCatalog } = useMedicalServicesStore();
  const { getStockItems } = useStockStore();

  // Member details
  const [folderNumber, setFolderNumber] = useState('');
  const [surname, setSurname] = useState('');
  const [otherNames, setOtherNames] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  // Corporate account
  const [corporateAccount, setCorporateAccount] = useState<any>(null);

  // Clinical / financial
  const [diagnoses, setDiagnoses] = useState<DiagnosisItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);
  const [visitDate, setVisitDate] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<any>(null);
  const [editingMedicine, setEditingMedicine] = useState<any>(null);
  const [creditWarning, setCreditWarning] = useState(false);

  const isDraft = currentClaim?.status === 'draft';
  const isFinalized = currentClaim?.status === 'submitted';

  // Available credit on the corporate account
  const availableCredit = corporateAccount
    ? toNum(corporateAccount.creditLimit) - toNum(corporateAccount.currentBalance)
    : 0;

  // Recalculate totals whenever items or discount change
  useEffect(() => {
    const serviceTotal = services.reduce((sum, s) => sum + (s.total || s.quantity * s.unitPrice), 0);
    const medicineTotal = medicines.reduce((sum, m) => sum + (m.total || m.quantity * m.unitPrice), 0);
    const newSubtotal = serviceTotal + medicineTotal;
    setSubtotal(newSubtotal);

    const newDiscount = newSubtotal * (discountPercentage / 100);
    setDiscountAmount(newDiscount);
    setFinalAmount(newSubtotal - newDiscount);
  }, [services, medicines, discountPercentage]);

  // Credit-limit check
  useEffect(() => {
    setCreditWarning(!!corporateAccount && finalAmount > availableCredit);
  }, [corporateAccount, finalAmount, availableCredit]);

  // Load data
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

    const patient = currentClaim.Patient as any;
    const attendance = currentClaim.Attendance as any;
    const account = (currentClaim as any).CorporateAccount;

    // Member details
    setFolderNumber(patient?.folderNumber || '');
    setSurname(patient?.surname || '');
    setOtherNames(patient?.otherNames || '');
    setEmployeeId(attendance?.corporateEmployeeId || '');

    // Corporate account
    if (account) {
      setCorporateAccount(account);
      setDiscountPercentage(account.discountPercentage || 0);
    }

    setVisitDate(attendance?.dateTime?.split('T')[0] || new Date().toISOString().split('T')[0]);
    setNotes(currentClaim.notes || '');

    // Diagnoses from attendance
    const attendanceDiagnoses = attendance?.AttendanceDiagnosis || [];
    setDiagnoses(attendanceDiagnoses.map((d: any) => ({
      id: d.id,
      description: d.Diagnosis?.name || '',
      icd10: d.Diagnosis?.icdCode || '',
      diagnosisId: d.diagnosisId
    })));

    // Services & medicines: prefer saved metadata, else auto-load (priced) from bill
    const metadata = (currentClaim.metadata || {}) as any;

    if (metadata.diagnoses?.length) setDiagnoses(metadata.diagnoses);
    if (typeof metadata.discountPercentage === 'number') setDiscountPercentage(metadata.discountPercentage);

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

  // Handlers
  const addDiagnosis = (d: DiagnosisItem) => setDiagnoses([...diagnoses, d]);
  const removeDiagnosis = (i: number) => setDiagnoses(diagnoses.filter((_, idx) => idx !== i));

  const addService = (s: ServiceItem) => setServices([...services, s]);
  const removeService = (i: number) => setServices(services.filter((_, idx) => idx !== i));
  const updateService = (s: ServiceItem) => setServices(services.map(x => x.id === s.id ? s : x));

  const addMedicine = (m: MedicineItem) => setMedicines([...medicines, m]);
  const removeMedicine = (i: number) => setMedicines(medicines.filter((_, idx) => idx !== i));
  const updateMedicine = (m: MedicineItem) => setMedicines(medicines.map(x => x.id === m.id ? m : x));

  const buildUpdatePayload = () => ({
    diagnosisCodes: diagnoses.map(d => d.icd10).filter(Boolean),
    serviceCodes: services.map(s => s.serviceCatalogId).filter(Boolean),
    medicationCodes: medicines.map(m => m.stockItemId || m.serviceCatalogId).filter(Boolean),
    totalClaimAmount: finalAmount,
    notes,
    metadata: {
      services,
      medicines,
      diagnoses,
      discountPercentage,
      discountAmount,
      subtotal
    }
  });

  const handleSave = async () => {
    if (!isDraft) return;

    if (creditWarning && !window.confirm(
      `This claim (GHS ${finalAmount.toFixed(2)}) exceeds the available credit of GHS ${availableCredit.toFixed(2)}. Continue anyway?`
    )) {
      return;
    }

    try {
      setIsSubmitting(true);
      await updateInsuranceClaim(id!, buildUpdatePayload());
      success('Saved', 'Corporate claim updated successfully');
      await getInsuranceClaim(id!);
    } catch (err: any) {
      toastError('Save Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalize = async () => {
    if (!isDraft) return;
    if (creditWarning && !window.confirm(
      `This claim exceeds the available credit limit. Finalize anyway?`
    )) {
      return;
    }
    try {
      setIsSubmitting(true);
      await updateInsuranceClaim(id!, buildUpdatePayload());
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--icon-cyan-text)]" />
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
            <div className="w-12 h-12 bg-[var(--icon-cyan-bg)] rounded-xl flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-[var(--icon-cyan-text)]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">Edit Corporate Claim</h1>
              <p className="text-sm text-[var(--text-secondary)]">{currentClaim?.claimNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isDraft && (
              <>
                <button onClick={handleSave} disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded-lg hover:bg-[var(--icon-blue-text)] hover:text-white disabled:opacity-50 text-sm">
                  <Save className="w-4 h-4" /> {isSubmitting ? 'Saving...' : 'Save Draft'}
                </button>
                <button onClick={handleFinalize} disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white disabled:opacity-50 text-sm">
                  <Lock className="w-4 h-4" /> Save &amp; Finalize
                </button>
              </>
            )}
            {isFinalized && (
              <button onClick={() => generateClaimPrint(id!)} className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded-lg hover:bg-[var(--icon-blue-text)] hover:text-white text-sm">
                <Printer className="w-4 h-4" /> Print Claim
              </button>
            )}
          </div>
        </div>

        {/* Status Banner */}
        <div className={`p-3 rounded-xl mb-6 ${isDraft ? 'bg-[var(--icon-yellow-bg)] border border-[var(--icon-yellow-text)]' : 'bg-[var(--icon-green-bg)] border border-[var(--icon-green-text)]'}`}>
          <div className="flex items-center gap-3">
            {isDraft ? <Clock className="w-5 h-5 text-[var(--icon-yellow-text)]" /> : <CheckCircle className="w-5 h-5 text-[var(--icon-green-text)]" />}
            <span className="text-sm text-[var(--text-primary)]">
              {isDraft ? 'DRAFT - Review billed services and corporate discount before finalizing' : 'FINALIZED - Ready for corporate billing'}
            </span>
          </div>
        </div>

        {/* Credit Limit Warning */}
        {creditWarning && isDraft && (
          <div className="bg-[var(--icon-red-bg)] border border-[var(--icon-red-text)] rounded-xl p-3 mb-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-[var(--icon-red-text)]" />
              <span className="text-sm text-[var(--icon-red-text)]">
                Warning: This claim (GHS {finalAmount.toFixed(2)}) exceeds the available credit of GHS {availableCredit.toFixed(2)}
                {' '}(Limit GHS {toNum(corporateAccount?.creditLimit).toFixed(2)} − Balance GHS {toNum(corporateAccount?.currentBalance).toFixed(2)}).
              </span>
            </div>
          </div>
        )}

        {/* Member Details */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden mb-6">
          <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
            <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <User className="w-4 h-4 text-[var(--icon-cyan-text)]" /> Member Details
            </h2>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Surname</label>
              <p className="text-sm font-medium text-[var(--text-primary)]">{surname || '—'}</p>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Other Names</label>
              <p className="text-sm text-[var(--text-primary)]">{otherNames || '—'}</p>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Folder No</label>
              <p className="text-sm text-[var(--text-primary)]">{folderNumber || '—'}</p>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Employee ID</label>
              <p className="text-sm text-[var(--text-primary)]">{employeeId || '—'}</p>
            </div>
          </div>
        </div>

        {/* Corporate Account Details */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden mb-6">
          <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
            <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Building className="w-4 h-4 text-[var(--icon-cyan-text)]" /> Corporate Account
            </h2>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Company</label>
              <p className="text-sm font-medium text-[var(--text-primary)]">{corporateAccount?.companyName || '—'}</p>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Credit Limit</label>
              <p className="text-sm text-[var(--text-primary)]">GHS {toNum(corporateAccount?.creditLimit).toFixed(2)}</p>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Available Credit</label>
              <p className={`text-sm font-medium ${availableCredit < finalAmount ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-green-text)]'}`}>
                GHS {availableCredit.toFixed(2)}
              </p>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)] flex items-center gap-1"><Calendar className="w-3 h-3" /> Service Date</label>
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                disabled={!isDraft}
                className="w-full px-3 py-1 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
              />
            </div>
          </div>
        </div>

        {/* Diagnoses */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden mb-6">
          <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)] flex justify-between items-center">
            <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-[var(--icon-cyan-text)]" /> Diagnoses ({diagnoses.length})
            </h2>
            {isDraft && (
              <button onClick={() => setActiveModal('diagnosis')} className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded hover:bg-[var(--icon-cyan-text)] hover:text-white">
                <Plus className="w-3 h-3" /> Add Diagnosis
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">#</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">DESCRIPTION</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">ICD-10</th>
                  {isDraft && <th className="px-3 py-2 text-center text-xs font-medium text-[var(--text-secondary)]">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {diagnoses.length === 0 ? (
                  <tr><td colSpan={isDraft ? 4 : 3} className="px-3 py-8 text-center text-[var(--text-tertiary)]">No diagnoses added</td></tr>
                ) : (
                  diagnoses.map((diag, idx) => (
                    <tr key={idx} className="hover:bg-[var(--bg-main)]">
                      <td className="px-3 py-2 text-[var(--text-secondary)]">{idx + 1}.</td>
                      <td className="px-3 py-2 text-[var(--text-primary)]">{diag.description}</td>
                      <td className="px-3 py-2 font-mono text-xs text-[var(--text-primary)]">{diag.icd10}</td>
                      {isDraft && (
                        <td className="px-3 py-2 text-center">
                          <button onClick={() => removeDiagnosis(idx)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Services & Procedures */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden mb-6">
          <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)] flex justify-between items-center">
            <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[var(--icon-cyan-text)]" /> Services &amp; Procedures ({services.length})
            </h2>
            {isDraft && (
              <button onClick={() => setActiveModal('service')} className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded hover:bg-[var(--icon-cyan-text)] hover:text-white">
                <Plus className="w-3 h-3" /> Add Service
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">#</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">SERVICE</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-[var(--text-secondary)]">QTY</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-[var(--text-secondary)]">UNIT PRICE</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-[var(--text-secondary)]">TOTAL</th>
                  {isDraft && <th className="px-3 py-2 text-center text-xs font-medium text-[var(--text-secondary)]">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {services.length === 0 ? (
                  <tr><td colSpan={isDraft ? 6 : 5} className="px-3 py-8 text-center text-[var(--text-tertiary)]">No services added</td></tr>
                ) : (
                  services.map((srv, idx) => (
                    <tr key={idx} className="hover:bg-[var(--bg-main)]">
                      <td className="px-3 py-2 text-[var(--text-secondary)]">{idx + 1}.</td>
                      <td className="px-3 py-2 text-[var(--text-primary)]">{srv.description}</td>
                      <td className="px-3 py-2 text-center text-[var(--text-primary)]">{srv.quantity}</td>
                      <td className="px-3 py-2 text-right text-[var(--text-primary)]">GHS {srv.unitPrice.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-medium text-[var(--text-primary)]">GHS {(srv.quantity * srv.unitPrice).toFixed(2)}</td>
                      {isDraft && (
                        <td className="px-3 py-2 text-center">
                          <div className="flex justify-center gap-1">
                            <button onClick={() => setEditingService(srv)} className="text-blue-500 hover:text-blue-700"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => removeService(idx)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button>
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

        {/* Medicines */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden mb-6">
          <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)] flex justify-between items-center">
            <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Pill className="w-4 h-4 text-[var(--icon-cyan-text)]" /> Medicines ({medicines.length})
            </h2>
            {isDraft && (
              <button onClick={() => setActiveModal('medicine')} className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded hover:bg-[var(--icon-green-text)] hover:text-white">
                <Plus className="w-3 h-3" /> Add Medicine
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">#</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">MEDICATION</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-[var(--text-secondary)]">QTY</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-[var(--text-secondary)]">UNIT PRICE</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-[var(--text-secondary)]">TOTAL</th>
                  {isDraft && <th className="px-3 py-2 text-center text-xs font-medium text-[var(--text-secondary)]">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {medicines.length === 0 ? (
                  <tr><td colSpan={isDraft ? 6 : 5} className="px-3 py-8 text-center text-[var(--text-tertiary)]">No medicines added</td></tr>
                ) : (
                  medicines.map((med, idx) => (
                    <tr key={idx} className="hover:bg-[var(--bg-main)]">
                      <td className="px-3 py-2 text-[var(--text-secondary)]">{idx + 1}.</td>
                      <td className="px-3 py-2 text-[var(--text-primary)]">{med.description}</td>
                      <td className="px-3 py-2 text-center text-[var(--text-primary)]">{med.quantity}</td>
                      <td className="px-3 py-2 text-right text-[var(--text-primary)]">GHS {med.unitPrice.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-medium text-[var(--text-primary)]">GHS {(med.quantity * med.unitPrice).toFixed(2)}</td>
                      {isDraft && (
                        <td className="px-3 py-2 text-center">
                          <div className="flex justify-center gap-1">
                            <button onClick={() => setEditingMedicine(med)} className="text-blue-500 hover:text-blue-700"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => removeMedicine(idx)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button>
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

        {/* Financial Summary with Corporate Discount */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden mb-6">
          <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
            <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[var(--icon-cyan-text)]" /> Financial Summary
            </h2>
          </div>
          <div className="p-4 space-y-2">
            <div className="flex justify-between py-2">
              <span className="text-[var(--text-secondary)]">Subtotal:</span>
              <span className="font-medium text-[var(--text-primary)]">GHS {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 items-center">
              <span className="text-[var(--text-secondary)]">Corporate Discount:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercentage}
                  onChange={(e) => setDiscountPercentage(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  disabled={!isDraft}
                  className="w-20 px-2 py-1 border border-[var(--border-color)] rounded text-right bg-[var(--bg-main)] text-[var(--text-primary)]"
                />
                <span className="text-[var(--text-secondary)]">%</span>
              </div>
            </div>
            <div className="flex justify-between py-2 border-t border-[var(--border-color)]">
              <span className="text-[var(--text-secondary)]">Discount Amount:</span>
              <span className="text-[var(--icon-green-text)]">- GHS {discountAmount.toFixed(2)}</span>
            </div>
            <div className={`flex justify-between py-2 border-t border-b border-[var(--border-color)] p-3 rounded-lg ${creditWarning ? 'bg-[var(--icon-red-bg)]' : 'bg-[var(--icon-cyan-bg)]'}`}>
              <span className="font-bold text-[var(--text-primary)]">Total Corporate Bill:</span>
              <span className={`font-bold ${creditWarning ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-cyan-text)]'}`}>
                GHS {finalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
          <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)]">
            <h2 className="font-semibold text-[var(--text-primary)]">Notes</h2>
          </div>
          <div className="p-4">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!isDraft}
              rows={3}
              className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] resize-none"
              placeholder="Additional notes..."
            />

            {isDraft && (
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border-color)]">
                <button onClick={() => navigate('/dashboard/insurance-claims')} className="px-4 py-2 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-main)]">Cancel</button>
                <button onClick={handleSave} disabled={isSubmitting} className="px-6 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> {isSubmitting ? 'Saving...' : 'SAVE'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        <AddDiagnosisModalCorporate
          isOpen={activeModal === 'diagnosis'}
          onClose={() => setActiveModal(null)}
          onAdd={addDiagnosis}
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
        <EditLineItemModal
          isOpen={!!editingService}
          onClose={() => setEditingService(null)}
          onSave={updateService}
          item={editingService}
          title="Edit Service"
        />
        <EditLineItemModal
          isOpen={!!editingMedicine}
          onClose={() => setEditingMedicine(null)}
          onSave={updateMedicine}
          item={editingMedicine}
          title="Edit Medicine"
        />
      </div>
    </div>
  );
}
