// src/store/antenatalStore.ts - UPDATED VERSION
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
  generateANCReport as apiGenerateANCReport,
  getANCVisitsByBooking as apiGetANCVisitsByBooking,  // 🆕 Add this
  AntenatalBookingData,
  ANCVisitData,
  IPTPDose,
  TTDose
} from '../api/antenatal';

export interface AntenatalBooking {
  id: string;
  patientId: string;
  pregnancyNumber: number;
  patient?: any;
  bookingDate: string;
  lmp?: string;
  estimatedDeliveryDate?: string;
  gestationalAgeWeeks?: number;
  gravida: number;
  para: number;
  bloodGroup?: string;
  rhesusStatus?: string;
  hivStatus?: string;
  syphilisStatus?: string;
  hepatitisBStatus?: string;
  bookingWeight?: number;
  bookingBP?: string;
  hbBooking?: number;
  hb36Weeks?: number;
  riskLevel: 'low' | 'medium' | 'high';
  riskNotes?: string;
  currentAttendanceId?: string;  // 🆕 Track current visit
  
  // IPTp tracking
  iptpDoses: IPTPDose[];
  iptp1Date?: string;
  iptp2Date?: string;
  iptp3Date?: string;
  iptp4Date?: string;
  iptp5Date?: string;
  
  // TT tracking
  ttDoses: TTDose[];
  tt1Date?: string;
  tt2Date?: string;
  tt3Date?: string;
  tt4Date?: string;
  tt5Date?: string;
  
  // Malaria
  malariaTested: boolean;
  malariaPositive: boolean;
  malariaTreatment?: string;
  
  // Other
  previousCSection: boolean;
  previousComplications?: string;
  ironFolateGiven: boolean;
  itnGiven: boolean;
  itnGivenDate?: string;
  
  // Delivery
  deliveryRecordId?: string;
  deliveryOutcome?: string;
  deliveryDate?: string;
  postnatalFollowUpCount?: number;  // 🆕 Track postnatal visits
  
  isActive: boolean;
  isCompleted: boolean;
  midwifeId?: string;
  doctorId?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  ANCVisit?: ANCVisit[];
}

export interface ANCVisit {
  id: string;
  bookingId: string;
  attendanceId?: string;
  visitNumber: number;
  visitDate: string;
  gestationalAgeWeeks?: number;
  weight?: number;
  bloodPressure?: string;
  fundalHeight?: number;
  fetalHeartRate?: number;
  fetalMovements?: boolean;
  presentation?: string;
  oedema: boolean;
  oedemaGrade?: string;
  urinalysisProtein?: boolean;
  urinalysisGlucose?: boolean;
  urinalysisBlood?: boolean;
  
  // IPTp
  iptpGiven: boolean;
  iptpDoseNumber?: number;
  iptpDrug?: string;
  
  // TT
  ttGiven: boolean;
  ttDoseNumber?: number;
  
  // Supplements
  ironGiven: boolean;
  folateGiven: boolean;
  calciumGiven: boolean;
  
  // Malaria
  malariaTestDone: boolean;
  malariaTestResult?: string;
  malariaTreatmentGiven: boolean;
  malariaTreatmentType?: string;
  
  // Danger signs
  dangerSignsPresent: boolean;
  dangerSignsList?: DangerSign[];
  referralMade: boolean;
  referredTo?: string;
  referralReason?: string;
  
  nextVisitDate?: string;
  returnInstructions?: string;
  notes?: string;
  recordedById: string;
  recordedBy?: any;
  createdAt: string;
  updatedAt: string;
}

export interface DangerSign {
  sign: string;
  present: boolean;
  notes?: string;
}

interface AntenatalState {
  // Bookings
  bookings: AntenatalBooking[];
  currentBooking: AntenatalBooking | null;
  currentVisits: ANCVisit[];
  currentVisit: ANCVisit | null;
  
  // Stats
  stats: any;
  ancReport: any;
  
  // Loading states
  isLoading: boolean;
  isLoadingBookings: boolean;
  isLoadingVisits: boolean;
  isGeneratingReport: boolean;
  
  // Error
  error: string | null;
  
  // Pagination
  pagination: any;
  
  // Actions
  getBookings: (filters?: any) => Promise<void>;
  getBooking: (patientId: string, pregnancyNumber?: number) => Promise<AntenatalBooking>;
  createBooking: (data: AntenatalBookingData) => Promise<AntenatalBooking>;
  closeBooking: (patientId: string, data: any) => Promise<void>;
  
  getVisits: (bookingId: string) => Promise<void>;
  getANCVisitsByBooking: (bookingId: string) => Promise<ANCVisit[]>;  // 🆕
  getVisit: (id: string) => Promise<ANCVisit>;
  recordVisit: (data: ANCVisitData) => Promise<ANCVisit>;
  updateVisit: (id: string, data: Partial<ANCVisitData>) => Promise<void>;
  deleteVisit: (id: string) => Promise<void>;
  
  getStats: (filters?: any) => Promise<void>;
  generateANCReport: (params: any) => Promise<any>;
  
  // 🆕 Helper to refresh booking data
  refreshBooking: (patientId: string) => Promise<void>;
  
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

  getBooking: async (patientId, pregnancyNumber) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetBooking(patientId, pregnancyNumber);
      const booking = response.data || response;
      set({ currentBooking: booking, isLoading: false });
      return booking;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  // 🆕 Refresh booking data
  refreshBooking: async (patientId: string) => {
    try {
      const response = await apiGetBooking(patientId);
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

  getVisits: async (bookingId) => {
    set({ isLoadingVisits: true, error: null });
    try {
      const response = await apiGetVisits(bookingId);
      const visits = response.data || response;
      set({ currentVisits: Array.isArray(visits) ? visits : (visits?.ANCVisit || []), isLoadingVisits: false });
    } catch (error: any) {
      set({ error: error.message, isLoadingVisits: false });
      throw error;
    }
  },
  
  // 🆕 Get ANC visits by booking ID
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

  generateANCReport: async (params) => {
    set({ isGeneratingReport: true, error: null });
    try {
      const response = await apiGenerateANCReport(params);
      const report = response.data || response;
      set({ ancReport: report, isGeneratingReport: false });
      return report;
    } catch (error: any) {
      set({ error: error.message, isGeneratingReport: false });
      throw error;
    }
  },

  clearCurrentBooking: () => set({ currentBooking: null, currentVisits: [], currentVisit: null }),
  clearError: () => set({ error: null }),
}));