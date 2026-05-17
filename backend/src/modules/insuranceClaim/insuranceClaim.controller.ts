// modules/insuranceClaim/insuranceClaim.controller.ts
import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import * as insuranceClaimService from './insuranceClaim.service';

// ==========================================
// CLAIM BATCH CONTROLLERS
// ==========================================

export const createClaimBatch = async (req: AuthRequest, res: Response) => {
  try {
    const { claimIds, description, insuranceType } = req.body;
    
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const batch = await insuranceClaimService.createClaimBatch(
      claimIds,
      description,
      insuranceType,
      req.user.id
    );

    res.status(201).json({
      success: true,
      message: 'Claim batch created successfully',
      data: batch
    });
  } catch (error: any) {
    console.error('Error creating claim batch:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating claim batch'
    });
  }
};

export const getClaimBatches = async (req: AuthRequest, res: Response) => {
  try {
    const { status, startDate, endDate, page = 1, limit = 50 } = req.query;

    const result = await insuranceClaimService.getClaimBatches(
      status as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching claim batches:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching claim batches'
    });
  }
};

export const getClaimBatch = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const batch = await insuranceClaimService.getClaimBatch(id);

    res.json({
      success: true,
      data: batch
    });
  } catch (error: any) {
    console.error('Error fetching claim batch:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching claim batch'
    });
  }
};

export const addClaimsToBatch = async (req: AuthRequest, res: Response) => {
  try {
    const { batchId } = req.params;
    const { claimIds } = req.body;

    const batch = await insuranceClaimService.addClaimsToBatch(batchId, claimIds);

    res.json({
      success: true,
      message: 'Claims added to batch successfully',
      data: batch
    });
  } catch (error: any) {
    console.error('Error adding claims to batch:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error adding claims to batch'
    });
  }
};

export const removeClaimsFromBatch = async (req: AuthRequest, res: Response) => {
  try {
    const { batchId } = req.params;
    const { claimIds } = req.body;

    const batch = await insuranceClaimService.removeClaimsFromBatch(batchId, claimIds);

    res.json({
      success: true,
      message: 'Claims removed from batch successfully',
      data: batch
    });
  } catch (error: any) {
    console.error('Error removing claims from batch:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error removing claims from batch'
    });
  }
};

export const generateBatchXML = async (req: AuthRequest, res: Response) => {
  try {
    const { batchId } = req.params;

    const result = await insuranceClaimService.generateBatchXML(batchId);

    res.set('Content-Type', 'application/xml');
    res.set('Content-Disposition', `attachment; filename="batch_${result.batchNumber}.xml"`);
    res.send(result.xml);
  } catch (error: any) {
    console.error('Error generating batch XML:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error generating batch XML'
    });
  }
};

export const updateBatchStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { batchId } = req.params;
    const { status } = req.body;

    const batch = await insuranceClaimService.updateBatchStatus(batchId, status);

    res.json({
      success: true,
      message: 'Batch status updated successfully',
      data: batch
    });
  } catch (error: any) {
    console.error('Error updating batch status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating batch status'
    });
  }
};

export const deleteClaimBatch = async (req: AuthRequest, res: Response) => {
  try {
    const { batchId } = req.params;

    const batch = await insuranceClaimService.deleteClaimBatch(batchId);

    res.json({
      success: true,
      message: 'Batch deleted successfully',
      data: batch
    });
  } catch (error: any) {
    console.error('Error deleting claim batch:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting claim batch'
    });
  }
};

// ==========================================
// GENERAL CLAIM CONTROLLERS
// ==========================================

export const getAllInsuranceClaims = async (req: AuthRequest, res: Response) => {
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

    const result = await insuranceClaimService.getAllInsuranceClaims(
      status as string | string[],
      insuranceProviderId as string,
      patientId as string,
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching insurance claims:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching insurance claims'
    });
  }
};

export const getInsuranceClaim = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const claim = await insuranceClaimService.getInsuranceClaim(id);

    res.json({
      success: true,
      data: claim
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching claim'
    });
  }
};

export const getClaimByAttendanceId = async (req: AuthRequest, res: Response) => {
  try {
    const { attendanceId } = req.params;

    const claim = await insuranceClaimService.getClaimByAttendanceId(attendanceId);

    res.json({
      success: true,
      data: claim
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching claim'
    });
  }
};

