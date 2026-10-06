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

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
    return (error as any).message;
  }
  return 'Something went wrong';
};

const unwrapData = <T>(payload: any): T => {
  if (payload == null) return payload;
  if (Array.isArray(payload)) return payload;
  if (payload.data !== undefined) return unwrapData(payload.data);
  return payload;
};

const normalizeGeneratedDocument = (payload: any, fallbackType: string, fallbackId?: string): GeneratedDocument => {
  const doc = payload?.data ?? payload;
  const identifier = doc?.documentId ?? doc?.id ?? fallbackId ?? '';
  return {
    id: identifier,
    templateId: doc?.templateId ?? '',
    entityType: doc?.entityType ?? fallbackType,
    entityId: doc?.entityId ?? fallbackId ?? '',
    filePath: doc?.filePath ?? '',
    generatedById: doc?.generatedById ?? '',
    generatedAt: doc?.generatedAt ?? new Date().toISOString(),
    template: doc?.template,
    generatedBy: doc?.generatedBy,
  };
};

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

export const useDocumentStore = create<DocumentState>((set) => ({
  documents: [],
  templates: [],
  isLoading: false,
  error: null,

  getDocumentsByEntity: async (entityType, entityId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getDocumentsByEntity(entityType, entityId);
      const docs = (unwrapData<GeneratedDocument[]>(response) ?? []) as GeneratedDocument[];
      set({ documents: docs, isLoading: false });
      return docs;
    } catch (error: unknown) {
      const message = toErrorMessage(error);
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  generateReceipt: async (billId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await generateReceipt(billId);
      const doc = normalizeGeneratedDocument(response, 'bill', billId);
      set((state) => ({
        documents: [doc, ...state.documents],
        isLoading: false,
      }));
      return { success: true, message: 'Receipt generated successfully', data: { documentId: doc.id, filePath: doc.filePath } };
    } catch (error: unknown) {
      const message = toErrorMessage(error);
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  generateBillStatement: async (billId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await generateBillStatement(billId);
      const doc = normalizeGeneratedDocument(response, 'bill', billId);
      set((state) => ({
        documents: [doc, ...state.documents],
        isLoading: false,
      }));
      return { success: true, message: 'Bill statement generated successfully', data: { documentId: doc.id, filePath: doc.filePath } };
    } catch (error: unknown) {
      const message = toErrorMessage(error);
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  generateReferralLetter: async (referralId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await generateReferralLetter(referralId);
      const doc = normalizeGeneratedDocument(response, 'referral', referralId);
      set((state) => ({
        documents: [doc, ...state.documents],
        isLoading: false,
      }));
      return { success: true, message: 'Referral letter generated successfully', data: { documentId: doc.id, filePath: doc.filePath } };
    } catch (error: unknown) {
      const message = toErrorMessage(error);
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  generateDischargeSummary: async (admissionId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await generateDischargeSummary(admissionId);
      const doc = normalizeGeneratedDocument(response, 'admission', admissionId);
      set((state) => ({
        documents: [doc, ...state.documents],
        isLoading: false,
      }));
      return { success: true, message: 'Discharge summary generated successfully', data: { documentId: doc.id, filePath: doc.filePath } };
    } catch (error: unknown) {
      const message = toErrorMessage(error);
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  generateLabResult: async (labTestId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await generateLabResult(labTestId);
      const doc = normalizeGeneratedDocument(response, 'lab_test', labTestId);
      set((state) => ({
        documents: [doc, ...state.documents],
        isLoading: false,
      }));
      return { success: true, message: 'Lab result generated successfully', data: { documentId: doc.id, filePath: doc.filePath } };
    } catch (error: unknown) {
      const message = toErrorMessage(error);
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  generatePrescription: async (attendanceId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await generatePrescription(attendanceId);
      const doc = normalizeGeneratedDocument(response, 'encounter', attendanceId);
      set((state) => ({
        documents: [doc, ...state.documents],
        isLoading: false,
      }));
      return { success: true, message: 'Prescription generated successfully', data: { documentId: doc.id, filePath: doc.filePath } };
    } catch (error: unknown) {
      const message = toErrorMessage(error);
      set({ error: message, isLoading: false });
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
      const message = toErrorMessage(error);
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  reprintDocument: async (documentId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await reprintDocument(documentId);
      const doc = normalizeGeneratedDocument(response, 'document', documentId);
      set((state) => ({
        documents: [doc, ...state.documents],
        isLoading: false,
      }));
      return { success: true, message: 'Document reprinted successfully', data: { documentId: doc.id, filePath: doc.filePath } };
    } catch (error: unknown) {
      const message = toErrorMessage(error);
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  getTemplates: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await getTemplates();
      const templates = (unwrapData<DocumentTemplate[]>(response) ?? []) as DocumentTemplate[];
      set({ templates, isLoading: false });
      return templates;
    } catch (error: unknown) {
      const message = toErrorMessage(error);
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
  clearDocuments: () => set({ documents: [] }),
}));
