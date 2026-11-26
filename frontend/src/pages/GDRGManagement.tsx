// src/pages/GDRGManagement.tsx - UPDATED with consistent UI theme
// DENSITY PASS (2026-11-15): page was the tallest Settings tab — space-y-6 p-6,
// text-2xl stat cards, p-8 loading/empty states, p-6 modals, gap-6 main grid.
// Now: space-y-3 p-3, stats p-2.5 / text-base / icon 8x8, search p-2.5, table
// cells px-3 py-2, sidebar/details p-3, modals p-4. Logic untouched: every
// filter, pagination, link/unlink, create/edit/delete handler is exactly as before.
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSmartBack } from '../utils/useSmartBack';
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
  X,
  Loader,
  Shield,
  DollarSign,
  Calendar,
  Users,
  CheckCircle,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Stethoscope,
  Scissors,
  Link as LinkIcon,
  Unlink as UnlinkIcon,
  TrendingUp,
  Clock,
  AlertCircle
} from 'lucide-react';
import { FilterSelect, PageHeader, SearchInput } from '../components/ui';
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
  <div className="bg-[var(--bg-card)] rounded-xl p-2.5 border border-[var(--border-color)]">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-base font-bold text-[var(--text-primary)]">{value}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{title}</p>
      </div>
      <div className={`w-8 h-8 ${bgVar} rounded-lg flex items-center justify-center`}>
        <Icon className={`w-4 h-4 ${colorVar}`} />
      </div>
    </div>
  </div>
);

