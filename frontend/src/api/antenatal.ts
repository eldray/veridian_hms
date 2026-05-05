// src/api/antenatal.ts - CLEANED UP VERSION (No Reports)
import api from './api';

// ============================================
// TYPES
// ============================================

export interface AntenatalBookingData {
  patientId: string;
  attendanceId: string;
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
  attendanceId: string;
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
  attendanceId: string;
  antenatalBookingId?: string;
  deliveryDate?: string;
  deliveryType?: 'spontaneous_vertex' | 'assisted_breech' | 'vacuum' | 'forceps' | 'caesarean_section' | 'multiple';
  deliveryOutcome?: 'live_birth' | 'stillbirth_fresh' | 'stillbirth_macerated' | 'neonatal_death';
  placeOfDelivery?: 'hospital' | 'health_centre' | 'clinic' | 'home' | 'en_route';
  attendant?: string;
  birthWeight?: number;
  gestationWeeks?: number;
  apgarScore1min?: number;
  apgarScore5min?: number;
  resusCitationDone?: boolean;
  numberOfBabies?: number;
  maternalOutcome?: 'alive' | 'dead_direct_cause' | 'dead_indirect_cause' | 'dead_unknown';
  maternalComplications?: string[];
  notes?: string;
}

export interface PostnatalRecordData {
  patientId: string;
  attendanceId: string;
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
// ANTENATAL BOOKINGS
// ============================================

// src/api/antenatal.ts - Complete booking functions

// Get all bookings (paginated) - uses plural 'bookings'
export const getAntenatalBookings = async (filters?: { page?: number; limit?: number; isActive?: boolean; patientId?: string }) => {
  const response = await api.get('/antenatal/bookings', { params: filters });
  return response.data;
};

// Get active booking by PATIENT ID - uses plural 'bookings' + '/patient/'
export const getActiveBookingByPatient = async (patientId: string) => {
  // ✅ Fixed: 'bookings' (plural) not 'booking' (singular)
  const response = await api.get(`/antenatal/bookings/patient/${patientId}`);
  return response.data;
};

// Get booking by BOOKING ID - uses singular 'booking' because it's a single resource
export const getAntenatalBookingById = async (bookingId: string) => {
  const response = await api.get(`/antenatal/booking/${bookingId}`);
  return response.data;
};

// Create a new booking
export const createAntenatalBooking = async (data: AntenatalBookingData) => {
  const response = await api.post('/antenatal/booking', data);
  return response.data;
};

// Close a booking
export const closeAntenatalBooking = async (bookingId: string, data: { deliveryDate?: string; deliveryOutcome?: string; deliveryRecordId?: string }) => {
  const response = await api.put(`/antenatal/booking/${bookingId}/close`, data);
  return response.data;
};

export const getANCStatistics = async (filters?: { startDate?: string; endDate?: string }) => {
  const response = await api.get('/antenatal/stats', { params: filters });
  return response.data;
};

// ============================================
// ANC VISITS
// ============================================

export const getANCVisitsByBooking = async (bookingId: string) => {
  const response = await api.get(`/antenatal/visits/booking/${bookingId}`);
  return response.data;
};

export const getANCVisitById = async (id: string) => {
  const response = await api.get(`/antenatal/visit/${id}`);
  return response.data;
};

export const updateANCVisit = async (id: string, data: Partial<ANCVisitData>) => {
  const response = await api.put(`/antenatal/visit/${id}`, data);
  return response.data;
};

export const deleteANCVisit = async (id: string) => {
  const response = await api.delete(`/antenatal/visit/${id}`);
  return response.data;
};

// src/api/antenatal.ts

// ============================================
// DELIVERY - Use '/antenatal/deliveries' (plural)
// ============================================

export const getDeliveries = async (filters?: { patientId?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) => {
  // ✅ Changed from '/antenatal/delivery' to '/antenatal/deliveries'
  const response = await api.get('/antenatal/deliveries', { params: filters });
  return response.data;
};

export const getDelivery = async (id: string) => {
  // ✅ This one is correct - '/antenatal/delivery/:id'
  const response = await api.get(`/antenatal/delivery/${id}`);
  return response.data;
};

export const createDelivery = async (data: DeliveryRecordData) => {
  // ✅ This one is correct
  const response = await api.post('/antenatal/delivery', data);
  return response.data;
};

export const updateDelivery = async (id: string, data: Partial<DeliveryRecordData>) => {
  const response = await api.put(`/antenatal/delivery/${id}`, data);
  return response.data;
};

export const deleteDelivery = async (id: string) => {
  const response = await api.delete(`/antenatal/delivery/${id}`);
  return response.data;
};

export const getDeliveryStats = async (filters?: { startDate?: string; endDate?: string }) => {
  const response = await api.get('/antenatal/delivery/stats', { params: filters });
  return response.data;
};

// ============================================
// POSTNATAL - Use '/antenatal/postnatals' (plural)
// ============================================

export const getPostnatals = async (filters?: { patientId?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) => {
  // ✅ Changed from '/antenatal/postnatal' to '/antenatal/postnatals'
  const response = await api.get('/antenatal/postnatals', { params: filters });
  return response.data;
};

export const getPostnatal = async (id: string) => {
  // ✅ This one is correct - '/antenatal/postnatal/:id'
  const response = await api.get(`/antenatal/postnatal/${id}`);
  return response.data;
};

export const createPostnatal = async (data: PostnatalRecordData) => {
  // ✅ This one is correct
  const response = await api.post('/antenatal/postnatal', data);
  return response.data;
};

export const updatePostnatal = async (id: string, data: Partial<PostnatalRecordData>) => {
  const response = await api.put(`/antenatal/postnatal/${id}`, data);
  return response.data;
};

export const deletePostnatal = async (id: string) => {
  const response = await api.delete(`/antenatal/postnatal/${id}`);
  return response.data;
};

export const getPostnatalStats = async (filters?: { startDate?: string; endDate?: string }) => {
  const response = await api.get('/antenatal/postnatal/stats', { params: filters });
  return response.data;
};

export default api;