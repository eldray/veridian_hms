// src/pages/insurance-claims/EditNHISClaim.tsx
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInsuranceStore } from '../../store/insuranceStore';
import { useMedicalServicesStore } from '../../store/medicalServicesStore';
import { usePatientStore } from '../../store/patientStore';
import { useGDRGTariffStore } from '../../store/gdrgTariffStore';
import { useStockStore } from '../../store/stockStore';
import { useToast } from '../../store/toastStore';
import { ClaimFrame, ClaimCard, UField, CheckItem, ListSection, TH, Hint, ClaimFooter, SPECIALTIES, ATTENDANCE_OPTIONS, fmtDate } from '../../components/claims/ClaimUI';
import { Download, Printer, XCircle, Plus, Search, Trash2, Edit, ChevronDown } from 'lucide-react';
import { mapAttendanceToNHIS, normalizeNHISAttendanceCode } from '../../utils/nhisAttendanceMapping';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════
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
  type?: 'lab' | 'scan';
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

interface ProcedureItem {
  id?: string;
  code: string;
  description: string;
  date: string;
}

// Accept both camelCase (new) and PascalCase (old) claim shapes so this page
// works whether or not PR 9's response normalizer is live.
const p = (claim: any): any => claim?.patient ?? claim?.Patient ?? {};
const a = (claim: any): any => claim?.attendance ?? claim?.Attendance ?? {};

const buildItemPayload = (args: {
  diagnoses: DiagnosisItem[];
  investigations: InvestigationItem[];
  medicines: MedicineItem[];
  procedures: ProcedureItem[];
  principalGDRG: string;
}) => {
  const out: any[] = [];

  for (const d of args.diagnoses) {
    if (!d.icd10) continue;
    out.push({
      itemCategory: 'diagnosis',
      code: d.icd10,
      description: d.description || d.diagnosis || d.icd10,
      quantity: 1,
      unitPrice: 0,
      lineTotal: 0,
      diagnosisId: d.diagnosisId ?? null,
    });
  }

  for (const inv of args.investigations) {
    if (!inv.gdrgCode) continue;
    out.push({
      itemCategory: 'investigation',
      code: inv.gdrgCode,
      description: inv.description || inv.gdrgCode,
      quantity: 1,
      unitPrice: 0,
      lineTotal: 0,
      serviceDate: inv.date || null,
      serviceCatalogId: inv.serviceCatalogId ?? null,
    });
  }

  for (const pr of args.procedures) {
    if (!pr.code) continue;
    out.push({
      itemCategory: 'procedure',
      code: pr.code,
      description: pr.description || pr.code,
      quantity: 1,
      unitPrice: 0,
      lineTotal: 0,
      serviceDate: pr.date || null,
    });
  }

  for (const m of args.medicines) {
    if (!m.code) continue;
    out.push({
      itemCategory: 'medicine',
      code: m.code,
      description: m.description || m.code,
      quantity: m.quantity ?? 1,
      unitPrice: 0,
      lineTotal: 0,
      serviceDate: m.date || null,
      prescriptionText: m.prescription ?? null,
    });
  }

  if (args.principalGDRG) {
    out.push({
      itemCategory: 'gdrg',
      code: args.principalGDRG,
      description: 'Principal GDRG',
      quantity: 1,
      unitPrice: 0,
      lineTotal: 0,
    });
  }

  return out;
};

// ═══════════════════════════════════════════════════════════════════════════
// SEARCHABLE GDRG SELECT
// ═══════════════════════════════════════════════════════════════════════════
interface SearchableGDRGSelectProps {
  value: string;
  onChange: (code: string, description: string) => void;
  options: Array<any>;
  disabled?: boolean;
  placeholder?: string;
}

