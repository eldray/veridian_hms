import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { getCorporateAccounts, getPatients, getServiceCatalog } from '../api';
import { useEstimatesStore } from '../store/estimatesStore';
import { useToast } from '../store/toastStore';

interface FormItem {
  id?: string;
  serviceCatalogId?: string;
  description: string;
  serviceType: string;
  quantity: number;
  unitPrice: number;
  pricingBasis: string;
  vatRate: number;
  isInsuranceCovered: boolean;
  insuranceCoverage: number;
}

const emptyItem = (): FormItem => ({
  description: '',
  serviceType: 'miscellaneous',
  quantity: 1,
  unitPrice: 0,
  pricingBasis: 'cash',
  vatRate: 0,
  isInsuranceCovered: false,
  insuranceCoverage: 0,
});

const asArray = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.services)) return response.services;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
};

export default function EstimateForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const { error: toastError, success } = useToast();
  const { currentEstimate, loadEstimate, createEstimate, updateEstimate } = useEstimatesStore();
  const [patients, setPatients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [corporateAccounts, setCorporateAccounts] = useState<any[]>([]);
  const [patientId, setPatientId] = useState('');
  const [corporateAccountId, setCorporateAccountId] = useState('');
  const [items, setItems] = useState<FormItem[]>([emptyItem()]);
  const [discount, setDiscount] = useState(0);
  const [validityDays, setValidityDays] = useState(7);
  const [notes, setNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadOptions = async () => {
      setIsLoading(true);
      try {
        const [patientResponse, serviceResponse, corporateResponse] = await Promise.all([
          getPatients({ limit: 1000, page: 1 }),
          getServiceCatalog({ isActive: true, limit: 1000, page: 1 }),
          getCorporateAccounts({ isActive: true, limit: 1000, page: 1 }),
        ]);
        setPatients(asArray(patientResponse));
        setServices(asArray(serviceResponse));
        setCorporateAccounts(asArray(corporateResponse));
        if (id) await loadEstimate(id);
      } catch (e: any) {
        toastError('Load failed', e?.response?.data?.message || e.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadOptions();
  }, [id, loadEstimate, toastError]);

  useEffect(() => {
    if (!currentEstimate || currentEstimate.id !== id) return;
    setPatientId(currentEstimate.patientId);
    setCorporateAccountId(currentEstimate.corporateAccountId || '');
    setDiscount(Number(currentEstimate.discount || 0));
    setValidityDays(currentEstimate.validityDays || 7);
    setNotes(currentEstimate.notes || '');
    setTermsAndConditions(currentEstimate.termsAndConditions || '');
    setItems((currentEstimate.items || []).map((item) => ({
      id: item.id,
      serviceCatalogId: item.serviceCatalog?.id,
      description: item.description,
      serviceType: item.serviceType,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice || 0),
      pricingBasis: item.pricingBasis || 'cash',
      vatRate: Number(item.vatRate || 0),
      isInsuranceCovered: item.isInsuranceCovered,
      insuranceCoverage: Number(item.insuranceCoverage || 0),
    })));
  }, [currentEstimate, id]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items]
  );
  const tax = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice * item.vatRate / 100, 0),
    [items]
  );
  const total = subtotal + tax - discount;

  const updateItem = (index: number, patch: Partial<FormItem>) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const selectService = (index: number, serviceId: string) => {
    const service = services.find((candidate) => candidate.id === serviceId);
    if (!service) {
      updateItem(index, { serviceCatalogId: undefined });
      return;
    }
    const pricing = Array.isArray(service.pricing) ? service.pricing[0] : service.pricing;
    updateItem(index, {
      serviceCatalogId: service.id,
      description: service.name || '',
      serviceType: service.serviceType || 'miscellaneous',
      unitPrice: Number(pricing?.cashPrice || service.cashPrice || 0),
    });
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!patientId) return toastError('Validation failed', 'Select a patient.');
    const validItems = items.filter((item) => item.description.trim() && item.quantity > 0);
    if (!validItems.length) return toastError('Validation failed', 'Add at least one line item.');
    setIsSaving(true);
    try {
      const payload = {
        patientId,
        corporateAccountId: corporateAccountId || undefined,
        discount: Math.max(0, discount),
        validityDays: Math.max(1, validityDays),
        notes: notes || undefined,
        termsAndConditions: termsAndConditions || undefined,
        items: validItems.map(({ id: itemId, ...item }) => ({ ...item, id: editing ? itemId : undefined })),
      };
      const saved = editing ? await updateEstimate(id!, payload) : await createEstimate(payload);
      success(editing ? 'Estimate updated' : 'Estimate created');
      navigate(`/dashboard/estimates/${saved.id}`);
    } catch (e: any) {
      toastError('Save failed', e?.response?.data?.message || e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-10 text-center text-gray-500">Loading estimate form…</div>;

  return (
    <form onSubmit={save} className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/dashboard/estimates')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{editing ? 'Edit estimate' : 'New estimate'}</h1>
            <p className="text-sm text-gray-500">Create a draft proforma invoice from priced services.</p>
          </div>
        </div>
        <button disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">
          <Save className="w-4 h-4" /> {isSaving ? 'Saving…' : 'Save draft'}
        </button>
      </div>

      <section className="bg-white border border-gray-200 rounded-xl p-5 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-gray-700">Patient
          <select required value={patientId} onChange={(e) => setPatientId(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2">
            <option value="">Select patient</option>
            {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.folderNumber} — {patient.surname} {patient.otherNames}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-gray-700">Corporate account (optional)
          <select value={corporateAccountId} onChange={(e) => setCorporateAccountId(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2">
            <option value="">No corporate account</option>
            {corporateAccounts.map((account) => <option key={account.id} value={account.id}>{account.companyName} ({account.companyCode})</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-gray-700">Validity (days)
          <input type="number" min="1" value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value))} className="mt-1 w-full border rounded-lg px-3 py-2" />
        </label>
        <label className="text-sm font-medium text-gray-700">Discount (GHS)
          <input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="mt-1 w-full border rounded-lg px-3 py-2" />
        </label>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Line items</h2><button type="button" onClick={() => setItems([...items, emptyItem()])} className="inline-flex items-center gap-1 text-sm text-indigo-600"><Plus className="w-4 h-4" /> Add item</button></div>
        {items.map((item, index) => (
          <div key={item.id || index} className="grid gap-2 md:grid-cols-[2fr_1fr_90px_110px_90px_32px] items-end border-b pb-4">
            <label className="text-xs text-gray-500">Service
              <select value={item.serviceCatalogId || ''} onChange={(e) => selectService(index, e.target.value)} className="mt-1 w-full border rounded-lg px-2 py-2 text-sm">
                <option value="">Custom description</option>
                {services.map((service) => <option key={service.id} value={service.id}>{service.name} ({service.code})</option>)}
              </select>
              <input value={item.description} onChange={(e) => updateItem(index, { description: e.target.value })} className="mt-1 w-full border rounded-lg px-2 py-2 text-sm" placeholder="Description" required />
            </label>
            <label className="text-xs text-gray-500">Pricing basis
              <select value={item.pricingBasis} onChange={(e) => updateItem(index, { pricingBasis: e.target.value })} className="mt-1 w-full border rounded-lg px-2 py-2 text-sm">
                <option value="cash">Cash</option><option value="nhis">NHIS</option><option value="private_insurance">Private insurance</option><option value="corporate">Corporate</option>
              </select>
            </label>
            <label className="text-xs text-gray-500">Qty<input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })} className="mt-1 w-full border rounded-lg px-2 py-2 text-sm" /></label>
            <label className="text-xs text-gray-500">Unit price<input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })} className="mt-1 w-full border rounded-lg px-2 py-2 text-sm" /></label>
            <label className="text-xs text-gray-500">VAT %<input type="number" min="0" step="0.01" value={item.vatRate} onChange={(e) => updateItem(index, { vatRate: Number(e.target.value) })} className="mt-1 w-full border rounded-lg px-2 py-2 text-sm" /></label>
            <button type="button" disabled={items.length === 1} onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))} className="p-2 text-red-500 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        <div className="flex justify-end text-sm"><div className="w-64 space-y-1"><div className="flex justify-between"><span>Subtotal</span><span>GHS {subtotal.toFixed(2)}</span></div><div className="flex justify-between"><span>Tax</span><span>GHS {tax.toFixed(2)}</span></div><div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span>GHS {total.toFixed(2)}</span></div></div></div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-gray-700">Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 min-h-24" /></label>
        <label className="text-sm font-medium text-gray-700">Terms and conditions<textarea value={termsAndConditions} onChange={(e) => setTermsAndConditions(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 min-h-24" /></label>
      </section>
    </form>
  );
}
