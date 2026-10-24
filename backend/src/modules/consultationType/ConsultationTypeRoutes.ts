import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { protect, requireRole } from '../../middleware/authMiddleware';

const READ_ROLES = ['admin', 'super_admin', 'accounts', 'records', 'doctor', 'nurse', 'midwife'] as const;
const WRITE_ROLES = ['admin', 'super_admin', 'accounts'] as const;
const ALLOWED_FIELDS = [
  'name', 'code', 'cashPrice', 'nhisPrice', 'insurancePrice',
  'isNHISCovered', 'isPrivateInsExempted', 'isActive',
] as const;

function cleanInput(input: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) result[key] = input[key];
  }
  return result;
}

function validateInput(input: Record<string, unknown>, partial = false): string | null {
  if (!partial || input.name !== undefined) {
    if (typeof input.name !== 'string' || input.name.trim().length < 2) return 'Name must contain at least 2 characters';
  }
  if (!partial || input.code !== undefined) {
    if (typeof input.code !== 'string' || !input.code.trim()) return 'Code is required';
  }
  for (const field of ['cashPrice', 'nhisPrice', 'insurancePrice']) {
    if (input[field] !== undefined && (!Number.isFinite(Number(input[field])) || Number(input[field]) < 0)) {
      return `${field} must be a non-negative number`;
    }
    if (!partial && input[field] === undefined && field !== 'nhisPrice') return `${field} is required`;
  }
  for (const field of ['isNHISCovered', 'isPrivateInsExempted', 'isActive']) {
    if (input[field] !== undefined && typeof input[field] !== 'boolean') return `${field} must be a boolean`;
  }
  return null;
}

export function createConsultationTypeRoutes(prisma: PrismaClient): Router {
  const router = Router();
  router.use(protect);

  router.get('/', requireRole([...READ_ROLES]), async (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
      const where: any = {};
      if (req.query.isActive !== undefined) where.isActive = String(req.query.isActive) === 'true';
      if (req.query.search) where.OR = [
        { name: { contains: String(req.query.search), mode: 'insensitive' } },
        { code: { contains: String(req.query.search), mode: 'insensitive' } },
      ];
      const [data, total] = await Promise.all([
        prisma.consultationType.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { name: 'asc' } }),
        prisma.consultationType.count({ where }),
      ]);
      res.json({ success: true, data, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
    } catch (error) { next(error); }
  });

  router.get('/:id', requireRole(READ_ROLES), async (req, res, next) => {
    try {
      const data = await prisma.consultationType.findUnique({ where: { id: req.params.id } });
      if (!data) return res.status(404).json({ success: false, message: 'Consultation type not found' });
      return res.json({ success: true, data });
    } catch (error) { return next(error); }
  });

  router.post('/', requireRole([...WRITE_ROLES]), async (req, res, next) => {
    try {
      const input = cleanInput(req.body || {});
      const validation = validateInput(input);
      if (validation) return res.status(400).json({ success: false, message: validation });
      const data = await prisma.consultationType.create({ data: {
        ...input,
        name: String(input.name).trim(),
        code: String(input.code).trim(),
        cashPrice: Number(input.cashPrice),
        nhisPrice: Number(input.nhisPrice ?? 0),
        insurancePrice: Number(input.insurancePrice),
      } as any });
      return res.status(201).json({ success: true, data, message: 'Consultation type created' });
    } catch (error: any) {
      if (error?.code === 'P2002') return res.status(409).json({ success: false, message: 'A consultation type with this code already exists' });
      return next(error);
    }
  });

  router.put('/:id', requireRole(WRITE_ROLES), async (req: AuthRequest, res, next) => {
    try {
      const input = cleanInput(req.body || {});
      const validation = validateInput(input, true);
      if (validation) return res.status(400).json({ success: false, message: validation });
      const data = await prisma.consultationType.update({
        where: { id: req.params.id },
        data: {
          ...input,
          ...(input.name !== undefined ? { name: String(input.name).trim() } : {}),
          ...(input.code !== undefined ? { code: String(input.code).trim() } : {}),
          ...(input.cashPrice !== undefined ? { cashPrice: Number(input.cashPrice) } : {}),
          ...(input.nhisPrice !== undefined ? { nhisPrice: Number(input.nhisPrice) } : {}),
          ...(input.insurancePrice !== undefined ? { insurancePrice: Number(input.insurancePrice) } : {}),
        } as any,
      });
      return res.json({ success: true, data, message: 'Consultation type updated' });
    } catch (error: any) {
      if (error?.code === 'P2025') return res.status(404).json({ success: false, message: 'Consultation type not found' });
      if (error?.code === 'P2002') return res.status(409).json({ success: false, message: 'A consultation type with this code already exists' });
      return next(error);
    }
  });

  router.delete('/:id', requireRole(WRITE_ROLES), async (req, res, next) => {
    try {
      const existing = await prisma.consultationType.findUnique({
        where: { id: req.params.id },
        include: { _count: { select: { serviceCatalogs: true } } },
      });
      if (!existing) return res.status(404).json({ success: false, message: 'Consultation type not found' });
      if (existing._count.serviceCatalogs > 0) {
        const data = await prisma.consultationType.update({ where: { id: req.params.id }, data: { isActive: false } });
        return res.json({ success: true, data, message: 'Consultation type is in use; it has been deactivated instead of deleted' });
      }
      await prisma.consultationType.delete({ where: { id: req.params.id } });
      return res.json({ success: true, data: null, message: 'Consultation type deleted' });
    } catch (error: any) {
      if (error?.code === 'P2025') return res.status(404).json({ success: false, message: 'Consultation type not found' });
      return next(error);
    }
  });

  return router;
}
