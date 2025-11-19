// src/store/patientStore.ts - UPDATED FOR SURNAME + OTHERNAMES
import { create } from 'zustand';
import { 
  getPatients as apiGetPatients, 
  createPatient as apiCreatePatient, 
  getPatient as apiGetPatient, 
  updatePatient as apiUpdatePatient,
  deletePatient as apiDeletePatient,
  getPatientStats as apiGetPatientStats,
  uploadPatientImage as apiUploadPatientImage,
  uploadPatientImageBase64 as apiUploadPatientImageBase64
} from '../api';
import type { Patient, Pagination } from '../types';

interface PatientState {
  patients: Patient[];
  isLoading: boolean;
  error: string | null;
  currentPatient: Patient | null;
  patientStats: any;
  pagination: Pagination | null;
  
  // Core patient operations
  loadPatients: (filters?: any) => Promise<void>;
  addPatient: (data: FormData | any) => Promise<Patient>;
  getPatientById: (id: string) => Patient | undefined;
  fetchPatient: (id: string) => Promise<Patient>;
  updatePatient: (id: string, data: FormData | any) => Promise<Patient>;
  deletePatient: (id: string) => Promise<void>;
  getPatientStats: () => Promise<void>;
  
  // Image operations
  uploadPatientImage: (patientId: string, imageFile: File | string) => Promise<string>;
  
  // Search and utilities
  searchPatients: (query: string) => Patient[];
  clearCurrentPatient: () => void;
  clearError: () => void;
}

