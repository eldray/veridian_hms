// modules/insuranceClaim/insuranceClaim.controller.ts
import { Response } from 'express';
import { BaseController } from '../../shared/base/BaseController';
import { AuthRequest } from '../../middleware/authMiddleware';
import * as insuranceClaimService from './insuranceClaim.service';

export class InsuranceClaimController extends BaseController {

  // ==========================================
  // CLAIM BATCH CONTROLLERS
  // ==========================================

  createClaimBatch = async (req: AuthRequest, res: Response) => {
    try {
      const { claimIds, description, insuranceType } = req.body;
      
      if (!req.user?.id) {
        return this.unauthorized(res, 'Authentication required');
      }

      const batch = await insuranceClaimService.createClaimBatch(
        claimIds,
        description,
        insuranceType,
        req.user.id
      );

      this.created(res, batch, 'Claim batch created successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };

  getClaimBatches = async (req: AuthRequest, res: Response) => {
    try {
      const { status, startDate, endDate, page = 1, limit = 50 } = req.query;

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

      const result = await insuranceClaimService.getClaimBatches(
        status as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        pageNum,
        limitNum
      );

      this.paginated(res, result.data, result.pagination, 'Claim batches retrieved successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  getClaimBatch = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const batch = await insuranceClaimService.getClaimBatch(id);
      this.ok(res, batch, 'Claim batch retrieved successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };

  addClaimsToBatch = async (req: AuthRequest, res: Response) => {
    try {
      const { batchId } = req.params;
      const { claimIds } = req.body;
      const batch = await insuranceClaimService.addClaimsToBatch(batchId, claimIds);
      this.ok(res, batch, 'Claims added to batch successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };

  removeClaimsFromBatch = async (req: AuthRequest, res: Response) => {
    try {
      const { batchId } = req.params;
      const { claimIds } = req.body;
      const batch = await insuranceClaimService.removeClaimsFromBatch(batchId, claimIds);
      this.ok(res, batch, 'Claims removed from batch successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };

  generateBatchXML = async (req: AuthRequest, res: Response) => {
    try {
      const { batchId } = req.params;
      const result = await insuranceClaimService.generateBatchXML(batchId);
      res.set('Content-Type', 'application/xml');
      res.set('Content-Disposition', `attachment; filename="batch_${result.batchNumber}.xml"`);
      res.send(result.xml);
    } catch (error: any) {
      this.error(res, error);
    }
  };

  updateBatchStatus = async (req: AuthRequest, res: Response) => {
    try {
      const { batchId } = req.params;
      const { status } = req.body;
      const batch = await insuranceClaimService.updateBatchStatus(batchId, status);
      this.ok(res, batch, 'Batch status updated successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };

  deleteClaimBatch = async (req: AuthRequest, res: Response) => {
    try {
      const { batchId } = req.params;
      const batch = await insuranceClaimService.deleteClaimBatch(batchId);
      this.ok(res, batch, 'Batch deleted successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };

  // ==========================================
  // GENERAL CLAIM CONTROLLERS
  // ==========================================

  getAllInsuranceClaims = async (req: AuthRequest, res: Response) => {
    try {
      const {
        status,
        insuranceProviderId,
        patientId,
        dateFrom,
        dateTo,
        page = 1,
        limit = 50
      } = req.query;

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

      const result = await insuranceClaimService.getAllInsuranceClaims(
        status as string | string[],
        insuranceProviderId as string,
        patientId as string,
        dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo ? new Date(dateTo as string) : undefined,
        pageNum,
        limitNum
      );

      this.paginated(res, result.data, result.pagination, 'Insurance claims retrieved successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  getInsuranceClaim = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const claim = await insuranceClaimService.getInsuranceClaim(id);
      this.ok(res, claim, 'Claim retrieved successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };

  getClaimByAttendanceId = async (req: AuthRequest, res: Response) => {
    try {
      const { attendanceId } = req.params;
      const claim = await insuranceClaimService.getClaimByAttendanceId(attendanceId);
      this.ok(res, claim, 'Claim retrieved successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };

  updateClaimDraft = async (req: AuthRequest, res: Response) => {
    try {
      const { claimId } = req.params;
      
      if (!req.user?.id) {
        return this.unauthorized(res, 'Authentication required');
      }

      const claim = await insuranceClaimService.updateClaimDraft(claimId, req.body, req.user.id);
      this.ok(res, claim, 'Claim updated successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  finalizeClaim = async (req: AuthRequest, res: Response) => {
    try {
      const { claimId } = req.params;
      
      if (!req.user?.id) {
        return this.unauthorized(res, 'Authentication required');
      }

      const finalizedClaim = await insuranceClaimService.finalizeClaim(claimId, req.user.id);
      this.ok(res, finalizedClaim, 'Claim finalized successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };

  // modules/insuranceClaim/insuranceClaim.controller.ts

updateInsuranceClaim = async (req: AuthRequest, res: Response) => {
  try {
    const { claimId } = req.params;
    const updateData = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Use the existing updateClaimDraft function or create a new one
    const claim = await insuranceClaimService.updateClaimDraft(claimId, updateData, userId);

    res.json({
      success: true,
      data: claim,
      message: 'Claim updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating claim:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update claim'
    });
  }
};

  updateClaimStatus = async (req: AuthRequest, res: Response) => {
    try {
      const { claimId } = req.params;
      const { status, notes } = req.body;
      
      if (!req.user?.id) {
        return this.unauthorized(res, 'Authentication required');
      }

      const claim = await insuranceClaimService.updateClaimStatus(claimId, status, notes, req.user.id);
      this.ok(res, claim, `Claim status updated to ${status}`);
    } catch (error: any) {
      this.error(res, error);
    }
  };

  getFinalizedClaimsTotal = async (req: AuthRequest, res: Response) => {
    try {
      const { dateFrom, dateTo, type } = req.query;
      const result = await insuranceClaimService.getFinalizedClaimsTotal(
        dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo ? new Date(dateTo as string) : undefined,
        type as string
      );
      this.ok(res, result, 'Finalized claims total retrieved successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  // ==========================================
  // NHIS CLAIM CONTROLLERS
  // ==========================================

  generateNHISClaim = async (req: AuthRequest, res: Response) => {
    try {
      const { attendanceId } = req.body;
      
      if (!req.user?.id) {
        return this.unauthorized(res, 'Authentication required');
      }

      const result = await insuranceClaimService.generateNHISClaim(attendanceId, req.user.id);

      this.created(res, result.claim, result.isExisting ? 'NHIS claim already exists' : 'NHIS claim generated successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };

  getNHISClaims = async (req: AuthRequest, res: Response) => {
    try {
      const { status, patientId, startDate, endDate, page = 1, limit = 50 } = req.query;

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

      const result = await insuranceClaimService.getNHISClaims(
        status as string,
        patientId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        pageNum,
        limitNum
      );

      this.paginated(res, result.data, result.pagination, 'NHIS claims retrieved successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  // ==========================================
  // PRIVATE INSURANCE CLAIM CONTROLLERS
  // ==========================================

  generatePrivateInsuranceClaim = async (req: AuthRequest, res: Response) => {
    try {
      const { attendanceId } = req.body;
      
      if (!req.user?.id) {
        return this.unauthorized(res, 'Authentication required');
      }

      const result = await insuranceClaimService.generatePrivateInsuranceClaim(attendanceId, req.user.id);

      this.created(res, result.claim, result.isExisting ? 'Private claim already exists' : 'Private claim generated successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };

  getPrivateInsuranceClaims = async (req: AuthRequest, res: Response) => {
    try {
      const { status, patientId, startDate, endDate, page = 1, limit = 50 } = req.query;

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

      const result = await insuranceClaimService.getPrivateInsuranceClaims(
        status as string,
        patientId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        pageNum,
        limitNum
      );

      this.paginated(res, result.data, result.pagination, 'Private insurance claims retrieved successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  // ==========================================
  // CORPORATE CLAIM CONTROLLERS
  // ==========================================

  generateCorporateClaim = async (req: AuthRequest, res: Response) => {
    try {
      const { attendanceId } = req.body;
      
      if (!req.user?.id) {
        return this.unauthorized(res, 'Authentication required');
      }

      const result = await insuranceClaimService.generateCorporateClaim(attendanceId, req.user.id);

      this.created(res, result.claim, result.isExisting ? 'Corporate claim already exists' : 'Corporate claim generated successfully', result.creditInfo);
    } catch (error: any) {
      this.error(res, error);
    }
  };

  getCorporateClaims = async (req: AuthRequest, res: Response) => {
    try {
      const { status, patientId, startDate, endDate, corporateAccountId, page = 1, limit = 50 } = req.query;

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

      const result = await insuranceClaimService.getCorporateClaims(
        status as string,
        patientId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        corporateAccountId as string,
        pageNum,
        limitNum
      );

      this.paginated(res, result.data, result.pagination, 'Corporate claims retrieved successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  // ==========================================
  // XML & PRINT CONTROLLERS
  // ==========================================

  generateClaimXML = async (req: AuthRequest, res: Response) => {
    try {
      const { claimId } = req.params;
      // This would need the XML generator service - keeping placeholder
      res.status(501).json({
        success: false,
        message: 'XML generation not implemented in module yet'
      });
    } catch (error) {
      this.error(res, error);
    }
  };

  generateClaimPrint = async (req: AuthRequest, res: Response) => {
    try {
      const { claimId } = req.params;
      const claim = await insuranceClaimService.getInsuranceClaim(claimId);
      this.ok(res, claim, 'Claim print data retrieved successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };
}

export const insuranceClaimController = new InsuranceClaimController();