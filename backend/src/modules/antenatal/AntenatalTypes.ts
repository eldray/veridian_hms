// modules/antenatal/types.ts

export interface AntenatalBooking {
  id: string;
  patientId: string;
  attendanceId?: string | null;
  bookingNumber: string;
  bookingDate: Date;
  gravida: number;
  para: number;
  abortions: number;
  livingChildren: number;
  edd: Date;
  lmp: Date;
  riskLevel: 'low' | 'moderate' | 'high';
  riskFactors?: string | null;
  isActive: boolean;
  isCompleted: boolean;
  deliveryDate?: Date | null;
  deliveryOutcome?: string | null;
  deliveryRecordId?: string | null;
  antenatalBookingId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ANCVisit {
  id: string;
  bookingId: string;
  visitNumber: number;
  visitDate: Date;
  gestationalAgeWeeks: number;
  weight: number;
  bloodPressure: string;
  fetalHeartRate: number;
  fundalHeight?: number | null;
  fetalPosition?: string | null;
  iptpGiven: boolean;
  iptpDoseNumber?: number | null;
  ttGiven: boolean;
  ttDoseNumber?: number | null;
  dangerSignsPresent: boolean;
  dangerSignsDescription?: string | null;
  referralMade: boolean;
  referralReason?: string | null;
  notes?: string | null;
  recordedById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryRecord {
  id: string;
  patientId: string;
  attendanceId?: string | null;
  antenatalBookingId?: string | null;
  deliveryDate: Date;
  deliveryType: 'spontaneous_vaginal' | 'assisted_vaginal' | 'cesarean_section';
  deliveryOutcome: 'live_birth' | 'stillbirth' | 'miscarriage' | 'ectopic';
  gestationalAgeWeeks: number;
  complications?: string | null;
  estimatedBloodLoss?: number | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostnatalRecord {
  id: string;
  patientId: string;
  deliveryRecordId?: string | null;
  pncNumber: string;
  registrationDate: Date;
  maternalCondition: 'stable' | 'complicated';
  newbornCondition: 'stable' | 'complicated';
  breastfeedingStatus: 'exclusive' | 'mixed' | 'formula' | 'not_applicable';
  familyPlanningMethod?: string | null;
  depressionScreening?: string | null;
  nextVisitDate?: Date | null;
  notes?: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAntenatalBookingInput {
  patientId: string;
  attendanceId?: string;
  gravida: number;
  para: number;
  abortions: number;
  livingChildren: number;
  lmp: Date;
  riskLevel: 'low' | 'moderate' | 'high';
  riskFactors?: string;
}

export interface UpdateAntenatalBookingInput {
  gravida?: number;
  para?: number;
  abortions?: number;
  livingChildren?: number;
  edd?: Date;
  riskLevel?: 'low' | 'moderate' | 'high';
  riskFactors?: string;
  isActive?: boolean;
  isCompleted?: boolean;
  deliveryDate?: Date;
  deliveryOutcome?: string;
  deliveryRecordId?: string;
}

export interface CreateANCVisitInput {
  bookingId: string;
  visitNumber: number;
  visitDate: Date;
  gestationalAgeWeeks: number;
  weight: number;
  bloodPressure: string;
  fetalHeartRate: number;
  fundalHeight?: number;
  fetalPosition?: string;
  iptpGiven: boolean;
  iptpDoseNumber?: number;
  ttGiven: boolean;
  ttDoseNumber?: number;
  dangerSignsPresent: boolean;
  dangerSignsDescription?: string;
  referralMade: boolean;
  referralReason?: string;
  notes?: string;
}

export interface UpdateANCVisitInput {
  gestationalAgeWeeks?: number;
  weight?: number;
  bloodPressure?: string;
  fetalHeartRate?: number;
  fundalHeight?: number;
  fetalPosition?: string;
  iptpGiven?: boolean;
  iptpDoseNumber?: number;
  ttGiven?: boolean;
  ttDoseNumber?: number;
  dangerSignsPresent?: boolean;
  dangerSignsDescription?: string;
  referralMade?: boolean;
  referralReason?: string;
  notes?: string;
}

export interface CreateDeliveryRecordInput {
  patientId: string;
  attendanceId?: string;
  antenatalBookingId?: string;
  deliveryDate: Date;
  deliveryType: 'spontaneous_vaginal' | 'assisted_vaginal' | 'cesarean_section';
  deliveryOutcome: 'live_birth' | 'stillbirth' | 'miscarriage' | 'ectopic';
  gestationalAgeWeeks: number;
  complications?: string;
  estimatedBloodLoss?: number;
}

export interface CreatePostnatalRecordInput {
  patientId: string;
  deliveryRecordId?: string;
  pncNumber: string;
  registrationDate: Date;
  maternalCondition: 'stable' | 'complicated';
  newbornCondition: 'stable' | 'complicated';
  breastfeedingStatus: 'exclusive' | 'mixed' | 'formula' | 'not_applicable';
  familyPlanningMethod?: string;
  depressionScreening?: string;
  nextVisitDate?: Date;
  notes?: string;
}

export interface AntenatalStatistics {
  totalBookings: number;
  activeBookings: number;
  highRiskBookings: number;
  totalVisits: number;
  iptpDosesGiven: number;
  ttDosesGiven: number;
  averageVisitsPerBooking: number;
}

export interface DeliveryStatistics {
  totalDeliveries: number;
  liveBirths: number;
  stillbirths: number;
  cesareanSections: number;
  vaginalDeliveries: number;
  complications: number;
}
