// src/pages/Settings.tsx - COMPLETE WITH ALL TABS
import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import {
  ArrowLeft, Building, Users, Shield, Database, ClipboardList,
  Settings as SettingsIcon, Activity, FlaskConical, Scissors, Scan,
  FileText, Plus, Search, Filter, Edit, Trash2, X, Check, AlertCircle,
  Package, DollarSign, Tag, Grid, List, Palette 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMedicalServicesStore } from '../store/medicalServicesStore';

// Import tab components
import CompanySettingsTab from '../components/settings/CompanySettingsTab';
import UserManagementTab from '../components/settings/UserManagementTab';
import ServiceCatalogTab from '../components/settings/ServiceCatalogTab';
import MedicalServicesManagement from './MedicalServicesManagement';
import NHISConfigTab from '../components/settings/NHISConfigTab';
import BackupRestoreTab from '../components/settings/BackupRestoreTab';
import CreateEditModal from '../components/CreateEditModal';
import GDRGManagement from './GDRGManagement';
import ThemePicker from '../components/ThemePicker';
type MedicalServicesTabType = 'diagnoses' | 'lab-tests' | 'procedures' | 'scans';

export default function Settings() {
  const navigate = useNavigate();
  const { hasRole } = useAuthStore();
  const { error: toastError, success } = useToast();

  const [activeTab, setActiveTab] = useState<'company' | 'users' | 'services' | 'medical' | 'nhis' | 'backup'>('company');
  const [medicalSubTab, setMedicalSubTab] = useState<MedicalServicesTabType>('diagnoses');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const isAdmin = hasRole(['admin']);

  const {
    // Data
    diagnoses,
    labTestTemplates,
    procedureTemplates,
    scanTemplates,
    
    // Loading states
    isLoadingDiagnoses,
    isLoadingLabTests,
    isLoadingProcedures,
    isLoadingScans,
    
    // Metadata
    diagnosisCategories,
    diagnosisVariants,
    scanCategories,
    scanBodyParts,
    scanTypes,
    
    // Actions
    getDiagnoses,
    getLabTestTemplates,
    getProcedureTemplates,
    getScanTemplates,
    createDiagnosis,
    updateDiagnosis,
    deleteDiagnosis,
    createLabTestTemplate,
    updateLabTestTemplate,
    deleteLabTestTemplate,
    createProcedureTemplate,
    updateProcedureTemplate,
    deleteProcedureTemplate,
    createScanTemplate,
    updateScanTemplate,
    deleteScanTemplate,
    getDiagnosisCategories,
    getDiagnosisVariants,
    getScanCategories,
    getScanBodyParts,
    getScanTypes
  } = useMedicalServicesStore();

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'medical') {
      loadMedicalData();
    }
  }, [activeTab, medicalSubTab]);

  // Load metadata
  useEffect(() => {
    loadMetadata();
  }, []);

  const loadMedicalData = async () => {
    try {
      switch (medicalSubTab) {
        case 'diagnoses':
          await getDiagnoses();
          break;
        case 'lab-tests':
          await getLabTestTemplates();
          break;
        case 'procedures':
          await getProcedureTemplates();
          break;
        case 'scans':
          await getScanTemplates();
          break;
      }
    } catch (error: any) {
      toastError('Load failed', `Failed to load ${medicalSubTab}`);
    }
  };

  const loadMetadata = async () => {
    try {
      await Promise.all([
        getDiagnosisCategories(),
        getDiagnosisVariants(),
        getScanCategories(),
        getScanBodyParts(),
        getScanTypes()
      ]);
    } catch (error) {
      console.warn('Some metadata failed to load');
    }
  };

  const getCurrentMedicalData = () => {
    switch (medicalSubTab) {
      case 'diagnoses': return diagnoses;
      case 'lab-tests': return labTestTemplates;
      case 'procedures': return procedureTemplates;
      case 'scans': return scanTemplates;
      default: return [];
    }
  };

  const getFilteredMedicalData = () => {
    const data = getCurrentMedicalData();
    if (!searchTerm) return data;

    const term = searchTerm.toLowerCase();
    return data.filter((item: any) => {
      switch (medicalSubTab) {
        case 'diagnoses':
          return (
            item.name?.toLowerCase().includes(term) ||
            item.icdCode?.toLowerCase().includes(term) ||
            item.gdrgGroupCode?.toLowerCase().includes(term)
          );
        case 'lab-tests':
          return (
            item.name?.toLowerCase().includes(term) ||
            item.investigationCode?.toLowerCase().includes(term) ||
            item.category?.toLowerCase().includes(term)
          );
        case 'procedures':
          return (
            item.name?.toLowerCase().includes(term) ||
            item.procedureCode?.toLowerCase().includes(term) ||
            item.category?.toLowerCase().includes(term)
          );
        case 'scans':
          return (
            item.name?.toLowerCase().includes(term) ||
            item.scanCode?.toLowerCase().includes(term) ||
            item.category?.toLowerCase().includes(term)
          );
        default:
          return false;
      }
    });
  };

  const handleCreateMedical = async (data: any) => {
    try {
      switch (medicalSubTab) {
        case 'diagnoses':
          await createDiagnosis(data);
          success('Diagnosis created', 'Diagnosis added successfully');
          break;
        case 'lab-tests':
          await createLabTestTemplate(data);
          success('Lab test created', 'Lab test template added successfully');
          break;
        case 'procedures':
          await createProcedureTemplate(data);
          success('Procedure created', 'Procedure template added successfully');
          break;
        case 'scans':
          await createScanTemplate(data);
          success('Scan created', 'Scan template added successfully');
          break;
      }
      setShowCreateModal(false);
      await loadMedicalData();
    } catch (error: any) {
      toastError('Create failed', error.message || 'Failed to create item');
    }
  };

  const handleEditMedical = async (data: any) => {
    if (!editingItem) return;

    try {
      switch (medicalSubTab) {
        case 'diagnoses':
          await updateDiagnosis(editingItem.id, data);
          success('Diagnosis updated', 'Diagnosis updated successfully');
          break;
        case 'lab-tests':
          await updateLabTestTemplate(editingItem.id, data);
          success('Lab test updated', 'Lab test template updated successfully');
          break;
        case 'procedures':
          await updateProcedureTemplate(editingItem.id, data);
          success('Procedure updated', 'Procedure template updated successfully');
          break;
        case 'scans':
          await updateScanTemplate(editingItem.id, data);
          success('Scan updated', 'Scan template updated successfully');
          break;
      }
      setEditingItem(null);
      await loadMedicalData();
    } catch (error: any) {
      toastError('Update failed', error.message || 'Failed to update item');
    }
  };

  const handleDeleteMedical = async (id: string) => {
    try {
      switch (medicalSubTab) {
        case 'diagnoses':
          await deleteDiagnosis(id);
          success('Diagnosis deleted', 'Diagnosis removed successfully');
          break;
        case 'lab-tests':
          await deleteLabTestTemplate(id);
          success('Lab test deleted', 'Lab test template removed successfully');
          break;
        case 'procedures':
          await deleteProcedureTemplate(id);
          success('Procedure deleted', 'Procedure template removed successfully');
          break;
        case 'scans':
          await deleteScanTemplate(id);
          success('Scan deleted', 'Scan template removed successfully');
          break;
      }
      setDeleteConfirm(null);
      await loadMedicalData();
    } catch (error: any) {
      toastError('Delete failed', error.message || 'Failed to delete item');
    }
  };

  const getMedicalIsLoading = () => {
    switch (medicalSubTab) {
      case 'diagnoses': return isLoadingDiagnoses;
      case 'lab-tests': return isLoadingLabTests;
      case 'procedures': return isLoadingProcedures;
      case 'scans': return isLoadingScans;
      default: return false;
    }
  };

  const medicalTabs = [
    { id: 'diagnoses' as MedicalServicesTabType, label: 'Diagnoses', icon: FileText, color: 'purple' },
    { id: 'lab-tests' as MedicalServicesTabType, label: 'Lab Tests', icon: FlaskConical, color: 'blue' },
    { id: 'procedures' as MedicalServicesTabType, label: 'Procedures', icon: Scissors, color: 'green' },
    { id: 'scans' as MedicalServicesTabType, label: 'Scans', icon: Scan, color: 'orange' },
  ];

  const mainTabs = [
    { id: 'company' as const, label: 'Company', icon: Building },
    { id: 'users' as const, label: 'Users', icon: Users },
    { id: 'services' as const, label: 'Service Catalog', icon: Package },
    { id: 'medical' as const, label: 'Medical Services', icon: ClipboardList },
    { id: 'gdrg' as const, label: 'G-DRG Tariffs', icon: Shield }, 
    { id: 'nhis' as const, label: 'NHIS', icon: Shield },
    { id: 'appearance' as const, label: 'Appearance',       icon: Palette }, 
    { id: 'backup' as const, label: 'Backup', icon: Database },
  ];

  const filteredMedicalData = getFilteredMedicalData();
  const isLoadingMedical = getMedicalIsLoading();

  if (!isAdmin) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-3 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] rounded-lg transition-all text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">Settings</h1>
              <p className="text-[var(--text-secondary)] text-sm">System configuration</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center border border-[var(--border-color)]">
          <SettingsIcon className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Access Restricted</h2>
          <p className="text-[var(--text-secondary)]">Only administrators can access system settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] rounded-lg transition-all text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">System Settings</h1>
            <p className="text-[var(--text-secondary)] text-sm">Manage hospital configuration and settings</p>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
        <div className="border-b border-[var(--border-color)] overflow-x-auto">
          <nav className="flex">
            {mainTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 py-3 px-4 border-b-2 transition-all text-sm font-medium whitespace-nowrap ${
                  activeTab === id
                    ? 'border-[var(--icon-cyan-text)] text-[var(--icon-cyan-text)] bg-[var(--icon-cyan-bg)]/10'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Company Settings Tab */}
          {activeTab === 'company' && <CompanySettingsTab />}

          {/* User Management Tab */}
          {activeTab === 'users' && <UserManagementTab />}

          {/* Service Catalog Tab */}
          {activeTab === 'services' && <ServiceCatalogTab />}

          {/* Medical Services Management Tab */}
          {activeTab === 'medical' && <MedicalServicesManagement />}
          {activeTab === 'gdrg' && <GDRGManagement />}

          {/* NHIS Config Tab */}
          {activeTab === 'nhis' && <NHISConfigTab />}

          {activeTab === 'appearance' && (
            <div className="max-w-3xl">
              <div className="mb-6">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Appearance</h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Choose a color scheme and display mode. Your preference is saved to this device.
                </p>
              </div>
              <ThemePicker />
            </div>
          )}

          {/* Backup Restore Tab */}
          {activeTab === 'backup' && <BackupRestoreTab />}
        </div>
      </div>
    </div>
  );
}