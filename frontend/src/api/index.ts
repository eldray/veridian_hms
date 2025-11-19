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

// Profile management
export const getProfile = () => 
  api.get('/profile/profile').then(r => r.data);

export const updateProfile = (data: any) => 
  api.put('/profile/profile', data).then(r => r.data);

export const changePassword = (currentPassword: string, newPassword: string) => 
  api.put('/profile/password', { currentPassword, newPassword }).then(r => r.data);

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
export const getGDRGTariffs = async (): Promise<GDRGTariff[]> => {
  const response = await api.get('/gdrg-tariffs');
  return handleResponse<GDRGTariff>(response.data);
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

// ───── INSURANCE CLAIMS ─────
export const getInsuranceClaims = (filters?: any) => 
  api.get('/insurance-claims', { params: filters }).then(r => {
    return handleResponse<InsuranceClaim>(r.data);
  });

export const getInsuranceClaim = (id: string) => 
  api.get(`/insurance-claims/${id}`).then(r => r.data);

export const submitInsuranceClaim = (data: any) => 
  api.post('/insurance-claims', data).then(r => r.data);

export const updateClaimStatus = (id: string, data: any) => 
  api.patch(`/insurance-claims/${id}/status`, data).then(r => r.data);

export const generateNHISClaimForm = (attendanceId: string) => 
  api.get(`/insurance-claims/nhis-claim/${attendanceId}`).then(r => r.data);

export const generateNHISClaim = (attendanceId: string) => 
  api.get(`/insurance-claims/nhis/${attendanceId}/generate`).then(r => r.data);

export const submitNHISClaim = (attendanceId: string, data: any) => 
  api.post(`/insurance-claims/nhis/${attendanceId}/submit`, data).then(r => r.data);

export const downloadNHISClaimXML = (attendanceId: string) => 
  api.get(`/insurance-claims/nhis/${attendanceId}/download-xml`, { 
    responseType: 'blob' 
  }).then(r => r.data);

export const getNHISClaimSummary = (filters?: any) => 
  api.get('/insurance-claims/nhis-summary', { params: filters }).then(r => r.data);

export const getClaimByAttendanceId = (attendanceId: string) => 
  api.get(`/insurance-claims/attendance/${attendanceId}`).then(r => r.data);

export const createInsuranceClaimForAttendance = (attendanceId: string, data: any) => 
  api.post(`/insurance-claims/attendance/${attendanceId}`, data).then(r => r.data);

export const generatePrivateInsuranceClaim = (attendanceId: string, insuranceProviderId: string) => 
  api.get(`/insurance-claims/private/${attendanceId}/${insuranceProviderId}/generate`).then(r => r.data);

export const generateInsuranceClaimData = (attendanceId: string) => 
  api.get(`/insurance-claims/attendance/${attendanceId}/generate`).then(r => r.data);

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

export const getPatientStats = () => 
  api.get('/patients/stats').then(r => r.data);

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
  api.put(`/attendances/${attendanceId}/lab-tests/${labTestId}`, data).then(r => r.data);

export const removeLabTestFromAttendance = (attendanceId: string, labTestId: string) => 
  api.delete(`/attendances/${attendanceId}/lab-tests/${labTestId}`).then(r => r.data);

// Procedure Operations
export const addProcedureToAttendance = (attendanceId: string, data: any) => 
  api.post(`/attendances/${attendanceId}/procedures`, data).then(r => r.data);

export const updateProcedureStatus = (attendanceId: string, procedureId: string, data: any) => 
  api.put(`/attendances/${attendanceId}/procedures/${procedureId}`, data).then(r => r.data);

export const removeProcedureFromAttendance = (attendanceId: string, procedureId: string) => 
  api.delete(`/attendances/${attendanceId}/procedures/${procedureId}`).then(r => r.data);

// Medication Operations
export const addMedicationToAttendance = (attendanceId: string, data: any) => 
  api.post(`/attendances/${attendanceId}/medications`, data).then(r => r.data);

export const updateMedicationStatus = (attendanceId: string, medicationId: string, data: any) => 
  api.put(`/attendances/${attendanceId}/medications/${medicationId}`, data).then(r => r.data);

export const removeMedicationFromAttendance = (attendanceId: string, medicationId: string) => 
  api.delete(`/attendances/${attendanceId}/medications/${medicationId}`).then(r => r.data);

// Scan Operations
export const addScanToAttendance = (attendanceId: string, data: any) => 
  api.post(`/attendances/${attendanceId}/scans`, data).then(r => r.data);

export const updateScanStatus = (attendanceId: string, scanId: string, data: any) => 
  api.put(`/attendances/${attendanceId}/scans/${scanId}`, data).then(r => r.data);

export const removeScanFromAttendance = (attendanceId: string, scanId: string) => 
  api.delete(`/attendances/${attendanceId}/scans/${scanId}`).then(r => r.data);

// Service Operations
export const addServiceToAttendance = (attendanceId: string, data: any) => 
  api.post(`/attendances/${attendanceId}/services`, data).then(r => r.data);

export const removeServiceFromAttendance = (attendanceId: string, serviceId: string) => 
  api.delete(`/attendances/${attendanceId}/services/${serviceId}`).then(r => r.data);

// Bed Assignment
export const assignBedToAttendance = (attendanceId: string, data: any) => 
  api.post(`/attendances/${attendanceId}/assign-bed`, data).then(r => r.data);

// Vitals Operations
export const addVitalsToAttendance = (attendanceId: string, data: any) => 
  api.post(`/attendances/${attendanceId}/vitals`, data).then(r => {
    console.log('✅ Vitals API Response:', r.data);
    return r.data;
  });

export const getVitalsByAttendance = (attendanceId: string) => 
  api.get(`/attendances/${attendanceId}/vitals`).then(r => {
    console.log('✅ Get Vitals API Response:', r.data);
    return Array.isArray(r.data) ? r.data : (r.data.vitals || []);
  });

export const updateVitals = (attendanceId: string, vitalsId: string, data: any) => 
  api.put(`/attendances/${attendanceId}/vitals/${vitalsId}`, data).then(r => {
    console.log('✅ Update Vitals API Response:', r.data);
    return r.data;
  });

export const deleteVitals = (attendanceId: string, vitalsId: string) => 
  api.delete(`/attendances/${attendanceId}/vitals/${vitalsId}`)
    .then(r => {
      console.log('✅ Delete Vitals Success:', {
        attendanceId,
        vitalsId,
        response: r.data
      });
      return r.data;
    })
    .catch(error => {
      console.error('❌ Delete Vitals Failed:', {
        attendanceId,
        vitalsId,
        error: error.response?.data,
        status: error.response?.status
      });
      throw error;
    });

// Progress Notes Operations
export const addProgressNoteToAttendance = (attendanceId: string, data: any) => 
  api.post(`/attendances/${attendanceId}/progress-notes`, data).then(r => r.data);

export const removeProgressNoteFromAttendance = (attendanceId: string, noteId: string) => 
  api.delete(`/attendances/${attendanceId}/progress-notes/${noteId}`).then(r => r.data);

// Billing Operations
export const calculateAttendanceBill = (attendanceId: string) => 
  api.post(`/attendances/${attendanceId}/calculate-bill`).then(r => r.data);

export const getBillingBreakdown = (attendanceId: string) => 
  api.get(`/attendances/${attendanceId}/billing-breakdown`).then(r => r.data);

export const getAttendanceStats = (filters?: any) => 
  api.get('/attendances/stats', { params: filters }).then(r => r.data);

// NHIS Claim Validation
export const validateNHISClaim = (attendanceId: string) => 
  api.get(`/attendances/${attendanceId}/nhis/validate`).then(r => r.data);

export const generateNHISClaimFromAttendance = (attendanceId: string) => 
  api.get(`/attendances/${attendanceId}/nhis/generate-claim-data`).then(r => r.data);

// ───── BILLS & PAYMENTS ─────
export const getBills = (filters?: any) => 
  api.get('/bills', { params: filters }).then(r => handleResponse<Bill>(r.data));

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

// ───── MEDICAL SERVICES ─────
export const getDiagnoses = (filters?: any) => 
  api.get('/diagnoses', { params: filters }).then(r => handleResponse<Diagnosis>(r.data));

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

export const getDiagnosisCategories = () => 
  api.get('/diagnoses/categories').then(r => r.data);

export const getDiagnosisVariants = () => 
  api.get('/diagnoses/variants').then(r => r.data);

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
export const getFinancialReport = (filters: any) => 
  api.get('/reports/financial', { params: filters }).then(r => r.data);

export const getInsuranceClaimsReport = (filters: any) => 
  api.get('/reports/insurance-claims', { params: filters }).then(r => r.data);

export const getClinicalReport = (filters: any) => 
  api.get('/reports/clinical', { params: filters }).then(r => r.data);

export const getAttendanceReport = (filters: any) => 
  api.get('/reports/attendance', { params: filters }).then(r => r.data);

export const getRevenueReport = (filters: any) => 
  api.get('/reports/revenue', { params: filters }).then(r => r.data);

export const exportReport = (data: any) => 
  api.post('/reports/export', data).then(r => r.data);

// GHS Standard Reports
export const getGHSOPDReport = (filters: any) => 
  api.get('/reports/ghs/opd', { params: filters }).then(r => r.data);

export const getGHSIPDReport = (filters: any) => 
  api.get('/reports/ghs/ipd', { params: filters }).then(r => r.data);

export const getGHSANCReport = (filters: any) => 
  api.get('/reports/ghs/anc', { params: filters }).then(r => r.data);

export const getGHSCWCReport = (filters: any) => 
  api.get('/reports/ghs/cwc', { params: filters }).then(r => r.data);

export const getGHSFamilyPlanningReport = (filters: any) => 
  api.get('/reports/ghs/family-planning', { params: filters }).then(r => r.data);

export const getMorbidityMortalityReport = (filters: any) => 
  api.get('/reports/morbidity-mortality', { params: filters }).then(r => r.data);

export const getDemographicReport = (filters: any) => 
  api.get('/reports/demographic', { params: filters }).then(r => r.data);

// ======================
// DEPARTMENT API FUNCTIONS
// ======================

export const getDepartments = (filters?: any) => 
  api.get('/departments', { params: filters }).then(r => handleResponse<Department>(r.data));

export const getDepartment = (id: string) => 
  api.get(`/departments/${id}`).then(r => r.data);

export const createDepartment = (data: any) => 
  api.post('/departments', data).then(r => r.data);

export const updateDepartment = (id: string, data: any) => 
  api.put(`/departments/${id}`, data).then(r => r.data);

export const deleteDepartment = (id: string) => 
  api.delete(`/departments/${id}`).then(r => r.data);

export const getDepartmentStats = (id: string) => 
  api.get(`/departments/${id}/stats`).then(r => r.data);

export const getDepartmentUsers = (departmentId: string) => 
  api.get(`/departments/${departmentId}/users`).then(r => r.data);

export const assignUserToDepartment = (departmentId: string, data: any) => 
  api.post(`/departments/${departmentId}/assign-user`, data).then(r => r.data);

export const removeUserFromDepartment = (departmentId: string, data: any) => 
  api.post(`/departments/${departmentId}/remove-user`, data).then(r => r.data);

export const assignDepartmentHead = (departmentId: string, userId: string) => 
  api.patch(`/departments/${departmentId}/head`, { headId: userId }).then(r => r.data);

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
  api.post('/appointments', data).then(r => r.data);

export const updateAppointment = (id: string, data: any) => 
  api.put(`/appointments/${id}`, data).then(r => r.data);

export const deleteAppointment = (id: string) => 
  api.delete(`/appointments/${id}`).then(r => r.data);

export const updateAppointmentStatus = (id: string, status: string) => 
  api.patch(`/appointments/${id}/status`, { status }).then(r => r.data);

export const checkInAppointment = (id: string) => 
  api.patch(`/appointments/${id}/check-in`).then(r => r.data);

export const getAppointmentStatistics = (filters?: any) => 
  api.get('/appointments/stats', { params: filters }).then(r => r.data);

export const getDoctorSchedule = (doctorId: string, date?: string) => 
  api.get(`/appointments/doctor/${doctorId}/schedule`, { 
    params: { date } 
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

export const createBackup = () => 
  api.post('/backup/create').then(r => r.data);

export const restoreBackup = (formData: FormData) => 
  api.post('/backup/restore', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data);

export const getBackupList = () => 
  api.get('/backup/list').then(r => r.data);

export const downloadBackup = (filename: string) => 
  api.get(`/backup/download/${filename}`, { responseType: 'blob' }).then(r => r.data);

export const deleteBackup = (filename: string) => 
  api.delete(`/backup/${filename}`).then(r => r.data);

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
  getPatientStats,
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
  getInsuranceProviders,
  getInsuranceProvider,
  createInsuranceProvider,
  updateInsuranceProvider,
  deleteInsuranceProvider,
  getInsuranceClaims,
  getInsuranceClaim,
  submitInsuranceClaim,
  updateClaimStatus,
  generateNHISClaimForm,
  generateNHISClaim,
  submitNHISClaim,
  downloadNHISClaimXML,
  getNHISClaimSummary,
  getClaimByAttendanceId,
  createInsuranceClaimForAttendance,
  generatePrivateInsuranceClaim,
  generateInsuranceClaimData,
  
  // Medical Services
  getDiagnoses,
  getDiagnosis,
  createDiagnosis,
  updateDiagnosis,
  deleteDiagnosis,
  searchDiagnoses,
  getDiagnosisStats,
  getDiagnosisCategories,
  getDiagnosisVariants,
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
  getGHSCWCReport,
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