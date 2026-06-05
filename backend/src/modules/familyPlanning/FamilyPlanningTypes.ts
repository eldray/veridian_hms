// modules/familyPlanning/FamilyPlanningTypes.ts

export interface CreateFPServiceInput {
    patientId: string;
    attendanceId?: string;
    serviceDate?: Date;
    method: string;
    methodCategory: string;
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
    method?: string;
    methodCategory?: string;
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
    totalClients: number;
    newAcceptors: number;
    currentUsers: number;
    methodMix: Record<string, number>;
    categoryMix: Record<string, number>;
    cyp: number;
    byAgeGroup: Record<string, number>;
    byParity: Record<string, number>;
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