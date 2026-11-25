// src/components/nursing/NursingTaskList.tsx
import React, { useState } from 'react';
import {
  Plus, CheckCircle, Clock, Trash2, Edit, ClipboardList,
  Activity, Pill, Droplet, AlertCircle, X, Save, Calendar
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NursingTask {
  id: string;
  title: string;
  description?: string;
  taskType: 'vitals' | 'medication' | 'wound_care' | 'iv_change' | 'position_change'
    | 'fluid_balance' | 'blood_glucose' | 'catheter_care' | 'general' | 'other';
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  scheduledTime?: string;
  completedAt?: Date;
  notes?: string;
  createdAt?: Date;
}

interface NursingTaskListProps {
  tasks: NursingTask[];
  patientId: string;
  attendanceId: string;
  admissionId?: string;
  onTaskComplete: (taskId: string) => void;
  onAddTask: (task: Omit<NursingTask, 'id'>) => void;
}

// ── Task type config ──────────────────────────────────────────────────────────

const TASK_TYPES: { value: NursingTask['taskType']; label: string }[] = [
  { value: 'vitals', label: 'Vital Signs' },
  { value: 'medication', label: 'Medication' },
  { value: 'wound_care', label: 'Wound Care' },
  { value: 'iv_change', label: 'IV / Cannula Change' },
  { value: 'position_change', label: 'Position Change' },
  { value: 'fluid_balance', label: 'Fluid Balance' },
  { value: 'blood_glucose', label: 'Blood Glucose Check' },
  { value: 'catheter_care', label: 'Catheter Care' },
  { value: 'general', label: 'General Nursing Care' },
  { value: 'other', label: 'Other' },
];

const taskTypeIcon = (type: NursingTask['taskType']) => {
  switch (type) {
    case 'vitals': return <Activity className="w-3.5 h-3.5" />;
    case 'medication': return <Pill className="w-3.5 h-3.5" />;
    case 'iv_change':
    case 'fluid_balance': return <Droplet className="w-3.5 h-3.5" />;
    default: return <ClipboardList className="w-3.5 h-3.5" />;
  }
};

const priorityConfig: Record<NursingTask['priority'], { cls: string; dot: string }> = {
  high:   { cls: 'bg-red-100 text-red-700 border-red-200',    dot: 'bg-red-500' },
  medium: { cls: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500' },
  low:    { cls: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-400' },
};

// ── Add Task Modal ────────────────────────────────────────────────────────────

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (task: Omit<NursingTask, 'id'>) => void;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [form, setForm] = useState<Omit<NursingTask, 'id'>>({
    title: '',
    description: '',
    taskType: 'general',
    priority: 'medium',
    status: 'pending',
    scheduledTime: '',
    notes: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!form.title.trim()) { setError('Task title is required'); return; }
    onAdd({ ...form, createdAt: new Date() });
    setForm({ title: '', description: '', taskType: 'general', priority: 'medium', status: 'pending', scheduledTime: '', notes: '' });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-md border border-[var(--border-color)] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-teal-100 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-3.5 h-3.5 text-teal-600" />
            </div>
            <p className="text-sm font-bold text-[var(--text-primary)]">Add Nursing Task</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-main)] transition-colors">
            <X className="w-4 h-4 text-[var(--text-tertiary)]" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Task Title <span className="text-[var(--icon-red-text)]">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Check wound dressing, Turn patient, IV flush…"
              className="w-full px-3 py-2 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          {/* Type + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Task Type
              </label>
              <select
                value={form.taskType}
                onChange={e => setForm(p => ({ ...p, taskType: e.target.value as NursingTask['taskType'] }))}
                className="w-full px-3 py-2 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-teal-500"
              >
                {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <select
                value={form.priority}
                onChange={e => setForm(p => ({ ...p, priority: e.target.value as NursingTask['priority'] }))}
                className="w-full px-3 py-2 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-teal-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* Scheduled time */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Scheduled Time (optional)
            </label>
            <input
              type="datetime-local"
              value={form.scheduledTime}
              onChange={e => setForm(p => ({ ...p, scheduledTime: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Instructions / Notes (optional)
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Any specific instructions for this task…"
              className="w-full px-3 py-2 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] resize-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={handleSubmit}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            Add Task
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-main)] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export const NursingTaskList: React.FC<NursingTaskListProps> = ({
  tasks,
  patientId,
  attendanceId,
  admissionId,
  onTaskComplete,
  onAddTask,
}) => {
  const [filter, setFilter] = useState<'pending' | 'completed' | 'all'>('pending');
  const [showAddModal, setShowAddModal] = useState(false);

  const filtered = tasks.filter(t => {
    if (filter === 'pending') return t.status !== 'completed';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  }).sort((a, b) => {
    // High priority first, then by scheduled time
    const pOrder = { high: 0, medium: 1, low: 2 };
    const pa = pOrder[a.priority] ?? 1;
    const pb = pOrder[b.priority] ?? 1;
    if (pa !== pb) return pa - pb;
    if (a.scheduledTime && b.scheduledTime) {
      return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
    }
    return 0;
  });

  const pendingCount = tasks.filter(t => t.status !== 'completed').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  const isOverdue = (task: NursingTask) => {
    if (!task.scheduledTime || task.status === 'completed') return false;
    return new Date(task.scheduledTime) < new Date();
  };

  return (
    <>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-[var(--bg-main)] rounded-lg p-1 border border-[var(--border-color)]">
            {(['pending', 'completed', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  filter === f
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {f === 'pending' ? `Pending (${pendingCount})` : f === 'completed' ? `Done (${completedCount})` : 'All'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Task
          </button>
        </div>

        {/* Task list */}
        {filtered.length === 0 ? (
          <div className="text-center py-10 bg-[var(--bg-main)] rounded-xl border border-dashed border-[var(--border-color)]">
            <ClipboardList className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-2 opacity-40" />
            <p className="text-sm text-[var(--text-secondary)] font-medium">
              {filter === 'pending' ? 'No pending tasks' : filter === 'completed' ? 'No completed tasks yet' : 'No tasks added'}
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-3 text-xs text-teal-600 hover:text-teal-700 font-medium"
            >
              + Add a task
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(task => {
              const overdue = isOverdue(task);
              const p = priorityConfig[task.priority];
              return (
                <div
                  key={task.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                    task.status === 'completed'
                      ? 'bg-green-50 border-green-200 opacity-75 dark:bg-green-950/20 dark:border-green-800'
                      : overdue
                      ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
                      : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:bg-[var(--bg-main)]'
                  }`}
                >
                  {/* Checkbox */}
                  <div className="flex-shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={task.status === 'completed'}
                      onChange={() => task.status !== 'completed' && onTaskComplete(task.id)}
                      disabled={task.status === 'completed'}
                      className="w-4 h-4 rounded border-[var(--border-color)] text-teal-600 focus:ring-teal-500 cursor-pointer disabled:cursor-default"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${
                        task.status === 'completed' ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'
                      }`}>
                        {task.title}
                      </span>

                      {/* Priority badge */}
                      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${p.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                        {task.priority.toUpperCase()}
                      </span>

                      {/* Type badge */}
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)]">
                        {taskTypeIcon(task.taskType)}
                        {TASK_TYPES.find(t => t.value === task.taskType)?.label || task.taskType}
                      </span>

                      {overdue && task.status !== 'completed' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 font-semibold">
                          OVERDUE
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">{task.description}</p>
                    )}

                    <div className="flex items-center gap-3 mt-1">
                      {task.scheduledTime && (
                        <p className={`text-[11px] flex items-center gap-1 ${overdue && task.status !== 'completed' ? 'text-red-600 font-medium' : 'text-[var(--text-tertiary)]'}`}>
                          <Clock className="w-3 h-3" />
                          {overdue && task.status !== 'completed' ? 'Was due ' : 'Due '}
                          {new Date(task.scheduledTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                      {task.completedAt && (
                        <p className="text-[11px] text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Done {new Date(task.completedAt).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary footer */}
        {tasks.length > 0 && (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
            <span>{pendingCount} pending · {completedCount} completed</span>
            <span>{tasks.length} total tasks this shift</span>
          </div>
        )}
      </div>

      <AddTaskModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={task => {
          onAddTask(task);
          setShowAddModal(false);
        }}
      />
    </>
  );
};