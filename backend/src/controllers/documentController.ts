// controllers/documentController.ts
// Document Generation Controller
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { DocumentGeneratorService } from '../services/DocumentGeneratorService';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';

const prisma = new PrismaClient();

// ==============================================
// GENERATE BILL RECEIPT
// ==============================================
export const generateReceipt = async (req: AuthRequest, res: Response) => {
  try {
    const { billId } = req.params;
    
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }
    
    const result = await DocumentGeneratorService.generateBillReceipt(
      billId,
      undefined,
      req.user.id
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      message: 'Receipt generated successfully',
      data: {
        documentId: result.documentId,
        filePath: result.filePath
      }
    });
  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating receipt',
      error: (error as Error).message
    });
  }
};

// ==============================================
// GENERATE REFERRAL LETTER
// ==============================================
// In documentController.ts
export const generateReferralLetter = async (req: AuthRequest, res: Response) => {
  try {
    const { referralId } = req.params;
    
    console.log('📝 Generating referral letter for referralId:', referralId);
    console.log('👤 User ID:', req.user?.id);
    
    if (!req.user?.id) {
      console.error('❌ No user ID found');
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }
    
    const result = await DocumentGeneratorService.generateReferralLetterDocument(
      referralId,
      req.user.id
    );
    
    console.log('📄 Generation result:', result);
    
    if (!result.success) {
      console.error('❌ Generation failed:', result.error);
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to generate referral letter'
      });
    }
    
    res.json({
      success: true,
      message: 'Referral letter generated successfully',
      data: {
        documentId: result.documentId,
        filePath: result.filePath
      }
    });
  } catch (error) {
    console.error('❌ Error generating referral letter:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating referral letter',
      error: (error as Error).message,
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    });
  }
};

// ==============================================
// GENERATE DISCHARGE SUMMARY
// ==============================================
export const generateDischargeSummary = async (req: AuthRequest, res: Response) => {
  try {
    const { admissionId } = req.params;
    
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }
    
    const result = await DocumentGeneratorService.generateDischargeSummaryDocument(
      admissionId,
      req.user.id
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      message: 'Discharge summary generated successfully',
      data: {
        documentId: result.documentId,
        filePath: result.filePath
      }
    });
  } catch (error) {
    console.error('Error generating discharge summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating discharge summary',
      error: (error as Error).message
    });
  }
};

// ==============================================
// GENERATE LAB RESULT REPORT
// ==============================================
export const generateLabResult = async (req: AuthRequest, res: Response) => {
  try {
    const { labTestId } = req.params;
    
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }
    
    const result = await DocumentGeneratorService.generateLabResultDocument(
      labTestId,
      req.user.id
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      message: 'Lab result report generated successfully',
      data: {
        documentId: result.documentId,
        filePath: result.filePath
      }
    });
  } catch (error) {
    console.error('Error generating lab result:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating lab result',
      error: (error as Error).message
    });
  }
};

// ==============================================
// GENERATE PRESCRIPTION
// ==============================================
export const generatePrescription = async (req: AuthRequest, res: Response) => {
  try {
    // In generatePrescription function, add:
    const patientAge = calculateAge(data.patient?.dateOfBirth);
    const { attendanceId } = req.params;
    
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }
    
    // Get all medications for this attendance
    const medications = await prisma.medication.findMany({
      where: { 
        attendanceId,
        status: { in: ['prescribed', 'dispensed'] }
      },
      include: {
        StockItem: true,
        prescribedBy: true
      }
    });
    
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        Patient: true,
        User_Attendance_createdByIdToUser: true
      }
    });
    
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance not found'
      });
    }
    
    const prescriptionData = {
      prescriptionDate: new Date(),
      patient: attendance.Patient,
      patientAge: calculateAge(attendance.Patient.dateOfBirth),
      medications: medications.map(m => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        quantity: m.quantity,
        instructions: m.instructions
      })),
      instructions: 'Take medications as prescribed. Complete the full course.',
      prescribedBy: attendance.User_Attendance_createdByIdToUser?.fullName || 'Unknown',
      licenseNumber: attendance.User_Attendance_createdByIdToUser?.licenseNumber
    };
    
    const result = await DocumentGeneratorService.generateDocument({
      documentType: 'prescription',
      entityId: attendanceId,
      entityType: 'Attendance',
      data: prescriptionData,
      generatedById: req.user.id
    });
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      message: 'Prescription generated successfully',
      data: {
        documentId: result.documentId,
        filePath: result.filePath
      }
    });
  } catch (error) {
    console.error('Error generating prescription:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating prescription',
      error: (error as Error).message
    });
  }
};

