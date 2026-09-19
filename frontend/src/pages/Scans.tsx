// src/pages/ScansWaitingList.tsx - SIMPLIFIED using worklistStore only

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorklistStore } from '../store/worklistStore';
import { useToast } from '../store/toastStore';
import {
  ChevronLeft,
  Scan,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Activity,
  Search,
  Users,
  Eye,
  Bed,
  FileText,
  History,
  Play,
  CheckSquare,
  ArrowRight
} from 'lucide-react';

// Stats Card Component
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
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

// Priority Badge Component
const PriorityBadge = ({ priority }: { priority: string }) => {
  switch (priority) {
    case 'stat':
      return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">STAT</span>;
    case 'urgent':
      return <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">Urgent</span>;
    default:
      return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Routine</span>;
  }
};

// Status Badge for scans
const getScanStatusBadge = (status: string) => {
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

export default function ScansWaitingList() {
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
      await fetchWorklist('scans');
      success('Data loaded', 'Scans ready');
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

  // ✅ Directly use worklistItems - they already have status flags
  // For scans: hasResults flag determines if scan is completed
  const pendingScans = useMemo(() => {
    return worklistItems.filter(item => !item.hasResults && item.status !== 'completed');
  }, [worklistItems]);

  const recentScans = useMemo(() => {
    return worklistItems.filter(item => item.hasResults || item.status === 'completed');
  }, [worklistItems]);

  // Filter based on search and active tab
  const filteredScans = useMemo(() => {
    const source = activeTab === 'pending' ? pendingScans : recentScans;
    if (!searchQuery) return source;
    const lower = searchQuery.toLowerCase();
    return source.filter(scan =>
      scan.patient?.name?.toLowerCase().includes(lower) ||
      scan.patient?.folderNumber?.toLowerCase().includes(lower)
    );
  }, [pendingScans, recentScans, searchQuery, activeTab]);

  // Pagination
  const totalPages = Math.ceil(filteredScans.length / itemsPerPage);
  const paginatedScans = filteredScans.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Stats
  const stats = {
    pendingScans: pendingScans.length,
    inProgress: pendingScans.filter(s => s.status === 'in_progress').length,
    patientsWaiting: pendingScans.length,
    urgent: pendingScans.filter(s => s.priority === 'urgent').length,
    stat: pendingScans.filter(s => s.priority === 'stat').length,
    recentScans: recentScans.length
  };

  const handleScanClick = (scan: any) => {
    navigate(`/dashboard/scans/${scan.patientId}`, {
      state: {
        patient: {
          id: scan.patientId,
          name: scan.patient?.name,
          folderNumber: scan.patient?.folderNumber,
          age: scan.patient?.age,
          gender: scan.patient?.gender
        },
        attendanceId: scan.attendanceId,
        scanId: scan.id,
        scan: scan
      }
    });
  };

  if (isLoading || worklistLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)]">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Loading Scans Queue...</h2>
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
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Scan className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Scans Management</h1>
            <p className="text-sm text-[var(--text-secondary)]">View waiting list and enter scan results</p>
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
          title="Pending Scans" 
          value={stats.pendingScans} 
          icon={Scan}
          color="text-indigo-600"
          bg="bg-indigo-100"
          onClick={() => navigate('/dashboard/scans')}
        />
        <StatCard 
          title="In Progress" 
          value={stats.inProgress} 
          icon={Activity}
          color="text-purple-600"
          bg="bg-purple-100"
          onClick={() => navigate('/dashboard/scans')}
        />
        <StatCard 
          title="Patients Waiting" 
          value={stats.patientsWaiting} 
          icon={Users}
          color="text-cyan-600"
          bg="bg-cyan-100"
          onClick={() => navigate('/dashboard/scans')}
        />
        <StatCard 
          title="Urgent/STAT" 
          value={stats.urgent + stats.stat} 
          icon={AlertTriangle}
          color="text-red-600"
          bg="bg-red-100"
          onClick={() => navigate('/dashboard/scans')}
        />
        <StatCard 
          title="Recent Scans" 
          value={stats.recentScans} 
          icon={History}
          color="text-green-600"
          bg="bg-green-100"
          onClick={() => navigate('/dashboard/scans')}
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
            className="w-full pl-10 pr-4 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
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
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending Scans
              {pendingScans.length > 0 && (
                <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">
                  {pendingScans.length}
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
              Recent Scans (Today)
              {recentScans.length > 0 && (
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">
                  {recentScans.length}
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
                <FileText className="w-4 h-4 text-indigo-600" />
                Scans Waiting List ({filteredScans.length} scans)
              </>
            ) : (
              <>
                <History className="w-4 h-4 text-green-600" />
                Recent Scans Completed Today ({filteredScans.length} scans)
              </>
            )}
          </h2>
        </div>
        
        {filteredScans.length === 0 ? (
          <div className="p-8 text-center">
            {activeTab === 'pending' ? (
              <>
                <CheckCircle className="w-12 h-12 text-[var(--icon-green-text)] mx-auto mb-3 opacity-50" />
                <p className="text-[var(--text-secondary)]">No pending scans</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">All scans have been completed</p>
              </>
            ) : (
              <>
                <History className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3 opacity-50" />
                <p className="text-[var(--text-secondary)]">No scans completed today</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">Complete scans to see them here</p>
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Scan Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">
                      {activeTab === 'pending' ? 'Requested At' : 'Completed At'}
                    </th>
                    {activeTab === 'pending' && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Priority</th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">
                      {activeTab === 'pending' ? 'Wait Time' : 'Radiologist'}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {paginatedScans.map((scan) => (
                    <tr 
                      key={scan.id} 
                      className="hover:bg-[var(--bg-main)] transition-colors cursor-pointer"
                      onClick={() => handleScanClick(scan)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-medium text-[var(--text-primary)] text-sm">
                              {scan.patient?.name}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {scan.patient?.age} years • {scan.patient?.gender}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-[var(--text-primary)]">
                          {scan.patient?.folderNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                          <Bed className="w-3.5 h-3.5" />
                          <span>{scan.location?.bed || '—'}</span>
                          {scan.location?.ward && <span className="text-xs">({scan.location.ward})</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {getScanStatusBadge(scan.status)}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="text-xs font-medium text-[var(--text-primary)]">
                            {scan.scanType}
                          </span>
                          {scan.bodyPart && (
                            <span className="text-[10px] text-[var(--text-tertiary)] block">
                              {scan.bodyPart}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs">
                          {activeTab === 'pending' ? (
                            new Date(scan.requestedAt).toLocaleString()
                          ) : (
                            scan.resultEnteredAt 
                              ? new Date(scan.resultEnteredAt).toLocaleTimeString()
                              : '—'
                          )}
                        </div>
                      </td>
                      {activeTab === 'pending' && (
                        <td className="px-4 py-3">
                          <PriorityBadge priority={scan.priority} />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        {activeTab === 'pending' ? (
                          <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              {Math.floor(scan.waitTime / 60)}h {scan.waitTime % 60}m
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--text-secondary)]">
                            {scan.performedBy || '—'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleScanClick(scan); }}
                          className={`px-3 py-1.5 rounded-lg transition-all text-xs font-medium flex items-center gap-1 mx-auto ${
                            activeTab === 'pending'
                              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
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
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredScans.length)} of {filteredScans.length}
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