// src/store/deliveryStore.ts - UPDATED WITH NEW API NAMES
import { create } from 'zustand';
import { 
  recordDelivery,
  getDeliveryRecords,
  getDeliveryRecord,
  updateDeliveryRecord,
  deleteDeliveryRecord,
  getDeliveryStatistics,
} from '../api';

export interface NewbornRecord {
  id: string;
  deliveryRecordId: string;
  birthWeight: number;
  gender: 'male' | 'female' | 'other';
  apgarScore1min?: number;
  apgarScore5min?: number;
  resuscitation?: boolean;
  outcome?: string;
  breastfeedingWithin30Min?: boolean;
  eyeProphylaxisGiven?: boolean;
  cordCareMethod?: string;
}

export interface DeliveryRecord {
  id: string;
  patientId: string;
  attendanceId: string;
  antenatalRecordId?: string;
  admissionId?: string;
  deliveryDate: string;
  deliveryType: 'spontaneous_vertex' | 'assisted_breech' | 'vacuum' | 'forceps' | 'caesarean_section' | 'multiple';
  deliveryOutcome: 'live_birth' | 'stillbirth_fresh' | 'stillbirth_macerated' | 'neonatal_death';
  placeOfDelivery: string;
  attendant: string;
  birthWeight?: number;
  gestationWeeks?: number;
  apgarScore1min?: number;
  apgarScore5min?: number;
  resusCitationDone: boolean;
  maternalOutcome: string;
  complications: string[];
  referralTo?: string;
  notes?: string;
  malePartnerPresentANC?: boolean;
  malePartnerPresentDelivery?: boolean;
  malePartnerPresentPNC?: boolean;
  maternalDeathsAudited?: boolean;
  auditNotes?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  Newborn?: NewbornRecord[];
}

interface DeliveryState {
  deliveries: DeliveryRecord[];
  currentDelivery: DeliveryRecord | null;
  currentNewborns: NewbornRecord[];
  stats: any;
  isLoading: boolean;
  error: string | null;
  pagination: any;
  
  // Actions
  getDeliveryRecords: (filters?: any) => Promise<void>;
  getDeliveryRecord: (id: string) => Promise<DeliveryRecord>;
  recordDelivery: (data: Partial<DeliveryRecord>) => Promise<DeliveryRecord>;
  updateDeliveryRecord: (id: string, data: Partial<DeliveryRecord>) => Promise<void>;
  deleteDeliveryRecord: (id: string) => Promise<void>;
  getDeliveryStatistics: (filters?: any) => Promise<void>;
  clearCurrentDelivery: () => void;
  clearError: () => void;
}

export const useDeliveryStore = create<DeliveryState>((set, get) => ({
  deliveries: [],
  currentDelivery: null,
  currentNewborns: [],
  stats: null,
  isLoading: false,
  error: null,
  pagination: null,

  getDeliveryRecords: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getDeliveryRecords(filters);
      let deliveries = [];
      let pagination = null;
      
      if (response.data?.data) {
        deliveries = response.data.data;
        pagination = response.data.pagination;
      } else if (response.data) {
        deliveries = response.data;
      } else if (response.deliveries) {
        deliveries = response.deliveries;
      }
      
      set({ deliveries, pagination, isLoading: false });
    } catch (error: unknown) {
      set({ error: (error as any).message, isLoading: false });
      throw error;
    }
  },

  getDeliveryRecord: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getDeliveryRecord(id);
      const delivery = response.data || response;
      set({ currentDelivery: delivery, currentNewborns: delivery?.Newborn || [], isLoading: false });
      return delivery;
    } catch (error: unknown) {
      set({ error: (error as any).message, isLoading: false });
      throw error;
    }
  },

  recordDelivery: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await recordDelivery(data);
      const delivery = response.data || response;
      set((state) => ({
        deliveries: [delivery, ...state.deliveries],
        currentDelivery: delivery,
        isLoading: false,
      }));
      return delivery;
    } catch (error: unknown) {
      set({ error: (error as any).message, isLoading: false });
      throw error;
    }
  },

  updateDeliveryRecord: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await updateDeliveryRecord(id, data);
      const delivery = response.data || response;
      set((state) => ({
        deliveries: state.deliveries.map(d => d.id === id ? delivery : d),
        currentDelivery: state.currentDelivery?.id === id ? delivery : state.currentDelivery,
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: (error as any).message, isLoading: false });
      throw error;
    }
  },

  deleteDeliveryRecord: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await deleteDeliveryRecord(id);
      set((state) => ({
        deliveries: state.deliveries.filter(d => d.id !== id),
        currentDelivery: state.currentDelivery?.id === id ? null : state.currentDelivery,
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: (error as any).message, isLoading: false });
      throw error;
    }
  },

  getDeliveryStatistics: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getDeliveryStatistics(filters);
      const stats = response.data || response;
      set({ stats, isLoading: false });
    } catch (error: unknown) {
      set({ error: (error as any).message, isLoading: false });
      throw error;
    }
  },

  clearCurrentDelivery: () => set({ currentDelivery: null, currentNewborns: [] }),
  clearError: () => set({ error: null }),
}));