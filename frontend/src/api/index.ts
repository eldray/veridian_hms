// src/api/index.ts - COMPLETE FIXED VERSION
import api from './api';
import type { 
  GDRGTariff, Patient, Attendance, Bill, InsuranceProvider, InsuranceClaim,
  Diagnosis, LabTestTemplate, ProcedureTemplate, ScanTemplate, ServiceCatalog,
  StockItem, StockTransaction, Admission, Ward, Bed, User, Department,
  Appointment, Notification, ConsultationType, HospitalInfo, ServiceType, ClaimStatus
} from '../types';

// ============================================
// IMPORT FROM SEPARATE FILES (Antenatal, Documents)
// ============================================
import {
  getAntenatalBookings,
  getActiveBookingByPatient,
  getAntenatalBookingById,
  createAntenatalBooking,
  closeAntenatalBooking,
  getANCStatistics,
  getANCVisitsByBooking,
  getANCVisitById,
  updateANCVisit,
  deleteANCVisit,
  getDeliveries,
  getDelivery,
  createDelivery,
  updateDelivery,
  deleteDelivery,
  getDeliveryStats,
  getPostnatals,
  getPostnatal,
  createPostnatal,
  updatePostnatal,
  deletePostnatal,
  getPostnatalStats
} from './antenatal';

import { documentApi } from './documentApi';

// ============================================
// MISSING TYPES - ADDED
// ============================================

export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  departmentId?: string;
  doctorId?: string;
  patientId?: string;
  diagnosisId?: string;
  procedureId?: string;
  medicationId?: string;
  wardId?: string;
  status?: string;
  paymentMode?: string;
  insuranceProviderId?: string;
  [key: string]: any;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  invoiceDate: string;
  totalAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  stockItemId: string;
  quantity: number;
  unitCost: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface Requisition {
  id: string;
  requisitionNumber: string;
  requestingDepartmentId: string;
  requestedById: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  requiredDate?: string;
  purpose?: string;
  status: 'draft' | 'submitted' | 'approved' | 'fulfilled' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  items?: RequisitionItem[];
}

export interface RequisitionItem {
  id: string;
  requisitionId: string;
  stockItemId: string;
  quantityRequested: number;
  quantityApproved?: number;
  quantityFulfilled?: number;
  purpose?: string;
  notes?: string;
}

// ============================================
// GENERIC RESPONSE HANDLER
// ============================================

const handleResponse = <T>(response: any): T[] => {
  if (Array.isArray(response)) return response as T[];
  if (response?.data && Array.isArray(response.data)) return response.data as T[];
  if (response?.success && Array.isArray(response.data)) return response.data as T[];
  if (response?.attendances && Array.isArray(response.attendances)) return response.attendances as T[];
  if (response?.patients && Array.isArray(response.patients)) return response.patients as T[];
  if (response?.services && Array.isArray(response.services)) return response.services as T[];
  if (response?.providers && Array.isArray(response.providers)) return response.providers as T[];
  if (response?.claims && Array.isArray(response.claims)) return response.claims as T[];
  if (response?.diagnoses && Array.isArray(response.diagnoses)) return response.diagnoses as T[];
  if (response?.admissions && Array.isArray(response.admissions)) return response.admissions as T[];
  if (response?.wards && Array.isArray(response.wards)) return response.wards as T[];
  if (response?.beds && Array.isArray(response.beds)) return response.beds as T[];
  if (response?.departments && Array.isArray(response.departments)) return response.departments as T[];
  if (response?.appointments && Array.isArray(response.appointments)) return response.appointments as T[];
  if (response?.notifications && Array.isArray(response.notifications)) return response.notifications as T[];
  if (response?.consultationTypes && Array.isArray(response.consultationTypes)) return response.consultationTypes as T[];
  if (response?.stockItems && Array.isArray(response.stockItems)) return response.stockItems as T[];
  if (response?.stockTransactions && Array.isArray(response.stockTransactions)) return response.stockTransactions as T[];
  if (response?.requisitions && Array.isArray(response.requisitions)) return response.requisitions as T[];
  if (response?.labTestTemplates && Array.isArray(response.labTestTemplates)) return response.labTestTemplates as T[];
  if (response?.procedureTemplates && Array.isArray(response.procedureTemplates)) return response.procedureTemplates as T[];
  if (response?.scanTemplates && Array.isArray(response.scanTemplates)) return response.scanTemplates as T[];
  
  console.warn('Unexpected API response:', response);
  return [] as T[];
};

// Date conversion helper
const convertISODateToInputFormat = (isoDate: string): string => {
  if (!isoDate) return '';
  
  try {
    const date = new Date(isoDate);
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', isoDate);
      return '';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error converting date:', error);
    return '';
  }
};

// ───── AUTH & PROFILE ─────
export const login = (username: string, password: string) => 
  api.post('/auth/login', { username, password }).then(r => r.data);

export const register = (userData: any) => 
  api.post('/auth/register', userData).then(r => r.data);

export const verifyToken = () => 
  api.get('/auth/profile').then(r => r.data.user || r.data);

export const logout = () => 
  api.post('/auth/logout').then(r => r.data);

export const getUsers = () => 
  api.get('/auth/users').then(r => handleResponse<User>(r.data.users || r.data));

export const getUserStats = () => 
  api.get('/auth/users/stats').then(r => r.data);

// Profile management
export const getProfile = () => 
  api.get('/auth/profile').then(r => r.data.user || r.data);

export const updateProfile = (data: any) => 
  api.put('/auth/profile', data).then(r => r.data.user || r.data);

export const changePassword = (currentPassword: string, newPassword: string) => 
  api.put('/auth/change-password', { currentPassword, newPassword }).then(r => r.data);

// ───── SETTINGS (Admin only) ─────
export const getHospitalDetails = () => 
  api.get('/settings/hospital').then(r => r.data);

export const updateHospitalDetails = (data: any) => 
  api.put('/settings/hospital', data).then(r => r.data);

export const getAllUsers = () => 
  api.get('/settings/users').then(r => handleResponse<User>(r.data));

export const updateUser = (userId: string, data: any) => 
  api.put(`/settings/users/${userId}`, data).then(r => r.data);

export const deactivateUser = (userId: string) => 
  api.put(`/settings/users/${userId}/deactivate`).then(r => r.data);

// ───── HOSPITAL INFO ─────
export const getHospitals = () => 
  api.get('/hospitals').then(r => handleResponse<HospitalInfo>(r.data));

export const getHospital = (id: string) => 
  api.get(`/hospitals/${id}`).then(r => r.data);

export const createHospital = (data: any) => 
  api.post('/hospitals', data).then(r => r.data);

export const updateHospital = (id: string, data: any) => 
  api.put(`/hospitals/${id}`, data).then(r => r.data);

export const deleteHospital = (id: string) => 
  api.delete(`/hospitals/${id}`).then(r => r.data);

export const getHospitalNHISSettings = () => 
  api.get('/hospitals/settings/nhis').then(r => r.data);

export const updateHospitalNHISSettings = (data: any) => 
  api.put('/hospitals/settings/nhis', data).then(r => r.data);

// ───── SETTINGS (SYSTEM) ─────
export const getSystemSettings = () => 
  api.get('/settings').then(r => r.data);

export const updateSystemSettings = (data: any) => 
  api.put('/settings', data).then(r => r.data);

export const getNHISRates = () => 
  api.get('/settings/nhis-rates').then(r => r.data);

export const updateNHISRates = (data: any) => 
  api.put('/settings/nhis-rates', data).then(r => r.data);

// ───── GDRG TARIFFS ─────
export const getGDRGTariffs = async (filters?: { mdc?: string; isActive?: boolean; search?: string }) => {
  const response = await api.get('/gdrg', { params: filters });
  const result = response.data;
  if (result?.success && Array.isArray(result.data)) {
    return result.data;
  }
  if (Array.isArray(result)) {
    return result;
  }
  if (Array.isArray(result?.data)) {
    return result.data;
  }
  console.warn('Unexpected GDRG tariffs response:', result);
  return [];
};

export const getGDRGByCode = async (code: string) => {
  const response = await api.get(`/gdrg/${code}`);
  return response.data?.data || response.data;
};

export const createGDRGTariff = async (data: any) => {
  const response = await api.post('/gdrg', data);
  return response.data?.data || response.data;
};

export const updateGDRGTariff = async (code: string, data: any) => {
  const response = await api.put(`/gdrg/${code}`, data);
  return response.data?.data || response.data;
};

export const deleteGDRGTariff = async (code: string) => {
  const response = await api.delete(`/gdrg/${code}`);
  return response.data;
};

export const lookupGDRGByAge = async (params: { gdrgCode: string; patientId?: string; ageInYears?: number }) => {
  const response = await api.get('/gdrg/lookup/age', { params });
  return response.data?.data || response.data;
};

// ==========================================
// DIAGNOSIS GDRG LINKING
// ==========================================

