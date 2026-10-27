// src/api/index.ts - COMPLETE CONSOLIDATED VERSION (FIXED)
import api from './api';
import type {
  Patient, PatientAllergy, InsuranceProvider,
  StockItem, StockTransaction, Ward, Bed, User,
  Appointment, ConsultationType, HospitalInfo, Seniority
} from '../types';
import type { NewbornRecord } from '../store/deliveryStore';

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
  receivedAtDepartmentId?: string;
  receivedAtDepartment?: {
    id: string;
    name: string;
  };
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
  requestingDepartmentId?: string | null;
  requestingWardId?: string | null;
  supplyingDepartmentId?: string | null;
  supplyingDepartment?: { id?: string; name: string } | null;
  departments?: { id?: string; name: string } | null;
  ward?: { id?: string; wardName: string } | null;
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
  attendanceId: string;
  lmp: string;
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
  gravida?: number;
  para?: number;
  weight?: number;
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
// PAGINATION HELPER
// ============================================
// The backend caps every list endpoint at 100 rows per request (patients,
// services, corporate accounts, diagnoses ...). Asking for `limit: 1000` does
// NOT return 1000 rows - it silently returns 100. Anything that needs "all"
// rows must therefore walk the pages. Use fetchAllPages for that.

export const API_PAGE_SIZE = 100;

const pageItems = (resp: any): any[] => {
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp?.data)) return resp.data;
  if (Array.isArray(resp?.data?.data)) return resp.data.data;
  if (Array.isArray(resp?.services)) return resp.services;
  if (Array.isArray(resp?.items)) return resp.items;
  return [];
};

/**
 * The backend sends paging info as `meta: { page, limit, total, totalPages }` at the top
 * of the response body (BaseController.paginated). Older code looked for `pagination`.
 * Accept either and return one normalised shape.
 */
const readPagination = (body: any) => {
  const m = body?.meta ?? body?.pagination ?? body?.data?.pagination ?? body?.data?.meta ?? null;
  if (!m || m.total === undefined) return null;
  return {
    page: Number(m.page) || 1,
    limit: Number(m.limit) || 0,
    total: Number(m.total) || 0,
    pages: Number(m.totalPages ?? m.pages) || 1,
  };
};

const pageTotal = (resp: any): number | null => {
  const meta = resp?.pagination ?? resp?.data?.pagination ?? resp?.meta ?? null;
  const total = Number(meta?.total);
  return Number.isFinite(total) && total > 0 ? total : null;
};

export interface FetchAllPagesOptions<T> {
  pageSize?: number;      // rows per request (default 100 = backend maximum)
  maxItems?: number;      // stop once this many rows are collected
  maxPages?: number;      // safety brake (default 500)
  concurrency?: number;   // parallel page requests once the total is known (default 4)
  /** Called after every batch with everything collected so far. */
  onPage?: (itemsSoFar: T[], total: number | null) => void;
}

/**
 * Fetch every page of a list endpoint and return all rows (de-duplicated by id).
 * `fetchPage` is any api function that accepts { page, limit, ...filters } and
 * returns an array or { data: [...], pagination: { total } }.
 */
export async function fetchAllPages<T = any>(
  fetchPage: (params: any) => Promise<any>,
  params: any = {},
  options: FetchAllPagesOptions<T> = {}
): Promise<T[]> {
  const pageSize = options.pageSize ?? API_PAGE_SIZE;
  const maxItems = options.maxItems ?? Number.POSITIVE_INFINITY;
  const maxPages = options.maxPages ?? 500;
  // Keep database-backed list pagination from flooding the API with parallel requests.
  const concurrency = Math.max(1, options.concurrency ?? 2);
  const { page: _page, limit: _limit, ...filters } = params || {};

  const seen = new Set<any>();
  const all: T[] = [];
  const add = (items: any[]) => {
    for (const item of items) {
      const key = item?.id ?? item?._id;
      if (key !== undefined) {
        if (seen.has(key)) continue;
        seen.add(key);
      }
      all.push(item);
    }
  };

  const first = await fetchPage({ ...filters, page: 1, limit: pageSize });
  const firstItems = pageItems(first);
  add(firstItems);
  const total = pageTotal(first);
  options.onPage?.(all.slice(), total);

  // A short first page normally means the table is smaller than one page, but it can
  // equally mean this endpoint caps the page size below what we asked for. Only treat
  // it as the end when the reported total agrees; otherwise the cap becomes the page
  // size we walk with. (Comparing rows against the requested limit is what used to
  // stop lists at the first page.)
  let effectivePageSize = pageSize;
  if (firstItems.length < pageSize) {
    if (firstItems.length === 0 || total === null || all.length >= total) return all.slice(0, maxItems);
    effectivePageSize = firstItems.length;
  }
  if (all.length >= maxItems) return all.slice(0, maxItems);

  if (total !== null) {
    // Total known: request the remaining pages a few at a time, keeping order.
    const totalPages = Math.min(Math.ceil(Math.min(total, maxItems) / effectivePageSize), maxPages);
    for (let start = 2; start <= totalPages; start += concurrency) {
      const before = all.length;
      const batch: Promise<any>[] = [];
      for (let page = start; page < start + concurrency && page <= totalPages; page++) {
        batch.push(fetchPage({ ...filters, page, limit: effectivePageSize }));
      }
      const responses = await Promise.all(batch);
      for (const response of responses) add(pageItems(response));
      options.onPage?.(all.slice(), total);
      // No new rows means this endpoint repeats itself; further pages cost requests for
      // nothing and would re-paint the same snapshot.
      if (all.length === before) break;
      if (all.length >= maxItems) break;
    }
  } else {
    // Total unknown: keep going until a short page comes back.
    for (let page = 2; page <= maxPages; page++) {
      const before = all.length;
      const items = pageItems(await fetchPage({ ...filters, page, limit: effectivePageSize }));
      add(items);
      options.onPage?.(all.slice(), null);
      // An endpoint that ignores `page` hands back the same rows every time; without
      // this the walk would run to the brake instead of stopping.
      if (all.length === before) break;
      if (items.length < effectivePageSize || all.length >= maxItems) break;
    }
  }

  return all.slice(0, maxItems);
}

/**
 * For endpoints whose callers read the raw response envelope ({ data: [...], summary, pagination }):
 * fetches every page and returns the first response with `data` replaced by all rows.
 */
async function fetchAllEnvelope(
  fetchPage: (params: any) => Promise<any>,
  filters: any = {},
  options: { maxItems?: number; concurrency?: number } = {},
): Promise<any> {
  let envelope: any = null;
  const rows = await fetchAllPages<any>(async (params) => {
    const resp = await fetchPage(params);
    if (!envelope) envelope = resp;
    return resp;
  }, filters, { maxItems: options.maxItems ?? 5000, concurrency: options.concurrency ?? 4 });
  const base = envelope ?? {};
  const inner = base?.data;
  // Shape A: { data: [...] }   Shape B: { data: { data: [...], pagination } }
  if (inner && !Array.isArray(inner) && Array.isArray(inner.data)) {
    return { ...base, data: { ...inner, data: rows, pagination: { ...(inner.pagination || {}), page: 1, limit: rows.length, total: rows.length, pages: 1 } } };
  }
  return { ...base, data: rows, pagination: { page: 1, limit: rows.length, total: rows.length, pages: 1 } };
}

/** True when the caller asked for more rows than one request can return. */
const wantsMoreThanOnePage = (filters?: any) => Number(filters?.limit) > API_PAGE_SIZE;

/** Page size the staff, roster and leave endpoints accept (their `parsePageSize` cap). */
const MAX_PAGE_SIZE_500 = 500;

/** Brake on the staff walk: a hospital with more named users than this is a data problem,
 *  not a list to render, and the register feeds pickers rather than a paged table. */
const MAX_STAFF_REGISTER_ROWS = 2500;

// ============================================
// GENERIC RESPONSE HANDLER
// ============================================

