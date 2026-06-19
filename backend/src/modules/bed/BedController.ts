import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { BedService } from './BedService';
import { AuthRequest } from '../../middleware/authMiddleware';
import { CreateBedInput, UpdateBedInput } from './BedTypes';

const prisma = new PrismaClient();

export class BedController extends BaseController {
  private bedService: BedService;

  constructor() {
    super();
    this.bedService = new BedService(prisma);
  }

  getBeds = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const filter: any = {};
    if (req.query.wardId) filter.wardId = req.query.wardId as string;
    if (req.query.isOccupied !== undefined) filter.isOccupied = req.query.isOccupied === 'true';

    const result = await this.bedService.getAllBeds(filter, page, limit);
    return this.paginated(res, result.beds, { page, limit, total: result.total }, 'Beds retrieved successfully');
  });

  getBedById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const bed = await this.bedService.getBedById(req.params.id);
      return this.ok(res, bed, 'Bed retrieved successfully');
    } catch (error: any) {
      if (error.message === 'Bed not found') return this.notFound(res, 'Bed');
      throw error;
    }
  });

  createBed = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { wardId, bedNumber }: CreateBedInput = req.body;
    if (!wardId || !bedNumber) return this.badRequest(res, 'Ward ID and bed number are required');
    if (!this.isValidBedNumber(bedNumber)) return this.badRequest(res, 'Bed number must be alphanumeric (e.g., BED-001, A-01, 101)');

    try {
      const bed = await this.bedService.createBed({ wardId, bedNumber });
      return this.created(res, bed, 'Bed created successfully');
    } catch (error: any) {
      if (error.message === 'Ward not found') return this.notFound(res, 'Ward');
      if (error.message.includes('already exists')) return this.badRequest(res, error.message);
      throw error;
    }
  });

  updateBed = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const data: UpdateBedInput = req.body;
    if (data.bedNumber && !this.isValidBedNumber(data.bedNumber)) {
      return this.badRequest(res, 'Bed number must be alphanumeric (e.g., BED-001, A-01, 101)');
    }

    try {
      const bed = await this.bedService.updateBed(req.params.id, data);
      return this.ok(res, bed, 'Bed updated successfully');
    } catch (error: any) {
      if (error.message === 'Bed not found') return this.notFound(res, 'Bed');
      if (error.message.includes('already exists')) return this.badRequest(res, error.message);
      throw error;
    }
  });

  deleteBed = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      await this.bedService.deleteBed(req.params.id);
      return this.ok(res, null, 'Bed deleted successfully');
    } catch (error: any) {
      if (error.message === 'Bed not found') return this.notFound(res, 'Bed');
      if (error.message.includes('Cannot delete occupied bed')) return this.badRequest(res, error.message);
      throw error;
    }
  });

  getStats = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await this.bedService.getBedStats();
    return this.ok(res, stats, 'Bed statistics retrieved successfully');
  });

  private isValidBedNumber(bedNumber: string): boolean {
    return /^[a-zA-Z0-9\s\-_]+$/.test(bedNumber);
  }
}

export const bedController = new BedController();