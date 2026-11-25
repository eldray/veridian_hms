import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { AuthRequest } from '../../middleware/authMiddleware';

export class ConsultationTypeController extends BaseController {
  constructor(private readonly prisma: PrismaClient) { super(); }

  getAll = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const search = String(req.query.search || '').trim();
    const where = {
      ...(req.query.isActive === undefined ? {} : { isActive: String(req.query.isActive) === 'true' }),
      ...(search ? { OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { code: { contains: search, mode: 'insensitive' as const } },
      ] } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.consultationType.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { name: 'asc' } }),
      this.prisma.consultationType.count({ where }),
    ]);
    return this.paginated(res, rows, { page, limit, total }, 'Consultation types retrieved');
  });

  getById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const row = await this.prisma.consultationType.findUnique({ where: { id: req.params.id } });
    if (!row) return this.notFound(res, 'Consultation type');
    return this.ok(res, row, 'Consultation type retrieved');
  });

  create = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, code, cashPrice, nhisPrice = 0, insurancePrice, isNHISCovered = true, isPrivateInsExempted = false, isActive = true } = req.body;
    if (!String(name || '').trim() || !String(code || '').trim() || cashPrice === undefined || insurancePrice === undefined) {
      return this.badRequest(res, 'name, code, cashPrice and insurancePrice are required');
    }
    const row = await this.prisma.consultationType.create({
      data: { name: String(name).trim(), code: String(code).trim(), cashPrice, nhisPrice, insurancePrice, isNHISCovered: Boolean(isNHISCovered), isPrivateInsExempted: Boolean(isPrivateInsExempted), isActive: Boolean(isActive) },
    });
    return this.created(res, row, 'Consultation type created');
  });

  update = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const allowed = ['name', 'code', 'cashPrice', 'nhisPrice', 'insurancePrice', 'isNHISCovered', 'isPrivateInsExempted', 'isActive'];
    const data: Record<string, unknown> = {};
    for (const key of allowed) if (req.body[key] !== undefined) data[key] = req.body[key];
    if (typeof data.name === 'string') data.name = data.name.trim();
    if (typeof data.code === 'string') data.code = data.code.trim();
    const row = await this.prisma.consultationType.update({ where: { id: req.params.id }, data });
    return this.ok(res, row, 'Consultation type updated');
  });

  delete = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params.id;
    const linked = await this.prisma.serviceCatalog.count({ where: { consultationTypeId: id } });
    if (linked) return this.conflict(res, 'This consultation type is used by service catalog items. Deactivate it instead of deleting it.');
    await this.prisma.consultationType.delete({ where: { id } });
    return this.ok(res, null, 'Consultation type deleted');
  });
}
