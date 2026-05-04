// src/api/antenatal.ts - COMPLETE WITH ALL ENDPOINTS
import api from './api';

// ============================================
// ANTENATAL TYPES
// ============================================
export interface IPTPDose {
  doseNumber: number;
  date: string;
  drug: string;
  visitNumber: number;
}

export interface TTDose {
  doseNumber: number;
  date: string;
  type: string;
  visitNumber: number;
}

export interface DangerSign {
  sign: string;
  present: boolean;
  notes?: string;
}

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
  dangerSignsList?: DangerSign[];
  referralMade?: boolean;
  referredTo?: string;
  referralReason?: string;
  nextVisitDate?: string;
  returnInstructions?: string;
  notes?: string;
}

// ============================================
// ANTENATAL API FUNCTIONS
// ============================================

// Bookings
export const getAntenatalBookings = async (filters?: { page?: number; limit?: number; isActive?: boolean; patientId?: string }) => {
  const response = await api.get('/antenatal/bookings', { params: filters });
  return response.data;
};

export const getAntenatalBooking = async (patientId: string, pregnancyNumber?: number) => {
  const params = pregnancyNumber ? { pregnancyNumber } : {};
  const response = await api.get(`/antenatal/bookings/${patientId}`, { params });
  return response.data;
};

export const createAntenatalBooking = async (data: AntenatalBookingData) => {
  const response = await api.post('/antenatal/booking-from-attendance', data);
  return response.data;
};

export const closeAntenatalBooking = async (patientId: string, data: { deliveryDate?: string; deliveryOutcome?: string; deliveryRecordId?: string }) => {
  const response = await api.put(`/antenatal/bookings/${patientId}/close`, data);
  return response.data;
};

// ANC Visits
export const getANCVisits = async (bookingId: string) => {
  const response = await api.get(`/antenatal/visits/${bookingId}`);
  return response.data;
};

export const getANCVisitsByBooking = async (bookingId: string) => {
  console.log('📞 Fetching ANC visits for booking:', bookingId);
  
  const response = await api.get(`/antenatal/visits/by-booking/${bookingId}`);
  
  console.log('📦 Raw response:', response);
  console.log('📦 Response data:', response.data);
  console.log('📦 Response data.data:', response.data?.data);
  
  // Check if the structure matches
  if (!response.data?.success) {
    console.error('❌ API returned success=false:', response.data);
    throw new Error(response.data?.message || 'Failed to fetch ANC visits');
  }
  
  const visits = response.data.data?.visits || [];
  const booking = response.data.data?.booking;
  
  console.log('✅ Visits loaded:', visits.length);
  console.log('✅ Booking:', booking?.id);
  
  return { visits, booking };
};

export const getANCVisitsByAttendance = async (attendanceId: string) => {
  const response = await api.get(`/antenatal/visits/by-attendance/${attendanceId}`);
  return response.data;
};

export const getANCVisitById = async (id: string) => {
  const response = await api.get(`/antenatal/visit/${id}`);
  return response.data;
};

