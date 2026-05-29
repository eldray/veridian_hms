// src/pages/GDRGManagement.tsx - UPDATED with consistent UI theme

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
  X,
  Loader,
  Shield,
  DollarSign,
  Calendar,
  Users,
  CheckCircle,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ChevronsLeft,
  ChevronsRight,
  Stethoscope,
  Scissors,
  Link as LinkIcon,
  Unlink as UnlinkIcon,
  TrendingUp,
  Clock,
  AlertCircle
} from 'lucide-react';
import { GDRGMDC } from '../types';
import { 
  createGDRGTariff,
  updateGDRGTariff,
  deleteGDRGTariff,
  getDiagnosesByGDRG,
  linkDiagnosisToGDRG,
  unlinkDiagnosisFromGDRG,
  linkProcedureToGDRG,
  unlinkProcedureFromGDRG,
  getProceduresByGDRG,
  getProcedureTemplates
} from '../api';

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

const ITEMS_PER_PAGE = 10;

type TabType = 'diagnoses' | 'procedures';

// Stats Card Component
const StatCard = ({ title, value, icon: Icon, colorVar, bgVar }: any) => (
  <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-1">{title}</p>
      </div>
      <div className={`w-10 h-10 ${bgVar} rounded-lg flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${colorVar}`} />
      </div>
    </div>
  </div>
);

