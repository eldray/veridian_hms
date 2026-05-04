// src/components/settings/MedicalServicesManagement.tsx - UPDATED WITH CONSISTENT STYLING
import React, { useState, useEffect } from 'react';
import { useMedicalServicesStore } from '../store/medicalServicesStore';
import CreateEditModal from '../components/CreateEditModal';
import { useToast } from '../store/toastStore';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  FileText, 
  FlaskConical, 
  Scissors, 
  Scan,
  CheckCircle, 
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  getDiagnoses as apiGetDiagnoses,
  getLabTestTemplates as apiGetLabTestTemplates,
  getProcedureTemplates as apiGetProcedureTemplates,
  getScanTemplates as apiGetScanTemplates,
} from '../api';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Total counts state
  const [totalCounts, setTotalCounts] = useState({
    diagnoses: 0,
    labTests: 0,
    procedures: 0,
    scans: 0,
  });
  
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

  // Load all counts when component mounts
  useEffect(() => {
    loadAllCounts();
  }, []);

  const loadAllCounts = async () => {
    try {
      const [allDiagnoses, allLabTests, allProcedures, allScans] = await Promise.all([
        apiGetDiagnoses({ limit: 10000 }),
        apiGetLabTestTemplates({ limit: 10000 }),
        apiGetProcedureTemplates({ limit: 10000 }),
        apiGetScanTemplates({ limit: 10000 }),
      ]);
      
      setTotalCounts({
        diagnoses: Array.isArray(allDiagnoses) ? allDiagnoses.length : 0,
        labTests: Array.isArray(allLabTests) ? allLabTests.length : 0,
        procedures: Array.isArray(allProcedures) ? allProcedures.length : 0,
        scans: Array.isArray(allScans) ? allScans.length : 0,
      });
      
      console.log('Total counts loaded:', {
        diagnoses: Array.isArray(allDiagnoses) ? allDiagnoses.length : 0,
        labTests: Array.isArray(allLabTests) ? allLabTests.length : 0,
        procedures: Array.isArray(allProcedures) ? allProcedures.length : 0,
        scans: Array.isArray(allScans) ? allScans.length : 0,
      });
    } catch (error) {
      console.error('Error loading counts:', error);
    }
  };

  const loadData = async () => {
    try {
      switch (activeTab) {
        case 'diagnoses':
          await getDiagnoses({ limit: 1000 });
          break;
        case 'lab-tests':
          await getLabTestTemplates({ limit: 1000 });
          break;
        case 'procedures':
          await getProcedureTemplates({ limit: 1000 });
          break;
        case 'scans':
          await getScanTemplates({ limit: 1000 });
          break;
      }
    } catch (error: any) {
      toastError('Load failed', `Failed to load ${activeTab}`);
    }
  };

  const loadMetadata = async () => {
    try {
      await Promise.all([
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
      await loadAllCounts(); // Refresh counts
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
      await loadAllCounts(); // Refresh counts
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
      await loadAllCounts(); // Refresh counts
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
    { id: 'diagnoses' as ActiveTab, label: 'Diagnoses', icon: FileText, color: 'purple', count: totalCounts.diagnoses },
    { id: 'lab-tests' as ActiveTab, label: 'Lab Tests', icon: FlaskConical, color: 'blue', count: totalCounts.labTests },
    { id: 'procedures' as ActiveTab, label: 'Procedures', icon: Scissors, color: 'green', count: totalCounts.procedures },
    { id: 'scans' as ActiveTab, label: 'Scans', icon: Scan, color: 'orange', count: totalCounts.scans },
  ];

  const filteredData = getFilteredData();
  const isLoading = getIsLoading();

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const getStatusBadge = (item: any) => {
    const isActive = item.isActive !== false;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        isActive 
          ? 'bg-green-100 text-green-700' 
          : 'bg-yellow-100 text-yellow-700'
      }`}>
        <CheckCircle className="w-3 h-3" />
        {isActive ? 'Active' : 'Pending'}
      </span>
    );
  };

  const getCode = (item: any) => {
    switch (activeTab) {
      case 'diagnoses':
        return `${item.icdCode}${item.gdrgGroupCode ? ` / ${item.gdrgGroupCode}` : ''}`;
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
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-4 gap-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActiveTab = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className={`bg-[var(--bg-card)] rounded-xl p-3 border transition-all text-center ${
                isActiveTab
                  ? `border-[var(--icon-${tab.color}-text)] bg-[var(--icon-${tab.color}-bg)]/10`
                  : 'border-[var(--border-color)] hover:border-[var(--icon-cyan-text)]'
              }`}
            >
              <Icon className={`w-5 h-5 mx-auto mb-1 ${
                isActiveTab ? `text-[var(--icon-${tab.color}-text)]` : 'text-[var(--text-secondary)]'
              }`} />
              <p className={`text-xl font-bold ${
                isActiveTab ? `text-[var(--icon-${tab.color}-text)]` : 'text-[var(--text-primary)]'
              }`}>
                {tab.count}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">{tab.label}</p>
            </button>
          );
        })}
      </div>

      {/* Search and Add Button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-[var(--text-primary)] text-sm"
            />
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add New
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-[var(--icon-cyan-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-[var(--text-secondary)] text-sm">Loading {activeTab}...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
            <h3 className="text-base font-semibold text-[var(--text-secondary)] mb-2">
              No {activeTab} found
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              {searchTerm ? 'Try adjusting your search terms' : `Get started by creating your first ${activeTab.slice(0, -1)}`}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm"
              >
                <Plus className="w-4 h-4" />
                Create {activeTab.slice(0, -1)}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)] text-xs uppercase">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)] text-xs uppercase">Code</th>
                    <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)] text-xs uppercase">Category</th>
                    <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)] text-xs uppercase">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)] text-xs uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {paginatedData.map((item: any) => (
                    <tr key={item.id} className="hover:bg-[var(--bg-main)] transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--text-primary)]">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-[var(--text-secondary)] truncate max-w-xs mt-0.5">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--text-primary)]">
                        {getCode(item)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-[var(--bg-main)] text-[var(--text-secondary)] rounded text-xs">
                          {activeTab === 'lab-tests' && item.specimenType 
                            ? `${item.category} / ${item.specimenType}`
                            : item.category || 'General'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(item)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingItem(item)}
                            className="p-1.5 text-[var(--icon-yellow-text)] hover:bg-[var(--icon-yellow-bg)] rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(item.id)}
                            className="p-1.5 text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-[var(--border-color)] px-4 py-3 flex items-center justify-between flex-wrap gap-3">
                <div className="text-xs text-[var(--text-secondary)]">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredData.length)} of {filteredData.length} items
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs text-[var(--text-secondary)]">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1.5 border border-[var(--border-color)] rounded-lg text-xs bg-[var(--bg-main)] text-[var(--text-primary)]"
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
              </div>
            )}
          </>
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
            scanCategories,
            scanBodyParts,
            scanTypes
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 max-w-md w-full border border-[var(--border-color)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[var(--icon-red-bg)] rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-[var(--icon-red-text)]" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">Delete {activeTab.slice(0, -1)}</h3>
                <p className="text-xs text-[var(--text-secondary)]">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              Are you sure you want to delete this {activeTab.slice(0, -1)}? This will remove it permanently from the system.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-text)] hover:text-white transition-colors text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}