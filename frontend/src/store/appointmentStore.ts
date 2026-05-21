// store/appointmentStore.ts

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
  getClinicianSchedule,        // ✅ Changed from getDoctorSchedule
  getAvailableSlots,
  getAvailableClinicians,      // ✅ New
  convertToAttendance          // ✅ New
} from '../api';
import { Appointment, AppointmentStatistics, ClinicianSchedule } from '../types';

interface AppointmentStore {
  appointments: Appointment[];
  currentAppointment: Appointment | null;
  statistics: AppointmentStatistics | null;
  clinicianSchedules: Record<string, ClinicianSchedule>;  // ✅ Changed from doctorSchedules
  availableSlots: string[];
  availableClinicians: any[];  // ✅ New
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
  getClinicianSchedule: (clinicianId: string, date?: string) => Promise<void>;  // ✅ Changed
  getAvailableSlots: (clinicianId: string, date: string) => Promise<void>;
  getAvailableClinicians: (roles?: string[]) => Promise<void>;  // ✅ New
  convertToAttendance: (appointmentId: string, paymentData: any) => Promise<any>;  // ✅ New
  clearError: () => void;
  clearCurrentAppointment: () => void;
}

export const useAppointmentStore = create<AppointmentStore>((set, get) => ({
  appointments: [],
  currentAppointment: null,
  statistics: null,
  clinicianSchedules: {},      // ✅ Changed
  availableSlots: [],
  availableClinicians: [],     // ✅ New
  isLoading: false,
  error: null,

  getAppointments: async (filters?: any) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getAppointments(filters);
      
      let appointmentsArray: any[] = [];
      
      if (response && response.appointments && Array.isArray(response.appointments)) {
        appointmentsArray = response.appointments;
      } else if (Array.isArray(response)) {
        appointmentsArray = response;
      } else if (response && Array.isArray(response.data)) {
        appointmentsArray = response.data;
      } else {
        appointmentsArray = [];
      }

      set({ appointments: appointmentsArray, isLoading: false });
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch appointments', 
        isLoading: false,
        appointments: []
      });
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
          apt.id === id ? updatedAppointment : apt
        ),
        currentAppointment: state.currentAppointment?.id === id ? updatedAppointment : state.currentAppointment,
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
        appointments: state.appointments.filter(apt => apt.id !== id),
        currentAppointment: state.currentAppointment?.id === id ? null : state.currentAppointment,
        isLoading: false
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to delete appointment', 
        isLoading: false 
      });
    }
  },

  updateAppointmentStatus: async (id: string, status: string) => {
    set({ isLoading: true, error: null });
    try {
      const updatedAppointment = await updateAppointmentStatus(id, status);
      set(state => ({
        appointments: state.appointments.map(apt => 
          apt.id === id ? updatedAppointment : apt
        ),
        currentAppointment: state.currentAppointment?.id === id ? updatedAppointment : state.currentAppointment,
        isLoading: false
      }));
      return updatedAppointment;
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
          apt.id === id ? updatedAppointment : apt
        ),
        currentAppointment: state.currentAppointment?.id === id ? updatedAppointment : state.currentAppointment,
        isLoading: false
      }));
      return updatedAppointment;
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
      return statistics;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch appointment statistics', 
        isLoading: false 
      });
    }
  },

  // ✅ Updated: get clinician schedule
  getClinicianSchedule: async (clinicianId: string, date?: string) => {
    set({ isLoading: true, error: null });
    try {
      const schedule = await getClinicianSchedule(clinicianId, date);
      set(state => ({
        clinicianSchedules: {
          ...state.clinicianSchedules,
          [clinicianId]: schedule
        },
        isLoading: false
      }));
      return schedule;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch clinician schedule', 
        isLoading: false 
      });
    }
  },

  getAvailableSlots: async (clinicianId: string, date: string) => {
    set({ isLoading: true, error: null });
    try {
      const slots = await getAvailableSlots(clinicianId, date);
      set({ availableSlots: slots, isLoading: false });
      return slots;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch available slots', 
        isLoading: false 
      });
    }
  },

// In appointmentStore.ts - getAvailableClinicians method

getAvailableClinicians: async (roles?: string[]) => {
  set({ isLoading: true, error: null });
  try {
    const response = await getAvailableClinicians(roles);
    
    // ✅ Ensure we're setting an array
    let cliniciansArray: any[] = [];
    
    if (Array.isArray(response)) {
      cliniciansArray = response;
    } else if (response?.data && Array.isArray(response.data)) {
      cliniciansArray = response.data;
    } else if (response?.clinicians && Array.isArray(response.clinicians)) {
      cliniciansArray = response.clinicians;
    } else {
      cliniciansArray = [];
    }
    
    set({ availableClinicians: cliniciansArray, isLoading: false });
    return cliniciansArray;
  } catch (error: any) {
    set({ 
      error: error.response?.data?.message || 'Failed to fetch available clinicians', 
      isLoading: false,
      availableClinicians: []  // ✅ Set empty array on error
    });
  }
},

  // ✅ New: convert appointment to attendance
  convertToAttendance: async (appointmentId: string, paymentData: any) => {
    set({ isLoading: true, error: null });
    try {
      const result = await convertToAttendance(appointmentId, paymentData);
      
      // Update appointment status to completed if not already
      await get().updateAppointmentStatus(appointmentId, 'completed');
      
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to convert to attendance', 
        isLoading: false 
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
  clearCurrentAppointment: () => set({ currentAppointment: null }),
}));