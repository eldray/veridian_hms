// src/store/antenatalStore.ts
import { create } from 'zustand';
import {
  getAntenatalBookings as apiGetBookings,
  getAntenatalBooking as apiGetBooking,
  createAntenatalBooking as apiCreateBooking,
  closeAntenatalBooking as apiCloseBooking,
  recordANCVisit as apiRecordVisit,
  getANCVisits as apiGetVisits,
  getANCVisitById as apiGetVisit,
  updateANCVisit as apiUpdateVisit,
  deleteANCVisit as apiDeleteVisit,
  getANCStatistics as apiGetStats,
} from '../api';

interface AntenatalBooking {
  id: string;
  patientId: string;
  patient?: any;
  bookingDate: string;
  gestationalAgeWeeks?: number;
  estimatedDeliveryDate?: string;
  gravida: number;
  para: number;
  lmp?: string;
  bloodGroup?: string;
  rhesusStatus?: string;
  hivStatus?: string;
  syphilisStatus?: string;
  hepatitisBStatus?: string;
  bookingWeight?: number;
  bookingBP?: string;
  riskLevel: 'low' | 'medium' | 'high';
  riskNotes?: string;
  midwifeId?: string;
  doctorId?: string;
  isActive: boolean;
  deliveryOutcome?: string;
  deliveryDate?: string;
  createdAt: string;
  updatedAt: string;
  ANCVisit?: ANCVisit[];
}

interface ANCVisit {
  id: string;
  bookingId: string;
  attendanceId?: string;
  visitNumber: number;
  visitDate: string;
  gestationalAgeWeeks?: number;
  weight?: number;
  bloodPressure?: string;
  fetalHeartRate?: number;
  presentingPart?: string;
  oedema: boolean;
  urinalysis?: string;
  fundalHeight?: number;
  fetalMovement?: boolean;
  supplementsGiven?: string;
  ttVaccineGiven: boolean;
  itnGiven: boolean;
  nextVisitDate?: string;
  notes?: string;
  recordedById: string;
  recordedBy?: any;
  createdAt: string;
  updatedAt: string;
}

interface AntenatalState {
  // Bookings
  bookings: AntenatalBooking[];
  currentBooking: AntenatalBooking | null;
  currentVisits: ANCVisit[];
  currentVisit: ANCVisit | null;
  
  // Stats
  stats: any;
  
  // Loading states
  isLoading: boolean;
  isLoadingBookings: boolean;
  isLoadingVisits: boolean;
  
  // Error
  error: string | null;
  
  // Pagination
  pagination: any;
  
  // Actions
  getBookings: (filters?: any) => Promise<void>;
  getBooking: (patientId: string) => Promise<AntenatalBooking>;
  createBooking: (data: any) => Promise<AntenatalBooking>;
  closeBooking: (patientId: string, data: any) => Promise<void>;
  
  getVisits: (bookingId: string) => Promise<void>;
  getVisit: (id: string) => Promise<ANCVisit>;
  recordVisit: (data: any) => Promise<ANCVisit>;
  updateVisit: (id: string, data: any) => Promise<void>;
  deleteVisit: (id: string) => Promise<void>;
  
  getStats: (filters?: any) => Promise<void>;
  
  clearCurrentBooking: () => void;
  clearError: () => void;
}

export const useAntenatalStore = create<AntenatalState>((set, get) => ({
  bookings: [],
  currentBooking: null,
  currentVisits: [],
  currentVisit: null,
  stats: null,
  isLoading: false,
  isLoadingBookings: false,
  isLoadingVisits: false,
  error: null,
  pagination: null,

  getBookings: async (filters = {}) => {
    set({ isLoadingBookings: true, error: null });
    try {
      const response = await apiGetBookings(filters);
      let bookings = [];
      let pagination = null;
      
      if (response.data?.data) {
        bookings = response.data.data;
        pagination = response.data.pagination;
      } else if (response.data) {
        bookings = response.data;
      }
      
      set({ bookings, pagination, isLoadingBookings: false });
    } catch (error: any) {
      set({ error: error.message, isLoadingBookings: false });
      throw error;
    }
  },

  getBooking: async (patientId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetBooking(patientId);
      const booking = response.data || response;
      set({ currentBooking: booking, isLoading: false });
      return booking;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  createBooking: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiCreateBooking(data);
      const booking = response.data || response;
      set((state) => ({
        bookings: [booking, ...state.bookings],
        currentBooking: booking,
        isLoading: false,
      }));
      return booking;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  closeBooking: async (patientId, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiCloseBooking(patientId, data);
      const booking = response.data || response;
      set((state) => ({
        bookings: state.bookings.map(b => b.patientId === patientId ? booking : b),
        currentBooking: state.currentBooking?.patientId === patientId ? booking : state.currentBooking,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getVisits: async (bookingId: string) => {
    set({ isLoadingVisits: true, error: null });
    try {
      const response = await apiGetVisits(bookingId);
      const visits = response.data || response;
      set({ currentVisits: visits, isLoadingVisits: false });
    } catch (error: any) {
      set({ error: error.message, isLoadingVisits: false });
      throw error;
    }
  },

  getVisit: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetVisit(id);
      const visit = response.data || response;
      set({ currentVisit: visit, isLoading: false });
      return visit;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  recordVisit: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiRecordVisit(data);
      const visit = response.data || response;
      set((state) => ({
        currentVisits: [...state.currentVisits, visit].sort((a, b) => a.visitNumber - b.visitNumber),
        currentVisit: visit,
        isLoading: false,
      }));
      return visit;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateVisit: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiUpdateVisit(id, data);
      const visit = response.data || response;
      set((state) => ({
        currentVisits: state.currentVisits.map(v => v.id === id ? visit : v),
        currentVisit: visit,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteVisit: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await apiDeleteVisit(id);
      set((state) => ({
        currentVisits: state.currentVisits.filter(v => v.id !== id),
        currentVisit: state.currentVisit?.id === id ? null : state.currentVisit,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getStats: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetStats(filters);
      const stats = response.data || response;
      set({ stats, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  clearCurrentBooking: () => set({ currentBooking: null, currentVisits: [], currentVisit: null }),
  clearError: () => set({ error: null }),
}));