export const getDiagnosesByGDRG = async (gdrgCode: string) => {
  const response = await api.get(`/gdrg/${gdrgCode}/diagnoses`);
  return response.data?.data || response.data || [];
};

export const linkDiagnosisToGDRG = async (gdrgCode: string, diagnosisId: string, isPrimary?: boolean, mappedIcdCode?: string) => {
  const response = await api.post(`/gdrg/${gdrgCode}/diagnosis`, { 
    diagnosisId, 
    isPrimary: isPrimary || false, 
    mappedIcdCode: mappedIcdCode || '' 
  });
  return response.data;
};

export const unlinkDiagnosisFromGDRG = async (gdrgCode: string, diagnosisId: string) => {
  const response = await api.delete(`/gdrg/${gdrgCode}/diagnosis/${diagnosisId}`);
  return response.data;
};

export const getGDRGByDiagnosis = async (diagnosisId: string) => {
  const response = await api.get(`/gdrg/diagnosis/${diagnosisId}`);
  return response.data;
};

// ==========================================
// PROCEDURE GDRG LINKING
// ==========================================

export const linkProcedureToGDRG = async (gdrgCode: string, data: { procedureId: string; isPrimary?: boolean; mappedCode?: string }) => {
  const response = await api.post(`/gdrg/${gdrgCode}/procedure`, data);
  return response.data;
};

export const unlinkProcedureFromGDRG = async (gdrgCode: string, procedureId: string) => {
  const response = await api.delete(`/gdrg/${gdrgCode}/procedure/${procedureId}`);
  return response.data;
};

export const getProceduresByGDRG = async (gdrgCode: string) => {
  const response = await api.get(`/gdrg/${gdrgCode}/procedures`);
  return response.data;
};

export const getGDRGByProcedure = async (procedureId: string) => {
  const response = await api.get(`/gdrg/procedure/${procedureId}`);
  return response.data;
};

// ───── INSURANCE PROVIDERS ─────
export const getInsuranceProviders = () => 
  api.get('/insurance-providers').then(r => {
    return handleResponse<InsuranceProvider>(r.data);
  });

export const getInsuranceProvider = (id: string) => 
  api.get(`/insurance-providers/${id}`).then(r => r.data);

export const createInsuranceProvider = (data: any) => 
  api.post('/insurance-providers', data).then(r => r.data);

export const updateInsuranceProvider = (id: string, data: any) => 
  api.put(`/insurance-providers/${id}`, data).then(r => r.data);

export const deleteInsuranceProvider = (id: string) => 
  api.delete(`/insurance-providers/${id}`).then(r => r.data);

// ======================
// INSURANCE CLAIM API FUNCTIONS
// ======================

export const generateNHISClaim = (attendanceId: string) => 
  api.post('/insurance-claims/nhis/generate', { attendanceId }).then(r => r.data);

export const getNHISClaims = (filters?: any) => 
  api.get('/insurance-claims/nhis', { params: filters }).then(r => r.data);

export const generatePrivateInsuranceClaim = (attendanceId: string) => 
  api.post('/insurance-claims/private/generate', { attendanceId }).then(r => r.data);

export const getPrivateInsuranceClaims = (filters?: any) => 
  api.get('/insurance-claims/private', { params: filters }).then(r => r.data);

export const getInsuranceClaims = (filters?: any) => 
  api.get('/insurance-claims', { params: filters }).then(r => r.data);

export const getInsuranceClaim = (id: string) => 
  api.get(`/insurance-claims/${id}`).then(r => r.data);

export const getClaimByAttendanceId = (attendanceId: string) => 
  api.get(`/insurance-claims/attendance/${attendanceId}`).then(r => r.data);

// ✅ FIX 1: Add the missing updateClaimDraft function (alias for updateInsuranceClaim)
export const updateClaimDraft = (claimId: string, data: any) => 
  api.patch(`/insurance-claims/${claimId}/draft`, data).then(r => r.data);

// ✅ FIX 2: Keep updateInsuranceClaim for the store
export const updateInsuranceClaim = (claimId: string, data: any) => 
  api.patch(`/insurance-claims/${claimId}`, data).then(r => r.data);

export const finalizeClaim = (claimId: string) => 
  api.post(`/insurance-claims/${claimId}/finalize`).then(r => r.data);

export const updateClaimStatus = (claimId: string, data: { status: string; notes?: string }) => 
  api.patch(`/insurance-claims/${claimId}/status`, data).then(r => r.data);

export const generateClaimXML = (claimId: string) => 
  api.get(`/insurance-claims/${claimId}/xml`, { responseType: 'blob' }).then(r => r.data);

export const generateClaimPrint = (claimId: string) => 
  api.get(`/insurance-claims/${claimId}/print`).then(r => r.data);

export const getFinalizedClaimsTotal = (filters?: any) => 
  api.get('/insurance-claims/financials/finalized-total', { params: filters }).then(r => r.data);

// BATCH CLAIMS
export const createClaimBatch = (data: { claimIds: string[]; description?: string; insuranceType?: string }) => 
  api.post('/insurance-claims/batches', data).then(r => r.data);

export const getClaimBatches = (filters?: any) => 
  api.get('/insurance-claims/batches', { params: filters }).then(r => r.data);

export const getClaimBatch = (id: string) => 
  api.get(`/insurance-claims/batches/${id}`).then(r => r.data);

export const addClaimsToBatch = (batchId: string, claimIds: string[]) => 
  api.post(`/insurance-claims/batches/${batchId}/claims`, { claimIds }).then(r => r.data);

export const removeClaimsFromBatch = (batchId: string, claimIds: string[]) => 
  api.delete(`/insurance-claims/batches/${batchId}/claims`, { data: { claimIds } }).then(r => r.data);

export const generateBatchXML = (batchId: string) => 
  api.get(`/insurance-claims/batches/${batchId}/xml`, { responseType: 'blob' }).then(r => r.data);

export const updateBatchStatus = (batchId: string, status: string) => 
  api.patch(`/insurance-claims/batches/${batchId}/status`, { status }).then(r => r.data);

export const deleteClaimBatch = (batchId: string) => 
  api.delete(`/insurance-claims/batches/${batchId}`).then(r => r.data);

// ───── PATIENTS ─────
export const getPatient = (id: string) => 
  api.get(`/patients/${id}`).then(r => {
    const patient = r.data;
    if (patient.dateOfBirth && patient.dateOfBirth.includes('T')) {
      patient.dateOfBirth = convertISODateToInputFormat(patient.dateOfBirth);
    }
    return patient;
  });

export const getPatients = (filters?: any) => 
  api.get('/patients', { params: filters }).then(r => {
    const patients = handleResponse<Patient>(r.data);
    return patients.map((patient: any) => ({
      ...patient,
      dateOfBirth: patient.dateOfBirth && patient.dateOfBirth.includes('T') 
        ? convertISODateToInputFormat(patient.dateOfBirth)
        : patient.dateOfBirth
    }));
  });

export const createPatient = (data: any) => {
  const processedData = { ...data };
  if (processedData.dateOfBirth && processedData.dateOfBirth.includes('T')) {
    processedData.dateOfBirth = processedData.dateOfBirth.split('T')[0];
  }
  if (data instanceof FormData) {
    return api.post('/patients', processedData, { 
      headers: { 'Content-Type': 'multipart/form-data' } 
    }).then(r => r.data);
  } else {
    return api.post('/patients', processedData).then(r => r.data);
  }
};

export const updatePatient = (id: string, data: any) => {
  const processedData = { ...data };
  if (processedData.dateOfBirth && processedData.dateOfBirth.includes('T')) {
    processedData.dateOfBirth = processedData.dateOfBirth.split('T')[0];
  }
  if (data instanceof FormData) {
    return api.put(`/patients/${id}`, processedData, { 
      headers: { 'Content-Type': 'multipart/form-data' } 
    }).then(r => r.data);
  } else {
    return api.put(`/patients/${id}`, processedData).then(r => r.data);
  }
};

