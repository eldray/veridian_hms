import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { protect } from '../../middleware/authMiddleware';
import { AuthRequest } from '../../middleware/authMiddleware';
import { MomoPaymentService } from './MomoPaymentService';

export function createMomoPaymentRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const service = new MomoPaymentService(prisma);
  router.use(protect);

  router.get('/config', (_req, res) => {
    res.json({ success: true, data: service.getReadiness() });
  });

  router.post('/payments', async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) return res.status(401).json({ success: false, message: 'Authentication required.' });
      const { billId, amount, payerPhone, idempotencyKey } = req.body || {};
      if (typeof billId !== 'string' || !billId.trim()) return res.status(400).json({ success: false, message: 'Bill ID is required.' });
      if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) return res.status(400).json({ success: false, message: 'A valid payment amount is required.' });
      if (typeof payerPhone !== 'string' || !payerPhone.trim()) return res.status(400).json({ success: false, message: 'The payer mobile number is required.' });
      if (typeof idempotencyKey !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
        return res.status(400).json({ success: false, message: 'A valid UUID idempotency key is required.' });
      }
      const result = await service.initiate({ billId, amount: Number(amount), payerPhone, idempotencyKey, userId: req.user.id });
      return res.status(result.reused ? 200 : 202).json({
        success: true,
        message: 'Payment request submitted. Ask the payer to approve the prompt on their phone.',
        data: { ...result.intent, reused: result.reused }
      });
    } catch (error: any) {
      const status = Number(error?.statusCode) || 500;
      return res.status(status).json({ success: false, message: error?.message || 'Unable to initiate Mobile Money payment.' });
    }
  });

  router.get('/payments/:id', async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) return res.status(401).json({ success: false, message: 'Authentication required.' });
      const data = await service.getStatus(req.params.id, req.user.id, req.user.role);
      return res.json({ success: true, data, message: 'Mobile Money payment status retrieved.' });
    } catch (error: any) {
      const status = Number(error?.statusCode) || 500;
      return res.status(status).json({ success: false, message: error?.message || 'Unable to retrieve Mobile Money payment status.' });
    }
  });

  return router;
}
