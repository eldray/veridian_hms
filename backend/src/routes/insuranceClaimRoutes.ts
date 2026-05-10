// routes/insuranceClaimRoutes.ts - ADD THE MISSING ROUTE
import express from 'express';
import {
  // NHIS
  generateNHISClaim,
  getNHISClaims,
  // Private
  generatePrivateInsuranceClaim,
  getPrivateInsuranceClaims,
  // Common
  getAllInsuranceClaims,
  getInsuranceClaim,
  getClaimByAttendanceId,
  updateClaimDraft,
  finalizeClaim,
  updateClaimStatus,
  generateClaimXML,
  generateClaimPrint,
  getFinalizedClaimsTotal,
  deleteInsuranceClaim,
  generateBatchXML
} from '../controllers/insuranceClaimController';
import { protect, requireAccountsStaff, requireMedicalStaff } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

// ==========================================
// GET ALL CLAIMS (For dashboard and general listing)
// ==========================================
router.get('/', requireAccountsStaff, getAllInsuranceClaims);  // ✅ ADD THIS ROUTE

// ==========================================
// NHIS CLAIMS
// ==========================================
router.post('/nhis/generate', requireAccountsStaff, generateNHISClaim);
router.get('/nhis', requireAccountsStaff, getNHISClaims);

// ==========================================
// PRIVATE INSURANCE CLAIMS
// ==========================================
router.post('/private/generate', requireAccountsStaff, generatePrivateInsuranceClaim);
router.get('/private', requireAccountsStaff, getPrivateInsuranceClaims);

// ==========================================
// COMMON CLAIM OPERATIONS
// ==========================================
router.get('/:id', requireAccountsStaff, getInsuranceClaim);
router.get('/attendance/:attendanceId', requireMedicalStaff, getClaimByAttendanceId);
router.patch('/:claimId/draft', requireAccountsStaff, updateClaimDraft);
router.patch('/:claimId', requireAccountsStaff, updateClaimDraft);  // ✅ Alias for updateInsuranceClaim
router.post('/:claimId/finalize', requireAccountsStaff, finalizeClaim);
router.patch('/:claimId/status', requireAccountsStaff, updateClaimStatus);
router.get('/:claimId/xml', requireAccountsStaff, generateClaimXML);
router.get('/:claimId/print', requireAccountsStaff, generateClaimPrint);
router.get('/financials/finalized-total', requireAccountsStaff, getFinalizedClaimsTotal);

// ==========================================
// BATCH & DELETE OPERATIONS
// ==========================================
router.delete('/:claimId', requireAccountsStaff, deleteInsuranceClaim);
router.get('/batch/:batchId/xml', requireAccountsStaff, generateBatchXML);

// Generate batch XML from selected claims (without pre-existing batch)
router.post('/batch/generate-xml', requireAccountsStaff, async (req: AuthRequest, res: Response) => {
  try {
    const { claimIds } = req.body;
    
    if (!Array.isArray(claimIds) || claimIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of claim IDs' });
    }

    const claims = await prisma.insuranceClaim.findMany({
      where: { id: { in: claimIds } },
      include: {
        InsuranceProvider: true,
        Attendance: { include: { Patient: true } },
        Bill: true
      }
    });

    if (claims.length === 0) {
      return res.status(404).json({ success: false, message: 'No claims found' });
    }

    // Generate NHIS batch XML format
    const batchNumber = `BATCH-${Date.now()}`;
    const totalAmount = claims.reduce((sum, c) => sum + (c.totalClaimAmount || 0), 0);
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<NHISBatch>
  <BatchInfo>
    <BatchNumber>${batchNumber}</BatchNumber>
    <BatchDate>${new Date().toISOString()}</BatchDate>
    <FacilityCode>${process.env.NHIS_FACILITY_CODE || 'GH001'}</FacilityCode>
    <GeneratedDate>${new Date().toISOString()}</GeneratedDate>
    <TotalClaims>${claims.length}</TotalClaims>
    <TotalAmount>${totalAmount.toFixed(2)}</TotalAmount>
  </BatchInfo>
  <Claims>\n`;

    for (const claim of claims) {
      xml += `    <Claim>
      <ClaimNumber>${claim.claimNumber}</ClaimNumber>
      <PatientName>${claim.Attendance?.Patient?.surname || ''} ${claim.Attendance?.Patient?.otherNames || ''}</PatientName>
      <Provider>${claim.InsuranceProvider?.name || ''}</Provider>
      <Amount>${claim.totalClaimAmount?.toFixed(2) || '0.00'}</Amount>
      <Status>${claim.status}</Status>
    </Claim>\n`;
    }

    xml += `  </Claims>
</NHISBatch>`;

    res.set('Content-Type', 'application/xml');
    res.set('Content-Disposition', `attachment; filename="batch_${batchNumber}.xml"`);
    res.send(xml);
  } catch (error) {
    console.error('Generate batch XML error:', error);
    res.status(500).json({ success: false, message: 'Error generating batch XML' });
  }
});

export default router;