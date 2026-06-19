// src/store/patientStore.ts - COMPLETE FIXED VERSION
import { create } from 'zustand';
import { 
  getPatients as apiGetPatients, 
  createPatient as apiCreatePatient, 
  getPatient as apiGetPatient, 
  updatePatient as apiUpdatePatient,
  deletePatient as apiDeletePatient,
  uploadPatientImage as apiUploadPatientImage,
  uploadPatientImageBase64 as apiUploadPatientImageBase64
} from '../api';
import type { Patient, Pagination, PatientFilters } from '../types';

interface PatientState {
  patients: Patient[];
  isLoading: boolean;
  error: string | null;
  currentPatient: Patient | null;
  pagination: Pagination | null;
  
  loadPatients: (filters?: PatientFilters) => Promise<void>;
  addPatient: (data: FormData | Partial<Patient>) => Promise<Patient>;
  getPatientById: (id: string) => Patient | undefined;
  fetchPatient: (id: string) => Promise<Patient>;
  updatePatient: (id: string, data: FormData | Partial<Patient>) => Promise<Patient>;
  deletePatient: (id: string) => Promise<void>;
  uploadPatientImage: (patientId: string, imageFile: File | string) => Promise<string>;
  searchPatients: (query: string) => Patient[];
  clearCurrentPatient: () => void;
  clearError: () => void;
}

// ✅ HELPER: Add fullName to patient object for frontend compatibility
const addFullNameToPatient = (patient: Patient): Patient => {
  if (!patient) return patient;
  
  return {
    ...patient,
    fullName: `${patient.surname || ''} ${patient.otherNames || ''}`.trim()
  } as Patient;
};

// ✅ HELPER: Extract patient data from various API response formats
const extractPatientData = (response: unknown): Patient => {
  console.log('🔍 Extracting patient data from response:', JSON.stringify(response, null, 2));
  
  let patientData: any;
  
  // Try different response structures
  if (response && typeof response === 'object') {
    // Case 1: { success: true, data: { patient: {...} } }
    if ((response as any).data?.patient) {
      patientData = (response as any).data.patient;
      console.log('✅ Found patient in response.data.patient');
    }
    // Case 2: { success: true, data: {...} } (direct patient object)
    else if ((response as any).data && (response as any).data.id) {
      patientData = (response as any).data;
      console.log('✅ Found patient in response.data');
    }
    // Case 3: { patient: {...} }
    else if ((response as any).patient) {
      patientData = (response as any).patient;
      console.log('✅ Found patient in response.patient');
    }
    // Case 4: Direct patient object with id
    else if ((response as any).id) {
      patientData = response;
      console.log('✅ Response is direct patient object');
    }
    // Case 5: { success: true, data: { data: {...} } } (nested)
    else if ((response as any).data?.data?.id) {
      patientData = (response as any).data.data;
      console.log('✅ Found patient in response.data.data');
    }
    else {
      console.warn('⚠️ Could not extract patient data from response:', response);
      patientData = null;
    }
  }
  
  if (!patientData) {
    console.error('❌ No patient data found in response');
    throw new Error('No patient data found in response');
  }
  
  return addFullNameToPatient(patientData);
};

// ✅ HELPER: Extract patients array from various API response formats
const extractPatientsArray = (response: unknown): Patient[] => {
  let patientsArray: any[] = [];
  
  if (Array.isArray(response)) {
    patientsArray = response;
  } else if (Array.isArray((response as any).patients)) {
    patientsArray = (response as any).patients;
  } else if (Array.isArray((response as any).data?.patients)) {
    patientsArray = (response as any).data.patients;
  } else if (Array.isArray((response as any).data?.data)) {
    patientsArray = (response as any).data.data;
  } else if (Array.isArray((response as any).data)) {
    patientsArray = (response as any).data;
  }
  
  return patientsArray.map(addFullNameToPatient);
};