const extractListItems = <T>(response: any): T[] => {
  // ✅ Handle notification responses (MUST be FIRST)
  if (response?.data?.notifications && Array.isArray(response.data.notifications)) {
    return response.data.notifications as T[];
  }
  if (response?.notifications && Array.isArray(response.notifications)) {
    return response.notifications as T[];
  }

  // ✅ Handle BaseController paginated response: { success, data: { data: [], pagination: {} } }
  if (response?.success && response?.data?.data && Array.isArray(response.data.data)) {
    return response.data.data as T[];
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
  if (response?.purchaseInvoices && Array.isArray(response.purchaseInvoices)) return response.purchaseInvoices as T[];
  if (response?.invoices && Array.isArray(response.invoices)) return response.invoices as T[];

  // Remove the warning log for notification responses
  const isNotificationResponse = response?.data?.notifications || response?.notifications;
  if (!isNotificationResponse) {
    console.warn('Unexpected API response:', response);
  }

  return [] as T[];
};

/**
 * Returns the list rows as an array, and attaches the server's paging info as non-enumerable
 * `pagination` / `total` properties. Callers that walk pages (stock, requisitions, invoices ...)
 * read `response.pagination.total`; without it they believed the first page was everything and
 * lists stopped at the server's page size (100).
 */
const handleResponse = <T>(response: any): T[] => {
  const items = extractListItems<T>(response);
  const meta = readPagination(response);
  if (Array.isArray(items) && meta) {
    try {
      Object.defineProperty(items, 'pagination', {
        value: { ...meta, totalPages: meta.pages },
        enumerable: false, configurable: true, writable: true,
      });
      Object.defineProperty(items, 'total', { value: meta.total, enumerable: false, configurable: true, writable: true });
    } catch { /* frozen array: ignore */ }
  }
  return items;
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

// User management is mounted at /users; /auth only owns authentication/profile flows.
export const getUsers = () =>
  api.get('/users').then(r => handleResponse<User>(r.data));

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

const getAllUsersPage = (filters?: { role?: string; departmentId?: string; isActive?: boolean; search?: string; page?: number; limit?: number }) =>
  api.get('/users', { params: filters }).then(r => {
    const response = r.data;
    const users = Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response?.data?.data)
        ? response.data.data
        : Array.isArray(response)
          ? response
          : [];
    // Keep pagination metadata attached to the array so existing array consumers
    // remain compatible while userStore can expose the server's real page counts.
    const pagination = response?.meta
      ?? response?.pagination
      ?? response?.data?.pagination
      ?? response?.data?.meta
      ?? null;
    return Object.assign(users, { pagination });
  });

/**
 * The staff endpoint answers 50 rows per request by default and 500 at most. Asking it
 * for "the users" without a page therefore returned the first 50 people and the screen
 * presented them as the whole register, which also hid staff from the role, department
 * and shift pickers built on top of this list. A caller that names a page keeps
 * server-side paging; everyone else walks the pages, bounded by the brake below.
 */
export const getAllUsers = async (filters?: { role?: string; departmentId?: string; isActive?: boolean; search?: string; page?: number; limit?: number }) => {
  if (filters?.page) return getAllUsersPage(filters);
  const requested = Number(filters?.limit);
  return fetchAllPages<User>(getAllUsersPage, filters ?? {}, {
    pageSize: MAX_PAGE_SIZE_500,
    maxItems: Number.isFinite(requested) ? requested : MAX_STAFF_REGISTER_ROWS,
    concurrency: 2,
  });
};

export const getUserById = (userId: string) =>
  api.get(`/users/${userId}`).then(r => r.data?.data || r.data);

export const updateUser = (userId: string, data: any) =>
  api.put(`/users/${userId}`, data).then(r => r.data?.data || r.data);

export const deactivateUser = (userId: string) =>
  api.patch(`/users/${userId}/deactivate`).then(r => r.data?.data || r.data);

// An administrator setting a new password for a locked-out account. This is the
// reset path in a deployment with no mail server to send a link through.
export const adminResetUserPassword = (userId: string, newPassword: string) =>
  api.patch(`/users/${userId}/password`, { newPassword }).then(r => r.data?.data || r.data);

export const getUserProfile = () =>
  api.get('/auth/profile').then(r => r.data?.data || r.data);

export const updateUserProfile = (data: any) =>
  api.put('/auth/profile', data).then(r => r.data?.data || r.data);

// ✅ userId is injected server-side; the body carries the credentials.
export const changeUserPassword = (
  _userId: string | undefined,
  data: { currentPassword: string; newPassword: string },
) => api.post(`/auth/change-password`, data).then(r => r.data);

export const getCurrentUserPermissions = () =>
  api.get('/users/permissions').then(r => r.data);

// ──────────────────────────────────────────────
// SHIFT MANAGEMENT (via User module)
// ──────────────────────────────────────────────

const getShiftsPage = (filters?: { userId?: string; departmentId?: string; shiftDate?: string; fromDate?: string; toDate?: string; page?: number; limit?: number }) =>
  api.get('/users/shifts', { params: filters }).then(r => handleResponse<any>(r.data));

// The roster screen asks for a month of shifts across every department, which is far more
// than the 500-row page the endpoint serves. It used to take the first page and treat the
// truncated week as the whole schedule.
export const getShifts = async (filters?: { userId?: string; departmentId?: string; shiftDate?: string; fromDate?: string; toDate?: string; page?: number; limit?: number }) => {
  if (filters?.page || !wantsMoreThanOnePage(filters)) return getShiftsPage(filters);
  return fetchAllPages<any>(getShiftsPage, filters, { pageSize: MAX_PAGE_SIZE_500, maxItems: Number(filters!.limit), concurrency: 2 });
};

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

const getLeavesPage = (filters?: { userId?: string; departmentId?: string; status?: string; fromDate?: string; toDate?: string; page?: number; limit?: number }) =>
  api.get('/users/leaves', { params: filters }).then(r => handleResponse<any>(r.data));

// Same 500-row page as the roster: the leave register opened on one page and the approvals
// queue looked empty for anything older than the first slice.
export const getLeaves = async (filters?: { userId?: string; departmentId?: string; status?: string; fromDate?: string; toDate?: string; page?: number; limit?: number }) => {
  if (filters?.page || !wantsMoreThanOnePage(filters)) return getLeavesPage(filters);
  return fetchAllPages<any>(getLeavesPage, filters, { pageSize: MAX_PAGE_SIZE_500, maxItems: Number(filters!.limit), concurrency: 2 });
};

export const getLeaveById = (leaveId: string) =>
  api.get(`/users/leaves/${leaveId}`).then(r => r.data?.data || r.data);

export const createLeave = (data: { leaveType: 'annual' | 'sick' | 'maternity' | 'paternity' | 'emergency' | 'unpaid'; startDate: string; endDate: string; reason?: string }) =>
  api.post('/users/leaves', data).then(r => r.data?.data || r.data);

export const updateLeave = (leaveId: string, data: { status?: 'pending' | 'approved' | 'rejected' | 'cancelled'; reason?: string }) =>
  api.put(`/users/leaves/${leaveId}`, data).then(r => r.data?.data || r.data);

export const deleteLeave = (leaveId: string) =>
  api.delete(`/users/leaves/${leaveId}`).then(r => r.data);

// ──────────────────────────────────────────────
// LEAVE APPROVAL HELPERS
// ──────────────────────────────────────────────

export const approveLeave = (leaveId: string, reason?: string) =>
  updateLeave(leaveId, { status: 'approved', reason }).then(r => r.data?.data || r.data);

export const rejectLeave = (leaveId: string, reason: string) =>
  updateLeave(leaveId, { status: 'rejected', reason }).then(r => r.data?.data || r.data);

export const cancelLeave = (leaveId: string) =>
  updateLeave(leaveId, { status: 'cancelled' }).then(r => r.data?.data || r.data);


// ──────────────────────────────────────────────
// FULL PROFILE (User + HR combined)
// ──────────────────────────────────────────────

export const getFullProfile = (userId: string) =>
  api.get(`/users/${userId}/full-profile`).then(r => r.data?.data || r.data);

export const updateFullProfile = (userId: string, payload: { user?: any; hr?: any }) =>
  api.patch(`/users/${userId}/full-profile`, payload).then(r => r.data?.data || r.data);

// ──────────────────────────────────────────────
// PAYROLL
// ──────────────────────────────────────────────

export const getMyPayslips = () =>
  api.get('/users/me/payslips').then(r => r.data?.data || r.data);

export const getUserPayslips = (userId: string) =>
  api.get(`/users/${userId}/payslips`).then(r => r.data?.data || r.data);

export const getAllPayslips = (filters?: {
  month?: number;
  year?: number;
  userId?: string;
  isPaid?: boolean;
  page?: number;
  limit?: number;
}) =>
  api.get('/users/payslips/all', { params: filters }).then(r => {
    const body = r.data;
    return body?.data || body;
  });

export const generatePayslip = (userId: string, month: number, year: number) =>
  api.post(`/users/${userId}/payslips`, { month, year }).then(r => r.data?.data || r.data);

export const runPayroll = (month: number, year: number) =>
  api.post('/users/payslips/run-payroll', { month, year }).then(r => r.data?.data || r.data);

export const updatePayslip = (
  payslipId: string,
  data: { isPaid?: boolean; payslipUrl?: string | null; notes?: string | null },
) =>
  api.patch(`/users/payslips/${payslipId}`, data).then(r => r.data?.data || r.data);

export const getPayslipById = (payslipId: string) =>
  api.get(`/users/payslips/${payslipId}`).then(r => r.data?.data || r.data);

export const addPayslipLineItem = (
  payslipId: string,
  data: { type: 'earning' | 'deduction'; category: string; description?: string; amount: number; taxable?: boolean },
) =>
  api.post(`/users/payslips/${payslipId}/line-items`, data).then(r => r.data?.data || r.data);

export const updatePayslipLineItem = (
  payslipId: string,
  lineItemId: string,
  data: { category?: string; description?: string; amount?: number; taxable?: boolean },
) =>
  api.patch(`/users/payslips/${payslipId}/line-items/${lineItemId}`, data).then(r => r.data?.data || r.data);

export const deletePayslipLineItem = (payslipId: string, lineItemId: string) =>
  api.delete(`/users/payslips/${payslipId}/line-items/${lineItemId}`).then(r => r.data?.data || r.data);


// ──────────────────────────────────────────────
// DOCUMENTS
// ──────────────────────────────────────────────

// ──────────────────────────────────────────────
// STAFF DOCUMENTS
// ──────────────────────────────────────────────

export const getMyDocuments = () =>
  api.get('/users/me/documents').then(r => r.data?.data || r.data);

export const getUserDocuments = (userId: string) =>
  api.get(`/users/${userId}/documents`).then(r => r.data?.data || r.data);

export const getAllDocuments = () =>
  api.get('/users/documents/all').then(r => r.data?.data || r.data);

export const getDocumentById = (documentId: string) =>
  api.get(`/users/documents/${documentId}`).then(r => r.data?.data || r.data);

export const uploadUserDocument = (
  userId: string,
  data: { file: File; type: string; title: string; expiryDate?: string },
) => {
  const form = new FormData();
  form.append('file', data.file);
  form.append('type', data.type);
  form.append('title', data.title);
  if (data.expiryDate) form.append('expiryDate', data.expiryDate);

  return api.post(`/users/${userId}/documents`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data?.data || r.data);
};

export const updateDocument = (documentId: string, data: any) =>
  api.patch(`/users/documents/${documentId}`, data).then(r => r.data?.data || r.data);

export const verifyDocument = (documentId: string) =>
  api.post(`/users/documents/${documentId}/verify`).then(r => r.data?.data || r.data);

export const unverifyDocument = (documentId: string) =>
  api.post(`/users/documents/${documentId}/unverify`).then(r => r.data?.data || r.data);

export const deleteDocument = (documentId: string) =>
  api.delete(`/users/documents/${documentId}`).then(r => r.data);
// ──────────────────────────────────────────────
// GDRG TARIFFS
// ──────────────────────────────────────────────

export const getGDRGTariffs = async (filters?: { mdc?: string; isActive?: boolean; search?: string }) => {
  // BaseController.paginated() returns { success, data: [...], meta: { page, limit, total, totalPages } }.
  // Keep compatibility with older nested pagination response formats too.
  const limit = 100;
  const allTariffs: any[] = [];

  const unpack = (payload: any) => {
    const items = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.data?.data)
        ? payload.data.data
        : Array.isArray(payload?.tariffs)
          ? payload.tariffs
          : Array.isArray(payload)
            ? payload
            : [];

    const pagination = payload?.meta ?? payload?.pagination ??
      payload?.data?.pagination ?? payload?.data?.meta ?? {};
    const total = Number(pagination.total) || 0;
    const pageLimit = Number(pagination.limit) || limit;
    const totalPages = Number(pagination.totalPages ?? pagination.pages) ||
      (total > 0 ? Math.ceil(total / pageLimit) : 1);

    return { items, totalPages: Math.max(1, totalPages) };
  };

  try {
    const firstResponse = await api.get('/gdrg', {
      params: { ...filters, page: 1, limit },
    });
    const firstPage = unpack(firstResponse.data);
    allTariffs.push(...firstPage.items);

    // Fetch a few pages concurrently without flooding the API.
    for (let startPage = 2; startPage <= firstPage.totalPages; startPage += 5) {
      const endPage = Math.min(startPage + 4, firstPage.totalPages);
      const responses = await Promise.all(
        Array.from({ length: endPage - startPage + 1 }, (_, index) =>
          api.get('/gdrg', {
            params: { ...filters, page: startPage + index, limit },
          })
        )
      );
      for (const response of responses) {
        allTariffs.push(...unpack(response.data).items);
      }
    }

    // Protect consumers from duplicate rows if a proxy or stale page returns overlap.
    const seen = new Set<string>();
    return allTariffs.filter((tariff) => {
      const key = String(tariff?.id ?? tariff?.gdrgCode ?? '');
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch (error) {
    console.error('Failed to load GDRG tariffs:', error);
    if (allTariffs.length > 0) return allTariffs;
    throw error;
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

export const toggleInsuranceProviderStatus = (id: string) =>
  api.patch(`/insurance-providers/${id}/toggle-status`).then(r => r.data);

export const deleteInsuranceProvider = (id: string) =>
  api.delete(`/insurance-providers/${id}`).then(r => r.data);

// ──────────────────────────────────────────────
// CORPORATE ACCOUNTS (UNIFIED - NO DUPLICATES)
// ──────────────────────────────────────────────

// ✅ SINGLE DEFINITION - Remove the duplicate at line ~420
const getCorporateAccountsPage = (filters?: any) =>
  api.get('/corporate', { params: filters }).then(r => handleResponse<any>(r.data));

// limit > 100 walks all pages (backend maximum is 100 per request)
export const getCorporateAccounts = (filters?: any) =>
  wantsMoreThanOnePage(filters)
    ? fetchAllPages<any>(getCorporateAccountsPage, filters, { maxItems: Number(filters.limit) })
    : getCorporateAccountsPage(filters);

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
// INSURANCE CLAIMS — GENERAL
// ──────────────────────────────────────────────

export const getInsuranceClaims = (filters?: any) =>
  api.get('/insurance-claims', { params: filters }).then(r => r.data);

export const getInsuranceClaim = (id: string) =>
  api.get(`/insurance-claims/${id}`).then(r => r.data);

export const getClaimByEncounterId = (encounterId: string) =>
  api.get(`/insurance-claims/attendance/${encounterId}`).then(r => r.data);

export const updateClaimDraft = (claimId: string, data: any) =>
  api.patch(`/insurance-claims/${claimId}/draft`, data).then(r => r.data);
export const replaceClaimItems = (claimId: string, items: any[]) =>
  api.put(`/insurance-claims/${claimId}/items`, { items }).then(r => r.data);

// Alias — same endpoint as updateClaimDraft (drafts only)
export const updateInsuranceClaim = updateClaimDraft;

export const finalizeClaim = (claimId: string) =>
  api.patch(`/insurance-claims/${claimId}/finalize`).then(r => r.data);

// ❌ REMOVED: updateClaimStatus, getFinalizedClaimsTotal
//    The backend no longer has those endpoints (claim lifecycle = draft → finalized).

// ──────────────────────────────────────────────
// INSURANCE CLAIMS — NHIS / PRIVATE / CORPORATE
// ──────────────────────────────────────────────

export const generateNHISClaim = (attendanceId: string) =>
  api.post('/insurance-claims/nhis/generate', { attendanceId }).then(r => r.data);

export const getNHISClaims = (filters?: any) =>
  api.get('/insurance-claims/nhis', { params: filters }).then(r => r.data);

export const generatePrivateInsuranceClaim = (attendanceId: string) =>
  api.post('/insurance-claims/private/generate', { attendanceId }).then(r => r.data);

export const getPrivateInsuranceClaims = (filters?: any) =>
  api.get('/insurance-claims/private', { params: filters }).then(r => r.data);

export const generateCorporateClaim = (attendanceId: string) =>
  api.post('/insurance-claims/corporate/generate', { attendanceId }).then(r => r.data);

export const getCorporateClaims = (filters?: any) =>
  api.get('/insurance-claims/corporate', { params: filters }).then(r => r.data);

// ──────────────────────────────────────────────
// CLAIM SUMMARY (replaces getFinalizedClaimsTotal)
// ──────────────────────────────────────────────

export const getInsuranceClaimsTracking = (filters?: { page?: number; limit?: number; search?: string; insuranceType?: string }) =>
  api.get('/insurance-claims/tracking', { params: filters }).then(r => r.data);

export const recordInsuranceClaimTrackingEvent = (claimId: string, data: {
  eventType: 'submission' | 'adjudication' | 'payment';
  status?: string;
  submissionDate?: string;
  payerReference?: string;
  amount?: number;
  paymentReference?: string;
  paymentMethod?: string;
  notes?: string;
}) => api.post(`/insurance-claims/${claimId}/tracking-events`, data).then(r => r.data);

export const getClaimsSummary = (insuranceType?: 'nhis' | 'private' | 'corporate') =>
  api.get('/insurance-claims/summary', { params: { insuranceType } }).then(r => r.data);

// ──────────────────────────────────────────────
// CLAIM XML + PRINT (single claim — open in new tab)
// ──────────────────────────────────────────────

const downloadAuthenticatedFile = async (path: string, fallbackFilename: string): Promise<void> => {
  const response = await api.get(path, { responseType: 'blob' });
  const disposition = String(response.headers?.['content-disposition'] ?? '');
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || fallbackFilename;
  const blob = response.data instanceof Blob
    ? response.data
    : new Blob([response.data], { type: String(response.headers?.['content-type'] || 'application/octet-stream') });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

const openAuthenticatedPrintView = async (path: string): Promise<void> => {
  // Open synchronously in the user gesture so browsers do not block the window
  // while the authenticated request is in flight.
  const printWindow = window.open('about:blank', '_blank');
  if (!printWindow) throw new Error('The print window was blocked. Allow pop-ups and try again.');
  try {
    const response = await api.get(path, { responseType: 'text' });
    printWindow.document.open();
    printWindow.document.write(String(response.data ?? ''));
    printWindow.document.close();
  } catch (error) {
    printWindow.close();
    throw error;
  }
};

/** Download a single NHIS claim as XML using the authenticated API client. */
export const downloadClaimXml = (claimId: string): Promise<void> =>
  downloadAuthenticatedFile(`/insurance-claims/${claimId}/xml`, `claim-${claimId}.xml`);

/** Open a print-ready claim view using the authenticated API client. */
export const generateClaimPrint = (claimId: string): Promise<void> =>
  openAuthenticatedPrintView(`/insurance-claims/${claimId}/print`);

/** Same as generateClaimPrint — kept for backward-compat with older call sites. */
export const generateClaimXML = (claimId: string): Promise<void> => downloadClaimXml(claimId);


// ──────────────────────────────────────────────
// CLAIM BATCHES
// ──────────────────────────────────────────────
// NOTE: The batch is built from finalized claims for a (type, year, month,
// provider/corporate account). Claim IDs are NOT passed in — the backend
// selects them. Once created, the batch is `generated`; it can be
// `finalized` or `deleted`. There is no manual "add/remove claims" API.

export interface GenerateClaimBatchInput {
  insuranceType: 'nhis' | 'private' | 'corporate';
  periodYear: number;
  periodMonth: number;         // 1–12
  insuranceProviderId?: string;
  corporateAccountId?: string;
  description?: string;
}

export const generateClaimBatch = (data: GenerateClaimBatchInput) =>
  api.post('/insurance-claims/batches/generate', data).then(r => r.data);

export const getClaimBatches = (filters?: any) =>
  api.get('/insurance-claims/batches', { params: filters }).then(r => r.data);

export const getClaimBatch = (id: string) =>
  api.get(`/insurance-claims/batches/${id}`).then(r => r.data);

export const finalizeClaimBatch = (batchId: string) =>
  api.patch(`/insurance-claims/batches/${batchId}/finalize`).then(r => r.data);

export const deleteClaimBatch = (batchId: string) =>
  api.delete(`/insurance-claims/batches/${batchId}`).then(r => r.data);

/** NHIS only — download the batch XML using the authenticated API client. */
export const downloadBatchXml = (batchId: string): Promise<void> =>
  downloadAuthenticatedFile(`/insurance-claims/batches/${batchId}/xml`, `claim-batch-${batchId}.xml`);

/** Batch summary print (any type) — open the authenticated print-ready HTML view. */
export const printClaimBatch = (batchId: string): Promise<void> =>
  openAuthenticatedPrintView(`/insurance-claims/batches/${batchId}/print`);

// ──────────────────────────────────────────────
// Removed (backend no longer exposes them):
//   createClaimBatch(claimIds, description, insuranceType)
//   addClaimsToBatch(batchId, claimIds)
//   removeClaimsFromBatch(batchId, claimIds)
//   generateBatchXML(batchId)
//   updateBatchStatus(batchId, status)
// ──────────────────────────────────────────────

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

const getPatientsPage = (filters?: any) =>
  api.get('/patients', { params: filters }).then(r => {
    const patients = handleResponse<Patient>(r.data);
    const mapped = patients.map((patient: any) => ({
      ...patient,
      dateOfBirth: patient.dateOfBirth && patient.dateOfBirth.includes('T')
        ? convertISODateToInputFormat(patient.dateOfBirth)
        : patient.dateOfBirth
    }));
    // Keep the server's paging info (total etc.) available to callers.
    return Object.assign(mapped, { pagination: readPagination(r.data) });
  });

// limit > 100 walks all pages (backend maximum is 100 per request)
export const getPatients = async (filters?: any) => {
  if (!wantsMoreThanOnePage(filters)) return getPatientsPage(filters);
  const items = await fetchAllPages<any>(getPatientsPage, filters, { maxItems: Number(filters.limit) });
  return Object.assign(items, {
    pagination: { page: 1, limit: items.length, total: items.length, pages: 1 }
  });
};

// Patient lists omit EMR relations, so clinical screens read allergies separately.
export const getPatientAllergies = (patientId: string) =>
  api.get(`/patients/${patientId}/allergies`).then(r => {
    const payload = r.data?.data ?? r.data;
    return (Array.isArray(payload) ? payload : []) as PatientAllergy[];
  });

export const createPatient = (data: any) => {
  // FormData must be sent intact: spreading it into an object drops its entries.
  // Let Axios set the multipart boundary automatically.
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    return api.post('/patients', data).then(r => r.data);
  }

  const processedData = { ...(data || {}) };
  if (typeof processedData.dateOfBirth === 'string' && processedData.dateOfBirth.includes('T')) {
    processedData.dateOfBirth = processedData.dateOfBirth.split('T')[0];
  }
  return api.post('/patients', processedData).then(r => r.data);
};

export const updatePatient = (id: string, data: any) => {
  if (!id || id === 'undefined' || id === 'null') {
    return Promise.reject(new Error('Valid Patient ID is required'));
  }

  // Preserve multipart payloads so uploaded fields/files reach the backend.
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    return api.put(`/patients/${id}`, data).then(r => r.data);
  }

  const processedData = { ...(data || {}) };
  if (typeof processedData.dateOfBirth === 'string' && processedData.dateOfBirth.includes('T')) {
    processedData.dateOfBirth = processedData.dateOfBirth.split('T')[0];
  }
  return api.put(`/patients/${id}`, processedData).then(r => r.data);
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

const getEncountersPage = (filters?: any) =>
  api.get('/encounters', { params: filters }).then(r => {
    const encounters = handleResponse<any>(r.data);
    return {
      data: encounters,
      encounters: encounters,
      pagination: readPagination(r.data)
    };
  });

// limit > 100 walks all pages (backend maximum is 100 per request)
export const getEncounters = async (filters?: any): Promise<any> => {
  if (!wantsMoreThanOnePage(filters)) return getEncountersPage(filters);
  const items = await fetchAllPages<any>(getEncountersPage, filters, { maxItems: Number(filters.limit) });
  return {
    data: items,
    encounters: items,
    pagination: { page: 1, limit: items.length, total: items.length, pages: 1 }
  };
};

export const getEncounter = (id: string) => {
  if (!id || id === 'undefined' || id === 'null') {
    return Promise.reject(new Error('Valid Encounter ID is required'));
  }
  return api.get(`/encounters/${id}`).then(r => {
    const attendance = r.data?.data || r.data;
    return { ...attendance, _id: attendance.id || attendance._id };
  });
};

export const createEncounter = (data: any) =>
  api.post('/encounters', data).then(r => {
    const attendance = r.data?.data || r.data;
    return { ...attendance, _id: attendance.id || attendance._id };
  });

export const updateEncounter = (id: string, data: any) => {
  if (!id || id === 'undefined' || id === 'null') {
    return Promise.reject(new Error('Valid Encounter ID is required'));
  }
  return api.put(`/encounters/${id}`, data).then(r => {
    const attendance = r.data?.data || r.data;
    return { ...attendance, _id: attendance.id || attendance._id };
  });
};

export const finalizeEncounterClinicalRecord = (id: string) => {
  if (!id || id === 'undefined' || id === 'null') {
    return Promise.reject(new Error('Valid Encounter ID is required'));
  }
  return api.post(`/encounters/${id}/finalize-clinical`).then(r => {
    const attendance = r.data?.data || r.data;
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
  return api.put(`/encounters/${id}/status`, data).then(r => {
    const attendance = r.data?.data || r.data;
    return { ...attendance, _id: attendance.id || attendance._id };
  });
};


export const referFromEncounter = (
  encounterId: string,
  data: {
    referredToFacility: string;
    referralReason: string;
    referredToDoctor?: string;
    referredToDepartment?: string;
    referralNotes?: string;
    urgency?: 'routine' | 'urgent' | 'stat';
    referralDate?: string;
  },
) =>
  api.post(`/encounters/${encounterId}/refer`, data).then(r => r.data?.data ?? r.data);

export const abscondFromEncounter = (
  encounterId: string,
  data: { notes?: string; abscondDate?: string } = {},
) =>
  api.post(`/encounters/${encounterId}/abscond`, data).then(r => r.data?.data ?? r.data);

export const completeEncounter = (encounterId: string) =>
  api.post(`/encounters/${encounterId}/complete`).then(r => r.data?.data ?? r.data);


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
  data: { quantity: number; batchNumber?: string; expiryDate?: string }
) => {
  // Dispensing has its own pharmacist-authorized route; the backend derives
  // the dispensing user and records the stock transaction atomically.
  const response = await api.put(`/encounters/${encounterId}/medications/${medicationId}/dispense`, {
    quantity: data.quantity,
    batchNumber: data.batchNumber,
    expiryDate: data.expiryDate
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

/** Add several services to one encounter in a single request. */
export const addServicesToEncounter = async (
  encounterId: string,
  items: { serviceCatalogId: string; quantity?: number; notes?: string }[]
) => {
  const response = await api.post(`/encounters/${encounterId}/services/bulk`, { items });
  return response.data;
};

export const removeServiceFromEncounter = async (encounterId: string, serviceId: string) => {
  const response = await api.delete(`/encounters/${encounterId}/services/${serviceId}`);
  return response.data;
};


// Consumable Operations (non-medication stock used during the visit)
export const recordEncounterConsumableUse = async (
  encounterId: string,
  data: { stockItemId: string; quantity: number; notes?: string }
) => {
  const response = await api.post(`/encounters/${encounterId}/consumables`, data);
  return response.data?.data ?? response.data;
};

export const updateEncounterConsumableUse = async (
  encounterId: string,
  consumableUseId: string,
  data: { stockItemId?: string; quantity?: number; notes?: string }
) => {
  const response = await api.patch(
    `/encounters/${encounterId}/consumables/${consumableUseId}`,
    data
  );
  return response.data?.data ?? response.data;
};

export const removeEncounterConsumableUse = async (
  encounterId: string,
  consumableUseId: string
) => {
  const response = await api.delete(`/encounters/${encounterId}/consumables/${consumableUseId}`);
  return response.data;
};

export const getEncounterConsumables = async (encounterId: string) => {
  const response = await api.get(`/encounters/${encounterId}/consumables`);
  return response.data?.data ?? response.data ?? [];
};

/** Delete a consumable use (restores stock server-side) — used by DispensePatient.tsx */
export const deleteEncounterConsumableUse = async (
  encounterId: string,
  consumableUseId: string
) => {
  const response = await api.delete(
    `/encounters/${encounterId}/consumables/${consumableUseId}`
  );
  return response.data;
};

export const getEncounterConsumableUses = async (encounterId: string) => {
  const response = await api.get(`/encounters/${encounterId}/consumables`);
  return response.data?.data ?? response.data ?? [];
};

export const getEncounterConsumableUse = getEncounterConsumableUses;


// Vitals
export const addVitalsToEncounter = async (encounterId: string, data: any) => {
  const response = await api.post(`/encounters/${encounterId}/vitals`, data);
  return response.data;
};

// api/index.ts - Make sure this is correct

/** Latest vitals reading for many encounters in one request (chunks of 100 ids). */
export const getLatestVitals = async (encounterIds: string[]): Promise<any[]> => {
  const out: any[] = [];
  for (let i = 0; i < encounterIds.length; i += 100) {
    const chunk = encounterIds.slice(i, i + 100);
    const response = await api.get('/encounters/vitals/latest', { params: { ids: chunk.join(',') } });
    const rows = response.data?.data ?? response.data;
    if (Array.isArray(rows)) out.push(...rows);
  }
  return out;
};

/** Every recorded reading for many encounters in one request (chunks of 100 ids). */
export const getVitalsForEncounters = async (encounterIds: string[]): Promise<any[]> => {
  const out: any[] = [];
  for (let i = 0; i < encounterIds.length; i += 100) {
    const chunk = encounterIds.slice(i, i + 100);
    const response = await api.get('/encounters/vitals/batch', { params: { ids: chunk.join(',') } });
    const rows = response.data?.data ?? response.data;
    if (Array.isArray(rows)) out.push(...rows);
  }
  return out;
};

export const getVitalsByEncounter = async (encounterId: string) => {
  try {
    const response = await api.get(`/encounters/${encounterId}/vitals`);

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

// Billing Operations
// Billing breakdown is bill-scoped; the encounter-scoped endpoint is not mounted.
export const getBillingBreakdown = (billId: string) =>
  api.get(`/bills/${billId}/breakdown`).then(r => r.data?.data || r.data);

// Synchronize billable clinical source records through the mounted billing endpoint.

export const calculateEncounterBill = async (encounterId: string) => {
  const response = await api.post(`/bills/generate/${encounterId}`);
  return response.data;
};

export const getEncounterStats = async (filters?: any) => {
  const params = new URLSearchParams();
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  const response = await api.get(`/encounters/stats${params.toString() ? `?${params}` : ''}`);
  return response.data;
};

// ──────────────────────────────────────────────
// BILLS & PAYMENTS
// ──────────────────────────────────────────────

// The API lowercases Prisma relation keys (Attendance → attendance), while the shared
// Bill type and the billing screens read the relation names. Restore them here so every
// bill consumer sees one shape; the camelCase copies are kept for screens using those.
const BILL_RELATION_ALIASES: Record<string, string> = {
  Attendance: 'attendance',
  BillLineItem: 'billLineItem',
  Patient: 'patient',
  Payment: 'payment',
  InsuranceProvider: 'insuranceProvider',
  CorporateAccount: 'corporateAccount',
  Admission: 'admission',
};

const withBillRelations = (bill: any) => {
  if (!bill || typeof bill !== 'object') return bill;
  const out: any = { ...bill };
  for (const [relation, camel] of Object.entries(BILL_RELATION_ALIASES)) {
    if (out[relation] === undefined && out[camel] !== undefined) out[relation] = out[camel];
  }
  return out;
};

const getBillsPage = (filters?: any) => {
  // Cache-bust list reads while preserving the server's pagination contract.
  const params = { ...filters, _t: Date.now() };

  return api.get('/bills', { params }).then(r => {
    const body = r.data;
    // BaseController.paginated returns { success, data: Bill[], meta: { page, limit, total, totalPages } }.
    const rawBills: any[] = Array.isArray(body)
      ? body
      : Array.isArray(body?.data)
        ? body.data
        : Array.isArray(body?.bills)
          ? body.bills
          : Array.isArray(body?.data?.data)
            ? body.data.data
            : [];
    const bills = rawBills.map(withBillRelations);
    const pagination = readPagination(body);
    if (pagination) {
      Object.defineProperty(bills, 'pagination', {
        value: { ...pagination, totalPages: pagination.pages },
        enumerable: false,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(bills, 'total', {
        value: pagination.total,
        enumerable: false,
        configurable: true,
        writable: true,
      });
    }
    if (!Array.isArray(body) && !Array.isArray(body?.data) && !Array.isArray(body?.bills) && !Array.isArray(body?.data?.data)) {
      console.warn('Unexpected bills API structure:', body);
    }
    return bills;
  });
};

// limit > 100 walks all pages (backend maximum is 100 per request)
export const getBills = async (filters?: any) => {
  if (!wantsMoreThanOnePage(filters)) return getBillsPage(filters);
  const items = await fetchAllPages<any>(getBillsPage, filters, { maxItems: Number(filters.limit) });
  // fetchAllPages returns a plain array; attach a consistent pagination shape for stores.
  return Object.assign(items, {
    pagination: { page: 1, limit: items.length, total: items.length, pages: 1, totalPages: 1 },
    total: items.length,
  });
};

export const getBill = (id: string) => {
  // ✅ Also add cache-busting for single bill
  return api.get(`/bills/${id}`, {
    params: { _t: Date.now() }
  }).then(r => {
    const body = r.data;
    if (body?.data && typeof body.data === 'object' && !Array.isArray(body.data)) {
      return { ...body, data: withBillRelations(body.data) };
    }
    return withBillRelations(body);
  });
};

export const createBill = (data: any) =>
  api.post('/bills', data).then(r => withBillRelations(r.data?.data || r.data));

export const updateBill = (id: string, data: any) =>
  api.put(`/bills/${id}`, data).then(r => withBillRelations(r.data?.data || r.data));

export const deleteBill = (id: string) =>
  api.delete(`/bills/${id}`).then(r => r.data);

export const addPaymentToBill = (billId: string, data: any) =>
  api.post(`/bills/${billId}/payment`, data).then(r => r.data);

export const generateBillFromEncounter = (encounterId: string) =>
  api.post(`/bills/generate/${encounterId}`).then(r => {
    const body = r.data;
    if (body?.data && typeof body.data === 'object' && !Array.isArray(body.data)) {
      return { ...body, data: withBillRelations(body.data) };
    }
    return body;
  });

export const generateBillReport = (billId: string) =>
  api.get(`/bills/${billId}/report`).then(r => r.data?.data || r.data);

export const getBillingBreakdownForBill = (billId: string) =>
  api.get(`/bills/${billId}/breakdown`).then(r => r.data?.data || r.data);

export const updateBillStatus = (billId: string, data: any) =>
  api.put(`/billing/invoices/${billId}`, data).then(r => r.data?.data || r.data);

export const getBillStatistics = (filters?: any) =>
  api.get('/bills/statistics', { params: filters }).then(r => r.data?.data || r.data);

// Bill Line Items
export const getBillLineItems = (billId: string) =>
  api.get(`/bills/${billId}/line-items`).then(r => r.data?.data || r.data);

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
}) => {
  // The backend exposes /approve and /reject (there is no /status route)
  const status = String(data.status).toLowerCase();
  if (status === 'approved') return api.post(`/waivers/${id}/approve`, { amountApproved: data.amountApproved }).then(r => r.data);
  if (status === 'rejected') return api.post(`/waivers/${id}/reject`, { rejectionReason: data.rejectionReason }).then(r => r.data);
  return api.put(`/waivers/${id}`, data).then(r => r.data);
};

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
  api.post(`/bills/${billId}/apply-waiver`, { waiverId }).then(r => r.data?.data || r.data);


// ──────────────────────────────────────────────
// BILLING COLLECTIONS REPORT
// ──────────────────────────────────────────────

export interface BillingCollectionItem {
  id: string;
  description: string;
  serviceCategory: string;
  quantity: number;
  amount: number;
}

export interface BillingCollectionPayment {
  id: string;
  reference: string;
  transactionDate: string;
  amount: number;
  paymentMethod: string;
  bill: {
    billNumber: string;
    // A counter ticket pays without a patient folder, so the report names the payer
    // rather than assuming a registered patient. Mirrors BillingService.getCollections.
    customer: {
      name: string;
      reference: string | null;
      kind: 'patient' | 'walk_in';
    };
  };
  collector: {
    id: string;
    fullName: string;
    username: string;
  };
  items: BillingCollectionItem[];
}

export interface BillingCollectionsReport {
  totalAmount: number;
  paymentCount: number;
  payments: BillingCollectionPayment[];
}

export const getBillingInvoice = (billId: string) =>
  api.get(`/billing/invoices/${billId}`).then(r => r.data?.data ?? r.data);

export const getBillingCollections = async (params?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<BillingCollectionsReport> => {
  const response = await api.get('/billing/collections', { params });
  return response.data?.data ?? response.data;
};

/**
 * One charged line of a bill — the row the money reports are built from. A line remembers who
 * it was raised for only through its bill, and a counter ticket's customer is not a patient.
 */
export interface BillingRevenueLine {
  id: string;
  chargedAt: string;
  description: string;
  serviceType: string;
  serviceCategory: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  vatAmount: number;
  lineTotal: number;
  insuranceCovered: number;
  patientPayable: number;
  pricingBasis: string;
  bill: {
    id: string;
    billNumber: string;
    billDate: string;
    status: string;
    paymentMode: string;
    customer: {
      name: string;
      reference: string | null;
      kind: 'patient' | 'walk_in';
    };
  };
}

export interface BillingRevenueLinesReport {
  totalLines: number;
  totalAmount: number;
  patientPayableAmount: number;
  insuranceCoveredAmount: number;
  lines: BillingRevenueLine[];
  limit: number;
  capped: boolean;
}

export const getBillingRevenueLines = async (params: {
  dateFrom: string;
  dateTo: string;
  paymentMode?: string;
  billStatus?: string;
  serviceType?: string;
  search?: string;
  limit?: number;
}): Promise<BillingRevenueLinesReport> => {
  const response = await api.get('/billing/line-items', { params });
  return response.data?.data ?? response.data;
};

// ============================================
// ADMISSIONS API ENDPOINTS
// ============================================

// GET all formal admissions (IPD only)
const getAdmissionsPage = (filters?: {
  status?: 'active' | 'discharged';
  wardId?: string;
  admissionType?: string;
  excludeDetention?: boolean;
  page?: number;
  limit?: number;
}) =>
  api.get('/encounters/admissions', { params: filters }).then(r => {
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

// limit > 100 walks all pages (backend maximum is 100 per request)
export const getAdmissions = async (filters?: {
  status?: 'active' | 'discharged';
  wardId?: string;
  admissionType?: string;
  excludeDetention?: boolean;
  page?: number;
  limit?: number;
}) => {
  if (!wantsMoreThanOnePage(filters)) return getAdmissionsPage(filters);
  return fetchAllPages<any>(getAdmissionsPage, filters, { maxItems: Number(filters!.limit), concurrency: 2 });
};

// GET single admission by ID
export const getAdmission = (id: string) =>
  api.get(`/encounters/admissions/${id}`).then(r => r.data?.data || r.data);

// CREATE formal admission from IPD encounter
export const createAdmission = (data: {
  attendanceId: string;
  bedId?: string;
  wardId?: string;
  admissionNotes?: string;
  admissionType?: 'emergency' | 'elective' | 'transfer' | 'detention_observation' | 'antenatal_observation' | 'delivery' | 'postpartum_observation';
  admissionSource?: 'home' | 'referral' | 'another_facility' | 'opd' | 'emergency' | 'antenatal' | 'delivery';
  admissionDate?: string;
}) =>
  api.post('/encounters/admissions', data).then(r => r.data?.data || r.data);

// UPDATE admission (discharge only typically)
export const updateAdmission = (id: string, data: {
  dischargeDate?: string;
  dischargeStatus?: 'home' | 'transfer' | 'expired' | 'against_medical_advice';
  dailyNotes?: any;
  dischargeSummary?: string;
}) =>
  api.put(`/encounters/admissions/${id}`, data).then(r => r.data?.data || r.data);

// Cancel an admission entered in error. The backend retains the record and audit history.
export const cancelAdmission = (id: string, reason: string) =>
  api.post(`/encounters/admissions/${id}/cancel`, { reason }).then(r => r.data);

// Backward-compatible store/API name; this now performs audited cancellation, never hard deletion.
export const deleteAdmission = (id: string, reason: string) => cancelAdmission(id, reason);

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
  api.get('/encounters/admissions/stats').then(r => r.data?.data || r.data);

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
const getDetentionPatientsPage = (filters?: {
  status?: 'active' | 'discharged';
  wardId?: string;
  observationHours?: number;
  readyForDecision?: boolean;
  page?: number;
  limit?: number;
}) =>
  api.get('/encounters/detention', { params: filters }).then(r => {
    // Return the full response with data and summary
    return r.data;
  });

// With no page/limit given, loads EVERY page (100 per request): the "currently admitted"
// list must never be silently cut to the backend default of 10 rows.
export const getDetentionPatients = async (filters?: {
  status?: 'active' | 'discharged';
  wardId?: string;
  observationHours?: number;
  readyForDecision?: boolean;
  page?: number;
  limit?: number;
}) => {
  if (filters?.page !== undefined || filters?.limit !== undefined) return getDetentionPatientsPage(filters);
  return fetchAllEnvelope(getDetentionPatientsPage, filters);
};

// GET formal IPD patients (excluding detention)
const getFormalIPDPatientsPage = (filters?: {
  status?: 'active' | 'discharged';
  wardId?: string;
  page?: number;
  limit?: number;
}) =>
  api.get('/encounters/formal-ipd', { params: filters }).then(r => {
    return r.data;
  });

// With no page/limit given, loads EVERY page (100 per request).
export const getFormalIPDPatients = async (filters?: {
  status?: 'active' | 'discharged';
  wardId?: string;
  page?: number;
  limit?: number;
}) => {
  if (filters?.page !== undefined || filters?.limit !== undefined) return getFormalIPDPatientsPage(filters);
  return fetchAllEnvelope(getFormalIPDPatientsPage, filters);
};

// Convert detention/observation to formal IPD
export const convertDetentionToIPD = (encounterId: string, data: {
  admissionType: 'elective' | 'emergency' | 'transfer';
  clinicalNotes?: string;
  decisionReason?: string;
}) =>
  api.post(`/encounters/${encounterId}/convert-detention-to-ipd`, data).then(r => r.data);


// ──────────────────────────────────────────────
// WARDS & BEDS
// ──────────────────────────────────────────────

export const getWardCharges = (encounterId: string, params?: any) =>
  api.get(`/encounters/${encounterId}/ward-charges`, { params }).then(r => r.data);

export const generateDailyWardCharges = (date?: string) =>
  api.post('/encounters/ward-charges/generate', { date }).then(r => r.data);

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

const getBedsPage = (filters?: any) =>
  api.get('/beds', { params: filters }).then(r => {
    const rows = handleResponse<Bed>(r.data);
    return Object.assign(rows, { pagination: readPagination(r.data) });
  });

// Default reads feed ward/admission pickers and need all beds; explicit paging
// remains available for screens that intentionally request one page.

export const getBeds = async (filters?: any) => {
  if (filters?.page || filters?.limit) return getBedsPage(filters);
  const rows = await fetchAllPages<Bed>(getBedsPage, filters || {}, {
    pageSize: API_PAGE_SIZE, maxItems: 5000, concurrency: 3,
  });
  return Object.assign(rows, {
    pagination: { page: 1, limit: rows.length, total: rows.length, pages: 1, totalPages: 1 },
  });
};

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
  api.get(`/purchase-invoices/${id}`).then(r => r.data?.data || r.data);

export const createPurchaseInvoice = (data: any) =>
  api.post('/purchase-invoices', data).then(r => r.data?.data || r.data);

export const updatePurchaseInvoice = (id: string, data: any) =>
  api.put(`/purchase-invoices/${id}`, data).then(r => r.data?.data || r.data);

export const deletePurchaseInvoice = (id: string) =>
  api.delete(`/purchase-invoices/${id}`).then(r => r.data);

// ──────────────────────────────────────────────
// STOCK MANAGEMENT
// ──────────────────────────────────────────────

export const getStockItems = (filters?: any) =>
  api.get('/stock-items', { params: filters }).then(r => handleResponse<StockItem>(r.data));

export const getStockItem = (id: string) =>
  api.get(`/stock-items/${id}`).then(r => r.data?.data || r.data);

export const createStockItem = (data: any) =>
  api.post('/stock-items', data).then(r => r.data?.data || r.data);

export const updateStockItem = (id: string, data: any) =>
  api.put(`/stock-items/${id}`, data).then(r => r.data?.data || r.data);

export const deleteStockItem = (id: string) =>
  api.delete(`/stock-items/${id}`).then(r => r.data);

export const getLowStockItems = () =>
  api.get('/stock-items/low-stock').then(r => r.data);

export const getStockCategories = () =>
  api.get('/stock-items/categories').then(r => r.data);

export const updateStockLevel = (id: string, data: { quantity: number; transactionType: string; reference?: string; notes?: string }) =>
  api.post(`/stock-items/${id}/update-stock`, data).then(r => r.data?.data || r.data);

export const allocateStockToDepartment = (id: string, data: { quantity: number; departmentId: string }) =>
  api.post(`/stock-items/${id}/allocate-stock`, data).then(r => r.data);

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
  api.get(`/stock-transactions/${id}`).then(r => r.data?.data || r.data);

export const createStockTransaction = (data: any) =>
  api.post('/stock-transactions', data).then(r => r.data?.data || r.data);

export const updateStockTransaction = (id: string, data: { notes?: string; reference?: string }) =>
  api.put(`/stock-transactions/${id}`, data).then(r => r.data?.data || r.data);

export const getStockMovementReport = (filters?: any) =>
  api.get('/stock-transactions/reports/movement-summary', { params: filters }).then(r => r.data);

export const getLowStockAlerts = () =>
  api.get('/stock-transactions/alerts/low-stock').then(r => r.data);

// ──────────────────────────────────────────────
// REQUISITIONS
// ──────────────────────────────────────────────

const getStockTransfersPage = (filters?: { page?: number; limit?: number; status?: string }) =>
  api.get('/stock-transfers', { params: filters }).then(r => handleResponse<any>(r.data));

export const getStockTransfers = async (filters?: { page?: number; limit?: number; status?: string }) => {
  if (!wantsMoreThanOnePage(filters)) return getStockTransfersPage(filters);
  return fetchAllPages<any>(getStockTransfersPage, filters, { maxItems: Number(filters!.limit), concurrency: 2 });
};

export const getStockTransfer = (id: string) =>
  api.get(`/stock-transfers/${id}`).then(r => r.data?.data ?? r.data);

export const createStockTransfer = (data: any) =>
  api.post('/stock-transfers', data).then(r => r.data?.data ?? r.data);

export const approveStockTransfer = (id: string) =>
  api.patch(`/stock-transfers/${id}/approve`).then(r => r.data?.data ?? r.data);

export const dispatchStockTransfer = (id: string) =>
  api.patch(`/stock-transfers/${id}/dispatch`).then(r => r.data?.data ?? r.data);

export const receiveStockTransfer = (id: string) =>
  api.patch(`/stock-transfers/${id}/receive`).then(r => r.data?.data ?? r.data);

// ──────────────────────────────────────────────
// REQUISITIONS
// ──────────────────────────────────────────────

export const getRequisitions = (filters?: any) =>
  api.get('/requisitions', { params: filters }).then(r => handleResponse<Requisition>(r.data));

export interface RequisitionStockLookupItem {
  id: string;
  name: string;
  drugCode: string;
  strength: string;
  category: string;
  unitOfMeasure: string;
  supplierQty: number;
  requesterQty: number;
  reorderLevel: number;
}

/** Search stock items with the supplying department's (and our own) usable quantities */
export const lookupRequisitionStock = (params: {
  supplierDepartmentId: string;
  requesterDepartmentId?: string;
  q?: string;
  limit?: number;
  inStockOnly?: boolean;
}) =>
  api.get('/requisitions/stock-lookup', { params }).then(r => (r.data?.data ?? r.data) as RequisitionStockLookupItem[]);

export const getRequisition = (id: string) =>
  api.get(`/requisitions/${id}`).then(r => r.data?.data || r.data);

export const createRequisition = (data: any) =>
  api.post('/requisitions', data).then(r => r.data?.data || r.data);

export const updateRequisition = (id: string, data: any) =>
  api.put(`/requisitions/${id}`, data).then(r => r.data?.data || r.data);

export const deleteRequisition = (id: string) =>
  api.delete(`/requisitions/${id}`).then(r => r.data);

export const updateRequisitionStatus = (id: string, status: string, additionalData?: any) =>
  api.patch(`/requisitions/${id}/status`, { status, ...(additionalData || {}) }).then(r => r.data?.data || r.data);

export const submitRequisition = (id: string) => updateRequisitionStatus(id, 'submitted');
export const approveRequisition = (id: string) => updateRequisitionStatus(id, 'approved');
export const fulfillRequisition = (id: string, data?: any) => updateRequisitionStatus(id, 'fulfilled', data);
export const cancelRequisition = (id: string) => updateRequisitionStatus(id, 'cancelled');

export const approveRequisitionItems = (id: string, data: { approvedItems: Array<{ requisitionItemId: string; quantityApproved: number; notes?: string }> }) =>
  api.post(`/requisitions/${id}/approve-items`, data).then(r => r.data?.data || r.data);

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
  attendanceId?: string;
  referralReason: string;
  referredToFacility: string;
  referredToDoctor?: string;
  referredToDepartment?: string;
  urgency?: string;
  referralNotes?: string;
  structuredForm?: { partI?: Record<string, unknown>; partII?: Record<string, unknown> };
  /** Legacy alias retained for existing callers; new clinical flows should use attendanceId. */
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
  structuredForm?: { partI?: Record<string, unknown>; partII?: Record<string, unknown> };
}) => {
  const response = await api.post('/referrals/incoming', data);
  return response.data;
};

export const updateReferralStatus = async (id: string, status: string, outcomeNotes?: string) => {
  const response = await api.put(`/referrals/${id}/status`, { status, outcomeNotes });
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
    const responseData = r.data;

    // Handle nested response structure (similar to services)
    if (responseData?.success && responseData?.data?.data) {
      const diagnoses = responseData.data.data;
      const pagination = responseData.data.pagination;
      return {
        data: diagnoses,
        diagnoses: diagnoses,
        pagination: pagination || responseData.meta
      };
    }

    // Handle direct data array
    if (responseData?.data && Array.isArray(responseData.data)) {
      return {
        data: responseData.data,
        diagnoses: responseData.data,
        pagination: responseData.pagination || responseData.meta
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
  api.get(`/diagnoses/${id}`).then(r => r.data?.data || r.data);

export const createDiagnosis = (data: any) =>
  api.post('/diagnoses', data).then(r => r.data?.data || r.data);

export const updateDiagnosis = (id: string, data: any) =>
  api.put(`/diagnoses/${id}`, data).then(r => r.data?.data || r.data);

export const deleteDiagnosis = (id: string) =>
  api.delete(`/diagnoses/${id}`).then(r => r.data);

export const searchDiagnoses = async (query: string) => {
  const pageSize = 100;
  const firstResponse = await api.get('/diagnoses/search', {
    params: { q: query, page: 1, limit: pageSize }
  });
  const responseData = firstResponse.data;
  const firstPage = responseData?.success && Array.isArray(responseData.data)
    ? responseData.data
    : Array.isArray(responseData?.data)
      ? responseData.data
      : Array.isArray(responseData)
        ? responseData
        : [];
  const pagination = responseData?.meta || responseData?.pagination;
  const totalPages = pagination?.totalPages || pagination?.pages || 1;

  if (totalPages <= 1) return firstPage;

  const remainingResponses = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      api.get('/diagnoses/search', {
        params: { q: query, page: index + 2, limit: pageSize }
      })
    )
  );

  return firstPage.concat(
    remainingResponses.flatMap(response => {
      const data = response.data;
      return data?.success && Array.isArray(data.data)
        ? data.data
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : [];
    })
  );
};

export const getMorbidityGroups = () =>
  api.get('/diagnoses/morbidity-groups').then(r => r.data);

export const getDiagnosesByMorbidityGroup = (morbidityGroup: string) =>
  api.get(`/diagnoses/morbidity-group/${morbidityGroup}`).then(r => r.data);

export const getDiagnosisStats = () =>
  api.get('/diagnoses/stats').then(r => r.data);

// ============================================
// LAB TEST TEMPLATES
// ============================================

// ✅ Fix: Use '/lab-tests' (with hyphen) to match backend

export const getLabTestTemplates = (filters?: any) =>
  api.get('/lab-tests', { params: filters }).then(r => {
    const responseData = r.data;
    // Handle BaseController paginated: { success, data: { data: [], pagination: {} } }
    if (responseData?.success && responseData?.data?.data && Array.isArray(responseData.data.data)) {
      return {
        data: responseData.data.data,
        pagination: responseData.data.pagination || responseData.meta,
      };
    }
    // Fallback: flat array
    if (Array.isArray(responseData?.data)) {
      return { data: responseData.data, pagination: responseData.pagination || responseData.meta };
    }
    if (Array.isArray(responseData)) {
      return { data: responseData, pagination: null };
    }
    console.warn('Unexpected lab-tests response:', responseData);
    return { data: [], pagination: null };
  });

export const getLabTestTemplate = (id: string) =>
  api.get(`/lab-tests/${id}`).then(r => r.data?.data || r.data);


export const createLabTestTemplate = (data: any) =>
  api.post('/lab-tests', data).then(r => r.data?.data || r.data);

export const updateLabTestTemplate = (id: string, data: any) =>
  api.put(`/lab-tests/${id}`, data).then(r => r.data?.data || r.data);

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
  api.get('/procedures/templates', { params: filters }).then(r => {
    const responseData = r.data;
    if (responseData?.success && Array.isArray(responseData.data)) {
      return { data: responseData.data, pagination: responseData.meta || responseData.pagination };
    }
    if (Array.isArray(responseData?.data)) {
      return { data: responseData.data, pagination: responseData.pagination || responseData.meta };
    }
    return { data: Array.isArray(responseData) ? responseData : [], pagination: null };
  });

export const getProcedureTemplate = (id: string) =>
  api.get(`/procedures/templates/${id}`).then(r => r.data?.data || r.data);

export const createProcedureTemplate = (data: any) =>
  api.post('/procedures/templates', data).then(r => r.data?.data || r.data);

export const updateProcedureTemplate = (id: string, data: any) =>
  api.put(`/procedures/templates/${id}`, data).then(r => r.data?.data || r.data);

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
  api.get('/scan-templates', { params: filters }).then(r => {
    const responseData = r.data;
    if (responseData?.success && Array.isArray(responseData.data)) {
      return { data: responseData.data, pagination: responseData.pagination || responseData.meta };
    }
    if (Array.isArray(responseData?.data)) {
      return { data: responseData.data, pagination: responseData.pagination || responseData.meta };
    }
    return { data: Array.isArray(responseData) ? responseData : [], pagination: null };
  });

export const getScanTemplate = (id: string) =>
  api.get(`/scan-templates/${id}`).then(r => r.data?.data || r.data);

export const createScanTemplate = (data: any) =>
  api.post('/scan-templates', data).then(r => r.data?.data || r.data);

export const updateScanTemplate = (id: string, data: any) =>
  api.put(`/scan-templates/${id}`, data).then(r => r.data?.data || r.data);

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

const getServiceCatalogPage = (filters?: any) =>
  api.get('/services', { params: filters }).then(r => {
    // The response structure is: { success: true, data: { data: [...], pagination: {...} } }
    const responseData = r.data;

    if (responseData?.success && responseData?.data?.data) {
      // Extract the nested data array
      const services = responseData.data.data;
      const pagination = responseData.data.pagination;

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

// limit > 100 walks all pages (backend maximum is 100 per request)
export const getServiceCatalog = async (filters?: any) => {
  if (!wantsMoreThanOnePage(filters)) return getServiceCatalogPage(filters);
  const items = await fetchAllPages<any>(getServiceCatalogPage, filters, { maxItems: Number(filters.limit) });
  return {
    data: items,
    services: items,
    pagination: { page: 1, limit: items.length, total: items.length, pages: 1, totalPages: 1 }
  };
};

export const getServiceCatalogItem = (id: string) => {
  if (!id || id === 'undefined' || id === 'null') {
    return Promise.reject(new Error('Valid Service ID is required'));
  }
  return api.get(`/services/${id}`).then(r => {
    const payload = r.data?.data || r.data;
    const service = payload.service || payload;
    return { ...service, _id: service.id || service._id };
  });
};

export const createServiceCatalogItem = (data: any) => {
  if (!data.name || !data.code) {
    return Promise.reject(new Error('Service name and code are required'));
  }
  return api.post('/services', data).then(r => {
    const payload = r.data?.data || r.data;
    const service = payload.service || payload;
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
    const payload = r.data?.data || r.data;
    const service = payload.service || payload;
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

export const getServiceNHISMedicinePolicy = (serviceId: string) =>
  api.get(`/services/${serviceId}/nhis-medicine-policy`).then(r => r.data?.data ?? r.data);

export const updateServiceNHISMedicinePolicy = (serviceId: string, data: any) =>
  api.put(`/services/${serviceId}/nhis-medicine-policy`, data).then(r => r.data?.data ?? r.data);

export const getServicesByCategory = (category: string) =>
  api.get(`/services/category/${category}`).then(r => r.data);

export const checkServiceCoverage = (data: any) =>
  api.post('/services/check-coverage', data).then(r => r.data);

export const calculateServiceCost = (data: any) =>
  api.post('/services/calculate-cost', data).then(r => r.data);

// ──────────────────────────────────────────────
// DEPARTMENT
// ──────────────────────────────────────────────

const getDepartmentsPage = (filters?: any) =>
  api.get('/departments', { params: filters }).then(r => {
    const rows = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
    return Object.assign(rows, { pagination: readPagination(r.data) });
  });

// The backend defaults to 50 departments per page. Load all pages for reference
// lists unless a caller explicitly requests a page or limit.

export const getConsultationTypes = (filters?: any) =>
  api.get('/consultation-types', { params: filters }).then(r => handleResponse<ConsultationType>(r.data));

export const getConsultationType = (id: string) =>
  api.get(`/consultation-types/${id}`).then(r => r.data?.data || r.data);

export const createConsultationType = (data: any) =>
  api.post('/consultation-types', data).then(r => r.data?.data || r.data);

export const updateConsultationType = (id: string, data: any) =>
  api.put(`/consultation-types/${id}`, data).then(r => r.data?.data || r.data);

export const deleteConsultationType = (id: string) =>
  api.delete(`/consultation-types/${id}`).then(r => r.data?.data || r.data);

// ──────────────────────────────────────────────
// DEPARTMENT
// ──────────────────────────────────────────────

export const getDepartments = async (filters?: any) => {
  if (filters?.page || filters?.limit) return getDepartmentsPage(filters);
  const rows = await fetchAllPages<any>(getDepartmentsPage, filters || {}, {
    pageSize: API_PAGE_SIZE, maxItems: 5000, concurrency: 3,
  });
  return Object.assign(rows, {
    pagination: { page: 1, limit: rows.length, total: rows.length, pages: 1, totalPages: 1 },
  });
};

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

const getAppointmentsPage = (filters?: any) =>
  api.get('/appointments', { params: filters }).then(r => handleResponse<Appointment>(r.data));

// limit > 100 walks all pages (backend maximum is 100 per request)
export const getAppointments = (filters?: any) =>
  wantsMoreThanOnePage(filters)
    ? fetchAllPages<Appointment>(getAppointmentsPage, filters, { maxItems: Number(filters.limit) })
    : getAppointmentsPage(filters);

export const getAppointment = (id: string) =>
  api.get(`/appointments/${id}`).then(r => r.data?.data || r.data);

export const createAppointment = (data: any) =>
  api.post('/appointments', data).then(r => r.data?.data || r.data);

export const updateAppointment = (id: string, data: any) =>
  api.put(`/appointments/${id}`, data).then(r => r.data?.data || r.data);

export const deleteAppointment = (id: string) =>
  api.delete(`/appointments/${id}`).then(r => r.data);

export const updateAppointmentStatus = (id: string, status: string) =>
  api.put(`/appointments/${id}`, { status }).then(r => r.data?.data || r.data);

export const checkInAppointment = (id: string) =>
  api.put(`/appointments/${id}`, { status: 'checked_in' }).then(r => r.data?.data || r.data);

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
  api.get('/notifications', { params: filters }).then(r => r.data);

export const getNotification = (id: string) =>
  api.get(`/notifications/${id}`).then(r => r.data?.data || r.data);

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

export const getDashboardStats = (params?: {
  startDate?: string;
  endDate?: string;
  period?: 'today' | 'week' | 'month';
}) =>
  api.get('/dashboard/stats', { params }).then(r => r.data);

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

export const generateReceipt = (billId: string, paymentId?: string) =>
  api.post<DocumentGenerationResponse>(`/documents/receipt/${billId}`, undefined, { params: paymentId ? { paymentId } : undefined }).then(r => r.data);

export const generateBillStatement = (billId: string) =>
  api.post<DocumentGenerationResponse>(`/documents/statement/${billId}`).then(r => r.data);

export const generateReferralLetter = (referralId: string) =>
  api.post<DocumentGenerationResponse>(`/documents/referral/${referralId}`).then(r => r.data);

// The document backend generates this from an encounter, then links the document to that encounter.
export const generateDischargeSummary = (encounterId: string) =>
  api.post<DocumentGenerationResponse>(`/documents/discharge/${encounterId}`).then(r => r.data);

// The backend builds the lab-result document from all lab records on the encounter.
export const generateLabResult = (encounterId: string) =>
  api.post<DocumentGenerationResponse>(`/documents/lab-result/${encounterId}`).then(r => r.data);

export const generatePrescription = (encounterId: string) =>
  api.post<DocumentGenerationResponse>(`/documents/prescription/${encounterId}`).then(r => r.data);

export const getDocumentsByEntity = (entityType: string, entityId: string) =>
  api.get<{ success: boolean; data: GeneratedDocument[] }>(`/documents/entity/${entityType}/${entityId}`).then(r => r.data);

export const downloadDocument = (documentId: string) =>
  api.get(`/documents/${documentId}/download`, {
    responseType: 'blob',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
    },
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
// UPLOAD SYSTEM (authenticated file routes)
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
  const response = await api.post('/reports/export', data, { responseType: 'blob', timeout: 120000 });
  const blob: Blob = response.data;

  // On a server error the body is JSON text, not a file: show its message instead of saving it as a "report"
  if (blob.type && blob.type.includes('application/json')) {
    let message = 'Export failed';
    try { message = JSON.parse(await blob.text())?.message || message; } catch { /* keep default */ }
    throw new Error(message);
  }

  const extension = data.format === 'excel' ? 'xlsx' : data.format === 'pdf' ? 'pdf' : 'csv';
  const disposition: string = response.headers?.['content-disposition'] || '';
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  const filename = match?.[1] || `${data.reportType}_${new Date().toISOString().split('T')[0]}.${extension}`;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  return { success: true, filename };
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
  attendanceId: string;
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

export const getCommunicationLogs = (filters?: { channelId?: string; status?: string; startDate?: string; endDate?: string }) =>
  api.get('/communications/history', { params: filters }).then(r => r.data);

export const getCommunicationTemplates = (type?: string) =>
  api.get('/communications/templates', { params: { type } }).then(r => r.data);

export const createCommunicationTemplate = (data: any) =>
  api.post('/communications/templates', data).then(r => r.data);

// ──────────────────────────────────────────────
// COUNTER (walk-in sales, labs and scans)
// ──────────────────────────────────────────────

export const searchCounterClients = (query: string, limit = 20) =>
  api.get('/counter/clients', { params: { query, limit } }).then(r => r.data);

/** "Is this person already registered?" — name, folder and date of birth only. */
export const searchCounterPatients = (query: string, limit = 20) =>
  api.get('/counter/patients', { params: { query, limit } }).then(r => r.data);

export const listCounterTickets = (filters?: { query?: string; status?: string; fromDate?: string; toDate?: string; page?: number; limit?: number }) =>
  api.get('/counter/tickets', { params: filters }).then(r => r.data);

export const getCounterTicket = (id: string) =>
  api.get(`/counter/tickets/${id}`).then(r => r.data);

export const createCounterTicket = (data: { patientId?: string; clientId?: string; client?: { name: string; ageYears?: number | null; phone?: string | null }; reason?: string }) =>
  api.post('/counter/tickets', data).then(r => r.data);

export const addCounterSaleItem = (ticketId: string, data: { stockItemId: string; quantity: number; notes?: string }) =>
  api.post(`/counter/tickets/${ticketId}/items`, data).then(r => r.data);

export const dispenseCounterItem = (ticketId: string, medicationId: string, quantity: number) =>
  api.post(`/counter/tickets/${ticketId}/items/${medicationId}/dispense`, { quantity }).then(r => r.data);

export const removeCounterSaleItem = (ticketId: string, medicationId: string) =>
  api.delete(`/counter/tickets/${ticketId}/items/${medicationId}`).then(r => r.data);

export const addCounterLabOrder = (ticketId: string, data: { serviceCatalogId: string; priority?: string; notes?: string }) =>
  api.post(`/counter/tickets/${ticketId}/lab-tests`, data).then(r => r.data);

export const removeCounterLabOrder = (ticketId: string, labTestId: string) =>
  api.delete(`/counter/tickets/${ticketId}/lab-tests/${labTestId}`).then(r => r.data);

export const addCounterScanOrder = (ticketId: string, data: { serviceCatalogId: string; priority?: string; notes?: string }) =>
  api.post(`/counter/tickets/${ticketId}/scans`, data).then(r => r.data);

export const removeCounterScanOrder = (ticketId: string, scanId: string) =>
  api.delete(`/counter/tickets/${ticketId}/scans/${scanId}`).then(r => r.data);

export const getCounterBill = (ticketId: string) =>
  api.get(`/counter/tickets/${ticketId}/bill`).then(r => r.data);

export const raiseCounterBill = (ticketId: string) =>
  api.post(`/counter/tickets/${ticketId}/bill`).then(r => r.data);

export const closeCounterTicket = (ticketId: string) =>
  api.post(`/counter/tickets/${ticketId}/close`).then(r => r.data);

export const linkCounterClient = (clientId: string, patientId: string) =>
  api.post(`/counter/clients/${clientId}/link`, { patientId }).then(r => r.data);

// ──────────────────────────────────────────────
// DEFAULT EXPORT
// ──────────────────────────────────────────────

export default {
  // Auth
  login, register, verifyToken, logout, getUsers, getProfile, updateProfile, changePassword,

  // Add new helpers
  hasMinSeniority,
  getUserSeniority,
  getSeniorityLabel,

  // User Management (NEW - separate module)
  adminCreateUser, getAllUsers, getUserById, updateUser, deactivateUser, adminResetUserPassword, getUserProfile, updateUserProfile, changeUserPassword, getCurrentUserPermissions,

  // Shift Management (NEW)
  getShifts, getShiftById, createShift, updateShift, deleteShift, 

  approveLeave, rejectLeave, cancelLeave,

  // Leave Management (NEW)
  getLeaves, getLeaveById, createLeave, updateLeave, deleteLeave,

  // Full Profile & HR
  getFullProfile, updateFullProfile,
  getMyPayslips, getUserPayslips, getAllPayslips,
  generatePayslip, runPayroll, updatePayslip,
  getMyDocuments, getUserDocuments, getAllDocuments, getDocumentById,
uploadUserDocument, updateDocument, verifyDocument, unverifyDocument, deleteDocument,

getPayslipById, addPayslipLineItem, updatePayslipLineItem, deletePayslipLineItem,

  // Settings
  getHospitalDetails, updateHospitalDetails,

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
  getInsuranceProviders, getInsuranceProvider, createInsuranceProvider, updateInsuranceProvider, toggleInsuranceProviderStatus, deleteInsuranceProvider,

  // Insurance Claims
  getInsuranceClaims, getNHISClaims, getPrivateInsuranceClaims, getCorporateClaims, getInsuranceClaim, getClaimByEncounterId,
  generateNHISClaim, generatePrivateInsuranceClaim, generateCorporateClaim,
  updateInsuranceClaim, updateClaimDraft, finalizeClaim,
  getClaimsSummary, getInsuranceClaimsTracking, recordInsuranceClaimTrackingEvent, downloadClaimXml, generateClaimPrint, generateClaimXML,

  // Claim Batches
  generateClaimBatch, getClaimBatches, getClaimBatch, finalizeClaimBatch, deleteClaimBatch,
  downloadBatchXml, printClaimBatch,

  // Corporate Accounts
  getCorporateAccounts, getCorporateAccount, createCorporateAccount, updateCorporateAccount, deactivateCorporateAccount,
  getCorporateEmployees, addCorporateEmployee, updateCorporateEmployee, removeCorporateEmployee,

  // Patients
  getPatients, getPatient, createPatient, updatePatient, uploadPatientImage, uploadPatientImageBase64, deletePatient,

  // Encounters
  getEncounters, getEncounter, createEncounter, updateEncounter, deleteEncounter, updateEncounterStatus, finalizeEncounterClinicalRecord,

  // Worklist
  getVitalsWorklist, getMedicalWorklist, getLabWorklist, getPharmacyWorklist, getWorklistSummary,
  getScansWorklist, getTheatreWorklist, getMaternalWorklist,

  // Encounter Operations
  addDiagnosisToEncounter, removeDiagnosisFromEncounter,
  addLabTestToEncounter, updateLabTestInEncounter, removeLabTestFromEncounter,
  addProcedureToEncounter, updateProcedureStatus, removeProcedureFromEncounter,
  addMedicationToEncounter, updateMedicationStatus, removeMedicationFromEncounter,
  addScanToEncounter, updateScanStatus, removeScanFromEncounter,
  addServiceToEncounter, removeServiceFromEncounter,
  addVitalsToEncounter, getVitalsByEncounter, updateVitals, deleteVitals,
  getBillingBreakdown, calculateEncounterBill, getEncounterStats,

  // Bills
  getBills, getBill, createBill, updateBill, deleteBill, addPaymentToBill, generateBillFromEncounter,
  getBillingInvoice,
  generateBillReport, getBillingBreakdownForBill, updateBillStatus, getBillStatistics,
  getBillLineItems, voidBillLineItem, getBillingCollections, getBillingRevenueLines,

  // Consumables (non-medication stock used during the visit)   ← add these
  recordEncounterConsumableUse,
  updateEncounterConsumableUse,
  removeEncounterConsumableUse,
  getEncounterConsumables,
  deleteEncounterConsumableUse,


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
  dischargeFromEncounter,    referFromEncounter, abscondFromEncounter, completeEncounter,

  // Stock
  getStockItems, getStockItem, createStockItem, updateStockItem, deleteStockItem, getLowStockItems,
  getStockCategories, updateStockLevel, getStockItemTransactionHistory,
  getStockValueSummary, getExpiryReport, getMovementSummary, getUsageReport, getSupplierReport, getRequisitionSummary,
  getStockTransactions, getStockTransaction, createStockTransaction, updateStockTransaction,
  getStockMovementReport, getLowStockAlerts,
  getStockTransfers, getStockTransfer, createStockTransfer, approveStockTransfer, dispatchStockTransfer, receiveStockTransfer,

  // Purchase Invoices
  getPurchaseInvoices, getPurchaseInvoice, createPurchaseInvoice, updatePurchaseInvoice, deletePurchaseInvoice,

  // Requisitions
  getRequisitions, getRequisition, lookupRequisitionStock, createRequisition, updateRequisition, deleteRequisition,
  updateRequisitionStatus, submitRequisition, approveRequisition, fulfillRequisition, cancelRequisition, approveRequisitionItems,

  // Referrals
  getReferrals, getReferralById, createOutgoingReferral, createIncomingReferral, updateReferralStatus,
  deleteReferral, getReferralsByPatient, getReferralStats,

  // Medical Services
  getDiagnoses, getDiagnosis, createDiagnosis, updateDiagnosis, deleteDiagnosis, searchDiagnoses,
  getMorbidityGroups, getDiagnosesByMorbidityGroup, getDiagnosisStats,
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
  getDashboardStats,

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
  acceptEstimate, rejectEstimate, getEstimateStatistics,
  getExpiringEstimates, getEstimatesByPatient, getEstimatesByCorporateAccount,

  // Communications
  sendSMS, getCommunicationLogs, getCommunicationTemplates,
  createCommunicationTemplate,

  // Family Planning
  getFPServices, getFPServiceById, createFPService, updateFPService, deleteFPService,
  getCurrentFPMethod, getFPHistory, getFPClientDetails, getFPStatistics, getFPMethodMix, getGHSFPReport,

  // Counter (walk-in tickets)
  searchCounterClients, searchCounterPatients, listCounterTickets, getCounterTicket,
  createCounterTicket, addCounterSaleItem, dispenseCounterItem, removeCounterSaleItem,
  addCounterLabOrder, removeCounterLabOrder, addCounterScanOrder, removeCounterScanOrder,
  getCounterBill, raiseCounterBill, closeCounterTicket, linkCounterClient,

  // Upload
  servePatientImages, serveScanImages, serveDocuments
};