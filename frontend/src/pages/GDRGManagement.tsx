// src/pages/GDRGManagement.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGDRGTariffStore } from '../store/gdrgTariffStore';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import {
  ChevronLeft,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  X,
  Save,
  AlertCircle,
  Loader,
  Shield,
  DollarSign,
  Calendar,
  Users,
  Link2,
  Unlink,
  CheckCircle
} from 'lucide-react';
import { GDRGMDC } from '../types';

// GDRG MDC Options (from schema enum)
const GDRG_MDC_OPTIONS = [
  { value: 'ASUR', label: 'Adult Surgery' },
  { value: 'DENT', label: 'Dental and Maxillofacial Surgery' },
  { value: 'ENTH', label: 'Ear, Nose and Throat Surgery' },
  { value: 'INVE', label: 'Investigations' },
  { value: 'MEDI', label: 'Medicine' },
  { value: 'OBGY', label: 'Obstetrics and Gynaecology' },
  { value: 'OPDC', label: 'OPD Consultation' },
  { value: 'OPHT', label: 'Ophthalmology' },
  { value: 'ORTH', label: 'Orthopaedics' },
  { value: 'PAED', label: 'Paediatrics' },
  { value: 'PSUR', label: 'Paediatric Surgery' },
  { value: 'RSUR', label: 'Reconstructive Surgery' },
  { value: 'ZOOM', label: 'Cross-MDC' },
];

// Provider levels for applicability
const PROVIDER_LEVELS = [
  { value: 1, label: 'Tertiary' },
  { value: 2, label: 'Secondary' },
  { value: 3, label: 'Primary' },
];

const attendanceTypeOptions = [
  { value: 'emergency_acute', label: 'Emergency/Acute' },
  { value: 'antenatal', label: 'Antenatal' },
  { value: 'postnatal', label: 'Postnatal' },
  { value: 'chronic_followup', label: 'Chronic Follow-up' },
  { value: 'specialist_consultation', label: 'Specialist Consultation' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'surgery', label: 'Surgery' },
];

const encounterCategoryOptions = [
  { value: 'opd', label: 'OPD' },
  { value: 'ipd', label: 'IPD' },
  { value: 'daycase', label: 'Day Case' },
];

export default function GDRGManagement() {
  const navigate = useNavigate();
  const { user, hasRole } = useAuthStore();
  const { success, error: toastError } = useToast();
  const { tariffs, fetchTariffs, isLoading } = useGDRGTariffStore();
  const { diagnoses, getDiagnoses, isLoading: loadingDiagnoses } = useMedicalServicesStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterMDC, setFilterMDC] = useState<string>('');
  const [filterActive, setFilterActive] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedTariff, setSelectedTariff] = useState<any>(null);
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    gdrgCode: '',
    mdc: 'MEDI' as GDRGMDC,
    description: '',
    nhiaTariff: 0,
    ageSplit: 'A',
    minAgeYears: null as number | null,
    maxAgeYears: null as number | null,
    applicableLevels: [1, 2, 3],
    nhisServiceCode: '',
    isZoomCode: false,
    allowsAddOn: false,
    effectiveFrom: new Date().toISOString().slice(0, 16),
    effectiveTo: '',
    encounterCategory: '',
    attendanceTypes: [] as string[],
    isAntenatal: false,
    isDelivery: false,
    notes: '',
    isActive: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (showDiagnosisModal && diagnoses.length === 0) {
      getDiagnoses();
    }
  }, [showDiagnosisModal, diagnoses.length, getDiagnoses]);

  const loadData = async () => {
    await fetchTariffs();
  };

  const filteredTariffs = tariffs.filter(tariff => {
    const matchesSearch = searchTerm === '' || 
      tariff.gdrgCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tariff.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tariff.nhisServiceCode?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesMDC = filterMDC === '' || tariff.mdc === filterMDC;
    const matchesActive = filterActive === 'all' || 
      (filterActive === 'active' && tariff.isActive) ||
      (filterActive === 'inactive' && !tariff.isActive);
    return matchesSearch && matchesMDC && matchesActive;
  });

