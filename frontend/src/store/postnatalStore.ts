// src/store/postnatalStore.ts
import { create } from 'zustand';
import { 
  getPostnatals,
  getPostnatal,
  createPostnatal,
  updatePostnatal,
  deletePostnatal,
  getPostnatalStats,
} from '../api';

export interface PostnatalRecord {
  id: string;
  patientId: string;
  attendanceId: string;
  antenatalBookingId?: string;
  deliveryRecordId?: string;
  examinationDate: string;
  dayNumber: number;
  maternalCondition: 'good' | 'fair' | 'poor' | 'critical';
  maternalComplications: string[];
  bloodPressure?: string;
  temperature?: number;
  pulse?: number;
  fundalHeight?: number;
  lochia: 'normal' | 'heavy' | 'foul_smelling' | 'scanty';
  perinealCondition: 'intact' | 'healing' | 'infected' | 'dehisced';
  caesareanWound?: 'healing' | 'infected' | 'dehisced';
  breastfeedingStatus: 'exclusive' | 'mixed' | 'not_breastfeeding';
  breastfeedingDifficulties: string[];
  latching: 'good' | 'fair' | 'poor';
  babyCondition: 'good' | 'fair' | 'poor' | 'critical';
  babyWeight?: number;
  babyTemperature?: number;
  babyFeeding: 'good' | 'fair' | 'poor';
  jaundice: boolean;
  jaundiceSeverity?: 'mild' | 'moderate' | 'severe';
  cordCondition: 'dry' | 'moist' | 'infected';
  bcgGiven: boolean;
  opv0Given: boolean;
  hepB0Given: boolean;
  familyPlanningDiscussed: boolean;
  familyPlanningMethodAccepted?: string;
  maternalDangerSigns: string[];
  babyDangerSigns: string[];
  referralTo?: string;
  referralReason?: string;
  notes?: string;
  nextVisitDate?: string;
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
  
  getPostnatals: (filters?: any) => Promise<void>;
  getPostnatal: (id: string) => Promise<PostnatalRecord>;
  createPostnatal: (data: Partial<PostnatalRecord>) => Promise<PostnatalRecord>;
  updatePostnatal: (id: string, data: Partial<PostnatalRecord>) => Promise<void>;
  deletePostnatal: (id: string) => Promise<void>;
  getStats: (filters?: any) => Promise<void>;
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

  getPostnatals: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getPostnatals(filters);
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
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getPostnatal: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getPostnatal(id);
      const record = response.data || response;
      set({ currentPostnatal: record, isLoading: false });
      return record;
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  createPostnatal: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await createPostnatal(data);
      const record = response.data || response;
      set((state) => ({
        postnatalRecords: [record, ...state.postnatalRecords],
        currentPostnatal: record,
        isLoading: false,
      }));
      return record;
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updatePostnatal: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await updatePostnatal(id, data);
      const record = response.data || response;
      set((state) => ({
        postnatalRecords: state.postnatalRecords.map(r => r.id === id ? record : r),
        currentPostnatal: state.currentPostnatal?.id === id ? record : state.currentPostnatal,
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deletePostnatal: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await deletePostnatal(id);
      set((state) => ({
        postnatalRecords: state.postnatalRecords.filter(r => r.id !== id),
        currentPostnatal: state.currentPostnatal?.id === id ? null : state.currentPostnatal,
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getStats: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getPostnatalStats(filters);
      const stats = response.data || response;
      set({ stats, isLoading: false });
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  clearCurrentPostnatal: () => set({ currentPostnatal: null }),
  clearError: () => set({ error: null }),
}));
