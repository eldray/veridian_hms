// src/store/antenatalStore.ts - UPDATED WITH NEW API NAMES
import { create } from 'zustand';
import {
  registerAntenatalBooking,
  getAntenatalRecords,
  getAntenatalRecordByEncounter,
  getActiveAntenatalRecordByPatient,
  getAntenatalRecordById,
  updateAntenatalRecord,
  closeAntenatalRecord,
  deleteAntenatalRecord,
  recordANCVisit,
  getANCVisitsByAntenatalRecord,
  getANCVisitById,
  updateANCVisit,
  deleteANCVisit,
  getAntenatalStatistics,
} from '../api';

interface AntenatalState {
  records: any[];           // Changed from bookings to records
  currentRecord: any | null; // Changed from currentBooking to currentRecord
  currentVisits: any[];
  currentVisit: any | null;
  stats: any;
  ancReport: any | null;
  isLoading: boolean;
  isLoadingRecords: boolean;  // Changed from isLoadingBookings
  isLoadingVisits: boolean;
  isGeneratingReport: boolean;
  error: string | null;
  pagination: any | null;

  // Actions
  getAntenatalRecords: (filters?: any) => Promise<void>;
  getAntenatalRecordByEncounter: (encounterId: string) => Promise<any | null>;
  getActiveAntenatalRecordByPatient: (patientId: string) => Promise<any | null>;
  getAntenatalRecordById: (recordId: string) => Promise<any>;
  refreshAntenatalRecord: (patientId: string) => Promise<void>;
  registerAntenatalBooking: (data: any) => Promise<any>;
  closeAntenatalRecord: (recordId: string, data: any) => Promise<void>;
  deleteAntenatalRecord: (recordId: string) => Promise<void>;
  getANCVisitsByAntenatalRecord: (recordId: string) => Promise<any[]>;
  recordANCVisit: (data: any) => Promise<any>;
  getANCVisitById: (id: string) => Promise<any>;
  updateANCVisit: (id: string, data: any) => Promise<void>;
  deleteANCVisit: (id: string) => Promise<void>;
  getAntenatalStatistics: (filters?: any) => Promise<void>;
  clearCurrentRecord: () => void;
  clearError: () => void;
}

export const useAntenatalStore = create<AntenatalState>((set, get) => ({
  records: [],
  currentRecord: null,
  currentVisits: [],
  currentVisit: null,
  stats: null,
  ancReport: null,
  isLoading: false,
  isLoadingRecords: false,
  isLoadingVisits: false,
  isGeneratingReport: false,
  error: null,
  pagination: null,

  getAntenatalRecords: async (filters = {}) => {
    set({ isLoadingRecords: true, error: null });
    try {
      const response = await getAntenatalRecords(filters);
      let records = [];
      let pagination = null;
      
      if (response.data?.data) {
        records = response.data.data;
        pagination = response.data.pagination;
      } else if (response.data) {
        records = response.data;
      }
      
      set({ records, pagination, isLoadingRecords: false });
    } catch (error: unknown) {
      set({ error: (error as any).message, isLoadingRecords: false });
      throw error;
    }
  },

  getAntenatalRecordByEncounter: async (encounterId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getAntenatalRecordByEncounter(encounterId);
      const record = response.data || response;
      set({ currentRecord: record, isLoading: false });
      return record;
    } catch (error: unknown) {
      if ((error as any).response?.status === 404) {
        set({ currentRecord: null, isLoading: false });
        return null;
      }
      set({ error: (error as any).message, isLoading: false });
      throw error;
    }
  },
  
  getActiveAntenatalRecordByPatient: async (patientId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getActiveAntenatalRecordByPatient(patientId);
      const record = response.data || response;
      set({ currentRecord: record, isLoading: false });
      return record;
    } catch (error: unknown) {
      if ((error as any).response?.status === 404) {
        set({ currentRecord: null, isLoading: false });
        return null;
      }
      set({ error: (error as any).message, isLoading: false });
      throw error;
    }
  },
  
  getAntenatalRecordById: async (recordId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getAntenatalRecordById(recordId);
      const record = response.data || response;
      set({ currentRecord: record, isLoading: false });
      return record;
    } catch (error: unknown) {
      set({ error: (error as any).message, isLoading: false });
      throw error;
    }
  },
  
  refreshAntenatalRecord: async (patientId: string) => {
    try {
      const response = await getActiveAntenatalRecordByPatient(patientId);
      const record = response.data || response;
      set({ currentRecord: record });
      if (record?.id) {
        await get().getANCVisitsByAntenatalRecord(record.id);
      }
    } catch (error) {
      console.error('Error refreshing antenatal record:', error);
    }
  },

  registerAntenatalBooking: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await registerAntenatalBooking(data);
      const record = response.data || response;
      set((state) => ({
        records: [record, ...state.records],
        currentRecord: record,
        isLoading: false,
      }));
      return record;
    } catch (error: unknown) {
      set({ error: (error as any).message, isLoading: false });
      throw error;
    }
  },

  closeAntenatalRecord: async (recordId: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const response = await closeAntenatalRecord(recordId, data);
      const record = response.data || response;
      set((state) => ({
        records: state.records.map(r => r.id === recordId ? record : r),
        currentRecord: state.currentRecord?.id === recordId ? record : state.currentRecord,
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: (error as any).message, isLoading: false });
      throw error;
    }
  },

  deleteAntenatalRecord: async (recordId: string) => {
    set({ isLoading: true, error: null });
    try {
      await deleteAntenatalRecord(recordId);
      set((state) => ({
        records: state.records.filter(r => r.id !== recordId),
        currentRecord: state.currentRecord?.id === recordId ? null : state.currentRecord,
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: (error as any).message, isLoading: false });
      throw error;
    }
  },

  getANCVisitsByAntenatalRecord: async (recordId: string) => {
    set({ isLoadingVisits: true, error: null });
    try {
      const response = await getANCVisitsByAntenatalRecord(recordId);
      const visits = response.data?.visits || response.data || [];
      set({ currentVisits: visits, isLoadingVisits: false });
      return visits;
    } catch (error: unknown) {
      set({ error: (error as any).message, isLoadingVisits: false });
      throw error;
    }
  },

  recordANCVisit: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await recordANCVisit(data);
      const visit = response.data || response;
      set((state) => ({
        currentVisits: [...state.currentVisits, visit],
        currentVisit: visit,
        isLoading: false,
      }));
      return visit;
    } catch (error: unknown) {
      set({ error: (error as any).message, isLoading: false });
      throw error;
    }
  },

  getANCVisitById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getANCVisitById(id);
      const visit = response.data || response;
      set({ currentVisit: visit, isLoading: false });
      return visit;
    } catch (error: unknown) {
      set({ error: (error as any).message, isLoading: false });
      throw error;
    }
  },

  updateANCVisit: async (id, data) => {
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
      set({ error: (error as any).message, isLoading: false });
      throw error;
    }
  },

  deleteANCVisit: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await deleteANCVisit(id);
      set((state) => ({
        currentVisits: state.currentVisits.filter(v => v.id !== id),
        currentVisit: state.currentVisit?.id === id ? null : state.currentVisit,
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: (error as any).message, isLoading: false });
      throw error;
    }
  },

  getAntenatalStatistics: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getAntenatalStatistics(filters);
      const stats = response.data || response;
      set({ stats, isLoading: false });
    } catch (error: unknown) {
      set({ error: (error as any).message, isLoading: false });
      throw error;
    }
  },

  clearCurrentRecord: () => set({ currentRecord: null, currentVisits: [], currentVisit: null }),
  clearError: () => set({ error: null }),
}));