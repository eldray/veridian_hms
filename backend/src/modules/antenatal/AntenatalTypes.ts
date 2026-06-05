// modules/antenatal/AntenatalTypes.ts

export interface RegisterAntenatalBookingInput {
  patientId: string;
  attendanceId: string;
  numberOfPregnancies: number;      // gravida
  numberOfDeliveries: number;        // para
  lastMenstrualPeriod: Date;         // lmp
  estimatedDueDate?: Date;           // edd
  gestationalAgeWeeks?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  riskFactors?: any;
  bloodGroup?: string;
  hivStatus?: string;
  hemoglobinLevel?: number;          // hbLevel
  syphilisStatus?: string;           // vdrl
  previousCesareanSection?: boolean;
  previousPregnancyComplications?: string;
  registeredById: string;            // createdById
}

export interface UpdateAntenatalBookingInput {
  numberOfPregnancies?: number;
  numberOfDeliveries?: number;
  estimatedDueDate?: Date;
  gestationalAgeWeeks?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  riskFactors?: any;
  bloodGroup?: string;
  hivStatus?: string;
  hemoglobinLevel?: number;
  syphilisStatus?: string;
  previousCesareanSection?: boolean;
  previousPregnancyComplications?: string;
  isActive?: boolean;
  isCompleted?: boolean;
  deliveryDate?: Date;
  deliveryOutcome?: string;
  deliveryRecordId?: string;
  iptpDoses?: any;
  ttDoses?: any;
  currentAttendanceId?: string;
}

export interface RecordANCVisitInput {
  antenatalRecordId: string;         // bookingId
  attendanceId: string;
  visitNumber: number;
  visitDate: Date;
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
  iptpDoseGiven?: boolean;
  iptpDoseNumber?: number;
  iptpDrug?: string;
  tetanusToxoidGiven?: boolean;
  tetanusToxoidDoseNumber?: number;
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

export interface UpdateANCVisitInput extends Partial<RecordANCVisitInput> {}

export interface RecordDeliveryInput {
  patientId: string;
  attendanceId: string;
  antenatalRecordId?: string;
  admissionId?: string;
  deliveryDate: Date;
  deliveryType: 'spontaneous_vertex' | 'assisted_breech' | 'vacuum' | 'forceps' | 'caesarean_section' | 'multiple';
  deliveryOutcome: 'live_birth' | 'stillbirth_fresh' | 'stillbirth_macerated' | 'neonatal_death';
  placeOfDelivery?: 'private_hospital' | 'government_hospital' | 'health_centre' | 'clinic' | 'chag_facility' | 'private_midwife' | 'tba_trained' | 'tba_untrained' | 'home' | 'en_route' | 'mines_facility' | 'quasi_govt_institution';
  attendant?: string;
  gestationalAgeWeeks?: number;
  birthWeight?: number;
  apgarScore1min?: number;
  apgarScore5min?: number;
  resuscitationDone?: boolean;
  maternalOutcome?: 'alive' | 'dead_direct_cause' | 'dead_indirect_cause' | 'dead_unknown';
  referralTo?: string;
  complications?: string[];
  notes?: string;
  malePartnerPresentANC?: boolean;
  malePartnerPresentDelivery?: boolean;
  malePartnerPresentPNC?: boolean;
  maternalDeathsAudited?: boolean;
  auditNotes?: string;
  recordedById: string;
}

export interface RecordNewbornInput {
  deliveryRecordId: string;
  birthWeight: number;
  gender: 'male' | 'female' | 'other';
  apgarScore1min?: number;
  apgarScore5min?: number;
  resuscitationDone?: boolean;
  outcome?: 'alive' | 'dead_within_24hrs' | 'dead_1_7days' | 'dead_8_28days' | 'referred_out';
  anomalies?: string[];
  referredTo?: string;
  breastfeedingWithin30Min?: boolean;
  eyeProphylaxisGiven?: boolean;
  cordCareMethod?: 'dry_cord' | 'chlorhexidine' | 'methylated_spirit' | 'alcohol' | 'other';
  babyWeightAt6to10Days?: number;
  weightAt6to10DaysDate?: Date;
}

export interface RecordPostnatalInput {
  patientId: string;
  attendanceId: string;
  antenatalRecordId?: string;
  deliveryRecordId?: string;
  examinationDate: Date;
  dayNumber?: number;
  maternalCondition?: string;
  maternalComplications?: any[];
  bloodPressure?: string;
  temperature?: number;
  pulse?: number;
  fundalHeight?: number;
  lochia?: string;
  perinealCondition?: string;
  caesareanWound?: string;
  breastfeedingStatus?: string;
  breastfeedingDifficulties?: any[];
  latching?: string;
  babyCondition?: string;
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
  maternalDangerSigns?: any[];
  babyDangerSigns?: any[];
  referralMade?: boolean;
  referredTo?: string;
  referralReason?: string;
  nextVisitDate?: Date;
  nextVisitType?: string;
  notes?: string;
  recordedById: string;
}

export interface AntenatalRecordFilters {
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