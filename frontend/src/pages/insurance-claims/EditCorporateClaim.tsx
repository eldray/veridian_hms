// src/pages/insurance-claims/EditCorporateClaim.tsx
import { useEffect, useState, useRef } from 'react';
import { confirmDialog } from '../../context/ConfirmDialog';
import { useParams, useNavigate } from 'react-router-dom';
import { useSmartBack } from '../../utils/useSmartBack';
import { useInsuranceStore } from '../../store/insuranceStore';
import { useMedicalServicesStore } from '../../store/medicalServicesStore';
import { useStockStore } from '../../store/stockStore';
import { capPickerRows, PickerRowsHint, MAX_PICKER_ROWS } from '../../components/reusable/PickerLimit';
import { useToast } from '../../store/toastStore';
import { ClaimFrame, ClaimCard, UField, ListSection, TH, ClaimFooter, Hint, fmtDate } from '../../components/claims/ClaimUI';
import { payerUnitPrice, priceLabel, medicationCatalogByStockItemId } from '../../utils/pricing';
import { EMPTY_PRESCRIPTION, PrescriptionFields, formatPrescriptionDetails, parsePrescriptionDetails, type PrescriptionDetails } from '../../components/claims/ClaimPrescriptionFields';
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
  drugCode?: string;
  medicationId?: string;
  serviceCatalogId?: string;
  prescriptionText?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  route?: string;
  instructions?: string;
  quantityUnit?: string;
}

const p = (claim: any): any => claim?.patient ?? claim?.Patient ?? {};
const a = (claim: any): any => claim?.attendance ?? claim?.Attendance ?? {};
const billOf = (claim: any): any => claim?.bill ?? claim?.Bill ?? {};

const toNum = (v: any): number => (v === null || v === undefined ? 0 : parseFloat(v.toString()) || 0);