export default function GDRGManagement() {
  const navigate = useNavigate();
  const goBack = useSmartBack('/dashboard');
  const { hasRole } = useAuthStore();
  const { success, error: toastError } = useToast();
  const { tariffs, fetchTariffs, isLoading } = useGDRGTariffStore();
  const { diagnoses, getDiagnoses, isLoading: loadingDiagnoses, procedureTemplates, getProcedureTemplates } = useMedicalServicesStore();
  const [procedures, setProcedures] = useState<any[]>([]);
  const [loadingProcedures, setLoadingProcedures] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMDC, setFilterMDC] = useState<string>('');
  const [filterActive, setFilterActive] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedTariff, setSelectedTariff] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('diagnoses');
  const [formLoading, setFormLoading] = useState(false);
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<any>(null);
  const [linkedDiagnoses, setLinkedDiagnoses] = useState<any[]>([]);
  const [searchDiagnosisTerm, setSearchDiagnosisTerm] = useState('');
  const [linkingLoading, setLinkingLoading] = useState(false);
  const [showProcedureModal, setShowProcedureModal] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState<any>(null);
  const [linkedProcedures, setLinkedProcedures] = useState<any[]>([]);
  const [searchProcedureTerm, setSearchProcedureTerm] = useState('');
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
  // ── Pagination — STANDARD pattern used on every page (Patients / Service Catalog /
  //    Backup / Audit Logs): bottom bar with "Showing X to Y of Z", per-page select,
  //    and Prev + numbered pages + Next. NOT the old centered chevron-only pager.
  const Pagination = () => {
    if (totalPages <= 1) return null;
    const getPageNumbers = () => {
      const pages = [];
      const maxVisible = 5;
      let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
      let endPage = Math.min(totalPages, startPage + maxVisible - 1);
      if (endPage - startPage + 1 < maxVisible) { startPage = Math.max(1, endPage - maxVisible + 1); }
      for (let i = startPage; i <= endPage; i++) { pages.push(i); }
      return pages;
    };
    return (
      <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl">
        <div className="flex flex-1 justify-between sm:hidden">
          <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-main)] disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
          <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-main)] disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div><p className="text-xs text-[var(--text-primary)]">Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(endIndex, totalItems)}</span> of <span className="font-medium">{totalItems}</span> results</p></div>
          <div className="flex items-center gap-3">
            <select value={itemsPerPage} onChange={handleItemsPerPageChange} className="text-sm border border-[var(--border-color)] rounded-lg px-2 py-1 bg-[var(--bg-main)] text-[var(--text-primary)]"><option value={10}>10 per page</option><option value={25}>25 per page</option><option value={50}>50 per page</option><option value={100}>100 per page</option></select>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
              <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="relative inline-flex items-center rounded-l-md px-2 py-2 text-[var(--text-tertiary)] ring-1 ring-inset ring-[var(--border-color)] hover:bg-[var(--bg-main)] focus:z-20 focus:outline-offset-0 disabled:opacity-50"><ChevronLeftIcon className="h-4 w-4" /></button>
              {getPageNumbers().map(page => (<button key={page} onClick={() => handlePageChange(page)} className={`relative inline-flex items-center px-3 py-2 text-sm font-semibold ${currentPage === page ? 'z-10 bg-[var(--icon-cyan-text)] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--icon-cyan-text)]' : 'text-[var(--text-primary)] ring-1 ring-inset ring-[var(--border-color)] hover:bg-[var(--bg-main)] focus:z-20 focus:outline-offset-0'}`}>{page}</button>))}
              <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="relative inline-flex items-center rounded-r-md px-2 py-2 text-[var(--text-tertiary)] ring-1 ring-inset ring-[var(--border-color)] hover:bg-[var(--bg-main)] focus:z-20 focus:outline-offset-0 disabled:opacity-50"><ChevronRightIcon className="h-4 w-4" /></button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  const isAdmin = hasRole(['admin']);
  const stats = {
    total: tariffs.length,
    active: tariffs.filter(t => t.isActive).length,
    mdcCount: new Set(tariffs.map(t => t.mdc)).size,
    withLevels: tariffs.filter(t => t.applicableLevels.length > 0).length
  };
  if (!isAdmin) {
    return (
      <div className="space-y-3 p-3">
        <div className="flex items-center gap-4">
          <button onClick={goBack} className="p-2 hover:bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]">
            <ChevronLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">G-DRG Tariffs</h1>
            <p className="text-sm text-[var(--text-secondary)]">Manage G-DRG tariffs for NHIS claims</p>
          </div>
        </div>
        <div className="bg-[var(--icon-yellow-bg)] border border-[var(--icon-yellow-text)] rounded-xl p-5 text-center">
          <Shield className="w-9 h-9 text-[var(--icon-yellow-text)] mx-auto mb-2" />
          <h2 className="text-base font-bold text-[var(--text-primary)] mb-1">Access Restricted</h2>
          <p className="text-[var(--text-secondary)]">Only administrators can manage G-DRG tariffs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3">
      <PageHeader
        title="G-DRG Tariffs"
        subtitle="Manage NHIS G-DRG tariffs for claims processing"
        icon={Shield}
        accent="green"
        onBack={goBack}
        actions={(
          <>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-3 py-1.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-[var(--icon-cyan-on-text)] transition-all text-sm font-medium">
              <Plus className="w-4 h-4" /> Add Tariff
            </button>
            <button onClick={loadData} disabled={isLoading} className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </>
        )}
      />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <StatCard title="Total Tariffs" value={stats.total} icon={Shield} colorVar="text-[var(--icon-cyan-text)]" bgVar="bg-[var(--icon-cyan-bg)]" />
        <StatCard title="Active" value={stats.active} icon={CheckCircle} colorVar="text-[var(--icon-green-text)]" bgVar="bg-[var(--icon-green-bg)]" />
        <StatCard title="MDC Categories" value={stats.mdcCount} icon={TrendingUp} colorVar="text-[var(--icon-purple-text)]" bgVar="bg-[var(--icon-purple-bg)]" />
        <StatCard title="Provider Levels" value={stats.withLevels} icon={Users} colorVar="text-[var(--icon-orange-text)]" bgVar="bg-[var(--icon-orange-bg)]" />
      </div>
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
        <div className="p-2.5">
          <div className="flex flex-wrap gap-2">
            <SearchInput className="min-w-[200px]" placeholder="Search by code, description, NHIS code..." value={searchTerm} onChange={value => { setSearchTerm(value); setCurrentPage(1); }} />
            <FilterSelect aria-label="MDC filter" value={filterMDC} onChange={value => { setFilterMDC(value); setCurrentPage(1); }} options={[{ value: '', label: 'All MDC' }, ...GDRG_MDC_OPTIONS]} />
            <FilterSelect aria-label="Tariff status filter" value={filterActive} onChange={value => { setFilterActive(value); setCurrentPage(1); }} options={[{ value: 'all', label: 'All Status' }, { value: 'active', label: 'Active Only' }, { value: 'inactive', label: 'Inactive Only' }]} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-center">
              <Loader className="w-7 h-7 animate-spin mx-auto mb-2 text-[var(--icon-cyan-text)]" />
              <p className="text-[var(--text-secondary)] text-sm">Loading tariffs...</p>
            </div>
          ) : filteredTariffs.length === 0 ? (
            <div className="p-6 text-center">
              <Shield className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-2" />
              <p className="text-[var(--text-secondary)] text-sm">No G-DRG tariffs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Code</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">MDC</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Description</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase">Tariff</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Status</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {paginatedTariffs.map(tariff => (
                    <tr key={tariff.gdrgCode} className={`hover:bg-[var(--bg-main)] transition-colors cursor-pointer ${selectedTariff?.gdrgCode === tariff.gdrgCode ? 'bg-[var(--icon-cyan-bg)]' : ''}`} onClick={() => handleViewDetails(tariff)}>
                      <td className="px-3 py-2 font-mono font-medium text-sm text-[var(--text-primary)]">{tariff.gdrgCode}</td>
                      <td className="px-3 py-2"><span className="px-2 py-1 bg-[var(--bg-main)] rounded-lg text-xs text-[var(--text-secondary)]">{getMDCLabel(tariff.mdc)}</span></td>
                      <td className="px-3 py-2 max-w-xs truncate text-sm text-[var(--text-secondary)]">{tariff.description}</td>
                      <td className="px-3 py-2 text-right font-medium text-[var(--icon-green-text)]">GHS {tariff.nhiaTariff.toFixed(2)}</td>
                      <td className="px-3 py-2"><span className={`px-2 py-1 rounded-full text-xs font-medium ${tariff.isActive ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]' : 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]'}`}>{tariff.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center gap-2">
                          <button onClick={() => handleEdit(tariff)} className="p-1.5 text-[var(--icon-yellow-text)] hover:bg-[var(--icon-yellow-bg)] rounded-lg transition-colors" title="Edit"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => setDeleteConfirm(tariff.gdrgCode)} className="p-1.5 text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] rounded-lg transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {selectedTariff && (
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="bg-[var(--bg-main)] px-3 py-2.5 border-b border-[var(--border-color)] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[var(--text-primary)] text-sm">{selectedTariff.gdrgCode}</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-1">{selectedTariff.description}</p>
              </div>
              <button onClick={() => setSelectedTariff(null)} className="p-1.5 hover:bg-[var(--bg-card)] rounded-lg transition-colors"><X className="w-4 h-4 text-[var(--text-secondary)]" /></button>
            </div>
            <div className="flex border-b border-[var(--border-color)]">
              <button onClick={() => setActiveTab('diagnoses')} className={`flex-1 px-3 py-2 text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'diagnoses' ? 'border-b-2 border-[var(--icon-cyan-text)] text-[var(--icon-cyan-text)] font-medium' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}><Stethoscope className="w-4 h-4" />Diagnoses ({linkedDiagnoses.length})</button>
              <button onClick={() => setActiveTab('procedures')} className={`flex-1 px-3 py-2 text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'procedures' ? 'border-b-2 border-[var(--icon-cyan-text)] text-[var(--icon-cyan-text)] font-medium' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}><Scissors className="w-4 h-4" />Procedures ({linkedProcedures.length})</button>
            </div>
            <div className="p-3">
              {activeTab === 'diagnoses' && (
                <>
                  <button onClick={() => setShowDiagnosisModal(true)} className="w-full mb-3 flex items-center justify-center gap-2 px-3 py-1.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-[var(--icon-cyan-on-text)] transition-all text-sm font-medium"><LinkIcon className="w-4 h-4" />Link Diagnosis</button>
                  {linkingLoading ? (
                    <div className="text-center py-6"><Loader className="w-6 h-6 animate-spin mx-auto text-[var(--icon-cyan-text)]" /></div>
                  ) : linkedDiagnoses.length === 0 ? (
                    <div className="text-center py-6"><Stethoscope className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2" /><p className="text-sm text-[var(--text-secondary)]">No diagnoses linked</p></div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {linkedDiagnoses.map((link) => (
                        <div key={link.id} className="flex items-center justify-between p-2.5 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]">
                          <div className="flex-1"><div className="flex items-center gap-2 flex-wrap"><span className="font-medium text-sm text-[var(--text-primary)]">{link.diagnosis?.name || link.name}</span>{link.isPrimary && (<span className="text-xs px-1.5 py-0.5 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-full">Primary</span>)}<span className="text-xs font-mono text-[var(--text-tertiary)]">{link.diagnosis?.icdCode || link.icdCode}</span></div></div>
                          <button onClick={() => handleUnlinkDiagnosis(link.diagnosisId || link.id)} className="p-1.5 text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] rounded-lg transition-colors" title="Unlink"><UnlinkIcon className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              {activeTab === 'procedures' && (
                <>
                  <button onClick={() => setShowProcedureModal(true)} className="w-full mb-3 flex items-center justify-center gap-2 px-3 py-1.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-[var(--icon-cyan-on-text)] transition-all text-sm font-medium"><LinkIcon className="w-4 h-4" />Link Procedure</button>
                  {linkingLoading ? (
                    <div className="text-center py-6"><Loader className="w-6 h-6 animate-spin mx-auto text-[var(--icon-cyan-text)]" /></div>
                  ) : linkedProcedures.length === 0 ? (
                    <div className="text-center py-6"><Scissors className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2" /><p className="text-sm text-[var(--text-secondary)]">No procedures linked</p></div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {linkedProcedures.map((link) => (
                        <div key={link.id} className="flex items-center justify-between p-2.5 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]">
                          <div className="flex-1"><div className="flex items-center gap-2 flex-wrap"><span className="font-medium text-sm text-[var(--text-primary)]">{link.procedure?.name || link.name}</span>{link.isPrimary && (<span className="text-xs px-1.5 py-0.5 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-full">Primary</span>)}<span className="text-xs font-mono text-[var(--text-tertiary)]">{link.procedure?.code || link.code}</span></div></div>
                          <button onClick={() => handleUnlinkProcedure(link.procedureId || link.id)} className="p-1.5 text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] rounded-lg transition-colors" title="Unlink"><UnlinkIcon className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="border-t border-[var(--border-color)] p-3 bg-[var(--bg-main)]">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Tariff Details</h4>
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div><span className="text-[var(--text-secondary)]">NHIA Tariff:</span><p className="font-medium text-[var(--icon-green-text)] mt-0.5">GHS {selectedTariff.nhiaTariff.toFixed(2)}</p></div>
                <div><span className="text-[var(--text-secondary)]">Age Split:</span><p className="font-medium text-[var(--text-primary)] mt-0.5">{selectedTariff.ageSplit === 'A' ? 'Adult (≥12)' : 'Child (<12)'}</p></div>
                <div><span className="text-[var(--text-secondary)]">Effective From:</span><p className="font-medium text-[var(--text-primary)] mt-0.5">{new Date(selectedTariff.effectiveFrom).toLocaleDateString()}</p></div>
                <div><span className="text-[var(--text-secondary)]">Provider Levels:</span><p className="font-medium text-[var(--text-primary)] mt-0.5">{selectedTariff.applicableLevels?.join(', ') || 'All'}</p></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Pagination />
      {showDiagnosisModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden border border-[var(--border-color)]">
            <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-4 py-3 flex justify-between items-center">
              <h3 className="font-bold text-[var(--text-primary)] text-sm">Link Diagnosis to {selectedTariff?.gdrgCode}</h3>
              <button onClick={() => { setShowDiagnosisModal(false); setSearchDiagnosisTerm(''); setSelectedDiagnosis(null); }} className="p-1.5 hover:bg-[var(--bg-main)] rounded-lg"><X className="w-4 h-4 text-[var(--text-secondary)]" /></button>
            </div>
            <div className="p-3">
              <SearchInput className="mb-3" placeholder="Search by diagnosis name or ICD code..." value={searchDiagnosisTerm} onChange={setSearchDiagnosisTerm} />
              <div className="max-h-96 overflow-y-auto space-y-1">
                {loadingDiagnoses ? (
                  <div className="text-center py-6"><Loader className="w-6 h-6 animate-spin mx-auto text-[var(--icon-cyan-text)]" /></div>
                ) : filteredDiagnoses.length === 0 ? (
                  <div className="text-center py-6 text-[var(--text-secondary)] text-sm">{searchDiagnosisTerm ? 'No matching diagnoses found' : 'No diagnoses available'}</div>
                ) : (
                  filteredDiagnoses.map(d => (
                    <button key={d.id} onClick={() => setSelectedDiagnosis(d)} className={`w-full text-left p-2.5 rounded-lg transition-colors ${selectedDiagnosis?.id === d.id ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' : 'hover:bg-[var(--bg-main)]'}`}>
                      <div className="font-medium text-sm">{d.name}</div>
                      <div className="text-xs font-mono text-[var(--text-tertiary)] mt-0.5">ICD-10: {d.icdCode}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
            <div className="border-t border-[var(--border-color)] p-3 flex gap-3">
              <button onClick={handleLinkDiagnosis} disabled={!selectedDiagnosis} className="flex-1 px-3 py-1.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-[var(--icon-cyan-on-text)] disabled:opacity-50 text-sm font-medium">Link Diagnosis</button>
              <button onClick={() => { setShowDiagnosisModal(false); setSelectedDiagnosis(null); setSearchDiagnosisTerm(''); }} className="flex-1 px-3 py-1.5 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
      {showProcedureModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden border border-[var(--border-color)]">
            <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-4 py-3 flex justify-between items-center">
              <h3 className="font-bold text-[var(--text-primary)] text-sm">Link Procedure to {selectedTariff?.gdrgCode}</h3>
              <button onClick={() => { setShowProcedureModal(false); setSearchProcedureTerm(''); setSelectedProcedure(null); }} className="p-1.5 hover:bg-[var(--bg-main)] rounded-lg"><X className="w-4 h-4 text-[var(--text-secondary)]" /></button>
            </div>
            <div className="p-3">
              <SearchInput className="mb-3" placeholder="Search by procedure name or code..." value={searchProcedureTerm} onChange={setSearchProcedureTerm} />
              <div className="max-h-96 overflow-y-auto space-y-1">
                {loadingProcedures ? (
                  <div className="text-center py-6"><Loader className="w-6 h-6 animate-spin mx-auto text-[var(--icon-cyan-text)]" /></div>
                ) : filteredProcedures.length === 0 ? (
                  <div className="text-center py-6 text-[var(--text-secondary)] text-sm">{searchProcedureTerm ? 'No matching procedures found' : 'No procedures available'}</div>
                ) : (
                  filteredProcedures.map(p => (
                    <button key={p.id} onClick={() => setSelectedProcedure(p)} className={`w-full text-left p-2.5 rounded-lg transition-colors ${selectedProcedure?.id === p.id ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' : 'hover:bg-[var(--bg-main)]'}`}>
                      <div className="flex items-center gap-2"><Scissors className="w-4 h-4 text-[var(--text-secondary)]" /><span className="font-medium text-sm">{p.name}</span></div>
                      <div className="text-xs font-mono text-[var(--text-tertiary)] pl-6 mt-0.5">Code: {p.code}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
            <div className="border-t border-[var(--border-color)] p-3 flex gap-3">
              <button onClick={handleLinkProcedure} disabled={!selectedProcedure} className="flex-1 px-3 py-1.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-[var(--icon-cyan-on-text)] disabled:opacity-50 text-sm font-medium">Link Procedure</button>
              <button onClick={() => { setShowProcedureModal(false); setSelectedProcedure(null); setSearchProcedureTerm(''); }} className="flex-1 px-3 py-1.5 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[var(--bg-card)] rounded-xl max-w-3xl w-full my-8 border border-[var(--border-color)]">
            <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-4 py-3 flex justify-between items-center">
              <h2 className="text-base font-bold text-[var(--text-primary)]">{editingItem ? 'Edit G-DRG Tariff' : 'Create New G-DRG Tariff'}</h2>
              <button onClick={handleCancel} className="p-1.5 hover:bg-[var(--bg-main)] rounded-lg"><X className="w-5 h-5 text-[var(--text-secondary)]" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); editingItem ? handleUpdate() : handleCreate(); }} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-[var(--text-primary)] mb-1">G-DRG Code *</label><input type="text" required value={formData.gdrgCode} onChange={e => setFormData({ ...formData, gdrgCode: e.target.value.toUpperCase() })} className="w-full p-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg font-mono text-sm" disabled={!!editingItem} /></div>
                <div><label className="block text-sm font-medium text-[var(--text-primary)] mb-1">MDC Category *</label><select value={formData.mdc} onChange={e => setFormData({ ...formData, mdc: e.target.value as GDRGMDC })} className="w-full p-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm">{GDRG_MDC_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
              </div>
              <div><label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Description *</label><textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full p-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm" required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-[var(--text-primary)] mb-1">NHIA Tariff (GHS) *</label><input type="number" step="0.01" min="0" required value={formData.nhiaTariff} onChange={e => setFormData({ ...formData, nhiaTariff: parseFloat(e.target.value) })} className="w-full p-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Age Split</label><select value={formData.ageSplit} onChange={e => setFormData({ ...formData, ageSplit: e.target.value })} className="w-full p-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm"><option value="A">Adult (≥12 years)</option><option value="C">Child (&lt;12 years)</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Min Age (years)</label><input type="number" min="0" value={formData.minAgeYears || ''} onChange={e => setFormData({ ...formData, minAgeYears: e.target.value ? parseInt(e.target.value) : null })} className="w-full p-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Max Age (years)</label><input type="number" min="0" value={formData.maxAgeYears || ''} onChange={e => setFormData({ ...formData, maxAgeYears: e.target.value ? parseInt(e.target.value) : null })} className="w-full p-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm" /></div>
              </div>
              <div><label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Applicable Provider Levels</label><div className="flex gap-4">{PROVIDER_LEVELS.map(level => (<label key={level.value} className="flex items-center gap-2"><input type="checkbox" checked={formData.applicableLevels.includes(level.value)} onChange={e => { if (e.target.checked) setFormData({ ...formData, applicableLevels: [...formData.applicableLevels, level.value] }); else setFormData({ ...formData, applicableLevels: formData.applicableLevels.filter(l => l !== level.value) }); }} className="rounded border-[var(--border-color)]" /><span className="text-sm text-[var(--text-secondary)]">{level.label}</span></label>))}</div></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-[var(--text-primary)] mb-1">NHIS Service Code</label><input type="text" value={formData.nhisServiceCode} onChange={e => setFormData({ ...formData, nhisServiceCode: e.target.value })} className="w-full p-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Effective From</label><input type="datetime-local" value={formData.effectiveFrom} onChange={e => setFormData({ ...formData, effectiveFrom: e.target.value })} className="w-full p-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Effective To</label><input type="datetime-local" value={formData.effectiveTo} onChange={e => setFormData({ ...formData, effectiveTo: e.target.value })} className="w-full p-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Encounter Category</label><select value={formData.encounterCategory} onChange={e => setFormData({ ...formData, encounterCategory: e.target.value })} className="w-full p-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm"><option value="">All</option>{encounterCategoryOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
              </div>
              <div><label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Attendance Types</label><div className="flex flex-wrap gap-2">{attendanceTypeOptions.map(opt => (<label key={opt.value} className="flex items-center gap-2 px-2 py-1"><input type="checkbox" checked={formData.attendanceTypes.includes(opt.value)} onChange={() => handleAttendanceTypeToggle(opt.value)} className="rounded border-[var(--border-color)]" /><span className="text-sm text-[var(--text-secondary)]">{opt.label}</span></label>))}</div></div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2"><input type="checkbox" checked={formData.isZoomCode} onChange={e => setFormData({ ...formData, isZoomCode: e.target.checked })} className="rounded border-[var(--border-color)]" /><span className="text-sm text-[var(--text-primary)]">Zoom Code (Cross-MDC)</span></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={formData.allowsAddOn} onChange={e => setFormData({ ...formData, allowsAddOn: e.target.checked })} className="rounded border-[var(--border-color)]" /><span className="text-sm text-[var(--text-primary)]">Allows Add-On</span></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={formData.isAntenatal} onChange={e => setFormData({ ...formData, isAntenatal: e.target.checked })} className="rounded border-[var(--border-color)]" /><span className="text-sm text-[var(--text-primary)]">Antenatal</span></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={formData.isDelivery} onChange={e => setFormData({ ...formData, isDelivery: e.target.checked })} className="rounded border-[var(--border-color)]" /><span className="text-sm text-[var(--text-primary)]">Delivery</span></label>
              </div>
              <div><label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Notes</label><textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} className="w-full p-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm" /></div>
              <div className="flex gap-3 pt-3 border-t border-[var(--border-color)]">
                <button type="submit" disabled={formLoading} className="flex-1 px-3 py-1.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-[var(--icon-cyan-on-text)] transition-all text-sm font-medium disabled:opacity-50">{formLoading ? 'Saving...' : (editingItem ? 'Update Tariff' : 'Create Tariff')}</button>
                <button type="button" onClick={handleCancel} className="flex-1 px-3 py-1.5 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm font-medium">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl p-4 max-w-md w-full border border-[var(--border-color)]">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 bg-[var(--icon-red-bg)] rounded-lg flex items-center justify-center"><Trash2 className="w-4 h-4 text-[var(--icon-red-text)]" /></div>
              <div><h3 className="text-base font-bold text-[var(--text-primary)]">Delete G-DRG Tariff</h3><p className="text-sm text-[var(--text-secondary)]">This action cannot be undone.</p></div>
            </div>
            <p className="mb-4 text-[var(--text-secondary)] text-sm">Are you sure you want to delete tariff <strong className="text-[var(--text-primary)]">{deleteConfirm}</strong>?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-3 py-1.5 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm font-medium">Cancel</button>
              <button onClick={handleDelete} className="flex-1 px-3 py-1.5 bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-text)] hover:text-[var(--icon-red-on-text)] transition-all text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
