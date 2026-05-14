// src/store/documentStore.ts - Make sure generateBillStatement is included
import { create } from 'zustand';
import { documentApi } from '../api/documentApi';
import type { GeneratedDocument, DocumentTemplate, DocumentGenerationResponse } from '../types/documents';

interface DocumentState {
  // State
  documents: GeneratedDocument[];
  templates: DocumentTemplate[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  getDocumentsByEntity: (entityType: string, entityId: string) => Promise<GeneratedDocument[]>;
  generateReceipt: (billId: string) => Promise<DocumentGenerationResponse>;
  generateBillStatement: (billId: string) => Promise<DocumentGenerationResponse>;  // ✅ ADD THIS
  generateReferralLetter: (referralId: string) => Promise<DocumentGenerationResponse>;
  generateDischargeSummary: (admissionId: string) => Promise<DocumentGenerationResponse>;
  generateLabResult: (labTestId: string) => Promise<DocumentGenerationResponse>;
  generatePrescription: (attendanceId: string) => Promise<DocumentGenerationResponse>;
  downloadDocument: (documentId: string) => Promise<Blob>;
  reprintDocument: (documentId: string) => Promise<DocumentGenerationResponse>;
  getTemplates: () => Promise<DocumentTemplate[]>;
  clearError: () => void;
  clearDocuments: () => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  templates: [],
  isLoading: false,
  error: null,

  getDocumentsByEntity: async (entityType: string, entityId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await documentApi.getDocumentsByEntity(entityType, entityId);
      const documents = response.data;
      set({ documents, isLoading: false });
      return documents;
    } catch (error: unknown) {
      const errorMsg = error.response?.data?.message || 'Failed to fetch documents';
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  generateReceipt: async (billId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await documentApi.generateReceipt(billId);
      set({ isLoading: false });
      return response;
    } catch (error: unknown) {
      const errorMsg = error.response?.data?.message || 'Failed to generate receipt';
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  // ✅ ADD THIS
  generateBillStatement: async (billId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await documentApi.generateBillStatement(billId);
      set({ isLoading: false });
      return response;
    } catch (error: unknown) {
      const errorMsg = error.response?.data?.message || 'Failed to generate bill statement';
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  generateReferralLetter: async (referralId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await documentApi.generateReferralLetter(referralId);
      set({ isLoading: false });
      return response;
    } catch (error: unknown) {
      const errorMsg = error.response?.data?.message || 'Failed to generate referral letter';
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  generateDischargeSummary: async (admissionId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await documentApi.generateDischargeSummary(admissionId);
      set({ isLoading: false });
      return response;
    } catch (error: unknown) {
      const errorMsg = error.response?.data?.message || 'Failed to generate discharge summary';
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  generateLabResult: async (labTestId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await documentApi.generateLabResult(labTestId);
      set({ isLoading: false });
      return response;
    } catch (error: unknown) {
      const errorMsg = error.response?.data?.message || 'Failed to generate lab result';
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  generatePrescription: async (attendanceId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await documentApi.generatePrescription(attendanceId);
      set({ isLoading: false });
      return response;
    } catch (error: unknown) {
      const errorMsg = error.response?.data?.message || 'Failed to generate prescription';
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  downloadDocument: async (documentId: string) => {
    set({ isLoading: true, error: null });
    try {
      const blob = await documentApi.downloadDocument(documentId);
      set({ isLoading: false });
      return blob;
    } catch (error: unknown) {
      const errorMsg = error.response?.data?.message || 'Failed to download document';
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  reprintDocument: async (documentId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await documentApi.reprintDocument(documentId);
      set({ isLoading: false });
      return response;
    } catch (error: unknown) {
      const errorMsg = error.response?.data?.message || 'Failed to reprint document';
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  getTemplates: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await documentApi.getTemplates();
      const templates = response.data;
      set({ templates, isLoading: false });
      return templates;
    } catch (error: unknown) {
      const errorMsg = error.response?.data?.message || 'Failed to fetch templates';
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
  clearDocuments: () => set({ documents: [] }),
}));