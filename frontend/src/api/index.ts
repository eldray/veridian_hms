// src/api/index.ts - COMPLETE CONSOLIDATED VERSION (FIXED)
import api from './api';
// Add Seniority to the import
import type { 
  GDRGTariff, Patient, Attendance, Bill, InsuranceProvider, InsuranceClaim,
  Diagnosis, LabTestTemplate, ProcedureTemplate, ScanTemplate, ServiceCatalog,
  StockItem, StockTransaction, Admission, Ward, Bed, User, Department,
  Appointment, Notification, ConsultationType, HospitalInfo, ServiceType, ClaimStatus,
  Seniority  // ✅ ADD THIS
} from '../types';

// ============================================
// TYPES
// ============================================

export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  facilityId?: string;
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
  year?: number;
  month?: number;
  page?: number;
  limit?: number;
  [key: string]: any;
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  invoiceDate: string;
  totalAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items?: PurchaseInvoiceItem[];
}

export interface PurchaseInvoiceItem {
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
// ANTENATAL TYPES
// ============================================

export interface AntenatalBookingData {
  patientId: string;
  encounterId: string;
  lmp?: string;
  gravida: number;
  para: number;
  bookingWeight?: number;
  bookingBP?: string;
  bloodGroup?: string;
  rhesusStatus?: string;
  hivStatus?: string;
  syphilisStatus?: string;
  hepatitisBStatus?: string;
  hbBooking?: number;
  previousCSection?: boolean;
  previousComplications?: string;
  riskNotes?: string;
}

export interface ANCVisitData {
  encounterId: string;
  gestationalAgeWeeks?: number;
  weight?: number;
  bloodPressure?: string;
  fundalHeight?: number;
  fetalHeartRate?: number;
  fetalMovements?: boolean;
  presentation?: string;
  oedema?: boolean;
  oedemaGrade?: string;
  urinalysisProtein?: boolean;
  urinalysisGlucose?: boolean;
  urinalysisBlood?: boolean;
  iptpGiven?: boolean;
  iptpDoseNumber?: number;
  iptpDrug?: string;
  ttGiven?: boolean;
  ttDoseNumber?: number;
  ironGiven?: boolean;
  folateGiven?: boolean;
  calciumGiven?: boolean;
  malariaTestDone?: boolean;
  malariaTestResult?: 'Positive' | 'Negative' | 'Inconclusive';
  malariaTreatmentGiven?: boolean;
  malariaTreatmentType?: string;
  dangerSignsPresent?: boolean;
  dangerSignsList?: any[];
  referralMade?: boolean;
  referredTo?: string;
  referralReason?: string;
  nextVisitDate?: string;
  returnInstructions?: string;
  notes?: string;
}

export interface DeliveryRecordData {
  patientId: string;
  encounterId: string;
  antenatalBookingId?: string;
  deliveryDate?: string;
  
  deliveryType?: 'spontaneous_vertex' | 'assisted_breech' | 'vacuum' | 'forceps' | 'caesarean_section' | 'multiple';
  deliveryOutcome?: 'live_birth' | 'stillbirth_fresh' | 'stillbirth_macerated' | 'neonatal_death';
  
  // ✅ UPDATED: Match new Prisma Enum (Default is private_hospital)
  placeOfDelivery?: 'private_hospital' | 'government_hospital' | 'health_centre' | 'clinic' | 'chag_facility' | 'private_midwife' | 'tba_trained' | 'tba_untrained' | 'home' | 'en_route' | 'mines_facility' | 'quasi_govt_institution';
  
  attendant?: string;
  birthWeight?: number;
  gestationWeeks?: number;
  apgarScore1min?: number;
  apgarScore5min?: number;
  resusCitationDone?: boolean;
  
  maternalOutcome?: 'alive' | 'dead_direct_cause' | 'dead_indirect_cause' | 'dead_unknown';
  maternalComplications?: string[];
  notes?: string;
  
  // ✅ NEW: Male Involvement
  malePartnerPresentANC?: boolean;
  malePartnerPresentDelivery?: boolean;
  malePartnerPresentPNC?: boolean;
  
  // ✅ NEW: Audit/Tracking
  maternalDeathsAudited?: boolean;
  auditNotes?: string;
  
