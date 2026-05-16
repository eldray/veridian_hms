// backend/src/modules/worklist/WorklistController.ts

import { Request, Response } from 'express';
import { WorklistService } from './WorklistService';
import { BaseController } from '../../shared/base/BaseController';

export class WorklistController extends BaseController {
  private service: WorklistService;

  constructor() {
    super('WorklistController');
    this.service = new WorklistService();
  }

  // GET /api/worklist/:type
  async getWorklist(req: Request, res: Response) {
    try {
      const { type } = req.params;
      
      if (!['vitals', 'medical', 'laboratory', 'pharmacy', 'radiology'].includes(type)) {
        return this.badRequestResponse(res, 'Invalid worklist type. Valid types: vitals, medical, laboratory, pharmacy, radiology');
      }

      const result = await this.service.getWorklist(type as any);
      return this.successResponse(res, result.data, `${type} worklist fetched successfully`);
    } catch (error) {
      return this.errorResponse(res, error, 'Error fetching worklist');
    }
  }

  // GET /api/worklist/summary
  async getWorklistSummary(req: Request, res: Response) {
    try {
      const result = await this.service.getAllWorklistsSummary();
      return this.successResponse(res, result.data, 'Worklist summary fetched successfully');
    } catch (error) {
      return this.errorResponse(res, error, 'Error fetching worklist summary');
    }
  }

  // GET /api/worklist/stats
  async getWorklistStats(req: Request, res: Response) {
    try {
      const result = await this.service.getAllWorklistsSummary();
      
      const stats = {
        totalPatientsWaiting: result.data.totals.totalPatients,
        totalUrgentCases: result.data.totals.totalUrgent,
        byDepartment: result.data.summary,
        timestamp: result.timestamp
      };

      return this.successResponse(res, stats, 'Worklist statistics fetched successfully');
    } catch (error) {
      return this.errorResponse(res, error, 'Error fetching worklist statistics');
    }
  }
}