// ==============================================
// DOWNLOAD DOCUMENT - FIXED VERSION
// ==============================================
export const downloadDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    
    const document = await prisma.generatedDocument.findUnique({
      where: { id: documentId }
    });
    
    if (!document || !document.filePath) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    // Construct absolute path
    // document.filePath is like '/uploads/documents/filename.pdf'
    const fileName = path.basename(document.filePath);
    const absolutePath = path.join(process.cwd(), 'uploads', 'documents', fileName);
    
    // Check if file exists
    try {
      await fs.access(absolutePath);
    } catch {
      return res.status(404).json({
        success: false,
        message: 'Document file not found on server'
      });
    }
    
    res.download(absolutePath, fileName);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading document',
      error: (error as Error).message
    });
  }
};

// ==============================================
// GET DOCUMENTS BY ENTITY
// ==============================================
export const getDocumentsByEntity = async (req: AuthRequest, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    
    const documents = await DocumentGeneratorService.getDocumentByEntity(
      entityType,
      entityId
    );
    
    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching documents',
      error: (error as Error).message
    });
  }
};

// ==============================================
// REPRINT DOCUMENT
// ==============================================
export const reprintDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    
    const result = await DocumentGeneratorService.reprintDocument(documentId);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      message: 'Document ready for reprint',
      data: {
        documentId: result.documentId,
        filePath: result.filePath
      }
    });
  } catch (error) {
    console.error('Error reprinting document:', error);
    res.status(500).json({
      success: false,
      message: 'Error reprinting document',
      error: (error as Error).message
    });
  }
};

// ==============================================
// GET DOCUMENT TEMPLATES
// ==============================================
export const getDocumentTemplates = async (req: AuthRequest, res: Response) => {
  try {
    const templates = await prisma.documentTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching document templates',
      error: (error as Error).message
    });
  }
};

// ==============================================
// CREATE DOCUMENT TEMPLATE
// ==============================================
export const createDocumentTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { name, code, templateType, content, isDefault } = req.body;
    
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }
    
    const template = await prisma.documentTemplate.create({
      data: {
        name,
        code,
        templateType,
        content,
        isDefault: isDefault || false,
        isActive: true,
        createdById: req.user.id
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Document template created successfully',
      data: template
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating document template',
      error: (error as Error).message
    });
  }
};

// ==============================================
// UPDATE DOCUMENT TEMPLATE
// ==============================================
export const updateDocumentTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, content, isActive, isDefault } = req.body;
    
    const template = await prisma.documentTemplate.update({
      where: { id },
      data: {
        name,
        content,
        isActive,
        isDefault,
        updatedAt: new Date()
      }
    });
    
    res.json({
      success: true,
      message: 'Document template updated successfully',
      data: template
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating document template',
      error: (error as Error).message
    });
  }
};

// ==============================================
// DELETE DOCUMENT TEMPLATE
// ==============================================
export const deleteDocumentTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.documentTemplate.delete({
      where: { id }
    });
    
    res.json({
      success: true,
      message: 'Document template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting document template',
      error: (error as Error).message
    });
  }
};

// ==============================================
// HELPER FUNCTION
// ==============================================
function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Add this to documentController.ts if not already there
export const generateBillStatement = async (req: AuthRequest, res: Response) => {
  try {
    const { billId } = req.params;
    
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }
    
    const result = await DocumentGeneratorService.generateBillStatement(billId, req.user.id);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      message: 'Bill statement generated successfully',
      data: {
        documentId: result.documentId,
        filePath: result.filePath
      }
    });
  } catch (error) {
    console.error('Error generating bill statement:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating bill statement',
      error: (error as Error).message
    });
  }
};

