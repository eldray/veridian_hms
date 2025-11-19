import { create } from 'zustand';
import { 
  getAppointments, 
  getAppointment, 
  createAppointment, 
  updateAppointment, 
  deleteAppointment,
  updateAppointmentStatus,
  checkInAppointment,
  getAppointmentStatistics,
  getDoctorSchedule,
  getAvailableSlots,
  getAppointmentCalendar // ✅ ADDED MISSING IMPORT
} from '../api';
import { Appointment, AppointmentStatistics, DoctorSchedule } from '../types';

interface AppointmentStore {
  appointments: Appointment[];
  currentAppointment: Appointment | null;
  statistics: AppointmentStatistics | null;
  doctorSchedules: Record<string, DoctorSchedule>;
  availableSlots: string[];
  appointmentCalendar: any[]; // ✅ ADDED MISSING STATE
  isLoading: boolean;
  error: string | null;
  
  // Actions
  getAppointments: (filters?: any) => Promise<void>;
  getAppointment: (id: string) => Promise<void>;
  createAppointment: (data: any) => Promise<void>;
  updateAppointment: (id: string, data: any) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  updateAppointmentStatus: (id: string, status: string) => Promise<void>;
  checkInAppointment: (id: string) => Promise<void>;
  getAppointmentStatistics: (filters?: any) => Promise<void>;
  getDoctorSchedule: (doctorId: string, date?: string) => Promise<void>;
  getAvailableSlots: (doctorId: string, date: string) => Promise<void>;
  getAppointmentCalendar: (month: string, year: string) => Promise<void>; // ✅ ADDED MISSING FUNCTION
  clearError: () => void;
  clearCurrentAppointment: () => void;
}

export const useAppointmentStore = create<AppointmentStore>((set, get) => ({
  appointments: [],
  currentAppointment: null,
  statistics: null,
  doctorSchedules: {},
  availableSlots: [],
  appointmentCalendar: [], // ✅ ADDED INITIAL STATE
  isLoading: false,
  error: null,

  getAppointments: async (filters?: any) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getAppointments(filters);
      
      console.log('🔍 [AppointmentStore] Raw API response:', response);
      
      // Handle the transformed response
      let appointmentsArray: any[] = [];
      
      if (response && response.appointments && Array.isArray(response.appointments)) {
        appointmentsArray = response.appointments;
      } else if (Array.isArray(response)) {
        appointmentsArray = response;
      } else if (response && Array.isArray(response.data)) {
        appointmentsArray = response.data;
      } else {
        console.warn('Unexpected API response structure:', response);
        appointmentsArray = [];
      }

      console.log('📋 [AppointmentStore] Final appointments:', appointmentsArray);
      set({ appointments: appointmentsArray, isLoading: false });
    } catch (error: any) {
      console.error('❌ [AppointmentStore] Error fetching appointments:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch appointments', 
        isLoading: false,
        appointments: []
      });
      throw error; // ✅ ADDED ERROR THROWING
    }
  },

  getAppointment: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const appointment = await getAppointment(id);
      set({ currentAppointment: appointment, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch appointment', 
        isLoading: false 
      });
      throw error; // ✅ ADDED ERROR THROWING
    }
  },

  createAppointment: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      const newAppointment = await createAppointment(data);
      set(state => ({ 
        appointments: [...state.appointments, newAppointment],
        isLoading: false 
      }));
      return newAppointment;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to create appointment', 
        isLoading: false 
      });
      throw error;
    }
  },

  updateAppointment: async (id: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const updatedAppointment = await updateAppointment(id, data);
      set(state => ({
        appointments: state.appointments.map(apt => 
          apt.id === id || apt.id === id ? updatedAppointment : apt // ✅ FIXED ID CHECK
        ),
        currentAppointment: state.currentAppointment?.id === id || state.currentAppointment?.id === id ? updatedAppointment : state.currentAppointment, // ✅ FIXED ID CHECK
        isLoading: false
      }));
      return updatedAppointment;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to update appointment', 
        isLoading: false 
      });
      throw error;
    }
  },

  deleteAppointment: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await deleteAppointment(id);
      set(state => ({
        appointments: state.appointments.filter(apt => apt.id !== id && apt.id !== id), // ✅ FIXED ID CHECK
        currentAppointment: state.currentAppointment?.id === id || state.currentAppointment?.id === id ? null : state.currentAppointment, // ✅ FIXED ID CHECK
        isLoading: false
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to delete appointment', 
        isLoading: false 
      });
      throw error;
    }
  },

  updateAppointmentStatus: async (id: string, status: string) => {
    set({ isLoading: true, error: null });
    try {
      const updatedAppointment = await updateAppointmentStatus(id, status);
      set(state => ({
        appointments: state.appointments.map(apt => 
          apt.id === id || apt.id === id ? updatedAppointment : apt // ✅ FIXED ID CHECK
        ),
        currentAppointment: state.currentAppointment?.id === id || state.currentAppointment?.id === id ? updatedAppointment : state.currentAppointment, // ✅ FIXED ID CHECK
        isLoading: false
      }));
      return updatedAppointment; // ✅ ADDED RETURN
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to update appointment status', 
        isLoading: false 
      });
      throw error;
    }
  },

  checkInAppointment: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const updatedAppointment = await checkInAppointment(id);
      set(state => ({
        appointments: state.appointments.map(apt => 
          apt.id === id || apt.id === id ? updatedAppointment : apt // ✅ FIXED ID CHECK
        ),
        currentAppointment: state.currentAppointment?.id === id || state.currentAppointment?.id === id ? updatedAppointment : state.currentAppointment, // ✅ FIXED ID CHECK
        isLoading: false
      }));
      return updatedAppointment; // ✅ ADDED RETURN
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to check in appointment', 
        isLoading: false 
      });
      throw error;
    }
  },

  getAppointmentStatistics: async (filters?: any) => {
    set({ isLoading: true, error: null });
    try {
      const statistics = await getAppointmentStatistics(filters);
      set({ statistics, isLoading: false });
      return statistics; // ✅ ADDED RETURN
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch appointment statistics', 
        isLoading: false 
      });
      throw error; // ✅ ADDED ERROR THROWING
    }
  },

  getDoctorSchedule: async (doctorId: string, date?: string) => {
    set({ isLoading: true, error: null });
    try {
      const schedule = await getDoctorSchedule(doctorId, date);
      set(state => ({
        doctorSchedules: {
          ...state.doctorSchedules,
          [doctorId]: schedule
        },
        isLoading: false
      }));
      return schedule; // ✅ ADDED RETURN
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch doctor schedule', 
        isLoading: false 
      });
      throw error; // ✅ ADDED ERROR THROWING
    }
  },

  getAvailableSlots: async (doctorId: string, date: string) => {
    set({ isLoading: true, error: null });
    try {
      const slots = await getAvailableSlots(doctorId, date);
      set({ availableSlots: slots, isLoading: false });
      return slots; // ✅ ADDED RETURN
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch available slots', 
        isLoading: false 
      });
      throw error; // ✅ ADDED ERROR THROWING
    }
  },

  // ✅ ADDED MISSING FUNCTION
  getAppointmentCalendar: async (month: string, year: string) => {
    set({ isLoading: true, error: null });
    try {
      const calendarData = await getAppointmentCalendar(month, year);
      set({ appointmentCalendar: calendarData, isLoading: false });
      return calendarData;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch appointment calendar', 
        isLoading: false 
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
  clearCurrentAppointment: () => set({ currentAppointment: null }),
}));