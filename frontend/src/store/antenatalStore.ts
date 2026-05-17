// src/store/antenatalStore.ts - FIXED VERSION
import { create } from 'zustand';
import {
  getAntenatalBookings,
  getActiveBookingByPatient,
  getAntenatalBookingById,
  createAntenatalBooking,
  closeAntenatalBooking,
  getANCVisitsByBooking,
  getANCVisitById,
  updateANCVisit,
  deleteANCVisit,
  getANCStatistics,
} from '../api';

interface AntenatalState {
  bookings: any[];
  currentBooking: any | null;
  currentVisits: any[];
  currentVisit: any | null;
  stats: any;
  ancReport: any | null;
  isLoading: boolean;
  isLoadingBookings: boolean;
  isLoadingVisits: boolean;
  isGeneratingReport: boolean;
  error: string | null;
  pagination: any | null;

  // Actions
  getBookings: (filters?: any) => Promise<void>;
  getBooking: (patientId: string) => Promise<any | null>;
  getBookingById: (bookingId: string) => Promise<any>;
  refreshBooking: (patientId: string) => Promise<void>;
  createBooking: (data: any) => Promise<any>;
  closeBooking: (bookingId: string, data: any) => Promise<void>;
  getANCVisitsByBooking: (bookingId: string) => Promise<any[]>;
  getVisit: (id: string) => Promise<any>;
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
  ancReport: null,
  isLoading: false,
  isLoadingBookings: false,
  isLoadingVisits: false,
  isGeneratingReport: false,
  error: null,
  pagination: null,

  getBookings: async (filters = {}) => {
    set({ isLoadingBookings: true, error: null });
    try {
      const response = await getAntenatalBookings(filters);
      let bookings = [];
      let pagination = null;
      
      if (response.data?.data) {
        bookings = response.data.data;
        pagination = response.data.pagination;
      } else if (response.data) {
        bookings = response.data;
      }
      
      set({ bookings, pagination, isLoadingBookings: false });
    } catch (error: unknown) {
      set({ error: error.message, isLoadingBookings: false });
      throw error;
    }
  },

  getBooking: async (patientId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getActiveBookingByPatient(patientId);
      const booking = response.data || response;
      set({ currentBooking: booking, isLoading: false });
      return booking;
    } catch (error: unknown) {
      // 404 means no booking found - that's fine, not an error
      if (error.response?.status === 404) {
        set({ currentBooking: null, isLoading: false });
        return null;
      }
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  getBookingById: async (bookingId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getAntenatalBookingById(bookingId);
      const booking = response.data || response;
      set({ currentBooking: booking, isLoading: false });
      return booking;
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  refreshBooking: async (patientId: string) => {
    try {
      const response = await getActiveBookingByPatient(patientId);
      const booking = response.data || response;
      set({ currentBooking: booking });
      if (booking?.id) {
        await get().getANCVisitsByBooking(booking.id);
      }
    } catch (error) {
      console.error('Error refreshing booking:', error);
    }
  },

  createBooking: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await createAntenatalBooking(data);
      const booking = response.data || response;
      set((state) => ({
        bookings: [booking, ...state.bookings],
        currentBooking: booking,
        isLoading: false,
      }));
      return booking;
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  closeBooking: async (bookingId: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const response = await closeAntenatalBooking(bookingId, data);
      const booking = response.data || response;
      set((state) => ({
        bookings: state.bookings.map(b => b.id === bookingId ? booking : b),
        currentBooking: state.currentBooking?.id === bookingId ? booking : state.currentBooking,
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getANCVisitsByBooking: async (bookingId: string) => {
    set({ isLoadingVisits: true, error: null });
    try {
      const response = await getANCVisitsByBooking(bookingId);
      const visits = response.data?.visits || response.data || [];
      set({ currentVisits: visits, isLoadingVisits: false });
      return visits;
    } catch (error: unknown) {
      set({ error: error.message, isLoadingVisits: false });
      throw error;
    }
  },

  getVisit: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getANCVisitById(id);
      const visit = response.data || response;
      set({ currentVisit: visit, isLoading: false });
      return visit;
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Note: recordVisit is removed because ANC visits are auto-created when attendance is created
  // To add detailed data, use updateVisit on the existing visit

  updateVisit: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await updateANCVisit(id, data);
      const visit = response.data || response;
      set((state) => ({
        currentVisits: state.currentVisits.map(v => v.id === id ? visit : v),
        currentVisit: visit,
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteVisit: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await deleteANCVisit(id);
      set((state) => ({
        currentVisits: state.currentVisits.filter(v => v.id !== id),
        currentVisit: state.currentVisit?.id === id ? null : state.currentVisit,
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
      const response = await getANCStatistics(filters);
      const stats = response.data || response;
      set({ stats, isLoading: false });
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  clearCurrentBooking: () => set({ currentBooking: null, currentVisits: [], currentVisit: null }),
  clearError: () => set({ error: null }),
}));