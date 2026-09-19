// src/pages/VitalsWaitingList.tsx - SIMPLIFIED using worklistItems

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorklistStore } from '../store/worklistStore';
import { useToast } from '../store/toastStore';
import {
  ChevronLeft,
  Activity,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle,
  AlertTriangle,
  Heart,
  Thermometer,
  User,
  Calendar,
  TrendingUp,
  Search,
  Users,
  Eye,
  Bed,
  Baby,
  History,
  Edit3,
  ArrowRight
} from 'lucide-react';

// Helper function to calculate age
function calculateAge(dateOfBirth: Date): number {
  if (!dateOfBirth) return 0;
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

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

// Priority Badge
const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'critical':
    case 'stat':
      return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">Critical</span>;
    case 'urgent':
      return <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">Urgent</span>;
    default:
      return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Routine</span>;
  }
};

export default function VitalsWaitingList() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState<'pending' | 'recent'>('pending');

  // ✅ Only use worklistStore - no more attendanceStore or patientStore needed
  const { worklistItems, stats: worklistStats, fetchWorklist, isLoading: worklistLoading } = useWorklistStore();

  const loadData = async () => {
    try {
      setRefreshing(true);
      setIsLoading(true);
      await fetchWorklist('vitals');
      success('Data loaded', 'Vitals ready');
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

  // ✅ Directly use worklistItems - they already have hasVitalsToday flag
  const pendingPatients = useMemo(() => {
    return worklistItems.filter(item => !item.hasVitalsToday);
  }, [worklistItems]);

  const recentPatients = useMemo(() => {
    return worklistItems.filter(item => item.hasVitalsToday);
  }, [worklistItems]);

  // Filter based on search and active tab
  const filteredPatients = useMemo(() => {
    const source = activeTab === 'pending' ? pendingPatients : recentPatients;
    if (!searchQuery) return source;
    const lower = searchQuery.toLowerCase();
    return source.filter(p =>
      p.patient?.name?.toLowerCase().includes(lower) ||
      p.patient?.folderNumber?.toLowerCase().includes(lower)
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
    pendingVitals: pendingPatients.length,
    critical: pendingPatients.filter(p => p.priority === 'critical' || p.priority === 'stat').length,
    urgent: pendingPatients.filter(p => p.priority === 'urgent').length,
    antenatalPatients: pendingPatients.filter(p => p.isAntenatal).length,
    recentVitals: recentPatients.length
  };

  const handlePatientClick = (patient: any) => {
    navigate(`/dashboard/vitals/${patient.patientId}`, {
      state: {
        patient: {
          id: patient.patientId,
          name: patient.patient?.name,
          folderNumber: patient.patient?.folderNumber,
          age: patient.patient?.age,
          gender: patient.patient?.gender
        },
        attendanceId: patient.attendanceId,
        isAntenatal: patient.isAntenatal,
        lastVitals: patient.lastVitals
      }
    });
  };

  if (isLoading || worklistLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)]">
          <div className="w-12 h-12 border-4 border-[var(--icon-red-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Loading Vitals Queue...</h2>
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
          <div className="w-10 h-10 bg-[var(--icon-red-bg)] rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5 text-[var(--icon-red-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Vital Signs</h1>
            <p className="text-sm text-[var(--text-secondary)]">Record and monitor patient vital signs</p>
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
          title="Vitals Due"
          value={stats.pendingVitals}
          icon={Activity}
          color="text-[var(--icon-red-text)]"
          bg="bg-[var(--icon-red-bg)]"
          onClick={() => navigate('/dashboard/vitals')}
        />
        <StatCard
          title="Critical"
          value={stats.critical}
          icon={AlertTriangle}
          color="text-red-600"
          bg="bg-red-100"
          onClick={() => navigate('/dashboard/vitals')}
        />
        <StatCard
          title="Urgent"
          value={stats.urgent}
          icon={Clock}
          color="text-orange-600"
          bg="bg-orange-100"
          onClick={() => navigate('/dashboard/vitals')}
        />
        <StatCard
          title="Antenatal"
          value={stats.antenatalPatients}
          icon={Baby}
          color="text-pink-600"
          bg="bg-pink-100"
          onClick={() => navigate('/dashboard/vitals')}
        />
        <StatCard
          title="Recent Vitals"
          value={stats.recentVitals}
          icon={History}
          color="text-green-600"
          bg="bg-green-100"
          onClick={() => navigate('/dashboard/vitals')}
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
                ? 'text-[var(--icon-red-text)] border-b-2 border-[var(--icon-red-text)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending Vitals
              {pendingPatients.length > 0 && (
                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">
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
              Recent Vitals (Today)
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
                <Heart className="w-4 h-4 text-[var(--icon-red-text)]" />
                Vitals Waiting List ({filteredPatients.length} patients)
              </>
            ) : (
              <>
                <History className="w-4 h-4 text-green-600" />
                Recent Vitals Recorded Today ({filteredPatients.length} patients)
              </>
            )}
          </h2>
        </div>

        {filteredPatients.length === 0 ? (
          <div className="p-8 text-center">
            {activeTab === 'pending' ? (
              <>
                <CheckCircle className="w-12 h-12 text-[var(--icon-green-text)] mx-auto mb-3 opacity-50" />
                <p className="text-[var(--text-secondary)]">No patients waiting for vitals</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">All vitals are up to date</p>
              </>
            ) : (
              <>
                <History className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3 opacity-50" />
                <p className="text-[var(--text-secondary)]">No vitals recorded today</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">Record vitals to see them here</p>
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
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase">
                      {activeTab === 'pending' ? 'Last Vitals' : 'Latest Reading'}
                    </th>
                    {activeTab === 'pending' && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Priority</th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">
                      {activeTab === 'pending' ? 'Waiting Time' : 'Recorded At'}
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
                              {patient.isAntenatal && <span className="ml-1 text-pink-500">🤰</span>}
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
                          <span>{patient.location?.bed || '—'}</span>
                          {patient.location?.ward && <span className="text-xs">({patient.location.ward})</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {patient.lastVitals ? (
                          <div className="text-xs space-y-1">
                            <div className="flex gap-2 justify-center">
                              <span>BP: {patient.lastVitals.bloodPressure || '—'}</span>
                              <span>Temp: {patient.lastVitals.temperature || '—'}°C</span>
                            </div>
                            <div className="flex gap-2 justify-center text-[var(--text-tertiary)]">
                              <span>Pulse: {patient.lastVitals.pulse || '—'}</span>
                              <span>SpO2: {patient.lastVitals.spo2 || '—'}%</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--text-secondary)]">No records</span>
                        )}
                      </td>
                      {activeTab === 'pending' && (
                        <td className="px-4 py-3">
                          {getPriorityBadge(patient.priority)}
                          {patient.hasAbnormal && (
                            <span className="ml-1 inline-flex items-center px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px]">
                              Abnormal
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {activeTab === 'pending'
                              ? `${Math.floor(patient.waitTime / 60)}h ${patient.waitTime % 60}m`
                              : patient.vitalsRecordedAt
                                ? new Date(patient.vitalsRecordedAt).toLocaleTimeString()
                                : '—'
                            }
                          </span>
                        </div>
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
                              <Eye className="w-3 h-3" />
                              Record Vitals
                            </>
                          ) : (
                            <>
                              <Edit3 className="w-3 h-3" />
                              Edit Vitals
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