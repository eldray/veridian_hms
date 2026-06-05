// src/pages/FamilyPlanning.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFamilyPlanningStore } from '../store/familyPlanningStore';
import { usePatientStore } from '../store/patientStore';
import { useToast } from '../store/toastStore';
import {
  ChevronLeft, RefreshCw, Plus, Edit, Trash2, Eye, Calendar,
  Users, Shield, TrendingUp, Activity, AlertCircle, Search,
  Filter, Download, PieChart, BarChart3, Clock, CheckCircle,
  Baby, Heart, Pill, Syringe,
} from 'lucide-react';

const FP_METHODS = {
  modern_short_acting: [
    { value: 'pill_coc', label: 'Combined Oral Pills (COC)' },
    { value: 'pill_pop', label: 'Progestin-Only Pills (POP)' },
    { value: 'injectable_dmpa', label: 'Injectable (DMPA)' },
    { value: 'injectable_net_en', label: 'Injectable (NET-EN)' },
    { value: 'condom_male', label: 'Male Condom' },
    { value: 'condom_female', label: 'Female Condom' },
  ],
  modern_long_acting: [
    { value: 'implant_implanon', label: 'Implant (Implanon)' },
    { value: 'implant_jadelle', label: 'Implant (Jadelle)' },
    { value: 'iud_copper', label: 'IUD (Copper)' },
    { value: 'iud_hormonal', label: 'IUD (Hormonal)' },
  ],
  permanent: [
    { value: 'female_sterilization', label: 'Female Sterilization' },
    { value: 'male_sterilization', label: 'Male Sterilization' },
  ],
  traditional: [
    { value: 'lam', label: 'Lactational Amenorrhea (LAM)' },
    { value: 'withdrawal', label: 'Withdrawal' },
    { value: 'calendar', label: 'Calendar/Rhythm' },
    { value: 'other_traditional', label: 'Other Traditional' },
  ],
  emergency: [
    { value: 'emergency_contraception', label: 'Emergency Contraception' },
  ],
};

const METHOD_LABELS: Record<string, string> = {};
Object.values(FP_METHODS).flat().forEach(m => {
  METHOD_LABELS[m.value] = m.label;
});

