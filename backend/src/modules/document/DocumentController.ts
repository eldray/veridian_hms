// modules/document/DocumentController.ts
import { Response } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import { DocumentService } from './DocumentService';
import { canAccessGeneratedDocument } from '../../services/uploadAccess';
import path from 'path';

export class DocumentController {
  private documentService: DocumentService;

  constructor() {
    this.documentService = new DocumentService();
  }

  // Authorization mirrors the upload route: the staff who generated a document
  // can always reopen it, otherwise the role must match the underlying record.
  private canOpen(
    req: AuthRequest,
    document: { entityType?: string; generatedById?: string },
  ): boolean {
    if (!req.user || !document.entityType || !document.generatedById) return false;
    return canAccessGeneratedDocument(
      { id: req.user.userId || req.user.id, role: req.user.role },
      { entityType: document.entityType, generatedById: document.generatedById },
    );
  }

  generateReceipt = async (req: AuthRequest, res: Response) => {
    try {
      const { billId } = req.params;
      
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
      }

      const paymentId = typeof req.query.paymentId === 'string' ? req.query.paymentId : undefined;
      const result = await this.documentService.generateReceipt(billId, req.user.id, paymentId);

      if (!result.success) {
        const message = result.error || 'Failed to generate receipt';
        // Invalid bill/payment references are client-visible not-found cases;
        // missing templates and generation failures remain server-side errors.
        const status = /^(Bill not found|Payment not found)/i.test(message) ? 404 : 500;
        return res.status(status).json({
          success: false,
          message
        });
      }

      return res.json({
        success: true,
        message: 'Receipt generated successfully',
        data: {
          documentId: result.documentId,
          filePath: result.filePath
        }
      });
    } catch (error: any) {
      console.error('Error generating receipt:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error generating receipt'
      });
    }
  };

  generateReferralLetter = async (req: AuthRequest, res: Response) => {
    try {
      const { referralId } = req.params;
      
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
      }

      const result = await this.documentService.generateReferralLetter(referralId, req.user.id);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error || 'Failed to generate referral letter'
        });
      }

      return res.json({
        success: true,
        message: 'Referral letter generated successfully',
        data: {
          documentId: result.documentId,
          filePath: result.filePath
        }
      });
    } catch (error: any) {
      console.error('Error generating referral letter:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error generating referral letter'
      });
    }
  };

  generateDischargeSummary = async (req: AuthRequest, res: Response) => {
    try {
      const { encounterId } = req.params;
      
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
      }

      const result = await this.documentService.generateDischargeSummary(encounterId, req.user.id);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error
        });
      }

      return res.json({
        success: true,
        message: 'Discharge summary generated successfully',
        data: {
          documentId: result.documentId,
          filePath: result.filePath
        }
      });
    } catch (error: any) {
      console.error('Error generating discharge summary:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error generating discharge summary'
      });
    }
  };

  generateLabResult = async (req: AuthRequest, res: Response) => {
    try {
      const { encounterId } = req.params;
      
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
      }

      const result = await this.documentService.generateLabResult(encounterId, req.user.id);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error
        });
      }

      return res.json({
        success: true,
        message: 'Lab result generated successfully',
        data: {
          documentId: result.documentId,
          filePath: result.filePath
        }
      });
    } catch (error: any) {
      console.error('Error generating lab result:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error generating lab result'
      });
    }
  };

  generatePrescription = async (req: AuthRequest, res: Response) => {
    try {
      const { encounterId } = req.params;
      
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
      }

      const result = await this.documentService.generatePrescription(encounterId, req.user.id);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error
        });
      }

      return res.json({
        success: true,
        message: 'Prescription generated successfully',
        data: {
          documentId: result.documentId,
          filePath: result.filePath
        }
      });
    } catch (error: any) {
      console.error('Error generating prescription:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error generating prescription'
      });
    }
  };

  generateBillStatement = async (req: AuthRequest, res: Response) => {
    try {
      const { billId } = req.params;
      
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
      }

      const result = await this.documentService.generateBillStatement(billId, req.user.id);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error
        });
      }

      return res.json({
        success: true,
        message: 'Bill statement generated successfully',
        data: {
          documentId: result.documentId,
          filePath: result.filePath
        }
      });
    } catch (error: any) {
      console.error('Error generating bill statement:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error generating bill statement'
      });
    }
  };

  reprintDocument = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const result = await this.documentService.downloadDocument(id);
      if (!result.success) {
        return res.status(404).json({ success: false, message: result.error || 'Document not found' });
      }
      if (!this.canOpen(req, result)) {
        return res.status(403).json({ success: false, message: 'Not authorized to access this document' });
      }
      return res.json({
        success: true,
        message: 'Document is ready to reprint',
        data: { documentId: id, filePath: result.filePath, fileName: result.fileName },
      });
    } catch (error: any) {
      console.error('Error preparing document for reprint:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to reprint document' });
    }
  };

  getDocumentsByEntity = async (req: AuthRequest, res: Response) => {
    try {
      const { entityType, entityId } = req.params;
      
      const documents = await this.documentService.getDocumentsByEntity(entityType, entityId);
      
      return res.json({
        success: true,
        data: documents
      });
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error fetching documents'
      });
    }
  };

  downloadDocument = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      const result = await this.documentService.downloadDocument(id);
      
      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: result.error
        });
      }
      
      // Send file for download
      if (!result.filePath) {
        return res.status(404).json({ success: false, message: 'Document file path is unavailable' });
      }
      if (!this.canOpen(req, result)) {
        return res.status(403).json({ success: false, message: 'Not authorized to access this document' });
      }
      const filePath = path.join(process.cwd(), result.filePath);
      return res.download(filePath, result.fileName || 'document.pdf', (err) => {
        if (err) {
          console.error('Download error:', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'Error downloading document'
            });
          }
        }
      });
    } catch (error: any) {
      console.error('Error downloading document:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error downloading document'
      });
    }
  };

  getDocumentTemplates = async (req: AuthRequest, res: Response) => {
    try {
      const templates = await this.documentService.getAllTemplates();
      
      return res.json({
        success: true,
        data: templates
      });
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error fetching templates'
      });
    }
  };

  createDocumentTemplate = async (req: AuthRequest, res: Response) => {
    try {
      const { name, code, templateType, content, isDefault } = req.body;
      
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
      }

      if (!name || !code || !templateType || !content) {
        return res.status(400).json({
          success: false,
          message: 'Name, code, template type, and content are required'
        });
      }

      const template = await this.documentService.createTemplate(
        { name, code, templateType, content, isDefault },
        req.user.id
      );

      return res.status(201).json({
        success: true,
        message: 'Document template created successfully',
        data: template
      });
    } catch (error: any) {
      console.error('Error creating template:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error creating template'
      });
    }
  };

  updateDocumentTemplate = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { name, content, isActive, isDefault } = req.body;

      const template = await this.documentService.updateTemplate(id, {
        name,
        content,
        isActive,
        isDefault
      });

      return res.json({
        success: true,
        message: 'Document template updated successfully',
        data: template
      });
    } catch (error: any) {
      console.error('Error updating template:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error updating template'
      });
    }
  };

  deleteDocumentTemplate = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      await this.documentService.deleteTemplate(id);

      return res.json({
        success: true,
        message: 'Document template deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting template:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error deleting template'
      });
    }
  };
}