// src/pages/insurance-claims/EditPrivateClaim.tsx
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSmartBack } from '../../utils/useSmartBack';
import { confirmDialog } from '../../context/ConfirmDialog';
import { useInsuranceStore } from '../../store/insuranceStore';
import { useMedicalServicesStore } from '../../store/medicalServicesStore';
import { usePatientStore } from '../../store/patientStore';
import { useStockStore } from '../../store/stockStore';
import { capPickerRows, PickerRowsHint, MAX_PICKER_ROWS } from '../../components/reusable/PickerLimit';
import { useToast } from '../../store/toastStore';
import { ClaimFrame, ClaimCard, UField, ListSection, TH, ClaimFooter, Hint, fmtDate } from '../../components/claims/ClaimUI';
import { payerUnitPrice, priceLabel, medicationCatalogByStockItemId } from '../../utils/pricing';
import { EMPTY_PRESCRIPTION, PrescriptionFields, formatPrescriptionDetails, parsePrescriptionDetails, type PrescriptionDetails } from '../../components/claims/ClaimPrescriptionFields';
import { Download, Printer, XCircle, Plus, Search, Edit, Trash2 as TrashIcon } from 'lucide-react';
import { reprintPremierClaimPatientPaymentReceipt } from '../../api';

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
  /** 'service' or 'procedure' — the category the claim line is stored under. */
  itemCategory?: string;
  code?: string;
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

function prescriptionTextForMedication(m: any): string {
  if (!m) return '';
  const details = [
    m.dosage && 'Dose: ' + m.dosage,
    m.frequency && 'Frequency: ' + m.frequency,
    m.duration && 'Duration: ' + m.duration,
    m.route && 'Route: ' + m.route,
    m.instructions && 'Instructions: ' + m.instructions,
  ].filter(Boolean);
  return details.join(' · ');
}

