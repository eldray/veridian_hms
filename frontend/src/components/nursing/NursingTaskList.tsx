// src/components/nursing/NursingTaskList.tsx
import React, { useState } from 'react';
import { Plus, CheckCircle, Clock, AlertCircle, Trash2, Edit, Filter } from 'lucide-react';

interface NursingTaskListProps {
  tasks: any[];
  patientId: string;
  attendanceId: string;
  admissionId?: string;
  onTaskComplete: (taskId: string) => void;
  onAddTask: () => void;
}

export const NursingTaskList: React.FC<NursingTaskListProps> = ({
  tasks,
  patientId,
  attendanceId,
  admissionId,
  onTaskComplete,
  onAddTask
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  
  const filteredTasks = tasks.filter(task => {
    if (filter === 'pending') return task.status !== 'completed';
    if (filter === 'completed') return task.status === 'completed';
    return true;
  });
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'vitals': return <Activity className="w-3.5 h-3.5" />;
      case 'medication': return <Pill className="w-3.5 h-3.5" />;
      case 'wound_care': return <Bandage className="w-3.5 h-3.5" />;
      case 'iv_change': return <Droplet className="w-3.5 h-3.5" />;
      default: return <ClipboardList className="w-3.5 h-3.5" />;
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-2 py-1 text-sm border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)]"
          >
            <option value="pending">Pending Tasks</option>
            <option value="completed">Completed</option>
            <option value="all">All Tasks</option>
          </select>
        </div>
        <button
          onClick={onAddTask}
          className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Task
        </button>
      </div>
      
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 bg-[var(--bg-main)] rounded-lg">
          <ClipboardList className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
          <p className="text-[var(--text-secondary)]">No tasks found</p>
          <button onClick={onAddTask} className="mt-3 text-teal-600 text-sm">Create a task</button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map(task => (
            <div key={task.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
              task.status === 'completed' 
                ? 'bg-green-50 border-green-200 opacity-70' 
                : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:bg-[var(--bg-main)]'
            }`}>
              <input
                type="checkbox"
                checked={task.status === 'completed'}
                onChange={() => task.status !== 'completed' && onTaskComplete(task.id)}
                disabled={task.status === 'completed'}
                className="mt-1 w-4 h-4 text-teal-600 rounded"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
                    {task.title}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                    {getTypeIcon(task.taskType)}
                    {task.taskType?.replace('_', ' ')}
                  </span>
                </div>
                {task.description && (
                  <p className="text-xs text-[var(--text-secondary)]">{task.description}</p>
                )}
                {task.scheduledTime && (
                  <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    Due: {new Date(task.scheduledTime).toLocaleString()}
                  </p>
                )}
                {task.completedAt && (
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <CheckCircle className="w-3 h-3" />
                    Completed: {new Date(task.completedAt).toLocaleString()}
                  </p>
                )}
              </div>
              {task.status !== 'completed' && (
                <div className="flex gap-1">
                  <button className="p-1 text-[var(--text-secondary)] hover:text-blue-600 rounded">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1 text-[var(--text-secondary)] hover:text-red-600 rounded">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Import missing icons
import { Activity, Pill, Droplet, ClipboardList, Bandage } from 'lucide-react';