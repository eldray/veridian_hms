// src/pages/RequisitionManagement.tsx
import { useEffect, useState } from 'react';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { 
  Plus, 
  Search, 
  ClipboardList, 
  Edit, 
  Trash2, 
  RefreshCw,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Eye // ✅ ADDED MISSING IMPORT
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function RequisitionManagement() {
  const {
    requisitions,
    getRequisitions,
    createRequisition,
    submitRequisition,
    approveRequisition,
    fulfillRequisition,
    deleteRequisition,
    isLoading
  } = useStockStore();
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  // State for search and forms
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedRequisition, setSelectedRequisition] = useState<any>(null);

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    purpose: '',
    urgency: 'routine' as 'routine' | 'urgent' | 'emergency',
    requiredDate: '',
    notes: '',
    requisitionItems: [{
      stockItemId: '',
      quantityRequested: 1,
      purpose: ''
    }]
  });

  useEffect(() => {
    loadRequisitions();
  }, []);

  const loadRequisitions = async () => {
    try {
      await getRequisitions();
    } catch (error) {
      console.error('Failed to load requisitions:', error);
      toastError('Load failed', 'Could not load requisitions');
    }
  };

  // ✅ FIX: Add safe filtering with default empty array
  const filteredRequisitions = (requisitions || []).filter(requisition => {
    const matchesSearch = requisition.requisitionNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         requisition.purpose?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || requisition.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredRequisitions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRequisitions = filteredRequisitions.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createRequisition(formData);
      success('Created', 'Requisition created successfully');
      setShowForm(false);
      resetForm();
      loadRequisitions();
    } catch (error) {
      console.error('Failed to create requisition:', error);
      toastError('Save failed', 'Could not create requisition');
    }
  };

  const handleStatusUpdate = async (id: string, action: string, data?: any) => {
    try {
      switch (action) {
        case 'submit':
          await submitRequisition(id);
          success('Submitted', 'Requisition submitted for approval');
          break;
        case 'approve':
          await approveRequisition(id);
          success('Approved', 'Requisition approved');
          break;
        case 'fulfill':
          await fulfillRequisition(id, data);
          success('Fulfilled', 'Requisition fulfilled');
          break;
        case 'delete':
          if (window.confirm('Delete this requisition?')) {
            await deleteRequisition(id);
            success('Deleted', 'Requisition deleted');
          }
          break;
      }
      loadRequisitions();
    } catch (error) {
      console.error(`Failed to ${action} requisition:`, error);
      toastError('Action failed', `Could not ${action} requisition`);
    }
  };

  const resetForm = () => {
    setFormData({
      purpose: '',
      urgency: 'routine',
      requiredDate: '',
      notes: '',
      requisitionItems: [{
        stockItemId: '',
        quantityRequested: 1,
        purpose: ''
      }]
    });
  };

  const addRequisitionItem = () => {
    setFormData(prev => ({
      ...prev,
      requisitionItems: [
        ...prev.requisitionItems,
        {
          stockItemId: '',
          quantityRequested: 1,
          purpose: ''
        }
      ]
    }));
  };

  const removeRequisitionItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requisitionItems: prev.requisitionItems.filter((_, i) => i !== index)
    }));
  };

  const updateRequisitionItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      requisitionItems: prev.requisitionItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return { bg: 'bg-[var(--icon-gray-bg)]', text: 'text-[var(--icon-gray-text)]', border: 'border-[var(--icon-gray-text)]' };
      case 'submitted': return { bg: 'bg-[var(--icon-blue-bg)]', text: 'text-[var(--icon-blue-text)]', border: 'border-[var(--icon-blue-text)]' };
      case 'approved': return { bg: 'bg-[var(--icon-green-bg)]', text: 'text-[var(--icon-green-text)]', border: 'border-[var(--icon-green-text)]' };
      case 'fulfilled': return { bg: 'bg-[var(--icon-cyan-bg)]', text: 'text-[var(--icon-cyan-text)]', border: 'border-[var(--icon-cyan-text)]' };
      case 'cancelled': return { bg: 'bg-[var(--icon-red-bg)]', text: 'text-[var(--icon-red-text)]', border: 'border-[var(--icon-red-text)]' };
      default: return { bg: 'bg-[var(--icon-gray-bg)]', text: 'text-[var(--icon-gray-text)]', border: 'border-[var(--icon-gray-text)]' };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Clock className="w-3 h-3" />;
      case 'submitted': return <Clock className="w-3 h-3" />;
      case 'approved': return <CheckCircle className="w-3 h-3" />;
      case 'fulfilled': return <CheckCircle className="w-3 h-3" />;
      case 'cancelled': return <XCircle className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  const canEdit = (requisition: any) => {
    return requisition.status === 'draft' && requisition.requestedById === user?.id;
  };

  const canApprove = (requisition: any) => {
    return requisition.status === 'submitted' && user?.role === 'admin';
  };

  const canFulfill = (requisition: any) => {
    return requisition.status === 'approved' && user?.role === 'admin';
  };

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
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Requisitions</h1>
            <p className="text-[var(--text-secondary)] text-sm">Manage internal stock requests</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadRequisitions}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Requisition
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by requisition number or purpose..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Requisitions Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] animate-pulse">
              <div className="h-4 bg-[var(--bg-main)] rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-[var(--bg-main)] rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : filteredRequisitions.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center shadow-sm border border-[var(--border-color)]">
          <ClipboardList className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
          <p className="text-[var(--text-secondary)] text-sm">
            {requisitions === undefined ? 'Loading requisitions...' : 'No requisitions found'}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 inline-flex items-center gap-2 text-[var(--icon-cyan-text)] hover:text-[var(--icon-cyan-text)]/80 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Create First Requisition
          </button>
        </div>
      ) : (
        <>
          <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                  <tr>
                    {['Req Number', 'Purpose', 'Urgency', 'Status', 'Requested', 'Items', 'Actions'].map(header => (
                      <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {paginatedRequisitions.map(requisition => {
                    const statusColor = getStatusColor(requisition.status);
                    return (
                      <tr key={requisition.id} className="hover:bg-[var(--bg-main)] transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
                          {requisition.requisitionNumber}
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                          {requisition.purpose || 'No purpose specified'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs font-bold rounded-full capitalize ${
                            requisition.urgency === 'urgent' 
                              ? 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] border border-[var(--icon-yellow-text)]'
                              : requisition.urgency === 'emergency'
                              ? 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border border-[var(--icon-red-text)]'
                              : 'bg-[var(--icon-gray-bg)] text-[var(--icon-gray-text)] border border-[var(--icon-gray-text)]'
                          }`}>
                            {requisition.urgency}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-bold rounded-full flex items-center gap-1 w-fit ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>
                            {getStatusIcon(requisition.status)}
                            {requisition.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                          {new Date(requisition.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                          {requisition.requisitionItems?.length || 0} items
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {/* View Details */}
                            <button
                              onClick={() => setSelectedRequisition(requisition)}
                              className="p-1.5 text-[var(--icon-cyan-text)] border border-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-bg)]"
                              title="View Details"
                            >
                              <Eye className="w-3 h-3" />
                            </button>

                            {/* Status-specific actions */}
                            {canEdit(requisition) && (
                              <>
                                <button
                                  onClick={() => handleStatusUpdate(requisition.id, 'submit')}
                                  className="p-1.5 text-[var(--icon-blue-text)] border border-[var(--icon-blue-text)] rounded-lg hover:bg-[var(--icon-blue-bg)]"
                                  title="Submit"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                </button>
                                <button
                                  className="p-1.5 text-[var(--icon-yellow-text)] border border-[var(--icon-yellow-text)] rounded-lg hover:bg-[var(--icon-yellow-bg)]"
                                  title="Edit"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                              </>
                            )}

                            {canApprove(requisition) && (
                              <button
                                onClick={() => handleStatusUpdate(requisition.id, 'approve')}
                                className="p-1.5 text-[var(--icon-green-text)] border border-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-bg)]"
                                title="Approve"
                              >
                                <CheckCircle className="w-3 h-3" />
                              </button>
                            )}

                            {canFulfill(requisition) && (
                              <button
                                onClick={() => handleStatusUpdate(requisition.id, 'fulfill', {})}
                                className="p-1.5 text-[var(--icon-cyan-text)] border border-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-bg)]"
                                title="Fulfill"
                              >
                                <CheckCircle className="w-3 h-3" />
                              </button>
                            )}

                            {/* Delete (only for draft or own requisitions) */}
                            {(canEdit(requisition) || user?.role === 'admin') && (
                              <button
                                onClick={() => handleStatusUpdate(requisition.id, 'delete')}
                                className="p-1.5 text-[var(--icon-red-text)] border border-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-bg)]"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {filteredRequisitions.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
              <div className="text-sm text-[var(--text-secondary)]">
                Page {currentPage} of {totalPages}
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Previous
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
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
                      className={`w-8 h-8 rounded-lg text-sm font-medium ${
                        currentPage === pageNum
                          ? 'bg-[var(--icon-cyan-text)] text-white'
                          : 'border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-main)]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Requisition Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
              Create Requisition
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Requisition Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Purpose
                  </label>
                  <input 
                    type="text" 
                    placeholder="Purpose of this requisition"
                    value={formData.purpose}
                    onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                    className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Urgency
                  </label>
                  <select 
                    value={formData.urgency}
                    onChange={e => setFormData({ ...formData, urgency: e.target.value as any })}
                    className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                  >
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Required Date
                  </label>
                  <input 
                    type="date" 
                    value={formData.requiredDate}
                    onChange={e => setFormData({ ...formData, requiredDate: e.target.value })}
                    className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
                  />
                </div>
              </div>

              {/* Requisition Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[var(--text-primary)]">Requested Items</h3>
                  <button
                    type="button"
                    onClick={addRequisitionItem}
                    className="flex items-center gap-2 px-3 py-1 text-[var(--icon-cyan-text)] border border-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-bg)] text-sm"
                  >
                    <Plus className="w-3 h-3" />
                    Add Item
                  </button>
                </div>
                
                <div className="space-y-3">
                  {formData.requisitionItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end p-3 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]">
                      <div className="md:col-span-5">
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Item
                        </label>
                        <select 
                          required
                          value={item.stockItemId}
                          onChange={e => updateRequisitionItem(index, 'stockItemId', e.target.value)}
                          className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                        >
                          <option value="">Select Item</option>
                          {/* Stock items would be populated here */}
                        </select>
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Quantity
                        </label>
                        <input 
                          type="number" 
                          min="1" 
                          required 
                          value={item.quantityRequested}
                          onChange={e => updateRequisitionItem(index, 'quantityRequested', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
                        />
                      </div>
                      <div className="md:col-span-3 flex gap-2">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Purpose
                          </label>
                          <input 
                            type="text" 
                            placeholder="Item purpose"
                            value={item.purpose}
                            onChange={e => updateRequisitionItem(index, 'purpose', e.target.value)}
                            className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
                          />
                        </div>
                        {formData.requisitionItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRequisitionItem(index)}
                            className="p-2 text-[var(--icon-red-text)] border border-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-bg)] self-end"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Additional Notes
                </label>
                <textarea 
                  placeholder="Any additional information..."
                  rows={3}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-[var(--border-color)]">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-5 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm font-medium"
                >
                  Create Requisition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}