const handleCreate = async () => {
  setFormLoading(true);
  try {
    // You need to add createGDRGTariff to your API and store
    // For now, use direct fetch with proper error handling
    const response = await fetch('/api/gdrg-tariffs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const result = await response.json();
    if (result.success) {
      success('GDRG Tariff Created', `${formData.gdrgCode} added successfully`);
      setShowForm(false);
      resetForm();
      await fetchTariffs(); // Refresh the list
    } else {
      throw new Error(result.message || 'Creation failed');
    }
  } catch (err: any) {
    toastError('Create Failed', err.message);
  } finally {
    setFormLoading(false);
  }
};

  const handleUpdate = async () => {
    if (!editingItem) return;
    setFormLoading(true);
    try {
      const response = await fetch(`/api/gdrg-tariffs/${editingItem.gdrgCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const result = await response.json();
      if (result.success) {
        success('GDRG Tariff Updated', `${formData.gdrgCode} updated successfully`);
        setShowForm(false);
        setEditingItem(null);
        resetForm();
        await fetchTariffs();
      } else {
        throw new Error(result.message);
      }
    } catch (err: any) {
      toastError('Update Failed', err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const response = await fetch(`/api/gdrg-tariffs/${deleteConfirm}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        success('GDRG Tariff Deleted', `Tariff removed successfully`);
        setDeleteConfirm(null);
        await fetchTariffs();
      } else {
        throw new Error(result.message);
      }
    } catch (err: any) {
      toastError('Delete Failed', err.message);
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      gdrgCode: item.gdrgCode,
      mdc: item.mdc,
      description: item.description,
      nhiaTariff: item.nhiaTariff,
      ageSplit: item.ageSplit || 'A',
      minAgeYears: item.minAgeYears,
      maxAgeYears: item.maxAgeYears,
      applicableLevels: item.applicableLevels || [1, 2, 3],
      nhisServiceCode: item.nhisServiceCode || '',
      isZoomCode: item.isZoomCode || false,
      allowsAddOn: item.allowsAddOn || false,
      effectiveFrom: item.effectiveFrom ? new Date(item.effectiveFrom).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      effectiveTo: item.effectiveTo ? new Date(item.effectiveTo).toISOString().slice(0, 16) : '',
      encounterCategory: item.encounterCategory || '',
      attendanceTypes: item.attendanceTypes || [],
      isAntenatal: item.isAntenatal || false,
      isDelivery: item.isDelivery || false,
      notes: item.notes || '',
      isActive: item.isActive,
    });
    setShowForm(true);
  };

  const handleAddDiagnosis = async (diagnosisId: string, isPrimary: boolean = false) => {
    if (!selectedTariff) return;
    try {
      const response = await fetch(`/api/gdrg-tariffs/${selectedTariff.gdrgCode}/diagnosis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagnosisId, isPrimary })
      });
      const result = await response.json();
      if (result.success) {
        success('Diagnosis Linked', 'Diagnosis linked to GDRG tariff');
        setShowDiagnosisModal(false);
        setSelectedDiagnosis(null);
        await fetchTariffs();
      } else {
        throw new Error(result.message);
      }
    } catch (err: any) {
      toastError('Link Failed', err.message);
    }
  };

  const handleRemoveDiagnosis = async (gdrgCode: string, diagnosisId: string) => {
    try {
      const response = await fetch(`/api/gdrg-tariffs/${gdrgCode}/diagnosis/${diagnosisId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        success('Diagnosis Unlinked', 'Diagnosis removed from GDRG tariff');
        await fetchTariffs();
      } else {
        throw new Error(result.message);
      }
    } catch (err: any) {
      toastError('Unlink Failed', err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      gdrgCode: '',
      mdc: 'MEDI',
      description: '',
      nhiaTariff: 0,
      ageSplit: 'A',
      minAgeYears: null,
      maxAgeYears: null,
      applicableLevels: [1, 2, 3],
      nhisServiceCode: '',
      isZoomCode: false,
      allowsAddOn: false,
      effectiveFrom: new Date().toISOString().slice(0, 16),
      effectiveTo: '',
      encounterCategory: '',
      attendanceTypes: [],
      isAntenatal: false,
      isDelivery: false,
      notes: '',
      isActive: true,
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingItem(null);
    resetForm();
  };

  const handleAttendanceTypeToggle = (type: string) => {
    setFormData(prev => ({
      ...prev,
      attendanceTypes: prev.attendanceTypes.includes(type)
        ? prev.attendanceTypes.filter(t => t !== type)
        : [...prev.attendanceTypes, type]
    }));
  };

  const getMDCLabel = (mdc: string) => {
    return GDRG_MDC_OPTIONS.find(opt => opt.value === mdc)?.label || mdc;
  };

  const isAdmin = hasRole(['admin']);

  if (!isAdmin) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">G-DRG Tariffs</h1>
              <p className="text-sm text-[var(--text-secondary)]">Manage G-DRG tariffs for NHIS claims</p>
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <Shield className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-yellow-800 mb-2">Access Restricted</h2>
          <p className="text-yellow-700">Only administrators can manage G-DRG tariffs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]">
            <ChevronLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">G-DRG Tariffs</h1>
            <p className="text-sm text-[var(--text-secondary)]">Manage NHIS G-DRG tariffs for claims processing</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-3 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm">
            <Plus className="w-4 h-4" /> Add GDRG Tariff
          </button>
          <button onClick={loadData} disabled={isLoading} className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] text-sm">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-[var(--bg-card)] rounded-xl p-3 border text-center">
          <Shield className="w-5 h-5 text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-bold">{tariffs.length}</p>
          <p className="text-xs text-[var(--text-secondary)]">Total Tariffs</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-3 border text-center">
          <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-bold">{tariffs.filter(t => t.isActive).length}</p>
          <p className="text-xs text-[var(--text-secondary)]">Active</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-3 border text-center">
          <DollarSign className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
          <p className="text-2xl font-bold">{tariffs.length}</p>
          <p className="text-xs text-[var(--text-secondary)]">MDC Categories</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-3 border text-center">
          <Users className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-bold">{tariffs.filter(t => t.applicableLevels.length > 0).length}</p>
          <p className="text-xs text-[var(--text-secondary)]">Provider Levels</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 border">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input type="text" placeholder="Search by code, description..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-[var(--bg-main)] border rounded-lg text-sm" />
          </div>
          <select value={filterMDC} onChange={(e) => setFilterMDC(e.target.value)} className="px-3 py-2 bg-[var(--bg-main)] border rounded-lg text-sm">
            <option value="">All MDC</option>
            {GDRG_MDC_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)} className="px-3 py-2 bg-[var(--bg-main)] border rounded-lg text-sm">
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Tariffs Table */}
      <div className="bg-[var(--bg-card)] rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center"><Loader className="w-8 h-8 animate-spin mx-auto mb-3" /><p>Loading tariffs...</p></div>
        ) : filteredTariffs.length === 0 ? (
          <div className="p-8 text-center"><Shield className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" /><p>No G-DRG tariffs found</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-main)] border-b">
                <tr><th className="px-4 py-3 text-left">G-DRG Code</th><th className="px-4 py-3 text-left">MDC</th><th className="px-4 py-3 text-left">Description</th><th className="px-4 py-3 text-right">NHIA Tariff</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Actions</th></tr>
              </thead>
              <tbody className="divide-y">
                {filteredTariffs.map(tariff => (
                  <tr key={tariff.gdrgCode} className="hover:bg-[var(--bg-main)] transition-colors">
                    <td className="px-4 py-3 font-mono font-bold">{tariff.gdrgCode}</td>
                    <td className="px-4 py-3"><span className="px-2 py-1 bg-gray-100 rounded text-xs">{getMDCLabel(tariff.mdc)}</span></td>
                    <td className="px-4 py-3 max-w-xs truncate">{tariff.description}</td>
                    <td className="px-4 py-3 text-right font-medium">GHS {tariff.nhiaTariff.toFixed(2)}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${tariff.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{tariff.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => handleEdit(tariff)} className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded"><Edit className="w-4 h-4" /></button><button onClick={() => setDeleteConfirm(tariff.gdrgCode)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border">
            <div className="sticky top-0 bg-[var(--bg-card)] border-b px-6 py-4 flex justify-between">
              <h2 className="text-lg font-bold">{editingItem ? 'Edit G-DRG Tariff' : 'Create New G-DRG Tariff'}</h2>
              <button onClick={handleCancel} className="p-1 hover:bg-[var(--bg-main)] rounded"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); editingItem ? handleUpdate() : handleCreate(); }} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">G-DRG Code *</label><input type="text" required value={formData.gdrgCode} onChange={e => setFormData({ ...formData, gdrgCode: e.target.value.toUpperCase() })} className="w-full p-2 bg-[var(--bg-main)] border rounded-lg font-mono" disabled={!!editingItem} /></div>
                <div><label className="block text-sm font-medium mb-1">MDC Category *</label><select value={formData.mdc} onChange={e => setFormData({ ...formData, mdc: e.target.value as GDRGMDC })} className="w-full p-2 bg-[var(--bg-main)] border rounded-lg">{GDRG_MDC_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Description *</label><textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full p-2 bg-[var(--bg-main)] border rounded-lg" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">NHIA Tariff (GHS) *</label><input type="number" step="0.01" min="0" required value={formData.nhiaTariff} onChange={e => setFormData({ ...formData, nhiaTariff: parseFloat(e.target.value) })} className="w-full p-2 bg-[var(--bg-main)] border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Age Split</label><select value={formData.ageSplit} onChange={e => setFormData({ ...formData, ageSplit: e.target.value })} className="w-full p-2 bg-[var(--bg-main)] border rounded-lg"><option value="A">Adult (≥12 years)</option><option value="C">Child (&lt;12 years)</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Min Age (years)</label><input type="number" min="0" value={formData.minAgeYears || ''} onChange={e => setFormData({ ...formData, minAgeYears: e.target.value ? parseInt(e.target.value) : null })} className="w-full p-2 bg-[var(--bg-main)] border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Max Age (years)</label><input type="number" min="0" value={formData.maxAgeYears || ''} onChange={e => setFormData({ ...formData, maxAgeYears: e.target.value ? parseInt(e.target.value) : null })} className="w-full p-2 bg-[var(--bg-main)] border rounded-lg" /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Applicable Provider Levels</label><div className="flex gap-4">{PROVIDER_LEVELS.map(level => (<label key={level.value} className="flex items-center gap-2"><input type="checkbox" checked={formData.applicableLevels.includes(level.value)} onChange={e => { if (e.target.checked) setFormData({ ...formData, applicableLevels: [...formData.applicableLevels, level.value] }); else setFormData({ ...formData, applicableLevels: formData.applicableLevels.filter(l => l !== level.value) }); }} className="rounded" /><span>{level.label}</span></label>))}</div></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">NHIS Service Code</label><input type="text" value={formData.nhisServiceCode} onChange={e => setFormData({ ...formData, nhisServiceCode: e.target.value })} className="w-full p-2 bg-[var(--bg-main)] border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Effective From</label><input type="datetime-local" value={formData.effectiveFrom} onChange={e => setFormData({ ...formData, effectiveFrom: e.target.value })} className="w-full p-2 bg-[var(--bg-main)] border rounded-lg" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Effective To</label><input type="datetime-local" value={formData.effectiveTo} onChange={e => setFormData({ ...formData, effectiveTo: e.target.value })} className="w-full p-2 bg-[var(--bg-main)] border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Encounter Category</label><select value={formData.encounterCategory} onChange={e => setFormData({ ...formData, encounterCategory: e.target.value })} className="w-full p-2 bg-[var(--bg-main)] border rounded-lg"><option value="">All</option>{encounterCategoryOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Attendance Types</label><div className="flex flex-wrap gap-2">{attendanceTypeOptions.map(opt => (<label key={opt.value} className="flex items-center gap-2 px-2 py-1"><input type="checkbox" checked={formData.attendanceTypes.includes(opt.value)} onChange={() => handleAttendanceTypeToggle(opt.value)} className="rounded" />{opt.label}</label>))}</div></div>
              <div className="flex gap-4"><label className="flex items-center gap-2"><input type="checkbox" checked={formData.isZoomCode} onChange={e => setFormData({ ...formData, isZoomCode: e.target.checked })} className="rounded" />Zoom Code (Cross-MDC)</label><label className="flex items-center gap-2"><input type="checkbox" checked={formData.allowsAddOn} onChange={e => setFormData({ ...formData, allowsAddOn: e.target.checked })} className="rounded" />Allows Add-On</label><label className="flex items-center gap-2"><input type="checkbox" checked={formData.isAntenatal} onChange={e => setFormData({ ...formData, isAntenatal: e.target.checked })} className="rounded" />Antenatal</label><label className="flex items-center gap-2"><input type="checkbox" checked={formData.isDelivery} onChange={e => setFormData({ ...formData, isDelivery: e.target.checked })} className="rounded" />Delivery</label></div>
              <div><label className="block text-sm font-medium mb-1">Notes</label><textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} className="w-full p-2 bg-[var(--bg-main)] border rounded-lg" /></div>
              <div className="flex gap-3 pt-4 border-t">
                <button type="submit" disabled={formLoading} className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white">{formLoading ? 'Saving...' : (editingItem ? 'Update' : 'Create')}</button>
                <button type="button" onClick={handleCancel} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"><div className="bg-[var(--bg-card)] rounded-xl p-6 max-w-md w-full"><div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center"><Trash2 className="w-5 h-5 text-red-600" /></div><div><h3 className="text-lg font-bold">Delete G-DRG Tariff</h3><p className="text-sm text-[var(--text-secondary)]">This action cannot be undone.</p></div></div><p className="mb-6">Are you sure you want to delete tariff <strong>{deleteConfirm}</strong>?</p><div className="flex gap-3"><button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button><button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button></div></div></div>)}
    </div>
  );
}