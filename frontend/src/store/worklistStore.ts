// stores/worklistStore.ts - FIXED & OPTIMIZED

import { create } from 'zustand';
import { 
  getVitalsWorklist,
  getMedicalWorklist,
  getLabWorklist,
  getPharmacyWorklist,
  getScansWorklist,
  getTheatreWorklist,
  getMaternalWorklist,
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
      let apiCall;
      
      // 1. Select the correct API call based on department
      switch (department) {
        case 'vitals': apiCall = getVitalsWorklist(); break;
        case 'medical': apiCall = getMedicalWorklist(); break;
        case 'lab': apiCall = getLabWorklist(); break;
        case 'pharmacy': apiCall = getPharmacyWorklist(); break;
        case 'scans': apiCall = getScansWorklist(); break;
        case 'theatre': apiCall = getTheatreWorklist(); break;
        case 'maternal': apiCall = getMaternalWorklist(); break;
        default:
          await getWorklistSummary();
          set({ worklistItems: [], stats: { total: 0, urgent: 0, critical: 0 }, isLoading: false });
          return;
      }

      const response = await apiCall;

      // ✅ 2. BULLETPROOF UNWRAPPING LOGIC
      let items: any[] = [];
      let statsTotal = 0;

      // Unwrap Axios response if necessary (handles both raw Axios response and intercepted body)
      const body = response?.data !== undefined ? response.data : response;

      if (Array.isArray(body)) {
        items = body;
        statsTotal = body.length;
      } else if (body && typeof body === 'object') {
        // Check all common backend response shapes
        if (Array.isArray(body.data)) {
          items = body.data;
          statsTotal = body.pending ?? body.total ?? body.data.length;
        } else if (body.data && Array.isArray(body.data.data)) {
          items = body.data.data;
          statsTotal = body.data.pending ?? body.data.total ?? body.data.data.length;
        } else if (Array.isArray(body.items)) {
          items = body.items;
          statsTotal = body.pending ?? body.total ?? body.items.length;
        } else if (Array.isArray(body.records)) {
          items = body.records;
          statsTotal = body.pending ?? body.total ?? body.records.length;
        }
      }

      // ✅ 3. Calculate stats (Guaranteed to be an array, so .filter() will never crash)
      const stats = {
        total: statsTotal,
        urgent: items.filter((i: any) => i.priority === 'urgent').length,
        critical: items.filter((i: any) => i.priority === 'critical' || i.priority === 'stat').length
      };

      set({ worklistItems: items, stats, isLoading: false });

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