import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { InsuranceClaimService } from './InsuranceClaimService';
import { AuthRequest } from '../../middleware/authMiddleware';

const prisma = new PrismaClient();

export class InsuranceClaimController extends BaseController {
  private service: InsuranceClaimService;

  constructor() {
    super();
    this.service = new InsuranceClaimService(prisma);
  }

  // ==========================================
  // BATCH CONTROLLERS
  // ==========================================
  createClaimBatch = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const batch = await this.service.createClaimBatch(req.body.claimIds, req.body.description, req.body.insuranceType, req.user!.id);
    return this.created(res, batch, 'Claim batch created successfully');
  });

  getClaimBatches = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const result = await this.service.getClaimBatches(req.query.status as string, req.query.startDate ? new Date(req.query.startDate as string) : undefined, req.query.endDate ? new Date(req.query.endDate as string) : undefined, page, limit);
    return this.paginated(res, result.data, result.pagination, 'Claim batches retrieved');
  });

  getClaimBatch = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const batch = await this.service.getClaimBatch(req.params.id);
    return this.ok(res, batch, 'Claim batch retrieved');
  });

  addClaimsToBatch = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const batch = await this.service.addClaimsToBatch(req.params.batchId, req.body.claimIds);
    return this.ok(res, batch, 'Claims added to batch');
  });

  removeClaimsFromBatch = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const batch = await this.service.removeClaimsFromBatch(req.params.batchId, req.body.claimIds);
    return this.ok(res, batch, 'Claims removed from batch');
  });

  generateBatchXML = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.generateBatchXML(req.params.batchId);
    res.set('Content-Type', 'application/xml');
    res.set('Content-Disposition', `attachment; filename="batch_${result.batchNumber}.xml"`);
    return res.send(result.xml);
  });

  updateBatchStatus = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const batch = await this.service.updateBatchStatus(req.params.batchId, req.body.status);
    return this.ok(res, batch, 'Batch status updated');
  });

  deleteClaimBatch = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const batch = await this.service.deleteClaimBatch(req.params.batchId);
    return this.ok(res, batch, 'Batch deleted');
  });

  // ==========================================
  // GENERAL CLAIM CONTROLLERS
  // ==========================================
  getAllInsuranceClaims = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const result = await this.service.getAllInsuranceClaims(req.query.status as any, req.query.insuranceProviderId as string, req.query.patientId as string, req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined, req.query.dateTo ? new Date(req.query.dateTo as string) : undefined, page, limit);
    return this.paginated(res, result.data, result.pagination, 'Insurance claims retrieved');
  });

  getInsuranceClaim = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const claim = await this.service.getInsuranceClaim(req.params.id);
    return this.ok(res, claim, 'Claim retrieved');
  });

  getClaimByAttendanceId = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const claim = await this.service.getClaimByAttendanceId(req.params.attendanceId);
    return this.ok(res, claim, 'Claim retrieved');
  });

  updateClaimDraft = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const claim = await this.service.updateClaimDraft(req.params.claimId, req.body, req.user!.id);
    return this.ok(res, claim, 'Claim updated');
  });

  // Alias for updateClaimDraft to support your original route
  updateInsuranceClaim = this.updateClaimDraft;

  finalizeClaim = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const claim = await this.service.finalizeClaim(req.params.claimId, req.user!.id);
    return this.ok(res, claim, 'Claim finalized');
  });

  updateClaimStatus = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const claim = await this.service.updateClaimStatus(req.params.claimId, req.body.status, req.body.notes, req.user!.id);
    return this.ok(res, claim, `Claim status updated to ${req.body.status}`);
  });

  getFinalizedClaimsTotal = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getFinalizedClaimsTotal(req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined, req.query.dateTo ? new Date(req.query.dateTo as string) : undefined, req.query.type as string);
    return this.ok(res, result, 'Finalized claims total retrieved');
  });

  // ==========================================
  // NHIS CONTROLLERS
  // ==========================================
  generateNHISClaim = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.generateNHISClaim(req.body.attendanceId, req.user!.id);
    return this.created(res, result.claim, result.isExisting ? 'NHIS claim already exists' : 'NHIS claim generated');
  });

  getNHISClaims = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const result = await this.service.getNHISClaims(req.query.status as string, req.query.patientId as string, req.query.startDate ? new Date(req.query.startDate as string) : undefined, req.query.endDate ? new Date(req.query.endDate as string) : undefined, page, limit);
    return this.paginated(res, result.data, result.pagination, 'NHIS claims retrieved');
  });

  // ==========================================
  // PRIVATE INSURANCE CONTROLLERS
  // ==========================================
  generatePrivateInsuranceClaim = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.generatePrivateInsuranceClaim(req.body.attendanceId, req.user!.id);
    return this.created(res, result.claim, result.isExisting ? 'Private claim already exists' : 'Private claim generated');
  });

  getPrivateInsuranceClaims = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const result = await this.service.getPrivateInsuranceClaims(req.query.status as string, req.query.patientId as string, req.query.startDate ? new Date(req.query.startDate as string) : undefined, req.query.endDate ? new Date(req.query.endDate as string) : undefined, page, limit);
    return this.paginated(res, result.data, result.pagination, 'Private insurance claims retrieved');
  });

  // ==========================================
  // CORPORATE CONTROLLERS
  // ==========================================
  generateCorporateClaim = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.generateCorporateClaim(req.body.attendanceId, req.user!.id);
    return this.created(res, result.claim, result.isExisting ? 'Corporate claim already exists' : 'Corporate claim generated', result.creditInfo);
  });

  getCorporateClaims = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const result = await this.service.getCorporateClaims(req.query.status as string, req.query.patientId as string, req.query.startDate ? new Date(req.query.startDate as string) : undefined, req.query.endDate ? new Date(req.query.endDate as string) : undefined, req.query.corporateAccountId as string, page, limit);
    return this.paginated(res, result.data, result.pagination, 'Corporate claims retrieved');
  });

  // ==========================================
  // XML & PRINT CONTROLLERS
  // ==========================================
  generateClaimXML = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    // Placeholder as per your original code
    return res.status(501).json({ success: false, message: 'Single claim XML generation not implemented yet. Use Batch XML.' });
  });

  generateClaimPrint = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const claim = await this.service.getInsuranceClaim(req.params.claimId);
    return this.ok(res, claim, 'Claim print data retrieved');
  });
}

export const insuranceClaimController = new InsuranceClaimController();