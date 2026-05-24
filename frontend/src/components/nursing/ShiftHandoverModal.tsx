// src/components/nursing/ShiftHandoverModal.tsx
import React, { useState } from 'react';
import { X, Send, FileText, Printer, Download, CheckCircle, AlertCircle, User, Clock } from 'lucide-react';
import { generatePDF, openPrintWindow } from '../../utils/pdfGenerator';
import { generateHandoverHTML, HandoverPDFData } from '../../utils/pdfTemplates/handoverPDF';

interface ShiftHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (handoverData: any) => void;
  patients: Array<{
    id: string;
    patientId: string;
    patientName: string;
    bedNumber?: string;
    tasks: any[];
  }>;
  currentUser: any;
  hospital: any;
}

export const ShiftHandoverModal: React.FC<ShiftHandoverModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  patients,
  currentUser,
  hospital
}) => {
  const [handoverNotes, setHandoverNotes] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleToggleTask = (patientId: string, taskId: string) => {
    const key = `${patientId}-${taskId}`;
    setSelectedTasks(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  const getNextShift = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Afternoon';
    if (hour < 18) return 'Night';
    return 'Morning';
  };
  
  const getCurrentShift = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 18) return 'Afternoon';
    return 'Night';
  };
  
  const handleGeneratePDF = () => {
    const handoverData: HandoverPDFData = {
      shiftFrom: getCurrentShift(),
      shiftTo: getNextShift(),
      handoverNotes,
      completedTasksCount: Object.keys(selectedTasks).filter(key => selectedTasks[key]).length,
      patients: patients.map(p => ({
        name: p.patientName,
        bedNumber: p.bedNumber,
        pendingTasks: p.tasks.filter(t => t.status !== 'completed' && !selectedTasks[`${p.id}-${t.id}`]),
        completedTasks: p.tasks.filter(t => selectedTasks[`${p.id}-${t.id}`])
      })),
      handedOverBy: currentUser?.fullName || currentUser?.username || 'Unknown',
      handedOverAt: new Date().toISOString()
    };
    
    const htmlContent = generateHandoverHTML(handoverData, hospital);
    openPrintWindow(htmlContent, `Handover_Report_${new Date().toISOString().split('T')[0]}`);
  };
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onComplete({
        notes: handoverNotes,
        completedTasks: selectedTasks,
        handedOverAt: new Date().toISOString()
      });
      handleGeneratePDF();
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-[var(--border-color)] shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Send className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Shift Handover</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {getCurrentShift()} → {getNextShift()} Shift
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-main)] rounded-lg transition">
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Handover Notes */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Handover Notes
            </label>
            <textarea
              value={handoverNotes}
              onChange={(e) => setHandoverNotes(e.target.value)}
              rows={4}
              placeholder="Important information for next shift:
- Pending tasks
- Patient status updates
- Special instructions
- Family communications
- Upcoming procedures..."
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm resize-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          
          {/* Patient Tasks Summary */}
          <div>
            <h3 className="text-md font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Pending Tasks for Next Shift
            </h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {patients.filter(p => p.tasks.length > 0).map(patient => (
                <div key={patient.id} className="bg-[var(--bg-main)] rounded-lg p-4 border border-[var(--border-color)]">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-4 h-4 text-teal-500" />
                    <span className="font-medium text-[var(--text-primary)]">{patient.patientName}</span>
                    {patient.bedNumber && (
                      <span className="text-xs text-[var(--text-secondary)]">Bed: {patient.bedNumber}</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {patient.tasks.filter(t => t.status !== 'completed').map(task => (
                      <label key={task.id} className="flex items-start gap-3 p-2 hover:bg-[var(--bg-card)] rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTasks[`${patient.id}-${task.id}`] || false}
                          onChange={() => handleToggleTask(patient.id, task.id)}
                          className="mt-0.5 w-4 h-4 text-teal-600 rounded"
                        />
                        <div className="flex-1">
                          <p className="text-sm text-[var(--text-primary)]">{task.title}</p>
                          {task.scheduledTime && (
                            <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              Due: {new Date(task.scheduledTime).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          task.priority === 'high' ? 'bg-red-100 text-red-700' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {task.priority}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {patients.filter(p => p.tasks.length > 0).length === 0 && (
                <div className="text-center py-8 text-[var(--text-secondary)]">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No pending tasks for any patients</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border-color)]">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-[var(--text-secondary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleGeneratePDF}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium"
            >
              <Printer className="w-4 h-4" />
              Print Handover
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm font-medium disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Complete Handover
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};