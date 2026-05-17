import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import { DocumentService } from './DocumentService';

export class DocumentController {
  private documentService: DocumentService;

  constructor() {
    this.documentService = new DocumentService();
  }

  generateReceipt = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { billId } = req.params;
      
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
      }

      const result = await this.documentService.generateReceipt(billId, req.user.id);

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
      next(error);
    }
  };

  generateReferralLetter = async (req: AuthRequest, res: Response, next: NextFunction) => {
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

      res.json({
        success: true,
        message: 'Referral letter generated successfully',
        data: {
          documentId: result.documentId,
          filePath: result.filePath
        }
      });
    } catch (error) {
      next(error);
    }
  };

  generateDischargeSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
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

      res.json({
        success: true,
        message: 'Discharge summary generated successfully',
        data: {
          documentId: result.documentId,
          filePath: result.filePath
        }
      });
    } catch (error) {
      next(error);
    }
  };

  generateLabResult = async (req: AuthRequest, res: Response, next: NextFunction) => {
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

      res.json({
        success: true,
        message: 'Lab result generated successfully',
        data: {
          documentId: result.documentId,
          filePath: result.filePath
        }
      });
    } catch (error) {
      next(error);
    }
  };

  generatePrescription = async (req: AuthRequest, res: Response, next: NextFunction) => {
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

      res.json({
        success: true,
        message: 'Prescription generated successfully',
        data: {
          documentId: result.documentId,
          filePath: result.filePath
        }
      });
    } catch (error) {
      next(error);
    }
  };

  generateBillStatement = async (req: AuthRequest, res: Response, next: NextFunction) => {
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

      res.json({
        success: true,
        message: 'Bill statement generated successfully',
        data: {
          documentId: result.documentId,
          filePath: result.filePath
        }
      });
    } catch (error) {
      next(error);
    }
  };

  getDocumentsByEntity = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { entityType, entityId } = req.params;
      
      const documents = await this.documentService.getDocumentsByEntity(entityType, entityId);
      
      res.json({
        success: true,
        data: documents
      });
    } catch (error) {
      next(error);
    }
  };

  downloadDocument = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      const result = await this.documentService.downloadDocument(id);
      
      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: result.error
        });
      }
      
      res.json({
        success: true,
        filePath: result.filePath
      });
    } catch (error) {
      next(error);
    }
  };

  getDocumentTemplates = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const templates = await this.documentService.getAllTemplates();
      
      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      next(error);
    }
  };

  createDocumentTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { name, code, templateType, content, isDefault } = req.body;
      
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
      }

      const template = await this.documentService.createTemplate(
        { name, code, templateType, content, isDefault },
        req.user.id
      );

      res.status(201).json({
        success: true,
        message: 'Document template created successfully',
        data: template
      });
    } catch (error) {
      next(error);
    }
  };

  updateDocumentTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { name, content, isActive, isDefault } = req.body;

      const template = await this.documentService.updateTemplate(id, {
        name,
        content,
        isActive,
        isDefault
      });

      res.json({
        success: true,
        message: 'Document template updated successfully',
        data: template
      });
    } catch (error) {
      next(error);
    }
  };

  deleteDocumentTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      await this.documentService.deleteTemplate(id);

      res.json({
        success: true,
        message: 'Document template deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  };
}
