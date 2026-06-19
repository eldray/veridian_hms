import { FPMethod, FPMethodCategory } from '@prisma/client';

export interface CreateFPServiceInput {
  patientId: string;
  attendanceId?: string;
  serviceDate?: Date;
  method: FPMethod; // ✅ Use Prisma enum
  methodCategory: FPMethodCategory; // ✅ Use Prisma enum
  isNewAcceptor?: boolean;
  counsellingGiven?: boolean;
  informedConsent?: boolean;
  sideEffects?: string;
  contraindications?: string;
  medicalEligibilityCategory?: number;
  nextFollowUpDate?: Date;
  isPostpartum?: boolean;
  isPostAbortion?: boolean;
  postpartumWeeks?: number;
  cypFactor?: number;
  notes?: string;
  providedById: string;
}

export interface UpdateFPServiceInput {
  method?: FPMethod;
  methodCategory?: FPMethodCategory;
  sideEffects?: string;
  contraindications?: string;
  medicalEligibilityCategory?: number;
  nextFollowUpDate?: Date;
  followUpStatus?: string;
  notes?: string;
}

export interface FPServiceFilters {
  patientId?: string;
  method?: string;
  methodCategory?: string;
  startDate?: Date;
  endDate?: Date;
  isNewAcceptor?: boolean;
  page?: number;
  limit?: number;
}

export interface FPStatistics {
  totalServices: number;
  newAcceptors: number;
  currentUsers: number;
  methodMix: Record<string, number>;
  categoryMix: Record<string, number>;
  cyp: number;
}

export interface FPMethodMix {
  method: string;
  category: string;
  count: number;
  percentage: number;
}

export interface FPClientDetails {
  patient: any;
  currentMethod: any;
  fpHistory: any[];
  totalVisits: number;
  lastVisitDate: Date;
  nextFollowUp: Date | null;
}