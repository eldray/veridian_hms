// src/pages/DispenseMedication.tsx - UPDATED for Grouped Pharmacy Worklist

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorklistStore } from '../store/worklistStore';
import { useToast } from '../store/toastStore';
import {
  ChevronLeft,
  Pill,
  CheckCircle,
  Package,
  Printer,
  RefreshCw,
  AlertCircle,
  User,
  Search,
  Clock,
  AlertTriangle,
  Users,
  Bed,
  Eye,
  Syringe,
  History,
  FileText,
  List,
  ClipboardList,
  ArrowRight
} from 'lucide-react';

// Stats Card Component
interface StatCardProps {
  title: string;
  value: number;
  icon: any;
  color: string;
  bg: string;
  onClick?: () => void;
}

const StatCard = ({ title, value, icon: Icon, color, bg, onClick }: StatCardProps) => (
  <div 
    className={`bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] ${onClick ? 'cursor-pointer hover:shadow-lg transition-all' : ''}`}
    onClick={onClick}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-1">{title}</p>
      </div>
      <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
    </div>
    {onClick && (
      <div className="mt-2 flex justify-end">
        <span className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
          Enter <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    )}
  </div>
);

// Priority Badge for medications
const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'stat':
    case 'high':
      return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">HIGH</span>;
    case 'urgent':
    case 'medium':
      return <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">MEDIUM</span>;
    default:
      return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">LOW</span>;
  }
};

// Progress Badge for grouped medications
const ProgressBadge = ({ prescribed, dispensed }: { prescribed: number; dispensed: number }) => {
  const total = prescribed + dispensed;
  const remaining = prescribed;
  
  if (remaining === 0) {
    return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">All Dispensed</span>;
  }
  if (remaining === total) {
    return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">{remaining} Pending</span>;
  }
  return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">{remaining}/{total} Remaining</span>;
};

