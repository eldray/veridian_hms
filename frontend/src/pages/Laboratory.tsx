// src/pages/Laboratory.tsx - CORRECTED (keeps all original features)

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorklistStore } from '../store/worklistStore';
import { useToast } from '../store/toastStore';
import {
  ChevronLeft,
  FlaskConical,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  Microscope,
  User,
  Activity,
  Search,
  Users,
  FileText,
  Eye,
  History,
  Play,
  CheckSquare,
  List,
  X
} from 'lucide-react';

// Stats Card Component
const StatCard = ({ title, value, icon: Icon, color, bg }: any) => (
  <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-1">{title}</p>
      </div>
      <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
    </div>
  </div>
);

// Priority Badge
const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'stat':
      return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">STAT</span>;
    case 'urgent':
      return <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">Urgent</span>;
    default:
      return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Routine</span>;
  }
};

// Test Status Badge - KEPT from original
const getTestStatusBadge = (status: string) => {
  switch (status) {
    case 'requested':
      return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Requested</span>;
    case 'in_progress':
      return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">In Progress</span>;
    case 'completed':
      return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">Completed</span>;
    case 'cancelled':
      return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">Cancelled</span>;
    default:
      return <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{status}</span>;
  }
};

// Progress Badge for grouped summary
const ProgressBadge = ({ requested, inProgress, completed }: { requested: number; inProgress: number; completed: number }) => {
  const total = requested + inProgress + completed;
  const pending = requested + inProgress;
  
  if (pending === 0) {
    return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">All Completed</span>;
  }
  if (completed === 0) {
    return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">{pending} Pending</span>;
  }
  return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">{completed}/{total} Completed</span>;
};

