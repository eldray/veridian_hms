// src/store/patientStore.ts - UPDATED WITH IMAGE UPLOAD
import { create } from 'zustand';
import { getPatients, createPatient, getPatient, updatePatient } from '../api';
import { Patient } from '../types';

interface PatientState {
  patients: Patient[];
  isLoading: boolean;
  error: string | null;
  currentPatient: Patient | null;
  
  loadPatients: () => Promise<void>;
  addPatient: (data: FormData | any) => Promise<Patient>;
  getPatientById: (id: string) => Patient | undefined;
  fetchPatient: (id: string) => Promise<Patient>;
  updatePatient: (id: string, data: FormData | any) => Promise<Patient>;
  uploadPatientImage: (patientId: string, imageFile: File | string) => Promise<string>;
  searchPatients: (q: string) => Patient[];
  clearError: () => void;
  clearCurrentPatient: () => void;
}

export const usePatientStore = create<PatientState>((set, get) => ({
  patients: [],
  isLoading: false,
  error: null,
  currentPatient: null,

  loadPatients: async () => {
    set({ isLoading: true, error: null });
    try {
      console.log('🔄 Loading patients...');
      const data = await getPatients();
      console.log('✅ Patients loaded:', data.length);
      set({ patients: data, isLoading: false });
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
      
      let newPatient: Patient;
      
      // If it's already a plain object, send as JSON
      if (!(data instanceof FormData)) {
        console.log('📤 Sending as JSON data');
        newPatient = await createPatient(data);
      } else {
        // Try FormData first, then fall back to JSON if it fails
        try {
          console.log('📤 Sending as FormData');
          newPatient = await createPatient(data);
        } catch (formDataError: any) {
          console.log('🔄 FormData failed, trying JSON format...');
          // Convert FormData to plain object
          const jsonData: any = {};
          for (let [key, value] of (data as any).entries()) {
            // Try to parse JSON strings, otherwise use as-is
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
          newPatient = await createPatient(jsonData);
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
    return get().patients.find((patient) => patient.id === id || patient._id === id);
  },

  fetchPatient: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const patient = await getPatient(id);
      set({ currentPatient: patient, isLoading: false });
      return patient;
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
      const updatedPatient = await updatePatient(id, data);
      set((state) => ({
        patients: state.patients.map((patient) =>
          (patient.id === id || patient._id === id) ? updatedPatient : patient
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

  // NEW: Image upload method
 // NEW: Image upload method using consistent API client
uploadPatientImage: async (patientId: string, imageFile: File | string): Promise<string> => {
  set({ isLoading: true, error: null });
  try {
    let imageUrl: string;

    if (typeof imageFile === 'string') {
      // Base64 image upload
      const response = await api.post(`/patients/${patientId}/image-base64`, { image: imageFile });
      imageUrl = response.data.imageUrl;
    } else {
      // File upload using FormData
      const formData = new FormData();
      formData.append('image', imageFile);
      const response = await api.post(`/patients/${patientId}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      imageUrl = response.data.imageUrl;
    }

    // Update store
    set((state) => ({
      patients: state.patients.map(patient =>
        (patient.id === patientId || patient._id === patientId) 
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
    return get().patients.filter((patient) =>
      patient.fullName?.toLowerCase().includes(lowerQuery) ||
      patient.contact?.includes(query) ||
      patient.folderNumber?.toLowerCase().includes(lowerQuery) ||
      patient.id?.toLowerCase().includes(lowerQuery) ||
      patient._id?.toLowerCase().includes(lowerQuery) ||
      patient.additionalInfo?.idNumber?.toLowerCase().includes(lowerQuery)
    );
  },

  clearError: () => set({ error: null }),
  clearCurrentPatient: () => set({ currentPatient: null }),
}));
