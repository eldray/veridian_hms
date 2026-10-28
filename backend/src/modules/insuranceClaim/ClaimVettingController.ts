import { Request, Response } from 'express';
import { vetClaim, ClaimVettingInput } from './ClaimVettingService';

/**
 * Stateless preview endpoint. The caller supplies the claim data already loaded
 * in the claims editor; this endpoint never writes or silently corrects records.
 */
export const checkClaimVetting = (req: Request, res: Response) => {
  const payload = req.body as ClaimVettingInput;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return res.status(400).json({ success: false, message: 'A claim-vetting payload is required.' });
  }
  if (!Array.isArray(payload.diagnoses) || !Array.isArray(payload.medicines) || !Array.isArray(payload.investigations)) {
    return res.status(400).json({
      success: false,
      message: 'diagnoses, medicines and investigations must be arrays. Pass the current claim data from the editor.',
    });
  }
  return res.status(200).json({
    success: true,
    message: 'Claim vetting completed. Review each advisory flag against the source clinical record.',
    data: vetClaim(payload),
  });
};