export const uploadPatientImage = (patientId: string, formData: FormData) =>
  api.post(`/patients/${patientId}/upload-image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);

export const uploadPatientImageBase64 = (patientId: string, base64Image: string) =>
  api.post(`/patients/${patientId}/upload-image-base64`, { image: base64Image }).then(r => r.data);

export const deletePatient = (id: string) => 
  api.delete(`/patients/${id}`).then(r => r.data);

// ───── ATTENDANCES ─────
export const getAttendances = (filters?: any) => 
  api.get('/attendances', { params: filters }).then(r => {
    const attendances = handleResponse<Attendance>(r.data);
    return { 
      data: attendances, 
      attendances: attendances,
      pagination: r.data.pagination 
    };
  });

export const getAttendance = (id: string) => {
  if (!id || id === 'undefined' || id === 'null') {
    return Promise.reject(new Error('Valid Attendance ID is required'));
  }
  return api.get(`/attendances/${id}`).then(r => {
    const attendance = r.data;
    return { ...attendance, _id: attendance.id || attendance._id };
  });
};

export const createAttendance = (data: any) => 
  api.post('/attendances', data).then(r => {
    const attendance = r.data;
    return { ...attendance, _id: attendance.id || attendance._id };
  });

export const updateAttendance = (id: string, data: any) => {
  if (!id || id === 'undefined' || id === 'null') {
    return Promise.reject(new Error('Valid Attendance ID is required'));
  }
  return api.put(`/attendances/${id}`, data).then(r => {
    const attendance = r.data;
    return { ...attendance, _id: attendance.id || attendance._id };
  });
};

export const deleteAttendance = (id: string) => {
  if (!id || id === 'undefined' || id === 'null') {
    return Promise.reject(new Error('Valid Attendance ID is required'));
  }
  return api.delete(`/attendances/${id}`).then(r => r.data);
};

export const updateAttendanceStatus = (id: string, data: any) => {
  if (!id || id === 'undefined' || id === 'null') {
    return Promise.reject(new Error('Valid Attendance ID is required'));
  }
  return api.patch(`/attendances/${id}/status`, data).then(r => {
    const attendance = r.data;
    return { ...attendance, _id: attendance.id || attendance._id };
  });
};

// Diagnosis Operations
export const addDiagnosisToAttendance = (attendanceId: string, data: any) => 
  api.post(`/attendances/${attendanceId}/diagnoses`, data).then(r => r.data);

export const removeDiagnosisFromAttendance = (attendanceId: string, diagnosisId: string) => 
  api.delete(`/attendances/${attendanceId}/diagnoses/${diagnosisId}`).then(r => r.data);

// Lab Test Operations
export const addLabTestToAttendance = (attendanceId: string, data: any) => 
  api.post(`/attendances/${attendanceId}/lab-tests`, data).then(r => r.data);

export const updateLabTestStatus = (attendanceId: string, labTestId: string, data: any) => 
  api.patch(`/attendances/${attendanceId}/lab-tests/${labTestId}`, data).then(r => r.data);

export const removeLabTestFromAttendance = (attendanceId: string, labTestId: string) => 
  api.delete(`/attendances/${attendanceId}/lab-tests/${labTestId}`).then(r => r.data);

// Procedure Operations
export const addProcedureToAttendance = (attendanceId: string, data: any) => 
  api.post(`/attendances/${attendanceId}/procedures`, data).then(r => r.data);

export const updateProcedureStatus = (attendanceId: string, procedureId: string, data: any) => 
  api.patch(`/attendances/${attendanceId}/procedures/${procedureId}`, data).then(r => r.data);

export const removeProcedureFromAttendance = (attendanceId: string, procedureId: string) => 
  api.delete(`/attendances/${attendanceId}/procedures/${procedureId}`).then(r => r.data);

// Medication Operations
export const addMedicationToAttendance = async (attendanceId: string, data: { 
  stockItemId: string; 
  serviceCatalogId: string; 
  dosage: string; 
  frequency: string; 
  duration: string; 
  route?: string; 
  instructions?: string 
}) => {
  const response = await api.post(`/attendances/${attendanceId}/medications`, data);
  return response.data;
};

export const updateMedicationStatus = async (
  attendanceId: string,
  medicationId: string,
  data: {
    status: string;
    dispensedAt?: string;
    dispensedById?: string;
    quantity?: number;
    dispensedUnitCost?: number;
    batchNumber?: string;
  }
) => {
  const response = await api.patch(`/attendances/${attendanceId}/medications/${medicationId}`, data);
  return response;
};

export const removeMedicationFromAttendance = async (attendanceId: string, medicationId: string) => {
  const response = await api.delete(`/attendances/${attendanceId}/medications/${medicationId}`);
  return response.data;
};

// Scan Operations
export const addScanToAttendance = async (attendanceId: string, data: { serviceCatalogId: string; priority?: string; notes?: string }) => {
  const response = await api.post(`/attendances/${attendanceId}/scans`, data);
  return response.data;
};

export const updateScanStatus = async (attendanceId: string, scanId: string, data: any) => {
  const response = await api.patch(`/attendances/${attendanceId}/scans/${scanId}`, data);
  return response.data;
};

export const removeScanFromAttendance = async (attendanceId: string, scanId: string) => {
  const response = await api.delete(`/attendances/${attendanceId}/scans/${scanId}`);
  return response.data;
};

// Service Operations
export const addServiceToAttendance = async (attendanceId: string, data: any) => {
  const response = await api.post(`/attendances/${attendanceId}/services`, data);
  return response.data;
};

export const removeServiceFromAttendance = async (attendanceId: string, serviceId: string) => {
  const response = await api.delete(`/attendances/${attendanceId}/services/${serviceId}`);
  return response.data;
};

// Bed Assignment
export const assignBedToAttendance = (attendanceId: string, data: any) => 
  api.post(`/attendances/${attendanceId}/assign-bed`, data).then(r => r.data);

// ============================================
// VITALS API
// ============================================

export const addVitalsToAttendance = async (attendanceId: string, data: any) => {
  const response = await api.post(`/attendances/${attendanceId}/vitals`, data);
  return response.data;
};

export const getVitalsByAttendance = async (attendanceId: string) => {
  const response = await api.get(`/attendances/${attendanceId}/vitals`);
  return response.data;
};

export const updateVitals = async (attendanceId: string, vitalsId: string, data: any) => {
  const response = await api.put(`/attendances/${attendanceId}/vitals/${vitalsId}`, data);
  return response.data;
};

export const deleteVitals = async (attendanceId: string, vitalsId: string) => {
  const response = await api.delete(`/attendances/${attendanceId}/vitals/${vitalsId}`);
  return response.data;
};

// Progress Notes Operations
export const addProgressNoteToAttendance = (attendanceId: string, data: any) => 
  api.post(`/attendances/${attendanceId}/progress-notes`, data).then(r => r.data);

export const removeProgressNoteFromAttendance = (attendanceId: string, noteId: string) => 
  api.delete(`/attendances/${attendanceId}/progress-notes/${noteId}`).then(r => r.data);

// Billing Operations
export const getBillingBreakdown = (attendanceId: string) => 
  api.get(`/attendances/${attendanceId}/billing-breakdown`).then(r => r.data);

export const calculateAttendanceBill = async (attendanceId: string) => {
  const response = await api.post(`/attendances/${attendanceId}/calculate-bill`);
  return response.data;
};

export const getAttendanceStats = async (filters?: any) => {
  const params = new URLSearchParams();
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  const response = await api.get(`/attendances/stats${params.toString() ? `?${params}` : ''}`);
  return response.data;
};

// NHIS Claim Validation
export const validateNHISClaim = (attendanceId: string) => 
  api.get(`/attendances/${attendanceId}/nhis/validate`).then(r => r.data);

export const generateNHISClaimFromAttendance = (attendanceId: string) => 
  api.get(`/attendances/${attendanceId}/nhis/generate-claim-data`).then(r => r.data);

// ───── BILLS & PAYMENTS ─────
export const getBills = (filters?: any) => 
  api.get('/bills', { params: filters }).then(r => { 
    console.log('📊 API Bills Response:', r.data);
    if (Array.isArray(r.data)) {
      return r.data;
    } else if (r.data && Array.isArray(r.data.data)) {
      return r.data.data;
    } else if (r.data && Array.isArray(r.data.bills)) {
      return r.data.bills;
    } else {
      console.warn('Unexpected bills API structure:', r.data);
      return [];
    }
  });

export const getBill = (id: string) => 
  api.get(`/bills/${id}`).then(r => r.data);

export const createBill = (data: any) => 
  api.post('/bills', data).then(r => r.data);

export const updateBill = (id: string, data: any) => 
  api.put(`/bills/${id}`, data).then(r => r.data);

export const deleteBill = (id: string) => 
  api.delete(`/bills/${id}`).then(r => r.data);

export const addPaymentToBill = (billId: string, data: any) => 
  api.post(`/bills/${billId}/payments`, data).then(r => r.data);

export const generateBillFromAttendance = (attendanceId: string) => 
  api.post(`/bills/generate/${attendanceId}`).then(r => r.data);

export const generateBillReport = (billId: string) => 
  api.get(`/bills/${billId}/report`).then(r => r.data);

export const getBillingBreakdownForBill = (billId: string) => 
  api.get(`/bills/${billId}/breakdown`).then(r => r.data);

export const updateBillStatus = (billId: string, data: any) => 
  api.patch(`/bills/${billId}/status`, data).then(r => r.data);

export const getBillStatistics = () => 
  api.get('/bills/statistics').then(r => r.data);

// Bill Line Items
export const getBillLineItems = (billId: string) => 
  api.get(`/bills/${billId}/line-items`).then(r => r.data);

export const voidBillLineItem = (lineItemId: string, data: { reason: string }) => 
  api.delete(`/bills/line-items/${lineItemId}/void`, { data }).then(r => r.data);

// ======================
// WAIVER API FUNCTIONS
// ======================

export const createWaiverRequest = (data: {
  patientId: string;
  billId?: string;
  waiverType: string;
  reason: string;
  amountRequested: number;
  supportingDocs?: string[];
}) => api.post('/waivers', data).then(r => r.data);

export const getWaivers = (filters?: {
  status?: string;
  waiverType?: string;
  patientId?: string;
  billId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}) => api.get('/waivers', { params: filters }).then(r => r.data);

export const getWaiverById = (id: string) => 
  api.get(`/waivers/${id}`).then(r => r.data);

export const updateWaiverStatus = (id: string, data: {
  status: string;
  amountApproved?: number;
  rejectionReason?: string;
}) => api.patch(`/waivers/${id}/status`, data).then(r => r.data);

export const approveWaiver = (id: string, amountApproved?: number) => 
  api.post(`/waivers/${id}/approve`, { amountApproved }).then(r => r.data);

export const rejectWaiver = (id: string, rejectionReason?: string) => 
  api.post(`/waivers/${id}/reject`, { rejectionReason }).then(r => r.data);

export const getWaiversByBill = (billId: string) => 
  api.get(`/waivers/bill/${billId}`).then(r => r.data);

export const getWaiversByPatient = (patientId: string, filters?: { page?: number; limit?: number }) => 
  api.get(`/waivers/patient/${patientId}`, { params: filters }).then(r => r.data);

export const getWaiverStatistics = (filters?: { startDate?: string; endDate?: string }) => 
  api.get('/waivers/statistics', { params: filters }).then(r => r.data);

export const deleteWaiver = (id: string) => 
  api.delete(`/waivers/${id}`).then(r => r.data);

export const applyWaiverToBill = (billId: string, waiverId: string) => 
  api.post(`/bills/${billId}/apply-waiver`, { waiverId }).then(r => r.data);

// Ward Charges
export const getWardCharges = (attendanceId: string, params?: any) => 
  api.get(`/attendances/${attendanceId}/ward-charges`, { params }).then(r => r.data);

export const generateDailyWardCharges = (date?: string) => 
  api.post('/admissions/ward-charges/generate', { date }).then(r => r.data);

// Receipt Generation
export const generateReceipt = (billId: string) => 
  api.post(`/documents/receipt/${billId}`).then(r => r.data);

// ───── ADMISSIONS ─────
export const getAdmissions = (filters?: any) => 
  api.get('/admissions', { params: filters }).then(r => handleResponse<Admission>(r.data));

export const getAdmission = (id: string) => 
  api.get(`/admissions/${id}`).then(r => r.data);

export const createAdmission = (data: any) => 
  api.post('/admissions', data).then(r => r.data);

export const updateAdmission = (id: string, data: any) => 
  api.put(`/admissions/${id}`, data).then(r => r.data);

export const deleteAdmission = (id: string) => 
  api.delete(`/admissions/${id}`).then(r => r.data);

export const dischargePatient = (id: string, data: any) => 
  api.post(`/admissions/${id}/discharge`, data).then(r => r.data);

export const updateAdmissionWithNHISData = (id: string, data: any) => 
  api.patch(`/admissions/${id}/nhis`, data).then(r => r.data);

export const addDailyNotesToAdmission = (admissionId: string, data: any) => 
  api.post(`/admissions/${admissionId}/daily-notes`, data).then(r => r.data);

export const getAdmissionStats = () => 
  api.get('/admissions/stats').then(r => r.data);

export const getAdmissionsByPatientId = (patientId: string) => 
  api.get(`/admissions/patient/${patientId}`).then(r => r.data);

// Admission Secondary Diagnoses
export const addSecondaryDiagnosisToAdmission = (admissionId: string, data: any) => 
  api.post(`/admissions/${admissionId}/secondary-diagnoses`, data).then(r => r.data);

export const removeSecondaryDiagnosisFromAdmission = (admissionId: string, diagnosisId: string) => 
  api.delete(`/admissions/${admissionId}/secondary-diagnoses/${diagnosisId}`).then(r => r.data);

// Daily Notes for Admissions
export const addDailyNoteToAdmission = (admissionId: string, data: any) => 
  api.post(`/admissions/${admissionId}/daily-notes`, data).then(r => r.data);

export const updateDailyNote = (admissionId: string, noteId: string, data: any) => 
  api.put(`/admissions/${admissionId}/daily-notes/${noteId}`, data).then(r => r.data);

export const deleteDailyNote = (admissionId: string, noteId: string) => 
  api.delete(`/admissions/${admissionId}/daily-notes/${noteId}`).then(r => r.data);

// ───── WARDS & BEDS ─────
export const getWards = (filters?: any) => 
  api.get('/wards', { params: filters }).then(r => handleResponse<Ward>(r.data));

export const getWard = (id: string) => 
  api.get(`/wards/${id}`).then(r => r.data);

export const createWard = (data: any) => 
  api.post('/wards', data).then(r => r.data);

export const updateWard = (id: string, data: any) => 
  api.put(`/wards/${id}`, data).then(r => r.data);

export const deleteWard = (id: string) => 
  api.delete(`/wards/${id}`).then(r => r.data);

export const getAvailableBeds = () => 
  api.get('/wards/available-beds').then(r => r.data);

export const getBeds = (filters?: any) => 
  api.get('/beds', { params: filters }).then(r => handleResponse<Bed>(r.data));

export const getBed = (id: string) => 
  api.get(`/beds/${id}`).then(r => r.data);

export const createBed = (data: any) => 
  api.post('/beds', data).then(r => r.data);

export const updateBed = (id: string, data: any) => 
  api.put(`/beds/${id}`, data).then(r => r.data);

export const deleteBed = (id: string) => 
  api.delete(`/beds/${id}`).then(r => r.data);

// ───── STOCK MANAGEMENT ─────
export const getStockItems = (filters?: any) => 
  api.get('/stock-items', { params: filters }).then(r => handleResponse<StockItem>(r.data));

export const getStockItem = (id: string) => 
  api.get(`/stock-items/${id}`).then(r => r.data);

export const createStockItem = (data: any) => 
  api.post('/stock-items', data).then(r => r.data);

export const updateStockItem = (id: string, data: any) => 
  api.put(`/stock-items/${id}`, data).then(r => r.data);

export const deleteStockItem = (id: string) => 
  api.delete(`/stock-items/${id}`).then(r => r.data);

export const getLowStockItems = () => 
  api.get('/stock-items/alerts/low-stock').then(r => r.data);

export const getStockCategories = () => 
  api.get('/stock-items/categories').then(r => r.data);

export const updateStockLevel = (id: string, data: { quantity: number; transactionType: string; reference?: string; notes?: string }) => 
  api.patch(`/stock-items/${id}/stock-level`, data).then(r => r.data);

export const getStockItemTransactionHistory = (stockItemId: string, filters?: { page?: number; limit?: number }) => 
  api.get(`/stock-items/${stockItemId}/transactions`, { params: filters }).then(r => r.data);

// ───── STOCK TRANSACTIONS ─────
export const getStockTransactions = (filters?: any) => 
  api.get('/stock-transactions', { params: filters }).then(r => handleResponse<StockTransaction>(r.data));

export const getStockTransaction = (id: string) => 
  api.get(`/stock-transactions/${id}`).then(r => r.data);

export const createStockTransaction = (data: any) => 
  api.post('/stock-transactions', data).then(r => r.data);

export const updateStockTransaction = (id: string, data: { notes?: string; reference?: string }) => 
  api.put(`/stock-transactions/${id}`, data).then(r => r.data);

export const getStockMovementReport = (filters?: any) => 
  api.get('/stock-transactions/reports/movement', { params: filters }).then(r => r.data);

export const getLowStockAlerts = () => 
  api.get('/stock-transactions/alerts/low-stock').then(r => r.data);

// ───── INVOICES ─────
export const getInvoices = (filters?: any) => 
  api.get('/invoices', { params: filters }).then(r => handleResponse<Invoice>(r.data));

export const getInvoice = (id: string) => 
  api.get(`/invoices/${id}`).then(r => r.data);

export const createInvoice = (data: any) => 
  api.post('/invoices', data).then(r => r.data);

export const updateInvoice = (id: string, data: any) => 
  api.put(`/invoices/${id}`, data).then(r => r.data);

export const deleteInvoice = (id: string) => 
  api.delete(`/invoices/${id}`).then(r => r.data);

// ───── REQUISITIONS ─────
export const getRequisitions = (filters?: any) => 
  api.get('/requisitions', { params: filters }).then(r => handleResponse<Requisition>(r.data));

export const getRequisition = (id: string) => 
  api.get(`/requisitions/${id}`).then(r => r.data);

export const createRequisition = (data: any) => 
  api.post('/requisitions', data).then(r => r.data);

export const updateRequisition = (id: string, data: any) => 
  api.put(`/requisitions/${id}`, data).then(r => r.data);

export const deleteRequisition = (id: string) => 
  api.delete(`/requisitions/${id}`).then(r => r.data);

export const updateRequisitionStatus = (id: string, status: string, additionalData?: any) => 
  api.patch(`/requisitions/${id}/status`, { status, ...(additionalData || {}) }).then(r => r.data);

export const submitRequisition = (id: string) => updateRequisitionStatus(id, 'submitted');
export const approveRequisition = (id: string) => updateRequisitionStatus(id, 'approved');
export const fulfillRequisition = (id: string, data?: any) => updateRequisitionStatus(id, 'fulfilled', data);
export const cancelRequisition = (id: string) => updateRequisitionStatus(id, 'cancelled');

export const approveRequisitionItems = (id: string, data: { approvedItems: Array<{ requisitionItemId: string; quantityApproved: number; notes?: string }> }) => 
  api.post(`/requisitions/${id}/approve-items`, data).then(r => r.data);

// ───── STOCK REPORTS ─────
export const getStockValueSummary = () => 
  api.get('/stock-items/reports/value-summary').then(r => r.data);

export const getExpiryReport = (days?: number) => 
  api.get('/stock-items/reports/expiry', { params: { days } }).then(r => r.data);

export const getMovementSummary = (startDate?: string, endDate?: string) => 
  api.get('/stock-items/reports/movement-summary', { params: { startDate, endDate } }).then(r => r.data);

export const getUsageReport = (period?: string, limit?: number) => 
  api.get('/stock-items/reports/usage', { params: { period, limit } }).then(r => r.data);

export const getSupplierReport = () => 
  api.get('/stock-items/reports/supplier').then(r => r.data);

export const getRequisitionSummary = (startDate?: string, endDate?: string) => 
  api.get('/stock-items/reports/requisition-summary', { params: { startDate, endDate } }).then(r => r.data);

// ============================================
// REFERRAL API CALLS
// ============================================

export const getReferrals = async (params?: { status?: string; page?: number; limit?: number }) => {
  const response = await api.get('/referrals', { params });
  return response.data;
};

export const getReferralById = async (id: string) => {
  const response = await api.get(`/referrals/${id}`);
  return response.data;
};

export const createOutgoingReferral = async (data: {
  patientId: string;
  referralReason: string;
  referredToFacility: string;
  referredToDoctor?: string;
  referredToDepartment?: string;
  urgency?: string;
  referralNotes?: string;
  attendanceId?: string;
}) => {
  const response = await api.post('/referrals/outgoing', data);
  return response.data;
};

export const createIncomingReferral = async (data: {
  patientId: string;
  referralReason: string;
  referredFromFacility: string;
  referredFromDoctor?: string;
  urgency?: string;
  referralNotes?: string;
}) => {
  const response = await api.post('/referrals/incoming', data);
  return response.data;
};

export const updateReferralStatus = async (id: string, status: string, outcomeNotes?: string) => {
  const response = await api.put(`/referrals/${id}/status`, { status, outcomeNotes });
  return response.data;
};

export const updateReferral = async (id: string, data: any) => {
  const response = await api.put(`/referrals/${id}`, data);
  return response.data;
};

export const deleteReferral = async (id: string) => {
  const response = await api.delete(`/referrals/${id}`);
  return response.data;
};

export const getReferralsByPatient = async (patientId: string, params?: { page?: number; limit?: number }) => {
  const response = await api.get(`/referrals/patient/${patientId}`, { params });
  return response.data;
};

export const generateReferralLetter = async (id: string) => {
  const response = await api.get(`/referrals/${id}/letter`);
  return response.data;
};

export const getReferralStats = async (params?: { startDate?: string; endDate?: string }) => {
  const response = await api.get('/referrals/stats', { params });
  return response.data;
};

// ───── MEDICAL SERVICES ─────
export const getDiagnoses = (filters?: any) => 
  api.get('/diagnoses', { params: filters }).then(r => {
    if (r.data?.success && Array.isArray(r.data.data)) return r.data.data;
    if (Array.isArray(r.data)) return r.data;
    if (r.data?.data && Array.isArray(r.data.data)) return r.data.data;
    return [];
  });
  
export const getDiagnosis = (id: string) => 
  api.get(`/diagnoses/${id}`).then(r => r.data);

export const createDiagnosis = (data: any) => 
  api.post('/diagnoses', data).then(r => r.data);

export const updateDiagnosis = (id: string, data: any) => 
  api.put(`/diagnoses/${id}`, data).then(r => r.data);

export const deleteDiagnosis = (id: string) => 
  api.delete(`/diagnoses/${id}`).then(r => r.data);

export const searchDiagnoses = (query: string) => 
  api.get('/diagnoses/search', { params: { query } }).then(r => r.data);

export const getMorbidityGroups = () =>
  api.get('/diagnoses/morbidity-groups').then(r => r.data);

export const getDiagnosesByMorbidityGroup = (morbidityGroup: string) =>
  api.get(`/diagnoses/morbidity-group/${morbidityGroup}`).then(r => r.data);

export const getDiagnosisStats = () => 
  api.get('/diagnoses/stats').then(r => r.data);

export const bulkUpdateDiagnoses = (data: any) => 
  api.post('/diagnoses/bulk-update', data).then(r => r.data);

export const getLabTestTemplates = (filters?: any) => 
  api.get('/lab-test-templates', { params: filters }).then(r => handleResponse<LabTestTemplate>(r.data));

export const getLabTestTemplate = (id: string) => 
  api.get(`/lab-test-templates/${id}`).then(r => r.data);

export const createLabTestTemplate = (data: any) => 
  api.post('/lab-test-templates', data).then(r => r.data);

export const updateLabTestTemplate = (id: string, data: any) => 
  api.put(`/lab-test-templates/${id}`, data).then(r => r.data);

export const deleteLabTestTemplate = (id: string) => 
  api.delete(`/lab-test-templates/${id}`).then(r => r.data);

export const getLabTestCategories = () => 
  api.get('/lab-test-templates/categories').then(r => r.data);

export const getLabTestSubCategories = () => 
  api.get('/lab-test-templates/sub-categories').then(r => r.data);

export const getSpecimenTypes = () => 
  api.get('/lab-test-templates/specimen-types').then(r => r.data);

export const bulkUpdateLabTestTemplates = (data: any) => 
  api.post('/lab-test-templates/bulk-update', data).then(r => r.data);

export const getProcedureTemplates = (filters?: any) => 
  api.get('/procedure-templates', { params: filters }).then(r => handleResponse<ProcedureTemplate>(r.data));

export const getProcedureTemplate = (id: string) => 
  api.get(`/procedure-templates/${id}`).then(r => r.data);

export const createProcedureTemplate = (data: any) => 
  api.post('/procedure-templates', data).then(r => r.data);

export const updateProcedureTemplate = (id: string, data: any) => 
  api.put(`/procedure-templates/${id}`, data).then(r => r.data);

export const deleteProcedureTemplate = (id: string) => 
  api.delete(`/procedure-templates/${id}`).then(r => r.data);

export const getProcedureCategories = () => 
  api.get('/procedure-templates/categories').then(r => r.data);

export const getProcedureDepartments = () => 
  api.get('/procedure-templates/departments').then(r => r.data);

export const bulkUpdateProcedureTemplates = (data: any) => 
  api.post('/procedure-templates/bulk-update', data).then(r => r.data);

// ───── SERVICE CATALOG ─────
export const getServiceCatalog = (filters?: any) => 
  api.get('/service-catalog', { params: filters }).then(r => {
    const services = handleResponse<ServiceCatalog>(r.data);
    return {
      data: services,
      services: services,
      pagination: r.data.pagination
    };
  });

export const getServiceCatalogItem = (id: string) => {
  if (!id || id === 'undefined' || id === 'null') {
    return Promise.reject(new Error('Valid Service ID is required'));
  }
  return api.get(`/service-catalog/${id}`).then(r => {
    const service = r.data;
    return { ...service, _id: service.id || service._id };
  });
};

export const createServiceCatalogItem = (data: any) => {
  if (!data.name || !data.code) {
    return Promise.reject(new Error('Service name and code are required'));
  }
  return api.post('/service-catalog', data).then(r => {
    const service = r.data.service || r.data;
    return { ...service, _id: service.id || service._id };
  });
};

export const updateServiceCatalogItem = (id: string, data: any) => {
  if (!id || id === 'undefined' || id === 'null') {
    console.error('Update attempted with invalid ID:', id);
    return Promise.reject(new Error('Valid Service ID is required for update'));
  }
  if (!data || Object.keys(data).length === 0) {
    return Promise.reject(new Error('Update data is required'));
  }
  return api.put(`/service-catalog/${id}`, data).then(r => {
    const service = r.data.service || r.data;
    return { ...service, _id: service.id || service._id };
  });
};

export const deleteServiceCatalogItem = (id: string) => {
  if (!id || id === 'undefined' || id === 'null') {
    console.error('Delete attempted with invalid ID:', id);
    return Promise.reject(new Error('Valid Service ID is required for deletion'));
  }
  console.log('Deleting service with ID:', id);
  return api.delete(`/service-catalog/${id}`).then(r => r.data);
};

export const getServiceMetadata = () => 
  api.get('/service-catalog/metadata').then(r => r.data);

export const getNHISReadinessReport = () => 
  api.get('/service-catalog/nhis-report').then(r => r.data);

export const getServiceByNHISCode = (nhisCode: string) => 
  api.get(`/service-catalog/nhis/${nhisCode}`).then(r => r.data);

export const getServicesByCategory = (category: string) => 
  api.get(`/service-catalog/category/${category}`).then(r => r.data);

export const checkServiceCoverage = (data: any) => 
  api.post('/service-catalog/check-coverage', data).then(r => r.data);

export const calculateServiceCost = (data: any) => 
  api.post('/service-catalog/calculate-cost', data).then(r => r.data);
  
// Scan Templates
export const getScanTemplates = (filters?: any) => 
  api.get('/scan-templates', { params: filters }).then(r => handleResponse<ScanTemplate>(r.data));

export const getScanTemplate = (id: string) => 
  api.get(`/scan-templates/${id}`).then(r => r.data);

export const createScanTemplate = (data: any) => 
  api.post('/scan-templates', data).then(r => r.data);

export const updateScanTemplate = (id: string, data: any) => 
  api.put(`/scan-templates/${id}`, data).then(r => r.data);

export const deleteScanTemplate = (id: string) => 
  api.delete(`/scan-templates/${id}`).then(r => r.data);

export const getScanCategories = () => 
  api.get('/scan-templates/categories').then(r => r.data);

export const getScanBodyParts = () => 
  api.get('/scan-templates/body-parts').then(r => r.data);

export const getScanTypes = () => 
  api.get('/scan-templates/scan-types').then(r => r.data);

export const bulkUpdateScanTemplates = (data: any) => 
  api.post('/scan-templates/bulk-update', data).then(r => r.data);

// ───── CONSULTATION TYPES ─────
export const getConsultationTypes = (filters?: any) => 
  api.get('/consultation-types', { params: filters }).then(r => handleResponse<ConsultationType>(r.data));

export const getConsultationType = (id: string) => 
  api.get(`/consultation-types/${id}`).then(r => r.data);

export const createConsultationType = (data: any) => 
  api.post('/consultation-types', data).then(r => r.data);

export const updateConsultationType = (id: string, data: any) => 
  api.put(`/consultation-types/${id}`, data).then(r => r.data);

export const deleteConsultationType = (id: string) => 
  api.delete(`/consultation-types/${id}`).then(r => r.data);

// ============================================
// GHS REPORT API CALLS
// ============================================

export const getGHSOPDReport = async (filters: ReportFilter) => {
  const response = await api.get('/reports/ghs/opd', { params: filters });
  return response.data.data;
};

export const getGHSIPDReport = async (filters: ReportFilter) => {
  const response = await api.get('/reports/ghs/ipd', { params: filters });
  return response.data.data;
};

export const getGHSDeliveryReport = async (filters: ReportFilter) => {
  const response = await api.get('/reports/ghs/delivery', { params: filters });
  return response.data.data;
};

export const getGHSFormAReport = async (filters: ReportFilter) => {
  const response = await api.get('/reports/ghs/form-a', { params: filters });
  return response.data;
};

export const getGHSMalariaReport = async (filters: ReportFilter) => {
  const response = await api.get('/reports/ghs/malaria', { params: filters });
  return response.data.data;
};

export const getGHSIDSRReport = async (filters: ReportFilter) => {
  const response = await api.get('/reports/ghs/idsr', { params: filters });
  return response.data.data;
};

export const getGHSFamilyPlanningReport = async (filters: ReportFilter) => {
  const response = await api.get('/reports/family-planning', { params: filters });
  return response.data.data;
};

export const getMorbidityMortalityReport = async (filters: ReportFilter) => {
  const response = await api.get('/reports/ghs/morbidity-mortality', { params: filters });
  return response.data;
};

export const getTopDiagnoses = async (filters: ReportFilter, limit: number = 10) => {
  const response = await api.get('/reports/ghs/top-diagnoses', { 
    params: { ...filters, limit } 
  });
  return response.data?.data || response.data || [];
};

export const exportGHSReportToCSV = async (submissionId: string) => {
  const response = await api.get(`/reports/ghs/submissions/${submissionId}/export`, {
    responseType: 'blob'
  });
  return response.data;
};

export const getGHSReportSubmissions = async (filters?: { reportType?: string; year?: number; month?: number }) => {
  const response = await api.get('/reports/ghs/submissions', { params: filters });
  return response.data.data;
};

export const getGHSReportSubmissionById = async (id: string) => {
  const response = await api.get(`/reports/ghs/submissions/${id}`);
  return response.data.data;
};

// ============================================
// REGULAR REPORT API CALLS
// ============================================

export const getDemographicReport = async (filters: ReportFilter) => {
  const response = await api.get('/reports/demographic', { params: filters });
  return response.data.data;
};

export const getFinancialReport = async (filters: ReportFilter) => {
  const response = await api.get('/reports/financial', { params: filters });
  return response.data.data;
};

export const getInsuranceClaimsReport = async (filters: ReportFilter) => {
  const response = await api.get('/reports/insurance-claims', { params: filters });
  return response.data.data;
};

export const getClinicalReport = async (filters: ReportFilter) => {
  const response = await api.get('/reports/clinical', { params: filters });
  return response.data.data;
};

export const getAttendanceReport = async (filters: ReportFilter) => {
  const response = await api.get('/reports/attendance', { params: filters });
  return response.data.data;
};

export const getRevenueReport = async (filters: ReportFilter) => {
  const response = await api.get('/reports/revenue', { params: filters });
  return response.data.data;
};

export const exportReport = async (data: { 
  reportType: string; 
  format: string; 
  filters: ReportFilter;
  data: any;
}) => {
  const response = await api.post('/reports/export', data);
  return response.data;
};

// ============================================
// ============================================
// CLINICAL REPORTS API CALLS
// ============================================

export const getClinicalReports = async (filters?: any) => {
  const response = await api.get('/clinical-reports', { params: filters });
  return response.data.data || response.data;
};

export const getLabReportData = async (filters: ReportFilter) => {
  const response = await api.get('/clinical-reports/lab', { params: filters });
  return response.data.data || response.data;
};

export const getScanReportData = async (filters: ReportFilter) => {
  const response = await api.get('/clinical-reports/scan', { params: filters });
  return response.data.data || response.data;
};

export const getProcedureReportData = async (filters: ReportFilter) => {
  const response = await api.get('/clinical-reports/procedure', { params: filters });
  return response.data.data || response.data;
};

export const getMedicationReportData = async (filters: ReportFilter) => {
  const response = await api.get('/clinical-reports/medication', { params: filters });
  return response.data.data || response.data;
};

export const getVitalsReportData = async (filters: ReportFilter) => {
  const response = await api.get('/clinical-reports/vitals', { params: filters });
  return response.data.data || response.data;
};

// Legacy names for backward compatibility
export const getLabReport = getLabReportData;
export const getScanReport = getScanReportData;
export const getProcedureReport = getProcedureReportData;
export const getMedicationReport = getMedicationReportData;
export const getVitalsReport = getVitalsReportData;

// ======================
// DEPARTMENT API FUNCTIONS
// ======================

export const getDepartments = (filters?: any) => 
  api.get('/departments', { params: filters }).then(r => r.data?.data || r.data);

export const getDepartment = (id: string) => 
  api.get(`/departments/${id}`).then(r => r.data?.data || r.data);

export const createDepartment = (data: any) => 
  api.post('/departments', data).then(r => r.data?.data || r.data);

export const updateDepartment = (id: string, data: any) => 
  api.put(`/departments/${id}`, data).then(r => r.data?.data || r.data);

export const deleteDepartment = (id: string) => 
  api.delete(`/departments/${id}`).then(r => r.data);

export const getDepartmentStats = (id: string) => 
  api.get(`/departments/${id}/stats`).then(r => r.data?.data || r.data);

export const getDepartmentUsers = (departmentId: string) => 
  api.get(`/departments/${departmentId}/users`).then(r => r.data?.data?.users || r.data?.users || r.data);

export const assignUserToDepartment = (departmentId: string, data: any) => 
  api.post(`/departments/${departmentId}/assign-user`, data).then(r => r.data?.data || r.data);

export const assignDepartmentHead = (departmentId: string, userId: string) => 
  api.put(`/departments/${departmentId}`, { headId: userId }).then(r => r.data?.data || r.data);

export const removeUserFromDepartment = (departmentId: string, data: any) => 
  api.post(`/departments/${departmentId}/remove-user`, data).then(r => r.data?.data || r.data);

export const bulkUpdateDepartments = (data: any) => 
  api.post('/departments/bulk-update', data).then(r => r.data);

// ======================
// APPOINTMENT API FUNCTIONS
// ======================

export const getAppointments = (filters?: any) => 
  api.get('/appointments', { params: filters }).then(r => handleResponse<Appointment>(r.data));

export const getAppointment = (id: string) => 
  api.get(`/appointments/${id}`).then(r => r.data);

export const createAppointment = (data: any) => 
  api.post('/appointments', data).then(r => r.data?.appointment ?? r.data);

export const updateAppointment = (id: string, data: any) => 
  api.put(`/appointments/${id}`, data).then(r => r.data?.appointment ?? r.data);

export const deleteAppointment = (id: string) => 
  api.delete(`/appointments/${id}`).then(r => r.data);

export const updateAppointmentStatus = (id: string, status: string) => 
  api.put(`/appointments/${id}`, { status }).then(r => r.data);

export const checkInAppointment = (id: string) => 
  api.put(`/appointments/${id}`, { status: 'checked_in' }).then(r => r.data);

export const getAppointmentStatistics = (filters?: any) => 
  api.get('/appointments/stats', { params: filters }).then(r => r.data);

export const getDoctorSchedule = (doctorId: string, date?: string) => 
  api.get(`/appointments/schedule`, { 
    params: { doctorId, date } 
  }).then(r => r.data);

export const getAvailableSlots = (doctorId: string, date: string) => 
  api.get(`/appointments/available-slots`, { 
    params: { doctorId, date } 
  }).then(r => r.data);

// ======================
// NOTIFICATION API FUNCTIONS
// ======================

export const getNotifications = (filters?: any) => 
  api.get('/notifications', { params: filters }).then(r => handleResponse<Notification>(r.data));

export const getNotification = (id: string) => 
  api.get(`/notifications/${id}`).then(r => r.data);

export const markNotificationAsRead = (id: string) => 
  api.patch(`/notifications/${id}/read`).then(r => r.data);

export const markAllNotificationsAsRead = () => 
  api.patch('/notifications/mark-all-read').then(r => r.data);

export const deleteNotification = (id: string) => 
  api.delete(`/notifications/${id}`).then(r => r.data);

export const getNotificationStats = () => 
  api.get('/notifications/stats').then(r => r.data);

export const createNotification = (data: any) => 
  api.post('/notifications', data).then(r => r.data);

export const sendBulkNotification = async (data: {
  userIds: string[];
  senderId?: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  actionType?: string;
  actionId?: string;
  actionUrl?: string;
}) => {
  const response = await api.post('/notifications/bulk', data);
  return response.data;
};

export const sendRoleNotification = async (data: {
  roles: string[];
  senderId?: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  actionType?: string;
  actionId?: string;
  actionUrl?: string;
  excludeUserId?: string;
}) => {
  const response = await api.post('/notifications/role', data);
  return response.data;
};

export const sendUserMessage = (data: {
  toUserId: string;
  title: string;
  message: string;
  priority?: string;
  actionUrl?: string;
}) => api.post('/notifications/message', data).then(r => r.data);

export const sendBulkUserMessages = (data: {
  userIds: string[];
  title: string;
  message: string;
  priority?: string;
  actionUrl?: string;
}) => api.post('/notifications/messages/bulk', data).then(r => r.data);

export const getConversations = () => api.get('/notifications/conversations').then(r => r.data);

// ───── WORKLIST ─────
export const getWorklists = (filters?: { type?: string; status?: string; departmentId?: string }) =>
  api.get('/worklists', { params: filters }).then(r => r.data);

export const getWorklist = (id: string) =>
  api.get(`/worklists/${id}`).then(r => r.data);

export const updateWorklist = (id: string, data: any) =>
  api.put(`/worklists/${id}`, data).then(r => r.data);

export const completeWorklist = (id: string, data: { results?: any; notes?: string }) =>
  api.post(`/worklists/${id}/complete`, data).then(r => r.data);

export const triggerLowStockCheck = async () => {
  const response = await api.post('/notifications/trigger/low-stock');
  return response.data;
};

export const triggerAppointmentReminders = async () => {
  const response = await api.post('/notifications/trigger/reminders');
  return response.data;
};

export const cleanupOldNotifications = async (daysToKeep: number = 30) => {
  const response = await api.delete(`/notifications/cleanup?daysToKeep=${daysToKeep}`);
  return response.data;
};

export const getUnreadCount = async () => {
  const response = await api.get('/notifications/unread-count');
  return response.data;
};

// ======================
// USER API FUNCTIONS WITH DEPARTMENT SUPPORT
// ======================

export const getUsersByDepartment = (departmentId: string) => 
  api.get(`/users/department/${departmentId}`).then(r => r.data);

export const updateUserDepartment = (userId: string, departmentId: string) => 
  api.patch(`/users/${userId}/department`, { departmentId }).then(r => r.data);

// ======================
// DASHBOARD STATISTICS
// ======================

export const getDashboardStats = () => 
  api.get('/dashboard/stats').then(r => r.data);

export const getAppointmentCalendar = (month: string, year: string) => 
  api.get('/dashboard/appointment-calendar', { 
    params: { month, year } 
  }).then(r => r.data);

// ======================
// BACKUP SYSTEM
// ======================

export const createBackup = async () => {
  const response = await api.post('/backup/create');
  return response.data;
};

export const restoreBackup = async (backupFile: any) => {
  const formData = new FormData();
  formData.append('backupFile', backupFile);
  
  const response = await api.post('/backup/restore', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

export const getBackupList = async () => {
  const response = await api.get('/backup/list');
  return response.data.backups;
};

export const downloadBackup = async (filename: string) => {
  try {
    console.log('📥 Starting download for:', filename);
    
    const response = await api.get(`/backup/download/${filename}`, {
      responseType: 'blob',
      headers: {
        'Accept': 'application/octet-stream'
      }
    });

    console.log('📦 Download response:', {
      status: response.status,
      type: response.headers['content-type'],
      size: response.data?.size || 'unknown'
    });

    // Validate that response.data is a Blob
    if (!(response.data instanceof Blob)) {
      console.error('❌ Response data is not a Blob:', typeof response.data);
      throw new Error('Invalid response format: expected Blob');
    }

    // Get content-type as string
    const contentType = response.headers['content-type'];
    const contentTypeString = typeof contentType === 'string' ? contentType : 'application/octet-stream';

    // Create proper Blob with correct MIME type
    const blob = new Blob([response.data], {
      type: contentTypeString
    });

    // Create download link and trigger download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);

    console.log('✅ Download triggered successfully');
    return blob;
    
  } catch (error: any) {
    console.error('❌ Download failed:', error);
    
    if (error.response?.status === 404) {
      throw new Error('Backup file not found on server');
    } else if (error.response?.status === 500) {
      throw new Error('Server error during download');
    } else if (error.message?.includes('Invalid response format')) {
      throw new Error('Server returned invalid file format');
    } else {
      throw new Error(error.response?.data?.message || error.message || 'Download failed');
    }
  }
};

export const deleteBackup = async (filename: string) => {
  const response = await api.delete(`/backup/${filename}`);
  return response.data;
};

// ======================
// UPLOAD SYSTEM (Static file serving)
// ======================

export const servePatientImages = (filename: string) => 
  `/uploads/patients/${filename}`;

export const serveScanImages = (filename: string) => 
  `/uploads/scans/${filename}`;

export const serveDocuments = (filename: string) => 
  `/uploads/documents/${filename}`;

// Export all API functions
export default {
  // Auth
  login,
  register,
  verifyToken,
  logout,
  getUsers,
  getUserStats,
  getProfile,
  updateProfile,
  changePassword,
  
  // Settings
  getHospitalDetails,
  updateHospitalDetails,
  getAllUsers,
  updateUser,
  deactivateUser,
  
  // Hospital Info
  getHospitals,
  getHospital,
  createHospital,
  updateHospital,
  deleteHospital,
  getHospitalNHISSettings,
  updateHospitalNHISSettings,
  
  // GDRG Tariffs
  getGDRGTariffs,
  getGDRGByCode,
  createGDRGTariff,
  updateGDRGTariff,
  deleteGDRGTariff,
  lookupGDRGByAge,
  
  // Diagnosis GDRG Links
  getDiagnosesByGDRG,
  linkDiagnosisToGDRG,
  unlinkDiagnosisFromGDRG,
  getGDRGByDiagnosis,
  
  // Procedure GDRG Links
  linkProcedureToGDRG,
  unlinkProcedureFromGDRG,
  getProceduresByGDRG,
  getGDRGByProcedure,
  
  // Insurance
  getInsuranceProviders,
  getInsuranceProvider,
  createInsuranceProvider,
  updateInsuranceProvider,
  deleteInsuranceProvider,
  
  // Insurance Claims
  getInsuranceClaims,
  getNHISClaims,
  getPrivateInsuranceClaims,
  getInsuranceClaim,
  getClaimByAttendanceId,
  generateNHISClaim,
  generatePrivateInsuranceClaim,
  updateInsuranceClaim,
  finalizeClaim,
  updateClaimStatus,
  generateClaimXML,
  generateClaimPrint,
  getFinalizedClaimsTotal,
  
  // Batch Claims
  createClaimBatch,
  getClaimBatches,
  getClaimBatch,
  addClaimsToBatch,
  removeClaimsFromBatch,
  generateBatchXML,
  updateBatchStatus,
  deleteClaimBatch,
  
  // Patients
  getPatients,
  getPatient,
  createPatient,
  updatePatient,
  uploadPatientImage,
  uploadPatientImageBase64,
  deletePatient,
  
  // Attendances
  getAttendances,
  getAttendance,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  updateAttendanceStatus,
  
  // Attendance clinical operations
  addDiagnosisToAttendance,
  removeDiagnosisFromAttendance,
  addLabTestToAttendance,
  updateLabTestStatus,
  removeLabTestFromAttendance,
  addProcedureToAttendance,
  updateProcedureStatus,
  removeProcedureFromAttendance,
  addMedicationToAttendance,
  updateMedicationStatus,
  removeMedicationFromAttendance,
  addScanToAttendance,
  updateScanStatus,
  removeScanFromAttendance,
  addServiceToAttendance,
  removeServiceFromAttendance,
  assignBedToAttendance,
  
  // Vitals
  addVitalsToAttendance,
  getVitalsByAttendance,
  updateVitals,
  deleteVitals,
  
  // Progress Notes
  addProgressNoteToAttendance,
  removeProgressNoteFromAttendance,
  
  // Billing
  getBillingBreakdown,
  calculateAttendanceBill,
  getAttendanceStats,
  validateNHISClaim,
  generateNHISClaimFromAttendance,
  
  // Bills & Payments
  getBills,
  getBill,
  createBill,
  updateBill,
  deleteBill,
  addPaymentToBill,
  generateBillFromAttendance,
  generateBillReport,
  getBillingBreakdownForBill,
  updateBillStatus,
  getBillStatistics,
  
  // Waivers
  createWaiverRequest,
  getWaivers,
  getWaiverById,
  updateWaiverStatus,
  approveWaiver,
  rejectWaiver,
  getWaiversByBill,
  getWaiversByPatient,
  getWaiverStatistics,
  deleteWaiver,
  applyWaiverToBill,
  
  // Ward Charges
  getWardCharges,
  generateDailyWardCharges,
  
  // Receipt
  generateReceipt,
  
  // Admissions
  getAdmissions,
  getAdmission,
  createAdmission,
  updateAdmission,
  deleteAdmission,
  dischargePatient,
  updateAdmissionWithNHISData,
  addDailyNotesToAdmission,
  getAdmissionStats,
  getAdmissionsByPatientId,
  addSecondaryDiagnosisToAdmission,
  removeSecondaryDiagnosisFromAdmission,
  addDailyNoteToAdmission,
  updateDailyNote,
  deleteDailyNote,
  
  // Wards & Beds
  getWards,
  getWard,
  createWard,
  updateWard,
  deleteWard,
  getAvailableBeds,
  getBeds,
  getBed,
  createBed,
  updateBed,
  deleteBed,
  
  // Stock Management
  getStockItems,
  getStockItem,
  createStockItem,
  updateStockItem,
  deleteStockItem,
  getLowStockItems,
  getStockCategories,
  updateStockLevel,
  getStockItemTransactionHistory,
  getStockValueSummary,
  getExpiryReport,
  getMovementSummary,
  getUsageReport,
  getSupplierReport,
  getRequisitionSummary,
  
  // Stock Transactions
  getStockTransactions,
  getStockTransaction,
  createStockTransaction,
  updateStockTransaction,
  getStockMovementReport,
  getLowStockAlerts,
  
  // Invoices
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  
  // Requisitions
  getRequisitions,
  getRequisition,
  createRequisition,
  updateRequisition,
  deleteRequisition,
  updateRequisitionStatus,
  submitRequisition,
  approveRequisition,
  fulfillRequisition,
  cancelRequisition,
  approveRequisitionItems,
  
  // Referrals
  getReferrals,
  getReferralById,
  createOutgoingReferral,
  createIncomingReferral,
  updateReferralStatus,
  updateReferral,
  deleteReferral,
  getReferralsByPatient,
  generateReferralLetter,
  getReferralStats,
  
  // Medical Services
  getDiagnoses,
  getDiagnosis,
  createDiagnosis,
  updateDiagnosis,
  deleteDiagnosis,
  searchDiagnoses,
  getDiagnosisStats,
  bulkUpdateDiagnoses,
  getLabTestTemplates,
  getLabTestTemplate,
  createLabTestTemplate,
  updateLabTestTemplate,
  deleteLabTestTemplate,
  getLabTestCategories,
  getLabTestSubCategories,
  getSpecimenTypes,
  bulkUpdateLabTestTemplates,
  getProcedureTemplates,
  getProcedureTemplate,
  createProcedureTemplate,
  updateProcedureTemplate,
  deleteProcedureTemplate,
  getProcedureCategories,
  getProcedureDepartments,
  bulkUpdateProcedureTemplates,
  getScanTemplates,
  getScanTemplate,
  createScanTemplate,
  updateScanTemplate,
  deleteScanTemplate,
  getScanCategories,
  getScanBodyParts,
  getScanTypes,
  bulkUpdateScanTemplates,
  
  // Service Catalog
  getServiceCatalog,
  getServiceCatalogItem,
  createServiceCatalogItem,
  updateServiceCatalogItem,
  deleteServiceCatalogItem,
  getServiceMetadata,
  getNHISReadinessReport,
  getServiceByNHISCode,
  getServicesByCategory,
  checkServiceCoverage,
  calculateServiceCost,
  
  // Consultation Types
  getConsultationTypes,
  getConsultationType,
  createConsultationType,
  updateConsultationType,
  deleteConsultationType,
  
  // Departments
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentStats,
  getDepartmentUsers,
  assignUserToDepartment,
  removeUserFromDepartment,
  assignDepartmentHead,
  bulkUpdateDepartments,
  
  // Appointments
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
  
  // Notifications
  getNotifications,
  getNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationStats,
  createNotification,
  sendBulkNotification,
  sendRoleNotification,
  sendUserMessage,
  sendBulkUserMessages,
  getConversations,
  triggerLowStockCheck,
  triggerAppointmentReminders,
  cleanupOldNotifications,
  getUnreadCount,
  
  // Users
  getUsersByDepartment,
  updateUserDepartment,
  
  // Dashboard
  getDashboardStats,
  getAppointmentCalendar,
  
  // Reports
  getFinancialReport,
  getInsuranceClaimsReport,
  getClinicalReport,
  getAttendanceReport,
  getRevenueReport,
  exportReport,
  getGHSOPDReport,
  getGHSIPDReport,
  getGHSDeliveryReport,
  getGHSFormAReport,
  getGHSMalariaReport,
  getGHSIDSRReport,
  getGHSFamilyPlanningReport,
  getMorbidityMortalityReport,
  getDemographicReport,
  getTopDiagnoses,
  exportGHSReportToCSV,
  getGHSReportSubmissions,
  getGHSReportSubmissionById,
  getLabReport,
  getScanReport,
  getProcedureReport,
  getMedicationReport,
  getVitalsReport,
  
  // Backup
  createBackup,
  restoreBackup,
  getBackupList,
  downloadBackup,
  deleteBackup,
  
  // Upload
  servePatientImages,
  serveScanImages,
  serveDocuments,

  // Antenatal (imported from ./antenatal)
  getAntenatalBookings,
  getActiveBookingByPatient,
  getAntenatalBookingById,
  createAntenatalBooking,
  closeAntenatalBooking,
  getANCStatistics,
  getANCVisitsByBooking,
  getANCVisitById,
  updateANCVisit,
  deleteANCVisit,
  getDeliveries,
  getDelivery,
  createDelivery,
  updateDelivery,
  deleteDelivery,
  getDeliveryStats,
  getPostnatals,
  getPostnatal,
  createPostnatal,
  updatePostnatal,
  deletePostnatal,
  getPostnatalStats,

  // Documents (imported from ./documentApi)
  generateReceipt: documentApi.generateReceipt,
  generateBillStatement: documentApi.generateBillStatement,
  generateReferralLetter: documentApi.generateReferralLetter,
  generateDischargeSummary: documentApi.generateDischargeSummary,
  generateLabResult: documentApi.generateLabResult,
  generatePrescription: documentApi.generatePrescription,
  getDocumentsByEntity: documentApi.getDocumentsByEntity,
  downloadDocument: documentApi.downloadDocument,
  reprintDocument: documentApi.reprintDocument,
  getTemplates: documentApi.getTemplates,
  createTemplate: documentApi.createTemplate,
  updateTemplate: documentApi.updateTemplate,
  deleteTemplate: documentApi.deleteTemplate,

  // Settings
  getSystemSettings,
  updateSystemSettings,
  getNHISRates,
  updateNHISRates,

  // Worklist
  getWorklists,
  getWorklist,
  updateWorklist,
  completeWorklist,

  // Clinical Reports
  getClinicalReports,
  getLabReportData,
  getScanReportData,
  getProcedureReportData,
  getMedicationReportData,
  getVitalsReportData
};