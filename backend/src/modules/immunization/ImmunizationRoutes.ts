import { Request, Response, Router } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { protect, requireRole, AuthRequest } from '../../middleware/authMiddleware';
import { StockTransactionRepository } from '../stockTransaction/StockTransactionRepository';
import { ConflictError, ValidationError } from '../../utils/errors';

export function createImmunizationRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const stockTransactions = new StockTransactionRepository(prisma);
  router.use(protect);

  // Guard against an outdated generated Prisma client missing new model delegates.
  router.use((_req: Request, res: Response, next) => {
    const client = prisma as unknown as Record<string, unknown>;
    const requiredDelegates = ['vaccine', 'immunizationRecord', 'stockItem'];
    const missing = requiredDelegates.filter((name) => {
      const delegate = client[name] as { findMany?: unknown } | undefined;
      return !delegate || typeof delegate.findMany !== 'function';
    });
    if (missing.length) {
      return res.status(503).json({
        success: false,
        message: 'Immunization Prisma client is outdated. Run Prisma generate using backend/prisma/schema.prisma and restart the backend.',
        missingDelegates: missing
      });
    }
    return next();
  });

  const readRoles: UserRole[] = ['admin', 'super_admin', 'doctor', 'nurse', 'midwife', 'records'];
  const writeRoles: UserRole[] = ['admin', 'super_admin', 'doctor', 'nurse', 'midwife'];

  router.get('/vaccines', requireRole(readRoles), async (_req: Request, res: Response) => {
    const vaccines = await prisma.vaccine.findMany({ where: { isActive: true }, include: { StockItem: { select: { id: true, name: true, drugCode: true, category: true, currentStock: true } } }, orderBy: { name: 'asc' } });
    res.json({ success: true, data: vaccines });
  });

  router.get('/vaccines/manage', requireRole(['admin', 'super_admin'] as UserRole[]), async (_req: Request, res: Response) => {
    const vaccines = await prisma.vaccine.findMany({
      include: { StockItem: { select: { id: true, name: true, drugCode: true, category: true, currentStock: true } } },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }]
    });
    return res.json({ success: true, data: vaccines });
  });

  router.get('/vaccine-stock-items', requireRole(['admin', 'super_admin'] as UserRole[]), async (_req: Request, res: Response) => {
    const items = await prisma.stockItem.findMany({
      where: { isActive: true, category: { equals: 'vaccine', mode: 'insensitive' } },
      select: { id: true, name: true, drugCode: true, currentStock: true, unitOfMeasure: true },
      orderBy: { name: 'asc' }
    });
    return res.json({ success: true, data: items });
  });

  router.get('/vaccines/:vaccineId/stock-batches', requireRole(readRoles), async (req: AuthRequest, res: Response) => {
    const vaccine = await prisma.vaccine.findUnique({
      where: { id: req.params.vaccineId },
      select: { id: true, stockItemId: true, StockItem: { select: { id: true, name: true, currentStock: true } } }
    });
    if (!vaccine || !vaccine.stockItemId || !vaccine.StockItem) {
      return res.status(404).json({ success: false, message: 'This vaccine has no linked stock item.' });
    }

    const isAdmin = ['admin', 'super_admin'].includes(String(req.user?.role || '').toLowerCase());
    const requestedDepartmentId = isAdmin && req.query.departmentId ? String(req.query.departmentId) : undefined;
    const departmentId = requestedDepartmentId || req.user?.departmentId || undefined;
    if (!departmentId) {
      return res.json({
        success: true,
        data: { stockItem: vaccine.StockItem, batchTracked: false, departmentAssigned: false, batches: [], usableQuantity: 0 }
      });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const [batchCount, batches] = await Promise.all([
      prisma.stockBatch.count({ where: { stockItemId: vaccine.stockItemId } }),
      prisma.stockBatch.findMany({
        where: {
          stockItemId: vaccine.stockItemId,
          departmentId,
          wardId: null,
          quantity: { gt: 0 },
          isActive: true,
          expiryDate: { gte: startOfToday }
        },
        select: { id: true, batchNumber: true, expiryDate: true, quantity: true, receivedDate: true },
        orderBy: [{ expiryDate: 'asc' }, { receivedDate: 'asc' }]
      })
    ]);
    return res.json({
      success: true,
      data: {
        stockItem: vaccine.StockItem,
        batchTracked: batchCount > 0,
        departmentAssigned: true,
        batches,
        usableQuantity: batches.reduce((total, batch) => total + batch.quantity, 0)
      }
    });
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
    // The waiting list is a patient worklist, not a "today only" report. Seeded
    // and previously booked immunization attendances may have historical dates.
    const dateParam = req.query.date ? String(req.query.date) : null;
    if (dateParam && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return res.status(400).json({ success: false, message: 'Date must use YYYY-MM-DD format.' });
    }
    const dateStart = dateParam ? new Date(dateParam + 'T00:00:00.000Z') : null;
    const dateEnd = dateStart ? new Date(dateStart) : null;
    if (dateEnd) dateEnd.setUTCDate(dateEnd.getUTCDate() + 1);
    const visits = await prisma.attendance.findMany({
      where: {
        attendanceType: 'immunization',
        ...(dateStart && dateEnd ? { dateTime: { gte: dateStart, lt: dateEnd } } : {})
      },
      include: { Patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, phoneNumber: true, dateOfBirth: true, gender: true, imageUrl: true } } },
      orderBy: { dateTime: 'desc' }
    });
    return res.json({ success: true, data: visits, meta: { count: visits.length, date: dateParam } });
  });

  router.patch('/attendances/:id/complete', requireRole(writeRoles), async (req: AuthRequest, res: Response) => {
    const attendance = await prisma.attendance.findUnique({
      where: { id: req.params.id },
      select: { id: true, attendanceType: true, status: true }
    });
    if (!attendance || attendance.attendanceType !== 'immunization') {
      return res.status(404).json({ success: false, message: 'Immunization visit not found.' });
    }
    if (attendance.status !== 'completed') {
      const updated = await prisma.attendance.update({
        where: { id: attendance.id },
        data: { status: 'completed', finalizedAt: new Date(), finalizedById: req.user?.id || null },
        select: { id: true, status: true, finalizedAt: true, finalizedById: true }
      });
      return res.json({ success: true, data: updated });
    }
    return res.json({ success: true, data: attendance });
  });

  router.get('/patients/:patientId/context', requireRole(readRoles), async (req: Request, res: Response) => {
    const patientId = req.params.patientId;
    const [patient, attendances] = await Promise.all([
      prisma.patient.findUnique({
        where: { id: patientId },
        select: { id: true, surname: true, otherNames: true, folderNumber: true, dateOfBirth: true, gender: true }
      }),
      prisma.attendance.findMany({
        where: { patientId, attendanceType: 'immunization' },
        select: { id: true, attendanceNumber: true, attendanceType: true, dateTime: true, status: true },
        orderBy: { dateTime: 'desc' }
      })
    ]);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
    return res.json({ success: true, data: { patient, attendances } });
  });

  router.get('/patients/:patientId/records', requireRole(readRoles), async (req: Request, res: Response) => {
    const records = await prisma.immunizationRecord.findMany({
      where: { patientId: req.params.patientId },
      include: { Vaccine: { include: { StockItem: { select: { id: true, name: true, drugCode: true } } } }, StockTransaction: { select: { id: true, transactionType: true, quantity: true, reference: true, departmentId: true, batchAllocations: true } }, Attendance: { select: { attendanceNumber: true, dateTime: true } }, AdministeredBy: { select: { id: true, fullName: true } }, RecordedBy: { select: { id: true, fullName: true } } },
      orderBy: { administeredAt: 'desc' }
    });
    return res.json({ success: true, data: records });
  });

  router.post('/records', requireRole(writeRoles), async (req: AuthRequest, res: Response) => {
    const { patientId, attendanceId, vaccineId, doseNumber, administeredAt } = req.body ?? {};
    // Performer and recorder identities come from the authenticated session, never
    // from client-supplied IDs that could falsely attribute clinical activity.
    const recordedBy = req.user!.id;
    if (!patientId || !attendanceId || !vaccineId || !doseNumber || !administeredAt || !recordedBy) {
      return res.status(400).json({ success: false, message: 'Patient, attendance, vaccine, dose, administration date and recording staff are required.' });
    }
    const date = new Date(administeredAt);
    if (Number.isNaN(date.getTime())) return res.status(400).json({ success: false, message: 'Invalid administration date.' });
    const [patient, attendance, vaccine] = await Promise.all([
      prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } }),
      prisma.attendance.findUnique({ where: { id: attendanceId }, select: { id: true, patientId: true, attendanceType: true, status: true, finalizedAt: true } }),
      prisma.vaccine.findUnique({ where: { id: vaccineId }, select: { id: true, code: true, isActive: true, stockItemId: true, StockItem: { select: { id: true, name: true, category: true, isActive: true } } } })
    ]);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
    if (!attendance || attendance.patientId !== patientId) return res.status(400).json({ success: false, message: 'Attendance must belong to the selected patient.' });
    if (attendance.attendanceType !== 'immunization') return res.status(400).json({ success: false, message: 'Vaccination records must be linked to an Immunization attendance.' });
    if (attendance.finalizedAt || ['discharged', 'referred', 'absconded', 'completed', 'cancelled'].includes(attendance.status)) {
      return res.status(409).json({ success: false, message: 'This immunization encounter is closed or finalized. Use the facility-approved correction/addendum process.' });
    }
    if (!vaccine || !vaccine.isActive) return res.status(400).json({ success: false, message: 'Vaccine is missing or inactive.' });
    const expiryDate = req.body.expiryDate ? new Date(req.body.expiryDate) : null;
    const nextDoseDue = req.body.nextDoseDue ? new Date(req.body.nextDoseDue) : null;
    if (expiryDate && Number.isNaN(expiryDate.getTime())) return res.status(400).json({ success: false, message: 'Invalid vaccine expiry date.' });
    if (nextDoseDue && Number.isNaN(nextDoseDue.getTime())) return res.status(400).json({ success: false, message: 'Invalid next-dose due date.' });
    if (expiryDate && expiryDate < date) return res.status(400).json({ success: false, message: 'Vaccine expiry must be on or after administration date.' });
    const record = await prisma.$transaction(async (tx) => {
      // Serialize vaccination creation with encounter finalization. A preflight read
      // alone is insufficient because the encounter could be finalized before this write.
      if (typeof tx.$queryRaw === 'function') {
        await tx.$queryRaw`SELECT "id" FROM "Attendance" WHERE "id" = ${attendanceId} FOR UPDATE`;
      }
      const currentAttendance = await tx.attendance.findUnique({
        where: { id: attendanceId },
        select: { id: true, patientId: true, attendanceType: true, status: true, finalizedAt: true },
      });
      if (!currentAttendance || currentAttendance.patientId !== patientId || currentAttendance.attendanceType !== 'immunization') {
        throw new ValidationError('The selected immunization encounter is no longer valid for this patient.');
      }
      if (currentAttendance.finalizedAt || ['discharged', 'referred', 'absconded', 'completed', 'cancelled'].includes(currentAttendance.status)) {
        throw new ConflictError('This immunization encounter is closed or finalized. Use the facility-approved correction/addendum process.');
      }
      // Create the clinical record and consume the linked vaccine product in the
      // same database transaction. A stock failure rolls the record back too.
      const created = await tx.immunizationRecord.create({ data: {
        patientId, attendanceId, vaccineId, doseNumber: String(doseNumber).trim(), administeredAt: date,
        doseVolume: req.body.doseVolume || null, route: req.body.route || null, administrationSite: req.body.administrationSite || null,
        batchNumber: req.body.batchNumber || null, expiryDate,
        nextDoseDue, adverseReaction: req.body.adverseReaction || null,
        notes: req.body.notes || null, administeredById: req.user!.id, recordedById: recordedBy
      }});

      if (vaccine.stockItemId && vaccine.StockItem) {
        if (!vaccine.StockItem.isActive || String(vaccine.StockItem.category).toLowerCase() !== 'vaccine') {
          throw new Error('The linked vaccine medicine is inactive or is no longer in the Vaccine category. Ask an administrator to correct the catalogue link.');
        }
        const isAdmin = ['admin', 'super_admin'].includes(String(req.user?.role || '').toLowerCase());
        const departmentId = isAdmin
          ? ((req.body.departmentId || req.user?.departmentId) as string | undefined)
          : (req.user?.departmentId as string | undefined);
        if (!isAdmin && !departmentId) throw new Error('Your staff account must be assigned to a department before vaccine stock can be issued.');
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
          include: { Vaccine: { include: { StockItem: true } }, StockTransaction: true, AdministeredBy: { select: { id: true, fullName: true } } }
        });
      }

      return tx.immunizationRecord.findUniqueOrThrow({
        where: { id: created.id },
        include: { Vaccine: { include: { StockItem: true } }, AdministeredBy: { select: { id: true, fullName: true } } }
      });
    });
    return res.status(201).json({ success: true, data: record });
  });

  // Clinical immunization register: a date-filtered line list for facility review
  // and export. This is not an EPI coverage calculation; denominators and reporting
  // definitions must be configured against the facility's approved reporting standard.
  router.get('/records/register', requireRole(readRoles), async (req: Request, res: Response) => {
    const fromValue = req.query.from ? String(req.query.from) : null;
    const toValue = req.query.to ? String(req.query.to) : null;
    const from = fromValue ? new Date(fromValue) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = toValue ? new Date(toValue) : new Date();
    // Date-picker values are date-only strings; include the entire selected end date.
    if (toValue && /^\d{4}-\d{2}-\d{2}$/.test(toValue)) to.setHours(23, 59, 59, 999);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) {
      return res.status(400).json({ success: false, message: 'Valid administration date range is required.' });
    }
    const records = await prisma.immunizationRecord.findMany({
      where: { administeredAt: { gte: from, lte: to } },
      include: {
        Patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, dateOfBirth: true, gender: true } },
        Vaccine: { select: { id: true, code: true, name: true } },
        Attendance: { select: { id: true, attendanceNumber: true, dateTime: true } },
        AdministeredBy: { select: { id: true, fullName: true } },
        RecordedBy: { select: { id: true, fullName: true } },
        StockTransaction: { select: { id: true, transactionType: true, quantity: true, batchAllocations: true } }
      },
      orderBy: [{ administeredAt: 'asc' }, { createdAt: 'asc' }]
    });
    return res.json({ success: true, data: records, meta: { count: records.length, from: from.toISOString(), to: to.toISOString() } });
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
