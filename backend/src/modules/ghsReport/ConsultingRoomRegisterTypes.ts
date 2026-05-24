// modules/ghsReport/ConsultingRoomRegisterTypes.ts

export interface ConsultingRoomRegisterFilters {
    startDate: Date;
    endDate: Date;
    page?: number;
    limit?: number;
  }
  
  export interface ConsultingRoomRegisterEntry {
    // Header/Identification
    date: string;
    attendanceNumber: string;
    
    // Patient Information
    patientNo: string;
    nhisNo: string | null;
    patientName: string;
    address: string;
    age: number;
    ageGroup: string; // <1, 1-4, 5-9, 10-14, 15-17, 18-19, 20-34, 35-49, 50-59, 60-69, 70+
    telephone: string;
    sex: 'male' | 'female';
    
    // Classification
    patientType: 'NEW' | 'OLD';           // First time visit or returning
    pregnant: boolean;
    isNHIS: boolean;
    
    // Clinical
    provisionalDiagnosis: string;         // Initial assessment
    labTestsRequested: string;            // Comma-separated list
    labResults: string;                   // Key results
    principalDiagnosis: string;           // Final/primary diagnosis
    newDiagnosis: string;                 // New diagnoses added this visit
    oldDiagnosis: string;                 // Existing chronic conditions
    additionalDiagnosis: string;          // Secondary diagnoses
    newAdditionalDiagnosis: string;
    oldAdditionalDiagnosis: string;
    
    // Treatment
    drugsPrescribed: string;              // Comma-separated list
    drugsGiven: string;                   // Actually dispensed (for NHIS)
    
    // Referral
    referredTo: string | null;
    referredFrom: string | null;
    
    // Metadata
    clinician: string;
    attendanceId: string;
  }
  
  export interface ConsultingRoomRegisterReport {
    period: {
      startDate: Date;
      endDate: Date;
      date: string;        // For daily register
      week?: number;       // For weekly register
      month?: string;      // For monthly register
    };
    facility: {
      name: string;
      district: string;
      ghfCode: string;
    };
    summary: {
      totalPatients: number;
      newPatients: number;
      oldPatients: number;
      nhisPatients: number;
      cashPatients: number;
      pregnantWomen: number;
      referrals: number;
    };
    entries: ConsultingRoomRegisterEntry[];
    generatedAt: Date;
  }