function buildServicesFromBill(bill: any): ServiceItem[] {
  const lineItems = bill?.billLineItem ?? bill?.BillLineItem ?? [];
  return lineItems
    .filter((li: any) => !li.isVoided && li.serviceType !== 'medication' && li.serviceType !== 'diagnosis')
    .map((li: any) => {
      const quantity = li.quantity || 1;
      const unitPrice = toNum(li.unitPrice);
      return {
        id: li.id,
        billLineItemId: li.id,
        itemCategory: li.serviceType === 'procedure' ? 'procedure' : ['lab_test', 'scan', 'investigation'].includes(String(li.serviceType || li.serviceCatalog?.serviceType || '')) ? 'investigation' : 'service',
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
        stockItemId: li.serviceCatalog?.stockItemId,
        serviceCatalogId: li.serviceCatalogId,
        prescriptionText: li.prescriptionText || '',
      } as MedicineItem;
    });
  }
  const meds = attendance?.medication ?? attendance?.Medication ?? [];
  return meds.map((m: any) => {
    const quantity = m.quantity || 1;
    const catalog = m.ServiceCatalog ?? m.serviceCatalog;
    // A dispensed medicine already carries its batch cost; a prescribed one is quoted at the
    // corporate tariff of its catalog entry, which is the price billing would have charged.
    const unitPrice = toNum(m.dispensedUnitCost ?? payerUnitPrice(catalog, 'corporate'));
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
      serviceCatalogId: catalog?.id,
      prescriptionText: [m.dosage && 'Dose: ' + m.dosage, m.frequency && 'Frequency: ' + m.frequency, m.duration && 'Duration: ' + m.duration, m.route && 'Route: ' + m.route, m.instructions && 'Instructions: ' + m.instructions].filter(Boolean).join(' · '),
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

function AddServiceModal({ isOpen, onClose, onAdd, itemCategory = 'service' }: any) {
  const { serviceCatalog, getServiceCatalog } = useMedicalServicesStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { if (isOpen) getServiceCatalog({ isActive: true }); }, [isOpen, getServiceCatalog]);

  const allowedTypes = itemCategory === 'procedure' ? ['procedure'] : itemCategory === 'investigation' ? ['lab_test', 'scan'] : ['consultation'];
  const filtered = (serviceCatalog || []).filter(s =>
    allowedTypes.includes(String(s.serviceType || '').toLowerCase()) &&
    (s.name.toLowerCase().includes(searchTerm.toLowerCase()) || String(s.nhisServiceCode || s.code || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAdd = () => {
    if (!selected) return;
    const unitPrice = payerUnitPrice(selected, 'corporate');
    onAdd({ id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, itemCategory, description: selected.name, date: serviceDate, serviceCatalogId: selected.id, quantity, unitPrice, total: quantity * unitPrice });
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
          <h3 className="text-lg font-bold text-[var(--text-primary)]">{itemCategory === 'procedure' ? 'Add Procedure' : itemCategory === 'investigation' ? 'Add Laboratory / Imaging' : 'Add Consultation / Service'}</h3>
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
                <div className="text-xs text-[var(--text-secondary)]">Code: {s.nhisServiceCode || s.code} | {priceLabel(payerUnitPrice(s, 'corporate'))}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-[var(--border-color)] flex gap-2">
          <button onClick={handleAdd} disabled={!selected} className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg disabled:opacity-50 text-sm font-medium">{itemCategory === 'procedure' ? 'Add Procedure' : itemCategory === 'investigation' ? 'Add Lab / Scan' : 'Add Consultation'}</button>
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function AddMedicineModal({ isOpen, onClose, onAdd, editing = null }: any) {
  const { stockItems, getStockItems } = useStockStore();
  const { serviceCatalog } = useMedicalServicesStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [medicineDate, setMedicineDate] = useState(new Date().toISOString().split('T')[0]);
  const [prescription, setPrescription] = useState<PrescriptionDetails>({ ...EMPTY_PRESCRIPTION });
  useEffect(() => { if (isOpen) getStockItems({ isActive: true, isMedication: true }); }, [isOpen, getStockItems]);
  useEffect(() => {
    if (!isOpen) return;
    setSearchTerm(''); setSelectedMedicine(null); setQuantity(editing?.quantity || 1);
    setMedicineDate(editing?.date || new Date().toISOString().split('T')[0]);
    const parsed = parsePrescriptionDetails(editing?.prescriptionText);
    setPrescription(editing ? { ...parsed, dosage: editing.dosage || parsed.dosage, frequency: editing.frequency || parsed.frequency, duration: editing.duration || parsed.duration, route: editing.route || parsed.route || 'oral', instructions: editing.instructions || parsed.instructions, quantityUnit: editing.quantityUnit || parsed.quantityUnit } : { ...EMPTY_PRESCRIPTION });
  }, [isOpen, editing]);
  const catalogsByStock = medicationCatalogByStockItemId(serviceCatalog);
  const filtered = (stockItems || []).filter(m => m.name?.toLowerCase().includes(searchTerm.toLowerCase()) || (m.drugCode || '').toLowerCase().includes(searchTerm.toLowerCase()) || (m.strength || '').toLowerCase().includes(searchTerm.toLowerCase()));
  const selected = selectedMedicine || (editing ? (stockItems || []).find(m => m.id === editing.stockItemId || m.name?.toLowerCase() === editing.description?.toLowerCase()) || null : null);
  const handleAdd = () => {
    if (!selected) return;
    const catalog = catalogsByStock.get(selected.id);
    const unitPrice = editing?.unitPrice ?? payerUnitPrice(catalog, 'corporate');
    onAdd({ id: editing?.id, billLineItemId: editing?.billLineItemId, medicationId: selected.id === editing?.stockItemId ? editing?.medicationId : undefined, description: selected.name, date: medicineDate, stockItemId: selected.id, drugCode: selected.drugCode || selected.code || editing?.drugCode, serviceCatalogId: catalog?.id || editing?.serviceCatalogId, quantity, unitPrice, total: quantity * unitPrice, ...prescription, quantityUnit: selected.unitOfMeasure || editing?.quantityUnit || prescription.quantityUnit, prescriptionText: formatPrescriptionDetails({ ...prescription, quantityUnit: selected.unitOfMeasure || editing?.quantityUnit || prescription.quantityUnit }) || editing?.prescriptionText || '' });
    setSelectedMedicine(null); setSearchTerm(''); setQuantity(1); setPrescription({ ...EMPTY_PRESCRIPTION }); onClose();
  };
  if (!isOpen) return null;
  return <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
    <div className="bg-[var(--bg-card)] rounded-xl max-w-xl w-full border border-[var(--border-color)] max-h-[90vh] flex flex-col">
      <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between"><h3 className="text-sm font-bold text-[var(--text-primary)]">{editing ? 'Edit Prescription' : 'Add Prescription'}</h3><button type="button" onClick={onClose} className="p-1 hover:bg-[var(--bg-main)] rounded-lg"><XCircle className="w-5 h-5 text-[var(--text-secondary)]" /></button></div>
      <div className="p-4 space-y-4 overflow-y-auto">
        <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" /><input type="text" placeholder="Search medication by name, code or strength…" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setSelectedMedicine(null); }} className="w-full pl-10 pr-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm" /></div>
        {searchTerm.trim() && <div className="max-h-40 overflow-y-auto rounded-lg border border-[var(--border-color)]"><PickerRowsHint shown={Math.min(filtered.length, MAX_PICKER_ROWS)} total={filtered.length} />{capPickerRows(filtered).map(m => <button type="button" key={m.id} onClick={() => setSelectedMedicine(m)} className={'w-full text-left p-2 border-b border-[var(--border-color)] last:border-0 ' + (selected?.id === m.id ? 'bg-[var(--icon-green-bg)]' : 'hover:bg-[var(--bg-main)]')}><div className="text-sm font-medium text-[var(--text-primary)]">{m.name} {m.strength || ''}</div><div className="text-xs text-[var(--text-secondary)]">Code: {m.drugCode} · {priceLabel(payerUnitPrice(catalogsByStock.get(m.id), 'corporate'))}</div></button>)}{!filtered.length && <p className="p-3 text-xs text-[var(--text-tertiary)]">No matching medication found.</p>}</div>}
        {selected && <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] p-3"><div className="text-sm font-semibold text-[var(--text-primary)]">{selected.name} {selected.strength || ''}</div><div className="text-xs text-[var(--text-secondary)]">{selected.drugCode || selected.code} · {priceLabel(payerUnitPrice(catalogsByStock.get(selected.id), 'corporate'))}</div></div>}
        <div className="grid grid-cols-2 gap-3"><label className="text-xs font-medium text-[var(--text-secondary)]">Quantity{selected?.unitOfMeasure ? ` (${selected.unitOfMeasure})` : editing?.quantityUnit ? ` (${editing.quantityUnit})` : ''}<input type="number" min="1" value={quantity} onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="mt-1 w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm" /></label><label className="text-xs font-medium text-[var(--text-secondary)]">Date<input type="date" value={medicineDate} onChange={e => setMedicineDate(e.target.value)} className="mt-1 w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm" /></label></div>
        <PrescriptionFields value={prescription} onChange={setPrescription} strength={selected?.strength} />
      </div>
      <div className="p-4 border-t border-[var(--border-color)] flex gap-2"><button type="button" onClick={handleAdd} disabled={!selected} className="flex-1 px-4 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg disabled:opacity-50 text-sm font-medium">{editing ? 'Save Prescription' : 'Add Prescription'}</button><button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm">Cancel</button></div>
    </div></div>;
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
  const goBack = useSmartBack('/dashboard/insurance/corporate/claims');
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
  const [isEditMode, setIsEditMode] = useState(false);
  const canEditClaim = isDraft && isEditMode;

  const handleRefreshClaim = async () => {
    if (isDraft) {
      const confirmed = await confirmDialog({
        title: 'Refresh claim form?',
        message: 'Any unsaved changes to this draft will be lost. Refresh the form and reload the saved claim?',
        confirmText: 'Refresh',
        type: 'warning',
      });
      if (!confirmed) return;
    }
    navigate(0);
  };
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
    const serviceServer = serverItems.filter((i: any) => ['service', 'procedure', 'investigation'].includes(i.itemCategory));
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
        itemCategory: s.itemCategory || 'service',
        billLineItemId: s.billLineItemId ?? null,
        description: s.description,
        date: s.serviceDate ? String(s.serviceDate).split('T')[0] : '',
        serviceCatalogId: s.serviceCatalogId,
        quantity: s.quantity,
        unitPrice: toNum(s.unitPrice),
        total: toNum(s.lineTotal),
      })));
    } else if (meta.services?.length) {
      setServices(meta.services.map((item: any) => ({ ...item, itemCategory: item.itemCategory || 'service' })));
    } else {
      setServices(buildServicesFromBill(billOf(currentClaim)));
    }

    if (medServer.length) {
      const attendanceMedicines = attendance?.medication ?? attendance?.Medication ?? [];
      setMedicines(medServer.map((m: any) => {
        const linkedMedication = attendanceMedicines.find((row: any) => row.id === m.medicationId);
        const snapshot = m.prescriptionSnapshot ?? {};
        const prescriptionText = m.prescriptionText
          || [linkedMedication?.dosage && 'Dose: ' + linkedMedication.dosage, linkedMedication?.frequency && 'Frequency: ' + linkedMedication.frequency, linkedMedication?.duration && 'Duration: ' + linkedMedication.duration].filter(Boolean).join(' · ')
          || [snapshot.dosageText && 'Dose: ' + snapshot.dosageText, snapshot.frequencyText && 'Frequency: ' + snapshot.frequencyText, snapshot.durationText && 'Duration: ' + snapshot.durationText].filter(Boolean).join(' · ');
        return {
          id: m.id,
          billLineItemId: m.billLineItemId ?? null,
          medicationId: m.medicationId ?? linkedMedication?.id,
          description: m.description,
          quantity: m.quantity,
          unitPrice: toNum(m.unitPrice),
          total: toNum(m.lineTotal),
          date: m.serviceDate ? String(m.serviceDate).split('T')[0] : '',
          stockItemId: linkedMedication?.stockItemId ?? snapshot.stockItemId ?? m.serviceCatalog?.stockItemId,
          drugCode: m.code || linkedMedication?.StockItem?.drugCode || '',
          serviceCatalogId: m.serviceCatalogId,
          dosage: snapshot.dosageText ?? linkedMedication?.dosage,
          frequency: snapshot.frequencyText ?? linkedMedication?.frequency,
          duration: snapshot.durationText ?? linkedMedication?.duration,
          route: snapshot.route ?? linkedMedication?.route,
          instructions: snapshot.instructions ?? linkedMedication?.instructions,
          quantityUnit: snapshot.quantityUnit ?? linkedMedication?.quantityUnit ?? linkedMedication?.StockItem?.unitOfMeasure ?? '',
          prescriptionText,
        };
      }));
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
  const updateService = (s: ServiceItem) => { setServices((current) => { const index = current.findIndex((item) => editingService?.id ? item.id === editingService.id : item === editingService); return index < 0 ? current : current.map((item, i) => i === index ? { ...s, id: item.id ?? s.id } : item); }); setEditingService(null); };

  const addMedicine = (m: MedicineItem) => setMedicines([...medicines, m]);
  const removeMedicine = (i: number) => setMedicines(medicines.filter((_, idx) => idx !== i));
  const updateMedicine = (m: MedicineItem) => { setMedicines((current) => { const index = current.findIndex((item) => editingMedicine?.id ? item.id === editingMedicine.id : item === editingMedicine); return index < 0 ? current : current.map((item, i) => i === index ? { ...m, id: item.id ?? m.id } : item); }); setEditingMedicine(null); };

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
        itemCategory: s.itemCategory || 'service',
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
        medicationId: m.medicationId ?? null,
        code: m.drugCode || m.description,
        description: m.description,
        quantity: m.quantity,
        unitPrice: m.unitPrice,
        lineTotal: m.total,
        serviceDate: m.date || null,
        serviceCatalogId: m.serviceCatalogId ?? null,
        billLineItemId: m.billLineItemId ?? null,
        prescriptionText: m.prescriptionText ?? null,
      });
    }
    return out;
  };

  const handleSave = async (): Promise<boolean> => {
    if (!isDraft) return false;
    if (creditWarning && !(await confirmDialog({
      title: 'Credit limit exceeded',
      message: `This claim (GHS ${finalAmount.toFixed(2)}) exceeds the available credit of GHS ${availableCredit.toFixed(2)}. Continue anyway?`,
      confirmText: 'Continue',
      type: 'warning',
    }))) return false;

    try {
      setIsSubmitting(true);
      await updateClaimDraft(id!, {
        notes,
        preAuthNumber,
        metadata: { discountPercentage, visitDate },
      });
      const items = buildItemsPayload();
      await replaceClaimItems(id!, items);
      success('Saved', 'Corporate claim updated successfully');
      await getInsuranceClaim(id!);
      return true;
    } catch (err: any) {
      toastError('Save Failed', err.message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalize = async () => {
    if (!isDraft) return;
    if (creditWarning && !(await confirmDialog({ title: 'Credit limit exceeded', message: 'This claim exceeds the available credit limit. Finalize anyway?', confirmText: 'Finalize', type: 'warning' }))) return;
    try {
      setIsSubmitting(true);
      const saved = await handleSave();
      if (!saved) return;
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
      if (isDraft) {
        const saved = await handleSave();
        if (!saved) return;
      }
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
  const locked = !canEditClaim;
  const addBtn = (label: string, modal: string) => canEditClaim ? (
    <button type="button" onClick={() => setActiveModal(modal)} className="text-xs border border-white/60 rounded px-2 py-0.5 hover:bg-white/10 normal-case flex items-center gap-1"><Plus className="w-3 h-3" /> {label}</button>
  ) : undefined;
  const money = (n: number) => `GHS ${n.toFixed(2)}`;
  const unpricedLines = services.filter(s => !s.unitPrice).length + medicines.filter(m => !m.unitPrice).length;

  const renderServiceSection = (category: string, title: string) => {
    const rows = services.filter(item => (item.itemCategory || 'service') === category);
    const addLabel = category === 'service' ? 'Add consultation' : category === 'procedure' ? 'Add procedure' : 'Add lab / scan';
    return (
      <ListSection title={title} count={rows.length} open={tablesOpen} emptyText={category === 'service' ? 'No consultations or services added...' : category === 'procedure' ? 'No procedures added...' : 'No laboratory or imaging entries added...'} action={addBtn(addLabel, category)}>
        <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm">
          <thead><tr><TH>#</TH><TH>Description</TH><TH>Date</TH><TH className="text-center">Qty</TH><TH className="text-right">Unit price</TH><TH className="text-right">Total</TH>{canEditClaim && <TH className="text-center">Actions</TH>}</tr></thead>
          <tbody>{rows.map((item, idx) => (
            <tr key={item.id || item.billLineItemId || idx} className="border-t border-[var(--border-color)]">
              <td className="px-3 py-3 text-[var(--text-tertiary)]">{idx + 1}.</td><td className="px-3 py-3 text-[var(--text-secondary)]">{item.description}</td><td className="px-3 py-3 text-[var(--text-secondary)]">{fmtDate(item.date)}</td><td className="px-3 py-3 text-center text-[var(--text-secondary)]">{item.quantity}</td><td className="px-3 py-3 text-right text-[var(--text-secondary)]">{money(item.unitPrice)}</td><td className="px-3 py-3 text-right text-[var(--text-primary)] font-medium">{money(item.quantity * item.unitPrice)}</td>
              {canEditClaim && <td className="px-3 py-3 text-center whitespace-nowrap"><button type="button" onClick={() => setEditingService(item)} className="text-[var(--icon-cyan-text)] hover:opacity-80 mr-2"><Edit className="w-4 h-4" /></button><button type="button" onClick={() => removeService(services.indexOf(item))} className="text-[var(--icon-red-text)] hover:opacity-80"><Trash2 className="w-4 h-4" /></button></td>}
            </tr>
          ))}</tbody>
        </table></div>
      </ListSection>
    );
  };

  return (
    <>
      <ClaimFrame
        title="Update Claim"
        subtitle={`${currentClaim?.claimNumber ?? ''} · Corporate`}
        status={<div className="flex items-center gap-2"><span className={`text-xs px-2 py-1 rounded ${isDraft ? 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]' : 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]'}`}>{isDraft ? 'DRAFT' : 'FINALIZED'}</span>{isDraft && <button type="button" aria-pressed={canEditClaim} onClick={() => setIsEditMode(value => !value)} className="text-xs px-3 py-1.5 rounded border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-main)]">{canEditClaim ? 'Disable editing' : 'Edit claim'}</button>}</div>}
        onClose={goBack}
        onRefresh={handleRefreshClaim}
        onCollapse={() => setTablesOpen(o => !o)}
        onFinalize={isDraft ? handleFinalize : undefined}
        finalizing={isSubmitting}
      >
        {creditWarning && isDraft && (
          <div className="bg-[var(--icon-red-bg)] border border-[var(--icon-red-text)]/40 text-[var(--icon-red-text)] text-sm px-4 py-3">
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
            <thead><tr><TH>#</TH><TH>Diagnosis</TH><TH>ICD10</TH>{canEditClaim && <TH className="text-center">&nbsp;</TH>}</tr></thead>
            <tbody>
              {diagnoses.map((d, idx) => (
                <tr key={idx} className="border-t border-[var(--border-color)]">
                  <td className="px-3 py-3 text-[var(--text-tertiary)]">{idx + 1}.</td>
                  <td className="px-3 py-3 text-[var(--text-secondary)]">{d.description}</td>
                  <td className="px-3 py-3 text-[var(--text-secondary)]">{d.icd10}</td>
                  {canEditClaim && <td className="px-3 py-3 text-center"><button type="button" onClick={() => removeDiagnosis(idx)} className="text-[var(--icon-red-text)] hover:opacity-80"><Trash2 className="w-4 h-4" /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </ListSection>

        {renderServiceSection('service', 'CONSULTATION / SERVICES')}
        {renderServiceSection('procedure', 'PROCEDURES')}
        {renderServiceSection('investigation', 'LABORATORY & IMAGING')}

        <ListSection title="MEDICINES" count={medicines.length} open={tablesOpen} emptyText="No medicines added..." action={addBtn('Add', 'medicine')}>
          <table className="w-full text-sm">
            <thead><tr><TH>#</TH><TH>Description</TH><TH>Date</TH><TH className="text-center">Qty</TH><TH className="text-right">Unit price</TH><TH className="text-right">Total</TH>{canEditClaim && <TH className="text-center">&nbsp;</TH>}</tr></thead>
            <tbody>
              {medicines.map((med, idx) => (
                <tr key={idx} className="border-t border-[var(--border-color)]">
                  <td className="px-3 py-3 text-[var(--text-tertiary)]">{idx + 1}.</td>
                  <td className="px-3 py-3 text-[var(--text-secondary)]">{med.description}{med.prescriptionText && <div className="mt-0.5 text-[10px] italic text-[var(--text-tertiary)]">Rx: {med.prescriptionText}</div>}</td>
                  <td className="px-3 py-3 text-[var(--text-secondary)]">{fmtDate(med.date)}</td>
                  <td className="px-3 py-3 text-center text-[var(--text-secondary)]">{med.quantity}</td>
                  <td className="px-3 py-3 text-right text-[var(--text-secondary)]">{money(med.unitPrice)}</td>
                  <td className="px-3 py-3 text-right text-[var(--text-primary)] font-medium">{money(med.quantity * med.unitPrice)}</td>
                  {canEditClaim && (
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <button type="button" onClick={() => setEditingMedicine(med)} className="text-[var(--icon-cyan-text)] hover:opacity-80 mr-2"><Edit className="w-4 h-4" /></button>
                      <button type="button" onClick={() => removeMedicine(idx)} className="text-[var(--icon-red-text)] hover:opacity-80"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {unpricedLines > 0 && (
            <Hint>{unpricedLines} line(s) have no tariff configured for this payer. Open the line and set its unit price, or add the price in Settings → Service Catalog, before finalizing.</Hint>
          )}
        </ListSection>

        <ClaimCard title="Financial Summary">
          <div className="max-w-md ml-auto text-[15px] text-[var(--text-secondary)] space-y-2">
            <div className="flex justify-between"><span>Consultation / services</span><span>{money(services.filter(x => (x.itemCategory || 'service') === 'service').reduce((sum, x) => sum + x.quantity * x.unitPrice, 0))}</span></div>
            <div className="flex justify-between"><span>Procedures</span><span>{money(services.filter(x => x.itemCategory === 'procedure').reduce((sum, x) => sum + x.quantity * x.unitPrice, 0))}</span></div>
            <div className="flex justify-between"><span>Laboratory & imaging</span><span>{money(services.filter(x => x.itemCategory === 'investigation').reduce((sum, x) => sum + x.quantity * x.unitPrice, 0))}</span></div>
            <div className="flex justify-between"><span>Medicines</span><span>{money(medicines.reduce((sum, x) => sum + x.quantity * x.unitPrice, 0))}</span></div>
            <div className="flex justify-between"><span>Subtotal</span><span>{money(subtotal)}</span></div>
            <div className="flex justify-between items-center">
              <span>Corporate discount</span>
              <span className="flex items-center gap-1">
                <input type="number" min={0} max={100} value={discountPercentage} disabled={locked} onChange={e => setDiscountPercentage(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))} className="w-16 text-right border-b border-dotted border-[var(--border-color)] bg-transparent focus:outline-none" />%
              </span>
            </div>
            <div className="flex justify-between"><span>Discount amount</span><span>- {money(discountAmount)}</span></div>
            <div className={`flex justify-between font-semibold border-t pt-2 ${creditWarning ? 'text-[var(--icon-red-text)]' : ''}`}><span>Total corporate bill</span><span>{money(finalAmount)}</span></div>
          </div>
        </ClaimCard>

        <ClaimCard title="Authorization Codes">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <UField label="Pre-authorization Code(s)" value={preAuthNumber} onChange={setPreAuthNumber} disabled={locked} />
            <UField label="Notes" value={notes} onChange={setNotes} disabled={locked} placeholder="Additional notes…" />
          </div>
        </ClaimCard>

        {isFinalized ? (
          <div className="flex justify-end gap-3 bg-[var(--bg-card)] px-5 py-4 border-t border-[var(--border-color)]">
            <button type="button" onClick={handlePrintClaim} className="px-4 py-2 border border-[var(--border-color)] rounded text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-main)] flex items-center gap-2"><Printer className="w-4 h-4" /> Print Claim</button>
            <button type="button" onClick={goBack} className="px-6 py-2 border border-[var(--icon-red-text)] text-[var(--icon-red-text)] rounded text-sm hover:bg-[var(--icon-red-bg)] transition-colors">Close</button>
          </div>
        ) : (
          <>
            <div className="flex justify-end px-5 pb-3"><button type="button" onClick={handlePrintClaim} className="px-4 py-2 border border-[var(--border-color)] rounded text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-main)] flex items-center gap-2"><Printer className="w-4 h-4" /> Print Claim Form</button></div>
            <ClaimFooter onCancel={goBack} onSave={handleSave} saving={isSubmitting} />
          </>
        )}
      </ClaimFrame>

      <AddDiagnosisModalCorporate isOpen={activeModal === 'diagnosis'} onClose={() => setActiveModal(null)} onAdd={addDiagnosis} />
      <AddServiceModal isOpen={['service', 'procedure', 'investigation'].includes(activeModal || '')} itemCategory={activeModal || 'service'} onClose={() => setActiveModal(null)} onAdd={addService} />
      <AddMedicineModal isOpen={activeModal === 'medicine' || !!editingMedicine} onClose={() => { setActiveModal(null); setEditingMedicine(null); }} onAdd={editingMedicine ? updateMedicine : addMedicine} editing={editingMedicine} />
      <EditLineItemModal isOpen={!!editingService} onClose={() => setEditingService(null)} onSave={updateService} item={editingService} title="Edit Service" />
      
    </>
  );
}