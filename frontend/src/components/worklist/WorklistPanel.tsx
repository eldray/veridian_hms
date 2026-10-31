// components/WorklistPanel.tsx
import React, { useEffect } from 'react';
import { useLiveRefresh } from '../../api/realtime';
import { useWorklistStore, supportsWorklistViews } from '../../store/worklistStore';
import { WorklistViewControls } from './WorklistViewControls';
import type { DepartmentType, WorklistItem } from '../../types/worklist';
import {
  Users, AlertCircle, Clock, CheckCircle,
  TrendingUp, Activity, Pill, FileText,
  Scissors, Thermometer, Stethoscope, X,
  RefreshCw
} from 'lucide-react';

interface WorklistPanelProps {
  department: DepartmentType;
  onSelectPatient: (patientId: string, item: WorklistItem) => void;
  onClose: () => void;
}

export const WorklistPanel: React.FC<WorklistPanelProps> = ({
  department,
  onSelectPatient,
  onClose
}) => {
  const {
    worklistItems, stats, isLoading, error, fetchWorklist, selectItem, selectedItem, view
  } = useWorklistStore();

  useEffect(() => {
    fetchWorklist(department);
  }, [department, fetchWorklist]);

  // Live queue: a new visit, vitals, lab/scan request, prescription or status change
  // refreshes this queue within a couple of seconds, without a spinner.
  useLiveRefresh(['encounters', 'nursing'], () => fetchWorklist(department, { silent: true }));

  const hasViewTabs = supportsWorklistViews(department);

  const getDepartmentIcon = () => {
    switch (department) {
      case 'vitals': return Thermometer;
      case 'medical': return Stethoscope;
      case 'lab': return Activity;
      case 'pharmacy': return Pill;
      case 'scans': return FileText;
      case 'theatre': return Scissors;
      case 'maternal': return Users;
      default: return Users;
    }
  };

  const getDepartmentTitle = () => {
    const titles: Record<DepartmentType, string> = {
      vitals: 'Vitals Pending',
      medical: 'Consultation Queue',
      lab: 'Lab Requests',
      pharmacy: 'Prescriptions to Fill',
      scans: 'Scan Requests',
      theatre: "Today's Surgeries",
      maternal: 'Maternity Queue'
    };
    return titles[department];
  };

  const DepartmentIcon = getDepartmentIcon();

  const handleRefresh = () => {
    fetchWorklist(department);
  };

  const handleSelectItem = (item: WorklistItem) => {
    selectItem(item);
    onSelectPatient(item.patientId, item);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-[var(--bg-card)] text-[var(--text-primary)] rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center space-x-3">
            <Clock className="w-6 h-6 text-[var(--icon-cyan-text)] animate-spin" />
            <span className="text-lg font-medium">Loading worklist...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-end z-50">
      <div className="bg-[var(--bg-card)] text-[var(--text-primary)] w-full max-w-2xl h-full overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--icon-cyan-bg)]">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[var(--bg-card)] rounded-lg shadow-sm">
              <DepartmentIcon className="w-6 h-6 text-[var(--icon-cyan-text)]" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{getDepartmentTitle()}</h2>
              <p className="text-sm text-[var(--text-secondary)]">{stats.total} patients requiring attention</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-main)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* Queue tabs and date filter — only the visit queues have them */}
        {hasViewTabs && (
          <div className="px-6 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
            <WorklistViewControls department={department} />
          </div>
        )}

        {/* Stats Bar */}
        <div className="px-6 py-3 bg-[var(--bg-main)] border-b border-[var(--border-color)] grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-[var(--text-secondary)]">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[var(--icon-yellow-text)]">{stats.urgent}</div>
            <div className="text-xs text-[var(--text-secondary)]">Urgent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[var(--icon-red-text)]">{stats.critical}</div>
            <div className="text-xs text-[var(--text-secondary)]">Critical</div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="px-6 py-4 bg-[var(--icon-red-bg)] border-b border-[var(--border-color)]">
            <div className="flex items-center space-x-2 text-[var(--icon-red-text)]">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!error && worklistItems.length === 0 && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              {view === 'outstanding' ? (
                <>
                  <AlertCircle className="w-16 h-16 text-[var(--icon-green-text)] mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nothing left unanswered</h3>
                  <p className="text-[var(--text-secondary)]">No closed visit is still waiting on a lab, scan or procedure result</p>
                </>
              ) : (
                <>
                  <CheckCircle className="w-16 h-16 text-[var(--icon-green-text)] mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">All Caught Up!</h3>
                  <p className="text-[var(--text-secondary)]">
                    {view === 'completed' ? 'Nothing closed in this window' : 'No pending tasks in this department'}
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Worklist Items */}
        {worklistItems.length > 0 && (
          <div className="flex-1 overflow-y-auto">
            <div className="divide-y divide-[var(--border-color)]">
              {worklistItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className={`px-6 py-4 hover:bg-[var(--bg-main)] cursor-pointer transition-colors ${
                    selectedItem?.id === item.id ? 'bg-[var(--icon-cyan-bg)] border-l-4 border-[var(--icon-cyan-text)]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold">
                          {item.patient?.name || 'Unknown Patient'}
                        </h3>
                        {item.priority === 'critical' && (
                          <span className="px-2 py-0.5 bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] text-xs font-medium rounded-full">
                            Critical
                          </span>
                        )}
                        {item.priority === 'urgent' && (
                          <span className="px-2 py-0.5 bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] text-xs font-medium rounded-full">
                            Urgent
                          </span>
                        )}
                        {item.priority === 'stat' && (
                          <span className="px-2 py-0.5 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] text-xs font-medium rounded-full">
                            STAT
                          </span>
                        )}
                      </div>

                      {/* Which record this is: the folder identifies the patient, the attendance
                          number identifies the visit being worked on. */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2 text-xs font-mono text-[var(--text-secondary)]">
                        <span>Folder: <span className="text-[var(--text-primary)]">{item.patient?.folderNumber || '—'}</span></span>
                        <span>Attendance: <span className="text-[var(--text-primary)]">{item.attendanceNumber || '—'}</span></span>
                        {view === 'pending' && item.queueRank === 2 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] font-sans">Overdue — visit never closed</span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-[var(--text-secondary)]">
                        <div>Age: <span className="font-medium text-[var(--text-primary)]">{item.patient?.age || 'N/A'}</span></div>
                        <div>Gender: <span className="font-medium capitalize">{item.patient?.gender || 'N/A'}</span></div>

                        {(item as any).location?.ward && (
                          <div className="col-span-2">
                            Ward: <span className="font-medium text-[var(--text-primary)]">{(item as any).location.ward}</span>
                            {(item as any).location.bed && <span className="ml-2">Bed: {(item as any).location.bed}</span>}
                          </div>
                        )}

                        {department === 'lab' && item.testCount && (
                          <div className="col-span-2">
                            Tests: <span className="font-medium text-[var(--text-primary)]">{item.testCount} pending</span>
                          </div>
                        )}

                        {department === 'pharmacy' && item.itemCount && (
                          <div className="col-span-2">
                            Medications: <span className="font-medium text-[var(--text-primary)]">{item.itemCount} items</span>
                          </div>
                        )}

                        {department === 'scans' && item.scanType && (
                          <div className="col-span-2">
                            Scan: <span className="font-medium text-[var(--text-primary)]">{item.scanType}</span>
                            {item.bodyPart && <span className="ml-2">- {item.bodyPart}</span>}
                          </div>
                        )}

                        {department === 'theatre' && item.procedureName && (
                          <div className="col-span-2">
                            Procedure: <span className="font-medium text-[var(--text-primary)]">{item.procedureName}</span>
                          </div>
                        )}

                        {view === 'outstanding' && (item as any).outstanding?.length > 0 && (
                          <div className="col-span-2">
                            Still unanswered:{' '}
                            <span className="font-medium text-[var(--text-primary)]">
                              {(item as any).outstanding.map((o: any) => `${o.kind}: ${o.name}`).join(', ')}
                            </span>
                          </div>
                        )}

                        {item.diagnosis && (
                          <div className="col-span-2">
                            Diagnosis: <span className="font-medium text-[var(--text-primary)]">{item.diagnosis}</span>
                          </div>
                        )}
                      </div>

                      {item.waitTime !== undefined && item.waitTime > 0 && (
                        <div className="mt-2 text-xs text-[var(--icon-orange-text)]">
                          Waiting: {Math.floor(item.waitTime / 60)}h {item.waitTime % 60}m
                        </div>
                      )}
                    </div>

                    <div className="ml-4 flex flex-col items-end space-y-2">
                      <TrendingUp className="w-5 h-5 text-[var(--text-tertiary)]" />
                      <span className="text-xs text-[var(--text-secondary)]">
                        {item.attendanceDateTime ? new Date(item.attendanceDateTime).toLocaleDateString() :
                         item.admittedAt ? new Date(item.admittedAt).toLocaleDateString() :
                         item.requestedAt ? new Date(item.requestedAt).toLocaleDateString() :
                         item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {worklistItems.length > 0 && (
          <div className="px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-main)] flex justify-between items-center">
            <button
              onClick={handleRefresh}
              className="flex items-center space-x-2 px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <div className="text-sm text-[var(--text-secondary)]">
              Click on a patient to load their details
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
