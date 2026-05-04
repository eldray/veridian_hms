// src/store/antenatalStore.ts - CORRECTED VERSION
import { create } from 'zustand';
import {
  getAntenatalBookings as apiGetBookings,
  getActiveBookingByPatient as apiGetActiveBooking,      // ✅ For getting booking by patient ID
  getAntenatalBookingById as apiGetBookingById,          // ✅ For getting booking by booking ID
  createAntenatalBooking as apiCreateBooking,
  closeAntenatalBooking as apiCloseBooking,              // ✅ Now uses booking ID
  recordANCVisit as apiRecordVisit,
  getANCVisitsByBooking as apiGetANCVisitsByBooking,     // ✅ Correct name
  getANCVisitById as apiGetVisit,
  updateANCVisit as apiUpdateVisit,
  deleteANCVisit as apiDeleteVisit,
  getANCStatistics as apiGetStats,
  getAntenatalByAttendance as apiGetByAttendance,        // ✅ For getting by attendance
  // generateANCReport as apiGenerateANCReport,          // ❌ Remove - not in API file
  AntenatalBookingData,
  ANCVisitData
} from '../api/antenatal';

// ... interface definitions remain the same ...

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

  // ✅ FIXED: Get active booking by PATIENT ID
  getBooking: async (patientId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetActiveBooking(patientId);
      const booking = response.data || response;
      set({ currentBooking: booking, isLoading: false });
      return booking;
    } catch (error: any) {
      // 404 means no booking found - that's fine, not an error
      if (error.response?.status === 404) {
        set({ currentBooking: null, isLoading: false });
        return null;
      }
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  // ✅ NEW: Get booking by BOOKING ID
  getBookingById: async (bookingId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetBookingById(bookingId);
      const booking = response.data || response;
      set({ currentBooking: booking, isLoading: false });
      return booking;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  // ✅ FIXED: Refresh booking data
  refreshBooking: async (patientId: string) => {
    try {
      const response = await apiGetActiveBooking(patientId);
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

  // ✅ FIXED: Close booking by BOOKING ID (not patientId)
  closeBooking: async (bookingId: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiCloseBooking(bookingId, data);
      const booking = response.data || response;
      set((state) => ({
        bookings: state.bookings.map(b => b.id === bookingId ? booking : b),
        currentBooking: state.currentBooking?.id === bookingId ? booking : state.currentBooking,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // ✅ FIXED: Remove getVisits - use getANCVisitsByBooking instead
  getANCVisitsByBooking: async (bookingId: string) => {
    set({ isLoadingVisits: true, error: null });
    try {
      const response = await apiGetANCVisitsByBooking(bookingId);
      const visits = response.data?.visits || response.data || [];
      set({ currentVisits: visits, isLoadingVisits: false });
      return visits;
    } catch (error: any) {
      set({ error: error.message, isLoadingVisits: false });
      throw error;
    }
  },

  getVisit: async (id) => {
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

  // ✅ Remove generateANCReport since it's not in API file
  // generateANCReport: async (params) => { ... },

  clearCurrentBooking: () => set({ currentBooking: null, currentVisits: [], currentVisit: null }),
  clearError: () => set({ error: null }),
}));