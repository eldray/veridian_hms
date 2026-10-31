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
  getOutstandingWorklist,
  getWorklistSummary
} from '../api';
import { WorklistState, WorklistItem, DepartmentType, WorklistView, WorklistFetchOptions } from '../types/worklist';

// Prevent a slow response from a previous worklist/page from replacing the active queue.
const worklistRequestVersions: Partial<Record<DepartmentType, number>> = {};

/**
 * Queues that answer the three worklist views: to do, completed, and awaiting results (the
 * requests on visits that have already been closed). Visit queues derive those views from the
 * attendance status; lab, pharmacy and theatre derive them from the request's own status.
 */
export const ATTENDANCE_QUEUE_DEPARTMENTS: DepartmentType[] = ['vitals', 'medical', 'maternal'];
export const WORKLIST_VIEW_DEPARTMENTS: DepartmentType[] = [
  'vitals', 'medical', 'maternal', 'lab', 'pharmacy', 'scans', 'theatre',
];
export const supportsWorklistViews = (department: DepartmentType) =>
  WORKLIST_VIEW_DEPARTMENTS.includes(department);
/** Every queue can be narrowed to the visits of a date range. */
export const supportsDateRange = (department: DepartmentType) =>
  WORKLIST_VIEW_DEPARTMENTS.includes(department);

/** `<input type="date">` wants YYYY-MM-DD in local time, not an ISO instant. */
const dateInput = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Queues open on the current month so today's work is not buried under older visits. */
const currentMonthRange = () => {
  const today = new Date();
  return {
    dateFrom: dateInput(new Date(today.getFullYear(), today.getMonth(), 1)),
    dateTo: dateInput(today),
  };
};

const initialState: WorklistState = {
  currentDepartment: null,
  worklistItems: [],
  selectedItem: null,
  isLoading: false,
  error: null,
  stats: { total: 0, urgent: 0, critical: 0 },
  view: 'pending',
  ...currentMonthRange(),
  buckets: { today: 0, inpatients: 0, overdue: 0, closed: 0 }
};

const EMPTY_BUCKETS = { today: 0, inpatients: 0, overdue: 0, closed: 0 };

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

  fetchWorklist: async (department: DepartmentType, options: WorklistFetchOptions = {}) => {
    // Background refreshes should only update the department currently displayed.
    // A non-silent fetch represents navigation to this department.
    if (options.silent && get().currentDepartment !== department) return;
    if (!options.silent) {
      set({ currentDepartment: department, isLoading: true, error: null });
    }

    const requestVersion = (worklistRequestVersions[department] || 0) + 1;
    worklistRequestVersions[department] = requestVersion;
    const isCurrentRequest = () =>
      worklistRequestVersions[department] === requestVersion &&
      get().currentDepartment === department;
    const { view, dateFrom, dateTo } = get();
    // A page that owns its own queue (Family Planning) overrides the shared tab state per request.
    const requestedView = options.view ?? view;
    const requestedFrom = options.dateFrom ?? dateFrom;
    const requestedTo = options.dateTo ?? dateTo;
    // Every queue answers the three views; all of them narrow by the visit date.
    const queueView: WorklistView = supportsWorklistViews(department) ? requestedView : 'pending';
    const params = {
      view: queueView,
      dateFrom: supportsDateRange(department) && requestedFrom ? requestedFrom : undefined,
      dateTo: supportsDateRange(department) && requestedTo ? requestedTo : undefined,
      // The warning list is hospital-wide; the maternal desk only owns the three maternal visits.
      ...(department === 'maternal' && queueView === 'outstanding'
        ? { attendanceType: 'antenatal,delivery,postnatal' }
        : {}),
    };
    try {
      let apiCall;

      // 1. Select the correct API call based on department
      if (queueView === 'outstanding' && ATTENDANCE_QUEUE_DEPARTMENTS.includes(department)) {
        // Visit queues share one warning list; the item queues answer "awaiting results" themselves.
        apiCall = getOutstandingWorklist(params);
      } else {
        switch (department) {
          case 'vitals': apiCall = getVitalsWorklist(params); break;
          case 'medical': apiCall = getMedicalWorklist(params); break;
          case 'lab': apiCall = getLabWorklist(params); break;
          case 'pharmacy': apiCall = getPharmacyWorklist(params); break;
          case 'scans': apiCall = getScansWorklist(params); break;
          case 'theatre': apiCall = getTheatreWorklist(params); break;
          case 'maternal': apiCall = getMaternalWorklist(params); break;
          default:
            await getWorklistSummary();
            if (isCurrentRequest()) {
              set({ worklistItems: [], stats: { total: 0, urgent: 0, critical: 0 }, isLoading: false });
            }
            return;
        }
      }

      const response = await apiCall;
      if (!isCurrentRequest()) return;

      // ✅ 2. BULLETPROOF UNWRAPPING LOGIC
      let items: any[] = [];
      let statsTotal = 0;
      let buckets = EMPTY_BUCKETS;

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
          buckets = body.buckets ?? EMPTY_BUCKETS;
        } else if (body.data && Array.isArray(body.data.data)) {
          items = body.data.data;
          statsTotal = body.data.pending ?? body.data.total ?? body.data.data.length;
          buckets = body.data.buckets ?? EMPTY_BUCKETS;
        } else if (Array.isArray(body.items)) {
          items = body.items;
          statsTotal = body.pending ?? body.total ?? body.items.length;
          buckets = body.buckets ?? EMPTY_BUCKETS;
        } else if (Array.isArray(body.records)) {
          items = body.records;
          statsTotal = body.pending ?? body.total ?? body.records.length;
          buckets = body.buckets ?? EMPTY_BUCKETS;
        }
      }

      // ✅ 3. Calculate stats (Guaranteed to be an array, so .filter() will never crash)
      const stats = {
        total: statsTotal,
        urgent: items.filter((i: any) => i.priority === 'urgent').length,
        critical: items.filter((i: any) => i.priority === 'critical' || i.priority === 'stat').length
      };

      // Even a silent refresh can finish the first load; it must not leave the
      // page's full-screen loading state stuck. Silent refreshes never turn it on.
      set({ worklistItems: items, stats, buckets, isLoading: false, error: null });

    } catch (error: any) {
      if (!isCurrentRequest()) return;
      if (options.silent) {
        // Keep the existing list, but release an initial loading state if this was
        // the latest request and the initial load failed.
        set({ isLoading: false });
        return;
      }
      console.error('Worklist fetch error:', error);
      set({
        error: error.response?.data?.message || error.message || 'Failed to fetch worklist',
        isLoading: false
      });
    }
  },

  /** Switching queue re-reads it: the tabs are different queries, not a filtered copy of one list. */
  setView: (view: WorklistView) => {
    const { currentDepartment } = get();
    set({ view, selectedItem: null });
    if (currentDepartment) get().fetchWorklist(currentDepartment);
  },

  /** An empty day means "no filter on that side", so one open end stays an open-ended range. */
  setDateRange: (range: { dateFrom?: string; dateTo?: string }) => {
    const { currentDepartment } = get();
    set({ dateFrom: range.dateFrom ?? '', dateTo: range.dateTo ?? '' });
    if (currentDepartment) get().fetchWorklist(currentDepartment);
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
