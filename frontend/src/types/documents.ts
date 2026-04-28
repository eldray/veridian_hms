// src/types/documents.ts
export interface DocumentTemplate {
    id: string;
    name: string;
    code: string;
    templateType: DocumentTemplateType;
    content: string;
    isActive: boolean;
    isDefault: boolean;
    createdById: string;
    createdAt: string;
    updatedAt: string;
  }
  
  export type DocumentTemplateType = 
    | 'receipt'
    | 'referral_letter'
    | 'discharge_summary'
    | 'admission_letter'
    | 'lab_result'
    | 'scan_report'
    | 'prescription'
    | 'nhia_claim_form';
  
  export interface GeneratedDocument {
    id: string;
    templateId: string;
    entityType: string;  // "Bill", "Attendance", "Admission", "ReferralRecord", "LabTest"
    entityId: string;
    filePath: string;
    generatedById: string;
    generatedAt: string;
    
    // Relations (from API response)
    template?: DocumentTemplate;
    generatedBy?: {
      id: string;
      fullName: string;
      username: string;
    };
  }
  
  export interface DocumentGenerationResponse {
    success: boolean;
    message: string;
    data: {
      documentId: string;
      filePath: string;
    };
  }