function findAttendancePrescription(attendance: any, stockItemId?: string, serviceCatalogId?: string, description?: string): string {
  const meds = attendance?.medication ?? attendance?.Medication ?? [];
  const normalizedName = String(description || '').trim().toLowerCase();
  const match = meds.find((m: any) =>
    (stockItemId && m.stockItemId === stockItemId) ||
    (serviceCatalogId && m.serviceCatalogId === serviceCatalogId) ||
    (normalizedName && String(m.name || '').trim().toLowerCase() === normalizedName)
  );
  return prescriptionTextForMedication(match);
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
        billLineItemId: li.id,
        description: li.description || li.serviceCatalog?.name || 'Medication',
        quantity,
        unitPrice,
        total: toNum(li.lineTotal) || quantity * unitPrice,
        date: li.createdAt ? new Date(li.createdAt).toISOString().split('T')[0] : '',
        stockItemId: li.serviceCatalog?.stockItemId,
        serviceCatalogId: li.serviceCatalogId || undefined,
        prescriptionText: findAttendancePrescription(attendance, li.serviceCatalog?.stockItemId, li.serviceCatalogId, li.description),
      } as MedicineItem;
    });
  }
  const meds = attendance?.medication ?? attendance?.Medication ?? [];
  return meds.map((m: any) => {
    const quantity = m.quantity || 1;
    const catalog = m.ServiceCatalog ?? m.serviceCatalog;
    // A dispensed medicine already carries its batch cost; a prescribed one is quoted at the
    // payer tariff of its catalog entry, which is the price billing would have charged.
    const unitPrice = toNum(m.dispensedUnitCost ?? payerUnitPrice(catalog, 'private_insurance'));
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
      prescriptionText: prescriptionTextForMedication(m),
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
            <PickerRowsHint shown={Math.min(filtered.length, MAX_PICKER_ROWS)} total={filtered.length} />
            {capPickerRows(filtered).map((d) => (
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

function AddServiceModal({ isOpen, onClose, onAdd, itemCategory = 'service' }: any) {
  const { serviceCatalog, getServiceCatalog } = useMedicalServicesStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { if (isOpen) getServiceCatalog({ isActive: true }); }, [isOpen, getServiceCatalog]);

  const allowedTypes = itemCategory === 'procedure' ? ['procedure'] : itemCategory === 'investigation' ? ['lab_test', 'scan'] : ['consultation'];
  const filtered = (serviceCatalog || []).filter(s =>
    allowedTypes.includes(String(s.serviceType || '').toLowerCase()) &&
    (s.name.toLowerCase().includes(searchTerm.toLowerCase()) || String(s.nhisServiceCode || s.code || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAdd = () => {
    if (!selectedService) return;
    const unitPrice = payerUnitPrice(selectedService, 'private_insurance');
    onAdd({
      id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      itemCategory,
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
          <h3 className="text-lg font-bold text-[var(--text-primary)]">{itemCategory === 'procedure' ? 'Add Procedure' : itemCategory === 'investigation' ? 'Add Laboratory / Imaging' : 'Add Consultation / Service'}</h3>
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
            <PickerRowsHint shown={Math.min(filtered.length, MAX_PICKER_ROWS)} total={filtered.length} />
            {capPickerRows(filtered).map((s) => (
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
                <div className="text-xs text-[var(--text-secondary)]">Code: {s.nhisServiceCode || s.code} | {priceLabel(payerUnitPrice(s, 'private_insurance'))}</div>
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
  const selected = selectedMedicine || (editing ? (stockItems || []).find(m => m.id === editing.stockItemId) || null : null);
  const handleAdd = () => {
    if (!selected) return;
    const catalog = catalogsByStock.get(selected.id);
    const unitPrice = editing?.unitPrice ?? payerUnitPrice(catalog, 'private_insurance');
    onAdd({ id: editing?.id, billLineItemId: editing?.billLineItemId, medicationId: selected.id === editing?.stockItemId ? editing?.medicationId : undefined, description: selected.name, date: medicineDate, stockItemId: selected.id, drugCode: selected.drugCode || selected.code || editing?.drugCode, serviceCatalogId: catalog?.id || editing?.serviceCatalogId, quantity, unitPrice, total: quantity * unitPrice, ...prescription, quantityUnit: selected.unitOfMeasure || editing?.quantityUnit || prescription.quantityUnit, prescriptionText: formatPrescriptionDetails({ ...prescription, quantityUnit: selected.unitOfMeasure || editing?.quantityUnit || prescription.quantityUnit }) || editing?.prescriptionText || '' });
    setSelectedMedicine(null); setSearchTerm(''); setQuantity(1); setPrescription({ ...EMPTY_PRESCRIPTION }); onClose();
  };
  if (!isOpen) return null;
  return <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
    <div className="bg-[var(--bg-card)] rounded-xl max-w-xl w-full border border-[var(--border-color)] max-h-[90vh] flex flex-col">
      <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between"><h3 className="text-sm font-bold text-[var(--text-primary)]">{editing ? 'Edit Prescription' : 'Add Prescription'}</h3><button type="button" onClick={onClose} className="p-1 hover:bg-[var(--bg-main)] rounded-lg"><XCircle className="w-5 h-5 text-[var(--text-secondary)]" /></button></div>
      <div className="p-4 space-y-4 overflow-y-auto">
        <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" /><input type="text" placeholder="Search medication by name, code or strength…" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setSelectedMedicine(null); }} className="w-full pl-10 pr-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm" /></div>
        {searchTerm.trim() && <div className="max-h-40 overflow-y-auto rounded-lg border border-[var(--border-color)]"><PickerRowsHint shown={Math.min(filtered.length, MAX_PICKER_ROWS)} total={filtered.length} />{capPickerRows(filtered).map(m => <button type="button" key={m.id} onClick={() => setSelectedMedicine(m)} className={`w-full text-left p-2 border-b border-[var(--border-color)] last:border-0 ${selected?.id === m.id ? 'bg-[var(--icon-green-bg)]' : 'hover:bg-[var(--bg-main)]'}`}><div className="text-sm font-medium text-[var(--text-primary)]">{m.name} {m.strength || ''}</div><div className="text-xs text-[var(--text-secondary)]">Code: {m.drugCode} · {priceLabel(payerUnitPrice(catalogsByStock.get(m.id), 'private_insurance'))}</div></button>)}{!filtered.length && <p className="p-3 text-xs text-[var(--text-tertiary)]">No matching medication found.</p>}</div>}
        {selected && <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] p-3"><div className="text-sm font-semibold text-[var(--text-primary)]">{selected.name} {selected.strength || ''}</div><div className="text-xs text-[var(--text-secondary)]">{selected.drugCode || selected.code} · {priceLabel(payerUnitPrice(catalogsByStock.get(selected.id), 'private_insurance'))}</div></div>}
        <div className="grid grid-cols-2 gap-3"><label className="text-xs font-medium text-[var(--text-secondary)]">Quantity{selected?.unitOfMeasure ? ` (${selected.unitOfMeasure})` : editing?.quantityUnit ? ` (${editing.quantityUnit})` : ''}<input type="number" min="1" value={quantity} onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="mt-1 w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm" /></label><label className="text-xs font-medium text-[var(--text-secondary)]">Date<input type="date" value={medicineDate} onChange={e => setMedicineDate(e.target.value)} className="mt-1 w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm" /></label></div>
        <PrescriptionFields value={prescription} onChange={setPrescription} strength={selected?.strength} />
      </div>
      <div className="p-4 border-t border-[var(--border-color)] flex gap-2"><button type="button" onClick={handleAdd} disabled={!selected} className="flex-1 px-4 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg disabled:opacity-50 text-sm font-medium">{editing ? 'Save Prescription' : 'Add Prescription'}</button><button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm">Cancel</button></div>
    </div></div>;
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


export default function EditPrivateClaim() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goBack = useSmartBack('/dashboard/insurance/private/claims');
  const { success, error: toastError } = useToast();
  const isInitialized = useRef(false);

  const {
    currentClaim,
    getInsuranceClaim,
    updateClaimDraft,
    replaceClaimItems,
    finalizeClaim,
    recordPremierPatientPayment,
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
  const [isCollecting, setIsCollecting] = useState(false);
  const [printingReceiptPaymentId, setPrintingReceiptPaymentId] = useState<string | null>(null);
  const [collectionAmount, setCollectionAmount] = useState('');
  const [collectionMethod, setCollectionMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'cheque'>('cash');
  const [collectionReference, setCollectionReference] = useState('');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<any>(null);
  const [editingMedicine, setEditingMedicine] = useState<any>(null);

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

  const isPremier = /\bpremier\s+health\b/i.test(String(insuranceProvider?.name || currentClaim?.InsuranceProvider?.name || currentClaim?.insuranceProvider?.name || ''));
  const premierCalculation = (currentClaim?.metadata as any)?.benefitCalculation || null;

  useEffect(() => {
    const serviceTotal = services.reduce((s, x) => s + (x.total || x.quantity * x.unitPrice), 0);
    const medicineTotal = medicines.reduce((s, x) => s + (x.total || x.quantity * x.unitPrice), 0);
    const newSubtotal = serviceTotal + medicineTotal;
    setSubtotal(newSubtotal);
    if (isPremier && premierCalculation?.scheme === 'premier_health') {
      const covered = Math.min(newSubtotal, Number(premierCalculation.cap || 0));
      const excess = Math.max(0, newSubtotal - covered);
      const isAdmission = premierCalculation.encounterCategory === 'ipd' || premierCalculation.encounterCategory === 'daycase';
      const patientDue = isAdmission ? excess : Number(premierCalculation.visitOrdinal) === 1 ? 0 : Number(premierCalculation.priorDeferred || 0) + excess;
      setInsuranceCoverage(covered);
      setPatientPayable(patientDue);
    } else {
      const covered = newSubtotal * (coveragePercentage / 100);
      setInsuranceCoverage(covered);
      setPatientPayable(newSubtotal - covered);
    }
  }, [services, medicines, coveragePercentage, isPremier, premierCalculation]);

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
    const premierProvider = /\bpremier\s+health\b/i.test(String(provider?.name || ''));
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
        unitPrice: toNum(premierProvider ? (s.grossUnitPrice ?? s.unitPrice) : s.unitPrice),
        total: toNum(premierProvider ? (s.grossLineTotal ?? s.lineTotal) : s.lineTotal),
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
          || prescriptionTextForMedication(linkedMedication)
          || [snapshot.dosageText && 'Dose: ' + snapshot.dosageText, snapshot.frequencyText && 'Frequency: ' + snapshot.frequencyText, snapshot.durationText && 'Duration: ' + snapshot.durationText].filter(Boolean).join(' · ');
        return {
          id: m.id,
          billLineItemId: m.billLineItemId ?? null,
          medicationId: m.medicationId ?? linkedMedication?.id,
          description: m.description,
          quantity: m.quantity,
          unitPrice: toNum(premierProvider ? (m.grossUnitPrice ?? m.unitPrice) : m.unitPrice),
          total: toNum(premierProvider ? (m.grossLineTotal ?? m.lineTotal) : m.lineTotal),
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
        prescriptionText: m.prescriptionText ?? (formatPrescriptionDetails({ dosage: m.dosage || '', frequency: m.frequency || '', duration: m.duration || '', route: m.route || 'oral', instructions: m.instructions || '', quantityUnit: m.quantityUnit || '' }) || null),
      });
    }
    return out;
  };

  const handleSave = async (): Promise<boolean> => {
    if (!isDraft) return false;
    try {
      setIsSubmitting(true);

      await updateClaimDraft(id!, {
        notes,
        preAuthNumber,
        metadata: { policyNumber, memberNumber, coveragePercentage, visitDate },
      });

      const items = buildItemsPayload();
      await replaceClaimItems(id!, items);

      success('Saved', 'Private insurance claim updated successfully');
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
    try {
      const saved = await handleSave();
      if (!saved) return;
      await finalizeClaim(id!);
      success('Finalized', 'Claim is ready for submission');
      navigate('/dashboard/insurance/private/claims');
    } catch (err: any) {
      toastError('Finalize Failed', err.message);
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
  const handleDownloadXml = async () => {
    try {
      await downloadClaimXml(id!);
      success('XML ready', 'Claim XML file is downloading');
    } catch (err: any) {
      toastError('Download failed', err?.response?.data?.message || err?.message || 'Could not download claim XML');
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
              {canEditClaim && <td className="px-3 py-3 text-center whitespace-nowrap"><button type="button" onClick={() => setEditingService(item)} className="text-[var(--icon-cyan-text)] hover:opacity-80 mr-2"><Edit className="w-4 h-4" /></button><button type="button" onClick={() => removeService(services.indexOf(item))} className="text-[var(--icon-red-text)] hover:opacity-80"><TrashIcon className="w-4 h-4" /></button></td>}
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
        subtitle={`${currentClaim?.claimNumber ?? ''} · Private insurance`}
        status={<div className="flex items-center gap-2"><span className={`text-xs px-2 py-1 rounded ${isDraft ? 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]' : 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]'}`}>{isDraft ? 'DRAFT' : 'FINALIZED'}</span>{isDraft && <button type="button" aria-pressed={canEditClaim} onClick={() => setIsEditMode(value => !value)} className="text-xs px-3 py-1.5 rounded border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-main)]">{canEditClaim ? 'Disable editing' : 'Edit claim'}</button>}</div>}
        onClose={goBack}
        onRefresh={handleRefreshClaim}
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

        {isPremier && isFinalized && (() => {
          const payments = (currentClaim as any)?.patientPayments || [];
          const due = Math.max(0, Number(premierCalculation?.patientPayableNow || 0));
          const collected = payments.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
          const outstanding = Math.max(0, due - collected);
          const deferred = Math.max(0, Number(premierCalculation?.deferredPatientBalance || 0));
          const reprintCollectionReceipt = async (paymentId: string) => {
            if (!id || printingReceiptPaymentId) return;
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
              toastError('Print blocked', 'Allow pop-ups for this site, then try reprinting the receipt again.');
              return;
            }
            printWindow.opener = null;
            setPrintingReceiptPaymentId(paymentId);
            try {
              const result = await reprintPremierClaimPatientPaymentReceipt(id, paymentId);
              const filePath = result?.data?.filePath || result?.filePath;
              if (!filePath) throw new Error('Receipt file is not available.');
              printWindow.location.href = filePath;
            } catch (error: any) {
              printWindow.close();
              toastError('Receipt unavailable', error?.response?.data?.message || error?.message || 'Could not reprint this payment receipt.');
            } finally {
              setPrintingReceiptPaymentId(null);
            }
          };
          const submitCollection = async (event: any) => {
            event.preventDefault();
            const amount = Math.round(Number(collectionAmount) * 100) / 100;
            if (!id || !Number.isFinite(amount) || amount <= 0 || amount > outstanding) {
              toastError('Invalid collection amount', 'Enter an amount within the outstanding Premier patient balance.');
              return;
            }
            setIsCollecting(true);
            try {
              const result = await recordPremierPatientPayment(id, {
                amount, paymentMethod: collectionMethod, reference: collectionReference.trim() || undefined,
                idempotencyKey: `premier-${id}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
              });
              success('Patient payment recorded', `Receipt ${result?.payment?.receiptNumber || ''} · GHS ${amount.toFixed(2)}`);
              setCollectionAmount('');
              setCollectionReference('');
              if (result?.receipt?.filePath) window.open(result.receipt.filePath, '_blank', 'noopener,noreferrer');
              else toastError('Receipt unavailable', 'The payment was saved, but receipt generation failed. Ask Accounts to reprint it.');
            } catch (error: any) {
              toastError('Collection failed', error?.response?.data?.message || error?.message || 'Could not record patient payment.');
            } finally { setIsCollecting(false); }
          };
          return (
            <ClaimCard title="Premier patient collection">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg bg-[var(--bg-main)] p-3"><p className="text-xs text-[var(--text-secondary)]">Patient amount due</p><p className="text-lg font-semibold">{money(due)}</p></div>
                  <div className="rounded-lg bg-[var(--bg-main)] p-3"><p className="text-xs text-[var(--text-secondary)]">Collected</p><p className="text-lg font-semibold text-[var(--icon-green-text)]">{money(collected)}</p></div>
                  <div className="rounded-lg bg-[var(--bg-main)] p-3"><p className="text-xs text-[var(--text-secondary)]">Outstanding</p><p className="text-lg font-semibold">{money(outstanding)}</p></div>
                </div>
                {outstanding > 0 ? (
                  <form onSubmit={submitCollection} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Amount (GHS)</label><input type="number" min="0.01" max={outstanding.toFixed(2)} step="0.01" required value={collectionAmount} onChange={e => setCollectionAmount(e.target.value)} className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm" /></div>
                    <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Payment method</label><select value={collectionMethod} onChange={e => setCollectionMethod(e.target.value as any)} className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm"><option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option><option value="cheque">Cheque</option></select></div>
                    <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Reference (optional)</label><input value={collectionReference} onChange={e => setCollectionReference(e.target.value)} className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm" placeholder="Transaction / cheque ref" /></div>
                    <button type="submit" disabled={isCollecting || !collectionAmount} className="rounded-lg bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] px-4 py-2 text-sm font-semibold disabled:opacity-50">{isCollecting ? 'Recording…' : 'Collect & issue receipt'}</button>
                  </form>
                ) : deferred > 0 ? <p className="text-sm text-[var(--text-secondary)]">No payment is due on this first attendance. GHS {money(deferred)} is deferred to the next Premier OPD attendance.</p> : <p className="text-sm text-[var(--icon-green-text)]">The Premier patient balance for this claim is fully settled.</p>}
                {payments.length > 0 && <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><TH>Receipt</TH><TH>Date</TH><TH>Method</TH><TH className="text-right">Amount</TH><TH>Received by</TH><TH className="text-right">Action</TH></tr></thead><tbody>{payments.map((payment: any) => <tr key={payment.id} className="border-t border-[var(--border-color)]"><td className="px-3 py-2 font-medium">{payment.receiptNumber}</td><td className="px-3 py-2">{new Date(payment.transactionDate).toLocaleString()}</td><td className="px-3 py-2 capitalize">{String(payment.paymentMethod).replace('_', ' ')}</td><td className="px-3 py-2 text-right">{money(Number(payment.amount))}</td><td className="px-3 py-2">{payment.receivedBy?.fullName || payment.receivedBy?.username || '—'}</td><td className="px-3 py-2 text-right"><button type="button" onClick={() => reprintCollectionReceipt(payment.id)} disabled={printingReceiptPaymentId !== null} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--border-color)] disabled:opacity-50"><Printer className="h-3.5 w-3.5" />{printingReceiptPaymentId === payment.id ? 'Opening…' : 'Reprint'}</button></td></tr>)}</tbody></table></div>}
              </div>
            </ClaimCard>
          );
        })()}

        <ListSection title="DIAGNOSES" count={diagnoses.length} open={tablesOpen} emptyText="No diagnoses added..." action={addBtn('Add', 'diagnosis')}>
          <table className="w-full text-sm">
            <thead><tr><TH>#</TH><TH>Diagnosis</TH><TH>ICD10</TH>{canEditClaim && <TH className="text-center">&nbsp;</TH>}</tr></thead>
            <tbody>
              {diagnoses.map((d, idx) => (
                <tr key={idx} className="border-t border-[var(--border-color)]">
                  <td className="px-3 py-3 text-[var(--text-tertiary)]">{idx + 1}.</td>
                  <td className="px-3 py-3 text-[var(--text-secondary)]">{d.description}</td>
                  <td className="px-3 py-3 text-[var(--text-secondary)]">{d.icd10}</td>
                  {canEditClaim && <td className="px-3 py-3 text-center"><button type="button" onClick={() => removeDiagnosis(idx)} className="text-[var(--icon-red-text)] hover:opacity-80"><TrashIcon className="w-4 h-4" /></button></td>}
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
            <thead><tr><TH>#</TH><TH>Description</TH><TH>Prescription / Directions</TH><TH>Date</TH><TH className="text-center">Qty</TH><TH className="text-right">Unit price</TH><TH className="text-right">Total</TH>{canEditClaim && <TH className="text-center">&nbsp;</TH>}</tr></thead>
            <tbody>
              {medicines.map((med, idx) => (
                <tr key={idx} className="border-t border-[var(--border-color)]">
                  <td className="px-3 py-3 text-[var(--text-tertiary)]">{idx + 1}.</td>
                  <td className="px-3 py-3 text-[var(--text-secondary)]">{med.description}</td>
                  <td className="px-3 py-3 text-[var(--text-secondary)] text-xs min-w-[220px]">{med.prescriptionText || <span className="text-[var(--text-tertiary)]">No prescription details recorded</span>}</td>
                  <td className="px-3 py-3 text-[var(--text-secondary)]">{fmtDate(med.date)}</td>
                  <td className="px-3 py-3 text-center text-[var(--text-secondary)]">{med.quantity}{med.quantityUnit ? ` ${med.quantityUnit}` : ''}</td>
                  <td className="px-3 py-3 text-right text-[var(--text-secondary)]">{money(med.unitPrice)}</td>
                  <td className="px-3 py-3 text-right text-[var(--text-primary)] font-medium">{money(med.quantity * med.unitPrice)}</td>
                  {canEditClaim && (
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <button type="button" onClick={() => setEditingMedicine(med)} className="text-[var(--icon-cyan-text)] hover:opacity-80 mr-2"><Edit className="w-4 h-4" /></button>
                      <button type="button" onClick={() => removeMedicine(idx)} className="text-[var(--icon-red-text)] hover:opacity-80"><TrashIcon className="w-4 h-4" /></button>
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

        <ClaimCard title="Claim Summary">
          <div className="max-w-xl ml-auto space-y-2 text-sm text-[var(--text-secondary)]">
            <div className="flex justify-between"><span>Consultation / services</span><strong>{money(services.filter(x => (x.itemCategory || 'service') === 'service').reduce((sum, x) => sum + x.quantity * x.unitPrice, 0))}</strong></div>
            <div className="flex justify-between"><span>Procedures</span><strong>{money(services.filter(x => x.itemCategory === 'procedure').reduce((sum, x) => sum + x.quantity * x.unitPrice, 0))}</strong></div>
            <div className="flex justify-between"><span>Laboratory & imaging</span><strong>{money(services.filter(x => x.itemCategory === 'investigation').reduce((sum, x) => sum + x.quantity * x.unitPrice, 0))}</strong></div>
            <div className="flex justify-between"><span>Medicines</span><strong>{money(medicines.reduce((sum, x) => sum + x.quantity * x.unitPrice, 0))}</strong></div>
            <div className="flex justify-between border-t pt-2"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
          </div>
        </ClaimCard>

        <ClaimCard title="Coverage">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {isPremier ? (
              <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] p-3">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Premier benefit cap</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">The selected cap applies to the combined value of all entries — consultations, ward charges, procedures, medicines, laboratory tests and scans. OPD is GHS 350 per attendance (two visits monthly); IPD is GHS 1,200 per admission; a surgical admission uses the selected GHS 2,000 or GHS 2,200 total cap.</p>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] text-[var(--text-tertiary)] mb-1">Insurance coverage</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={0} max={100} value={coveragePercentage} onChange={e => setCoveragePercentage(parseInt(e.target.value))} disabled={locked} className="flex-1" />
                  <span className="w-14 text-right text-[15px] text-[var(--text-secondary)] font-medium">{coveragePercentage}%</span>
                </div>
              </div>
            )}
            <div className="text-[15px] text-[var(--text-secondary)] space-y-1">
              <div className="flex justify-between"><span>Gross claim total</span><span>{money(subtotal)}</span></div>
              <div className="flex justify-between"><span>{isPremier ? 'Premier pays (within cap)' : 'Insurance pays (' + coveragePercentage + '%)'}</span><span>{money(insuranceCoverage)}</span></div>
              <div className="flex justify-between font-semibold border-t pt-1"><span>{isPremier ? 'Patient payable now' : 'Patient pays'}</span><span>{money(patientPayable)}</span></div>
              {isPremier && Number(premierCalculation?.deferredPatientBalance || 0) > 0 && <p className="pt-1 text-xs text-[var(--text-secondary)]">First-visit excess deferred to the next Premier OPD attendance: {money(Number(premierCalculation.deferredPatientBalance))}</p>}
              {isPremier && Number(premierCalculation?.priorDeferred || 0) > 0 && <p className="pt-1 text-xs text-[var(--text-secondary)]">Includes deferred excess from the previous OPD attendance: {money(Number(premierCalculation.priorDeferred))}</p>}
            </div>
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
            <button type="button" onClick={handleDownloadXml} className="px-4 py-2 border border-[var(--border-color)] rounded text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-main)] flex items-center gap-2"><Download className="w-4 h-4" /> Download XML</button>
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

      <AddDiagnosisModalPrivate isOpen={activeModal === 'diagnosis'} onClose={() => setActiveModal(null)} onAdd={addDiagnosis} />
      <AddServiceModal isOpen={['service', 'procedure', 'investigation'].includes(activeModal || '')} itemCategory={activeModal || 'service'} onClose={() => setActiveModal(null)} onAdd={addService} />
      <AddMedicineModal isOpen={activeModal === 'medicine' || !!editingMedicine} onClose={() => { setActiveModal(null); setEditingMedicine(null); }} onAdd={editingMedicine ? updateMedicine : addMedicine} editing={editingMedicine} />
      <EditServiceModal isOpen={!!editingService} onClose={() => setEditingService(null)} onSave={updateService} service={editingService} />
      
    </>
  );
}