export const recordANCVisit = async (data: ANCVisitData) => {
  const response = await api.post('/antenatal/visit-from-attendance', data);
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

// Antenatal by Attendance
export const getAntenatalByAttendance = async (attendanceId: string) => {
  const response = await api.get(`/antenatal/attendance/${attendanceId}`);
  return response.data;
};

// Statistics
export const getANCStatistics = async (filters?: { startDate?: string; endDate?: string }) => {
  const response = await api.get('/antenatal/stats', { params: filters });
  return response.data;
};

// ============================================
// DELIVERY TYPES & API FUNCTIONS
// ============================================

export interface DeliveryRecordData {
  patientId: string;
  attendanceId: string;
  antenatalBookingId?: string;
  admissionId?: string;
  deliveryDate?: string;
  deliveryType?: 'spontaneous_vertex' | 'assisted_breech' | 'vacuum' | 'forceps' | 'caesarean_section' | 'multiple';
  deliveryOutcome?: 'live_birth' | 'stillbirth_fresh' | 'stillbirth_macerated' | 'neonatal_death';
  placeOfDelivery?: 'hospital' | 'health_centre' | 'clinic' | 'home' | 'en_route';
  attendant?: string;
  attendantRole?: string;
  birthWeight?: number;
  gestationWeeks?: number;
  apgarScore1min?: number;
  apgarScore5min?: number;
  resusCitationDone?: boolean;
  numberOfBabies?: number;
  maternalOutcome?: 'alive' | 'dead_direct_cause' | 'dead_indirect_cause' | 'dead_unknown';
  maternalComplications?: string[];
  referralTo?: string;
  referralReason?: string;
  modeOfDelivery?: string;
  episiotomy?: boolean;
  perinealTears?: boolean;
  retainedPlacenta?: boolean;
  postpartumHaemorrhage?: boolean;
  estimatedBloodLoss?: number;
  postnatalCheckDone?: boolean;
  postnatalDay?: number;
  familyPlanningDiscussed?: boolean;
  familyPlanningMethod?: string;
  liveBirths?: number;
  stillbirths?: number;
  neonatalDeaths?: number;
  birthAsphyxia?: boolean;
  newbornResuscitation?: boolean;
  newbornReferred?: boolean;
}

export interface NewbornRecordData {
  deliveryRecordId: string;
  babyNumber: number;
  gender: 'male' | 'female' | 'other';
  birthWeight: number;
  birthLength?: number;
  headCircumference?: number;
  apgarScore1min?: number;
  apgarScore5min?: number;
  apgarScore10min?: number;
  resuscitation?: boolean;
  resuscitationMethod?: string;
  condition?: string;
  congenitalAnomalies?: string[];
  vitaminKGiven?: boolean;
  eyeProphylaxis?: boolean;
  bcgGiven?: boolean;
  opv0Given?: boolean;
  outcome?: 'alive' | 'dead_within_24hrs' | 'dead_1_7days' | 'dead_8_28days' | 'referred_out';
  outcomeNotes?: string;
  referredTo?: string;
  referralReason?: string;
  initiatedBreastfeeding?: boolean;
  timeToBreastfeed?: number;
  dischargedAlive?: boolean;
  dischargeDate?: string;
  neonatalDeathDate?: string;
  causeOfDeath?: string;
}

// Delivery Records
export const getDeliveryRecords = async (filters?: { patientId?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) => {
  const response = await api.get('/delivery', { params: filters });
  return response.data;
};

export const getDeliveryRecord = async (id: string) => {
  const response = await api.get(`/delivery/${id}`);
  return response.data;
};

export const createDeliveryRecord = async (data: DeliveryRecordData) => {
  const response = await api.post('/delivery', data);
  return response.data;
};

export const updateDeliveryRecord = async (id: string, data: Partial<DeliveryRecordData>) => {
  const response = await api.put(`/delivery/${id}`, data);
  return response.data;
};

export const deleteDeliveryRecord = async (id: string) => {
  const response = await api.delete(`/delivery/${id}`);
  return response.data;
};

export const getDeliveryStatistics = async (filters?: { startDate?: string; endDate?: string }) => {
  const response = await api.get('/delivery/stats', { params: filters });
  return response.data;
};

// Newborn Records
export const getNewbornsByDelivery = async (deliveryId: string) => {
  const response = await api.get(`/delivery/${deliveryId}/newborns`);
  return response.data;
};

export const createNewbornRecord = async (data: NewbornRecordData) => {
  const response = await api.post('/delivery/newborn', data);
  return response.data;
};

export const updateNewbornRecord = async (id: string, data: Partial<NewbornRecordData>) => {
  const response = await api.put(`/delivery/newborn/${id}`, data);
  return response.data;
};

export const deleteNewbornRecord = async (id: string) => {
  const response = await api.delete(`/delivery/newborn/${id}`);
  return response.data;
};

// ============================================
// POSTNATAL TYPES & API FUNCTIONS
// ============================================

export interface PostnatalExaminationData {
  attendanceId: string;
  maternalCondition?: string;
  babyCondition?: string;
  breastfeedingStatus?: string;
  familyPlanningMethod?: string;
  immunizationsGiven?: string;
  nextVisitDate?: string;
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
  maternalComplications?: string[];
  bloodPressure?: string;
  temperature?: number;
  pulse?: number;
  fundalHeight?: number;
  lochia?: 'normal' | 'heavy' | 'foul_smelling' | 'scanty';
  perinealCondition?: 'intact' | 'healing' | 'infected' | 'dehisced';
  caesareanWound?: 'healing' | 'infected' | 'dehisced';
  breastfeedingStatus?: 'exclusive' | 'mixed' | 'not_breastfeeding';
  breastfeedingDifficulties?: string[];
  latching?: 'good' | 'fair' | 'poor';
  babyCondition?: 'good' | 'fair' | 'poor' | 'critical';
  babyWeight?: number;
  babyTemperature?: number;
  babyFeeding?: 'good' | 'fair' | 'poor';
  jaundice?: boolean;
  jaundiceSeverity?: 'mild' | 'moderate' | 'severe';
  cordCondition?: 'dry' | 'moist' | 'infected';
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
  nextVisitType?: 'day_7' | 'day_14' | 'day_28' | 'day_42' | 'other';
  notes?: string;
}

// Postnatal
export const getPostnatalRecords = async (filters?: { patientId?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) => {
  const response = await api.get('/postnatal', { params: filters });
  return response.data;
};

export const getPostnatalRecord = async (id: string) => {
  const response = await api.get(`/postnatal/${id}`);
  return response.data;
};

export const createPostnatalRecord = async (data: PostnatalRecordData) => {
  const response = await api.post('/postnatal', data);
  return response.data;
};

export const updatePostnatalRecord = async (id: string, data: Partial<PostnatalRecordData>) => {
  const response = await api.put(`/postnatal/${id}`, data);
  return response.data;
};

export const deletePostnatalRecord = async (id: string) => {
  const response = await api.delete(`/postnatal/${id}`);
  return response.data;
};

export const getPostnatalByAttendance = async (attendanceId: string) => {
  const response = await api.get(`/antenatal/postnatal/${attendanceId}`);
  return response.data;
};

export const recordPostnatalExamination = async (data: PostnatalExaminationData) => {
  const response = await api.post('/antenatal/postnatal-examination', data);
  return response.data;
};

export const getPostnatalStatistics = async (filters?: { startDate?: string; endDate?: string }) => {
  const response = await api.get('/postnatal/stats', { params: filters });
  return response.data;
};

// ============================================
// GHS REPORTS
// ============================================

export const generateOPDReport = async (params: { year?: number; month?: number; startDate?: string; endDate?: string }) => {
  const response = await api.get('/reports/ghs/opd', { params });  // Changed from /ghs-reports/opd
  return response.data;
};

export const generateIPDReport = async (params: { year?: number; month?: number; startDate?: string; endDate?: string }) => {
  const response = await api.get('/reports/ghs/ipd', { params });  // Changed from /ghs-reports/ipd
  return response.data;
};

export const generateIDSReport = async (params: { year?: number; month?: number; startDate?: string; endDate?: string }) => {
  const response = await api.get('/reports/ghs/idsr', { params });  // Changed from /ghs-reports/idsr
  return response.data;
};

export const generateMalariaReport = async (params: { year?: number; month?: number; startDate?: string; endDate?: string }) => {
  const response = await api.get('/reports/ghs/malaria', { params });  // Changed from /ghs-reports/malaria
  return response.data;
};

export const generateANCReport = async (params: { year?: number; month?: number; startDate?: string; endDate?: string }) => {
  const response = await api.get('/reports/ghs/anc', { params });  // Changed from /ghs-reports/anc
  return response.data;
};

export const generateDeliveryReport = async (params: { year?: number; month?: number; startDate?: string; endDate?: string }) => {
  const response = await api.get('/reports/ghs/delivery', { params });  // Changed from /ghs-reports/delivery
  return response.data;
};

export const getReportSubmissions = async (filters?: { reportType?: string; year?: number; month?: number }) => {
  const response = await api.get('/reports/ghs/submissions', { params: filters });  // Changed from /ghs-reports/submissions
  return response.data;
};

export const getReportById = async (id: string) => {
  const response = await api.get(`/reports/ghs/submissions/${id}`);  // Changed from /ghs-reports/submissions/${id}
  return response.data;
};

export const exportReportToCSV = async (id: string) => {
  const response = await api.get(`/reports/ghs/submissions/${id}/export`, { responseType: 'blob' });  // Changed from /ghs-reports/submissions/${id}/export
  return response.data;
};