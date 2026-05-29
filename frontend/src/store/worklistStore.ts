// stores/worklistStore.ts - UPDATED for Grouped Worklists

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
      let response;
      
      switch (department) {
        case 'vitals':
          response = await getVitalsWorklist();
          if (response && response.data && Array.isArray(response.data)) {
            const items = response.data;
            const stats = {
              total: response.pending || 0,
              urgent: items.filter((i: any) => i.priority === 'urgent').length,
              critical: items.filter((i: any) => i.priority === 'stat').length
            };
            set({ worklistItems: items, stats, isLoading: false });
          } else {
            const items = Array.isArray(response) ? response : (response?.data || []);
            set({ 
              worklistItems: items,
              stats: {
                total: items.length,
                urgent: items.filter((i: any) => i.priority === 'urgent').length,
                critical: items.filter((i: any) => i.priority === 'critical' || i.priority === 'stat').length
              },
              isLoading: false 
            });
          }
          break;
          
        case 'medical':
          response = await getMedicalWorklist();
          if (response && response.data && Array.isArray(response.data)) {
            const items = response.data;
            const stats = {
              total: response.pending || 0,
              urgent: items.filter((i: any) => i.priority === 'urgent').length,
              critical: items.filter((i: any) => i.priority === 'stat').length
            };
            set({ worklistItems: items, stats, isLoading: false });
          } else {
            const items = Array.isArray(response) ? response : (response?.data || []);
            set({ 
              worklistItems: items,
              stats: {
                total: items.length,
                urgent: items.filter((i: any) => i.priority === 'urgent').length,
                critical: items.filter((i: any) => i.priority === 'critical' || i.priority === 'stat').length
              },
              isLoading: false 
            });
          }
          break;
          
        case 'lab':
          response = await getLabWorklist();
          if (response && response.data && Array.isArray(response.data)) {
            const items = response.data;
            const stats = {
              total: response.pending || 0,
              urgent: items.filter((i: any) => i.priority === 'urgent').length,
              critical: items.filter((i: any) => i.priority === 'stat').length
            };
            set({ worklistItems: items, stats, isLoading: false });
          } else {
            const items = Array.isArray(response) ? response : (response?.data || []);
            set({ 
              worklistItems: items,
              stats: {
                total: items.length,
                urgent: items.filter((i: any) => i.priority === 'urgent').length,
                critical: items.filter((i: any) => i.priority === 'critical' || i.priority === 'stat').length
              },
              isLoading: false 
            });
          }
          break;
          
        case 'pharmacy':
          response = await getPharmacyWorklist();
          if (response && response.data && Array.isArray(response.data)) {
            const items = response.data;
            const stats = {
              total: response.pending || 0,
              urgent: items.filter((i: any) => i.priority === 'urgent').length,
              critical: items.filter((i: any) => i.priority === 'stat').length
            };
            set({ worklistItems: items, stats, isLoading: false });
          } else {
            const items = Array.isArray(response) ? response : (response?.data || []);
            set({ 
              worklistItems: items,
              stats: {
                total: items.length,
                urgent: items.filter((i: any) => i.priority === 'urgent').length,
                critical: items.filter((i: any) => i.priority === 'critical' || i.priority === 'stat').length
              },
              isLoading: false 
            });
          }
          break;
          
        case 'scans':
          response = await getScansWorklist();
          if (response && response.data && Array.isArray(response.data)) {
            const items = response.data;
            const stats = {
              total: response.pending || 0,
              urgent: items.filter((i: any) => i.priority === 'urgent').length,
              critical: items.filter((i: any) => i.priority === 'stat').length
            };
            set({ worklistItems: items, stats, isLoading: false });
          } else {
            const items = Array.isArray(response) ? response : (response?.data || []);
            set({ 
              worklistItems: items,
              stats: {
                total: items.length,
                urgent: items.filter((i: any) => i.priority === 'urgent').length,
                critical: items.filter((i: any) => i.priority === 'critical' || i.priority === 'stat').length
              },
              isLoading: false 
            });
          }
          break;
          
        case 'theatre':
          response = await getTheatreWorklist();
          if (response && response.data && Array.isArray(response.data)) {
            const items = response.data;
            const stats = {
              total: response.scheduled || 0,
              urgent: items.filter((i: any) => i.priority === 'urgent').length,
              critical: items.filter((i: any) => i.priority === 'stat').length
            };
            set({ worklistItems: items, stats, isLoading: false });
          } else {
            const items = Array.isArray(response) ? response : (response?.data || []);
            set({ 
              worklistItems: items,
              stats: {
                total: items.length,
                urgent: items.filter((i: any) => i.priority === 'urgent').length,
                critical: items.filter((i: any) => i.priority === 'critical' || i.priority === 'stat').length
              },
              isLoading: false 
            });
          }
          break;
          
        // ✅ ADD MATERNAL CASE
        case 'maternal':
          response = await getMaternalWorklist();
          if (response && response.data && Array.isArray(response.data)) {
            const items = response.data;
            const stats = {
              total: response.pending || 0,
              urgent: items.filter((i: any) => i.priority === 'urgent').length,
              critical: items.filter((i: any) => i.priority === 'stat').length
            };
            set({ worklistItems: items, stats, isLoading: false });
          } else {
            const items = Array.isArray(response) ? response : (response?.data || []);
            set({ 
              worklistItems: items,
              stats: {
                total: items.length,
                urgent: items.filter((i: any) => i.priority === 'urgent').length,
                critical: items.filter((i: any) => i.priority === 'critical' || i.priority === 'stat').length
              },
              isLoading: false 
            });
          }
          break;
          
        default:
          response = await getWorklistSummary();
          set({ 
            worklistItems: [],
            stats: { total: 0, urgent: 0, critical: 0 },
            isLoading: false 
          });
          break;
      }
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