export const updateClaimDraft = async (req: AuthRequest, res: Response) => {
  try {
    const { claimId } = req.params;
    
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const claim = await insuranceClaimService.updateClaimDraft(claimId, req.body, req.user.id);

    res.json({
      success: true,
      message: 'Claim updated',
      data: claim
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating claim'
    });
  }
};

export const finalizeClaim = async (req: AuthRequest, res: Response) => {
  try {
    const { claimId } = req.params;
    
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const finalizedClaim = await insuranceClaimService.finalizeClaim(claimId, req.user.id);

    res.json({
      success: true,
      message: 'Claim finalized',
      data: finalizedClaim
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error finalizing claim'
    });
  }
};

export const updateClaimStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { claimId } = req.params;
    const { status, notes } = req.body;
    
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const claim = await insuranceClaimService.updateClaimStatus(claimId, status, notes, req.user.id);

    res.json({
      success: true,
      message: `Claim status updated to ${status}`,
      data: claim
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating status'
    });
  }
};

export const getFinalizedClaimsTotal = async (req: AuthRequest, res: Response) => {
  try {
    const { dateFrom, dateTo, type } = req.query;

    const result = await insuranceClaimService.getFinalizedClaimsTotal(
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined,
      type as string
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching totals'
    });
  }
};

// ==========================================
// NHIS CLAIM CONTROLLERS
// ==========================================

export const generateNHISClaim = async (req: AuthRequest, res: Response) => {
  try {
    const { attendanceId } = req.body;
    
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const result = await insuranceClaimService.generateNHISClaim(attendanceId, req.user.id);

    res.status(201).json({
      success: true,
      message: result.isExisting ? 'NHIS claim already exists' : 'NHIS claim generated',
      data: result.claim
    });
  } catch (error: any) {
    console.error('Error generating NHIS claim:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getNHISClaims = async (req: AuthRequest, res: Response) => {
  try {
    const { status, patientId, startDate, endDate, page = 1, limit = 50 } = req.query;

    const result = await insuranceClaimService.getNHISClaims(
      status as string,
      patientId as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching NHIS claims'
    });
  }
};

// ==========================================
// PRIVATE INSURANCE CLAIM CONTROLLERS
// ==========================================

export const generatePrivateInsuranceClaim = async (req: AuthRequest, res: Response) => {
  try {
    const { attendanceId } = req.body;
    
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const result = await insuranceClaimService.generatePrivateInsuranceClaim(attendanceId, req.user.id);

    res.status(201).json({
      success: true,
      message: result.isExisting ? 'Private claim already exists' : 'Private claim generated',
      data: result.claim
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getPrivateInsuranceClaims = async (req: AuthRequest, res: Response) => {
  try {
    const { status, patientId, startDate, endDate, page = 1, limit = 50 } = req.query;

    const result = await insuranceClaimService.getPrivateInsuranceClaims(
      status as string,
      patientId as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching private claims'
    });
  }
};

// ==========================================
// CORPORATE CLAIM CONTROLLERS
// ==========================================

export const generateCorporateClaim = async (req: AuthRequest, res: Response) => {
  try {
    const { attendanceId } = req.body;
    
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const result = await insuranceClaimService.generateCorporateClaim(attendanceId, req.user.id);

    res.status(201).json({
      success: true,
      message: result.isExisting ? 'Corporate claim already exists' : 'Corporate claim generated',
      data: result.claim,
      creditInfo: result.creditInfo
    });
  } catch (error: any) {
    console.error('Error generating corporate claim:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getCorporateClaims = async (req: AuthRequest, res: Response) => {
  try {
    const { status, patientId, startDate, endDate, corporateAccountId, page = 1, limit = 50 } = req.query;

    const result = await insuranceClaimService.getCorporateClaims(
      status as string,
      patientId as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      corporateAccountId as string,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching corporate claims'
    });
  }
};

// ==========================================
// XML GENERATION CONTROLLER
// ==========================================

export const generateClaimXML = async (req: AuthRequest, res: Response) => {
  try {
    const { claimId } = req.params;
    // This would need the XML generator service - keeping placeholder
    res.status(501).json({
      success: false,
      message: 'XML generation not implemented in module yet'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating XML'
    });
  }
};

export const generateClaimPrint = async (req: AuthRequest, res: Response) => {
  try {
    const { claimId } = req.params;
    const claim = await insuranceClaimService.getInsuranceClaim(claimId);
    
    res.json({
      success: true,
      data: claim
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error generating print'
    });
  }
};
