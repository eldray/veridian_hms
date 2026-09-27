// src/store/nursingStore.ts
import { create } from 'zustand';
import {
  MarDose, NursingNote, NursingTask,
  getMarDoses, getNursingNotes, getNursingTasks,
  createNursingNote, updateNursingNote, deleteNursingNote,
  createNursingTask, updateNursingTask, deleteNursingTask,
  administerMarDose, recordMarVariance,
} from '../api/nursing';

interface NursingState {
  // MAR
  doses: MarDose[];
  dosesLoading: boolean;
  dosesError: string | null;

  // Notes
  notes: NursingNote[];
  notesLoading: boolean;
  notesError: string | null;

  // Tasks
  tasks: NursingTask[];
  tasksLoading: boolean;
  tasksError: string | null;

  // Actions — MAR
  fetchDoses: (filters: {
    attendanceId?: string;
    patientId?: string;
    medicationId?: string;
    status?: string | string[];
    fromDate?: string;
    toDate?: string;
  }) => Promise<void>;
  administerDose: (doseId: string, data?: { administeredAt?: string; site?: string; notes?: string }) => Promise<void>;
  recordVariance: (
    doseId: string,
    data: { status: 'late' | 'missed' | 'refused' | 'held'; reason?: string; notes?: string },
  ) => Promise<void>;

  // Actions — Notes
  fetchNotes: (filters: {
    patientId?: string;
    attendanceId?: string;
    admissionId?: string;
    shift?: string;
    noteType?: string;
    isFlagged?: boolean;
    search?: string;
  }) => Promise<void>;
  createNote: (data: Parameters<typeof createNursingNote>[0]) => Promise<NursingNote>;
  editNote: (id: string, data: Parameters<typeof updateNursingNote>[1]) => Promise<NursingNote>;
  removeNote: (id: string) => Promise<void>;

  // Actions — Tasks
  fetchTasks: (filters: {
    attendanceId?: string;
    patientId?: string;
    admissionId?: string;
    status?: string | string[];
  }) => Promise<void>;
  createTask: (data: Parameters<typeof createNursingTask>[0]) => Promise<NursingTask>;
  editTask: (id: string, data: Parameters<typeof updateNursingTask>[1]) => Promise<NursingTask>;
  removeTask: (id: string) => Promise<void>;

  // Utility
  clearAll: () => void;
}

export const useNursingStore = create<NursingState>((set, get) => ({
  doses: [],
  dosesLoading: false,
  dosesError: null,

  notes: [],
  notesLoading: false,
  notesError: null,

  tasks: [],
  tasksLoading: false,
  tasksError: null,

  // ── MAR ─────────────────────────────────────

  fetchDoses: async (filters) => {
    set({ dosesLoading: true, dosesError: null });
    try {
      const { doses } = await getMarDoses(filters);
      set({ doses, dosesLoading: false });
    } catch (err: any) {
      set({
        dosesLoading: false,
        dosesError: err?.response?.data?.message || err.message || 'Failed to load doses',
      });
      throw err;
    }
  },

  administerDose: async (doseId, data) => {
    try {
      const updated = await administerMarDose(doseId, data);
      set({ doses: get().doses.map((d) => (d.id === doseId ? updated : d)) });
    } catch (err) {
      throw err;
    }
  },

  recordVariance: async (doseId, data) => {
    try {
      const updated = await recordMarVariance(doseId, data);
      set({ doses: get().doses.map((d) => (d.id === doseId ? updated : d)) });
    } catch (err) {
      throw err;
    }
  },

  // ── Notes ───────────────────────────────────

  fetchNotes: async (filters) => {
    set({ notesLoading: true, notesError: null });
    try {
      const { notes } = await getNursingNotes({ ...filters, limit: 200 });
      set({ notes, notesLoading: false });
    } catch (err: any) {
      set({
        notesLoading: false,
        notesError: err?.response?.data?.message || err.message || 'Failed to load notes',
      });
      throw err;
    }
  },

  createNote: async (data) => {
    const note = await createNursingNote(data);
    set({ notes: [note, ...get().notes] });
    return note;
  },

  editNote: async (id, data) => {
    const updated = await updateNursingNote(id, data);
    set({ notes: get().notes.map((n) => (n.id === id ? updated : n)) });
    return updated;
  },

  removeNote: async (id) => {
    await deleteNursingNote(id);
    set({ notes: get().notes.filter((n) => n.id !== id) });
  },

  // ── Tasks ───────────────────────────────────

  fetchTasks: async (filters) => {
    set({ tasksLoading: true, tasksError: null });
    try {
      const { tasks } = await getNursingTasks({ ...filters, limit: 500 });
      set({ tasks, tasksLoading: false });
    } catch (err: any) {
      set({
        tasksLoading: false,
        tasksError: err?.response?.data?.message || err.message || 'Failed to load tasks',
      });
      throw err;
    }
  },

  createTask: async (data) => {
    const task = await createNursingTask(data);
    set({ tasks: [task, ...get().tasks] });
    return task;
  },

  editTask: async (id, data) => {
    const updated = await updateNursingTask(id, data);
    set({ tasks: get().tasks.map((t) => (t.id === id ? updated : t)) });
    return updated;
  },

  removeTask: async (id) => {
    await deleteNursingTask(id);
    set({ tasks: get().tasks.filter((t) => t.id !== id) });
  },

  clearAll: () => set({
    doses: [], dosesLoading: false, dosesError: null,
    notes: [], notesLoading: false, notesError: null,
    tasks: [], tasksLoading: false, tasksError: null,
  }),
}));