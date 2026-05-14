import { create } from 'zustand';
import api from '../services/api';
import { WorklistState, WorklistItem, DepartmentType } from '../types/worklist';

const initialState: WorklistState = {
  currentDepartment: null,
  worklistItems: [],
  selectedItem: null,
  isLoading: false,
  error: null,
  stats: { total: 0, urgent: 0, critical: 0 }
};

export const useWorklistStore = create<WorklistState>((set, get) => ({
  ...initialState,

  setDepartment: (department: DepartmentType) => {
    set({ 
      currentDepartment: department, 
      selectedItem: null,
      error: null 
    });
    get().fetchWorklist(department);
  },

  fetchWorklist: async (department: DepartmentType) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/worklist/${department}`);
      const items = response.data.data || [];
      
      const stats = {
        total: items.length,
        urgent: items.filter(i => i.priority === 'urgent').length,
        critical: items.filter(i => i.priority === 'critical').length
      };

      set({ 
        worklistItems: items, 
        stats,
        isLoading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to fetch worklist', 
        isLoading: false 
      });
    }
  },

  selectItem: (item: WorklistItem | null) => {
    set({ selectedItem: item });
  },

  clearSelection: () => {
    set({ selectedItem: null });
  },

  refreshWorklist: () => {
    const { currentDepartment } = get();
    if (currentDepartment) {
      get().fetchWorklist(currentDepartment);
    }
  },

  reset: () => {
    set(initialState);
  }
}));
