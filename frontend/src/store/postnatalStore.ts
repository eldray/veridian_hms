// src/store/postnatalStore.ts
import { create } from 'zustand';
import api from '../api/antenatal';

export interface PostnatalRecord {
  id: string;
  patientId: string;
  attendanceId: string;
  antenatalBookingId?: string;
  deliveryRecordId?: string;
  examinationDate: string;
  dayNumber: number; // Day 1, 3, 7, 14, 28, 42, etc.
  
  // Maternal assessment
  maternalCondition: 'good' | 'fair' | 'poor' | 'critical';
  maternalComplications: string[];
  bloodPressure?: string;
  temperature?: number;
  pulse?: number;
  fundalHeight?: number; // cm, for involution
  lochia: 'normal' | 'heavy' | 'foul_smelling' | 'scanty';
  perinealCondition: 'intact' | 'healing' | 'infected' | 'dehisced';
  caesareanWound?: 'healing' | 'infected' | 'dehisced';
  
  // Breastfeeding
  breastfeedingStatus: 'exclusive' | 'mixed' | 'not_breastfeeding';
  breastfeedingDifficulties: string[];
  latching: 'good' | 'fair' | 'poor';
  
  // Baby assessment
  babyCondition: 'good' | 'fair' | 'poor' | 'critical';
  babyWeight?: number;
  babyTemperature?: number;
  babyFeeding: 'good' | 'fair' | 'poor';
  jaundice: boolean;
  jaundiceSeverity?: 'mild' | 'moderate' | 'severe';
  cordCondition: 'dry' | 'moist' | 'infected';
  
  // Immunizations given
  bcgGiven: boolean;
  opv0Given: boolean;
  hepB0Given: boolean;
  
  // Family Planning
  familyPlanningDiscussed: boolean;
  familyPlanningMethodAccepted?: string;
  
  // Danger signs
  maternalDangerSigns: string[];
  babyDangerSigns: string[];
  
  // Referrals
  referralMade: boolean;
  referredTo?: string;
  referralReason?: string;
  
  // Next visit
  nextVisitDate?: string;
  nextVisitType?: 'day_7' | 'day_14' | 'day_28' | 'day_42' | 'other';
  
  notes?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

// src/store/postnatalStore.ts - FIXED

// ✅ FIXED: Use plural '/antenatal/postnatals' for list endpoint
const getPostnatalRecords = async (filters?: { patientId?: string; startDate?: string; endDate?: string }) => {
  // Changed from '/antenatal/postnatal' to '/antenatal/postnatals'
  const response = await api.get('/antenatal/postnatals', { params: filters });
  return response.data;
};

// These are correct (singular for specific operations)
const getPostnatalRecord = async (id: string) => {
  const response = await api.get(`/antenatal/postnatal/${id}`);
  return response.data;
};

const createPostnatalRecord = async (data: Partial<PostnatalRecord>) => {
  const response = await api.post('/antenatal/postnatal', data);
  return response.data;
};

const updatePostnatalRecord = async (id: string, data: Partial<PostnatalRecord>) => {
  const response = await api.put(`/antenatal/postnatal/${id}`, data);
  return response.data;
};

const deletePostnatalRecord = async (id: string) => {
  const response = await api.delete(`/antenatal/postnatal/${id}`);
  return response.data;
};


interface PostnatalState {
  postnatalRecords: PostnatalRecord[];
  currentPostnatal: PostnatalRecord | null;
  stats: any;
  isLoading: boolean;
  error: string | null;
  pagination: any;
  
  // Actions
  getPostnatalRecords: (filters?: any) => Promise<void>;
  getPostnatalRecord: (id: string) => Promise<PostnatalRecord>;
  createPostnatalRecord: (data: Partial<PostnatalRecord>) => Promise<PostnatalRecord>;
  updatePostnatalRecord: (id: string, data: Partial<PostnatalRecord>) => Promise<void>;
  deletePostnatalRecord: (id: string) => Promise<void>;
  getPostnatalExamination: (attendanceId: string) => Promise<any>;
  recordPostnatalExamination: (data: any) => Promise<any>;
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
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
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
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  createPostnatalRecord: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await createPostnatalRecord(data);
      const record = response.data || response;
      set((state) => ({
        postnatalRecords: [record, ...state.postnatalRecords],
        currentPostnatal: record,
        isLoading: false,
      }));
      return record;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
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
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
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
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getPostnatalExamination: async (attendanceId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getPostnatalExamination(attendanceId);
      const data = response.data || response;
      set({ isLoading: false });
      return data;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  recordPostnatalExamination: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await recordPostnatalExamination(data);
      const result = response.data || response;
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  clearCurrentPostnatal: () => set({ currentPostnatal: null }),
  clearError: () => set({ error: null }),
}));