export const usePatientStore = create<PatientState>((set, get) => ({
  patients: [],
  isLoading: false,
  error: null,
  currentPatient: null,
  patientStats: null,
  pagination: null,

  loadPatients: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      console.log('🔄 Loading patients...');
      const response = await apiGetPatients(filters);
      
      let patients: Patient[] = [];
      if (Array.isArray(response)) {
        patients = response;
      } else if (Array.isArray(response.patients)) {
        patients = response.patients;
      } else if (Array.isArray(response.data)) {
        patients = response.data;
      }
      
      console.log('✅ Patients loaded:', patients.length);
      set({ 
        patients, 
        pagination: response.pagination || null,
        isLoading: false 
      });
    } catch (error: any) {
      console.error('❌ Failed to load patients:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load patients';
      set({ 
        error: errorMessage,
        isLoading: false 
      });
      throw new Error(errorMessage);
    }
  },

  addPatient: async (data: FormData | any) => {
    set({ isLoading: true, error: null });
    try {
      console.log('📝 Patient data received:', data);
      
      // ✅ FIX: Convert fullName to surname + otherNames for backend
      let processedData = { ...data };
      if (data.fullName && !data.surname) {
        const nameParts = data.fullName.trim().split(' ');
        processedData.surname = nameParts[0] || '';
        processedData.otherNames = nameParts.slice(1).join(' ') || '';
        delete processedData.fullName;
      }
      
      let newPatient: Patient;
      
      if (!(data instanceof FormData)) {
        console.log('📤 Sending as JSON data:', processedData);
        newPatient = await apiCreatePatient(processedData);
      } else {
        try {
          console.log('📤 Sending as FormData');
          newPatient = await apiCreatePatient(processedData);
        } catch (formDataError: any) {
          console.log('🔄 FormData failed, trying JSON format...');
          const jsonData: any = {};
          for (let [key, value] of (data as any).entries()) {
            if (typeof value === 'string') {
              try {
                jsonData[key] = JSON.parse(value);
              } catch {
                jsonData[key] = value;
              }
            } else {
              jsonData[key] = value;
            }
          }
          console.log('📤 Converted to JSON:', jsonData);
          newPatient = await apiCreatePatient(jsonData);
        }
      }
      
      set((state) => ({ 
        patients: [...state.patients, newPatient],
        isLoading: false 
      }));
      return newPatient;
    } catch (error: any) {
      console.error('❌ Failed to add patient:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to add patient';
      set({ 
        error: errorMessage,
        isLoading: false 
      });
      throw new Error(errorMessage);
    }
  },

  getPatientById: (id: string) => {
    return get().patients.find((patient) => patient.id === id);
  },

  fetchPatient: async (id: string) => {
    if (!id || id === 'undefined' || id === 'null') {
      const errorMsg = 'Invalid patient ID: ID cannot be undefined or null';
      console.error('❌ Invalid patient ID requested:', id);
      set({ error: errorMsg, isLoading: false });
      throw new Error(errorMsg);
    }

    set({ isLoading: true, error: null });
    try {
      console.log('🔄 Fetching patient with ID:', id);
      const response = await apiGetPatient(id);
      
      let patientData;
      if (response.data) {
        patientData = response.data;
        console.log('📦 Extracted patient from response.data');
      } else if (response.success && response.data) {
        patientData = response.data;
        console.log('📦 Extracted patient from success response');
      } else {
        patientData = response;
        console.log('📦 Using direct patient object');
      }
      
      console.log('✅ Patient data extracted:', {
        id: patientData.id,
        name: `${patientData.surname} ${patientData.otherNames}`
      });
      
      set({ currentPatient: patientData, isLoading: false });
      return patientData;
    } catch (error: any) {
      console.error('❌ Failed to fetch patient:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch patient';
      set({ 
        error: errorMessage,
        isLoading: false 
      });
      throw new Error(errorMessage);
    }
  },

  updatePatient: async (id: string, data: FormData | any) => {
    set({ isLoading: true, error: null });
    try {
      // ✅ FIX: Convert fullName to surname + otherNames for backend
      let processedData = { ...data };
      if (data.fullName && !data.surname) {
        const nameParts = data.fullName.trim().split(' ');
        processedData.surname = nameParts[0] || '';
        processedData.otherNames = nameParts.slice(1).join(' ') || '';
        delete processedData.fullName;
      }
      
      const updatedPatient = await apiUpdatePatient(id, processedData);
      set((state) => ({
        patients: state.patients.map((patient) =>
          patient.id === id ? updatedPatient : patient
        ),
        currentPatient: state.currentPatient?.id === id ? updatedPatient : state.currentPatient,
        isLoading: false
      }));
      return updatedPatient;
    } catch (error: any) {
      console.error('❌ Failed to update patient:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update patient';
      set({ 
        error: errorMessage,
        isLoading: false 
      });
      throw new Error(errorMessage);
    }
  },

  deletePatient: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiDeletePatient(id);
      set((state) => ({
        patients: state.patients.filter((patient) => patient.id !== id),
        currentPatient: state.currentPatient?.id === id ? null : state.currentPatient,
        isLoading: false
      }));
    } catch (error: any) {
      console.error('❌ Failed to delete patient:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete patient';
      set({ 
        error: errorMessage,
        isLoading: false 
      });
      throw new Error(errorMessage);
    }
  },

  getPatientStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const stats = await apiGetPatientStats();
      set({ patientStats: stats, isLoading: false });
    } catch (error: any) {
      console.error('❌ Failed to fetch patient stats:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch patient stats';
      set({ 
        error: errorMessage,
        isLoading: false 
      });
      throw new Error(errorMessage);
    }
  },

  uploadPatientImage: async (patientId: string, imageFile: File | string): Promise<string> => {
    set({ isLoading: true, error: null });
    try {
      let imageUrl: string;

      if (typeof imageFile === 'string') {
        console.log('📸 Uploading base64 image for patient:', patientId);
        const response = await apiUploadPatientImageBase64(patientId, imageFile);
        imageUrl = response.imageUrl || response.data?.imageUrl;
      } else {
        console.log('📸 Uploading file image for patient:', patientId);
        const formData = new FormData();
        formData.append('image', imageFile);
        const response = await apiUploadPatientImage(patientId, formData);
        imageUrl = response.imageUrl || response.data?.imageUrl;
      }

      console.log('✅ Image uploaded successfully:', imageUrl);

      set((state) => ({
        patients: state.patients.map(patient =>
          patient.id === patientId 
            ? { ...patient, imageUrl } 
            : patient
        ),
        currentPatient: state.currentPatient?.id === patientId 
          ? { ...state.currentPatient, imageUrl } 
          : state.currentPatient,
        isLoading: false
      }));

      return imageUrl;
    } catch (error: any) {
      console.error('❌ Failed to upload patient image:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to upload image';
      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  },

  searchPatients: (query: string) => {
    if (!query.trim()) return get().patients;
    
    const lowerQuery = query.toLowerCase();
    return get().patients.filter((patient) => {
      const fullName = `${patient.surname} ${patient.otherNames}`.toLowerCase();
      return (
        fullName.includes(lowerQuery) ||
        patient.contact?.includes(query) ||
        patient.folderNumber?.toLowerCase().includes(lowerQuery) ||
        patient.id?.toLowerCase().includes(lowerQuery) ||
        patient.additionalInfo?.idNumber?.toLowerCase().includes(lowerQuery)
      );
    });
  },

  clearCurrentPatient: () => {
    set({ currentPatient: null });
  },

  clearError: () => {
    set({ error: null });
  },
}));