export default function GDRGManagement() {
  const navigate = useNavigate();
  const { hasRole } = useAuthStore();
  const { success, error: toastError } = useToast();
  const { tariffs, fetchTariffs, isLoading } = useGDRGTariffStore();
  const { diagnoses, getDiagnoses, isLoading: loadingDiagnoses, procedureTemplates, getProcedureTemplates } = useMedicalServicesStore();
  const [procedures, setProcedures] = useState<any[]>([]);
  const [loadingProcedures, setLoadingProcedures] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMDC, setFilterMDC] = useState<string>('');
  const [filterActive, setFilterActive] = useState<string>('all');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE);
  
  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedTariff, setSelectedTariff] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('diagnoses');
  const [formLoading, setFormLoading] = useState(false);
  
  // Diagnosis linking states
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<any>(null);
  const [linkedDiagnoses, setLinkedDiagnoses] = useState<any[]>([]);
  const [searchDiagnosisTerm, setSearchDiagnosisTerm] = useState('');
  const [linkingLoading, setLinkingLoading] = useState(false);
  
  // Procedure linking states
  const [showProcedureModal, setShowProcedureModal] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState<any>(null);
  const [linkedProcedures, setLinkedProcedures] = useState<any[]>([]);
  const [searchProcedureTerm, setSearchProcedureTerm] = useState('');
  
  // Form data state
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

  // Load procedures from the API using the store
  const loadProcedures = async () => {
    setLoadingProcedures(true);
    try {
      await getProcedureTemplates({ limit: 1000 });
      const { procedureTemplates } = useMedicalServicesStore.getState();
      setProcedures(procedureTemplates);
    } catch (error) {
      console.error('Error loading procedures:', error);
      setProcedures([]);
    } finally {
      setLoadingProcedures(false);
    }
  };

  useEffect(() => {
    loadData();
    loadProcedures();
    getDiagnoses();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterMDC, filterActive]);

  useEffect(() => {
    if (selectedTariff) {
      loadLinkedDiagnoses();
      loadLinkedProcedures();
    }
  }, [selectedTariff]);

  const loadData = async () => {
    await fetchTariffs();
  };

  const loadLinkedDiagnoses = async () => {
    if (!selectedTariff) return;
    setLinkingLoading(true);
    try {
      const response = await getDiagnosesByGDRG(selectedTariff.gdrgCode);
      let diagnosesList = [];
      if (response?.data && Array.isArray(response.data)) {
        diagnosesList = response.data;
      } else if (Array.isArray(response)) {
        diagnosesList = response;
      }
      setLinkedDiagnoses(diagnosesList);
    } catch (error) {
      console.error('Error loading linked diagnoses:', error);
      setLinkedDiagnoses([]);
    } finally {
      setLinkingLoading(false);
    }
  };

  const loadLinkedProcedures = async () => {
    if (!selectedTariff) return;
    setLinkingLoading(true);
    try {
      const response = await getProceduresByGDRG(selectedTariff.gdrgCode);
      let proceduresList = [];
      if (response?.data && Array.isArray(response.data)) {
        proceduresList = response.data;
      } else if (Array.isArray(response)) {
        proceduresList = response;
      }
      setLinkedProcedures(proceduresList);
    } catch (error) {
      console.error('Error loading linked procedures:', error);
      setLinkedProcedures([]);
    } finally {
      setLinkingLoading(false);
    }
  };

  const handleLinkDiagnosis = async () => {
    if (!selectedTariff || !selectedDiagnosis) {
      toastError('Link Failed', 'Please select a diagnosis first');
      return;
    }
    
    setLinkingLoading(true);
    try {
      const result = await linkDiagnosisToGDRG(
        selectedTariff.gdrgCode,
        selectedDiagnosis.id,
        linkedDiagnoses.length === 0,
        selectedDiagnosis.icdCode
      );
      
      if (result?.success || result?.id) {
        success('Diagnosis Linked', `${selectedDiagnosis.name} linked successfully`);
        await loadLinkedDiagnoses();
        setShowDiagnosisModal(false);
        setSelectedDiagnosis(null);
        setSearchDiagnosisTerm('');
      } else {
        throw new Error(result?.message || 'Link failed');
      }
    } catch (err: any) {
      toastError('Link Failed', err.message);
    } finally {
      setLinkingLoading(false);
    }
  };

  const handleUnlinkDiagnosis = async (diagnosisId: string) => {
    if (!selectedTariff) return;
    setLinkingLoading(true);
    try {
      const result = await unlinkDiagnosisFromGDRG(selectedTariff.gdrgCode, diagnosisId);
      if (result?.success) {
        success('Diagnosis Unlinked', 'Removed successfully');
        await loadLinkedDiagnoses();
      } else {
        throw new Error(result?.message || 'Unlink failed');
      }
    } catch (err: any) {
      toastError('Unlink Failed', err.message);
    } finally {
      setLinkingLoading(false);
    }
  };

  const handleLinkProcedure = async () => {
    if (!selectedTariff || !selectedProcedure) {
      toastError('Link Failed', 'Please select a procedure first');
      return;
    }
    
    setLinkingLoading(true);
    try {
      const result = await linkProcedureToGDRG(selectedTariff.gdrgCode, {
        procedureId: selectedProcedure.id,
        isPrimary: linkedProcedures.length === 0,
        mappedCode: selectedProcedure.code
      });
      
      if (result?.success || result?.id) {
        success('Procedure Linked', `${selectedProcedure.name} linked successfully`);
        await loadLinkedProcedures();
        setShowProcedureModal(false);
        setSelectedProcedure(null);
        setSearchProcedureTerm('');
      } else {
        throw new Error(result?.message || 'Link failed');
      }
    } catch (err: any) {
      toastError('Link Failed', err.message);
    } finally {
      setLinkingLoading(false);
    }
  };

  const handleUnlinkProcedure = async (procedureId: string) => {
    if (!selectedTariff) return;
    setLinkingLoading(true);
    try {
      const result = await unlinkProcedureFromGDRG(selectedTariff.gdrgCode, procedureId);
      if (result?.success) {
        success('Procedure Unlinked', 'Removed successfully');
        await loadLinkedProcedures();
      } else {
        throw new Error(result?.message || 'Unlink failed');
      }
    } catch (err: any) {
      toastError('Unlink Failed', err.message);
    } finally {
      setLinkingLoading(false);
    }
  };

  const filteredDiagnoses = diagnoses.filter(d => {
    const isAlreadyLinked = linkedDiagnoses.some(link => link.diagnosisId === d.id);
    const matchesSearch = searchDiagnosisTerm === '' || 
      d.name.toLowerCase().includes(searchDiagnosisTerm.toLowerCase()) ||
      d.icdCode.toLowerCase().includes(searchDiagnosisTerm.toLowerCase());
    return matchesSearch && !isAlreadyLinked;
  });

  const filteredProcedures = procedures.filter(p => {
    const isAlreadyLinked = linkedProcedures.some(link => link.procedureId === p.id);
    const matchesSearch = searchProcedureTerm === '' || 
      p.name.toLowerCase().includes(searchProcedureTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchProcedureTerm.toLowerCase());
    return matchesSearch && !isAlreadyLinked;
  });

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

  const totalItems = filteredTariffs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTariffs = filteredTariffs.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleViewDetails = (tariff: any) => {
    setSelectedTariff(tariff);
    setActiveTab('diagnoses');
  };

  const handleCreate = async () => {
    setFormLoading(true);
    try {
      const result = await createGDRGTariff(formData);
      if (result.success || result.id) {
        success('GDRG Tariff Created', `${formData.gdrgCode} added successfully`);
        setShowForm(false);
        resetForm();
        await fetchTariffs();
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
      const result = await updateGDRGTariff(editingItem.gdrgCode, formData);
      if (result.success || result.id) {
        success('GDRG Tariff Updated', `${formData.gdrgCode} updated successfully`);
        setShowForm(false);
        setEditingItem(null);
        resetForm();
        await fetchTariffs();
        if (selectedTariff?.gdrgCode === editingItem.gdrgCode) {
          setSelectedTariff(null);
        }
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
      const result = await deleteGDRGTariff(deleteConfirm);
      if (result.success) {
        success('GDRG Tariff Deleted', `Tariff removed successfully`);
        setDeleteConfirm(null);
        if (selectedTariff?.gdrgCode === deleteConfirm) {
          setSelectedTariff(null);
        }
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

  // Stats
  const stats = {
    total: tariffs.length,
    active: tariffs.filter(t => t.isActive).length,
    mdcCount: new Set(tariffs.map(t => t.mdc)).size,
    withLevels: tariffs.filter(t => t.applicableLevels.length > 0).length
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]">
            <ChevronLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">G-DRG Tariffs</h1>
            <p className="text-sm text-[var(--text-secondary)]">Manage G-DRG tariffs for NHIS claims</p>
          </div>
        </div>
        <div className="bg-[var(--icon-yellow-bg)] border border-[var(--icon-yellow-text)] rounded-xl p-8 text-center">
          <Shield className="w-12 h-12 text-[var(--icon-yellow-text)] mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Access Restricted</h2>
          <p className="text-[var(--text-secondary)]">Only administrators can manage G-DRG tariffs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-[var(--bg-card)] rounded-lg transition-all border border-[var(--border-color)]"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div className="w-10 h-10 bg-[var(--icon-green-bg)] rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-[var(--icon-green-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">G-DRG Tariffs</h1>
            <p className="text-sm text-[var(--text-secondary)]">Manage NHIS G-DRG tariffs for claims processing</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Add Tariff
          </button>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          title="Total Tariffs" 
          value={stats.total} 
          icon={Shield}
          colorVar="text-[var(--icon-cyan-text)]"
          bgVar="bg-[var(--icon-cyan-bg)]"
        />
        <StatCard 
          title="Active" 
          value={stats.active} 
          icon={CheckCircle}
          colorVar="text-[var(--icon-green-text)]"
          bgVar="bg-[var(--icon-green-bg)]"
        />
        <StatCard 
          title="MDC Categories" 
          value={stats.mdcCount} 
          icon={TrendingUp}
          colorVar="text-[var(--icon-purple-text)]"
          bgVar="bg-[var(--icon-purple-bg)]"
        />
        <StatCard 
          title="Provider Levels" 
          value={stats.withLevels} 
          icon={Users}
          colorVar="text-[var(--icon-orange-text)]"
          bgVar="bg-[var(--icon-orange-bg)]"
        />
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
        <div className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input 
                type="text" 
                placeholder="Search by code, description, NHIS code..." 
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)]"
              />
            </div>
            <select 
              value={filterMDC} 
              onChange={e => { setFilterMDC(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]"
            >
              <option value="">All MDC</option>
              {GDRG_MDC_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <select 
              value={filterActive} 
              onChange={e => { setFilterActive(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results info and Items per page */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-[var(--text-secondary)]">
          Showing <span className="font-medium text-[var(--text-primary)]">{startIndex + 1}</span> to{' '}
          <span className="font-medium text-[var(--text-primary)]">{Math.min(endIndex, totalItems)}</span> of{' '}
          <span className="font-medium text-[var(--text-primary)]">{totalItems}</span> results
        </p>
        <div className="flex items-center gap-2">
          <label className="text-sm text-[var(--text-secondary)]">Show:</label>
          <select
            value={itemsPerPage}
            onChange={handleItemsPerPageChange}
            className="px-2 py-1.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Main Content: Table and Details Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tariffs Table */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader className="w-8 h-8 animate-spin mx-auto mb-3 text-[var(--icon-cyan-text)]" />
              <p className="text-[var(--text-secondary)]">Loading tariffs...</p>
            </div>
          ) : filteredTariffs.length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
              <p className="text-[var(--text-secondary)]">No G-DRG tariffs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">MDC</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase">Tariff</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {paginatedTariffs.map(tariff => (
                    <tr 
                      key={tariff.gdrgCode} 
                      className={`hover:bg-[var(--bg-main)] transition-colors cursor-pointer ${selectedTariff?.gdrgCode === tariff.gdrgCode ? 'bg-[var(--icon-cyan-bg)]' : ''}`}
                      onClick={() => handleViewDetails(tariff)}
                    >
                      <td className="px-4 py-3 font-mono font-medium text-sm text-[var(--text-primary)]">{tariff.gdrgCode}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-[var(--bg-main)] rounded-lg text-xs text-[var(--text-secondary)]">{getMDCLabel(tariff.mdc)}</span>
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-sm text-[var(--text-secondary)]">{tariff.description}</td>
                      <td className="px-4 py-3 text-right font-medium text-[var(--icon-green-text)]">GHS {tariff.nhiaTariff.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${tariff.isActive ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]' : 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]'}`}>
                          {tariff.isActive ? 'Active' : 'Inactive'}
                        </span>
                       </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => handleEdit(tariff)} 
                            className="p-1.5 text-[var(--icon-yellow-text)] hover:bg-[var(--icon-yellow-bg)] rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm(tariff.gdrgCode)} 
                            className="p-1.5 text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                       </td>
                     </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Details Sidebar */}
        {selectedTariff && (
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="bg-[var(--bg-main)] px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[var(--text-primary)]">{selectedTariff.gdrgCode}</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-1">{selectedTariff.description}</p>
              </div>
              <button onClick={() => setSelectedTariff(null)} className="p-1.5 hover:bg-[var(--bg-card)] rounded-lg transition-colors">
                <X className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[var(--border-color)]">
              <button
                onClick={() => setActiveTab('diagnoses')}
                className={`flex-1 px-4 py-2.5 text-sm flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'diagnoses' 
                    ? 'border-b-2 border-[var(--icon-cyan-text)] text-[var(--icon-cyan-text)] font-medium' 
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Stethoscope className="w-4 h-4" />
                Diagnoses ({linkedDiagnoses.length})
              </button>
              <button
                onClick={() => setActiveTab('procedures')}
                className={`flex-1 px-4 py-2.5 text-sm flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'procedures' 
                    ? 'border-b-2 border-[var(--icon-cyan-text)] text-[var(--icon-cyan-text)] font-medium' 
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Scissors className="w-4 h-4" />
                Procedures ({linkedProcedures.length})
              </button>
            </div>

            <div className="p-4">
              {activeTab === 'diagnoses' && (
                <>
                  <button
                    onClick={() => setShowDiagnosisModal(true)}
                    className="w-full mb-3 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Link Diagnosis
                  </button>
                  
                  {linkingLoading ? (
                    <div className="text-center py-8">
                      <Loader className="w-6 h-6 animate-spin mx-auto text-[var(--icon-cyan-text)]" />
                    </div>
                  ) : linkedDiagnoses.length === 0 ? (
                    <div className="text-center py-8">
                      <Stethoscope className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-2" />
                      <p className="text-sm text-[var(--text-secondary)]">No diagnoses linked</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {linkedDiagnoses.map((link) => (
                        <div key={link.id} className="flex items-center justify-between p-3 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm text-[var(--text-primary)]">{link.diagnosis?.name || link.name}</span>
                              {link.isPrimary && (
                                <span className="text-xs px-1.5 py-0.5 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-full">Primary</span>
                              )}
                              <span className="text-xs font-mono text-[var(--text-tertiary)]">{link.diagnosis?.icdCode || link.icdCode}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnlinkDiagnosis(link.diagnosisId || link.id)}
                            className="p-1.5 text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] rounded-lg transition-colors"
                            title="Unlink"
                          >
                            <UnlinkIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'procedures' && (
                <>
                  <button
                    onClick={() => setShowProcedureModal(true)}
                    className="w-full mb-3 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Link Procedure
                  </button>
                  
                  {linkingLoading ? (
                    <div className="text-center py-8">
                      <Loader className="w-6 h-6 animate-spin mx-auto text-[var(--icon-cyan-text)]" />
                    </div>
                  ) : linkedProcedures.length === 0 ? (
                    <div className="text-center py-8">
                      <Scissors className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-2" />
                      <p className="text-sm text-[var(--text-secondary)]">No procedures linked</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {linkedProcedures.map((link) => (
                        <div key={link.id} className="flex items-center justify-between p-3 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm text-[var(--text-primary)]">{link.procedure?.name || link.name}</span>
                              {link.isPrimary && (
                                <span className="text-xs px-1.5 py-0.5 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-full">Primary</span>
                              )}
                              <span className="text-xs font-mono text-[var(--text-tertiary)]">{link.procedure?.code || link.code}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnlinkProcedure(link.procedureId || link.id)}
                            className="p-1.5 text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] rounded-lg transition-colors"
                            title="Unlink"
                          >
                            <UnlinkIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Tariff Details */}
            <div className="border-t border-[var(--border-color)] p-4 bg-[var(--bg-main)]">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Tariff Details</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[var(--text-secondary)]">NHIA Tariff:</span>
                  <p className="font-medium text-[var(--icon-green-text)] mt-0.5">GHS {selectedTariff.nhiaTariff.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)]">Age Split:</span>
                  <p className="font-medium text-[var(--text-primary)] mt-0.5">{selectedTariff.ageSplit === 'A' ? 'Adult (≥12)' : 'Child (<12)'}</p>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)]">Effective From:</span>
                  <p className="font-medium text-[var(--text-primary)] mt-0.5">{new Date(selectedTariff.effectiveFrom).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)]">Provider Levels:</span>
                  <p className="font-medium text-[var(--text-primary)] mt-0.5">{selectedTariff.applicableLevels?.join(', ') || 'All'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50 transition-colors"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50 transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`min-w-[32px] h-8 px-2 rounded-lg text-sm transition-all ${
                    currentPage === pageNum
                      ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] font-medium'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-main)]'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50 transition-colors"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50 transition-colors"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Link Diagnosis Modal */}
      {showDiagnosisModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden border border-[var(--border-color)]">
            <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-5 py-4 flex justify-between items-center">
              <h3 className="font-bold text-[var(--text-primary)]">Link Diagnosis to {selectedTariff?.gdrgCode}</h3>
              <button onClick={() => { setShowDiagnosisModal(false); setSearchDiagnosisTerm(''); setSelectedDiagnosis(null); }} className="p-1.5 hover:bg-[var(--bg-main)] rounded-lg">
                <X className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            </div>
            <div className="p-4">
              <div className="relative mb-4">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input 
                  type="text" 
                  placeholder="Search by diagnosis name or ICD code..." 
                  value={searchDiagnosisTerm} 
                  onChange={(e) => setSearchDiagnosisTerm(e.target.value)} 
                  className="w-full pl-10 pr-4 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]"
                />
              </div>
              <div className="max-h-96 overflow-y-auto space-y-1">
                {loadingDiagnoses ? (
                  <div className="text-center py-8"><Loader className="w-6 h-6 animate-spin mx-auto text-[var(--icon-cyan-text)]" /></div>
                ) : filteredDiagnoses.length === 0 ? (
                  <div className="text-center py-8 text-[var(--text-secondary)]">
                    {searchDiagnosisTerm ? 'No matching diagnoses found' : 'No diagnoses available'}
                  </div>
                ) : (
                  filteredDiagnoses.map(d => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDiagnosis(d)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedDiagnosis?.id === d.id 
                          ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' 
                          : 'hover:bg-[var(--bg-main)]'
                      }`}
                    >
                      <div className="font-medium text-sm">{d.name}</div>
                      <div className="text-xs font-mono text-[var(--text-tertiary)] mt-0.5">ICD-10: {d.icdCode}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
            <div className="border-t border-[var(--border-color)] p-4 flex gap-3">
              <button 
                onClick={handleLinkDiagnosis} 
                disabled={!selectedDiagnosis} 
                className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white disabled:opacity-50 text-sm font-medium"
              >
                Link Diagnosis
              </button>
              <button 
                onClick={() => { setShowDiagnosisModal(false); setSelectedDiagnosis(null); setSearchDiagnosisTerm(''); }} 
                className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Procedure Modal */}
      {showProcedureModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden border border-[var(--border-color)]">
            <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-5 py-4 flex justify-between items-center">
              <h3 className="font-bold text-[var(--text-primary)]">Link Procedure to {selectedTariff?.gdrgCode}</h3>
              <button onClick={() => { setShowProcedureModal(false); setSearchProcedureTerm(''); setSelectedProcedure(null); }} className="p-1.5 hover:bg-[var(--bg-main)] rounded-lg">
                <X className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            </div>
            <div className="p-4">
              <div className="relative mb-4">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input 
                  type="text" 
                  placeholder="Search by procedure name or code..." 
                  value={searchProcedureTerm} 
                  onChange={(e) => setSearchProcedureTerm(e.target.value)} 
                  className="w-full pl-10 pr-4 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]"
                />
              </div>
              <div className="max-h-96 overflow-y-auto space-y-1">
                {loadingProcedures ? (
                  <div className="text-center py-8"><Loader className="w-6 h-6 animate-spin mx-auto text-[var(--icon-cyan-text)]" /></div>
                ) : filteredProcedures.length === 0 ? (
                  <div className="text-center py-8 text-[var(--text-secondary)]">
                    {searchProcedureTerm ? 'No matching procedures found' : 'No procedures available'}
                  </div>
                ) : (
                  filteredProcedures.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProcedure(p)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedProcedure?.id === p.id 
                          ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' 
                          : 'hover:bg-[var(--bg-main)]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Scissors className="w-4 h-4 text-[var(--text-secondary)]" />
                        <span className="font-medium text-sm">{p.name}</span>
                      </div>
                      <div className="text-xs font-mono text-[var(--text-tertiary)] pl-6 mt-0.5">Code: {p.code}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
            <div className="border-t border-[var(--border-color)] p-4 flex gap-3">
              <button 
                onClick={handleLinkProcedure} 
                disabled={!selectedProcedure} 
                className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white disabled:opacity-50 text-sm font-medium"
              >
                Link Procedure
              </button>
              <button 
                onClick={() => { setShowProcedureModal(false); setSelectedProcedure(null); setSearchProcedureTerm(''); }} 
                className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[var(--bg-card)] rounded-xl max-w-3xl w-full my-8 border border-[var(--border-color)]">
            <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">{editingItem ? 'Edit G-DRG Tariff' : 'Create New G-DRG Tariff'}</h2>
              <button onClick={handleCancel} className="p-1.5 hover:bg-[var(--bg-main)] rounded-lg">
                <X className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); editingItem ? handleUpdate() : handleCreate(); }} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">G-DRG Code *</label>
                  <input type="text" required value={formData.gdrgCode} onChange={e => setFormData({ ...formData, gdrgCode: e.target.value.toUpperCase() })} className="w-full p-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg font-mono text-sm" disabled={!!editingItem} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">MDC Category *</label>
                  <select value={formData.mdc} onChange={e => setFormData({ ...formData, mdc: e.target.value as GDRGMDC })} className="w-full p-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm">
                    {GDRG_MDC_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Description *</label>
                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full p-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">NHIA Tariff (GHS) *</label>
                  <input type="number" step="0.01" min="0" required value={formData.nhiaTariff} onChange={e => setFormData({ ...formData, nhiaTariff: parseFloat(e.target.value) })} className="w-full p-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Age Split</label>
                  <select value={formData.ageSplit} onChange={e => setFormData({ ...formData, ageSplit: e.target.value })} className="w-full p-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm">
                    <option value="A">Adult (≥12 years)</option>
                    <option value="C">Child (&lt;12 years)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Min Age (years)</label>
                  <input type="number" min="0" value={formData.minAgeYears || ''} onChange={e => setFormData({ ...formData, minAgeYears: e.target.value ? parseInt(e.target.value) : null })} className="w-full p-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Max Age (years)</label>
                  <input type="number" min="0" value={formData.maxAgeYears || ''} onChange={e => setFormData({ ...formData, maxAgeYears: e.target.value ? parseInt(e.target.value) : null })} className="w-full p-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Applicable Provider Levels</label>
                <div className="flex gap-4">
                  {PROVIDER_LEVELS.map(level => (
                    <label key={level.value} className="flex items-center gap-2">
                      <input type="checkbox" checked={formData.applicableLevels.includes(level.value)} onChange={e => { if (e.target.checked) setFormData({ ...formData, applicableLevels: [...formData.applicableLevels, level.value] }); else setFormData({ ...formData, applicableLevels: formData.applicableLevels.filter(l => l !== level.value) }); }} className="rounded border-[var(--border-color)]" />
                      <span className="text-sm text-[var(--text-secondary)]">{level.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">NHIS Service Code</label>
                  <input type="text" value={formData.nhisServiceCode} onChange={e => setFormData({ ...formData, nhisServiceCode: e.target.value })} className="w-full p-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Effective From</label>
                  <input type="datetime-local" value={formData.effectiveFrom} onChange={e => setFormData({ ...formData, effectiveFrom: e.target.value })} className="w-full p-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Effective To</label>
                  <input type="datetime-local" value={formData.effectiveTo} onChange={e => setFormData({ ...formData, effectiveTo: e.target.value })} className="w-full p-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Encounter Category</label>
                  <select value={formData.encounterCategory} onChange={e => setFormData({ ...formData, encounterCategory: e.target.value })} className="w-full p-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm">
                    <option value="">All</option>
                    {encounterCategoryOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Attendance Types</label>
                <div className="flex flex-wrap gap-2">
                  {attendanceTypeOptions.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 px-2 py-1">
                      <input type="checkbox" checked={formData.attendanceTypes.includes(opt.value)} onChange={() => handleAttendanceTypeToggle(opt.value)} className="rounded border-[var(--border-color)]" />
                      <span className="text-sm text-[var(--text-secondary)]">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={formData.isZoomCode} onChange={e => setFormData({ ...formData, isZoomCode: e.target.checked })} className="rounded border-[var(--border-color)]" />
                  <span className="text-sm text-[var(--text-primary)]">Zoom Code (Cross-MDC)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={formData.allowsAddOn} onChange={e => setFormData({ ...formData, allowsAddOn: e.target.checked })} className="rounded border-[var(--border-color)]" />
                  <span className="text-sm text-[var(--text-primary)]">Allows Add-On</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={formData.isAntenatal} onChange={e => setFormData({ ...formData, isAntenatal: e.target.checked })} className="rounded border-[var(--border-color)]" />
                  <span className="text-sm text-[var(--text-primary)]">Antenatal</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={formData.isDelivery} onChange={e => setFormData({ ...formData, isDelivery: e.target.checked })} className="rounded border-[var(--border-color)]" />
                  <span className="text-sm text-[var(--text-primary)]">Delivery</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Notes</label>
                <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} className="w-full p-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm" />
              </div>
              <div className="flex gap-3 pt-4 border-t border-[var(--border-color)]">
                <button type="submit" disabled={formLoading} className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium disabled:opacity-50">
                  {formLoading ? 'Saving...' : (editingItem ? 'Update Tariff' : 'Create Tariff')}
                </button>
                <button type="button" onClick={handleCancel} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm font-medium">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 max-w-md w-full border border-[var(--border-color)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[var(--icon-red-bg)] rounded-lg flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-[var(--icon-red-text)]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Delete G-DRG Tariff</h3>
                <p className="text-sm text-[var(--text-secondary)]">This action cannot be undone.</p>
              </div>
            </div>
            <p className="mb-6 text-[var(--text-secondary)]">Are you sure you want to delete tariff <strong className="text-[var(--text-primary)]">{deleteConfirm}</strong>?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm font-medium">
                Cancel
              </button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-text)] hover:text-white transition-all text-sm font-medium">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}