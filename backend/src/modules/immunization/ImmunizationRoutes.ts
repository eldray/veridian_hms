import { Request, Response, Router } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { protect, requireRole, AuthRequest } from '../../middleware/authMiddleware';
import { StockTransactionRepository } from '../stockTransaction/StockTransactionRepository';

export function createImmunizationRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const stockTransactions = new StockTransactionRepository(prisma);
  router.use(protect);

  const readRoles: UserRole[] = ['admin', 'super_admin', 'doctor', 'nurse', 'midwife', 'records'];
  const writeRoles: UserRole[] = ['admin', 'super_admin', 'doctor', 'nurse', 'midwife'];

  router.get('/vaccines', requireRole(readRoles), async (_req: Request, res: Response) => {
    const vaccines = await prisma.vaccine.findMany({ where: { isActive: true }, include: { StockItem: { select: { id: true, name: true, drugCode: true, category: true, currentStock: true } } }, orderBy: { name: 'asc' } });
    res.json({ success: true, data: vaccines });
  });

  router.get('/vaccine-stock-items', requireRole(['admin', 'super_admin'] as UserRole[]), async (_req: Request, res: Response) => {
    const items = await prisma.stockItem.findMany({
      where: { isActive: true, category: { equals: 'vaccine', mode: 'insensitive' } },
      select: { id: true, name: true, drugCode: true, currentStock: true, unitOfMeasure: true },
      orderBy: { name: 'asc' }
    });
    return res.json({ success: true, data: items });
  });

  router.post('/vaccines', requireRole(['admin', 'super_admin'] as UserRole[]), async (req: AuthRequest, res: Response) => {
    const { code, name } = req.body ?? {};
    if (!String(code ?? '').trim() || !String(name ?? '').trim()) {
      return res.status(400).json({ success: false, message: 'Vaccine code and name are required.' });
    }
    const stockItemId = req.body.stockItemId || null;
    if (stockItemId) {
      const item = await prisma.stockItem.findUnique({ where: { id: stockItemId }, select: { id: true, category: true } });
      if (!item || item.category.toLowerCase() !== 'vaccine') return res.status(400).json({ success: false, message: 'Select a medicine item in the Vaccine category.' });
    }
    const vaccine = await prisma.vaccine.create({ data: {
      code: String(code).trim().toUpperCase(), name: String(name).trim(), stockItemId,
      description: req.body.description || null,
      diseaseTargets: Array.isArray(req.body.diseaseTargets) ? req.body.diseaseTargets : [],
      recommendedAge: req.body.recommendedAge || null,
      doseSchedule: req.body.doseSchedule ?? undefined,
      defaultDoseVolume: req.body.defaultDoseVolume || null,
      defaultRoute: req.body.defaultRoute || null
    }});
    return res.status(201).json({ success: true, data: vaccine });
  });

  router.put('/vaccines/:id', requireRole(['admin', 'super_admin'] as UserRole[]), async (req: AuthRequest, res: Response) => {
    const { code, name } = req.body ?? {};
    if (code !== undefined && !String(code).trim()) return res.status(400).json({ success: false, message: 'Vaccine code cannot be empty.' });
    if (name !== undefined && !String(name).trim()) return res.status(400).json({ success: false, message: 'Vaccine name cannot be empty.' });
    if (req.body.stockItemId) {
      const item = await prisma.stockItem.findUnique({ where: { id: req.body.stockItemId }, select: { id: true, category: true } });
      if (!item || item.category.toLowerCase() !== 'vaccine') return res.status(400).json({ success: false, message: 'Select a medicine item in the Vaccine category.' });
    }
    const vaccine = await prisma.vaccine.update({ where: { id: req.params.id }, data: {
      ...(code !== undefined ? { code: String(code).trim().toUpperCase() } : {}),
      ...(name !== undefined ? { name: String(name).trim() } : {}),
      ...(req.body.description !== undefined ? { description: req.body.description || null } : {}),
      ...(req.body.diseaseTargets !== undefined ? { diseaseTargets: Array.isArray(req.body.diseaseTargets) ? req.body.diseaseTargets : [] } : {}),
      ...(req.body.recommendedAge !== undefined ? { recommendedAge: req.body.recommendedAge || null } : {}),
      ...(req.body.doseSchedule !== undefined ? { doseSchedule: req.body.doseSchedule } : {}),
      ...(req.body.defaultDoseVolume !== undefined ? { defaultDoseVolume: req.body.defaultDoseVolume || null } : {}),
      ...(req.body.defaultRoute !== undefined ? { defaultRoute: req.body.defaultRoute || null } : {}),
      ...(req.body.stockItemId !== undefined ? { stockItemId: req.body.stockItemId || null } : {}),
      ...(req.body.isActive !== undefined ? { isActive: Boolean(req.body.isActive) } : {})
    }});
    return res.json({ success: true, data: vaccine });
  });

  router.get('/attendances', requireRole(readRoles), async (req: Request, res: Response) => {
    const dateParam = req.query.date ? String(req.query.date) : new Date().toISOString().slice(0, 10);
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(dateParam)) return res.status(400).json({ success: false, message: 'Date must use YYYY-MM-DD format.' });
    const start = new Date(dateParam + 'T00:00:00.000Z');
    const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
    const visits = await prisma.attendance.findMany({
      where: { attendanceType: 'immunization', dateTime: { gte: start, lt: end } },
      include: { Patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, phoneNumber: true } } },
      orderBy: { dateTime: 'asc' }
    });
    return res.json({ success: true, data: visits });
  });

  router.get('/patients/:patientId/records', requireRole(readRoles), async (req: Request, res: Response) => {
    const records = await prisma.immunizationRecord.findMany({
      where: { patientId: req.params.patientId },
      include: { Vaccine: true, Attendance: { select: { attendanceNumber: true, dateTime: true } }, AdministeredBy: { select: { id: true, fullName: true } }, RecordedBy: { select: { id: true, fullName: true } } },
      orderBy: { administeredAt: 'desc' }
    });
    return res.json({ success: true, data: records });
  });

  router.post('/records', requireRole(writeRoles), async (req: AuthRequest, res: Response) => {
    const { patientId, attendanceId, vaccineId, doseNumber, administeredAt, recordedById } = req.body ?? {};
    const recordedBy = req.user?.id || recordedById;
    if (!patientId || !attendanceId || !vaccineId || !doseNumber || !administeredAt || !recordedBy) {
      return res.status(400).json({ success: false, message: 'Patient, attendance, vaccine, dose, administration date and recording staff are required.' });
    }
    const date = new Date(administeredAt);
    if (Number.isNaN(date.getTime())) return res.status(400).json({ success: false, message: 'Invalid administration date.' });
    const [patient, attendance, vaccine] = await Promise.all([
      prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } }),
      prisma.attendance.findUnique({ where: { id: attendanceId }, select: { id: true, patientId: true, attendanceType: true } }),
      prisma.vaccine.findUnique({ where: { id: vaccineId }, select: { id: true, isActive: true, stockItemId: true, StockItem: { select: { id: true, name: true, category: true, isActive: true } } } })
    ]);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
    if (!attendance || attendance.patientId !== patientId) return res.status(400).json({ success: false, message: 'Attendance must belong to the selected patient.' });
    if (attendance.attendanceType !== 'immunization') return res.status(400).json({ success: false, message: 'Vaccination records must be linked to an Immunization attendance.' });
    if (!vaccine || !vaccine.isActive) return res.status(400).json({ success: false, message: 'Vaccine is missing or inactive.' });
    const expiryDate = req.body.expiryDate ? new Date(req.body.expiryDate) : null;
    const nextDoseDue = req.body.nextDoseDue ? new Date(req.body.nextDoseDue) : null;
    if (expiryDate && Number.isNaN(expiryDate.getTime())) return res.status(400).json({ success: false, message: 'Invalid vaccine expiry date.' });
    if (nextDoseDue && Number.isNaN(nextDoseDue.getTime())) return res.status(400).json({ success: false, message: 'Invalid next-dose due date.' });
    if (expiryDate && expiryDate < date) return res.status(400).json({ success: false, message: 'Vaccine expiry must be on or after administration date.' });
    const record = await prisma.$transaction(async (tx) => {
      // Create the clinical record and consume the linked vaccine product in the
      // same database transaction. A stock failure rolls the record back too.
      const created = await tx.immunizationRecord.create({ data: {
        patientId, attendanceId, vaccineId, doseNumber: String(doseNumber).trim(), administeredAt: date,
        doseVolume: req.body.doseVolume || null, route: req.body.route || null, administrationSite: req.body.administrationSite || null,
        batchNumber: req.body.batchNumber || null, expiryDate,
        nextDoseDue, adverseReaction: req.body.adverseReaction || null,
        notes: req.body.notes || null, administeredById: req.body.administeredById || req.user?.id || null, recordedById: recordedBy
      }});

      if (vaccine.stockItemId && vaccine.StockItem) {
        if (!vaccine.StockItem.isActive || String(vaccine.StockItem.category).toLowerCase() !== 'vaccine') {
          throw new Error('The linked vaccine medicine is inactive or is no longer in the Vaccine category. Ask an administrator to correct the catalogue link.');
        }
        const isAdmin = ['admin', 'super_admin'].includes(String(req.user?.role || '').toLowerCase());
        const departmentId = isAdmin
          ? ((req.body.departmentId || req.user?.departmentId) as string | undefined)
          : (req.user?.departmentId as string | undefined);
        const movement = await stockTransactions.createWithinTransaction(tx, {
          stockItemId: vaccine.stockItemId,
          transactionType: 'sale',
          quantity: 1,
          departmentId,
          performedBy: req.user?.id,
          reference: `Immunization record ${created.id}`,
          notes: `Vaccine administered to patient ${patientId}; ${vaccine.code} dose ${String(doseNumber).trim()}`
        });
        const allocations = Array.isArray(movement.batchAllocations) ? movement.batchAllocations as Array<{ batchNumber: string; expiryDate: Date | string }> : [];
        const actualBatch = allocations[0];
        return tx.immunizationRecord.update({
          where: { id: created.id },
          data: {
            stockTransactionId: movement.id,
            ...(actualBatch ? { batchNumber: actualBatch.batchNumber, expiryDate: new Date(actualBatch.expiryDate) } : {})
          },
          include: { Vaccine: { include: { StockItem: true } }, AdministeredBy: { select: { id: true, fullName: true } } }
        });
      }

      return tx.immunizationRecord.findUniqueOrThrow({
        where: { id: created.id },
        include: { Vaccine: { include: { StockItem: true } }, AdministeredBy: { select: { id: true, fullName: true } } }
      });
    });
    return res.status(201).json({ success: true, data: record });
  });

  router.get('/records/due', requireRole(readRoles), async (req: Request, res: Response) => {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date();
    const to = req.query.to ? new Date(String(req.query.to)) : new Date(Date.now() + 30 * 86400000);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return res.status(400).json({ success: false, message: 'Valid due-date range is required.' });
    const records = await prisma.immunizationRecord.findMany({ where: { nextDoseDue: { gte: from, lte: to } }, include: { Patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, phoneNumber: true } }, Vaccine: true }, orderBy: { nextDoseDue: 'asc' } });
    return res.json({ success: true, data: records });
  });

  return router;
}