export const usePatientStore = create<PatientState>((set, get) => ({
  patients: [],
  isLoading: false,
  error: null,
  currentPatient: null,
  pagination: null,

  loadPatients: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      console.log('🔄 Loading patients with filters:', filters);
      const response = await apiGetPatients(filters);
      console.log('📡 API getPatients response:', response);
      
      const patients = extractPatientsArray(response);
      const pagination = response.pagination || response.data?.pagination || null;
      
      console.log('✅ Patients loaded:', patients.length);
      set({ 
        patients, 
        pagination,
        isLoading: false 
      });
    } catch (error: unknown) {
      console.error('❌ Failed to load patients:', error);
      const errorMessage = (error as any).response?.data?.message || (error as Error).message || 'Failed to load patients';
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
      console.log('📝 Creating patient');
      
      // ✅ Convert fullName to surname + otherNames if needed
      let processedData = data instanceof FormData ? data : { ...data };
      
      if (!(data instanceof FormData)) {
        if (data.fullName && !data.surname) {
          const nameParts = data.fullName.trim().split(' ');
          processedData.surname = nameParts[0] || '';
          processedData.otherNames = nameParts.slice(1).join(' ') || '';
          delete processedData.fullName;
        }
        console.log('📤 Sending as JSON:', processedData);
      }
      
      const response = await apiCreatePatient(processedData);
      console.log('📡 API createPatient response:', response);
      
      const newPatient = extractPatientData(response);
      
      console.log('✅ Patient created:', newPatient.id);
      
      set((state) => ({ 
        patients: [newPatient, ...state.patients],
        isLoading: false 
      }));
      
      return newPatient;
    } catch (error: unknown) {
      console.error('❌ Failed to add patient:', error);
      const errorMessage = (error as any).response?.data?.message || (error as Error).message || 'Failed to add patient';
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
      console.error('❌ Invalid patient ID:', id);
      set({ error: errorMsg, isLoading: false, currentPatient: null });
      throw new Error(errorMsg);
    }

    set({ isLoading: true, error: null });
    try {
      console.log('🔄 Fetching patient with ID:', id);
      const response = await apiGetPatient(id);
      console.log('📡 API getPatient raw response:', JSON.stringify(response, null, 2));
      
      const patientData = extractPatientData(response);
      
      if (!patientData || !patientData.id) {
        console.error('❌ Invalid patient data received:', patientData);
        throw new Error('Invalid patient data received from server');
      }
      
      console.log('✅ Patient fetched successfully:', {
        id: patientData.id,
        fullName: patientData.fullName,
        folderNumber: patientData.folderNumber
      });
      
      set({ 
        currentPatient: patientData, 
        isLoading: false,
        error: null
      });
      
      return patientData;
    } catch (error: unknown) {
      console.error('❌ Failed to fetch patient:', error);
      const errorMessage = (error as any).response?.data?.message || (error as Error).message || 'Failed to fetch patient';
      set({ 
        error: errorMessage,
        isLoading: false,
        currentPatient: null
      });
      throw new Error(errorMessage);
    }
  },

  updatePatient: async (id: string, data: FormData | any) => {
    set({ isLoading: true, error: null });
    try {
      console.log('📝 Updating patient:', id);
      
      // ✅ Convert fullName to surname + otherNames if needed
      let processedData = data instanceof FormData ? data : { ...data };
      
      if (!(data instanceof FormData)) {
        if (data.fullName && !data.surname) {
          const nameParts = data.fullName.trim().split(' ');
          processedData.surname = nameParts[0] || '';
          processedData.otherNames = nameParts.slice(1).join(' ') || '';
          delete processedData.fullName;
        }
      }
      
      const response = await apiUpdatePatient(id, processedData);
      console.log('📡 API updatePatient response:', response);
      
      const updatedPatient = extractPatientData(response);
      
      console.log('✅ Patient updated:', updatedPatient.id);
      
      set((state) => ({
        patients: state.patients.map((patient) =>
          patient.id === id ? updatedPatient : patient
        ),
        currentPatient: state.currentPatient?.id === id ? updatedPatient : state.currentPatient,
        isLoading: false
      }));
      
      return updatedPatient;
    } catch (error: unknown) {
      console.error('❌ Failed to update patient:', error);
      const errorMessage = (error as any).response?.data?.message || (error as Error).message || 'Failed to update patient';
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
      console.log('🗑️ Deleting patient:', id);
      await apiDeletePatient(id);
      
      console.log('✅ Patient deleted:', id);
      
      set((state) => ({
        patients: state.patients.filter((patient) => patient.id !== id),
        currentPatient: state.currentPatient?.id === id ? null : state.currentPatient,
        isLoading: false
      }));
    } catch (error: unknown) {
      console.error('❌ Failed to delete patient:', error);
      const errorMessage = (error as any).response?.data?.message || (error as Error).message || 'Failed to delete patient';
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
    } catch (error: unknown) {
      console.error('❌ Failed to upload patient image:', error);
      const errorMessage = (error as any).response?.data?.message || (error as Error).message || 'Failed to upload image';
      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  },

  searchPatients: (query: string) => {
    if (!query.trim()) return get().patients;
    
    const lowerQuery = query.toLowerCase();
    return get().patients.filter((patient) => {
      const fullName = patient.fullName?.toLowerCase() || 
                       `${patient.surname} ${patient.otherNames}`.toLowerCase();
      return (
        fullName.includes(lowerQuery) ||
        patient.contact?.includes(query) ||
        patient.folderNumber?.toLowerCase().includes(lowerQuery) ||
        patient.id?.toLowerCase().includes(lowerQuery) ||
        (patient as any).additionalInfo?.idNumber?.toLowerCase().includes(lowerQuery)
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