// src/store/documentStore.ts
import { create } from 'zustand';
import { 
  generateReceipt,
  generateBillStatement,
  generateReferralLetter,
  generateDischargeSummary,
  generateLabResult,
  generatePrescription,
  getDocumentsByEntity,
  downloadDocument,
  reprintDocument,
  getTemplates,
} from '../api';
import type { GeneratedDocument, DocumentTemplate, DocumentGenerationResponse } from '../types/documents';

interface DocumentState {
  documents: GeneratedDocument[];
  templates: DocumentTemplate[];
  isLoading: boolean;
  error: string | null;

  getDocumentsByEntity: (entityType: string, entityId: string) => Promise<GeneratedDocument[]>;
  generateReceipt: (billId: string) => Promise<DocumentGenerationResponse>;
  generateBillStatement: (billId: string) => Promise<DocumentGenerationResponse>;
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

  getDocumentsByEntity: async (entityType, entityId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getDocumentsByEntity(entityType, entityId);
      const docs = response.data || response;
      set({ documents: docs, isLoading: false });
      return docs;
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  generateReceipt: async (billId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await generateReceipt(billId);
      const doc = response.data || response;
      set((state) => ({
        documents: [doc, ...state.documents],
        isLoading: false,
      }));
      return doc;
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  generateBillStatement: async (billId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await generateBillStatement(billId);
      const doc = response.data || response;
      set((state) => ({
        documents: [doc, ...state.documents],
        isLoading: false,
      }));
      return doc;
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  generateReferralLetter: async (referralId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await generateReferralLetter(referralId);
      const doc = response.data || response;
      set((state) => ({
        documents: [doc, ...state.documents],
        isLoading: false,
      }));
      return doc;
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  generateDischargeSummary: async (admissionId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await generateDischargeSummary(admissionId);
      const doc = response.data || response;
      set((state) => ({
        documents: [doc, ...state.documents],
        isLoading: false,
      }));
      return doc;
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  generateLabResult: async (labTestId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await generateLabResult(labTestId);
      const doc = response.data || response;
      set((state) => ({
        documents: [doc, ...state.documents],
        isLoading: false,
      }));
      return doc;
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  generatePrescription: async (attendanceId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await generatePrescription(attendanceId);
      const doc = response.data || response;
      set((state) => ({
        documents: [doc, ...state.documents],
        isLoading: false,
      }));
      return doc;
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  downloadDocument: async (documentId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await downloadDocument(documentId);
      set({ isLoading: false });
      return response.data || response;
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  reprintDocument: async (documentId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await reprintDocument(documentId);
      const doc = response.data || response;
      set((state) => ({
        documents: [doc, ...state.documents],
        isLoading: false,
      }));
      return doc;
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getTemplates: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await getTemplates();
      const templates = response.data || response;
      set({ templates, isLoading: false });
      return templates;
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
  clearDocuments: () => set({ documents: [] }),
}));