export default function DispenseMedication() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState<'pending' | 'recent'>('pending');

  // ✅ ONLY use worklistStore
  const { worklistItems, fetchWorklist, isLoading: worklistLoading } = useWorklistStore();

  const loadData = async () => {
    try {
      setRefreshing(true);
      setIsLoading(true);
      await fetchWorklist('pharmacy');
      success('Data loaded', 'Dispensing ready');
    } catch (err: any) {
      toastError('Load failed', err.message || 'Could not load data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ✅ Directly use grouped worklistItems
  // Each item represents a PATIENT with aggregated prescription data
  const pendingPatients = useMemo(() => {
    return worklistItems.filter(item => item.hasPendingPrescriptions === true);
  }, [worklistItems]);

  const recentPatients = useMemo(() => {
    return worklistItems.filter(item => item.hasBeenDispensed === true);
  }, [worklistItems]);

  // Filter based on search and active tab
  const filteredPatients = useMemo(() => {
    const source = activeTab === 'pending' ? pendingPatients : recentPatients;
    if (!searchQuery) return source;
    const lower = searchQuery.toLowerCase();
    return source.filter(patient =>
      patient.patient?.name?.toLowerCase().includes(lower) ||
      patient.patient?.folderNumber?.toLowerCase().includes(lower)
    );
  }, [pendingPatients, recentPatients, searchQuery, activeTab]);

  // Pagination
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Stats
  const stats = {
    toDispense: pendingPatients.reduce((sum, p) => sum + (p.prescribedCount || 0), 0),
    totalPatients: pendingPatients.length,
    urgent: pendingPatients.filter(p => p.priority === 'urgent' || p.priority === 'medium').length,
    critical: pendingPatients.filter(p => p.priority === 'stat' || p.priority === 'high').length,
    recentDispensed: recentPatients.length
  };

  const handlePatientClick = (patient: any) => {
    navigate(`/dashboard/dispense/${patient.patientId}`, {
      state: {
        patient: {
          id: patient.patientId,
          name: patient.patient?.name,
          folderNumber: patient.patient?.folderNumber,
          age: patient.patient?.age,
          gender: patient.patient?.gender
        },
        attendanceId: patient.attendanceId,
        patientGroup: patient  // Pass the full grouped data
      }
    });
  };

  if (isLoading || worklistLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)]">
          <div className="w-12 h-12 border-4 border-[var(--icon-cyan-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Loading Pharmacy...</h2>
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
            <Pill className="w-5 h-5 text-[var(--icon-green-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Medication Dispensing</h1>
            <p className="text-sm text-[var(--text-secondary)]">View waiting list and dispense medications</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm text-[var(--text-primary)]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm text-[var(--text-primary)]"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard 
          title="To Dispense" 
          value={stats.toDispense} 
          icon={Pill}
          color="text-purple-600"
          bg="bg-purple-100"
          onClick={() => navigate('/dashboard/pharmacy')}
        />
        <StatCard 
          title="Patients Waiting" 
          value={stats.totalPatients} 
          icon={Users}
          color="text-cyan-600"
          bg="bg-cyan-100"
          onClick={() => navigate('/dashboard/pharmacy')}
        />
        <StatCard 
          title="Urgent" 
          value={stats.urgent} 
          icon={AlertTriangle}
          color="text-orange-600"
          bg="bg-orange-100"
          onClick={() => navigate('/dashboard/pharmacy')}
        />
        <StatCard 
          title="Critical" 
          value={stats.critical} 
          icon={AlertCircle}
          color="text-red-600"
          bg="bg-red-100"
          onClick={() => navigate('/dashboard/pharmacy')}
        />
        <StatCard 
          title="Recent Dispensed" 
          value={stats.recentDispensed} 
          icon={History}
          color="text-green-600"
          bg="bg-green-100"
          onClick={() => navigate('/dashboard/pharmacy')}
        />
      </div>

      {/* Search Bar */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search by patient name or folder number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all text-sm"
          />
        </div>
      </div>

      {/* TABS - Pending vs Recent */}
      <div className="border-b border-[var(--border-color)]">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-sm font-medium transition-all relative ${
              activeTab === 'pending'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Pending Dispensing
              {pendingPatients.length > 0 && (
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">
                  {pendingPatients.length}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`px-4 py-2 text-sm font-medium transition-all relative ${
              activeTab === 'recent'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Recent Dispensed (Today)
              {recentPatients.length > 0 && (
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                  {recentPatients.length}
                </span>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Table View - UPDATED for Grouped Data */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className="bg-[var(--bg-main)] px-6 py-3 border-b border-[var(--border-color)]">
          <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
            {activeTab === 'pending' ? (
              <>
                <Package className="w-4 h-4 text-[var(--icon-green-text)]" />
                Dispensing Queue ({filteredPatients.length} patients)
              </>
            ) : (
              <>
                <History className="w-4 h-4 text-blue-600" />
                Recently Dispensed Today ({filteredPatients.length} patients)
              </>
            )}
          </h2>
        </div>
        
        {filteredPatients.length === 0 ? (
          <div className="p-8 text-center">
            {activeTab === 'pending' ? (
              <>
                <CheckCircle className="w-12 h-12 text-[var(--icon-green-text)] mx-auto mb-3 opacity-50" />
                <p className="text-[var(--text-secondary)]">No pending prescriptions</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">All prescriptions have been dispensed</p>
              </>
            ) : (
              <>
                <History className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3 opacity-50" />
                <p className="text-[var(--text-secondary)]">No medications dispensed today</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">Dispense medications to see them here</p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Folder #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Location</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Prescriptions</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">
                      {activeTab === 'pending' ? 'Next Medication' : 'Dispensed At'}
                    </th>
                    {activeTab === 'pending' && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Priority</th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">
                      {activeTab === 'pending' ? 'Wait Time' : 'Status'}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {paginatedPatients.map((patient) => (
                    <tr 
                      key={patient.id} 
                      className="hover:bg-[var(--bg-main)] transition-colors cursor-pointer"
                      onClick={() => handlePatientClick(patient)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[var(--icon-cyan-bg)] rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                          </div>
                          <div>
                            <p className="font-medium text-[var(--text-primary)] text-sm">
                              {patient.patient?.name}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {patient.patient?.age} years • {patient.patient?.gender}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-[var(--text-primary)]">
                          {patient.patient?.folderNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                          <Bed className="w-3.5 h-3.5" />
                          <span>{patient.location?.bed || 'OPD'}</span>
                          {patient.location?.ward && <span className="text-xs">({patient.location.ward})</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ProgressBadge 
                          prescribed={patient.prescribedCount || 0} 
                          dispensed={patient.dispensedCount || 0} 
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <List className="w-3 h-3 text-[var(--text-tertiary)]" />
                            <span className="text-xs text-[var(--text-primary)]">
                              {patient.prescriptionCount} total ({patient.prescribedCount} pending, {patient.dispensedCount} dispensed)
                            </span>
                          </div>
                          {patient.nextMedication && activeTab === 'pending' && (
                            <div className="text-[10px] text-[var(--text-tertiary)]">
                              Next: {patient.nextMedication.name} - {patient.nextMedication.dosage}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs">
                          {activeTab === 'pending' ? (
                            patient.oldestPrescribedAt 
                              ? new Date(patient.oldestPrescribedAt).toLocaleString()
                              : '—'
                          ) : (
                            <div className="text-[var(--text-secondary)]">
                              {patient.medications
                                ?.filter((m: any) => m.dispensedAt)
                                .map((m: any) => new Date(m.dispensedAt).toLocaleTimeString())
                                .join(', ') || '—'}
                            </div>
                          )}
                        </div>
                      </td>
                      {activeTab === 'pending' && (
                        <td className="px-4 py-3">
                          {getPriorityBadge(patient.priority)}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        {activeTab === 'pending' ? (
                          <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              {Math.floor(patient.waitTime / 60)}h {patient.waitTime % 60}m
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-green-600">Fully Dispensed</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePatientClick(patient); }}
                          className={`px-3 py-1.5 rounded-lg transition-all text-xs font-medium flex items-center gap-1 mx-auto ${
                            activeTab === 'pending'
                              ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] hover:bg-[var(--icon-green-text)] hover:text-white'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-700 hover:text-white'
                          }`}
                        >
                          {activeTab === 'pending' ? (
                            <>
                              <Syringe className="w-3 h-3" />
                              Dispense
                            </>
                          ) : (
                            <>
                              <FileText className="w-3 h-3" />
                              View Record
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-[var(--border-color)] flex items-center justify-between">
                <div className="text-sm text-[var(--text-secondary)]">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredPatients.length)} of {filteredPatients.length}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 text-sm text-[var(--text-primary)]"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm text-[var(--text-secondary)]">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 text-sm text-[var(--text-primary)]"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}