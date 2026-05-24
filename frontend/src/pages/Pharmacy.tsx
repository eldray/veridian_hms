// src/pages/DispenseMedication.tsx - Waiting List Page (UPDATED with UI Theme)
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePatientStore } from '../store/patientStore';
import { useStockStore } from '../store/stockStore';
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
  TrendingUp,
  Search,
  Clock,
  AlertTriangle,
  ChevronRight,
  Users,
  Calendar,
  Bed,
  Eye,
  Zap,
  Filter
} from 'lucide-react';

const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined =>
  entity?.id || entity?._id;

// Helper to calculate priority based on prescription age
const getPriority = (prescribedAt: string): { level: 'high' | 'medium' | 'low'; color: string; label: string } => {
  const hoursSince = (new Date().getTime() - new Date(prescribedAt).getTime()) / (1000 * 60 * 60);
  
  if (hoursSince > 24) {
    return { level: 'high', color: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]', label: 'HIGH' };
  } else if (hoursSince > 12) {
    return { level: 'medium', color: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]', label: 'MEDIUM' };
  }
  return { level: 'low', color: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]', label: 'LOW' };
};

// Stats Card Component
const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-1">{title}</p>
      </div>
      <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </div>
);

export default function DispenseMedication() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { setDepartment, worklistItems, stats: worklistStats, fetchWorklist } = useWorklistStore();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const { attendances, getAttendances } = useAttendanceStore();
  const { patients, loadPatients } = usePatientStore();
  const { stockItems, getStockItems } = useStockStore();

  const loadData = async () => {
    try {
      setRefreshing(true);
      setIsLoading(true);
      await Promise.all([loadPatients(), getAttendances(), getStockItems()]);
      // Load pharmacy worklist
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

  // Find patients with prescribed medications (not dispensed)
  const waitingPatients = useMemo(() => {
    const patientMap = new Map();
    
    for (const attendance of attendances) {
      const medications = attendance.Medication || [];
      const prescribedMeds = medications.filter((m: any) => m.status === 'prescribed');
      
      if (prescribedMeds.length === 0) continue;
      
      const patient = patients.find(p => getEntityId(p) === attendance.patientId);
      if (!patient) continue;
      
      const oldestPrescription = prescribedMeds.reduce((oldest: any, m: any) => {
        const date = new Date(m.prescribedAt);
        return date < new Date(oldest) ? date : oldest;
      }, prescribedMeds[0]?.prescribedAt);
      
      // Calculate waiting hours
      const waitingHours = Math.floor((new Date().getTime() - new Date(oldestPrescription).getTime()) / (1000 * 60 * 60));
      
      const priority = getPriority(oldestPrescription);
      
      patientMap.set(patient.id, {
        id: patient.id,
        name: `${patient.surname} ${patient.otherNames}`,
        folderNumber: patient.folderNumber,
        age: patient.age || 'N/A',
        gender: patient.gender || 'N/A',
        bedNumber: attendance.bed?.bedNumber,
        wardName: attendance.ward?.wardName,
        attendanceId: attendance.id,
        prescriptionCount: prescribedMeds.length,
        oldestPrescription: new Date(oldestPrescription).toLocaleDateString(),
        waitingHours,
        priority,
        medications: prescribedMeds
      });
    }
    
    return Array.from(patientMap.values());
  }, [attendances, patients]);

  // Filter patients by search
  const filteredPatients = useMemo(() => {
    if (!searchQuery) return waitingPatients;
    const lower = searchQuery.toLowerCase();
    return waitingPatients.filter(p =>
      p.name.toLowerCase().includes(lower) ||
      p.folderNumber.toLowerCase().includes(lower)
    );
  }, [waitingPatients, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats from worklist + local data
  const stats = {
    toDispense: waitingPatients.reduce((sum, p) => sum + p.prescriptionCount, 0),
    totalPatients: waitingPatients.length,
    urgent: waitingPatients.filter(p => p.priority.level === 'high').length,
    critical: waitingPatients.filter(p => p.waitingHours > 48).length,
    lowStockItems: stockItems.filter(s => s.currentStock < (s.reorderLevel || 10)).length
  };

  const handlePatientClick = (patient: any) => {
    navigate(`/dashboard/dispense/${patient.id}`, {
      state: { 
        patient,
        attendanceId: patient.attendanceId,
        prescriptions: patient.medications
      }
    });
  };

  // Handle worklist item click (from the sidebar/queue)
  const handleWorklistItemClick = (item: any) => {
    const patient = waitingPatients.find(p => p.id === item.patientId);
    if (patient) {
      handlePatientClick(patient);
    }
  };

  if (isLoading) {
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
            onClick={() => {
              setDepartment('pharmacy');
              fetchWorklist('pharmacy');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded-lg hover:bg-[var(--icon-blue-text)] hover:text-white transition-all text-sm"
          >
            <Users className="w-4 h-4" />
            Today's Queue ({worklistStats.total})
          </button>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          title="To Dispense" 
          value={stats.toDispense} 
          icon={Pill}
          color="bg-[var(--icon-purple-bg)]"
        />
        <StatCard 
          title="Patients Waiting" 
          value={stats.totalPatients} 
          icon={Users}
          color="bg-[var(--icon-cyan-bg)]"
        />
        <StatCard 
          title="Urgent" 
          value={stats.urgent} 
          icon={AlertTriangle}
          color="bg-[var(--icon-yellow-bg)]"
        />
        <StatCard 
          title="Critical Wait" 
          value={stats.critical} 
          icon={AlertCircle}
          color="bg-[var(--icon-red-bg)]"
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

      {/* Waiting List - Table View */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className="bg-[var(--bg-main)] px-6 py-3 border-b border-[var(--border-color)]">
          <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Package className="w-4 h-4 text-[var(--icon-green-text)]" />
            Waiting List ({filteredPatients.length} patients)
          </h2>
        </div>
        
        {filteredPatients.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
            <p className="text-[var(--text-secondary)]">No patients with pending prescriptions</p>
            <p className="text-sm text-[var(--text-tertiary)] mt-1">All prescriptions have been dispensed</p>
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
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase">Rx Count</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Waiting Time</th>
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
                            <p className="font-medium text-[var(--text-primary)] text-sm">{patient.name}</p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {patient.age} years • {patient.gender}
                            </p>
                          </div>
                        </div>
                       </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-[var(--text-primary)]">{patient.folderNumber}</span>
                       </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                          <Bed className="w-3.5 h-3.5" />
                          <span>{patient.bedNumber || '—'}</span>
                        </div>
                       </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-full text-xs font-semibold">
                          {patient.prescriptionCount}
                        </span>
                       </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${patient.priority.color}`}>
                          {patient.priority.label}
                        </span>
                       </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{patient.waitingHours}h {patient.waitingHours % 60}m</span>
                        </div>
                       </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePatientClick(patient); }}
                          className="px-3 py-1.5 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white transition-all text-xs font-medium flex items-center gap-1 mx-auto"
                        >
                          <Eye className="w-3 h-3" />
                          Dispense
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