export default function FamilyPlanning() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { patients, loadPatients } = usePatientStore();
  const {
    services, currentService, clientDetails, statistics, methodMix,
    isLoading, error, pagination,
    getServices, getServiceById, createService, updateService, deleteService,
    getClientDetails, getStatistics, getMethodMix, clearCurrent,
  } = useFamilyPlanningStore();

  const [activeTab, setActiveTab] = useState<'register' | 'statistics' | 'method-mix'>('register');
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'register') {
      getServices({ startDate: dateRange.start, endDate: dateRange.end });
    } else if (activeTab === 'statistics') {
      getStatistics({ startDate: dateRange.start, endDate: dateRange.end });
    } else if (activeTab === 'method-mix') {
      getMethodMix({ startDate: dateRange.start, endDate: dateRange.end });
    }
  }, [activeTab, dateRange]);

  const loadData = async () => {
    try {
      await loadPatients();
    } catch (err: any) {
      toastError('Load failed', err.message);
    }
  };

  const handleViewDetails = async (patientId: string) => {
    try {
      await getClientDetails(patientId);
      setShowDetailsModal(true);
    } catch (err: any) {
      toastError('Error', err.message);
    }
  };

  const handleEdit = (service: any) => {
    setEditingService(service);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this FP service record?')) return;
    try {
      await deleteService(id);
      success('Deleted', 'FP service deleted successfully');
      getServices({ startDate: dateRange.start, endDate: dateRange.end });
    } catch (err: any) {
      toastError('Delete failed', err.message);
    }
  };

  const filteredServices = services.filter(s => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.patient?.surname?.toLowerCase().includes(query) ||
      s.patient?.otherNames?.toLowerCase().includes(query) ||
      s.patient?.folderNumber?.toLowerCase().includes(query) ||
      METHOD_LABELS[s.method]?.toLowerCase().includes(query)
    );
  });

  if (isLoading && !services.length) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">Loading Family Planning…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)]
              text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all text-xs font-medium">
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="h-5 w-px bg-[var(--border-color)]" />
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Shield className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[var(--text-primary)] leading-tight">Family Planning</h1>
              <p className="text-[10px] text-[var(--text-tertiary)] leading-tight">FP Register · Statistics · Method Mix</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setEditingService(null); setShowModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
              bg-purple-100 text-purple-700 hover:bg-purple-700 hover:text-white transition-all">
            <Plus className="w-3.5 h-3.5" /> New FP Service
          </button>
          <button onClick={() => loadData()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)]
              text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all text-xs font-medium">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <Calendar className="w-4 h-4 text-[var(--text-tertiary)]" />
          <span className="text-xs font-semibold text-[var(--text-secondary)]">Period:</span>
          <input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-3 py-1.5 text-xs text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg" />
          <span className="text-[var(--text-tertiary)] text-xs">to</span>
          <input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-3 py-1.5 text-xs text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg" />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-1 flex gap-1">
        {[
          { id: 'register', label: 'FP Register', icon: Users },
          { id: 'statistics', label: 'Statistics', icon: BarChart3 },
          { id: 'method-mix', label: 'Method Mix', icon: PieChart },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-purple-500 text-white shadow'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]'
            }`}>
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Register Tab */}
      {activeTab === 'register' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-[var(--text-tertiary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by patient name, folder number, or method..."
                className="flex-1 px-3 py-1.5 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg"
              />
            </div>
          </div>

          {/* FP Services Table */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Date</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Patient</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Method</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Category</th>
                    <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">New</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Provider</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Next Follow-up</th>
                    <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {filteredServices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-10 text-center text-[var(--text-tertiary)]">
                        <Shield className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p>No FP services recorded</p>
                      </td>
                    </tr>
                  ) : (
                    filteredServices.map(service => (
                      <tr key={service.id} className="hover:bg-[var(--bg-main)] transition-colors">
                        <td className="px-3 py-2.5">{new Date(service.serviceDate).toLocaleDateString()}</td>
                        <td className="px-3 py-2.5">
                          <div>
                            <p className="font-medium text-[var(--text-primary)]">
                              {service.patient?.surname} {service.patient?.otherNames}
                            </p>
                            <p className="text-[10px] text-[var(--text-tertiary)]">{service.patient?.folderNumber}</p>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700">
                            {METHOD_LABELS[service.method] || service.method}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-[10px] text-[var(--text-secondary)] capitalize">
                            {service.methodCategory?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {service.isNewAcceptor ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">NEW</span>
                          ) : (
                            <span className="text-[var(--text-tertiary)]">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">{service.providedBy?.fullName || '—'}</td>
                        <td className="px-3 py-2.5">
                          {service.nextFollowUpDate ? (
                            <span className="text-[10px] text-[var(--text-secondary)]">
                              {new Date(service.nextFollowUpDate).toLocaleDateString()}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-0.5 justify-center">
                            <button onClick={() => handleViewDetails(service.patientId)}
                              className="p-1 rounded text-[var(--text-tertiary)] hover:text-purple-600 hover:bg-purple-50 transition-all">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleEdit(service)}
                              className="p-1 rounded text-[var(--text-tertiary)] hover:text-blue-600 hover:bg-blue-50 transition-all">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(service.id)}
                              className="p-1 rounded text-[var(--text-tertiary)] hover:text-red-600 hover:bg-red-50 transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
              <span className="text-xs text-[var(--text-tertiary)]">
                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'statistics' && statistics && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase">Total Services</span>
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{statistics.totalServices || 0}</p>
            </div>
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Plus className="w-4 h-4 text-green-600" />
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase">New Acceptors</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{statistics.newAcceptors || 0}</p>
            </div>
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase">CYP</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{statistics.cyp || 0}</p>
            </div>
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-orange-600" />
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase">Current Users</span>
              </div>
              <p className="text-2xl font-bold text-orange-600">{statistics.currentUsers || 0}</p>
            </div>
          </div>

          {/* Method Mix Breakdown */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Method Mix</h3>
            <div className="space-y-2">
              {Object.entries(statistics.methodMix || {}).map(([method, count]: [string, any]) => (
                <div key={method} className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-secondary)]">{METHOD_LABELS[method] || method}</span>
                  <span className="text-xs font-bold text-[var(--text-primary)]">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Category Mix */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Category Mix</h3>
            <div className="space-y-2">
              {Object.entries(statistics.categoryMix || {}).map(([category, count]: [string, any]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-secondary)] capitalize">{category.replace(/_/g, ' ')}</span>
                  <span className="text-xs font-bold text-[var(--text-primary)]">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Method Mix Tab */}
      {activeTab === 'method-mix' && (
        <div className="space-y-4">
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Method Mix Breakdown</h3>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Method</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Category</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Count</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {methodMix.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-10 text-center text-[var(--text-tertiary)]">
                      No data available
                    </td>
                  </tr>
                ) : (
                  methodMix.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[var(--bg-main)] transition-colors">
                      <td className="px-3 py-2.5">{METHOD_LABELS[item.method] || item.method}</td>
                      <td className="px-3 py-2.5 capitalize">{item.category?.replace(/_/g, ' ')}</td>
                      <td className="px-3 py-2.5 text-center font-bold">{item.count}</td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-20 h-2 bg-[var(--bg-main)] rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500" style={{ width: `${item.percentage}%` }} />
                          </div>
                          <span className="text-[10px] font-semibold">{item.percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FP Service Modal */}
      {showModal && (
        <FPServiceModal
          isOpen={showModal}
          onClose={() => { setShowModal(false); setEditingService(null); }}
          onSuccess={() => {
            setShowModal(false);
            setEditingService(null);
            getServices({ startDate: dateRange.start, endDate: dateRange.end });
          }}
          editingService={editingService}
        />
      )}

      {/* Client Details Modal */}
      {showDetailsModal && clientDetails && (
        <ClientDetailsModal
          isOpen={showDetailsModal}
          onClose={() => { setShowDetailsModal(false); clearCurrent(); }}
          clientDetails={clientDetails}
        />
      )}
    </div>
  );
}

// FP Service Modal Component
const FPServiceModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingService?: any;
}> = ({ isOpen, onClose, onSuccess, editingService }) => {
  const { createService, updateService } = useFamilyPlanningStore();
  const { patients, loadPatients } = usePatientStore();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    patientId: '',
    attendanceId: '',
    serviceDate: new Date().toISOString().split('T')[0],
    method: '',
    methodCategory: '',
    isNewAcceptor: false,
    counsellingGiven: true,
    informedConsent: true,
    sideEffects: '',
    contraindications: '',
    medicalEligibilityCategory: 1,
    nextFollowUpDate: '',
    isPostpartum: false,
    isPostAbortion: false,
    postpartumWeeks: '',
    notes: '',
  });

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (editingService) {
      setFormData({
        patientId: editingService.patientId || '',
        attendanceId: editingService.attendanceId || '',
        serviceDate: editingService.serviceDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        method: editingService.method || '',
        methodCategory: editingService.methodCategory || '',
        isNewAcceptor: editingService.isNewAcceptor || false,
        counsellingGiven: editingService.counsellingGiven ?? true,
        informedConsent: editingService.informedConsent ?? true,
        sideEffects: editingService.sideEffects || '',
        contraindications: editingService.contraindications || '',
        medicalEligibilityCategory: editingService.medicalEligibilityCategory || 1,
        nextFollowUpDate: editingService.nextFollowUpDate?.split('T')[0] || '',
        isPostpartum: editingService.isPostpartum || false,
        isPostAbortion: editingService.isPostAbortion || false,
        postpartumWeeks: editingService.postpartumWeeks?.toString() || '',
        notes: editingService.notes || '',
      });
    }
  }, [editingService]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Auto-set category when method changes
    if (field === 'method' && value) {
      const category = Object.entries(FP_METHODS).find(([_, methods]) =>
        (methods as any[]).some(m => m.value === value)
      )?.[0];
      if (category) {
        setFormData(prev => ({ ...prev, methodCategory: category }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        serviceDate: new Date(formData.serviceDate).toISOString(),
        nextFollowUpDate: formData.nextFollowUpDate ? new Date(formData.nextFollowUpDate).toISOString() : undefined,
        postpartumWeeks: formData.postpartumWeeks ? parseInt(formData.postpartumWeeks) : undefined,
      };

      if (editingService) {
        await updateService(editingService.id, data);
        success('Updated', 'FP service updated successfully');
      } else {
        await createService(data);
        success('Created', 'FP service recorded successfully');
      }
      onSuccess();
    } catch (err: any) {
      toastError('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-[var(--bg-card)] rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-[var(--bg-card)] px-6 py-4 border-b flex justify-between items-center z-10">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-bold">{editingService ? 'Edit FP Service' : 'Record FP Service'}</h2>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-[var(--bg-main)] rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Patient Selection */}
            <div>
              <label className="block text-sm font-medium mb-1">Patient *</label>
              <select
                value={formData.patientId}
                onChange={e => handleChange('patientId', e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                required
                disabled={!!editingService}
              >
                <option value="">Select patient</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.surname} {p.otherNames} ({p.folderNumber})
                  </option>
                ))}
              </select>
            </div>

            {/* Service Date */}
            <div>
              <label className="block text-sm font-medium mb-1">Service Date *</label>
              <input
                type="date"
                value={formData.serviceDate}
                onChange={e => handleChange('serviceDate', e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                required
              />
            </div>

            {/* Method Selection */}
            <div>
              <label className="block text-sm font-medium mb-1">FP Method *</label>
              <select
                value={formData.method}
                onChange={e => handleChange('method', e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                required
              >
                <option value="">Select method</option>
                {Object.entries(FP_METHODS).map(([category, methods]) => (
                  <optgroup key={category} label={category.replace(/_/g, ' ').toUpperCase()}>
                    {(methods as any[]).map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Category (auto-filled) */}
            <div>
              <label className="block text-sm font-medium mb-1">Method Category</label>
              <input
                type="text"
                value={formData.methodCategory.replace(/_/g, ' ')}
                readOnly
                className="w-full px-3 py-2 bg-gray-100 border rounded-lg"
              />
            </div>

            {/* Checkboxes */}
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isNewAcceptor}
                  onChange={e => handleChange('isNewAcceptor', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">New Acceptor</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.counsellingGiven}
                  onChange={e => handleChange('counsellingGiven', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Counselling Given</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.informedConsent}
                  onChange={e => handleChange('informedConsent', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Informed Consent</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isPostpartum}
                  onChange={e => handleChange('isPostpartum', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Postpartum</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isPostAbortion}
                  onChange={e => handleChange('isPostAbortion', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Post-Abortion</span>
              </label>
            </div>

            {/* Postpartum Weeks */}
            {formData.isPostpartum && (
              <div>
                <label className="block text-sm font-medium mb-1">Postpartum Weeks</label>
                <input
                  type="number"
                  value={formData.postpartumWeeks}
                  onChange={e => handleChange('postpartumWeeks', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                  placeholder="e.g., 6"
                />
              </div>
            )}

            {/* Side Effects */}
            <div>
              <label className="block text-sm font-medium mb-1">Side Effects</label>
              <textarea
                rows={2}
                value={formData.sideEffects}
                onChange={e => handleChange('sideEffects', e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                placeholder="Any side effects reported..."
              />
            </div>

            {/* Next Follow-up */}
            <div>
              <label className="block text-sm font-medium mb-1">Next Follow-up Date</label>
              <input
                type="date"
                value={formData.nextFollowUpDate}
                onChange={e => handleChange('nextFollowUpDate', e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={e => handleChange('notes', e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg"
                placeholder="Additional notes..."
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-[var(--bg-main)]">
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : (editingService ? 'Update' : 'Record')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Client Details Modal Component
const ClientDetailsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  clientDetails: any;
}> = ({ isOpen, onClose, clientDetails }) => {
  if (!isOpen || !clientDetails) return null;

  const { patient, currentMethod, fpHistory, totalVisits, lastVisitDate, nextFollowUp } = clientDetails;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-[var(--bg-card)] rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-[var(--bg-card)] px-6 py-4 border-b flex justify-between items-center z-10">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-bold">FP Client Details</h2>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-[var(--bg-main)] rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Patient Info */}
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <h3 className="text-sm font-bold text-purple-700 mb-2">Patient Information</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[var(--text-tertiary)]">Name:</span>
                  <span className="ml-2 font-medium">{patient.surname} {patient.otherNames}</span>
                </div>
                <div>
                  <span className="text-[var(--text-tertiary)]">Folder #:</span>
                  <span className="ml-2 font-medium">{patient.folderNumber}</span>
                </div>
                <div>
                  <span className="text-[var(--text-tertiary)]">Age:</span>
                  <span className="ml-2 font-medium">{patient.age} years</span>
                </div>
                <div>
                  <span className="text-[var(--text-tertiary)]">Contact:</span>
                  <span className="ml-2 font-medium">{patient.contact || '—'}</span>
                </div>
              </div>
            </div>

            {/* Current Method */}
            {currentMethod && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h3 className="text-sm font-bold text-green-700 mb-2">Current Method</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[var(--text-tertiary)]">Method:</span>
                    <span className="ml-2 font-medium">{METHOD_LABELS[currentMethod.method]}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-tertiary)]">Category:</span>
                    <span className="ml-2 font-medium capitalize">{currentMethod.methodCategory?.replace(/_/g, ' ')}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-tertiary)]">Start Date:</span>
                    <span className="ml-2 font-medium">{new Date(currentMethod.serviceDate).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-tertiary)]">Provider:</span>
                    <span className="ml-2 font-medium">{currentMethod.providedBy?.fullName || '—'}</span>
                  </div>
                  {nextFollowUp && (
                    <div className="col-span-2">
                      <span className="text-[var(--text-tertiary)]">Next Follow-up:</span>
                      <span className="ml-2 font-medium text-orange-600">{new Date(nextFollowUp).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[var(--bg-main)] rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-600">{totalVisits}</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">Total FP Visits</p>
              </div>
              <div className="bg-[var(--bg-main)] rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {lastVisitDate ? new Date(lastVisitDate).toLocaleDateString() : '—'}
                </p>
                <p className="text-[10px] text-[var(--text-tertiary)]">Last Visit</p>
              </div>
              <div className="bg-[var(--bg-main)] rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {nextFollowUp ? new Date(nextFollowUp).toLocaleDateString() : '—'}
                </p>
                <p className="text-[10px] text-[var(--text-tertiary)]">Next Follow-up</p>
              </div>
            </div>

            {/* FP History */}
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">FP History ({fpHistory.length} records)</h3>
              {fpHistory.length === 0 ? (
                <p className="text-xs text-[var(--text-tertiary)] text-center py-4">No FP history</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {fpHistory.map((record: any) => (
                    <div key={record.id} className="bg-[var(--bg-main)] rounded-lg p-3 border border-[var(--border-color)]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-purple-600">
                          {METHOD_LABELS[record.method]}
                        </span>
                        <span className="text-[10px] text-[var(--text-tertiary)]">
                          {new Date(record.serviceDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-[10px] text-[var(--text-secondary)]">
                        Provider: {record.providedBy?.fullName || '—'}
                        {record.isNewAcceptor && <span className="ml-2 px-1.5 py-0.5 rounded bg-green-100 text-green-700">NEW</span>}
                      </div>
                      {record.sideEffects && (
                        <p className="text-[10px] text-orange-600 mt-1">Side effects: {record.sideEffects}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};