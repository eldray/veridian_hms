// src/api/index.ts - COMPLETE UPDATED VERSION (ALL BACKEND ROUTES COVERED)
import api from './api';
import type { 
  GDRGTariff, Patient, Attendance, Bill, InsuranceProvider, InsuranceClaim,
  Diagnosis, LabTestTemplate, ProcedureTemplate, ScanTemplate, ServiceCatalog,
  StockItem, StockTransaction, Admission, Ward, Bed, User, Department,
  Appointment, Notification, ConsultationType, HospitalInfo
} from '../types';

// Generic response handler
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

// function to convert date
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
  api.get('/auth/verify').then(r => r.data);

export const logout = () => 
  api.post('/auth/logout').then(r => r.data);

export const getUsers = () => 
  api.get('/auth/users').then(r => handleResponse<User>(r.data));

export const getUserStats = () => 
  api.get('/auth/users/stats').then(r => r.data);

// Profile management - CORRECTED ENDPOINTS
export const getProfile = () => 
  api.get('/auth/profile').then(r => r.data);

export const updateProfile = (data: any) => 
  api.put('/auth/profile', data).then(r => r.data);

export const changePassword = (currentPassword: string, newPassword: string) => 
  api.put('/auth/change-password', { currentPassword, newPassword }).then(r => r.data); // Fixed endpoint

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

// ───── GDRG TARIFFS ─────
// src/api/index.ts - ADD THESE GDRG API FUNCTIONS

// ───── GDRG TARIFFS (Full CRUD) ─────
// src/api/index.ts - FIX getGDRGTariffs

