// components/WorklistPanel.tsx
import React, { useEffect } from 'react';
import { useWorklistStore } from '../../store/worklistStore';
import { DepartmentType, WorklistItem } from '../types/worklist';
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
  const { worklistItems, stats, isLoading, error, fetchWorklist, selectItem, selectedItem } = useWorklistStore();

  useEffect(() => {
    fetchWorklist(department);
  }, [department, fetchWorklist]);

  const getDepartmentIcon = () => {
    switch (department) {
      case 'vitals': return Thermometer;
      case 'medical': return Stethoscope;
      case 'lab': return Activity;
      case 'pharmacy': return Pill;
      case 'scans': return FileText;
      case 'theatre': return Scissors;
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
      theatre: "Today's Surgeries"
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
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center space-x-3">
            <Clock className="w-6 h-6 text-blue-600 animate-spin" />
            <span className="text-lg font-medium">Loading worklist...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-end z-50">
      <div className="bg-white w-full max-w-2xl h-full overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <DepartmentIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{getDepartmentTitle()}</h2>
              <p className="text-sm text-gray-600">{stats.total} patients requiring attention</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.urgent}</div>
            <div className="text-xs text-gray-600">Urgent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <div className="text-xs text-gray-600">Critical</div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="px-6 py-4 bg-red-50 border-b border-red-200">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!error && worklistItems.length === 0 && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h3>
              <p className="text-gray-600">No pending tasks in this department</p>
            </div>
          </div>
        )}

        {/* Worklist Items */}
        {worklistItems.length > 0 && (
          <div className="flex-1 overflow-y-auto">
            <div className="divide-y divide-gray-200">
              {worklistItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedItem?.id === item.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {item.patient?.name || 'Unknown Patient'}
                        </h3>
                        {item.priority === 'critical' && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                            Critical
                          </span>
                        )}
                        {item.priority === 'urgent' && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                            Urgent
                          </span>
                        )}
                        {item.priority === 'stat' && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                            STAT
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
                        <div>Age: <span className="font-medium">{item.patient?.age || 'N/A'}</span></div>
                        <div>Gender: <span className="font-medium capitalize">{item.patient?.gender || 'N/A'}</span></div>
                        
                        {item.wardName && (
                          <div className="col-span-2">
                            Ward: <span className="font-medium">{item.wardName}</span>
                            {item.bedNumber && <span className="ml-2">Bed: {item.bedNumber}</span>}
                          </div>
                        )}
                        
                        {department === 'lab' && item.testCount && (
                          <div className="col-span-2">
                            Tests: <span className="font-medium">{item.testCount} pending</span>
                          </div>
                        )}
                        
                        {department === 'pharmacy' && item.itemCount && (
                          <div className="col-span-2">
                            Medications: <span className="font-medium">{item.itemCount} items</span>
                          </div>
                        )}
                        
                        {department === 'scans' && item.scanType && (
                          <div className="col-span-2">
                            Scan: <span className="font-medium">{item.scanType}</span>
                            {item.bodyPart && <span className="ml-2">- {item.bodyPart}</span>}
                          </div>
                        )}
                        
                        {department === 'theatre' && item.procedureName && (
                          <div className="col-span-2">
                            Procedure: <span className="font-medium">{item.procedureName}</span>
                          </div>
                        )}
                        
                        {item.diagnosis && (
                          <div className="col-span-2">
                            Diagnosis: <span className="font-medium">{item.diagnosis}</span>
                          </div>
                        )}
                      </div>
                      
                      {item.waitTime !== undefined && item.waitTime > 0 && (
                        <div className="mt-2 text-xs text-orange-600">
                          Waiting: {Math.floor(item.waitTime / 60)}h {item.waitTime % 60}m
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-4 flex flex-col items-end space-y-2">
                      <TrendingUp className="w-5 h-5 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {item.admittedAt ? new Date(item.admittedAt).toLocaleDateString() : 
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
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
            <button
              onClick={handleRefresh}
              className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <div className="text-sm text-gray-600">
              Click on a patient to load their details
            </div>
          </div>
        )}
      </div>
    </div>
  );
};