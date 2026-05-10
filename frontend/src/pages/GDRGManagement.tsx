// src/pages/GDRGManagement.tsx - COMPLETE WORKING VERSION
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
  Link,
  Unlink as UnlinkIcon
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
  getProceduresByGDRG
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

export default function GDRGManagement() {
  const navigate = useNavigate();
  const { hasRole } = useAuthStore();
  const { success, error: toastError } = useToast();
  const { tariffs, fetchTariffs, isLoading } = useGDRGTariffStore();
  const { diagnoses, getDiagnoses, isLoading: loadingDiagnoses } = useMedicalServicesStore();
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

  // Load procedures from the API
  const loadProcedures = async () => {
    setLoadingProcedures(true);
    try {
      // Use the API client instead of raw fetch
      const response = await fetch('/api/procedure-templates?limit=1000', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      console.log('📦 Procedures loaded:', data);
      
      if (data.data && Array.isArray(data.data)) {
        setProcedures(data.data);
      } else if (Array.isArray(data)) {
        setProcedures(data);
      } else {
        setProcedures([]);
      }
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
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterMDC, filterActive]);

  useEffect(() => {
    if (showDiagnosisModal && diagnoses.length === 0) {
      getDiagnoses();
    }
  }, [showDiagnosisModal, diagnoses.length, getDiagnoses]);

  useEffect(() => {
    if (selectedTariff) {
      loadLinkedDiagnoses();
      loadLinkedProcedures();
    }
  }, [selectedTariff]);

  const loadData = async () => {
    await fetchTariffs();
  };

  // ✅ FIXED: Load linked diagnoses with proper error handling
  const loadLinkedDiagnoses = async () => {
    if (!selectedTariff) return;
    setLinkingLoading(true);
    try {
      console.log('🔍 Loading linked diagnoses for GDRG:', selectedTariff.gdrgCode);
      const response = await getDiagnosesByGDRG(selectedTariff.gdrgCode);
      console.log('📥 Linked diagnoses API response:', response);
      
      // Handle different response formats
      let diagnosesList = [];
      if (response?.data && Array.isArray(response.data)) {
        diagnosesList = response.data;
      } else if (Array.isArray(response)) {
        diagnosesList = response;
      } else {
        diagnosesList = [];
      }
      
      console.log('✅ Processed linked diagnoses:', diagnosesList);
      setLinkedDiagnoses(diagnosesList);
    } catch (error) {
      console.error('Error loading linked diagnoses:', error);
      setLinkedDiagnoses([]);
    } finally {
      setLinkingLoading(false);
    }
  };

  // ✅ FIXED: Load linked procedures
  const loadLinkedProcedures = async () => {
    if (!selectedTariff) return;
    setLinkingLoading(true);
    try {
      console.log('🔍 Loading linked procedures for GDRG:', selectedTariff.gdrgCode);
      const response = await getProceduresByGDRG(selectedTariff.gdrgCode);
      console.log('📥 Linked procedures API response:', response);
      
      let proceduresList = [];
      if (response?.data && Array.isArray(response.data)) {
        proceduresList = response.data;
      } else if (Array.isArray(response)) {
        proceduresList = response;
      } else {
        proceduresList = [];
      }
      
      console.log('✅ Processed linked procedures:', proceduresList);
      setLinkedProcedures(proceduresList);
    } catch (error) {
      console.error('Error loading linked procedures:', error);
      setLinkedProcedures([]);
    } finally {
      setLinkingLoading(false);
    }
  };

  // ✅ FIXED: Link diagnosis
  const handleLinkDiagnosis = async () => {
    if (!selectedTariff || !selectedDiagnosis) {
      toastError('Link Failed', 'Please select a diagnosis first');
      return;
    }
    
    console.log('🔗 Linking diagnosis:', {
      gdrgCode: selectedTariff.gdrgCode,
      diagnosisId: selectedDiagnosis.id,
      diagnosisName: selectedDiagnosis.name,
    });
    
    setLinkingLoading(true);
    try {
      const result = await linkDiagnosisToGDRG(
        selectedTariff.gdrgCode,
        selectedDiagnosis.id,
        linkedDiagnoses.length === 0,
        selectedDiagnosis.icdCode
      );
      
      console.log('📥 Link result:', result);
      
      if (result?.success || result?.id) {
        success('Diagnosis Linked', `${selectedDiagnosis.name} linked successfully`);
        await loadLinkedDiagnoses(); // Refresh the list
        setShowDiagnosisModal(false);
        setSelectedDiagnosis(null);
        setSearchDiagnosisTerm('');
      } else {
        throw new Error(result?.message || 'Link failed');
      }
    } catch (err: any) {
      console.error('❌ Link error:', err);
      toastError('Link Failed', err.message);
    } finally {
      setLinkingLoading(false);
    }
  };

  // ✅ FIXED: Unlink diagnosis
  const handleUnlinkDiagnosis = async (diagnosisId: string) => {
    if (!selectedTariff) return;
    setLinkingLoading(true);
    try {
      console.log('🔗 Unlinking diagnosis:', diagnosisId);
      const result = await unlinkDiagnosisFromGDRG(selectedTariff.gdrgCode, diagnosisId);
      
      if (result?.success) {
        success('Diagnosis Unlinked', 'Removed successfully');
        await loadLinkedDiagnoses();
      } else {
        throw new Error(result?.message || 'Unlink failed');
      }
    } catch (err: any) {
      console.error('❌ Unlink error:', err);
      toastError('Unlink Failed', err.message);
    } finally {
      setLinkingLoading(false);
    }
  };

  // ✅ FIXED: Link procedure
  const handleLinkProcedure = async () => {
    if (!selectedTariff || !selectedProcedure) {
      toastError('Link Failed', 'Please select a procedure first');
      return;
    }
    
    console.log('🔗 Linking procedure:', {
      gdrgCode: selectedTariff.gdrgCode,
      procedureId: selectedProcedure.id,
      procedureName: selectedProcedure.name,
    });
    
    setLinkingLoading(true);
    try {
      const result = await linkProcedureToGDRG(selectedTariff.gdrgCode, {
        procedureId: selectedProcedure.id,
        isPrimary: linkedProcedures.length === 0,
        mappedCode: selectedProcedure.code
      });
      
      console.log('📥 Link procedure result:', result);
      
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
      console.error('❌ Link procedure error:', err);
      toastError('Link Failed', err.message);
    } finally {
      setLinkingLoading(false);
    }
  };

  // ✅ FIXED: Unlink procedure
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
      console.error('❌ Unlink procedure error:', err);
      toastError('Unlink Failed', err.message);
    } finally {
      setLinkingLoading(false);
    }
  };

  // Filter diagnoses for modal (excluding already linked ones)
  const filteredDiagnoses = diagnoses.filter(d => {
    const isAlreadyLinked = linkedDiagnoses.some(link => link.diagnosisId === d.id);
    const matchesSearch = searchDiagnosisTerm === '' || 
      d.name.toLowerCase().includes(searchDiagnosisTerm.toLowerCase()) ||
      d.icdCode.toLowerCase().includes(searchDiagnosisTerm.toLowerCase());
    return matchesSearch && !isAlreadyLinked;
  });

  // Filter procedures for modal (excluding already linked ones)
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
          <p className="text-2xl font-bold">{new Set(tariffs.map(t => t.mdc)).size}</p>
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
            <input 
              type="text" 
              placeholder="Search by code, description..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-10 pr-4 py-2 bg-[var(--bg-main)] border rounded-lg text-sm" 
            />
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

      {/* Results info */}
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
            className="px-2 py-1 bg-[var(--bg-main)] border rounded-lg text-sm"
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
        <div className="lg:col-span-2 bg-[var(--bg-card)] rounded-xl border overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center"><Loader className="w-8 h-8 animate-spin mx-auto mb-3" /><p>Loading tariffs...</p></div>
          ) : filteredTariffs.length === 0 ? (
            <div className="p-8 text-center"><Shield className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" /><p>No G-DRG tariffs found</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-main)] border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">G-DRG Code</th>
                    <th className="px-4 py-3 text-left">MDC</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-right">NHIA Tariff</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedTariffs.map(tariff => (
                    <tr 
                      key={tariff.gdrgCode} 
                      className={`hover:bg-[var(--bg-main)] transition-colors cursor-pointer ${selectedTariff?.gdrgCode === tariff.gdrgCode ? 'bg-[var(--icon-cyan-bg)]' : ''}`}
                      onClick={() => handleViewDetails(tariff)}
                    >
                      <td className="px-4 py-3 font-mono font-bold">{tariff.gdrgCode}</td>
                      <td className="px-4 py-3"><span className="px-2 py-1 bg-gray-100 rounded text-xs">{getMDCLabel(tariff.mdc)}</span></td>
                      <td className="px-4 py-3 max-w-xs truncate">{tariff.description}</td>
                      <td className="px-4 py-3 text-right font-medium">GHS {tariff.nhiaTariff.toFixed(2)}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${tariff.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{tariff.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit(tariff)} className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => setDeleteConfirm(tariff.gdrgCode)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
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
          <div className="bg-[var(--bg-card)] rounded-xl border overflow-hidden">
            <div className="bg-[var(--bg-main)] px-4 py-3 border-b flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[var(--text-primary)]">{selectedTariff.gdrgCode}</h3>
                <p className="text-xs text-[var(--text-secondary)]">{selectedTariff.description}</p>
              </div>
              <button onClick={() => setSelectedTariff(null)} className="p-1 hover:bg-[var(--bg-card)] rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('diagnoses')}
                className={`flex-1 px-4 py-2 text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'diagnoses' ? 'border-b-2 border-[var(--icon-cyan-text)] text-[var(--icon-cyan-text)]' : 'text-[var(--text-secondary)]'}`}
              >
                <Stethoscope className="w-4 h-4" />
                Diagnoses ({linkedDiagnoses.length})
              </button>
              <button
                onClick={() => setActiveTab('procedures')}
                className={`flex-1 px-4 py-2 text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'procedures' ? 'border-b-2 border-[var(--icon-cyan-text)] text-[var(--icon-cyan-text)]' : 'text-[var(--text-secondary)]'}`}
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
                    className="w-full mb-3 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm"
                  >
                    <Link className="w-4 h-4" />
                    Link Diagnosis
                  </button>
                  
                  {linkingLoading ? (
                    <div className="text-center py-8">
                      <Loader className="w-6 h-6 animate-spin mx-auto" />
                    </div>
                  ) : linkedDiagnoses.length === 0 ? (
                    <div className="text-center py-8 text-[var(--text-secondary)] text-sm">
                      <Stethoscope className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      No diagnoses linked
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {linkedDiagnoses.map((link) => (
                        <div key={link.id} className="flex items-center justify-between p-2 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]">
                          <div className="flex items-center gap-2 flex-1">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{link.diagnosis?.name || link.name}</span>
                                {link.isPrimary && (
                                  <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">Primary</span>
                                )}
                              </div>
                              <div className="text-xs text-[var(--text-secondary)] font-mono">{link.diagnosis?.icdCode || link.icdCode}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnlinkDiagnosis(link.diagnosisId || link.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
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
                    className="w-full mb-3 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm"
                  >
                    <Link className="w-4 h-4" />
                    Link Procedure
                  </button>
                  
                  {linkingLoading ? (
                    <div className="text-center py-8">
                      <Loader className="w-6 h-6 animate-spin mx-auto" />
                    </div>
                  ) : linkedProcedures.length === 0 ? (
                    <div className="text-center py-8 text-[var(--text-secondary)] text-sm">
                      <Scissors className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      No procedures linked
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {linkedProcedures.map((link) => (
                        <div key={link.id} className="flex items-center justify-between p-2 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]">
                          <div className="flex items-center gap-2 flex-1">
                            <CheckCircle className="w-4 h-4 text-purple-500" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{link.procedure?.name || link.name}</span>
                                {link.isPrimary && (
                                  <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">Primary</span>
                                )}
                              </div>
                              <div className="text-xs text-[var(--text-secondary)] font-mono">{link.procedure?.code || link.code}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnlinkProcedure(link.procedureId || link.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
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
            <div className="border-t p-4 bg-[var(--bg-main)]">
              <h4 className="text-sm font-semibold mb-2">Tariff Details</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-[var(--text-secondary)]">NHIA Tariff:</span> <span className="font-medium">GHS {selectedTariff.nhiaTariff.toFixed(2)}</span></div>
                <div><span className="text-[var(--text-secondary)]">Age Split:</span> <span className="font-medium">{selectedTariff.ageSplit === 'A' ? 'Adult (≥12)' : 'Child (<12)'}</span></div>
                <div><span className="text-[var(--text-secondary)]">Effective From:</span> <span className="font-medium">{new Date(selectedTariff.effectiveFrom).toLocaleDateString()}</span></div>
                <div><span className="text-[var(--text-secondary)]">Status:</span> <span className={`px-1.5 py-0.5 rounded-full text-xs ${selectedTariff.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{selectedTariff.isActive ? 'Active' : 'Inactive'}</span></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
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
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Link Diagnosis Modal */}
      {showDiagnosisModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto border">
            <div className="sticky top-0 bg-[var(--bg-card)] border-b px-5 py-3 flex justify-between">
              <h3 className="font-bold">Link Diagnosis to {selectedTariff?.gdrgCode}</h3>
              <button onClick={() => { setShowDiagnosisModal(false); setSearchDiagnosisTerm(''); }} className="p-1 hover:bg-[var(--bg-main)] rounded">
                <X className="w-4 h-4" />
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
                  className="w-full pl-10 pr-4 py-2 bg-[var(--bg-main)] border rounded-lg text-sm" 
                />
              </div>
              <div className="max-h-96 overflow-y-auto space-y-1">
                {loadingDiagnoses ? (
                  <div className="text-center py-8"><Loader className="w-6 h-6 animate-spin mx-auto" /></div>
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
                      <div className="text-xs text-[var(--text-secondary)] font-mono">ICD-10: {d.icdCode}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
            <div className="border-t p-4 flex gap-3">
              <button 
                onClick={handleLinkDiagnosis} 
                disabled={!selectedDiagnosis} 
                className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white disabled:opacity-50"
              >
                Link Diagnosis
              </button>
              <button 
                onClick={() => { setShowDiagnosisModal(false); setSelectedDiagnosis(null); setSearchDiagnosisTerm(''); }} 
                className="flex-1 px-4 py-2 border rounded-lg"
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
          <div className="bg-[var(--bg-card)] rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto border">
            <div className="sticky top-0 bg-[var(--bg-card)] border-b px-5 py-3 flex justify-between">
              <h3 className="font-bold">Link Procedure to {selectedTariff?.gdrgCode}</h3>
              <button onClick={() => { setShowProcedureModal(false); setSearchProcedureTerm(''); }} className="p-1 hover:bg-[var(--bg-main)] rounded">
                <X className="w-4 h-4" />
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
                  className="w-full pl-10 pr-4 py-2 bg-[var(--bg-main)] border rounded-lg text-sm" 
                />
              </div>
              <div className="max-h-96 overflow-y-auto space-y-1">
                {loadingProcedures ? (
                  <div className="text-center py-8"><Loader className="w-6 h-6 animate-spin mx-auto" /></div>
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
                        <Scissors className="w-4 h-4" />
                        <div className="font-medium text-sm">{p.name}</div>
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] font-mono pl-6">Code: {p.code}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
            <div className="border-t p-4 flex gap-3">
              <button 
                onClick={handleLinkProcedure} 
                disabled={!selectedProcedure} 
                className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white disabled:opacity-50"
              >
                Link Procedure
              </button>
              <button 
                onClick={() => { setShowProcedureModal(false); setSelectedProcedure(null); setSearchProcedureTerm(''); }} 
                className="flex-1 px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Delete G-DRG Tariff</h3>
                <p className="text-sm text-[var(--text-secondary)]">This action cannot be undone.</p>
              </div>
            </div>
            <p className="mb-6">Are you sure you want to delete tariff <strong>{deleteConfirm}</strong>?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}