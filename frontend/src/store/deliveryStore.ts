// src/store/deliveryStore.ts
import { create } from 'zustand';
import { 
  getDeliveries,
  getDelivery,
  createDelivery,
  updateDelivery,
  deleteDelivery,
  getDeliveryStats,
} from '../api';

export interface DeliveryRecord {
  id: string;
  patientId: string;
  attendanceId: string;
  antenatalBookingId?: string;
  admissionId?: string;
  deliveryDate: string;
  deliveryType: 'spontaneous_vertex' | 'assisted_breech' | 'vacuum' | 'forceps' | 'caesarean_section' | 'multiple';
  deliveryOutcome: 'live_birth' | 'stillbirth_fresh' | 'stillbirth_macerated' | 'neonatal_death';
  placeOfDelivery: 'hospital' | 'health_centre' | 'clinic' | 'home' | 'en_route';
  attendant: string;
  attendantRole?: string;
  birthWeight?: number;
  gestationWeeks?: number;
  apgarScore1min?: number;
  apgarScore5min?: number;
  resusCitationDone: boolean;
  numberOfBabies: number;
  maternalOutcome: 'alive' | 'dead_direct_cause' | 'dead_indirect_cause' | 'dead_unknown';
  maternalComplications: string[];
  referralTo?: string;
  referralReason?: string;
  modeOfDelivery?: string;
  episiotomy: boolean;
  perinealTears: boolean;
  retainedPlacenta: boolean;
  postpartumHaemorrhage: boolean;
  estimatedBloodLoss?: number;
  postnatalCheckDone: boolean;
  postnatalDay?: number;
  familyPlanningDiscussed: boolean;
  familyPlanningMethod?: string;
  liveBirths: number;
  stillbirths: number;
  neonatalDeaths: number;
  birthAsphyxia: boolean;
  newbornResuscitation: boolean;
  newbornReferred: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  Newborn?: NewbornRecord[];
}

export interface NewbornRecord {
  id: string;
  deliveryRecordId: string;
  babyNumber: number;
  gender: 'male' | 'female' | 'other';
  birthWeight: number;
  birthLength?: number;
  headCircumference?: number;
  apgarScore1min?: number;
  apgarScore5min?: number;
  apgarScore10min?: number;
  resuscitation: boolean;
  resuscitationMethod?: string;
  condition?: string;
  congenitalAnomalies: string[];
  vitaminKGiven: boolean;
  eyeProphylaxis: boolean;
  bcgGiven: boolean;
  opv0Given: boolean;
  outcome: 'alive' | 'dead_within_24hrs' | 'dead_1_7days' | 'dead_8_28days' | 'referred_out';
  outcomeNotes?: string;
  referredTo?: string;
  referralReason?: string;
  initiatedBreastfeeding: boolean;
  timeToBreastfeed?: number;
  dischargedAlive: boolean;
  dischargeDate?: string;
  neonatalDeathDate?: string;
  causeOfDeath?: string;
  createdAt: string;
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
  getDeliveries: (filters?: any) => Promise<void>;
  getDelivery: (id: string) => Promise<DeliveryRecord>;
  createDelivery: (data: Partial<DeliveryRecord>) => Promise<DeliveryRecord>;
  updateDelivery: (id: string, data: Partial<DeliveryRecord>) => Promise<void>;
  deleteDelivery: (id: string) => Promise<void>;
  getStats: (filters?: any) => Promise<void>;
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

  getDeliveries: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getDeliveries(filters);
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
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getDelivery: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getDelivery(id);
      const delivery = response.data || response;
      set({ currentDelivery: delivery, currentNewborns: delivery?.Newborn || [], isLoading: false });
      return delivery;
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  createDelivery: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await createDelivery(data);
      const delivery = response.data || response;
      set((state) => ({
        deliveries: [delivery, ...state.deliveries],
        currentDelivery: delivery,
        isLoading: false,
      }));
      return delivery;
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateDelivery: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await updateDelivery(id, data);
      const delivery = response.data || response;
      set((state) => ({
        deliveries: state.deliveries.map(d => d.id === id ? delivery : d),
        currentDelivery: state.currentDelivery?.id === id ? delivery : state.currentDelivery,
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteDelivery: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await deleteDelivery(id);
      set((state) => ({
        deliveries: state.deliveries.filter(d => d.id !== id),
        currentDelivery: state.currentDelivery?.id === id ? null : state.currentDelivery,
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
      const response = await getDeliveryStats(filters);
      const stats = response.data || response;
      set({ stats, isLoading: false });
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  clearCurrentDelivery: () => set({ currentDelivery: null, currentNewborns: [] }),
  clearError: () => set({ error: null }),
}));
