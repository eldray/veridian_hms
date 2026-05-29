// src/pages/MaternalWaitingList.tsx - SIMPLIFIED using worklistStore only with CSS variables

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorklistStore } from '../store/worklistStore';
import { useToast } from '../store/toastStore';
import {
  ChevronLeft,
  Baby,
  Heart,
  Hospital,
  Users,
  AlertCircle,
  Clock,
  Search,
  User,
  Bed,
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Eye,
  Stethoscope,
  History,
  FileText
} from 'lucide-react';

// Stats Card Component - Using CSS variables
const StatCard = ({ title, value, icon: Icon, colorVar, bgVar }: any) => (
  <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-1">{title}</p>
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bgVar}`}>
        <Icon className={`w-5 h-5 ${colorVar}`} />
      </div>
    </div>
  </div>
);

// Priority Badge - Using CSS variables
const getPriorityBadge = (priority: string, riskLevel?: string) => {
  if (riskLevel === 'high') {
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]">HIGH RISK</span>;
  }
  if (riskLevel === 'medium') {
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]">MEDIUM RISK</span>;
  }
  switch (priority) {
    case 'stat':
    case 'emergency':
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]">EMERGENCY</span>;
    case 'urgent':
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]">URGENT</span>;
    default:
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]">SCHEDULED</span>;
  }
};

// Status Badge - Using CSS variables
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]">Pending</span>;
    case 'in_progress':
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">In Progress</span>;
    case 'completed':
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]">Completed</span>;
    case 'discharged':
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]">Discharged</span>;
    default:
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-main)] text-[var(--text-secondary)]">{status}</span>;
  }
};

// Visit Type Badge - Using CSS variables
const getVisitTypeBadge = (type: string) => {
  switch (type) {
    case 'antenatal':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--icon-pink-bg)] text-[var(--icon-pink-text)]"><Baby className="w-3 h-3" /> Antenatal</span>;
    case 'delivery':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]"><Hospital className="w-3 h-3" /> Delivery</span>;
    case 'postnatal':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)]"><Heart className="w-3 h-3" /> Postnatal</span>;
    default:
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-main)] text-[var(--text-secondary)]"><Stethoscope className="w-3 h-3" /> Other</span>;
  }
};

// Visit Type Tab Component
const VisitTypeTab = ({ type, label, count, isActive, onClick }: any) => {
  const getIcon = () => {
    switch (type) {
      case 'antenatal': return <Baby className="w-4 h-4" />;
      case 'delivery': return <Hospital className="w-4 h-4" />;
      case 'postnatal': return <Heart className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getActiveColor = () => {
    switch (type) {
      case 'antenatal': return 'text-[var(--icon-pink-text)] border-[var(--icon-pink-text)]';
      case 'delivery': return 'text-[var(--icon-green-text)] border-[var(--icon-green-text)]';
      case 'postnatal': return 'text-[var(--icon-blue-text)] border-[var(--icon-blue-text)]';
      default: return 'text-[var(--icon-cyan-text)] border-[var(--icon-cyan-text)]';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        isActive 
          ? `${getActiveColor()} border-b-2`
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-main)]'
      }`}
    >
      {getIcon()}
      <span>{label}</span>
      <span className={`px-1.5 py-0.5 rounded-full text-xs ${isActive ? 'bg-white/20' : 'bg-[var(--bg-main)]'}`}>
        {count}
      </span>
    </button>
  );
};