export const getGDRGTariffs = async (filters?: { mdc?: string; isActive?: boolean; search?: string }) => {
  const response = await api.get('/gdrg-tariffs', { params: filters });
  // Extract the data array from the response
  const result = response.data;
  if (result?.success && Array.isArray(result.data)) {
    return result.data; // Return only the tariffs array
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
  const response = await api.get(`/gdrg-tariffs/${code}`);
  return response.data?.data || response.data;
};

export const createGDRGTariff = async (data: any) => {
  const response = await api.post('/gdrg-tariffs', data);
  return response.data?.data || response.data;
};

export const updateGDRGTariff = async (code: string, data: any) => {
  const response = await api.put(`/gdrg-tariffs/${code}`, data);
  return response.data?.data || response.data;
};

export const deleteGDRGTariff = async (code: string) => {
  const response = await api.delete(`/gdrg-tariffs/${code}`);
  return response.data;
};

export const lookupGDRGByAge = async (params: { gdrgCode: string; patientId?: string; ageInYears?: number }) => {
  const response = await api.get('/gdrg-tariffs/lookup/age', { params });
  return response.data?.data || response.data;
};

export const linkDiagnosisToGDRG = async (gdrgCode: string, diagnosisId: string, isPrimary?: boolean, mappedIcdCode?: string) => {
  const response = await api.post(`/gdrg-tariffs/${gdrgCode}/diagnosis`, { diagnosisId, isPrimary, mappedIcdCode });
  return response.data?.data || response.data;
};

export const unlinkDiagnosisFromGDRG = async (gdrgCode: string, diagnosisId: string) => {
  const response = await api.delete(`/gdrg-tariffs/${gdrgCode}/diagnosis/${diagnosisId}`);
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
// ✅ NEW: SEPARATED CLAIM GENERATION
// ======================

export const generateNHISClaim = (attendanceId: string) => 
  api.post('/insurance-claims/nhis/generate', { attendanceId }).then(r => r.data);

export const generatePrivateInsuranceClaim = (attendanceId: string) => 
  api.post('/insurance-claims/private/generate', { attendanceId }).then(r => r.data);

export const updateClaimStatus = (claimId: string, data: { status: string; notes?: string }) => 
  api.patch(`/insurance-claims/${claimId}/status`, data).then(r => r.data);

// ======================
// EXISTING WORKFLOW FUNCTIONS
// ======================

export const generateClaimDraft = (attendanceId: string) => 
  api.post('/insurance-claims/drafts', { attendanceId }).then(r => r.data);

export const getClaimDraft = (claimId: string) => 
  api.get(`/insurance-claims/drafts/${claimId}`).then(r => r.data);

export const updateClaimDraft = (claimId: string, data: any) => 
  api.patch(`/insurance-claims/drafts/${claimId}`, data).then(r => r.data);

export const finalizeClaim = (claimId: string) => 
  api.post(`/insurance-claims/${claimId}/finalize`).then(r => r.data);

export const generateClaimXML = (claimId: string) => 
  api.get(`/insurance-claims/${claimId}/xml`, { responseType: 'blob' }).then(r => r.data);

export const generateClaimPrint = (claimId: string) => 
  api.get(`/insurance-claims/${claimId}/print`).then(r => r.data);

export const getFinalizedClaimsTotal = (filters?: any) => 
  api.get('/insurance-claims/financials/finalized-total', { params: filters }).then(r => r.data);

// ======================
// VIEWING FUNCTIONS
// ======================

export const getInsuranceClaims = (filters?: any) => 
  api.get('/insurance-claims', { params: filters }).then(r => r.data);

export const getInsuranceClaim = (id: string) => 
  api.get(`/insurance-claims/${id}`).then(r => r.data);

export const getClaimByAttendanceId = (attendanceId: string) => 
  api.get(`/insurance-claims/attendance/${attendanceId}`).then(r => r.data);

// ───── PATIENTS ─────
export const getPatient = (id: string) => 
  api.get(`/patients/${id}`).then(r => {
    const patient = r.data;
    // Convert dateOfBirth to input format if it's in ISO format
    if (patient.dateOfBirth && patient.dateOfBirth.includes('T')) {
      patient.dateOfBirth = convertISODateToInputFormat(patient.dateOfBirth);
    }
    return patient;
  });

export const getPatients = (filters?: any) => 
  api.get('/patients', { params: filters }).then(r => {
    const patients = handleResponse<Patient>(r.data);
    
    // Convert dates for all patients
    return patients.map((patient: any) => ({
      ...patient,
      dateOfBirth: patient.dateOfBirth && patient.dateOfBirth.includes('T') 
        ? convertISODateToInputFormat(patient.dateOfBirth)
        : patient.dateOfBirth
    }));
  });

export const createPatient = (data: any) => {
  // Ensure date is in correct format before sending
  const processedData = { ...data };
  
  if (processedData.dateOfBirth && processedData.dateOfBirth.includes('T')) {
    // Convert ISO to simple date format
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
  // Ensure date is in correct format before sending
  const processedData = { ...data };
  
  if (processedData.dateOfBirth && processedData.dateOfBirth.includes('T')) {
    // Convert ISO to simple date format
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

// Patient image upload using consistent API client
export const uploadPatientImage = (patientId: string, formData: FormData) =>
  api.post(`/patients/${patientId}/upload-image`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }).then(r => r.data);

export const uploadPatientImageBase64 = (patientId: string, base64Image: string) =>
  api.post(`/patients/${patientId}/upload-image-base64`, { image: base64Image })
    .then(r => r.data);

export const deletePatient = (id: string) => 
  api.delete(`/patients/${id}`).then(r => r.data);

// ───── ATTENDANCES ─────
export const getAttendances = (filters?: any) => 
  api.get('/attendances', { params: filters })
    .then(r => {
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
  return api.get(`/attendances/${id}`)
    .then(r => {
      const attendance = r.data;
      return { ...attendance, _id: attendance.id || attendance._id };
    });
};

export const createAttendance = (data: any) => 
  api.post('/attendances', data)
    .then(r => {
      const attendance = r.data;
      return { ...attendance, _id: attendance.id || attendance._id };
    });

export const updateAttendance = (id: string, data: any) => {
  if (!id || id === 'undefined' || id === 'null') {
    return Promise.reject(new Error('Valid Attendance ID is required'));
  }
  return api.put(`/attendances/${id}`, data)
    .then(r => {
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
  return api.patch(`/attendances/${id}/status`, data)
    .then(r => {
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

export const updateMedicationStatus = async (attendanceId: string, medicationId: string, data: any) => {
  const response = await api.patch(`/attendances/${attendanceId}/medications/${medicationId}`, data);
  return response.data;
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
    
    // Handle different response structures
    if (Array.isArray(r.data)) {
      return r.data; // Direct array
    } else if (r.data && Array.isArray(r.data.data)) {
      return r.data.data; // { data: [] } format
    } else if (r.data && Array.isArray(r.data.bills)) {
      return r.data.bills; // { bills: [] } format
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

// ───── ADMISSIONS ─────
export const getAdmissions = (filters?: any) => 
  api.get('/admissions', { params: filters }).then(r => {
    return handleResponse<Admission>(r.data);
  });

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
  api.get('/wards', { params: filters }).then(r => {
    return handleResponse<Ward>(r.data);
  });

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

export const bulkUpdateStock = (data: any) => 
  api.patch('/stock-items/bulk-update', data).then(r => r.data);

// ───── STOCK TRANSACTIONS ─────
export const getStockTransactions = (filters?: any) => 
  api.get('/stock-transactions', { params: filters }).then(r => handleResponse<StockTransaction>(r.data));

export const getStockTransaction = (id: string) => 
  api.get(`/stock-transactions/${id}`).then(r => r.data);

export const createStockTransaction = (data: any) => 
  api.post('/stock-transactions', data).then(r => r.data);

export const updateStockTransaction = (id: string, data: any) => 
  api.put(`/stock-transactions/${id}`, data).then(r => r.data);

export const getStockMovementReport = (filters?: any) => 
  api.get('/stock-transactions/reports/movement', { params: filters }).then(r => r.data);

export const getLowStockAlerts = () => 
  api.get('/stock-transactions/alerts/low-stock').then(r => r.data);

export const getStockItemTransactionHistory = (stockItemId: string) => 
  api.get(`/stock-transactions/stock-item/${stockItemId}`).then(r => r.data);

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

export const submitRequisition = (id: string) => 
  api.patch(`/requisitions/${id}/status`, { status: 'submitted' }).then(r => r.data);

export const approveRequisition = (id: string) => 
  api.patch(`/requisitions/${id}/status`, { status: 'approved' }).then(r => r.data);

export const fulfillRequisition = (id: string, data: any) => 
  api.patch(`/requisitions/${id}/status`, { status: 'fulfilled', ...(data || {}) }).then(r => r.data);

export const cancelRequisition = (id: string) => 
  api.patch(`/requisitions/${id}/status`, { status: 'cancelled' }).then(r => r.data);

// ───── MEDICAL SERVICES ─────
// src/api/index.ts - Verify this returns the correct data

export const getDiagnoses = (filters?: any) => 
  api.get('/diagnoses', { params: filters }).then(r => {
    console.log('Diagnoses API response:', r.data);
    // The response might be { data: [...], pagination: {...} }
    if (r.data?.success && Array.isArray(r.data.data)) {
      return r.data.data;
    }
    if (Array.isArray(r.data)) {
      return r.data;
    }
    if (r.data?.data && Array.isArray(r.data.data)) {
      return r.data.data;
    }
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
  api.get('/service-catalog', { params: filters })
    .then(r => {
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
  return api.get(`/service-catalog/${id}`)
    .then(r => {
      const service = r.data;
      return { ...service, _id: service.id || service._id };
    });
};

export const createServiceCatalogItem = (data: any) => {
  if (!data.name || !data.code) {
    return Promise.reject(new Error('Service name and code are required'));
  }
  return api.post('/service-catalog', data)
    .then(r => {
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
  
  return api.put(`/service-catalog/${id}`, data)
    .then(r => {
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
  return api.delete(`/service-catalog/${id}`)
    .then(r => {
      console.log('Delete response:', r.data);
      return r.data;
    });
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

// ───── REPORTS ─────

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

export const getGHSANCReport = async (filters: ReportFilter) => {
  const response = await api.get('/reports/ghs/anc', { params: filters });
  return response.data.data;
};

export const getGHSDeliveryReport = async (filters: ReportFilter) => {
  const response = await api.get('/reports/ghs/delivery', { params: filters });
  return response.data.data;
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
  const response = await api.get('/reports/morbidity-mortality', { params: filters });
  return response.data.data;
};

export const getDemographicReport = async (filters: ReportFilter) => {
  const response = await api.get('/reports/demographic', { params: filters });
  return response.data.data;
};

// ============================================
// REGULAR REPORT API CALLS
// ============================================

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

// ======================
// DEPARTMENT API FUNCTIONS
// ======================

export const getDepartments = (filters?: any) => 
  api.get('/departments', { params: filters }).then(r => handleResponse<Department>(r.data));

export const getDepartment = (id: string) => 
  api.get(`/departments/${id}`).then(r => r.data?.data ?? r.data);

export const createDepartment = (data: any) => 
  api.post('/departments', data).then(r => r.data?.data ?? r.data);

export const updateDepartment = (id: string, data: any) => 
  api.put(`/departments/${id}`, data).then(r => r.data?.data ?? r.data);

export const deleteDepartment = (id: string) => 
  api.delete(`/departments/${id}`).then(r => r.data);

export const getDepartmentStats = (id: string) => 
  api.get(`/departments/${id}/stats`).then(r => r.data?.data ?? r.data);

export const getDepartmentUsers = (departmentId: string) => 
  api.get(`/departments/${departmentId}/users`).then(r => r.data?.data?.users ?? []);

export const assignUserToDepartment = (departmentId: string, data: any) => 
  api.post(`/departments/${departmentId}/assign-user`, data).then(r => r.data);

export const removeUserFromDepartment = (departmentId: string, data: any) => 
  api.post(`/departments/${departmentId}/remove-user`, data).then(r => r.data);

export const assignDepartmentHead = (departmentId: string, userId: string) => 
  api.put(`/departments/${departmentId}`, { headId: userId }).then(r => r.data?.data ?? r.data);

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

export const sendBulkNotification = (data: any) => 
  api.post('/notifications/bulk', data).then(r => r.data);

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

export const restoreBackup = async (backupFile) => {
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

// src/api/index.ts - FIXED DOWNLOAD FUNCTION
export const downloadBackup = async (filename: string) => {
  try {
    console.log('📥 Starting download for:', filename);
    
    const response = await api.get(`/backup/download/${filename}`, {
      responseType: 'blob', // Ensure response is treated as blob
      headers: {
        'Accept': 'application/octet-stream'
      }
    });

    console.log('📦 Download response:', {
      status: response.status,
      type: response.headers['content-type'],
      size: response.data?.size || 'unknown'
    });

    // ✅ FIXED: Validate that response.data is a Blob
    if (!(response.data instanceof Blob)) {
      console.error('❌ Response data is not a Blob:', typeof response.data);
      throw new Error('Invalid response format: expected Blob');
    }

    // ✅ FIXED: Create proper Blob with correct MIME type
    const blob = new Blob([response.data], {
      type: response.headers['content-type'] || 'application/octet-stream'
    });

    // ✅ FIXED: Create download link and trigger download
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
    
    // Enhanced error handling
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
export const deleteBackup = async (filename) => {
  const response = await api.delete(`/backup/${filename}`);
  return response.data;
};

// ============================================
// ANTENATAL API FUNCTIONS
// ============================================

// Get all antenatal bookings
export const getAntenatalBookings = (filters?: any) => 
  api.get('/antenatal/bookings', { params: filters }).then(r => r.data);

// Get antenatal booking by patient ID
export const getAntenatalBooking = (patientId: string) => 
  api.get(`/antenatal/bookings/${patientId}`).then(r => r.data);

// Create or update antenatal booking
export const createAntenatalBooking = (data: any) => 
  api.post('/antenatal/bookings', data).then(r => r.data);

// Close antenatal booking (post-delivery)
export const closeAntenatalBooking = (patientId: string, data: any) => 
  api.put(`/antenatal/bookings/${patientId}/close`, data).then(r => r.data);

// Get ANC visits by booking ID
export const getANCVisits = (bookingId: string) => 
  api.get(`/antenatal/visits/${bookingId}`).then(r => r.data);

// Get single ANC visit by ID
export const getANCVisitById = (id: string) => 
  api.get(`/antenatal/visit/${id}`).then(r => r.data);

// Record new ANC visit
export const recordANCVisit = (data: any) => 
  api.post('/antenatal/visits', data).then(r => r.data);

// Update ANC visit
export const updateANCVisit = (id: string, data: any) => 
  api.put(`/antenatal/visits/${id}`, data).then(r => r.data);

// Delete ANC visit
export const deleteANCVisit = (id: string) => 
  api.delete(`/antenatal/visits/${id}`).then(r => r.data);

// Get ANC statistics
export const getANCStatistics = (filters?: any) => 
  api.get('/antenatal/stats', { params: filters }).then(r => r.data);

// ======================
// UPLOAD SYSTEM (Static file serving)
// ======================

// Note: These are for static file serving, actual uploads are handled in specific endpoints
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
  
  // Profile
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
  calculateAttendanceBill,
  getBillingBreakdown,
  getAttendanceStats,
  
  // NHIS Claim Validation
  validateNHISClaim,
  generateNHISClaimFromAttendance,
  
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
  
  // Insurance
// Insurance - SIMPLIFIED WORKFLOW
getInsuranceProviders,
getInsuranceProvider,
createInsuranceProvider,
updateInsuranceProvider,
deleteInsuranceProvider,

// Claims Management (Viewing Only)
getInsuranceClaims,
getInsuranceClaim,
getClaimByAttendanceId,

// NEW SIMPLIFIED WORKFLOW (7 functions)
generateClaimDraft,
getClaimDraft,
updateClaimDraft,
finalizeClaim,
generateClaimXML,
generateClaimPrint,
getFinalizedClaimsTotal,

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
  
  // Stock Management
  getStockItems,
  getStockItem,
  createStockItem,
  updateStockItem,
  deleteStockItem,
  getLowStockItems,
  getStockCategories,
  bulkUpdateStock,
  getStockTransactions,
  getStockTransaction,
  createStockTransaction,
  updateStockTransaction,
  getStockMovementReport,
  getLowStockAlerts,
  getStockItemTransactionHistory,
  
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
  getGHSANCReport,
  getGHSFamilyPlanningReport,
  getMorbidityMortalityReport,
  getDemographicReport,
  
  // Backup System
  createBackup,
  restoreBackup,
  getBackupList,
  downloadBackup,
  deleteBackup,
  
  // Upload System
  servePatientImages,
  serveScanImages,
  serveDocuments
};