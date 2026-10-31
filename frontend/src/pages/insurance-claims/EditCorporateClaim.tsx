// src/pages/insurance-claims/EditCorporateClaim.tsx
import { useEffect, useState, useRef } from 'react';
import { confirmDialog } from '../../context/ConfirmDialog';
import { useParams, useNavigate } from 'react-router-dom';
import { useInsuranceStore } from '../../store/insuranceStore';
import { useMedicalServicesStore } from '../../store/medicalServicesStore';
import { useStockStore } from '../../store/stockStore';
import { capPickerRows, PickerRowsHint, MAX_PICKER_ROWS } from '../../components/reusable/PickerLimit';
import { useToast } from '../../store/toastStore';
import { ClaimFrame, ClaimCard, UField, ListSection, TH, ClaimFooter, fmtDate } from '../../components/claims/ClaimUI';
import { Printer, XCircle, Plus, Search, Edit, Trash2 } from 'lucide-react';

interface DiagnosisItem {
  id?: string;
  description: string;
  icd10: string;
  diagnosisId?: string;
}

interface ServiceItem {
  id?: string;
  billLineItemId?: string | null;
  description: string;
  date: string;
  serviceCatalogId?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface MedicineItem {
  id?: string;
  billLineItemId?: string | null;
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
        billLineItemId: li.id,
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
    (li: any) => !li.isVoided && li.serviceType === 'medication',
  );
  if (lineItems.length) {
    return lineItems.map((li: any) => {
      const quantity = li.quantity || 1;
      const unitPrice = toNum(li.unitPrice);
      return {
        id: li.id,
        billLineItemId: li.id,
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

function AddDiagnosisModalCorporate({ isOpen, onClose, onAdd }: any) {
  const { diagnoses, getDiagnoses } = useMedicalServicesStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => { if (isOpen) getDiagnoses(); }, [isOpen, getDiagnoses]);

  const filtered = diagnoses.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.icdCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    if (!selected) return;
    onAdd({ description: selected.name, icd10: selected.icdCode, diagnosisId: selected.id });
    setSelected(null);
    setSearchTerm('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl max-w-md w-full border border-[var(--border-color)]">
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Add Diagnosis</h3>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-main)] rounded-lg"><XCircle className="w-5 h-5 text-[var(--text-secondary)]" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input type="text" placeholder="Search by diagnosis name or ICD-10 code..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm" />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            <PickerRowsHint shown={Math.min(filtered.length, MAX_PICKER_ROWS)} total={filtered.length} />
            {capPickerRows(filtered).map((d) => (
              <button key={d.id} onClick={() => setSelected(d)} className={`w-full text-left p-2 rounded-lg transition-colors ${selected?.id === d.id ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' : 'hover:bg-[var(--bg-main)] text-[var(--text-primary)]'}`}>
                <div className="font-medium text-sm">{d.name}</div>
                <div className="text-xs text-[var(--text-secondary)]">ICD-10: {d.icdCode}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-[var(--border-color)] flex gap-2">
          <button onClick={handleAdd} disabled={!selected} className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg disabled:opacity-50 text-sm font-medium">Add Diagnosis</button>
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function AddServiceModal({ isOpen, onClose, onAdd }: any) {
  const { serviceCatalog, getServiceCatalog } = useMedicalServicesStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { if (isOpen) getServiceCatalog({ isActive: true }); }, [isOpen, getServiceCatalog]);

  const filtered = (serviceCatalog || []).filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    if (!selected) return;
    const unitPrice = selected.pricing?.corporatePrice || selected.pricing?.insurancePrice || selected.pricing?.cashPrice || 100;
    onAdd({ description: selected.name, date: serviceDate, serviceCatalogId: selected.id, quantity, unitPrice, total: quantity * unitPrice });
    setSelected(null);
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
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-main)] rounded-lg"><XCircle className="w-5 h-5 text-[var(--text-secondary)]" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input type="text" placeholder="Search service..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm" />
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
            <PickerRowsHint shown={Math.min(filtered.length, MAX_PICKER_ROWS)} total={filtered.length} />
            {capPickerRows(filtered).map((s) => (
              <button key={s.id} onClick={() => setSelected(s)} className={`w-full text-left p-2 rounded-lg transition-colors ${selected?.id === s.id ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' : 'hover:bg-[var(--bg-main)] text-[var(--text-primary)]'}`}>
                <div className="font-medium text-sm">{s.name}</div>
                <div className="text-xs text-[var(--text-secondary)]">Code: {s.code} | GHS {(s.pricing?.corporatePrice || s.pricing?.cashPrice || 100).toFixed(2)}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-[var(--border-color)] flex gap-2">
          <button onClick={handleAdd} disabled={!selected} className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg disabled:opacity-50 text-sm font-medium">Add Service</button>
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function AddMedicineModal({ isOpen, onClose, onAdd }: any) {
  const { stockItems, getStockItems } = useStockStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [medicineDate, setMedicineDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { if (isOpen) getStockItems({ isActive: true, isMedication: true }); }, [isOpen, getStockItems]);

  const filtered = (stockItems || []).filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.drugCode || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    if (!selected) return;
    const unitPrice = selected.sellingPrice || selected.costPrice || 0;
    onAdd({ description: selected.name, date: medicineDate, stockItemId: selected.id, quantity, unitPrice, total: quantity * unitPrice });
    setSelected(null);
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
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-main)] rounded-lg"><XCircle className="w-5 h-5 text-[var(--text-secondary)]" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input type="text" placeholder="Search medicine by name or drug code..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm" />
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
            <PickerRowsHint shown={Math.min(filtered.length, MAX_PICKER_ROWS)} total={filtered.length} />
            {capPickerRows(filtered).map((m) => (
              <button key={m.id} onClick={() => setSelected(m)} className={`w-full text-left p-2 rounded-lg transition-colors ${selected?.id === m.id ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]' : 'hover:bg-[var(--bg-main)] text-[var(--text-primary)]'}`}>
                <div className="font-medium text-sm">{m.name}</div>
                <div className="text-xs text-[var(--text-secondary)]">Code: {m.drugCode || m.code} | GHS {(m.sellingPrice || m.costPrice || 0).toFixed(2)}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-[var(--border-color)] flex gap-2">
          <button onClick={handleAdd} disabled={!selected} className="flex-1 px-4 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg disabled:opacity-50 text-sm font-medium">Add Medicine</button>
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function EditLineItemModal({ isOpen, onClose, onSave, item, title }: any) {
  const [formData, setFormData] = useState<any>(null);
  useEffect(() => { if (item) setFormData({ ...item }); }, [item]);

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
          <h3 className="text-lg font-bold text-[var(--text-primary)]">{title}</h3>
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
          <div className="bg-[var(--icon-cyan-bg)] p-2 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Total:</span>
              <span className="font-bold text-[var(--icon-cyan-text)]">GHS {(formData.quantity * formData.unitPrice).toFixed(2)}</span>
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

export default function EditCorporateClaim() {
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
    printClaim,
    isLoading,
  } = useInsuranceStore();

  const { getDiagnoses, getServiceCatalog } = useMedicalServicesStore();
  const { getStockItems } = useStockStore();

  const [folderNumber, setFolderNumber] = useState('');
  const [surname, setSurname] = useState('');
  const [otherNames, setOtherNames] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [corporateAccount, setCorporateAccount] = useState<any>(null);

  const [diagnoses, setDiagnoses] = useState<DiagnosisItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);
  const [visitDate, setVisitDate] = useState('');
  const [notes, setNotes] = useState('');
  const [preAuthNumber, setPreAuthNumber] = useState('');
  const [tablesOpen, setTablesOpen] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<any>(null);
  const [editingMedicine, setEditingMedicine] = useState<any>(null);
  const [creditWarning, setCreditWarning] = useState(false);

  const isDraft = currentClaim?.status === 'draft';
  const isFinalized = currentClaim?.status === 'finalized';

  const availableCredit = corporateAccount
    ? toNum(corporateAccount.creditLimit) - toNum(corporateAccount.currentBalance)
    : 0;

  useEffect(() => {
    const serviceTotal = services.reduce((s, x) => s + (x.total || x.quantity * x.unitPrice), 0);
    const medicineTotal = medicines.reduce((s, x) => s + (x.total || x.quantity * x.unitPrice), 0);
    const newSubtotal = serviceTotal + medicineTotal;
    setSubtotal(newSubtotal);
    const d = newSubtotal * (discountPercentage / 100);
    setDiscountAmount(d);
    setFinalAmount(newSubtotal - d);
  }, [services, medicines, discountPercentage]);

  useEffect(() => {
    setCreditWarning(!!corporateAccount && finalAmount > availableCredit);
  }, [corporateAccount, finalAmount, availableCredit]);

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
    const account = currentClaim.CorporateAccount ?? currentClaim.corporateAccount ?? null;
    const meta = (currentClaim.metadata || {}) as any;

    setFolderNumber(patient?.folderNumber || '');
    setSurname(patient?.surname || '');
    setOtherNames(patient?.otherNames || '');
    setEmployeeId(attendance?.corporateEmployeeId || '');

    if (account) {
      setCorporateAccount(account);
      setDiscountPercentage(account.discountPercentage || 0);
    }

    setVisitDate(meta.visitDate || attendance?.dateTime?.split?.('T')?.[0] || new Date().toISOString().split('T')[0]);
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
        billLineItemId: s.billLineItemId ?? null,
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
        billLineItemId: m.billLineItemId ?? null,
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
        billLineItemId: s.billLineItemId ?? null,
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
        billLineItemId: m.billLineItemId ?? null,
      });
    }
    return out;
  };

  const handleSave = async () => {
    if (!isDraft) return;
    if (creditWarning && !(await confirmDialog({
      title: 'Credit limit exceeded',
      message: `This claim (GHS ${finalAmount.toFixed(2)}) exceeds the available credit of GHS ${availableCredit.toFixed(2)}. Continue anyway?`,
      confirmText: 'Continue',
      type: 'warning',
    }))) return;

    try {
      setIsSubmitting(true);
      await updateClaimDraft(id!, {
        notes,
        preAuthNumber,
        metadata: { discountPercentage, visitDate },
      });
      const items = buildItemsPayload();
      if (items.length > 0) await replaceClaimItems(id!, items);
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
    if (creditWarning && !(await confirmDialog({ title: 'Credit limit exceeded', message: 'This claim exceeds the available credit limit. Finalize anyway?', confirmText: 'Finalize', type: 'warning' }))) return;
    try {
      setIsSubmitting(true);
      await handleSave();
      await finalizeClaim(id!);
      success('Finalized', 'Claim is ready for submission');
      navigate('/dashboard/insurance/corporate/claims');
    } catch (err: any) {
      toastError('Finalize Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintClaim = async () => {
    try {
      await printClaim(id!);
      success('Print ready', 'Claim data ready for printing');
    } catch (err: any) {
      toastError('Print failed', err?.response?.data?.message || err?.message || 'Could not open claim print view');
    }
  };
  if (isLoading && !currentClaim) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--icon-cyan-text)]" />
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
        subtitle={`${currentClaim?.claimNumber ?? ''} · Corporate`}
        status={<span className={`text-xs px-2 py-1 rounded mr-1 ${isDraft ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{isDraft ? 'DRAFT' : 'FINALIZED'}</span>}
        onClose={() => navigate('/dashboard/insurance/corporate/claims')}
        onCollapse={() => setTablesOpen(o => !o)}
        onFinalize={isDraft ? handleFinalize : undefined}
        finalizing={isSubmitting}
      >
        {creditWarning && isDraft && (
          <div className="bg-red-50 border border-red-300 text-red-700 text-sm px-4 py-3">
            Warning: this claim ({money(finalAmount)}) exceeds the available credit of {money(availableCredit)}
            {' '}(limit {money(toNum(corporateAccount?.creditLimit))} − balance {money(toNum(corporateAccount?.currentBalance))}).
          </div>
        )}

        <ClaimCard title="Member Details">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
            <UField label="Company" value={corporateAccount?.companyName || ''} />
            <UField label="Employee ID" value={employeeId} />
            <UField label="Folder No." value={folderNumber} />
            <UField label="Surname" value={surname} />
            <UField label="Other Names" value={otherNames} />
            <UField label="Gender" value={(patient?.gender || '').toUpperCase()} />
            <UField label="Date of Birth" value={dobStr} icon="calendar" hint={ageStr} />
            <UField label="Date of Service" type="date" value={visitDate} onChange={setVisitDate} disabled={locked} />
          </div>
        </ClaimCard>

        <ClaimCard title="Corporate Account">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
            <UField label="Credit Limit" value={money(toNum(corporateAccount?.creditLimit))} />
            <UField label="Current Balance" value={money(toNum(corporateAccount?.currentBalance))} />
            <UField label="Available Credit" value={money(availableCredit)} hint={availableCredit < finalAmount ? 'Below this claim total' : undefined} />
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
                  {isDraft && <td className="px-3 py-3 text-center"><button type="button" onClick={() => removeDiagnosis(idx)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></td>}
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
                      <button type="button" onClick={() => removeService(idx)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
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
                      <button type="button" onClick={() => removeMedicine(idx)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </ListSection>

        <ClaimCard title="Financial Summary">
          <div className="max-w-md ml-auto text-[15px] text-gray-700 space-y-2">
            <div className="flex justify-between"><span>Subtotal</span><span>{money(subtotal)}</span></div>
            <div className="flex justify-between items-center">
              <span>Corporate discount</span>
              <span className="flex items-center gap-1">
                <input type="number" min={0} max={100} value={discountPercentage} disabled={locked} onChange={e => setDiscountPercentage(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))} className="w-16 text-right border-b border-dotted border-gray-400 bg-transparent focus:outline-none" />%
              </span>
            </div>
            <div className="flex justify-between"><span>Discount amount</span><span>- {money(discountAmount)}</span></div>
            <div className={`flex justify-between font-semibold border-t pt-2 ${creditWarning ? 'text-red-600' : ''}`}><span>Total corporate bill</span><span>{money(finalAmount)}</span></div>
          </div>
        </ClaimCard>

        <ClaimCard title="Authorization Codes">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <UField label="Pre-authorization Code(s)" value={preAuthNumber} onChange={setPreAuthNumber} disabled={locked} />
            <UField label="Notes" value={notes} onChange={setNotes} disabled={locked} placeholder="Additional notes…" />
          </div>
        </ClaimCard>

        {isFinalized ? (
          <div className="flex justify-end gap-3 bg-white px-5 py-4 border-t border-gray-200">
            <button type="button" onClick={handlePrintClaim} className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Printer className="w-4 h-4" /> Print Claim</button>
            <button type="button" onClick={() => navigate('/dashboard/insurance/corporate/claims')} className="px-6 py-2 border rounded text-sm" style={{ borderColor: '#ef9a9a', color: '#e57373' }}>Close</button>
          </div>
        ) : (
          <ClaimFooter onCancel={() => navigate('/dashboard/insurance/corporate/claims')} onSave={handleSave} saving={isSubmitting} />
        )}
      </ClaimFrame>

      <AddDiagnosisModalCorporate isOpen={activeModal === 'diagnosis'} onClose={() => setActiveModal(null)} onAdd={addDiagnosis} />
      <AddServiceModal isOpen={activeModal === 'service'} onClose={() => setActiveModal(null)} onAdd={addService} />
      <AddMedicineModal isOpen={activeModal === 'medicine'} onClose={() => setActiveModal(null)} onAdd={addMedicine} />
      <EditLineItemModal isOpen={!!editingService} onClose={() => setEditingService(null)} onSave={updateService} item={editingService} title="Edit Service" />
      <EditLineItemModal isOpen={!!editingMedicine} onClose={() => setEditingMedicine(null)} onSave={updateMedicine} item={editingMedicine} title="Edit Medicine" />
    </>
  );
}