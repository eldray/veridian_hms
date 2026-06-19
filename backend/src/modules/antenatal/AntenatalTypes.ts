// modules/antenatal/AntenatalTypes.ts

export interface CreateAntenatalBookingInput {
  patientId: string;
  attendanceId: string;
  gravida: number;
  para: number;
  lmp: Date;
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
  iptpDoses?: any;
  ttDoses?: any;
  iptp1Date?: Date;
  iptp2Date?: Date;
  iptp3Date?: Date;
  iptp4Date?: Date;
  iptp5Date?: Date;
  tt1Date?: Date;
  tt2Date?: Date;
  tt3Date?: Date;
  tt4Date?: Date;
  tt5Date?: Date;
  createdById: string;
}

export interface UpdateAntenatalBookingInput {
  gravida?: number;
  para?: number;
  edd?: Date;
  gestationalAgeWeeks?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  riskFactors?: any;
  isActive?: boolean;
  isCompleted?: boolean;
  deliveryDate?: Date;
  deliveryOutcome?: string;
  deliveryRecordId?: string;
  bloodGroup?: string;
  hivStatus?: string;
  hbLevel?: number;
  vdrl?: string;
  currentAttendanceId?: string;
}

export interface CreateANCVisitInput {
  bookingId: string;
  attendanceId: string;
  visitNumber: number;
  visitDate: Date;
  gestationalAgeWeeks?: number;
  gestationalAgeDays?: number; 
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
  nextVisitDate?: Date;
  returnInstructions?: string;
  recordedById: string;
}

export interface UpdateANCVisitInput extends Partial<CreateANCVisitInput> {}

export interface CreateDeliveryRecordInput {
  patientId: string;
  attendanceId: string;
  antenatalBookingId?: string;
  deliveryDate: Date;
  deliveryType: 'spontaneous_vertex' | 'assisted_breech' | 'vacuum' | 'forceps' | 'caesarean_section' | 'multiple';
  deliveryOutcome: 'live_birth' | 'stillbirth_fresh' | 'stillbirth_macerated' | 'neonatal_death';
  placeOfDelivery?: 'private_hospital' | 'government_hospital' | 'health_centre' | 'clinic' | 'chag_facility' | 'private_midwife' | 'tba_trained' | 'tba_untrained' | 'home' | 'en_route' | 'mines_facility' | 'quasi_govt_institution';
  attendant?: string;
  birthWeight?: number;
  gestationWeeks?: number;
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
  createdById: string;
}

export interface CreatePostnatalRecordInput {
  patientId: string;
  attendanceId: string;
  antenatalBookingId?: string;
  deliveryRecordId?: string;
  examinationDate: Date;
  dayNumber?: number;
  maternalCondition?: 'good' | 'fair' | 'poor' | 'critical';
  breastfeedingStatus?: 'exclusive' | 'mixed' | 'not_breastfeeding';
  babyCondition?: 'good' | 'fair' | 'poor' | 'critical';
  familyPlanningDiscussed?: boolean;
  familyPlanningMethodAccepted?: string;
  notes?: string;
  createdById: string;
}

export interface AntenatalBookingFilters {
  isActive?: boolean;
  patientId?: string;
  page?: number;
  limit?: number;
}

export interface DeliveryRecordFilters {
  patientId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface PostnatalRecordFilters {
  patientId?: string;
  page?: number;
  limit?: number;
}