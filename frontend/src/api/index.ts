import api from './api';

// Generic response handler
const handleResponse = (response: any) => {
  if (Array.isArray(response)) return response;
  if (response?.data && Array.isArray(response.data)) return response.data;
  if (response?.success && Array.isArray(response.data)) return response.data;
  console.warn('Unexpected API response:', response);
  return [];
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
  api.get('/settings/users').then(r => handleResponse(r.data));

export const updateUser = (userId: string, data: any) => 
  api.put(`/settings/users/${userId}`, data).then(r => r.data);

export const deactivateUser = (userId: string) => 
  api.put(`/settings/users/${userId}/deactivate`).then(r => r.data);

// ───── HOSPITAL ─────
export const getHospital = () => api.get('/hospitals').then(r => r.data[0]);


// ───── INSURANCE PROVIDERS ─────
export const getInsuranceProviders = () => 
  api.get('/insurance-providers').then(r => {
    const response = r.data;
    console.log('🔍 Raw insurance providers response:', response);
    
    // Handle different response formats
    if (Array.isArray(response)) {
      return response;
    } else if (response?.data && Array.isArray(response.data)) {
      return response.data;
    } else if (response?.providers && Array.isArray(response.providers)) {
      return response.providers;
    } else if (response?.insuranceProviders && Array.isArray(response.insuranceProviders)) {
      return response.insuranceProviders;
    } else if (response?.success && Array.isArray(response.data)) {
      return response.data;
    } else {
      console.warn('❌ Unexpected insurance providers response format:', response);
      // Return empty array as fallback
      return [];
    }
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
  api.get('/insurance-claims', { params: filters }).then(r => r.data);

export const getInsuranceClaim = (id: string) => 
  api.get(`/insurance-claims/${id}`).then(r => r.data);

export const submitInsuranceClaim = (data: any) => 
  api.post('/insurance-claims', data).then(r => r.data);

export const updateClaimStatus = (id: string, data: any) => 
  api.patch(`/insurance-claims/${id}/status`, data).then(r => r.data);

export const generateNHISClaimForm = (attendanceId: string) => 
  api.get(`/insurance-claims/nhis-claim/${attendanceId}`).then(r => r.data);

export const generatePrivateInsuranceClaim = (attendanceId: string, insuranceProviderId: string) => 
  api.get(`/insurance-claims/private-claim/${attendanceId}/${insuranceProviderId}`).then(r => r.data);

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
    const patients = r.data;
    // Convert dates for all patients
    return patients.map((patient: any) => ({
      ...patient,
      dateOfBirth: patient.dateOfBirth && patient.dateOfBirth.includes('T') 
        ? convertISODateToInputFormat(patient.dateOfBirth)
        : patient.dateOfBirth
    }));
  });

export const createPatient = (data: any) => {
  if (data instanceof FormData) {
    return api.post('/patients', data, { 
      headers: { 'Content-Type': 'multipart/form-data' } 
    }).then(r => r.data);
  } else {
    return api.post('/patients', data).then(r => r.data);
  }
};

export const updatePatient = (id: string, data: any) => {
  if (data instanceof FormData) {
    return api.put(`/patients/${id}`, data, { 
      headers: { 'Content-Type': 'multipart/form-data' } 
    }).then(r => r.data);
  } else {
    return api.put(`/patients/${id}`, data).then(r => r.data);
  }
};

// ───── ATTENDANCES ─────
export const getAttendances = (filters?: any) => 
  api.get('/attendances', { params: filters }).then(r => r.data);

export const getAttendance = (id: string) => 
  api.get(`/attendances/${id}`).then(r => r.data);

export const createAttendance = (data: any) => 
  api.post('/attendances', data).then(r => r.data);

export const updateAttendance = (id: string, data: any) => 
  api.put(`/attendances/${id}`, data).then(r => r.data);

export const deleteAttendance = (id: string) => 
  api.delete(`/attendances/${id}`).then(r => r.data);

export const updateAttendanceStatus = (id: string, data: any) => 
  api.patch(`/attendances/${id}/status`, data).then(r => r.data);

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

// Vitals Operations
export const addVitalsToAttendance = (attendanceId: string, data: any) => 
  api.post(`/attendances/${attendanceId}/vitals`, data).then(r => r.data);

export const getVitalsByAttendance = (attendanceId: string) => 
  api.get(`/attendances/${attendanceId}/vitals`).then(r => r.data);

// Progress Notes Operations
export const addProgressNoteToAttendance = (attendanceId: string, data: any) => 
  api.post(`/attendances/${attendanceId}/progress-notes`, data).then(r => r.data);

export const removeProgressNoteFromAttendance = (attendanceId: string, noteId: string) => 
  api.delete(`/attendances/${attendanceId}/progress-notes/${noteId}`).then(r => r.data);

// Billing Operations
export const calculateAttendanceBill = (attendanceId: string) => 
  api.post(`/attendances/${attendanceId}/calculate-bill`).then(r => r.data);

export const getAttendanceStats = (filters?: any) => 
  api.get('/attendances/stats', { params: filters }).then(r => r.data);

// ───── BILLS & PAYMENTS ─────
export const getBills = (filters?: any) => 
  api.get('/bills', { params: filters }).then(r => r.data);

export const getBill = (id: string) => 
  api.get(`/bills/${id}`).then(r => r.data);

export const createBill = (data: any) => 
  api.post('/bills', data).then(r => r.data);

export const updateBill = (id: string, data: any) => 
  api.put(`/bills/${id}`, data).then(r => r.data);

export const deleteBill = (id: string) => 
  api.delete(`/bills/${id}`).then(r => r.data);

// ───── ADMISSIONS ─────
export const getAdmissions = (filters?: any) => 
  api.get('/admissions', { params: filters }).then(r => r.data);

export const getAdmission = (id: string) => 
  api.get(`/admissions/${id}`).then(r => r.data);

export const createAdmission = (data: any) => 
  api.post('/admissions', data).then(r => r.data);

export const updateAdmission = (id: string, data: any) => 
  api.put(`/admissions/${id}`, data).then(r => r.data);

export const dischargeAdmission = (id: string, data: any) => 
  api.put(`/admissions/${id}/discharge`, data).then(r => r.data);

// ───── STOCK MANAGEMENT ─────
export const getStockItems = (filters?: any) => 
  api.get('/stock-items', { params: filters }).then(r => r.data);

export const getStockItem = (id: string) => 
  api.get(`/stock-items/${id}`).then(r => r.data);

export const createStockItem = (data: any) => 
  api.post('/stock-items', data).then(r => r.data);

export const updateStockItem = (id: string, data: any) => 
  api.put(`/stock-items/${id}`, data).then(r => r.data);

export const deleteStockItem = (id: string) => 
  api.delete(`/stock-items/${id}`).then(r => r.data);

export const getStockTransactions = (filters?: any) => 
  api.get('/stock-transactions', { params: filters }).then(r => r.data);

export const createStockTransaction = (data: any) => 
  api.post('/stock-transactions', data).then(r => r.data);

// ───── WARDS & BEDS ─────
export const getWards = (filters?: any) => 
  api.get('/wards', { params: filters }).then(r => r.data);

export const getWard = (id: string) => 
  api.get(`/wards/${id}`).then(r => r.data);

export const createWard = (data: any) => 
  api.post('/wards', data).then(r => r.data);

export const updateWard = (id: string, data: any) => 
  api.put(`/wards/${id}`, data).then(r => r.data);

export const deleteWard = (id: string) => 
  api.delete(`/wards/${id}`).then(r => r.data);

export const getBeds = (filters?: any) => 
  api.get('/beds', { params: filters }).then(r => r.data);

export const getBed = (id: string) => 
  api.get(`/beds/${id}`).then(r => r.data);

export const createBed = (data: any) => 
  api.post('/beds', data).then(r => r.data);

export const updateBed = (id: string, data: any) => 
  api.put(`/beds/${id}`, data).then(r => r.data);

export const deleteBed = (id: string) => 
  api.delete(`/beds/${id}`).then(r => r.data);

// ───── MEDICAL SERVICES ─────
export const getDiagnoses = (filters?: any) => 
  api.get('/diagnoses', { params: filters }).then(r => r.data);

export const getDiagnosis = (id: string) => 
  api.get(`/diagnoses/${id}`).then(r => r.data);

export const createDiagnosis = (data: any) => 
  api.post('/diagnoses', data).then(r => r.data);

export const updateDiagnosis = (id: string, data: any) => 
  api.put(`/diagnoses/${id}`, data).then(r => r.data);

export const deleteDiagnosis = (id: string) => 
  api.delete(`/diagnoses/${id}`).then(r => r.data);

export const getLabTestTemplates = (filters?: any) => 
  api.get('/lab-test-templates', { params: filters }).then(r => r.data);

export const getLabTestTemplate = (id: string) => 
  api.get(`/lab-test-templates/${id}`).then(r => r.data);

export const createLabTestTemplate = (data: any) => 
  api.post('/lab-test-templates', data).then(r => r.data);

export const updateLabTestTemplate = (id: string, data: any) => 
  api.put(`/lab-test-templates/${id}`, data).then(r => r.data);

export const deleteLabTestTemplate = (id: string) => 
  api.delete(`/lab-test-templates/${id}`).then(r => r.data);

export const getProcedureTemplates = (filters?: any) => 
  api.get('/procedure-templates', { params: filters }).then(r => r.data);

export const getProcedureTemplate = (id: string) => 
  api.get(`/procedure-templates/${id}`).then(r => r.data);

export const createProcedureTemplate = (data: any) => 
  api.post('/procedure-templates', data).then(r => r.data);

export const updateProcedureTemplate = (id: string, data: any) => 
  api.put(`/procedure-templates/${id}`, data).then(r => r.data);

export const deleteProcedureTemplate = (id: string) => 
  api.delete(`/procedure-templates/${id}`).then(r => r.data);

export const getServiceCatalog = (filters?: any) => 
  api.get('/service-catalog', { params: filters }).then(r => r.data);

export const getServiceCatalogItem = (id: string) => 
  api.get(`/service-catalog/${id}`).then(r => r.data);

export const createServiceCatalogItem = (data: any) => 
  api.post('/service-catalog', data).then(r => r.data);

export const updateServiceCatalogItem = (id: string, data: any) => 
  api.put(`/service-catalog/${id}`, data).then(r => r.data);

export const deleteServiceCatalogItem = (id: string) => 
  api.delete(`/service-catalog/${id}`).then(r => r.data);

export const getServiceMetadata = () => 
  api.get('/service-catalog/metadata').then(r => r.data);

// ───── VITALS ─────
export const getVitals = (filters?: any) => 
  api.get('/vitals', { params: filters }).then(r => r.data);

export const getVital = (id: string) => 
  api.get(`/vitals/${id}`).then(r => r.data);

export const createVital = (data: any) => 
  api.post('/vitals', data).then(r => r.data);

export const updateVital = (id: string, data: any) => 
  api.put(`/vitals/${id}`, data).then(r => r.data);

export const deleteVital = (id: string) => 
  api.delete(`/vitals/${id}`).then(r => r.data);

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