export default function MaternalWaitingList() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState<'pending' | 'recent'>('pending');
  const [activeVisitType, setActiveVisitType] = useState<'all' | 'antenatal' | 'delivery' | 'postnatal'>('all');

  // ✅ ONLY use worklistStore
  const { worklistItems, fetchWorklist, isLoading: worklistLoading } = useWorklistStore();

  const loadData = async () => {
    try {
      setRefreshing(true);
      setIsLoading(true);
      await fetchWorklist('maternal');
      success('Data loaded', 'Maternal waiting list ready');
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
  const pendingPatients = useMemo(() => {
    return worklistItems.filter(item => !item.hasBeenAttended && item.status !== 'completed');
  }, [worklistItems]);

  const recentPatients = useMemo(() => {
    return worklistItems.filter(item => item.hasBeenAttended || item.status === 'completed');
  }, [worklistItems]);

  // Filter by visit type
  const getFilteredByVisitType = (patients: any[]) => {
    if (activeVisitType === 'all') return patients;
    return patients.filter(p => p.visitType === activeVisitType);
  };

  const pendingFiltered = getFilteredByVisitType(pendingPatients);
  const recentFiltered = getFilteredByVisitType(recentPatients);

  // Filter based on search and active tab
  const filteredPatients = useMemo(() => {
    const source = activeTab === 'pending' ? pendingFiltered : recentFiltered;
    if (!searchQuery) return source;
    const lower = searchQuery.toLowerCase();
    return source.filter(patient =>
      patient.patient?.name?.toLowerCase().includes(lower) ||
      patient.patient?.folderNumber?.toLowerCase().includes(lower) ||
      patient.complaints?.toLowerCase().includes(lower)
    );
  }, [pendingFiltered, recentFiltered, searchQuery, activeTab]);

  // Pagination
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, activeVisitType]);

  // Stats
  const stats = {
    total: pendingFiltered.length,
    antenatal: pendingFiltered.filter(p => p.visitType === 'antenatal').length,
    delivery: pendingFiltered.filter(p => p.visitType === 'delivery').length,
    postnatal: pendingFiltered.filter(p => p.visitType === 'postnatal').length,
    highRisk: pendingFiltered.filter(p => p.riskLevel === 'high').length,
    urgent: pendingFiltered.filter(p => p.priority === 'urgent' || p.priority === 'stat').length,
    recentCompleted: recentFiltered.length
  };

  const handleStartVisit = (patient: any) => {
    navigate(`/dashboard/maternal/${patient.attendanceId}`, {
      state: {
        patient: {
          id: patient.patientId,
          name: patient.patient?.name,
          folderNumber: patient.patient?.folderNumber,
          age: patient.patient?.age,
          gender: patient.patient?.gender
        },
        attendanceId: patient.attendanceId,
        visitType: patient.visitType,
        fromWaitingList: true
      }
    });
  };

  const getButtonStyle = (visitType: string, isPending: boolean) => {
    if (!isPending) {
      return 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] hover:bg-[var(--icon-purple-text)] hover:text-white';
    }
    switch (visitType) {
      case 'antenatal':
        return 'bg-[var(--icon-pink-bg)] text-[var(--icon-pink-text)] hover:bg-[var(--icon-pink-text)] hover:text-white';
      case 'delivery':
        return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] hover:bg-[var(--icon-green-text)] hover:text-white';
      case 'postnatal':
        return 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] hover:bg-[var(--icon-blue-text)] hover:text-white';
      default:
        return 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white';
    }
  };

  const getButtonText = (visitType: string, isPending: boolean) => {
    if (!isPending) return 'View Record';
    switch (visitType) {
      case 'antenatal': return 'Start ANC';
      case 'delivery': return 'Start Delivery';
      case 'postnatal': return 'Postnatal Check';
      default: return 'Start Visit';
    }
  };

  if (isLoading || worklistLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)]">
          <div className="w-12 h-12 border-4 border-[var(--icon-pink-text)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Loading Maternal Queue...</h2>
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
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--icon-pink-bg)]">
            <Baby className="w-5 h-5 text-[var(--icon-pink-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Maternal Health Queue</h1>
            <p className="text-sm text-[var(--text-secondary)]">Antenatal, Delivery & Postnatal waiting patients</p>
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
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <StatCard 
          title="Waiting" 
          value={stats.total} 
          icon={Users}
          colorVar="text-[var(--icon-cyan-text)]"
          bgVar="bg-[var(--icon-cyan-bg)]"
        />
        <StatCard 
          title="Antenatal" 
          value={stats.antenatal} 
          icon={Baby}
          colorVar="text-[var(--icon-pink-text)]"
          bgVar="bg-[var(--icon-pink-bg)]"
        />
        <StatCard 
          title="Delivery" 
          value={stats.delivery} 
          icon={Hospital}
          colorVar="text-[var(--icon-green-text)]"
          bgVar="bg-[var(--icon-green-bg)]"
        />
        <StatCard 
          title="Postnatal" 
          value={stats.postnatal} 
          icon={Heart}
          colorVar="text-[var(--icon-blue-text)]"
          bgVar="bg-[var(--icon-blue-bg)]"
        />
        <StatCard 
          title="High Risk" 
          value={stats.highRisk} 
          icon={AlertTriangle}
          colorVar="text-[var(--icon-red-text)]"
          bgVar="bg-[var(--icon-red-bg)]"
        />
        <StatCard 
          title="Recent Visits" 
          value={stats.recentCompleted} 
          icon={History}
          colorVar="text-[var(--icon-purple-text)]"
          bgVar="bg-[var(--icon-purple-bg)]"
        />
      </div>

      {/* Visit Type Tabs */}
      <div className="bg-[var(--bg-card)] rounded-xl p-2 border border-[var(--border-color)]">
        <div className="flex flex-wrap gap-1">
          <VisitTypeTab
            type="all"
            label="All"
            count={stats.total}
            isActive={activeVisitType === 'all'}
            onClick={() => setActiveVisitType('all')}
          />
          <VisitTypeTab
            type="antenatal"
            label="Antenatal"
            count={stats.antenatal}
            isActive={activeVisitType === 'antenatal'}
            onClick={() => setActiveVisitType('antenatal')}
          />
          <VisitTypeTab
            type="delivery"
            label="Delivery"
            count={stats.delivery}
            isActive={activeVisitType === 'delivery'}
            onClick={() => setActiveVisitType('delivery')}
          />
          <VisitTypeTab
            type="postnatal"
            label="Postnatal"
            count={stats.postnatal}
            isActive={activeVisitType === 'postnatal'}
            onClick={() => setActiveVisitType('postnatal')}
          />
        </div>
      </div>

      {/* Main TABS - Pending vs Recent */}
      <div className="border-b border-[var(--border-color)]">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-sm font-medium transition-all relative ${
              activeTab === 'pending'
                ? 'text-[var(--icon-pink-text)] border-b-2 border-[var(--icon-pink-text)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending Visits
              {stats.total > 0 && (
                <span className="bg-[var(--icon-pink-bg)] text-[var(--icon-pink-text)] px-2 py-0.5 rounded-full text-xs">
                  {stats.total}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`px-4 py-2 text-sm font-medium transition-all relative ${
              activeTab === 'recent'
                ? 'text-[var(--icon-purple-text)] border-b-2 border-[var(--icon-purple-text)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Recent Visits (Today)
              {stats.recentCompleted > 0 && (
                <span className="bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] px-2 py-0.5 rounded-full text-xs">
                  {stats.recentCompleted}
                </span>
              )}
            </span>
          </button>
        </div>
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
            className="w-full pl-10 pr-4 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-pink-text)] focus:border-[var(--icon-pink-text)] transition-all text-sm"
          />
        </div>
      </div>

      {/* Table View */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className="bg-[var(--bg-main)] px-6 py-3 border-b border-[var(--border-color)]">
          <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
            {activeTab === 'pending' ? (
              <>
                <Baby className="w-4 h-4 text-[var(--icon-pink-text)]" />
                {activeVisitType === 'all' ? 'All Waiting Patients' : 
                 activeVisitType === 'antenatal' ? 'Antenatal Waiting List' :
                 activeVisitType === 'delivery' ? 'Delivery Waiting List' : 'Postnatal Waiting List'} 
                ({filteredPatients.length} patients)
              </>
            ) : (
              <>
                <History className="w-4 h-4 text-[var(--icon-purple-text)]" />
                Recent Visits Completed Today ({filteredPatients.length} patients)
              </>
            )}
          </h2>
        </div>
        
        {filteredPatients.length === 0 ? (
          <div className="p-8 text-center">
            {activeTab === 'pending' ? (
              <>
                <CheckCircle className="w-12 h-12 text-[var(--icon-green-text)] mx-auto mb-3 opacity-50" />
                <p className="text-[var(--text-secondary)]">No patients waiting</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">All patients have been attended to</p>
              </>
            ) : (
              <>
                <History className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3 opacity-50" />
                <p className="text-[var(--text-secondary)]">No visits completed today</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">Complete visits to see them here</p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Visit Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Folder #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Details</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">
                      {activeTab === 'pending' ? 'Priority' : 'Completed At'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">
                      {activeTab === 'pending' ? 'Waiting Time' : 'Attended By'}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {paginatedPatients.map((patient) => (
                    <tr 
                      key={patient.id} 
                      className="hover:bg-[var(--bg-main)] transition-colors cursor-pointer"
                      onClick={() => handleStartVisit(patient)}
                    >
                      <td className="px-4 py-3">
                        {getVisitTypeBadge(patient.visitType)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--icon-pink-bg)]">
                            <User className="w-4 h-4 text-[var(--icon-pink-text)]" />
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
                        {patient.visitType === 'antenatal' && (
                          <div className="space-y-0.5">
                            {patient.gestationalAge && (
                              <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                                <Baby className="w-3 h-3" />
                                <span>{patient.gestationalAge} weeks</span>
                              </div>
                            )}
                            {patient.edd && (
                              <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                                <Calendar className="w-3 h-3" />
                                <span>EDD: {new Date(patient.edd).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {patient.visitType === 'delivery' && (
                          <div className="space-y-0.5">
                            {patient.deliveryDate && (
                              <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                                <Calendar className="w-3 h-3" />
                                <span>Scheduled: {new Date(patient.deliveryDate).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {patient.visitType === 'postnatal' && (
                          <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                            <Heart className="w-3 h-3" />
                            <span>Day {patient.postnatalDay || 1} of follow-up</span>
                          </div>
                        )}
                       </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(patient.status)}
                       </td>
                      <td className="px-4 py-3">
                        {activeTab === 'pending' ? (
                          <div className="space-y-1">
                            {getPriorityBadge(patient.priority, patient.riskLevel)}
                          </div>
                        ) : (
                          <div className="text-xs text-[var(--text-secondary)]">
                            {patient.completedAt 
                              ? new Date(patient.completedAt).toLocaleTimeString()
                              : '—'}
                          </div>
                        )}
                       </td>
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
                            {patient.completedBy || 'Staff'}
                          </div>
                        )}
                       </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStartVisit(patient); }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 mx-auto transition-all ${getButtonStyle(patient.visitType, activeTab === 'pending')}`}
                        >
                          {activeTab === 'pending' ? (
                            <>
                              <Eye className="w-3 h-3" />
                              {getButtonText(patient.visitType, true)}
                            </>
                          ) : (
                            <>
                              <FileText className="w-3 h-3" />
                              {getButtonText(patient.visitType, false)}
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