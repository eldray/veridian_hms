// src/api/documentApi.ts
import api from './api';

export const documentApi = {
  // Generate documents
  generateReceipt: (billId: string) => 
    api.post<DocumentGenerationResponse>(`/documents/receipt/${billId}`).then(r => r.data),
  
  generateReferralLetter: (referralId: string) => 
    api.post<DocumentGenerationResponse>(`/documents/referral/${referralId}`).then(r => r.data),
  
  generateDischargeSummary: (admissionId: string) => 
    api.post<DocumentGenerationResponse>(`/documents/discharge/${admissionId}`).then(r => r.data),
  
  generateLabResult: (labTestId: string) => 
    api.post<DocumentGenerationResponse>(`/documents/lab-result/${labTestId}`).then(r => r.data),
  
  generatePrescription: (attendanceId: string) => 
    api.post<DocumentGenerationResponse>(`/documents/prescription/${attendanceId}`).then(r => r.data),
  
  // Retrieve documents
  getDocumentsByEntity: (entityType: string, entityId: string) => 
    api.get<{ success: boolean; data: GeneratedDocument[] }>(`/documents/entity/${entityType}/${entityId}`).then(r => r.data),
  
  downloadDocument: (documentId: string) => 
    api.get(`/documents/download/${documentId}`, { responseType: 'blob' }).then(r => r.data),
  
  reprintDocument: (documentId: string) => 
    api.post<DocumentGenerationResponse>(`/documents/reprint/${documentId}`).then(r => r.data),
  
  // Template management (admin)
  getTemplates: () => 
    api.get<{ success: boolean; data: DocumentTemplate[] }>(`/documents/templates`).then(r => r.data),
  
  createTemplate: (data: any) => 
    api.post<{ success: boolean; data: DocumentTemplate }>(`/documents/templates`, data).then(r => r.data),
  
  updateTemplate: (id: string, data: any) => 
    api.put<{ success: boolean; data: DocumentTemplate }>(`/documents/templates/${id}`, data).then(r => r.data),
  
  deleteTemplate: (id: string) => 
    api.delete(`/documents/templates/${id}`).then(r => r.data),
};