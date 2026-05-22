// stores/worklistStore.ts - CORRECTED
import { create } from 'zustand';
import { 
  getVitalsWorklist,
  getMedicalWorklist,
  getLabWorklist,
  getPharmacyWorklist,
  getScansWorklist,
  getTheatreWorklist,
  getWorklistSummary
} from '../api';
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
      let response;
      
      // ✅ Use the imported API functions
      switch (department) {
        case 'vitals':
          response = await getVitalsWorklist();
          break;
        case 'medical':
          response = await getMedicalWorklist();
          break;
        case 'lab':
          response = await getLabWorklist();
          break;
        case 'pharmacy':
          response = await getPharmacyWorklist();
          break;
        case 'scans':
          response = await getScansWorklist();
          break;
        case 'theatre':
          response = await getTheatreWorklist();
          break;
        default:
          response = await getWorklistSummary();
      }
      
      // Handle different response structures
      let items = [];
      if (response?.data && Array.isArray(response.data)) {
        items = response.data;
      } else if (Array.isArray(response)) {
        items = response;
      } else if (response?.items && Array.isArray(response.items)) {
        items = response.items;
      }
      
      const stats = {
        total: items.length,
        urgent: items.filter((i: any) => i.priority === 'urgent' || i.priority === 'high').length,
        critical: items.filter((i: any) => i.priority === 'critical' || i.priority === 'stat').length
      };

      set({ 
        worklistItems: items, 
        stats,
        isLoading: false 
      });
    } catch (error: any) {
      console.error('Worklist fetch error:', error);
      set({ 
        error: error.response?.data?.message || error.message || 'Failed to fetch worklist', 
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