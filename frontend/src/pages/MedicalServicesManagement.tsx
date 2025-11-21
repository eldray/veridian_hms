// MedicalServicesManagement.tsx
import React, { useState, useEffect } from 'react';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import CreateEditModal from '../components/CreateEditModal';
import { useToast } from '../store/toastStore';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  FileText, 
  FlaskConical, 
  Scissors, 
  Scan,
  X,
  Check,
  AlertCircle
} from 'lucide-react';
import type { 
  Diagnosis, 
  LabTestTemplate, 
  ProcedureTemplate, 
  ScanTemplate,
  DiagnosisCategory,
  DiagnosisVariant,
  LabCategory,
  SpecimenType,
  ProcedureCategory,
  ScanCategory,
  BodyPart
} from '../types';

type ActiveTab = 'diagnoses' | 'lab-tests' | 'procedures' | 'scans';

interface MedicalServicesManagementProps {
  initialTab?: ActiveTab;
}

export default function MedicalServicesManagement({ initialTab = 'diagnoses' }: MedicalServicesManagementProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  const { success, error: toastError } = useToast();
  
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
    loadData();
  }, [activeTab]);

  // Load metadata
  useEffect(() => {
    loadMetadata();
  }, []);

  const loadData = async () => {
    try {
      switch (activeTab) {
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
      toastError('Load failed', `Failed to load ${activeTab}`);
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

  const getCurrentData = () => {
    switch (activeTab) {
      case 'diagnoses': return diagnoses;
      case 'lab-tests': return labTestTemplates;
      case 'procedures': return procedureTemplates;
      case 'scans': return scanTemplates;
      default: return [];
    }
  };

  const getFilteredData = () => {
    const data = getCurrentData();
    if (!searchTerm) return data;

    const term = searchTerm.toLowerCase();
    return data.filter((item: any) => {
      switch (activeTab) {
        case 'diagnoses':
          return (
            item.name?.toLowerCase().includes(term) ||
            item.icdCode?.toLowerCase().includes(term) ||
            item.gdrgCode?.toLowerCase().includes(term)
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

  const handleCreate = async (data: any) => {
    try {
      switch (activeTab) {
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
      await loadData();
    } catch (error: any) {
      toastError('Create failed', error.message || 'Failed to create item');
    }
  };

  const handleEdit = async (data: any) => {
    if (!editingItem) return;

    try {
      switch (activeTab) {
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
      await loadData();
    } catch (error: any) {
      toastError('Update failed', error.message || 'Failed to update item');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      switch (activeTab) {
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
      await loadData();
    } catch (error: any) {
      toastError('Delete failed', error.message || 'Failed to delete item');
    }
  };

  const getIsLoading = () => {
    switch (activeTab) {
      case 'diagnoses': return isLoadingDiagnoses;
      case 'lab-tests': return isLoadingLabTests;
      case 'procedures': return isLoadingProcedures;
      case 'scans': return isLoadingScans;
      default: return false;
    }
  };

  const tabs = [
    { id: 'diagnoses' as ActiveTab, label: 'Diagnoses', icon: FileText, color: 'purple' },
    { id: 'lab-tests' as ActiveTab, label: 'Lab Tests', icon: FlaskConical, color: 'blue' },
    { id: 'procedures' as ActiveTab, label: 'Procedures', icon: Scissors, color: 'green' },
    { id: 'scans' as ActiveTab, label: 'Scans', icon: Scan, color: 'orange' },
  ];

  const filteredData = getFilteredData();
  const isLoading = getIsLoading();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[var(--icon-purple-bg)] rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-[var(--icon-purple-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Medical Services</h1>
            <p className="text-sm text-[var(--text-secondary)]">Manage diagnoses, lab tests, procedures, and scans</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add New
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--border-color)]">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? `border-[var(--icon-${tab.color}-text)] text-[var(--icon-${tab.color}-text)] bg-[var(--icon-${tab.color}-bg)] bg-opacity-20`
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  isActive
                    ? 'bg-[var(--icon-cyan-text)] text-white'
                    : 'bg-[var(--bg-main)] text-[var(--text-secondary)]'
                }`}>
                  {getCurrentData().length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-transparent text-[var(--text-primary)]"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-colors text-[var(--text-primary)]">
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-[var(--icon-cyan-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-[var(--text-secondary)]">Loading {activeTab}...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-semibold text-[var(--text-secondary)] mb-2">
              No {activeTab} found
            </h3>
            <p className="text-[var(--text-secondary)] mb-4">
              {searchTerm ? 'Try adjusting your search terms' : `Get started by creating your first ${activeTab.slice(0, -1)}`}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] px-4 py-2 rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors"
              >
                Create {activeTab.slice(0, -1)}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-color)]">
                  <th className="text-left p-4 font-semibold text-[var(--text-primary)]">Name</th>
                  <th className="text-left p-4 font-semibold text-[var(--text-primary)]">Code</th>
                  <th className="text-left p-4 font-semibold text-[var(--text-primary)]">Category</th>
                  <th className="text-left p-4 font-semibold text-[var(--text-primary)]">Price</th>
                  <th className="text-left p-4 font-semibold text-[var(--text-primary)]">Status</th>
                  <th className="text-left p-4 font-semibold text-[var(--text-primary)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item: any) => (
                  <TableRow
                    key={item.id}
                    item={item}
                    type={activeTab}
                    onEdit={setEditingItem}
                    onDelete={setDeleteConfirm}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingItem) && (
        <CreateEditModal
          type={activeTab}
          item={editingItem}
          onSave={editingItem ? handleEdit : handleCreate}
          onClose={() => {
            setShowCreateModal(false);
            setEditingItem(null);
          }}
          metadata={{
            diagnosisCategories,
            diagnosisVariants,
            scanCategories,
            scanBodyParts,
            scanTypes
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <DeleteConfirmation
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
          itemType={activeTab.slice(0, -1)}
        />
      )}
    </div>
  );
}

// Table Row Component
interface TableRowProps {
  item: any;
  type: ActiveTab;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
}

function TableRow({ item, type, onEdit, onDelete }: TableRowProps) {
  const getStatusBadge = (isPending: boolean) => (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
      isPending 
        ? 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]' 
        : 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]'
    }`}>
      {isPending ? 'Pending' : 'Active'}
    </span>
  );

  const getPrice = (item: any) => {
    switch (type) {
      case 'diagnoses':
        return 'N/A';
      case 'lab-tests':
        return `GHS ${item.cashPrice}`;
      case 'procedures':
        return `GHS ${item.cashPrice}`;
      case 'scans':
        return `GHS ${item.cashPrice}`;
      default:
        return 'N/A';
    }
  };

  const getCode = (item: any) => {
    switch (type) {
      case 'diagnoses':
        return `${item.icdCode} / ${item.gdrgCode}`;
      case 'lab-tests':
        return item.investigationCode;
      case 'procedures':
        return item.procedureCode;
      case 'scans':
        return item.scanCode;
      default:
        return 'N/A';
    }
  };

  return (
    <tr className="border-b border-[var(--border-color)] hover:bg-[var(--bg-main)]">
      <td className="p-4">
        <div>
          <div className="font-medium text-[var(--text-primary)]">{item.name}</div>
          {item.description && (
            <div className="text-sm text-[var(--text-secondary)] truncate max-w-xs">
              {item.description}
            </div>
          )}
        </div>
      </td>
      <td className="p-4 text-[var(--text-primary)] font-mono text-sm">
        {getCode(item)}
      </td>
      <td className="p-4">
        <span className="px-2 py-1 bg-[var(--bg-main)] text-[var(--text-secondary)] rounded text-sm">
          {item.category}
        </span>
      </td>
      <td className="p-4 text-[var(--text-primary)] font-medium">
        {getPrice(item)}
      </td>
      <td className="p-4">
        {getStatusBadge(item.isPending)}
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(item)}
            className="p-2 text-[var(--icon-blue-text)] hover:bg-[var(--icon-blue-bg)] rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="p-2 text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// Delete Confirmation Component
interface DeleteConfirmationProps {
  onConfirm: () => void;
  onCancel: () => void;
  itemType: string;
}

function DeleteConfirmation({ onConfirm, onCancel, itemType }: DeleteConfirmationProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl p-6 max-w-md w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[var(--icon-red-bg)] rounded-lg flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-[var(--icon-red-text)]" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Delete {itemType}</h3>
            <p className="text-sm text-[var(--text-secondary)]">This action cannot be undone</p>
          </div>
        </div>
        
        <p className="text-[var(--text-secondary)] mb-6">
          Are you sure you want to delete this {itemType}? This will remove it permanently from the system.
        </p>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-text)] hover:text-white transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}