  // ✅ NEW: Newborns array (for multiples)
  newborns?: Partial<NewbornRecord>[];
}

export interface PostnatalRecordData {
  patientId: string;
  encounterId: string;
  antenatalBookingId?: string;
  deliveryRecordId?: string;
  examinationDate?: string;
  dayNumber?: number;
  maternalCondition?: 'good' | 'fair' | 'poor' | 'critical';
  breastfeedingStatus?: 'exclusive' | 'mixed' | 'not_breastfeeding';
  babyCondition?: 'good' | 'fair' | 'poor' | 'critical';
  familyPlanningDiscussed?: boolean;
  familyPlanningMethodAccepted?: string;
  notes?: string;
}

// ============================================
// DOCUMENT TYPES
// ============================================

export interface GeneratedDocument {
  id: string;
  documentNumber: string;
  documentType: string;
  entityType: string;
  entityId: string;
  format: string;
  filePath: string;
  fileName: string;
  createdAt: string;
  generatedBy: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  type: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentGenerationResponse {
  success: boolean;
  data: GeneratedDocument;
  message?: string;
}

// ============================================
// GENERIC RESPONSE HANDLER
// ============================================

const handleResponse = <T>(response: any): T[] => {
  // ✅ Handle notification responses (MUST be FIRST)
  if (response?.data?.notifications && Array.isArray(response.data.notifications)) {
    return response.data.notifications as T[];
  }
  if (response?.notifications && Array.isArray(response.notifications)) {
    return response.notifications as T[];
  }
  
  // Handle other common response structures
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
  if (response?.stockItems && Array.isArray(response.stockItems)) return response.stockItems as T[];
  if (response?.stockTransactions && Array.isArray(response.stockTransactions)) return response.stockTransactions as T[];
  if (response?.requisitions && Array.isArray(response.requisitions)) return response.requisitions as T[];
  
  // Remove the warning log for notification responses
  const isNotificationResponse = response?.data?.notifications || response?.notifications;
  if (!isNotificationResponse) {
    console.warn('Unexpected API response:', response);
  }
  
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



// Add these helper functions to api/index.ts

// Check if user has required seniority
export const hasMinSeniority = (userSeniority: Seniority, requiredSeniority: Seniority): boolean => {
  const levels: Record<Seniority, number> = {
    TRAINEE: 0,
    JUNIOR: 1,
    SENIOR: 2,
    PRINCIPAL: 3
  };
  return levels[userSeniority] >= levels[requiredSeniority];
};

// Get user's seniority from stored profile
export const getUserSeniority = async (): Promise<Seniority | null> => {
  try {
    const profile = await getProfile();
    return profile?.seniority || null;
  } catch {
    return null;
  }
};

// Get readable seniority label
export const getSeniorityLabel = (seniority: Seniority): string => {
  const labels: Record<Seniority, string> = {
    TRAINEE: 'Trainee',
    JUNIOR: 'Junior Staff',
    SENIOR: 'Senior Staff',
    PRINCIPAL: 'Principal'
  };
  return labels[seniority];
};

// ──────────────────────────────────────────────
// AUTH & PROFILE
// ──────────────────────────────────────────────

export const login = (username: string, password: string) => 
  api.post('/auth/login', { username, password }).then(r => r.data);

export const register = (userData: {
  username: string;
  password: string;
  fullName: string;
  role: string;
  seniority?: string;  // ✅ ADD THIS (optional)
  email?: string;
  phone?: string;
  licenseNumber?: string;
  specialization?: string;
  departmentId?: string;
}) => api.post('/auth/register', userData).then(r => r.data);


export const verifyToken = () => 
  api.get('/auth/profile').then(r => r.data.user || r.data);

export const logout = () => 
  api.post('/auth/logout').then(r => r.data);

export const getUsers = () => 
  api.get('/auth/users').then(r => handleResponse<User>(r.data.users || r.data));

export const getUserStats = () => 
  api.get('/auth/users/stats').then(r => r.data);

export const getProfile = () => 
  api.get('/auth/profile').then(r => r.data.user || r.data);

export const updateProfile = (data: any) => 
  api.put('/auth/profile', data).then(r => r.data.user || r.data);

export const changePassword = (currentPassword: string, newPassword: string) =>
  api.post('/auth/change-password', { currentPassword, newPassword }).then(r => r.data);

// ──────────────────────────────────────────────
// SETTINGS (Admin only)
// ──────────────────────────────────────────────

export const getHospitalDetails = () => 
  api.get('/settings/hospital').then(r => r.data);

export const updateHospitalDetails = (data: any) => 
  api.put('/settings/hospital', data).then(r => r.data);

export const getSystemSettings = () => 
  api.get('/settings').then(r => r.data);

export const updateSystemSettings = (data: any) => 
  api.put('/settings', data).then(r => r.data);


// ──────────────────────────────────────────────
// HOSPITAL INFO
// ──────────────────────────────────────────────

export const getHospitals = () =>
  api.get('/hospital').then(r => handleResponse<HospitalInfo>(r.data));

export const getHospital = (id: string) =>
  api.get(`/hospital/${id}`).then(r => r.data);

export const createHospital = (data: any) =>
  api.post('/hospital', data).then(r => r.data);

export const updateHospital = (id: string, data: any) =>
  api.put(`/hospital/${id}`, data).then(r => r.data);

export const deleteHospital = (id: string) =>
  api.delete(`/hospital/${id}`).then(r => r.data);


// ──────────────────────────────────────────────
// NHIS SETTINGS (Matches Backend Routes)
// ──────────────────────────────────────────────

// Hospital NHIS Settings - GET current hospital's NHIS config
export const getHospitalNHISSettings = () => 
  api.get('/hospital/nhis/settings').then(r => r.data);

// Hospital NHIS Settings - UPDATE current hospital's NHIS config
export const updateHospitalNHISSettings = (data: any) => 
  api.put('/hospital/nhis/settings', data).then(r => r.data);

// NHIS API Status - Check if NHIS API is configured and active
export const getNHISApiStatus = () => 
  api.get('/settings/nhis/status').then(r => r.data);

// NHIS API Configuration - Update API connection settings
export const updateNHISApiConfig = (data: any) => 
  api.put('/settings/nhis/config', data).then(r => r.data);

// Test NHIS API Connection
export const testNHISConnection = () => 
  api.post('/settings/nhis/test-connection').then(r => r.data);

// Verify Single NHIS Eligibility
export const verifyNHISEligibility = (policyNumber: string) => 
  api.post('/settings/nhis/verify-eligibility', { policyNumber }).then(r => r.data);

// Bulk Verify NHIS Eligibility
export const bulkVerifyNHISEligibility = (policyNumbers: string[]) => 
  api.post('/settings/nhis/bulk-verify-eligibility', { policyNumbers }).then(r => r.data);

// Generate NHIS CCC (Claim Check Code)
export const generateCCC = (data: { policyNumber: string; encounterId: string; totalAmount: number }) => 
  api.post('/settings/nhis/generate-ccc', data).then(r => r.data);

// ──────────────────────────────────────────────
// USER MANAGEMENT (Separate module - NOT in settings)
// ──────────────────────────────────────────────
// api/index.ts - Keep register for public registration (if needed)
// But create a separate adminCreateUser for admin user creation
export const adminCreateUser = (userData: any) => 
  api.post('/users', userData).then(r => r.data);  // Admin only endpoint

export const getAllUsers = (filters?: { role?: string; departmentId?: string; isActive?: boolean; search?: string; page?: number; limit?: number }) => 
  api.get('/users', { params: filters }).then(r => {
    const response = r.data;
    if (response?.data && Array.isArray(response.data)) {
      return response.data;
    }
    if (Array.isArray(response)) {
      return response;
    }
    return [];
  });

export const getUserById = (userId: string) => 
  api.get(`/users/${userId}`).then(r => r.data?.data || r.data);

export const updateUser = (userId: string, data: any) => 
  api.put(`/users/${userId}`, data).then(r => r.data?.data || r.data);

export const deactivateUser = (userId: string) => 
  api.patch(`/users/${userId}/deactivate`).then(r => r.data?.data || r.data);

export const getUserProfile = () =>
  api.get('/auth/profile').then(r => r.data?.data || r.data);

export const updateUserProfile = (data: any) =>
  api.put('/auth/profile', data).then(r => r.data?.data || r.data);

export const changeUserPassword = (userId: string, data: { currentPassword: string; newPassword: string }) =>
  api.post(`/auth/change-password`, data).then(r => r.data);

export const getCurrentUserPermissions = () => 
  api.get('/users/permissions').then(r => r.data);

// ──────────────────────────────────────────────
// SHIFT MANAGEMENT (via User module)
// ──────────────────────────────────────────────

export const getShifts = (filters?: { userId?: string; departmentId?: string; shiftDate?: string; fromDate?: string; toDate?: string; page?: number; limit?: number }) => 
  api.get('/users/shifts', { params: filters }).then(r => r.data?.data || r.data);

export const getShiftById = (shiftId: string) => 
  api.get(`/users/shifts/${shiftId}`).then(r => r.data?.data || r.data);

export const createShift = (data: { userId: string; shiftDate: string; startTime: string; endTime: string; shiftType?: 'morning' | 'afternoon' | 'night' | 'on_call'; notes?: string }) => 
  api.post('/users/shifts', data).then(r => r.data?.data || r.data);

export const updateShift = (shiftId: string, data: any) => 
  api.put(`/users/shifts/${shiftId}`, data).then(r => r.data?.data || r.data);

export const deleteShift = (shiftId: string) => 
  api.delete(`/users/shifts/${shiftId}`).then(r => r.data);

// ──────────────────────────────────────────────
// LEAVE MANAGEMENT (via User module)
// ──────────────────────────────────────────────

export const getLeaves = (filters?: { userId?: string; departmentId?: string; status?: string; fromDate?: string; toDate?: string; page?: number; limit?: number }) => 
  api.get('/users/leaves', { params: filters }).then(r => r.data?.data || r.data);

export const getLeaveById = (leaveId: string) => 
  api.get(`/users/leaves/${leaveId}`).then(r => r.data?.data || r.data);

export const createLeave = (data: { leaveType: 'annual' | 'sick' | 'maternity' | 'paternity' | 'emergency' | 'unpaid'; startDate: string; endDate: string; reason?: string }) => 
  api.post('/users/leaves', data).then(r => r.data?.data || r.data);

export const updateLeave = (leaveId: string, data: { status?: 'pending' | 'approved' | 'rejected' | 'cancelled'; reason?: string }) => 
  api.put(`/users/leaves/${leaveId}`, data).then(r => r.data?.data || r.data);

export const deleteLeave = (leaveId: string) => 
  api.delete(`/users/leaves/${leaveId}`).then(r => r.data);

// ──────────────────────────────────────────────
// GDRG TARIFFS
// ──────────────────────────────────────────────

// api/index.ts - UPDATE getGDRGTariffs to fetch all pages

export const getGDRGTariffs = async (filters?: { mdc?: string; isActive?: boolean; search?: string }) => {
  const limit = 500; // Fetch more per request
  let allTariffs: any[] = [];
  let currentPage = 1;
  let totalPages = 1;
  
  try {
    // First request to get total count
    const firstResponse = await api.get('/gdrg', { params: { ...filters, page: 1, limit } });
    const result = firstResponse.data;
    
    console.log('🔍 Raw GDRG API response:', result);
    
    // Extract data from nested structure
    let tariffsData = [];
    if (result?.success && result?.data?.data) {
      tariffsData = result.data.data;
      totalPages = Math.ceil(result.data.pagination?.total / limit) || 1;
    } else if (result?.data && Array.isArray(result.data)) {
      tariffsData = result.data;
      totalPages = 1;
    } else if (Array.isArray(result)) {
      tariffsData = result;
      totalPages = 1;
    }
    
    allTariffs = [...tariffsData];
    
    // Fetch remaining pages
    if (totalPages > 1) {
      const remainingPromises = [];
      for (let page = 2; page <= totalPages; page++) {
        remainingPromises.push(
          api.get('/gdrg', { params: { ...filters, page, limit } }).then(r => r.data)
        );
      }
      
      const remainingResponses = await Promise.all(remainingPromises);
      
      for (const response of remainingResponses) {
        if (response?.success && response?.data?.data) {
          allTariffs = [...allTariffs, ...response.data.data];
        } else if (response?.data && Array.isArray(response.data)) {
          allTariffs = [...allTariffs, ...response.data];
        }
      }
    }
    
    console.log(`✅ Loaded ${allTariffs.length} GDRG tariffs`);
    return allTariffs;
  } catch (error) {
    console.error('Error fetching GDRG tariffs:', error);
    return [];
  }
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

// ──────────────────────────────────────────────
// DIAGNOSIS GDRG LINKING
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// PROCEDURE GDRG LINKING
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// INSURANCE PROVIDERS
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// CORPORATE ACCOUNTS (UNIFIED - NO DUPLICATES)
// ──────────────────────────────────────────────

// ✅ SINGLE DEFINITION - Remove the duplicate at line ~420
export const getCorporateAccounts = (filters?: any) => 
  api.get('/corporate', { params: filters }).then(r => handleResponse<any>(r.data));

export const getCorporateAccount = (id: string) => 
  api.get(`/corporate/${id}`).then(r => r.data);

export const createCorporateAccount = (data: any) => 
  api.post('/corporate', data).then(r => r.data);

export const updateCorporateAccount = (id: string, data: any) => 
  api.put(`/corporate/${id}`, data).then(r => r.data);

export const deactivateCorporateAccount = (id: string) => 
  api.delete(`/corporate/${id}`).then(r => r.data);

export const getCorporateEmployees = (accountId: string) => 
  api.get(`/corporate/${accountId}/employees`).then(r => r.data);

export const addCorporateEmployee = (accountId: string, data: any) => 
  api.post(`/corporate/${accountId}/employees`, data).then(r => r.data);

export const updateCorporateEmployee = (id: string, data: any) => 
  api.put(`/corporate/employees/${id}`, data).then(r => r.data);

export const removeCorporateEmployee = (id: string) => 
  api.delete(`/corporate/employees/${id}`).then(r => r.data);

export const getCorporateStatistics = () => 
  api.get('/corporate/statistics').then(r => r.data);

export const generateCorporateMonthlyBill = (accountId: string, data: any) => 
  api.post(`/corporate/${accountId}/bills`, data).then(r => r.data);

export const getCorporateMonthlyBills = (accountId: string, filters?: any) => 
  api.get(`/corporate/${accountId}/bills`, { params: filters }).then(r => r.data);

// ──────────────────────────────────────────────
// INSURANCE CLAIMS - Corporate Claims (FIXED)
// ──────────────────────────────────────────────

// ✅ FIX: This was missing - add corporate claim functions
export const generateCorporateClaim = (encounterId: string) => 
  api.post('/insurance-claims/corporate/generate', { attendanceId: encounterId }).then(r => r.data);

export const getCorporateClaims = (filters?: any) => 
  api.get('/insurance-claims/corporate', { params: filters }).then(r => r.data);

// ──────────────────────────────────────────────
// INSURANCE CLAIMS - General (FIXED order)
// ──────────────────────────────────────────────

export const getInsuranceClaims = (filters?: any) => 
  api.get('/insurance-claims', { params: filters }).then(r => r.data);

export const getInsuranceClaim = (id: string) => 
  api.get(`/insurance-claims/${id}`).then(r => r.data);

export const getClaimByEncounterId = (encounterId: string) => 
  api.get(`/insurance-claims/attendance/${encounterId}`).then(r => r.data);

export const updateClaimDraft = (claimId: string, data: any) => 
  api.patch(`/insurance-claims/${claimId}/draft`, data).then(r => r.data);

export const updateInsuranceClaim = (claimId: string, data: any) => 
  api.patch(`/insurance-claims/${claimId}`, data).then(r => r.data);

export const finalizeClaim = (claimId: string) => 
  api.patch(`/insurance-claims/${claimId}/finalize`).then(r => r.data);

export const updateClaimStatus = (claimId: string, data: { status: string; notes?: string }) => 
  api.patch(`/insurance-claims/${claimId}/status`, data).then(r => r.data);

export const generateClaimXML = (claimId: string) => 
  api.get(`/insurance-claims/${claimId}/xml`, { responseType: 'blob' }).then(r => r.data);

export const generateClaimPrint = (claimId: string) => 
  api.get(`/insurance-claims/${claimId}/print`).then(r => r.data);

export const getFinalizedClaimsTotal = (filters?: any) => 
  api.get('/insurance-claims/finalized/total', { params: filters }).then(r => r.data);

// ──────────────────────────────────────────────
// INSURANCE CLAIMS - NHIS & Private
// ──────────────────────────────────────────────

export const generateNHISClaim = (encounterId: string) => 
  api.post('/insurance-claims/nhis/generate', { attendanceId: encounterId }).then(r => r.data);

export const getNHISClaims = (filters?: any) => 
  api.get('/insurance-claims/nhis', { params: filters }).then(r => r.data);

export const generatePrivateInsuranceClaim = (encounterId: string) => 
  api.post('/insurance-claims/private/generate', { attendanceId: encounterId }).then(r => r.data);

export const getPrivateInsuranceClaims = (filters?: any) => 
  api.get('/insurance-claims/private', { params: filters }).then(r => r.data);

// ──────────────────────────────────────────────
// CLAIM BATCHES (Keep as is)
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// PATIENTS
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// ENCOUNTERS (ATTENDANCES)
// ──────────────────────────────────────────────

export const getEncounters = (filters?: any) => 
  api.get('/encounters', { params: filters }).then(r => {
    const encounters = handleResponse<any>(r.data);
    return { 
      data: encounters, 
      encounters: encounters,
      pagination: r.data.pagination 
    };
  });

export const getEncounter = (id: string) => {
  if (!id || id === 'undefined' || id === 'null') {
    return Promise.reject(new Error('Valid Encounter ID is required'));
  }
  return api.get(`/encounters/${id}`).then(r => {
    const attendance = r.data;
    return { ...attendance, _id: attendance.id || attendance._id };
  });
};

export const createEncounter = (data: any) => 
  api.post('/encounters', data).then(r => {
    const attendance = r.data;
    return { ...attendance, _id: attendance.id || attendance._id };
  });

export const updateEncounter = (id: string, data: any) => {
  if (!id || id === 'undefined' || id === 'null') {
    return Promise.reject(new Error('Valid Encounter ID is required'));
  }
  return api.put(`/encounters/${id}`, data).then(r => {
    const attendance = r.data;
    return { ...attendance, _id: attendance.id || attendance._id };
  });
};

export const deleteEncounter = (id: string) => {
  if (!id || id === 'undefined' || id === 'null') {
    return Promise.reject(new Error('Valid Encounter ID is required'));
  }
  return api.delete(`/encounters/${id}`).then(r => r.data);
};

export const updateEncounterStatus = (id: string, data: any) => {
  if (!id || id === 'undefined' || id === 'null') {
    return Promise.reject(new Error('Valid Encounter ID is required'));
  }
  return api.patch(`/encounters/${id}/status`, data).then(r => {
    const attendance = r.data;
    return { ...attendance, _id: attendance.id || attendance._id };
  });
};

// ============================================
// WORKLIST (VIA ENCOUNTER MODULE)
// ============================================

export const getVitalsWorklist = () =>
  api.get('/encounters/worklist/vitals').then(r => r.data);

export const getMedicalWorklist = () =>
  api.get('/encounters/worklist/medical').then(r => r.data);

export const getLabWorklist = () =>
  api.get('/encounters/worklist/lab').then(r => r.data);

export const getPharmacyWorklist = () =>
  api.get('/encounters/worklist/pharmacy').then(r => r.data);

export const getScansWorklist = () =>
  api.get('/encounters/worklist/scans').then(r => r.data);

export const getTheatreWorklist = () =>
  api.get('/encounters/worklist/procedures').then(r => r.data);

export const getMaternalWorklist = () => 
  api.get('/encounters/worklist/maternal').then(r => r.data);

export const getWorklistSummary = () =>
  api.get('/encounters/worklist/summary').then(r => r.data);


export const addDiagnosisToEncounter = (encounterId: string, data: any) => 
  api.post(`/encounters/${encounterId}/diagnosis`, data).then(r => r.data);

export const removeDiagnosisFromEncounter = (encounterId: string, diagnosisId: string) => 
  api.delete(`/encounters/${encounterId}/diagnosis/${diagnosisId}`).then(r => r.data);

// Lab Test Operations
export const addLabTestToEncounter = (encounterId: string, data: any) => 
  api.post(`/encounters/${encounterId}/lab-tests`, data).then(r => r.data);

export const updateLabTestInEncounter = (_attendanceId: string, labTestId: string, data: any) =>
  api.put(`/encounters/lab-tests/${labTestId}/status`, data).then(r => r.data);

export const removeLabTestFromEncounter = (encounterId: string, labTestId: string) => 
  api.delete(`/encounters/${encounterId}/lab-tests/${labTestId}`).then(r => r.data);

// Procedure Operations
export const addProcedureToEncounter = (encounterId: string, data: any) => 
  api.post(`/encounters/${encounterId}/procedures`, data).then(r => r.data);

export const updateProcedureStatus = (_attendanceId: string, procedureId: string, data: any) =>
  api.put(`/encounters/procedures/${procedureId}/status`, data).then(r => r.data);

export const removeProcedureFromEncounter = (encounterId: string, procedureId: string) => 
  api.delete(`/encounters/${encounterId}/procedures/${procedureId}`).then(r => r.data);

// Medication Operations
export const addMedicationToEncounter = async (encounterId: string, data: { 
  stockItemId: string; 
  serviceCatalogId: string; 
  dosage: string; 
  frequency: string; 
  duration: string; 
  route?: string; 
  instructions?: string 
}) => {
  const response = await api.post(`/encounters/${encounterId}/prescriptions`, data);
  return response.data;
};

export const updateMedicationStatus = async (
  encounterId: string,
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
  const response = await api.patch(`/encounters/${encounterId}/medications/${medicationId}`, data);
  return response;
};

export const dispenseMedication = async (
  encounterId: string, 
  medicationId: string, 
  data: { quantity: number; dispensedById?: string; batchNumber?: string }
) => {
  const response = await api.patch(`/encounters/${encounterId}/medications/${medicationId}`, {
    status: 'dispensed',
    quantity: data.quantity,
    dispensedById: data.dispensedById,
    batchNumber: data.batchNumber,
    dispensedAt: new Date().toISOString()
  });
  return response.data;
};

export const removeMedicationFromEncounter = async (encounterId: string, medicationId: string) => {
  const response = await api.delete(`/encounters/${encounterId}/medications/${medicationId}`);
  return response.data;
};

// Scan Operations
export const addScanToEncounter = async (encounterId: string, data: { serviceCatalogId: string; priority?: string; notes?: string }) => {
  const response = await api.post(`/encounters/${encounterId}/scans`, data);
  return response.data;
};

export const updateScanStatus = async (_attendanceId: string, scanId: string, data: any) => {
  const response = await api.put(`/encounters/scans/${scanId}/status`, data);
  return response.data;
};

export const removeScanFromEncounter = async (encounterId: string, scanId: string) => {
  const response = await api.delete(`/encounters/${encounterId}/scans/${scanId}`);
  return response.data;
};

// Service Operations
export const addServiceToEncounter = async (encounterId: string, data: any) => {
  const response = await api.post(`/encounters/${encounterId}/services`, data);
  return response.data;
};

export const removeServiceFromEncounter = async (encounterId: string, serviceId: string) => {
  const response = await api.delete(`/encounters/${encounterId}/services/${serviceId}`);
  return response.data;
};

// Bed Assignment
export const assignBedToEncounter = (encounterId: string, data: any) => 
  api.post(`/encounters/${encounterId}/assign-bed`, data).then(r => r.data);

// Vitals
export const addVitalsToEncounter = async (encounterId: string, data: any) => {
  const response = await api.post(`/encounters/${encounterId}/vitals`, data);
  return response.data;
};

// api/index.ts - Make sure this is correct

export const getVitalsByEncounter = async (encounterId: string) => {
  try {
    const response = await api.get(`/encounters/${encounterId}/vitals`);
    console.log('API getVitalsByEncounter response:', response.data);
    
    // Handle different response formats
    if (response.data?.data) {
      return response.data.data;
    }
    if (response.data?.vitals) {
      return response.data.vitals;
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return response.data || [];
  } catch (error) {
    console.error('Error in getVitalsByEncounter:', error);
    return [];
  }
};

export const updateVitals = async (vitalsId: string, data: any) => {
  const response = await api.put(`/encounters/vitals/${vitalsId}`, data);
  return response.data;
};

export const deleteVitals = async (vitalsId: string) => {
  const response = await api.delete(`/encounters/vitals/${vitalsId}`);
  return response.data;
};

// Progress Notes
export const addProgressNoteToEncounter = (encounterId: string, data: any) => 
  api.post(`/encounters/${encounterId}/progress-notes`, data).then(r => r.data);

export const removeProgressNoteFromEncounter = (encounterId: string, noteId: string) => 
  api.delete(`/encounters/${encounterId}/progress-notes/${noteId}`).then(r => r.data);

// Billing Operations
export const getBillingBreakdown = (encounterId: string) => 
  api.get(`/encounters/${encounterId}/billing-breakdown`).then(r => r.data);

export const calculateEncounterBill = async (encounterId: string) => {
  const response = await api.post(`/encounters/${encounterId}/calculate-bill`);
  return response.data;
};

export const getEncounterStats = async (filters?: any) => {
  const params = new URLSearchParams();
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  const response = await api.get(`/encounters/stats${params.toString() ? `?${params}` : ''}`);
  return response.data;
};

// NHIS Claim Validation
export const validateNHISClaim = (encounterId: string) => 
  api.get(`/encounters/${encounterId}/nhis/validate`).then(r => r.data);

export const generateNHISClaimFromEncounter = (encounterId: string) => 
  api.get(`/encounters/${encounterId}/nhis/generate-claim-data`).then(r => r.data);

// ──────────────────────────────────────────────
// BILLS & PAYMENTS
// ──────────────────────────────────────────────
// api/index.ts - Update getBills function with cache prevention

export const getBills = (filters?: any) => {
  // ✅ Add cache-busting timestamp to prevent 304 responses
  const params = { 
    ...filters,
    _t: Date.now()  // Forces fresh request every time
  };
  
  return api.get('/bills', { params }).then(r => { 
    console.log('📊 API Bills Response:', r.data);
    console.log('📊 Response Headers:', r.headers);
    
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
};

export const getBill = (id: string) => {
  // ✅ Also add cache-busting for single bill
  return api.get(`/bills/${id}`, { 
    params: { _t: Date.now() } 
  }).then(r => {
    console.log('📄 API Bill Response:', r.data);
    return r.data;
  });
};

export const createBill = (data: any) => 
  api.post('/bills', data).then(r => r.data);

export const updateBill = (id: string, data: any) => 
  api.put(`/bills/${id}`, data).then(r => r.data);

export const deleteBill = (id: string) => 
  api.delete(`/bills/${id}`).then(r => r.data);

export const addPaymentToBill = (billId: string, data: any) =>
  api.post(`/bills/${billId}/payment`, data).then(r => r.data);

export const generateBillFromEncounter = (encounterId: string) => 
  api.post(`/bills/generate/${encounterId}`).then(r => r.data);

export const generateBillReport = (billId: string) => 
  api.get(`/bills/${billId}/report`).then(r => r.data);

export const getBillingBreakdownForBill = (billId: string) => 
  api.get(`/bills/${billId}/breakdown`).then(r => r.data);

export const updateBillStatus = (billId: string, data: any) =>
  api.put(`/bills/${billId}`, data).then(r => r.data);

export const getBillStatistics = () => 
  api.get('/bills/statistics').then(r => r.data);

// Bill Line Items
export const getBillLineItems = (billId: string) => 
  api.get(`/bills/${billId}/line-items`).then(r => r.data);

export const voidBillLineItem = (lineItemId: string, data: { reason: string }) =>
  api.post(`/bills/line-items/${lineItemId}/void`, data).then(r => r.data);

// ──────────────────────────────────────────────
// WAIVERS
// ──────────────────────────────────────────────

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


// ============================================
// ADMISSIONS API ENDPOINTS
// ============================================

// GET all formal admissions (IPD only)
export const getAdmissions = (filters?: { 
  status?: 'active' | 'discharged';
  wardId?: string;
  admissionType?: string;
  excludeDetention?: boolean;
  page?: number;
  limit?: number;
}) => 
  api.get('/encounters/admissions', { params: filters }).then(r => {
    console.log('🔍 getAdmissions API response:', r.data);
    
    // Handle various response structures
    if (r.data?.success && r.data?.data) {
      return r.data.data;
    }
    if (r.data?.data && Array.isArray(r.data.data)) {
      return r.data.data;
    }
    if (Array.isArray(r.data)) {
      return r.data;
    }
    if (r.data?.admissions && Array.isArray(r.data.admissions)) {
      return r.data.admissions;
    }
    
    console.warn('Unexpected getAdmissions response structure:', r.data);
    return [];
  });
// GET single admission by ID
export const getAdmission = (id: string) => 
  api.get(`/encounters/admissions/${id}`).then(r => r.data?.data || r.data);

// CREATE formal admission from IPD encounter
export const createAdmission = (data: { 
  attendanceId: string;
  admissionType?: 'emergency' | 'elective' | 'transfer' | 'detention_observation' | 'antenatal_observation' | 'delivery' | 'postpartum_observation';
  admissionSource?: 'home' | 'referral' | 'another_facility' | 'opd' | 'emergency' | 'antenatal' | 'delivery';
  admissionDate?: string;
}) => 
  api.post(`/encounters/${data.attendanceId}/admissions`, data).then(r => r.data?.data || r.data);

// UPDATE admission (discharge only typically)
export const updateAdmission = (id: string, data: { 
  dischargeDate?: string;
  dischargeStatus?: 'home' | 'transfer' | 'expired' | 'against_medical_advice';
  dailyNotes?: any;
  dischargeSummary?: string;
}) => 
  api.put(`/encounters/admissions/${id}`, data).then(r => r.data?.data || r.data);

// DELETE admission (only if not discharged)
export const deleteAdmission = (id: string) => 
  api.delete(`/encounters/admissions/${id}`).then(r => r.data);

// DISCHARGE from encounter (works for IPD, Daycase, and Detention)
export const dischargeFromEncounter = (encounterId: string, data?: { 
  dischargeDate?: string;
  dischargeStatus?: 'home' | 'transfer' | 'expired' | 'against_medical_advice';
  dischargeSummary?: string;
}) => 
  api.post(`/encounters/${encounterId}/discharge`, data || {}).then(r => r.data);

// GET daycase/observation patients (day surgery only)
export const getDaycasePatients = (filters?: { 
  status?: 'active' | 'discharged';
  wardId?: string;
  page?: number;
  limit?: number;
}) => 
  api.get('/encounters/daycase', { params: filters }).then(r => r.data?.data || r.data);

// Convert daycase to IPD
export const convertDaycaseToIPD = (encounterId: string, data?: { 
  admissionType?: 'emergency' | 'elective' | 'transfer';
}) => 
  api.post(`/encounters/${encounterId}/convert-to-ipd`, data || {}).then(r => r.data);

// Add daily notes to admission
export const addDailyNotesToAdmission = (admissionId: string, data: { 
  notes: string; 
  noteType?: string;
}) => 
  api.post(`/encounters/admissions/${admissionId}/notes`, data).then(r => r.data?.data || r.data);

// Get admission statistics
export const getAdmissionStats = () => 
  api.get('/encounters/stats').then(r => r.data?.data || r.data);

// Get admissions by patient ID (historical)
export const getAdmissionsByPatientId = (patientId: string, filters?: { 
  page?: number; 
  limit?: number;
}) => 
  api.get(`/encounters/admissions/patient/${patientId}`, { params: filters }).then(r => r.data?.data || r.data);

// Get current bed occupancy (all patients in beds - IPD and Daycase)
export const getBedOccupancy = () => 
  api.get('/encounters/bed-occupancy').then(r => r.data?.data || r.data);


// ============================================
// DETENTION/OBSERVATION API ENDPOINTS
// ============================================

// GET detention/observation patients (admissionType = 'detention_observation')
export const getDetentionPatients = (filters?: { 
  status?: 'active' | 'discharged';
  wardId?: string;
  observationHours?: number;
  readyForDecision?: boolean;
  page?: number;
  limit?: number;
}) => 
  api.get('/encounters/detention', { params: filters }).then(r => {
    console.log('🔍 getDetentionPatients API response:', r.data);
    // Return the full response with data and summary
    return r.data;
  });


// GET formal IPD patients (excluding detention)
export const getFormalIPDPatients = (filters?: { 
  status?: 'active' | 'discharged';
  wardId?: string;
  page?: number;
  limit?: number;
}) => 
  api.get('/encounters/formal-ipd', { params: filters }).then(r => {
    console.log('🔍 getFormalIPDPatients API response:', r.data);
    return r.data;
  });

// Convert detention/observation to formal IPD
export const convertDetentionToIPD = (encounterId: string, data: { 
  admissionType: 'elective' | 'emergency' | 'transfer';
  clinicalNotes?: string;
  decisionReason?: string;
}) => 
  api.post(`/encounters/${encounterId}/convert-detention-to-ipd`, data).then(r => r.data);


// ──────────────────────────────────────────────
// WARD CHARGES
// ──────────────────────────────────────────────

export const getWardCharges = (encounterId: string, params?: any) => 
  api.get(`/encounters/${encounterId}/ward-charges`, { params }).then(r => r.data);

export const generateDailyWardCharges = (date?: string) => 
  api.post('/admissions/ward-charges/generate', { date }).then(r => r.data);

// ──────────────────────────────────────────────
// WARDS & BEDS
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// PURCHASE INVOICES (Supplier invoices - renamed)
// ──────────────────────────────────────────────

export const getPurchaseInvoices = (filters?: any) => 
  api.get('/purchase-invoices', { params: filters }).then(r => handleResponse<PurchaseInvoice>(r.data));

export const getPurchaseInvoice = (id: string) => 
  api.get(`/purchase-invoices/${id}`).then(r => r.data);

export const createPurchaseInvoice = (data: any) => 
  api.post('/purchase-invoices', data).then(r => r.data);

export const updatePurchaseInvoice = (id: string, data: any) => 
  api.put(`/purchase-invoices/${id}`, data).then(r => r.data);

export const deletePurchaseInvoice = (id: string) => 
  api.delete(`/purchase-invoices/${id}`).then(r => r.data);

// ──────────────────────────────────────────────
// STOCK MANAGEMENT
// ──────────────────────────────────────────────

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
  api.get('/stock-items/low-stock').then(r => r.data);

export const getStockCategories = () => 
  api.get('/stock-items/categories').then(r => r.data);

export const updateStockLevel = (id: string, data: { quantity: number; transactionType: string; reference?: string; notes?: string }) => 
  api.post(`/stock-items/${id}/update-stock`, data).then(r => r.data);

export const getStockItemTransactionHistory = (stockItemId: string, filters?: { page?: number; limit?: number }) => 
  api.get(`/stock-items/${stockItemId}/transactions`, { params: filters }).then(r => r.data);

// Stock Reports
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

// ──────────────────────────────────────────────
// STOCK TRANSACTIONS
// ──────────────────────────────────────────────

export const getStockTransactions = (filters?: any) => 
  api.get('/stock-transactions', { params: filters }).then(r => handleResponse<StockTransaction>(r.data));

export const getStockTransaction = (id: string) => 
  api.get(`/stock-transactions/${id}`).then(r => r.data);

export const createStockTransaction = (data: any) => 
  api.post('/stock-transactions', data).then(r => r.data);

export const updateStockTransaction = (id: string, data: { notes?: string; reference?: string }) => 
  api.put(`/stock-transactions/${id}`, data).then(r => r.data);

export const getStockMovementReport = (filters?: any) => 
  api.get('/stock-transactions/reports/movement-summary', { params: filters }).then(r => r.data);

export const getLowStockAlerts = () => 
  api.get('/stock-transactions/alerts/low-stock').then(r => r.data);

// ──────────────────────────────────────────────
// REQUISITIONS
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// REFERRALS
// ──────────────────────────────────────────────

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
  encounterId?: string;
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

export const getReferralStats = async (params?: { startDate?: string; endDate?: string }) => {
  const response = await api.get('/referrals/stats/summary', { params });
  return response.data;
};

// ──────────────────────────────────────────────
// MEDICAL SERVICES (Diagnoses, Lab Tests, Procedures, Scans)
// ──────────────────────────────────────────────

// api/index.ts - UPDATE getDiagnoses function

export const getDiagnoses = (filters?: any) => 
  api.get('/diagnoses', { params: filters }).then(r => {
    console.log('🔍 Raw Diagnoses API response:', r.data);
    
    const responseData = r.data;
    
    // Handle nested response structure (similar to services)
    if (responseData?.success && responseData?.data?.data) {
      const diagnoses = responseData.data.data;
      const pagination = responseData.data.pagination;
      console.log(`✅ Extracted ${diagnoses.length} diagnoses from nested response`);
      return {
        data: diagnoses,
        diagnoses: diagnoses,
        pagination: pagination
      };
    }
    
    // Handle direct data array
    if (responseData?.data && Array.isArray(responseData.data)) {
      return {
        data: responseData.data,
        diagnoses: responseData.data,
        pagination: responseData.pagination
      };
    }
    
    // Handle array response
    if (Array.isArray(responseData)) {
      return {
        data: responseData,
        diagnoses: responseData,
        pagination: null
      };
    }
    
    // Handle paginated response
    if (responseData?.items && Array.isArray(responseData.items)) {
      return {
        data: responseData.items,
        diagnoses: responseData.items,
        pagination: {
          total: responseData.total,
          page: responseData.page,
          limit: responseData.limit,
          pages: responseData.pages
        }
      };
    }
    
    console.warn('Unexpected diagnoses response structure:', responseData);
    return {
      data: [],
      diagnoses: [],
      pagination: null
    };
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

// ============================================
// LAB TEST TEMPLATES
// ============================================

// ✅ Fix: Use '/lab-tests' (with hyphen) to match backend
export const getLabTestTemplates = (filters?: any) => 
  api.get('/lab-tests', { params: filters }).then(r => handleResponse<LabTestTemplate>(r.data));

export const getLabTestTemplate = (id: string) => 
  api.get(`/lab-tests/${id}`).then(r => r.data);


export const createLabTestTemplate = (data: any) => 
  api.post('/lab-tests', data).then(r => r.data);

export const updateLabTestTemplate = (id: string, data: any) => 
  api.put(`/lab-tests/${id}`, data).then(r => r.data);

export const deleteLabTestTemplate = (id: string) => 
  api.delete(`/lab-tests/${id}`).then(r => r.data);

export const getLabTestCategories = () => 
  api.get('/lab-tests/categories').then(r => r.data);

export const getLabTestSubCategories = () => 
  api.get('/lab-tests/sub-categories').then(r => r.data);

export const getSpecimenTypes = () => 
  api.get('/lab-tests/specimen-types').then(r => r.data);

export const bulkUpdateLabTestTemplates = (data: any) =>
  api.post('/lab-tests/bulk-update', data).then(r => r.data);


// Procedure Templates
export const getProcedureTemplates = (filters?: any) => 
  api.get('/procedures/templates', { params: filters }).then(r => handleResponse<ProcedureTemplate>(r.data));

export const getProcedureTemplate = (id: string) => 
  api.get(`/procedures/templates/${id}`).then(r => r.data);

export const createProcedureTemplate = (data: any) => 
  api.post('/procedures/templates', data).then(r => r.data);

export const updateProcedureTemplate = (id: string, data: any) => 
  api.put(`/procedures/templates/${id}`, data).then(r => r.data);

export const deleteProcedureTemplate = (id: string) => 
  api.delete(`/procedures/templates/${id}`).then(r => r.data);

export const getProcedureCategories = () => 
  api.get('/procedures/categories').then(r => r.data);

export const getProcedureDepartments = () => 
  api.get('/procedures/departments').then(r => r.data);

export const bulkUpdateProcedureTemplates = (data: any) => 
  api.post('/procedures/templates/bulk-update', data).then(r => r.data);

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
  api.get('/scan-templates/meta/categories').then(r => r.data);

export const getScanBodyParts = () => 
  api.get('/scan-templates/meta/body-parts').then(r => r.data);

export const getScanTypes = () => 
  api.get('/scan-templates/meta/scan-types').then(r => r.data);

export const bulkUpdateScanTemplates = (data: any) => 
  api.post('/scan-templates/bulk-update', data).then(r => r.data);

// ──────────────────────────────────────────────
// SERVICE CATALOG
// ──────────────────────────────────────────────

// api/index.ts - REPLACE the getServiceCatalog function

export const getServiceCatalog = (filters?: any) => 
  api.get('/services', { params: filters }).then(r => {
    console.log('🔍 Raw API response:', r.data);
    
    // The response structure is: { success: true, data: { data: [...], pagination: {...} } }
    const responseData = r.data;
    
    if (responseData?.success && responseData?.data?.data) {
      // Extract the nested data array
      const services = responseData.data.data;
      const pagination = responseData.data.pagination;
      
      console.log(`✅ Extracted ${services.length} services from nested response`);
      
      return {
        data: services,
        services: services,
        pagination: pagination
      };
    }
    
    // Fallback for other response structures
    if (Array.isArray(responseData)) {
      return {
        data: responseData,
        services: responseData,
        pagination: null
      };
    }
    
    if (responseData?.data && Array.isArray(responseData.data)) {
      return {
        data: responseData.data,
        services: responseData.data,
        pagination: responseData.pagination
      };
    }
    
    console.warn('Unexpected API response structure:', responseData);
    return {
      data: [],
      services: [],
      pagination: null
    };
  });

export const getServiceCatalogItem = (id: string) => {
  if (!id || id === 'undefined' || id === 'null') {
    return Promise.reject(new Error('Valid Service ID is required'));
  }
  return api.get(`/services/${id}`).then(r => {
    const service = r.data;
    return { ...service, _id: service.id || service._id };
  });
};

export const createServiceCatalogItem = (data: any) => {
  if (!data.name || !data.code) {
    return Promise.reject(new Error('Service name and code are required'));
  }
  return api.post('/services', data).then(r => {
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
  return api.put(`/services/${id}`, data).then(r => {
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
  return api.delete(`/services/${id}`).then(r => r.data);
};

export const getServiceMetadata = () => 
  api.get('/services/metadata').then(r => r.data);

export const getNHISReadinessReport = () => 
  api.get('/services/nhis-readiness').then(r => r.data);

export const getServiceByNHISCode = (nhisCode: string) => 
  api.get(`/services/nhis/${nhisCode}`).then(r => r.data);

export const getServicesByCategory = (category: string) => 
  api.get(`/services/category/${category}`).then(r => r.data);

export const checkServiceCoverage = (data: any) => 
  api.post('/services/check-coverage', data).then(r => r.data);

export const calculateServiceCost = (data: any) => 
  api.post('/services/calculate-cost', data).then(r => r.data);

// ──────────────────────────────────────────────
// CONSULTATION TYPES
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// DEPARTMENT
// ──────────────────────────────────────────────

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
  api.get(`/departments/${departmentId}/users`).then(r => {
    // The backend returns: { success: true, data: users[], count: number }
    const data = r.data?.data || r.data?.users || r.data;
    return Array.isArray(data) ? data : [];
  });

export const assignUserToDepartment = (departmentId: string, data: any) => 
  api.post(`/departments/${departmentId}/users`, data).then(r => r.data?.data || r.data);

export const assignDepartmentHead = (departmentId: string, userId: string) => 
  api.put(`/departments/${departmentId}`, { headId: userId }).then(r => r.data?.data || r.data);

export const removeUserFromDepartment = (departmentId: string, userId: string) => 
  api.delete(`/departments/${departmentId}/users/${userId}`).then(r => r.data?.data || r.data);

export const bulkUpdateDepartments = (data: any) =>
  api.put('/departments/bulk/update', data).then(r => r.data);

export const getEligibleDepartmentHeads = () => 
  api.get('/departments/eligible-heads').then(r => r.data);
// ──────────────────────────────────────────────
// APPOINTMENTS
// ──────────────────────────────────────────────

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

// ✅ Updated: clinician schedule (was getDoctorSchedule)
export const getClinicianSchedule = (clinicianId: string, date?: string) => 
  api.get('/appointments/schedule', { params: { clinicianId, date } }).then(r => r.data);

// ✅ Updated: available slots for clinician
export const getAvailableSlots = (clinicianId: string, date: string) => 
  api.get('/appointments/available-slots', { params: { clinicianId, date } }).then(r => r.data);

// ✅ New: Get available clinicians (doctors, nurses, midwives)
export const getAvailableClinicians = (roles?: string[]) => 
  api.get('/appointments/clinicians', { params: { roles: roles?.join(',') } }).then(r => r.data);

// ✅ New: Convert appointment to attendance
export const convertToAttendance = (appointmentId: string, paymentData: any) => 
  api.post(`/appointments/${appointmentId}/convert-to-attendance`, paymentData).then(r => r.data);

// ──────────────────────────────────────────────
// NOTIFICATIONS
// ──────────────────────────────────────────────

// ✅ ADD THIS MISSING FUNCTION
export const createNotification = async (data: {
  userId: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  actionType?: string;
  actionId?: string;
  actionUrl?: string;
}) => {
  const response = await api.post('/notifications', data);
  return response.data;
};

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

export const getUnreadCount = () => 
  api.get('/notifications/unread-count').then(r => r.data);

// Admin Notifications
export const sendBulkNotification = async (data: {
  userIds: string[];
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

// User-to-User Messaging
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
}) => api.post('/notifications/message/bulk', data).then(r => r.data);

export const getConversations = () => api.get('/notifications/conversations').then(r => r.data);

// System Triggers
export const triggerLowStockCheck = async () => {
  const response = await api.post('/notifications/trigger/low-stock');
  return response.data;
};

export const triggerAppointmentReminders = async () => {
  const response = await api.post('/notifications/trigger/appointment-reminders');
  return response.data;
};

export const cleanupOldNotifications = async (daysToKeep: number = 30) => {
  const response = await api.delete(`/notifications/cleanup?daysToKeep=${daysToKeep}`);
  return response.data;
};

// ──────────────────────────────────────────────
// USER API WITH DEPARTMENT SUPPORT
// ──────────────────────────────────────────────

export const getUsersByDepartment = (departmentId: string) =>
  api.get(`/departments/${departmentId}/users`).then(r => r.data);

export const updateUserDepartment = (userId: string, departmentId: string) =>
  api.put(`/users/${userId}`, { departmentId }).then(r => r.data);

// ──────────────────────────────────────────────
// DASHBOARD STATISTICS
// ──────────────────────────────────────────────

export const getDashboardStats = () => 
  api.get('/dashboard/stats').then(r => r.data);

export const getAppointmentCalendar = (month: string, year: string) => 
  api.get('/dashboard/appointment-calendar', { params: { month, year } }).then(r => r.data);

// ──────────────────────────────────────────────
// BACKUP SYSTEM - CORRECTED ENDPOINTS
// ──────────────────────────────────────────────

export const createBackup = async () => {
  const response = await api.post('/backup');
  return response.data;
};

export const restoreBackup = async (backupFile: File) => {
  const formData = new FormData();
  formData.append('backup', backupFile);  // Field name should be 'backup' (matches multer)
  
  const response = await api.post('/backup/restore', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

export const getBackupList = async (page: number = 1, limit: number = 50) => {
  const response = await api.get('/backup', { params: { page, limit } });
  return response.data;
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

    if (!(response.data instanceof Blob)) {
      console.error('❌ Response data is not a Blob:', typeof response.data);
      throw new Error('Invalid response format: expected Blob');
    }

    const contentType = response.headers['content-type'];
    const contentTypeString = typeof contentType === 'string' ? contentType : 'application/octet-stream';

    const blob = new Blob([response.data], {
      type: contentTypeString
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
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

// ✅ ADD: Get backup statistics
export const getBackupStats = async () => {
  const response = await api.get('/backup/stats');
  return response.data;
};

// ──────────────────────────────────────────────
// DOCUMENT GENERATION
// ──────────────────────────────────────────────

export const generateReceipt = (billId: string) => 
  api.post<DocumentGenerationResponse>(`/documents/receipt/${billId}`).then(r => r.data);

export const generateBillStatement = (billId: string) => 
  api.post<DocumentGenerationResponse>(`/documents/bill-statement/${billId}`).then(r => r.data);

export const generateReferralLetter = (referralId: string) => 
  api.post<DocumentGenerationResponse>(`/documents/referral/${referralId}`).then(r => r.data);

export const generateDischargeSummary = (admissionId: string) => 
  api.post<DocumentGenerationResponse>(`/documents/discharge/${admissionId}`).then(r => r.data);

export const generateLabResult = (labTestId: string) => 
  api.post<DocumentGenerationResponse>(`/documents/lab-result/${labTestId}`).then(r => r.data);

export const generatePrescription = (encounterId: string) => 
  api.post<DocumentGenerationResponse>(`/documents/prescription/${encounterId}`).then(r => r.data);

export const getDocumentsByEntity = (entityType: string, entityId: string) => 
  api.get<{ success: boolean; data: GeneratedDocument[] }>(`/documents/entity/${entityType}/${entityId}`).then(r => r.data);

export const downloadDocument = (documentId: string) =>
  api.get(`/documents/${documentId}/download`, {
    responseType: 'blob',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    }
  }).then(r => r.data);

export const reprintDocument = (documentId: string) => 
  api.post<DocumentGenerationResponse>(`/documents/reprint/${documentId}`).then(r => r.data);

export const getTemplates = () => 
  api.get<{ success: boolean; data: DocumentTemplate[] }>(`/documents/templates`).then(r => r.data);

export const createTemplate = (data: any) => 
  api.post<{ success: boolean; data: DocumentTemplate }>(`/documents/templates`, data).then(r => r.data);

export const updateTemplate = (id: string, data: any) => 
  api.put<{ success: boolean; data: DocumentTemplate }>(`/documents/templates/${id}`, data).then(r => r.data);

export const deleteTemplate = (id: string) => 
  api.delete(`/documents/templates/${id}`).then(r => r.data);

// ──────────────────────────────────────────────
// UPLOAD SYSTEM (Static file serving)
// ──────────────────────────────────────────────

export const servePatientImages = (filename: string) => 
  `/uploads/patients/${filename}`;

export const serveScanImages = (filename: string) => 
  `/uploads/scans/${filename}`;

export const serveDocuments = (filename: string) => 
  `/uploads/documents/${filename}`;


// ──────────────────────────────────────────────
// GHS REPORTS
// ──────────────────────────────────────────────

export const getGHSOPDReport = async (params: ReportFilter) => {
  const response = await api.get('/ghs-reports/opd', { params });
  return response.data;
};

export const getGHSIPDReport = async (params: ReportFilter) => {
  const response = await api.get('/ghs-reports/ipd', { params });
  return response.data;
};

export const getGHSIDSRReport = async (params: ReportFilter) => {
  const response = await api.get('/ghs-reports/idsr', { params });
  return response.data;
};

export const getGHSMalariaReport = async (params: ReportFilter) => {
  const response = await api.get('/ghs-reports/malaria', { params });
  return response.data;
};

export const getGHSDeliveryReport = async (filters: ReportFilter) => {
  const response = await api.get('/ghs-reports/delivery', { params: filters });
  return response.data;
};

export const getGHSFormAReport = async (params: ReportFilter) => {
  const response = await api.get('/ghs-reports/form-a', { params });
  return response.data;
};

export const getMorbidityMortalityReport = async (params: ReportFilter) => {
  const response = await api.get('/ghs-reports/morbidity-mortality', { params });
  return response.data;
};

export const getTopDiagnoses = async (params: ReportFilter, limit: number = 10) => {
  const response = await api.get('/ghs-reports/top-diagnoses', { params: { ...params, limit } });
  return response.data;
};

// FIXED: removed duplicate getGHSFamilyPlanningReport — one function, one endpoint
export const getFamilyPlanningReport = async (params: ReportFilter) => {
  const response = await api.get('/ghs-reports/family-planning', { params });
  return response.data;
};

export const getConsultingRoomRegister = async (params: {
  startDate?: string;
  endDate?: string;
  period?: 'daily' | 'weekly' | 'monthly';
}) => {
  const response = await api.get('/ghs-reports/consulting-room-register', { params });
  return response.data;
};

export const getReportSubmissions = async (filters?: {
  reportType?: string;
  year?: number;
  month?: number;
}) => {
  const response = await api.get('/ghs-reports/submissions', { params: filters });
  return response.data;
};

export const getReportSubmissionById = async (id: string) => {
  const response = await api.get(`/ghs-reports/submissions/${id}`);
  return response.data;
};

export const exportGHSReportToCSV = async (submissionId: string) => {
  const response = await api.get(`/ghs-reports/submissions/${submissionId}/export`, {
    responseType: 'blob',
  });
  return response.data;
};

// ──────────────────────────────────────────────
// NHIS REPORTS  (→ /reports/nhis-*)
// ──────────────────────────────────────────────

export const getNhisExpiryReport = async (params: {
  daysThreshold?: number;
  startDate?: string;
  endDate?: string;
}) => {
  const response = await api.get('/reports/nhis-expiry', { params });
  return response.data;
};

export const getNhisClaimsSummary = async (params: {
  startDate?: string;
  endDate?: string;
  expiryStatus?: 'ACTIVE' | 'WARNING' | 'CRITICAL' | 'EXPIRED';
}) => {
  const response = await api.get('/reports/nhis-claims-summary', { params });
  return response.data;
};

export const getNhisExpiringSoon = async (days: number = 30) => {
  const response = await api.get('/reports/nhis-expiring-soon', { params: { days } });
  return response.data;
};

// ──────────────────────────────────────────────
// FINANCIAL & CLINICAL REPORTS  (→ /reports/*)
// ──────────────────────────────────────────────

export const getFinancialReport = async (params: ReportFilter) => {
  const response = await api.get('/reports/financial', { params });
  return response.data;
};

export const getInsuranceClaimsReport = async (params: ReportFilter) => {
  const response = await api.get('/reports/insurance-claims', { params });
  return response.data;
};

export const getClinicalReport = async (params: ReportFilter) => {
  const response = await api.get('/reports/clinical', { params });
  return response.data;
};

// Named getEncounterReport in api to match the import alias in reportsStore
export const getEncounterReport = async (params: ReportFilter) => {
  const response = await api.get('/reports/attendance', { params });
  return response.data;
};

export const getRevenueReport = async (params: ReportFilter) => {
  const response = await api.get('/reports/revenue', { params });
  return response.data;
};

export const getDemographicReport = async (params: ReportFilter) => {
  const response = await api.get('/reports/demographic', { params });
  return response.data;
};

// ──────────────────────────────────────────────
// CLINICAL DETAIL REPORTS  (→ /clinical-reports/*)
// ──────────────────────────────────────────────

export const getLabReport = async (params: ReportFilter) => {
  const response = await api.get('/clinical-reports/lab', { params });
  return response.data;
};

// FIXED: was '/clinical-reports/scans' — route is '/clinical-reports/scan'
export const getScanReport = async (params: ReportFilter) => {
  const response = await api.get('/clinical-reports/scan', { params });
  return response.data;
};

// FIXED: was '/clinical-reports/procedures' — route is '/clinical-reports/procedure'
export const getProcedureReport = async (params: ReportFilter) => {
  const response = await api.get('/clinical-reports/procedure', { params });
  return response.data;
};

// FIXED: was '/clinical-reports/medications' — route is '/clinical-reports/medication'
export const getMedicationReport = async (params: ReportFilter) => {
  const response = await api.get('/clinical-reports/medication', { params });
  return response.data;
};

export const getVitalsReport = async (params: ReportFilter) => {
  const response = await api.get('/clinical-reports/vitals', { params });
  return response.data;
};

export const getClinicalReports = async (filters?: any) => {
  const response = await api.get('/clinical-reports', { params: filters });
  return response.data.data || response.data;
};

// ──────────────────────────────────────────────
// EXPORT  (→ POST /reports/export)
// ──────────────────────────────────────────────

// Used by Reports.tsx handleExport — sends already-fetched report data to the server
export const exportReport = async (data: {
  reportType: string;
  format: string;
  filters: ReportFilter;
  data: any;
}) => {
  const response = await api.post('/reports/export', data);
  return response.data;
};


export const exportReportToCSV = async (reportType: string, filters: ReportFilter) => {
  let reportData: any;

  switch (reportType) {
    case 'financial':
      reportData = await getFinancialReport(filters);
      break;
    case 'clinical':
      reportData = await getClinicalReport(filters);
      break;
    case 'revenue':
      reportData = await getRevenueReport(filters);
      break;
    case 'attendance':
      reportData = await getEncounterReport(filters);
      break;
    case 'lab':
      reportData = await getLabReport(filters);
      break;
    case 'scans':
      reportData = await getScanReport(filters);
      break;
    case 'procedures':
      reportData = await getProcedureReport(filters);
      break;
    case 'medications':
      reportData = await getMedicationReport(filters);
      break;
    case 'vitals':
      reportData = await getVitalsReport(filters);
      break;
    default:
      throw new Error(`Unknown report type for CSV export: ${reportType}`);
  }

  const response = await api.post(
    '/reports/export',
    { reportType, format: 'csv', filters, data: reportData.data ?? reportData },
    { responseType: 'blob' },
  );

  return response.data;
};


// ============================================
// FAMILY PLANNING
// ============================================

export interface FPServiceData {
  patientId: string;
  attendanceId?: string;
  serviceDate?: string;
  method: string;
  methodCategory: string;
  isNewAcceptor?: boolean;
  counsellingGiven?: boolean;
  informedConsent?: boolean;
  sideEffects?: string;
  contraindications?: string;
  medicalEligibilityCategory?: number;
  nextFollowUpDate?: string;
  isPostpartum?: boolean;
  isPostAbortion?: boolean;
  postpartumWeeks?: number;
  notes?: string;
}

export const getFPServices = async (filters?: any) => {
  const response = await api.get('/family-planning', { params: filters });
  return response.data;
};

export const getFPServiceById = async (id: string) => {
  const response = await api.get(`/family-planning/${id}`);
  return response.data;
};

export const createFPService = async (data: FPServiceData) => {
  const response = await api.post('/family-planning', data);
  return response.data;
};

export const updateFPService = async (id: string, data: Partial<FPServiceData>) => {
  const response = await api.put(`/family-planning/${id}`, data);
  return response.data;
};

export const deleteFPService = async (id: string) => {
  const response = await api.delete(`/family-planning/${id}`);
  return response.data;
};

export const getCurrentFPMethod = async (patientId: string) => {
  const response = await api.get(`/family-planning/patient/${patientId}/current`);
  return response.data;
};

export const getFPHistory = async (patientId: string) => {
  const response = await api.get(`/family-planning/patient/${patientId}/history`);
  return response.data;
};

export const getFPClientDetails = async (patientId: string) => {
  const response = await api.get(`/family-planning/patient/${patientId}/details`);
  return response.data;
};

export const getFPStatistics = async (filters?: { startDate?: string; endDate?: string }) => {
  const response = await api.get('/family-planning/statistics', { params: filters });
  return response.data;
};

export const getFPMethodMix = async (filters?: { startDate?: string; endDate?: string }) => {
  const response = await api.get('/family-planning/method-mix', { params: filters });
  return response.data;
};

export const getGHSFPReport = async (startDate: string, endDate: string) => {
  const response = await api.get('/family-planning/ghs-report', { params: { startDate, endDate } });
  return response.data;
};
// ──────────────────────────────────────────────
// ANTENATAL RECORDS (Updated names to match stores)
// ──────────────────────────────────────────────

// Get all antenatal records
export const getAntenatalRecords = async (filters?: { 
  page?: number; 
  limit?: number; 
  isActive?: boolean; 
  patientId?: string 
}) => {
  const response = await api.get('/antenatal', { params: filters });
  return response.data;
};

// Get antenatal record by encounter ID
export const getAntenatalRecordByEncounter = async (encounterId: string) => {
  const response = await api.get(`/antenatal/attendance/${encounterId}`);
  return response.data;
};

// Get active antenatal record by patient ID
export const getActiveAntenatalRecordByPatient = async (patientId: string) => {
  const response = await api.get(`/antenatal/patient/${patientId}/active`);
  return response.data;
};

// Get antenatal record by ID
export const getAntenatalRecordById = async (recordId: string) => {
  const response = await api.get(`/antenatal/${recordId}`);
  return response.data;
};

// Register new antenatal booking (first visit)
export const registerAntenatalBooking = async (data: {
  patientId: string;
  attendanceId?: string;
  gravida: number;
  para: number;
  lmp: string;
  gestationalAgeWeeks?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  riskFactors?: any;
  bloodGroup?: string;
  hivStatus?: string;
  hbLevel?: number;
  vdrl?: string;
  bookingWeight?: number;
  bookingBP?: string;
  previousCSection?: boolean;
  previousComplications?: string;
}) => {
  const response = await api.post('/antenatal', data);
  return response.data;
};

// Update antenatal record
export const updateAntenatalRecord = async (recordId: string, data: {
  gravida?: number;
  para?: number;
  edd?: string;
  gestationalAgeWeeks?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  bloodGroup?: string;
  hivStatus?: string;
  hbLevel?: number;
  vdrl?: string;
  previousCSection?: boolean;
  previousComplications?: string;
}) => {
  const response = await api.put(`/antenatal/${recordId}`, data);
  return response.data;
};

// Close antenatal record (after delivery)
export const closeAntenatalRecord = async (recordId: string, data: { 
  deliveryDate?: string; 
  deliveryOutcome?: string; 
  deliveryRecordId?: string 
}) => {
  const response = await api.post(`/antenatal/${recordId}/close`, data);
  return response.data;
};

// Delete antenatal record (admin only)
export const deleteAntenatalRecord = async (recordId: string) => {
  const response = await api.delete(`/antenatal/${recordId}`);
  return response.data;
};

// ──────────────────────────────────────────────
// ANC VISITS (Follow-up visits)
// ──────────────────────────────────────────────

// Record a new ANC visit (follow-up)
export const recordANCVisit = async (data: {
  bookingId: string;
  attendanceId: string;
  visitNumber: number;
  visitDate: string;
  gestationalAgeWeeks?: number;
  weight?: number;
  bloodPressure?: string;
  fundalHeight?: number;
  fetalHeartRate?: number;
  fetalMovements?: boolean;
  presentation?: string;
  iptpGiven?: boolean;
  iptpDoseNumber?: number;
  iptpDrug?: string;
  ttGiven?: boolean;
  ttDoseNumber?: number;
  ironGiven?: boolean;
  folateGiven?: boolean;
  calciumGiven?: boolean;
  malariaTestDone?: boolean;
  malariaTestResult?: string;
  malariaTreatmentGiven?: boolean;
  dangerSignsPresent?: boolean;
  dangerSignsList?: string[];
  referralMade?: boolean;
  referredTo?: string;
  nextVisitDate?: string;
  returnInstructions?: string;
}) => {
  const response = await api.post('/antenatal/visits', data);
  return response.data;
};

// Get all ANC visits for an antenatal record
export const getANCVisitsByAntenatalRecord = async (recordId: string) => {
  const response = await api.get(`/antenatal/bookings/${recordId}/visits`);
  return response.data;
};

// Get ANC visit by ID
export const getANCVisitById = async (id: string) => {
  const response = await api.get(`/antenatal/visits/${id}`);
  return response.data;
};

// Update ANC visit
export const updateANCVisit = async (id: string, data: Partial<{
  gestationalAgeWeeks: number;
  weight: number;
  bloodPressure: string;
  fundalHeight: number;
  fetalHeartRate: number;
  iptpGiven: boolean;
  iptpDoseNumber: number;
  ttGiven: boolean;
  ttDoseNumber: number;
  dangerSignsPresent: boolean;
  referralMade: boolean;
  nextVisitDate: string;
}>) => {
  const response = await api.put(`/antenatal/visits/${id}`, data);
  return response.data;
};

// Delete ANC visit (admin only)
export const deleteANCVisit = async (id: string) => {
  const response = await api.delete(`/antenatal/visits/${id}`);
  return response.data;
};

// ──────────────────────────────────────────────
// DELIVERY RECORDS (Updated names to match stores)
// ──────────────────────────────────────────────

// Get all delivery records
export const getDeliveryRecords = async (filters?: { 
  patientId?: string; 
  startDate?: string; 
  endDate?: string; 
  page?: number; 
  limit?: number 
}) => {
  const response = await api.get('/antenatal/deliveries', { params: filters });
  return response.data;
};

// Get delivery record by ID
export const getDeliveryRecord = async (id: string) => {
  const response = await api.get(`/antenatal/deliveries/${id}`);
  return response.data;
};

// Record a new delivery
export const recordDelivery = async (data: {
  patientId: string;
  attendanceId: string;
  antenatalBookingId?: string;
  deliveryDate: string;
  deliveryType: 'spontaneous_vertex' | 'assisted_breech' | 'vacuum' | 'forceps' | 'caesarean_section' | 'multiple';
  deliveryOutcome: 'live_birth' | 'stillbirth_fresh' | 'stillbirth_macerated' | 'neonatal_death';
  placeOfDelivery?: 'private_hospital' | 'government_hospital' | 'health_centre' | 'clinic' | 'chag_facility' | 'private_midwife' | 'tba_trained' | 'tba_untrained' | 'home' | 'en_route' | 'mines_facility' | 'quasi_govt_institution';
  attendant?: string;
  gestationWeeks?: number;
  birthWeight?: number;
  apgarScore1min?: number;
  apgarScore5min?: number;
  resusCitationDone?: boolean;
  maternalOutcome?: 'alive' | 'dead_direct_cause' | 'dead_indirect_cause' | 'dead_unknown';
  complications?: string[];
  notes?: string;
  malePartnerPresentANC?: boolean;
  malePartnerPresentDelivery?: boolean;
  malePartnerPresentPNC?: boolean;
  maternalDeathsAudited?: boolean;
  auditNotes?: string;
  newborns?: Array<{
    birthWeight: number;
    gender: 'male' | 'female' | 'other';
    apgarScore1min?: number;
    apgarScore5min?: number;
    resuscitation?: boolean;
    outcome?: string;
    breastfeedingWithin30Min?: boolean;
    eyeProphylaxisGiven?: boolean;
    cordCareMethod?: 'dry_cord' | 'chlorhexidine' | 'methylated_spirit' | 'alcohol' | 'other';
  }>;
}) => {
  const response = await api.post('/antenatal/deliveries', data);
  return response.data;
};

// Update delivery record
export const updateDeliveryRecord = async (id: string, data: Partial<{
  deliveryType: string;
  deliveryOutcome: string;
  birthWeight: number;
  apgarScore1min: number;
  apgarScore5min: number;
  maternalOutcome: string;
  complications: string[];
  notes: string;
  malePartnerPresentANC: boolean;
  malePartnerPresentDelivery: boolean;
  malePartnerPresentPNC: boolean;
  maternalDeathsAudited: boolean;
  auditNotes: string;
}>) => {
  const response = await api.put(`/antenatal/deliveries/${id}`, data);
  return response.data;
};

// Delete delivery record (admin only)
export const deleteDeliveryRecord = async (id: string) => {
  const response = await api.delete(`/antenatal/deliveries/${id}`);
  return response.data;
};

// ──────────────────────────────────────────────
// POSTNATAL RECORDS (Updated names to match stores)
// ──────────────────────────────────────────────

// Get all postnatal records
export const getPostnatalRecords = async (filters?: { 
  patientId?: string; 
  page?: number; 
  limit?: number 
}) => {
  const response = await api.get('/antenatal/postnatals', { params: filters });
  return response.data;
};

// Get postnatal record by ID
export const getPostnatalRecord = async (id: string) => {
  const response = await api.get(`/antenatal/postnatal/${id}`);
  return response.data;
};

// Record a new postnatal visit
export const recordPostnatalVisit = async (data: {
  patientId: string;
  attendanceId: string;
  antenatalBookingId?: string;
  deliveryRecordId?: string;
  examinationDate: string;
  dayNumber?: number;
  maternalCondition?: 'good' | 'fair' | 'poor' | 'critical';
  maternalComplications?: string[];
  bloodPressure?: string;
  temperature?: number;
  pulse?: number;
  fundalHeight?: number;
  lochia?: string;
  perinealCondition?: string;
  caesareanWound?: string;
  breastfeedingStatus?: 'exclusive' | 'mixed' | 'not_breastfeeding';
  breastfeedingDifficulties?: string[];
  latching?: string;
  babyCondition?: 'good' | 'fair' | 'poor' | 'critical';
  babyWeight?: number;
  babyTemperature?: number;
  babyFeeding?: string;
  jaundice?: boolean;
  jaundiceSeverity?: string;
  cordCondition?: string;
  bcgGiven?: boolean;
  opv0Given?: boolean;
  hepB0Given?: boolean;
  familyPlanningDiscussed?: boolean;
  familyPlanningMethodAccepted?: string;
  maternalDangerSigns?: string[];
  babyDangerSigns?: string[];
  referralMade?: boolean;
  referredTo?: string;
  referralReason?: string;
  nextVisitDate?: string;
  nextVisitType?: string;
  notes?: string;
}) => {
  const response = await api.post('/antenatal/postnatal', data);
  return response.data;
};

// Update postnatal record
export const updatePostnatalRecord = async (id: string, data: Partial<{
  maternalCondition: string;
  maternalComplications: string[];
  bloodPressure: string;
  temperature: number;
  pulse: number;
  fundalHeight: number;
  lochia: string;
  perinealCondition: string;
  caesareanWound: string;
  breastfeedingStatus: string;
  breastfeedingDifficulties: string[];
  latching: string;
  babyCondition: string;
  babyWeight: number;
  babyTemperature: number;
  babyFeeding: string;
  jaundice: boolean;
  jaundiceSeverity: string;
  cordCondition: string;
  bcgGiven: boolean;
  opv0Given: boolean;
  hepB0Given: boolean;
  familyPlanningDiscussed: boolean;
  familyPlanningMethodAccepted: string;
  maternalDangerSigns: string[];
  babyDangerSigns: string[];
  referralMade: boolean;
  referredTo: string;
  referralReason: string;
  nextVisitDate: string;
  nextVisitType: string;
  notes: string;
}>) => {
  const response = await api.put(`/antenatal/postnatal/${id}`, data);
  return response.data;
};

// Delete postnatal record (admin only)
export const deletePostnatalRecord = async (id: string) => {
  const response = await api.delete(`/antenatal/postnatal/${id}`);
  return response.data;
};

// ──────────────────────────────────────────────
// STATISTICS
// ──────────────────────────────────────────────

export const getAntenatalStatistics = async (filters?: { startDate?: string; endDate?: string }) => {
  const response = await api.get('/antenatal/stats/anc', { params: filters });
  return response.data;
};

export const getDeliveryStatistics = async (filters?: { startDate?: string; endDate?: string }) => {
  const response = await api.get('/antenatal/stats/delivery', { params: filters });
  return response.data;
};

export const getPostnatalStatistics = async (filters?: { startDate?: string; endDate?: string }) => {
  const response = await api.get('/antenatal/stats/postnatal', { params: filters });
  return response.data;
};

// ──────────────────────────────────────────────
// PROFORMA INVOICES (Patient Estimates)
// ──────────────────────────────────────────────

export const getEstimates = (filters?: any) => 
  api.get('/estimates', { params: filters }).then(r => r.data);

export const getEstimate = (id: string) => 
  api.get(`/estimates/${id}`).then(r => r.data);

export const createEstimate = (data: any) => 
  api.post('/estimates', data).then(r => r.data);

export const updateEstimate = (id: string, data: any) => 
  api.put(`/estimates/${id}`, data).then(r => r.data);

export const deleteEstimate = (id: string) => 
  api.delete(`/estimates/${id}`).then(r => r.data);

export const sendEstimate = (id: string) => 
  api.post(`/estimates/${id}/send`).then(r => r.data);

export const acceptEstimate = (id: string) => 
  api.post(`/estimates/${id}/accept`).then(r => r.data);

export const rejectEstimate = (id: string, reason?: string) => 
  api.post(`/estimates/${id}/reject`, { reason }).then(r => r.data);

export const convertEstimateToBill = (id: string, data: { paymentMode: string; notes?: string }) => 
  api.post(`/estimates/${id}/convert`, data).then(r => r.data);

export const getEstimateStatistics = (filters?: { fromDate?: string; toDate?: string }) => 
  api.get('/estimates/statistics', { params: filters }).then(r => r.data);

export const getExpiringEstimates = (days?: number) => 
  api.get('/estimates/expiring', { params: { days } }).then(r => r.data);

export const getEstimatesByPatient = (patientId: string) => 
  api.get(`/estimates/patient/${patientId}`).then(r => r.data);

export const getEstimatesByCorporateAccount = (accountId: string) => 
  api.get(`/estimates/corporate/${accountId}`).then(r => r.data);

// ──────────────────────────────────────────────
// COMMUNICATIONS (SMS/WhatsApp)
// ──────────────────────────────────────────────

export const sendSMS = (data: { recipient: string; message: string; metadata?: Record<string, any> }) =>
  api.post('/communications/sms', data).then(r => r.data);

export const sendWhatsApp = (data: { recipient: string; message: string; metadata?: Record<string, any> }) =>
  api.post('/communications/whatsapp', data).then(r => r.data);

// Unified helper: routes to the correct endpoint by channel
export const sendMessage = (channel: 'sms' | 'whatsapp', data: { recipient: string; message: string; metadata?: Record<string, any> }) =>
  channel === 'whatsapp' ? sendWhatsApp(data) : sendSMS(data);

export const getCommunicationChannels = () =>
  api.get('/communications/channels').then(r => r.data);

export const getCommunicationLogs = (filters?: { channelId?: string; status?: string; startDate?: string; endDate?: string }) =>
  api.get('/communications/history', { params: filters }).then(r => r.data);

export const getCommunicationTemplates = (type?: string) => 
  api.get('/communications/templates', { params: { type } }).then(r => r.data);

export const createCommunicationTemplate = (data: any) => 
  api.post('/communications/templates', data).then(r => r.data);

export const sendAppointmentReminderSMS = (appointmentId: string) => 
  api.post(`/communications/send/appointment/${appointmentId}`).then(r => r.data);

// ──────────────────────────────────────────────
// DEFAULT EXPORT
// ──────────────────────────────────────────────

export default {
  // Auth
  login, register, verifyToken, logout, getUsers, getUserStats, getProfile, updateProfile, changePassword,
  
  // Add new helpers
  hasMinSeniority,
  getUserSeniority,
  getSeniorityLabel,

    // User Management (NEW - separate module)
    adminCreateUser, getAllUsers, getUserById, updateUser, deactivateUser, getUserProfile, updateUserProfile, changeUserPassword, getCurrentUserPermissions,
  
    // Shift Management (NEW)
    getShifts, getShiftById, createShift, updateShift, deleteShift,
    
    // Leave Management (NEW)
    getLeaves, getLeaveById, createLeave, updateLeave, deleteLeave,

  // Settings
  getHospitalDetails, updateHospitalDetails, getSystemSettings, updateSystemSettings, 
  
  // NHIS SETTINGS
  getHospitalNHISSettings, updateHospitalNHISSettings,
  getNHISApiStatus, updateNHISApiConfig, testNHISConnection,
  verifyNHISEligibility, bulkVerifyNHISEligibility, generateCCC,
  
  // Hospital Info
  getHospitals, getHospital, createHospital, updateHospital, deleteHospital,
  
  // GDRG
  getGDRGTariffs, getGDRGByCode, createGDRGTariff, updateGDRGTariff, deleteGDRGTariff, lookupGDRGByAge,
  getDiagnosesByGDRG, linkDiagnosisToGDRG, unlinkDiagnosisFromGDRG, getGDRGByDiagnosis,
  linkProcedureToGDRG, unlinkProcedureFromGDRG, getProceduresByGDRG, getGDRGByProcedure,
  
  // Insurance
  getInsuranceProviders, getInsuranceProvider, createInsuranceProvider, updateInsuranceProvider, deleteInsuranceProvider,
  
  // Insurance Claims
  getInsuranceClaims, getNHISClaims, getPrivateInsuranceClaims, getCorporateClaims, getInsuranceClaim, getClaimByEncounterId,
  generateNHISClaim, generatePrivateInsuranceClaim, generateCorporateClaim, updateInsuranceClaim, updateClaimDraft, finalizeClaim,
  updateClaimStatus, generateClaimXML, generateClaimPrint, getFinalizedClaimsTotal,
  createClaimBatch, getClaimBatches, getClaimBatch, addClaimsToBatch, removeClaimsFromBatch,
  generateBatchXML, updateBatchStatus, deleteClaimBatch,
  
  // Corporate Accounts
  getCorporateAccounts, getCorporateAccount, createCorporateAccount, updateCorporateAccount, deactivateCorporateAccount, 
  getCorporateEmployees, addCorporateEmployee, updateCorporateEmployee, removeCorporateEmployee,
  
  // Patients
  getPatients, getPatient, createPatient, updatePatient, uploadPatientImage, uploadPatientImageBase64, deletePatient,
  
  // Encounters
  getEncounters, getEncounter, createEncounter, updateEncounter, deleteEncounter, updateEncounterStatus,
  
  // Worklist
  getVitalsWorklist, getMedicalWorklist, getLabWorklist, getPharmacyWorklist, getWorklistSummary,
  getScansWorklist, getTheatreWorklist, getMaternalWorklist,
  
  // Encounter Operations
  addDiagnosisToEncounter, removeDiagnosisFromEncounter,
  addLabTestToEncounter, updateLabTestInEncounter, removeLabTestFromEncounter,
  addProcedureToEncounter, updateProcedureStatus, removeProcedureFromEncounter,
  addMedicationToEncounter, updateMedicationStatus, removeMedicationFromEncounter,
  addScanToEncounter, updateScanStatus, removeScanFromEncounter,
  addServiceToEncounter, removeServiceFromEncounter, assignBedToEncounter,
  addVitalsToEncounter, getVitalsByEncounter, updateVitals, deleteVitals,
  addProgressNoteToEncounter, removeProgressNoteFromEncounter,
  getBillingBreakdown, calculateEncounterBill, getEncounterStats, validateNHISClaim, generateNHISClaimFromEncounter,
  
  // Bills
  getBills, getBill, createBill, updateBill, deleteBill, addPaymentToBill, generateBillFromEncounter,
  generateBillReport, getBillingBreakdownForBill, updateBillStatus, getBillStatistics,
  getBillLineItems, voidBillLineItem,
  
  // Waivers
  createWaiverRequest, getWaivers, getWaiverById, updateWaiverStatus, approveWaiver, rejectWaiver,
  getWaiversByBill, getWaiversByPatient, getWaiverStatistics, deleteWaiver, applyWaiverToBill,
  
  // Ward Charges
  getWardCharges, generateDailyWardCharges,
  
  // Admissions
  getAdmissions, getAdmission, createAdmission, updateAdmission, deleteAdmission,
  addDailyNotesToAdmission, getAdmissionStats, getAdmissionsByPatientId,
  
  // Wards & Beds
  getWards, getWard, createWard, updateWard, deleteWard, getAvailableBeds, getBedOccupancy,
  getBeds, getBed, createBed, updateBed, deleteBed,

  // Daycase/Observation
  getDaycasePatients, convertDaycaseToIPD,
  
  // Discharge
  dischargeFromEncounter,
  
  // Stock
  getStockItems, getStockItem, createStockItem, updateStockItem, deleteStockItem, getLowStockItems,
  getStockCategories, updateStockLevel, getStockItemTransactionHistory,
  getStockValueSummary, getExpiryReport, getMovementSummary, getUsageReport, getSupplierReport, getRequisitionSummary,
  getStockTransactions, getStockTransaction, createStockTransaction, updateStockTransaction,
  getStockMovementReport, getLowStockAlerts,
  
  // Purchase Invoices
  getPurchaseInvoices, getPurchaseInvoice, createPurchaseInvoice, updatePurchaseInvoice, deletePurchaseInvoice,
  
  // Requisitions
  getRequisitions, getRequisition, createRequisition, updateRequisition, deleteRequisition,
  updateRequisitionStatus, submitRequisition, approveRequisition, fulfillRequisition, cancelRequisition, approveRequisitionItems,
  
  // Referrals
  getReferrals, getReferralById, createOutgoingReferral, createIncomingReferral, updateReferralStatus,
  updateReferral, deleteReferral, getReferralsByPatient, getReferralStats,
  
  // Medical Services
  getDiagnoses, getDiagnosis, createDiagnosis, updateDiagnosis, deleteDiagnosis, searchDiagnoses,
  getMorbidityGroups, getDiagnosesByMorbidityGroup, getDiagnosisStats, bulkUpdateDiagnoses,
  getLabTestTemplates, getLabTestTemplate, createLabTestTemplate, updateLabTestTemplate, deleteLabTestTemplate,
  getLabTestCategories, getLabTestSubCategories, getSpecimenTypes, bulkUpdateLabTestTemplates,
  getProcedureTemplates, getProcedureTemplate, createProcedureTemplate, updateProcedureTemplate, deleteProcedureTemplate,
  getProcedureCategories, getProcedureDepartments, bulkUpdateProcedureTemplates,
  getScanTemplates, getScanTemplate, createScanTemplate, updateScanTemplate, deleteScanTemplate,
  getScanCategories, getScanBodyParts, getScanTypes, bulkUpdateScanTemplates,
  getServiceCatalog, getServiceCatalogItem, createServiceCatalogItem, updateServiceCatalogItem, deleteServiceCatalogItem,
  getServiceMetadata, getNHISReadinessReport, getServiceByNHISCode, getServicesByCategory,
  checkServiceCoverage, calculateServiceCost,
  
  // Consultation Types
  getConsultationTypes, getConsultationType, createConsultationType, updateConsultationType, deleteConsultationType,
  
  // Departments
  getDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment,
  getDepartmentStats, getDepartmentUsers, assignUserToDepartment, removeUserFromDepartment,
  assignDepartmentHead, bulkUpdateDepartments, getEligibleDepartmentHeads,
  
  // Appointments
  getAppointments, getAppointment, createAppointment, updateAppointment, deleteAppointment,
  updateAppointmentStatus, checkInAppointment, getAppointmentStatistics, getAvailableSlots,
  getClinicianSchedule, getAvailableClinicians, convertToAttendance,
  
  // Notifications
  getNotifications, createNotification, getNotification, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification,
  getNotificationStats, getUnreadCount, sendBulkNotification, sendRoleNotification, sendUserMessage,
  sendBulkUserMessages, getConversations, triggerLowStockCheck, triggerAppointmentReminders, cleanupOldNotifications,
  
  // Users
  getUsersByDepartment, updateUserDepartment,
  
  // Dashboard
  getDashboardStats, getAppointmentCalendar,
  
  // Backup
  createBackup, restoreBackup, getBackupList, downloadBackup, deleteBackup, getBackupStats,
  
  // Documents
  generateReceipt, generateBillStatement, generateReferralLetter, generateDischargeSummary,
  generateLabResult, generatePrescription, getDocumentsByEntity, downloadDocument, reprintDocument,
  getTemplates, createTemplate, updateTemplate, deleteTemplate,
  
  // Reports
  getGHSOPDReport, getGHSIPDReport, getGHSIDSRReport, getGHSMalariaReport, getGHSFormAReport,
  getMorbidityMortalityReport, getTopDiagnoses, getFamilyPlanningReport, getConsultingRoomRegister,
  getReportSubmissions, getReportSubmissionById, exportGHSReportToCSV,
  getFinancialReport, getInsuranceClaimsReport, getClinicalReport, getEncounterReport,
  getRevenueReport, getDemographicReport, exportReport, exportReportToCSV,
  getLabReport, getScanReport, getProcedureReport, getMedicationReport, getVitalsReport,
  getClinicalReports,
  
  // NHIS Reports
  getNhisExpiryReport, getNhisClaimsSummary, getNhisExpiringSoon,

    // Antenatal Records (updated names)
    getAntenatalRecords,
    getAntenatalRecordByEncounter,
    getActiveAntenatalRecordByPatient,
    getAntenatalRecordById,
    registerAntenatalBooking,
    updateAntenatalRecord,
    closeAntenatalRecord,
    deleteAntenatalRecord,
    
    // ANC Visits (updated names)
    recordANCVisit,
    getANCVisitsByAntenatalRecord,
    getANCVisitById,
    updateANCVisit,
    deleteANCVisit,
    
    // Delivery Records (updated names)
    getDeliveryRecords,
    getDeliveryRecord,
    recordDelivery,
    updateDeliveryRecord,
    deleteDeliveryRecord,
    
    // Postnatal Records (updated names)
    getPostnatalRecords,
    getPostnatalRecord,
    recordPostnatalVisit,
    updatePostnatalRecord,
    deletePostnatalRecord,
    
    // Statistics (updated names)
    getAntenatalStatistics,
    getDeliveryStatistics,
    getPostnatalStatistics,
    

  // Proforma Invoices
  getEstimates, getEstimate, createEstimate, updateEstimate, deleteEstimate, sendEstimate,
  acceptEstimate, rejectEstimate, convertEstimateToBill, getEstimateStatistics,
  getExpiringEstimates, getEstimatesByPatient, getEstimatesByCorporateAccount,
  
  // Communications
  sendSMS, getCommunicationChannels, getCommunicationLogs, getCommunicationTemplates,
  createCommunicationTemplate, sendAppointmentReminderSMS,
  
  // Family Planning
  getFPServices, getFPServiceById, createFPService, updateFPService, deleteFPService,
  getCurrentFPMethod, getFPHistory, getFPClientDetails, getFPStatistics, getFPMethodMix, getGHSFPReport,
  
  // Upload
  servePatientImages, serveScanImages, serveDocuments
};