function SearchableGDRGSelect({ value, onChange, options, disabled = false, placeholder = 'Search GDRG...' }: SearchableGDRGSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value && options && options.length > 0) {
      const selected = options.find(opt => {
        const code = opt.gdrgCode || opt.code || opt.gdrg_code || '';
        return code === value;
      });
      if (selected) {
        const code = selected.gdrgCode || selected.code || selected.gdrg_code || '';
        const desc = selected.description || selected.name || selected.desc || '';
        setSelectedLabel(`${code} - ${desc}`);
      } else {
        setSelectedLabel(value);
      }
    } else {
      setSelectedLabel('');
    }
  }, [value, options]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = (options || []).filter(opt => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const code = (opt.gdrgCode || opt.code || opt.gdrg_code || '').toString().toLowerCase();
    const description = (opt.description || opt.name || opt.desc || '').toString().toLowerCase();
    return code.includes(search) || description.includes(search);
  });

  const handleSelect = (opt: any) => {
    const code = opt.gdrgCode || opt.code || opt.gdrg_code || '';
    const description = opt.description || opt.name || opt.desc || '';
    onChange(code, description);
    setSelectedLabel(`${code} - ${description}`);
    setIsOpen(false);
    setSearchTerm('');
  };

  const formatTariff = (value: any): string => {
    const num = Number(value);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  const getTariff = (opt: any): number =>
    Number(opt.nhiaTariff || opt.tariff || opt.amount || opt.nhia_tariff || 0);

  if (disabled) {
    return (
      <div className="w-full px-3 py-2 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)] text-[var(--text-primary)]">
        {selectedLabel || '—'}
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg cursor-pointer flex items-center justify-between hover:border-[var(--icon-green-text)] transition-colors"
      >
        <span className={`text-sm ${selectedLabel ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-[var(--border-color)]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by code or description..."
                className="w-full pl-10 pr-4 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--icon-green-text)]"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              {filteredOptions.length} of {options.length} GDRG codes found
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-[var(--text-tertiary)] text-sm">
                {options.length === 0 ? 'Loading GDRG codes...' : 'No matching GDRG codes found'}
              </div>
            ) : (
              filteredOptions.map((opt, index) => {
                const code = opt.gdrgCode || opt.code || opt.gdrg_code || '';
                const description = opt.description || opt.name || opt.desc || '';
                const tariff = getTariff(opt);
                const isSelected = value === code;
                return (
                  <button
                    key={opt.id || code || index}
                    onClick={() => handleSelect(opt)}
                    className={`w-full text-left px-3 py-2 hover:bg-[var(--bg-main)] transition-colors ${
                      isSelected ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]' : 'text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono font-medium text-sm">{code}</span>
                        <span className="ml-2 text-sm">{description}</span>
                      </div>
                      <span className="text-xs text-[var(--text-tertiary)]">Tariff: ₵{formatTariff(tariff)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ADD DIAGNOSIS MODAL
// ═══════════════════════════════════════════════════════════════════════════
// `editing` set => the dialog edits that row (pre-filled, searchable) instead of adding a new one.
function AddDiagnosisModal({ isOpen, onClose, onAdd, editing = null }: { isOpen: boolean; onClose: () => void; onAdd: (d: DiagnosisItem) => void; editing?: DiagnosisItem | null }) {
  const { diagnoses, getDiagnoses } = useMedicalServicesStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [pickedDiagnosis, setPickedDiagnosis] = useState<any>(null);
  const [gdrgCode, setGdrgCode] = useState('');

  useEffect(() => {
    if (isOpen) getDiagnoses();
  }, [isOpen, getDiagnoses]);

  // Reset / pre-fill each time the dialog opens
  useEffect(() => {
    if (!isOpen) return;
    setSearchTerm('');
    setPickedDiagnosis(null);
    setGdrgCode(editing?.gdrgCode || '');
  }, [isOpen, editing]);

  // Current selection: what the user picked, else the row being edited
  const selectedDiagnosis = pickedDiagnosis ?? (editing
    ? (diagnoses.find(d => (editing.diagnosisId && d.id === editing.diagnosisId) || d.icdCode === editing.icd10)
        ?? { id: editing.diagnosisId, name: editing.diagnosis || editing.description, icdCode: editing.icd10 })
    : null);
  const setSelectedDiagnosis = setPickedDiagnosis;

  const filtered = diagnoses.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.icdCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    if (!selectedDiagnosis) return;
    onAdd({
      id: editing?.id,
      gdrgCode: gdrgCode || 'OPDC06A',
      description: selectedDiagnosis.name,
      diagnosis: selectedDiagnosis.name,
      icd10: selectedDiagnosis.icdCode,
      diagnosisId: selectedDiagnosis.id,
      diagnosisType: editing?.diagnosisType ?? 'additional',
    });
    setSelectedDiagnosis(null);
    setSearchTerm('');
    setGdrgCode('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl max-w-md w-full border border-[var(--border-color)]">
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">{editing ? 'Edit Diagnosis' : 'Add Diagnosis'}</h3>
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
            {filtered.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDiagnosis(d)}
                className={`w-full text-left p-2 rounded-lg transition-colors ${
                  selectedDiagnosis?.id === d.id
                    ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]'
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
            className="flex-1 px-4 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white disabled:opacity-50 text-sm font-medium"
          >
            {editing ? 'Save Changes' : 'Add Diagnosis'}
          </button>
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ADD INVESTIGATION MODAL
// ═══════════════════════════════════════════════════════════════════════════
// `editing` set => the dialog edits that row (pre-filled, searchable) instead of adding a new one.
function AddInvestigationModal({ isOpen, onClose, onAdd, type, editing = null }: { isOpen: boolean; onClose: () => void; onAdd: (i: InvestigationItem) => void; type: 'lab' | 'scan'; editing?: InvestigationItem | null }) {
  const { labTestTemplates, scanTemplates, getLabTestTemplates, getScanTemplates } = useMedicalServicesStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [pickedItem, setPickedItem] = useState<any>(null);
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  // When editing, the row may be a lab or a scan (not always recorded), so allow switching.
  const [kind, setKind] = useState<'lab' | 'scan'>(type);

  useEffect(() => {
    if (isOpen) {
      if (kind === 'lab') getLabTestTemplates();
      else getScanTemplates();
    }
  }, [isOpen, kind, getLabTestTemplates, getScanTemplates]);

  // Reset / pre-fill each time the dialog opens
  useEffect(() => {
    if (!isOpen) return;
    setSearchTerm('');
    setPickedItem(null);
    setKind(editing?.type ?? type);
    setServiceDate(editing?.date || new Date().toISOString().split('T')[0]);
  }, [isOpen, editing, type]);

  const items = kind === 'lab' ? labTestTemplates : scanTemplates;
  const codeField = kind === 'lab' ? 'investigationCode' : 'scanCode';

  // Current selection: what the user picked, else the row being edited
  const selectedItem = pickedItem ?? (editing
    ? (items.find(i => (editing.serviceCatalogId && i.id === editing.serviceCatalogId) || (i as any)[codeField] === editing.gdrgCode)
        ?? { id: editing.serviceCatalogId, name: editing.description, [codeField]: editing.gdrgCode })
    : null);
  const setSelectedItem = setPickedItem;

  const filtered = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item[codeField] || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    if (!selectedItem) return;
    onAdd({
      id: editing?.id,
      gdrgCode: selectedItem[codeField] || selectedItem.code || 'INVE000',
      description: selectedItem.name,
      date: serviceDate,
      serviceCatalogId: selectedItem.id,
      type: kind,
    });
    setSelectedItem(null);
    setSearchTerm('');
    setServiceDate(new Date().toISOString().split('T')[0]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl max-w-md w-full border border-[var(--border-color)]">
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">{editing ? 'Edit' : 'Add'} {kind === 'lab' ? 'Lab Test' : 'Scan'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-main)] rounded-lg">
            <XCircle className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {editing && (
            <div className="flex gap-2">
              {(['lab', 'scan'] as const).map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => { setKind(k); setPickedItem(null); setSearchTerm(''); }}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-sm border ${kind === k ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border-[var(--icon-green-text)]' : 'border-[var(--border-color)] text-[var(--text-primary)]'}`}
                >
                  {k === 'lab' ? 'Lab Test' : 'Scan'}
                </button>
              ))}
            </div>
          )}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder={`Search ${kind === 'lab' ? 'lab test' : 'scan'}...`}
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
            {filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`w-full text-left p-2 rounded-lg transition-colors ${
                  selectedItem?.id === item.id
                    ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]'
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
            className="flex-1 px-4 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white disabled:opacity-50 text-sm font-medium"
          >
            {editing ? 'Save Changes' : 'Add Investigation'}
          </button>
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ADD MEDICINE MODAL
// ═══════════════════════════════════════════════════════════════════════════
// `editing` set => the dialog edits that row (pre-filled, searchable) instead of adding a new one.
function AddMedicineModal({ isOpen, onClose, onAdd, editing = null }: { isOpen: boolean; onClose: () => void; onAdd: (m: MedicineItem) => void; editing?: MedicineItem | null }) {
  const { stockItems, getStockItems } = useStockStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [pickedItem, setPickedItem] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [duration, setDuration] = useState('');

  useEffect(() => {
    if (isOpen) getStockItems();
  }, [isOpen, getStockItems]);

  // Reset / pre-fill each time the dialog opens
  useEffect(() => {
    if (!isOpen) return;
    setSearchTerm('');
    setPickedItem(null);
    setQuantity(editing?.quantity || 1);
    setServiceDate(editing?.date || new Date().toISOString().split('T')[0]);
    setDosage(editing?.dosage || '');
    setFrequency(editing?.frequency || '');
    setDuration(editing?.duration || '');
  }, [isOpen, editing]);

  // Current selection: what the user picked, else the row being edited
  const selectedItem = pickedItem ?? (editing
    ? (stockItems.find(i => (editing.stockItemId && i.id === editing.stockItemId) || (i.drugCode && i.drugCode === editing.code))
        ?? { id: editing.stockItemId, name: editing.description, drugCode: editing.code })
    : null);
  const setSelectedItem = setPickedItem;

  const filtered = stockItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.drugCode || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    if (!selectedItem) return;
    const prescription = `${dosage} ${frequency} x ${duration}`.trim();
    onAdd({
      id: editing?.id,
      code: selectedItem.drugCode,
      description: selectedItem.name,
      quantity,
      date: serviceDate,
      // keep the original prescription text when no dose details were entered
      prescription: prescription || editing?.prescription || 'As prescribed',
      dosage,
      frequency,
      duration,
      stockItemId: selectedItem.id,
      serviceCatalogId: editing?.serviceCatalogId,
    });
    setSelectedItem(null);
    setSearchTerm('');
    setQuantity(1);
    setDosage('');
    setFrequency('');
    setDuration('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl max-w-md w-full border border-[var(--border-color)]">
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">{editing ? 'Edit Medicine' : 'Add Medicine'}</h3>
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
              <label className="text-xs font-medium text-[var(--text-secondary)]">Service Date</label>
              <input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Dosage</label>
              <input type="text" value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="e.g., 500mg" className="w-full px-2 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-xs" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Frequency</label>
              <input type="text" value={frequency} onChange={(e) => setFrequency(e.target.value)} placeholder="e.g., BD" className="w-full px-2 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-xs" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Duration</label>
              <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g., 7 days" className="w-full px-2 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-xs" />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`w-full text-left p-2 rounded-lg transition-colors ${
                  selectedItem?.id === item.id
                    ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]'
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
          <button onClick={handleAdd} disabled={!selectedItem} className="flex-1 px-4 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white disabled:opacity-50 text-sm font-medium">
            {editing ? 'Save Changes' : 'Add Medicine'}
          </button>
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ADD / EDIT PROCEDURE MODAL
// ═══════════════════════════════════════════════════════════════════════════
// `editing` set => the dialog edits that row (pre-filled, searchable) instead of adding a new one.
function AddProcedureModal({ isOpen, onClose, onAdd, editing = null }: { isOpen: boolean; onClose: () => void; onAdd: (p: ProcedureItem) => void; editing?: ProcedureItem | null }) {
  const { procedureTemplates, getProcedureTemplates } = useMedicalServicesStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [pickedItem, setPickedItem] = useState<any>(null);
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (isOpen) getProcedureTemplates();
  }, [isOpen, getProcedureTemplates]);

  // Reset / pre-fill each time the dialog opens
  useEffect(() => {
    if (!isOpen) return;
    setSearchTerm('');
    setPickedItem(null);
    setServiceDate(editing?.date || new Date().toISOString().split('T')[0]);
  }, [isOpen, editing]);

  const codeOf = (t: any) => t?.tariffCode || t?.procedureCode || '';

  // Current selection: what the user picked, else the row being edited
  const selectedItem = pickedItem ?? (editing
    ? ((procedureTemplates || []).find((t: any) => codeOf(t) === editing.code || t.procedureCode === editing.code)
        ?? { id: editing.id, name: editing.description, procedureCode: editing.code })
    : null);

  const filtered = (procedureTemplates || []).filter((t: any) =>
    (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    codeOf(t).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.procedureCode || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    if (!selectedItem) return;
    onAdd({
      id: editing?.id,
      code: codeOf(selectedItem) || selectedItem.procedureCode || '',
      description: selectedItem.name,
      date: serviceDate,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl max-w-md w-full border border-[var(--border-color)]">
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">{editing ? 'Edit Procedure' : 'Add Procedure'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-main)] rounded-lg">
            <XCircle className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search procedure by name or code..."
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
          {editing && (
            <div className="text-xs text-[var(--text-secondary)]">Current: {selectedItem?.name} ({codeOf(selectedItem) || selectedItem?.procedureCode || '—'})</div>
          )}
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filtered.map((t: any) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setPickedItem(t)}
                className={`w-full text-left p-2 rounded-lg transition-colors ${
                  selectedItem?.id === t.id
                    ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]'
                    : 'hover:bg-[var(--bg-main)] text-[var(--text-primary)]'
                }`}
              >
                <div className="font-medium text-sm">{t.name}</div>
                <div className="text-xs text-[var(--text-secondary)]">Code: {codeOf(t) || t.procedureCode}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-[var(--border-color)] flex gap-2">
          <button
            onClick={handleAdd}
            disabled={!selectedItem}
            className="flex-1 px-4 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white disabled:opacity-50 text-sm font-medium"
          >
            {editing ? 'Save Changes' : 'Add Procedure'}
          </button>
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function EditNHISClaim() {
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

  const { updatePatient } = usePatientStore();
  const { getDiagnoses } = useMedicalServicesStore();
  const { tariffs, fetchTariffs } = useGDRGTariffStore();

  const [patientNhisNumber, setPatientNhisNumber] = useState('');
  const [cccCode, setCccCode] = useState('');
  const [folderNumber, setFolderNumber] = useState('');
  const [surname, setSurname] = useState('');
  const [otherNames, setOtherNames] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [age, setAge] = useState('');
  const [patientId, setPatientId] = useState('');

  const [isEditingMember, setIsEditingMember] = useState(false);
  const [memberFormData, setMemberFormData] = useState({
    nhisNumber: '', cccCode: '', folderNumber: '', surname: '', otherNames: '', gender: '', dateOfBirth: '',
  });

  const [primaryServiceType, setPrimaryServiceType] = useState<'OPD' | 'IPD'>('OPD');
  const [serviceOutcome, setServiceOutcome] = useState('DISC');
  const [visitDates, setVisitDates] = useState<string[]>(['', '', '', '']);
  const [admissionDate, setAdmissionDate] = useState('');
  const [dischargeDate, setDischargeDate] = useState('');
  const [lengthOfStay, setLengthOfStay] = useState(0);
  const [typeOfAttendance, setTypeOfAttendance] = useState('CFU');

  const [diagnoses, setDiagnoses] = useState<DiagnosisItem[]>([]);
  const [investigations, setInvestigations] = useState<InvestigationItem[]>([]);
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);

  const [principalGDRG, setPrincipalGDRG] = useState('');
  const [principalGDRGDescription, setPrincipalGDRGDescription] = useState('');
  const [preAuthNumber, setPreAuthNumber] = useState('');
  const [notes, setNotes] = useState('');

  const [serviceFlags, setServiceFlags] = useState({ diagnostic: false, pharmacy: false, unbundled: false, allInclusive: true });
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [referringFacility, setReferringFacility] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [physicianId, setPhysicianId] = useState('');
  const [procedures, setProcedures] = useState<ProcedureItem[]>([]);
  const [tablesOpen, setTablesOpen] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  // The row currently being edited (opens the matching search dialog, pre-filled)
  const [editing, setEditing] = useState<{ kind: 'diagnosis' | 'investigation' | 'medicine' | 'procedure'; index: number } | null>(null);
  const closeModal = () => { setActiveModal(null); setEditing(null); };
  const [isSavingMember, setIsSavingMember] = useState(false);

  const isDraft = currentClaim?.status === 'draft';
  const isFinalized = currentClaim?.status === 'finalized';
  const availableGDRGs = tariffs || [];

  useEffect(() => {
    if (id) {
      getInsuranceClaim(id);
      getDiagnoses();
      fetchTariffs();
    }
  }, [id]);

  useEffect(() => {
    if (!currentClaim || isInitialized.current) return;
    isInitialized.current = true;

    const patient = p(currentClaim);
    const attendance = a(currentClaim);

    if (patient?.nhisNumber) setPatientNhisNumber(patient.nhisNumber);
    else if (attendance?.nhisCCC) setCccCode(attendance.nhisCCC);
    if (patient?.folderNumber) setFolderNumber(patient.folderNumber);

    setPatientId(patient?.id || '');
    setSurname(patient?.surname || '');
    setOtherNames(patient?.otherNames || '');
    setGender(patient?.gender || '');
    setDateOfBirth(patient?.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : '');

    setMemberFormData({
      surname: patient?.surname || '',
      otherNames: patient?.otherNames || '',
      gender: patient?.gender || '',
      dateOfBirth: patient?.dateOfBirth || '',
      nhisNumber: patient?.nhisNumber || '',
      folderNumber: patient?.folderNumber || '',
      cccCode: attendance?.nhisCCC || '',
    });

    if (patient?.dateOfBirth) {
      const birth = new Date(patient.dateOfBirth);
      const today = new Date();
      let y = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) y--;
      setAge(`${y} yrs`);
    }

    const serviceType = currentClaim.typeOfService === 'IPD' ? 'IPD' : 'OPD';
    setPrimaryServiceType(serviceType);
    setServiceOutcome(currentClaim.serviceOutcome === 'DISC' ? 'DISC' : 'CONT');

    if (currentClaim.datesOfService?.length) {
      const dates = [...visitDates];
      currentClaim.datesOfService.forEach((date: string, i: number) => { if (i < 4) dates[i] = date; });
      setVisitDates(dates);
    } else if (attendance?.dateTime) {
      setVisitDates([attendance.dateTime.split('T')[0], '', '', '']);
    }

    // Items: prefer claim.items (server truth), fall back to metadata, then to attendance
    const serverItems: any[] = (currentClaim as any).items ?? [];
    const meta = (currentClaim.metadata || {}) as any;

    const diagFromServer = serverItems.filter((i: any) => i.itemCategory === 'diagnosis');
    const invFromServer = serverItems.filter((i: any) => i.itemCategory === 'investigation');
    const procFromServer = serverItems.filter((i: any) => i.itemCategory === 'procedure');
    const medFromServer = serverItems.filter((i: any) => i.itemCategory === 'medicine');

    if (diagFromServer.length) {
      setDiagnoses(diagFromServer.map((d: any, idx: number) => ({
        id: d.id,
        gdrgCode: d.gdrgTariff?.gdrgCode || currentClaim.principalGDRG || 'OPDC06A',
        description: d.description,
        diagnosis: d.description,
        icd10: d.code,
        diagnosisId: d.diagnosisId,
        diagnosisType: idx === 0 ? 'primary' : 'additional',
      })));
    } else if (meta.diagnoses?.length) {
      setDiagnoses(meta.diagnoses);
    } else {
      const attDiags = attendance?.attendanceDiagnosis ?? attendance?.AttendanceDiagnosis ?? [];
      setDiagnoses(attDiags.map((d: any, idx: number) => ({
        id: d.id,
        gdrgCode: currentClaim.principalGDRG || 'OPDC06A',
        description: d.diagnosis?.name || d.Diagnosis?.name || '',
        diagnosis: d.diagnosis?.name || d.Diagnosis?.name || '',
        icd10: d.diagnosis?.icdCode || d.Diagnosis?.icdCode || '',
        diagnosisId: d.diagnosisId,
        diagnosisType: d.diagnosisType,
      })));
    }

    if (invFromServer.length) {
      setInvestigations(invFromServer.map((i: any) => ({
        id: i.id,
        gdrgCode: i.code,
        description: i.description,
        date: i.serviceDate ? String(i.serviceDate).split('T')[0] : '',
        serviceCatalogId: i.serviceCatalogId,
        type: 'lab' as const,
      })));
    } else if (meta.investigations?.length) {
      setInvestigations(meta.investigations);
    } else {
      const labs = (attendance?.labTest ?? attendance?.LabTest ?? []).map((l: any) => ({
        id: l.id,
        gdrgCode: l.serviceCatalog?.investigationCode || l.ServiceCatalog?.investigationCode || '',
        description: l.serviceCatalog?.name || l.ServiceCatalog?.name || l.name || '',
        date: l.requestedAt ? new Date(l.requestedAt).toISOString().split('T')[0] : '',
        serviceCatalogId: l.serviceCatalogId,
        type: 'lab' as const,
      }));
      const scans = (attendance?.scan ?? attendance?.Scan ?? []).map((s: any) => ({
        id: s.id,
        gdrgCode: s.serviceCatalog?.investigationCode || s.ServiceCatalog?.investigationCode || '',
        description: s.serviceCatalog?.name || s.ServiceCatalog?.name || s.name || '',
        date: s.requestedAt ? new Date(s.requestedAt).toISOString().split('T')[0] : '',
        serviceCatalogId: s.serviceCatalogId,
        type: 'scan' as const,
      }));
      setInvestigations([...labs, ...scans]);
    }

    if (medFromServer.length) {
      setMedicines(medFromServer.map((m: any) => ({
        id: m.id,
        code: m.code,
        description: m.description,
        quantity: m.quantity,
        date: m.serviceDate ? String(m.serviceDate).split('T')[0] : '',
        prescription: m.prescriptionText || 'As prescribed',
        stockItemId: m.medicationId,
      })));
    } else if (meta.medicines?.length) {
      setMedicines(meta.medicines);
    } else {
      const meds = (attendance?.medication ?? attendance?.Medication ?? []).map((m: any) => ({
        id: m.id,
        code: m.stockItem?.drugCode || m.StockItem?.drugCode || m.serviceCatalog?.code || m.ServiceCatalog?.code || '',
        description: m.name,
        quantity: m.quantity || 1,
        date: m.dispensedAt ? new Date(m.dispensedAt).toISOString().split('T')[0] : '',
        prescription: `${m.dosage || ''} ${m.frequency || ''} x ${m.duration || ''}`.trim() || 'As prescribed',
        dosage: m.dosage || '',
        frequency: m.frequency || '',
        duration: m.duration || '',
        stockItemId: m.stockItemId,
      }));
      setMedicines(meds);
    }

    if (procFromServer.length) {
      setProcedures(procFromServer.map((pr: any) => ({
        id: pr.id,
        code: pr.code,
        description: pr.description,
        date: pr.serviceDate ? String(pr.serviceDate).split('T')[0] : '',
      })));
    } else if (meta.procedures?.length) {
      setProcedures(meta.procedures);
    } else {
      const attProcs = (attendance?.procedure ?? attendance?.Procedure ?? []).map((pr: any) => ({
        id: pr.id,
        code: pr.serviceCatalog?.nhisServiceCode || pr.ServiceCatalog?.nhisServiceCode || pr.serviceCatalog?.code || pr.ServiceCatalog?.code || '',
        description: pr.serviceCatalog?.name || pr.ServiceCatalog?.name || pr.procedureTemplate?.name || pr.ProcedureTemplate?.name || 'Procedure',
        date: (pr.performedAt || pr.scheduledDate || pr.createdAt || '').toString().split('T')[0],
      }));
      setProcedures(attProcs);
    }

    if (meta.visitDates) setVisitDates(meta.visitDates);
    if (meta.admissionDate) setAdmissionDate(meta.admissionDate);
    if (meta.dischargeDate) setDischargeDate(meta.dischargeDate);
    if (meta.lengthOfStay) setLengthOfStay(meta.lengthOfStay);

    setPrincipalGDRG(currentClaim.principalGDRG || '');
    setPreAuthNumber(currentClaim.preAuthNumber || '');
    setNotes(currentClaim.notes || '');
    // Type of Attendance / Type of Service follow the attendance type (see utils/nhisAttendanceMapping.ts).
    // Drafts are re-resolved from the attendance; submitted claims keep what was saved.
    const mapped = mapAttendanceToNHIS(
      attendance?.attendanceType,
      !!(attendance?.Admission ?? attendance?.admission) || currentClaim.typeOfService === 'IPD'
    );
    if (currentClaim.status === 'draft' && attendance?.attendanceType) {
      setTypeOfAttendance(mapped.typeOfAttendance);
      setPrimaryServiceType(mapped.typeOfService);
    } else {
      setTypeOfAttendance(normalizeNHISAttendanceCode(currentClaim.typeOfAttendance) || mapped.typeOfAttendance);
    }

    setServiceFlags(meta.serviceFlags ?? {
      diagnostic: (attendance?.labTest ?? attendance?.LabTest ?? []).length > 0,
      pharmacy: (attendance?.medication ?? attendance?.Medication ?? []).length > 0,
      unbundled: false,
      allInclusive: true,
    });
    const mdc = (currentClaim.mdcCode || (currentClaim.principalGDRG || '').slice(0, 4) || '').toUpperCase();
    setSpecialties(meta.specialties ?? ((SPECIALTIES as readonly string[]).includes(mdc) ? [mdc] : []));
    setReferringFacility(meta.referringFacility ?? attendance?.referringFacility ?? '');
    setReferralCode(meta.referralCode ?? '');
    setPhysicianId(meta.physicianId ?? '');
  }, [currentClaim]);

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

  useEffect(() => {
    if (tariffs.length > 0 && principalGDRG) {
      const selected = tariffs.find(g => g.gdrgCode === principalGDRG);
      if (selected && selected.description !== principalGDRGDescription) {
        setPrincipalGDRGDescription(selected.description);
      }
    }
  }, [tariffs, principalGDRG]);

  const handleMemberEdit = () => {
    setIsEditingMember(true);
    setMemberFormData({
      surname: surname || '',
      otherNames: otherNames || '',
      gender: gender || '',
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString().split('T')[0] : '',
      nhisNumber: patientNhisNumber || '',
      folderNumber: folderNumber || '',
      cccCode: cccCode || '',
    });
  };

  const calculateAge = (dob: string) => {
    if (!dob) return '—';
    const birth = new Date(dob);
    const today = new Date();
    let y = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) y--;
    return `${y} yrs`;
  };

  const handleMemberSave = async () => {
    if (!patientId) {
      toastError('Error', 'Patient ID not found');
      return;
    }
    setIsSavingMember(true);
    try {
      await updatePatient(patientId, {
        surname: memberFormData.surname,
        otherNames: memberFormData.otherNames,
        gender: memberFormData.gender,
        dateOfBirth: memberFormData.dateOfBirth,
        nhisNumber: memberFormData.nhisNumber,
        folderNumber: memberFormData.folderNumber,
      });
      setSurname(memberFormData.surname);
      setOtherNames(memberFormData.otherNames);
      setGender(memberFormData.gender);
      setDateOfBirth(memberFormData.dateOfBirth ? new Date(memberFormData.dateOfBirth).toLocaleDateString() : '');
      setPatientNhisNumber(memberFormData.nhisNumber);
      setFolderNumber(memberFormData.folderNumber);
      setCccCode(memberFormData.cccCode);
      if (memberFormData.dateOfBirth) setAge(calculateAge(memberFormData.dateOfBirth));
      success('Updated', 'Member details updated successfully');
      setIsEditingMember(false);
      await getInsuranceClaim(id!);
    } catch (error: any) {
      toastError('Update Failed', error.message || 'Could not update member details');
    } finally {
      setIsSavingMember(false);
    }
  };

  // Replace the row at `index`, or append when not editing
  const upsert = <T,>(list: T[], item: T, kind: string): T[] =>
    editing?.kind === kind ? list.map((x, i) => (i === editing.index ? item : x)) : [...list, item];

  const addDiagnosis = (d: DiagnosisItem) => setDiagnoses(upsert(diagnoses, d, 'diagnosis'));
  const removeDiagnosis = (i: number) => setDiagnoses(diagnoses.filter((_, idx) => idx !== i));
  const setPrimaryDiagnosis = (i: number) =>
    setDiagnoses(diagnoses.map((d, idx) => ({ ...d, diagnosisType: idx === i ? 'primary' : 'additional' })));

  const addInvestigation = (inv: InvestigationItem) => setInvestigations(upsert(investigations, inv, 'investigation'));
  const removeInvestigation = (i: number) => setInvestigations(investigations.filter((_, idx) => idx !== i));

  const addMedicine = (m: MedicineItem) => setMedicines(upsert(medicines, m, 'medicine'));
  const removeMedicine = (i: number) => setMedicines(medicines.filter((_, idx) => idx !== i));

  const addProcedure = (pr: ProcedureItem) => setProcedures(upsert(procedures, pr, 'procedure'));
  const removeProcedure = (i: number) => setProcedures(procedures.filter((_, idx) => idx !== i));

  const updateVisitDate = (i: number, v: string) => {
    const arr = [...visitDates]; arr[i] = v; setVisitDates(arr);
  };

  const handlePrincipalGDRGChange = (code: string, desc: string) => {
    setPrincipalGDRG(code);
    setPrincipalGDRGDescription(desc);
  };

  const validateNHISClaim = () => {
    const errs: string[] = [];
    if (!cccCode && !patientNhisNumber) errs.push('NHIS CCC number is required');
    if (diagnoses.length === 0) errs.push('At least one diagnosis is required');
    if (diagnoses.length > 0 && !diagnoses.some(d => d.diagnosisType === 'primary')) {
      errs.push('A primary diagnosis must be selected');
    }
    if (!principalGDRG) errs.push('Principal GDRG is required');
    if (primaryServiceType === 'OPD' && !visitDates.some(d => d)) errs.push('At least one visit date is required');
    if (primaryServiceType === 'IPD') {
      if (!admissionDate) errs.push('Admission date is required');
      if (!dischargeDate) errs.push('Discharge date is required');
    }
    return { isValid: errs.length === 0, errors: errs };
  };

  const handleSave = async () => {
    if (!isDraft) return;
    const { isValid, errors } = validateNHISClaim();
    if (!isValid) {
      toastError('Validation Failed', errors.join(', '));
      return;
    }
    try {
      setIsSubmitting(true);

      await updateClaimDraft(id!, {
        principalGDRG,
        preAuthNumber,
        notes,
        mdcCode: principalGDRG?.slice(0, 4) || 'OPDC',
        metadata: {
          serviceFlags,
          specialties,
          referringFacility,
          referralCode,
          physicianId,
          visitDates: visitDates.filter(d => d),
          admissionDate,
          dischargeDate,
          lengthOfStay,
        },
      });

      const items = buildItemPayload({ diagnoses, investigations, medicines, procedures, principalGDRG });
      if (items.length > 0) await replaceClaimItems(id!, items);

      success('Saved', 'NHIS claim updated successfully');
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

  const handlePrintClaim = async () => {
    try {
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--icon-green-text)]" />
      </div>
    );
  }

  const attendanceChoices = ATTENDANCE_OPTIONS.some(o => o.code === typeOfAttendance)
    ? ATTENDANCE_OPTIONS
    : [...ATTENDANCE_OPTIONS, { code: typeOfAttendance, label: `Other (${typeOfAttendance})` }];
  const toggleSpecialty = (code: string, on: boolean) =>
    setSpecialties(prev => on ? Array.from(new Set([...prev, code])) : prev.filter(c => c !== code));
  const locked = !isDraft;

  return (
    <>
      <ClaimFrame
        title="Update Claim"
        subtitle={`${currentClaim?.claimNumber ?? ''} · NHIS`}
        status={
          <span className={`text-xs px-2 py-1 rounded mr-1 ${isDraft ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
            {isDraft ? 'DRAFT' : 'FINALIZED'}
          </span>
        }
        onClose={() => navigate('/dashboard/insurance-claims')}
        onCollapse={() => setTablesOpen(o => !o)}
        onFinalize={isDraft ? handleFinalize : undefined}
        finalizing={isSubmitting}
      >
        <ClaimCard
          title="Member Details"
          action={isDraft && !isEditingMember ? (
            <button type="button" onClick={handleMemberEdit} className="text-xs border border-white/60 rounded px-2 py-0.5 hover:bg-white/10">Edit</button>
          ) : undefined}
        >
          {isEditingMember ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
                <UField className="md:col-span-3" label="Member No / HIN" value={memberFormData.nhisNumber} onChange={v => setMemberFormData({ ...memberFormData, nhisNumber: v })} />
                <UField label="Surname" value={memberFormData.surname} onChange={v => setMemberFormData({ ...memberFormData, surname: v })} />
                <UField label="Other Names" value={memberFormData.otherNames} onChange={v => setMemberFormData({ ...memberFormData, otherNames: v })} />
                <UField label="Folder No." value={memberFormData.folderNumber} onChange={v => setMemberFormData({ ...memberFormData, folderNumber: v })} />
                <div>
                  <label className="block text-[11px] text-gray-500 mb-0.5">Gender</label>
                  <select value={memberFormData.gender} onChange={e => setMemberFormData({ ...memberFormData, gender: e.target.value })} className="w-full border-b border-dotted border-gray-400 bg-transparent py-1.5 text-[15px] text-gray-600 focus:outline-none">
                    <option value="">Select</option>
                    <option value="male">MALE</option>
                    <option value="female">FEMALE</option>
                    <option value="other">OTHER</option>
                  </select>
                </div>
                <UField label="Date of Birth" type="date" value={memberFormData.dateOfBirth ? String(memberFormData.dateOfBirth).split('T')[0] : ''} onChange={v => setMemberFormData({ ...memberFormData, dateOfBirth: v })} hint={memberFormData.dateOfBirth ? `Age: ${calculateAge(memberFormData.dateOfBirth)}` : undefined} />
                <UField label="CCC No." value={memberFormData.cccCode} onChange={v => setMemberFormData({ ...memberFormData, cccCode: v })} />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setIsEditingMember(false)} className="px-4 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="button" onClick={handleMemberSave} disabled={isSavingMember} className="px-4 py-1.5 border rounded text-sm disabled:opacity-50" style={{ borderColor: '#4a7ca8', color: '#3a6a96' }}>
                  {isSavingMember ? 'Saving…' : 'Save member'}
                </button>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
              <UField className="md:col-span-3" label="Member No / HIN" value={patientNhisNumber || ''} icon="search" hint={!patientNhisNumber && cccCode ? 'No permanent member number: claim uses the CCC code' : undefined} />
              <UField label="Surname" value={surname} />
              <UField label="Other Names" value={otherNames} />
              <UField label="Folder No." value={folderNumber} icon="search" />
              <UField label="Gender" value={(gender || '').toUpperCase()} />
              <UField label="Date of Birth" value={dateOfBirth} icon="calendar" hint={age ? `Age: ${age.replace(' yrs', 'yrs')}` : undefined} />
              <UField label="CCC No." value={cccCode} />
            </div>
          )}
        </ClaimCard>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
              <ClaimCard title="Type of Service(s)" className="md:col-span-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <CheckItem label="Outpatient" checked={primaryServiceType === 'OPD'} onChange={() => setPrimaryServiceType('OPD')} disabled={locked} />
                  <CheckItem label="Pharmacy" checked={serviceFlags.pharmacy} onChange={v => setServiceFlags({ ...serviceFlags, pharmacy: v })} disabled={locked} />
                  <CheckItem label="Inpatient" checked={primaryServiceType === 'IPD'} onChange={() => setPrimaryServiceType('IPD')} disabled={locked} />
                  <CheckItem label="Diagnostic" checked={serviceFlags.diagnostic} onChange={v => setServiceFlags({ ...serviceFlags, diagnostic: v })} disabled={locked} />
                  <CheckItem label="UnBundled" checked={serviceFlags.unbundled} onChange={v => setServiceFlags({ ...serviceFlags, unbundled: v, allInclusive: v ? false : serviceFlags.allInclusive })} disabled={locked} />
                  <CheckItem label="All-Inclusive" checked={serviceFlags.allInclusive} onChange={v => setServiceFlags({ ...serviceFlags, allInclusive: v, unbundled: v ? false : serviceFlags.unbundled })} disabled={locked} />
                </div>
              </ClaimCard>
              <ClaimCard title="Service Outcome" className="md:col-span-2">
                <div className="grid grid-cols-1 gap-y-3">
                  {[['DISC', 'Discharged'], ['DIED', 'Died'], ['TRFO', 'Transferred Out'], ['ABS', 'Absconded']].map(([code, label]) => (
                    <CheckItem key={code} label={label} checked={serviceOutcome === code} onChange={() => setServiceOutcome(code)} disabled={locked} />
                  ))}
                </div>
              </ClaimCard>
            </div>

            <ClaimCard title="Type of Attendance">
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {attendanceChoices.map(o => (
                  <CheckItem key={o.code} label={o.label} checked={typeOfAttendance === o.code} onChange={() => setTypeOfAttendance(o.code)} disabled={locked} />
                ))}
              </div>
            </ClaimCard>

            <ClaimCard title="Referral Info">
              <div className="space-y-4">
                <UField label="Referring Facility Name" value={referringFacility} onChange={setReferringFacility} disabled={locked} />
                <UField label="Referral Code / CCC" value={referralCode} onChange={setReferralCode} disabled={locked} />
              </div>
            </ClaimCard>
          </div>

          <div className="space-y-5">
            <ClaimCard title="Dates Of Service">
              {primaryServiceType === 'OPD' ? (
                <div className="space-y-3">
                  {['1st Visit', '2nd Visit', '3rd Visit', '4th Visit'].map((label, idx) => (
                    <UField key={idx} label={idx === 0 ? label : ''} placeholder={label} type="date" value={visitDates[idx] || ''} onChange={v => updateVisitDate(idx, v)} disabled={locked} />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <UField label="Admission Date" type="date" value={admissionDate} onChange={setAdmissionDate} disabled={locked} />
                  <UField label="Discharge Date" type="date" value={dischargeDate} onChange={setDischargeDate} disabled={locked} />
                  <UField label="Length of Stay" value={lengthOfStay > 0 ? `${lengthOfStay} day(s)` : ''} placeholder="—" />
                </div>
              )}
            </ClaimCard>

            <ClaimCard title="Specialties Attended">
              <div className="grid grid-cols-3 gap-x-2 gap-y-3 text-[14px]">
                {SPECIALTIES.map(code => (
                  <CheckItem key={code} label={code} checked={specialties.includes(code)} onChange={v => toggleSpecialty(code, v)} disabled={locked} />
                ))}
              </div>
            </ClaimCard>
          </div>
        </div>

        <ListSection
          title="PROCEDURES"
          count={procedures.length}
          emptyText={procedures.length === 0 ? 'No procedures added...' : undefined}
          open={tablesOpen}
          action={isDraft ? (
            <button type="button" onClick={() => setActiveModal('procedure')} className="text-xs border border-white/60 rounded px-2 py-0.5 hover:bg-white/10 normal-case flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add
            </button>
          ) : undefined}
        >
          <table className="w-full text-sm">
            <thead><tr><TH>#</TH><TH>Code</TH><TH>Description</TH><TH>Date</TH>{isDraft && <TH className="text-center">&nbsp;</TH>}</tr></thead>
            <tbody>
              {procedures.map((pr, idx) => (
                <tr key={idx} className="border-t border-gray-100">
                  <td className="px-3 py-3 text-gray-500">{idx + 1}.</td>
                  <td className="px-3 py-3 text-gray-700">{pr.code || '—'}</td>
                  <td className="px-3 py-3 text-gray-700">{pr.description}</td>
                  <td className="px-3 py-3 text-gray-700">{fmtDate(pr.date)}</td>
                  {isDraft && (
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <button type="button" onClick={() => setEditing({ kind: 'procedure', index: idx })} className="text-blue-400 hover:text-blue-600 mr-2"><Edit className="w-4 h-4" /></button>
                      <button type="button" onClick={() => removeProcedure(idx)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </ListSection>

        <ListSection
          title="DIAGNOSES"
          count={diagnoses.length}
          open={tablesOpen}
          emptyText={diagnoses.length === 0 ? 'No diagnoses added...' : undefined}
          action={isDraft ? (
            <button type="button" onClick={() => setActiveModal('diagnosis')} className="text-xs border border-white/60 rounded px-2 py-0.5 hover:bg-white/10 normal-case flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add
            </button>
          ) : undefined}
        >
          <table className="w-full text-sm">
            <thead><tr><TH>#</TH><TH>GDRG</TH><TH>Description</TH><TH>Diagnosis</TH><TH>ICD10</TH>{isDraft && <TH className="text-center">&nbsp;</TH>}</tr></thead>
            <tbody>
              {diagnoses.map((d, idx) => (
                <tr key={idx} className="border-t border-gray-100">
                  <td className="px-3 py-3 text-gray-500">{idx + 1}.</td>
                  <td className="px-3 py-3 text-gray-700">{d.gdrgCode}</td>
                  <td className="px-3 py-3 text-gray-700">{d.description}</td>
                  <td className="px-3 py-3 text-gray-700">
                    {d.diagnosis}
                    {d.diagnosisType === 'primary'
                      ? <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 align-middle">PRIMARY</span>
                      : isDraft && <button type="button" onClick={() => setPrimaryDiagnosis(idx)} className="ml-2 text-[11px] text-blue-600 hover:underline">set primary</button>}
                  </td>
                  <td className="px-3 py-3 text-gray-700">{d.icd10}</td>
                  {isDraft && (
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <button type="button" onClick={() => setEditing({ kind: 'diagnosis', index: idx })} className="text-blue-400 hover:text-blue-600 mr-2"><Edit className="w-4 h-4" /></button>
                      <button type="button" onClick={() => removeDiagnosis(idx)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </ListSection>

        <ListSection
          title="INVESTIGATIONS"
          count={investigations.length}
          open={tablesOpen}
          emptyText={investigations.length === 0 ? 'No investigations added...' : undefined}
          action={isDraft ? (
            <span className="flex gap-2 normal-case">
              <button type="button" onClick={() => setActiveModal('lab')} className="text-xs border border-white/60 rounded px-2 py-0.5 hover:bg-white/10 flex items-center gap-1"><Plus className="w-3 h-3" /> Lab</button>
              <button type="button" onClick={() => setActiveModal('scan')} className="text-xs border border-white/60 rounded px-2 py-0.5 hover:bg-white/10 flex items-center gap-1"><Plus className="w-3 h-3" /> Scan</button>
            </span>
          ) : undefined}
        >
          <table className="w-full text-sm">
            <thead><tr><TH>#</TH><TH>GDRG</TH><TH>Description</TH><TH>Date</TH>{isDraft && <TH className="text-center">&nbsp;</TH>}</tr></thead>
            <tbody>
              {investigations.map((inv, idx) => (
                <tr key={idx} className="border-t border-gray-100">
                  <td className="px-3 py-3 text-gray-500">{idx + 1}.</td>
                  <td className="px-3 py-3 text-gray-700">{inv.gdrgCode}</td>
                  <td className="px-3 py-3 text-gray-700">{inv.description}</td>
                  <td className="px-3 py-3 text-gray-700">{fmtDate(inv.date)}</td>
                  {isDraft && (
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <button type="button" onClick={() => setEditing({ kind: 'investigation', index: idx })} className="text-blue-400 hover:text-blue-600 mr-2"><Edit className="w-4 h-4" /></button>
                      <button type="button" onClick={() => removeInvestigation(idx)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </ListSection>

        <ListSection
          title="MEDICINES"
          count={medicines.length}
          open={tablesOpen}
          emptyText={medicines.length === 0 ? 'No medicines added...' : undefined}
          action={isDraft ? (
            <button type="button" onClick={() => setActiveModal('medicine')} className="text-xs border border-white/60 rounded px-2 py-0.5 hover:bg-white/10 normal-case flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add
            </button>
          ) : undefined}
        >
          <table className="w-full text-sm">
            <thead><tr><TH>#</TH><TH>Code</TH><TH>Description</TH><TH>Qty</TH><TH>Date</TH>{isDraft && <TH className="text-center">&nbsp;</TH>}</tr></thead>
            <tbody>
              {medicines.map((m, idx) => (
                <tr key={idx} className="border-t border-gray-100 align-top">
                  <td className="px-3 py-3 text-gray-500">{idx + 1}</td>
                  <td className="px-3 py-3 text-gray-700">{m.code}</td>
                  <td className="px-3 py-3 text-gray-700">
                    {m.description}
                    {m.prescription && <div className="text-[10px] italic text-gray-500 mt-0.5">Rx: {m.prescription}</div>}
                  </td>
                  <td className="px-3 py-3 text-gray-700">{m.quantity}</td>
                  <td className="px-3 py-3 text-gray-700">{fmtDate(m.date)}</td>
                  {isDraft && (
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <button type="button" onClick={() => setEditing({ kind: 'medicine', index: idx })} className="text-blue-400 hover:text-blue-600 mr-2"><Edit className="w-4 h-4" /></button>
                      <button type="button" onClick={() => removeMedicine(idx)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </ListSection>

        <ClaimCard title="Principal GDRG">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <Hint>If you are not certain of the Principal GDRG, leave this section blank and the system will automatically identify the most appropriate Principal GDRG for the claim.</Hint>
            <div>
              <label className="block text-[11px] text-gray-500 mb-0.5">Select Principal GDRG</label>
              <SearchableGDRGSelect value={principalGDRG} onChange={handlePrincipalGDRGChange} options={availableGDRGs} disabled={locked} placeholder="Search GDRG by code or description..." />
              <p className="text-[15px] text-gray-700 mt-3">{principalGDRGDescription}</p>
            </div>
          </div>
        </ClaimCard>

        <ClaimCard title="Authorization Codes">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <UField label="Physician Name/ID" value={physicianId} onChange={setPhysicianId} disabled={locked} />
            <UField label="Pre-authorization Code(s)" value={preAuthNumber} onChange={setPreAuthNumber} disabled={locked} />
            <div className="md:col-span-2">
              <UField label="Notes" value={notes} onChange={setNotes} disabled={locked} placeholder="Additional notes…" />
            </div>
          </div>
        </ClaimCard>

        {isFinalized ? (
          <div className="flex justify-end gap-3 bg-white px-5 py-4 border-t border-gray-200">
            <button type="button" onClick={handleDownloadXml} className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Download className="w-4 h-4" /> Download XML</button>
            <button type="button" onClick={handlePrintClaim} className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Printer className="w-4 h-4" /> Print Claim</button>
            <button type="button" onClick={() => navigate('/dashboard/insurance-claims')} className="px-6 py-2 border rounded text-sm" style={{ borderColor: '#ef9a9a', color: '#e57373' }}>Close</button>
          </div>
        ) : (
          <ClaimFooter onCancel={() => navigate('/dashboard/insurance-claims')} onSave={handleSave} saving={isSubmitting} />
        )}
      </ClaimFrame>

      <AddDiagnosisModal isOpen={activeModal === 'diagnosis' || editing?.kind === 'diagnosis'} onClose={closeModal} onAdd={addDiagnosis} editing={editing?.kind === 'diagnosis' ? diagnoses[editing.index] ?? null : null} />
      <AddInvestigationModal isOpen={activeModal === 'lab'} onClose={closeModal} onAdd={addInvestigation} type="lab" />
      <AddInvestigationModal isOpen={activeModal === 'scan'} onClose={closeModal} onAdd={addInvestigation} type="scan" />
      <AddInvestigationModal isOpen={editing?.kind === 'investigation'} onClose={closeModal} onAdd={addInvestigation} type="lab" editing={editing?.kind === 'investigation' ? investigations[editing.index] ?? null : null} />
      <AddMedicineModal isOpen={activeModal === 'medicine' || editing?.kind === 'medicine'} onClose={closeModal} onAdd={addMedicine} editing={editing?.kind === 'medicine' ? medicines[editing.index] ?? null : null} />
      <AddProcedureModal isOpen={activeModal === 'procedure' || editing?.kind === 'procedure'} onClose={closeModal} onAdd={addProcedure} editing={editing?.kind === 'procedure' ? procedures[editing.index] ?? null : null} />
    </>
  );
}