export default function Laboratory() {
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
      await fetchWorklist('lab');
      success('Data loaded', 'Laboratory ready');
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

  // ✅ Use grouped worklistItems (each item = one patient with aggregated data)
  const pendingPatients = useMemo(() => {
    return worklistItems.filter(item => item.hasPendingTests === true);
  }, [worklistItems]);

  const recentPatients = useMemo(() => {
    return worklistItems.filter(item => item.hasResults === true);
  }, [worklistItems]);

  // Filter based on search
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

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Stats
  const stats = {
    pendingTests: pendingPatients.reduce((sum, p) => sum + (p.requestedCount || 0), 0),
    inProgress: pendingPatients.reduce((sum, p) => sum + (p.inProgressCount || 0), 0),
    patientsWaiting: pendingPatients.length,
    urgent: pendingPatients.filter(p => p.priority === 'urgent').length,
    stat: pendingPatients.filter(p => p.priority === 'stat').length,
    recentTests: recentPatients.length
  };

  const handlePatientClick = (patient: any) => {
    // Navigate to lab entry page where lab results can be viewed/processed
    navigate(`/dashboard/laboratory/${patient.patientId}`, {
      state: {
        patient: {
          id: patient.patientId,
          name: patient.patient?.name,
          folderNumber: patient.patient?.folderNumber,
          age: patient.patient?.age,
          gender: patient.patient?.gender
        },
        attendanceId: patient.attendanceId,
        fromWaitingList: true,
        activeTab: activeTab === 'pending' ? 'lab' : undefined
      }
    });
  };

  if (isLoading || worklistLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)]">
          <div className="w-12 h-12 border-4 border-[var(--icon-cyan-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Loading Laboratory...</h2>
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
          <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-xl flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-[var(--icon-cyan-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Laboratory Management</h1>
            <p className="text-sm text-[var(--text-secondary)]">View waiting list and enter test results</p>
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
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard 
          title="Pending Tests" 
          value={stats.pendingTests} 
          icon={FlaskConical}
          color="text-purple-600"
          bg="bg-purple-100"
        />
        <StatCard 
          title="In Progress" 
          value={stats.inProgress} 
          icon={Activity}
          color="text-blue-600"
          bg="bg-blue-100"
        />
        <StatCard 
          title="Patients Waiting" 
          value={stats.patientsWaiting} 
          icon={Users}
          color="text-cyan-600"
          bg="bg-cyan-100"
        />
        <StatCard 
          title="Urgent/STAT" 
          value={stats.urgent + stats.stat} 
          icon={AlertTriangle}
          color="text-red-600"
          bg="bg-red-100"
        />
        <StatCard 
          title="Completed Today" 
          value={stats.recentTests} 
          icon={History}
          color="text-green-600"
          bg="bg-green-100"
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
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending Tests
              {pendingPatients.length > 0 && (
                <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs">
                  {pendingPatients.length}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`px-4 py-2 text-sm font-medium transition-all relative ${
              activeTab === 'recent'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Completed Today
              {recentPatients.length > 0 && (
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">
                  {recentPatients.length}
                </span>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Table View */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className="bg-[var(--bg-main)] px-6 py-3 border-b border-[var(--border-color)]">
          <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
            {activeTab === 'pending' ? (
              <>
                <Microscope className="w-4 h-4 text-purple-600" />
                Laboratory Waiting List ({filteredPatients.length} patients)
              </>
            ) : (
              <>
                <History className="w-4 h-4 text-green-600" />
                Tests Completed Today ({filteredPatients.length} patients)
              </>
            )}
          </h2>
        </div>
        
        {filteredPatients.length === 0 ? (
          <div className="p-8 text-center">
            {activeTab === 'pending' ? (
              <>
                <CheckCircle className="w-12 h-12 text-[var(--icon-green-text)] mx-auto mb-3 opacity-50" />
                <p className="text-[var(--text-secondary)]">No pending lab tests</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">All tests have been completed</p>
              </>
            ) : (
              <>
                <History className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3 opacity-50" />
                <p className="text-[var(--text-secondary)]">No tests completed today</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">Complete tests to see them here</p>
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Test Summary</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">
                      {activeTab === 'pending' ? 'Next Test' : 'Tests Completed'}
                    </th>
                    {activeTab === 'pending' && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Priority</th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">
                      {activeTab === 'pending' ? 'Waiting Time' : 'Completed At'}
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
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-purple-600" />
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
                          <span>{patient.location?.ward || 'OPD'}</span>
                          {patient.location?.bed && <span className="text-xs">/ Bed {patient.location.bed}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ProgressBadge 
                          requested={patient.requestedCount || 0}
                          inProgress={patient.inProgressCount || 0}
                          completed={patient.completedCount || 0}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <List className="w-3 h-3 text-[var(--text-tertiary)]" />
                            <span className="text-xs text-[var(--text-primary)]">
                              {patient.testCount} total ({patient.requestedCount} pending, {patient.inProgressCount} in progress, {patient.completedCount} completed)
                            </span>
                          </div>
                          {activeTab === 'recent' && patient.testTypes && (
                            <div className="text-[10px] text-[var(--text-tertiary)] truncate max-w-[200px]">
                              {patient.testTypes}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {activeTab === 'pending' ? (
                          patient.nextTest ? (
                            <div className="text-xs">
                              <div className="font-medium text-[var(--text-primary)]">
                                {patient.nextTest.name}
                              </div>
                              <div className="text-[var(--text-secondary)]">
                                Requested: {new Date(patient.nextTest.requestedAt).toLocaleDateString()}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--text-secondary)]">No pending tests</span>
                          )
                        ) : (
                          <div className="flex flex-col gap-1">
                            {patient.completedTests?.slice(0, 2).map((test: any) => (
                              <div key={test.id} className="text-xs">
                                <span className="font-medium">{test.name}</span>
                                <span className="text-[var(--text-tertiary)] ml-1">
                                  ({new Date(test.completedAt).toLocaleTimeString()})
                                </span>
                              </div>
                            ))}
                            {patient.completedTests?.length > 2 && (
                              <span className="text-xs text-[var(--text-tertiary)]">
                                +{patient.completedTests.length - 2} more
                              </span>
                            )}
                          </div>
                        )}
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
                          <div className="text-xs text-[var(--text-secondary)]">
                            {patient.completedTests?.[0]?.completedAt 
                              ? new Date(patient.completedTests[0].completedAt).toLocaleTimeString()
                              : '—'}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePatientClick(patient); }}
                          className={`px-3 py-1.5 rounded-lg transition-all text-xs font-medium flex items-center gap-1 mx-auto ${
                            activeTab === 'pending'
                              ? 'bg-purple-600 text-white hover:bg-purple-700'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-700 hover:text-white'
                          }`}
                        >
                          {activeTab === 'pending' ? (
                            <>
                              <Eye className="w-3 h-3" />
                              Process
                            </>
                          ) : (
                            <>
                              <FileText className="w-3 h-3" />
                              View Report
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