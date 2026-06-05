// src/store/postnatalStore.ts - UPDATED WITH NEW API NAMES
import { create } from 'zustand';
import { 
  recordPostnatalVisit,
  getPostnatalRecords,
  getPostnatalRecord,
  updatePostnatalRecord,
  deletePostnatalRecord,
  getPostnatalStatistics,
} from '../api';

export interface PostnatalRecord {
  id: string;
  patientId: string;
  attendanceId: string;
  antenatalRecordId?: string;
  deliveryRecordId?: string;
  examinationDate: string;
  dayNumber: number;
  maternalCondition?: string;
  maternalComplications?: string[];
  bloodPressure?: string;
  temperature?: number;
  pulse?: number;
  fundalHeight?: number;
  lochia?: string;
  perinealCondition?: string;
  caesareanWound?: string;
  breastfeedingStatus?: string;
  breastfeedingDifficulties?: string[];
  latching?: string;
  babyCondition?: string;
  babyWeight?: number;
  babyTemperature?: number;
  babyFeeding?: string;
  jaundice?: boolean;
  jaundiceSeverity?: string;
  cordCondition?: string;
  bcgGiven?: boolean;
  opv0Given?: boolean;
  hepB0Given?: boolean;
  familyPlanningDiscussed?: boolean;
  familyPlanningMethodAccepted?: string;
  maternalDangerSigns?: string[];
  babyDangerSigns?: string[];
  referralMade?: boolean;
  referredTo?: string;
  referralReason?: string;
  notes?: string;
  nextVisitDate?: string;
  nextVisitType?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

interface PostnatalState {
  postnatalRecords: PostnatalRecord[];
  currentPostnatal: PostnatalRecord | null;
  stats: any;
  isLoading: boolean;
  error: string | null;
  pagination: any;
  
  getPostnatalRecords: (filters?: any) => Promise<void>;
  getPostnatalRecord: (id: string) => Promise<PostnatalRecord>;
  recordPostnatalVisit: (data: Partial<PostnatalRecord>) => Promise<PostnatalRecord>;
  updatePostnatalRecord: (id: string, data: Partial<PostnatalRecord>) => Promise<void>;
  deletePostnatalRecord: (id: string) => Promise<void>;
  getPostnatalStatistics: (filters?: any) => Promise<void>;
  clearCurrentPostnatal: () => void;
  clearError: () => void;
}

export const usePostnatalStore = create<PostnatalState>((set, get) => ({
  postnatalRecords: [],
  currentPostnatal: null,
  stats: null,
  isLoading: false,
  error: null,
  pagination: null,

  getPostnatalRecords: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getPostnatalRecords(filters);
      let records = [];
      let pagination = null;
      
      if (response.data?.data) {
        records = response.data.data;
        pagination = response.data.pagination;
      } else if (response.data) {
        records = response.data;
      }
      
      set({ postnatalRecords: records, pagination, isLoading: false });
    } catch (error: unknown) {
      set({ error: (error as any).message, isLoading: false });
      throw error;
    }
  },

  getPostnatalRecord: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getPostnatalRecord(id);
      const record = response.data || response;
      set({ currentPostnatal: record, isLoading: false });
      return record;
    } catch (error: unknown) {
      set({ error: (error as any).message, isLoading: false });
      throw error;
    }
  },

  recordPostnatalVisit: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await recordPostnatalVisit(data);
      const record = response.data || response;
      set((state) => ({
        postnatalRecords: [record, ...state.postnatalRecords],
        currentPostnatal: record,
        isLoading: false,
      }));
      return record;
    } catch (error: unknown) {
      set({ error: (error as any).message, isLoading: false });
      throw error;
    }
  },

  updatePostnatalRecord: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await updatePostnatalRecord(id, data);
      const record = response.data || response;
      set((state) => ({
        postnatalRecords: state.postnatalRecords.map(r => r.id === id ? record : r),
        currentPostnatal: state.currentPostnatal?.id === id ? record : state.currentPostnatal,
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: (error as any).message, isLoading: false });
      throw error;
    }
  },

  deletePostnatalRecord: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await deletePostnatalRecord(id);
      set((state) => ({
        postnatalRecords: state.postnatalRecords.filter(r => r.id !== id),
        currentPostnatal: state.currentPostnatal?.id === id ? null : state.currentPostnatal,
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: (error as any).message, isLoading: false });
      throw error;
    }
  },

  getPostnatalStatistics: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getPostnatalStatistics(filters);
      const stats = response.data || response;
      set({ stats, isLoading: false });
    } catch (error: unknown) {
      set({ error: (error as any).message, isLoading: false });
      throw error;
    }
  },

  clearCurrentPostnatal: () => set({ currentPostnatal: null }),
  clearError: () => set({ error: null }),
}));