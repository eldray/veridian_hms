import { Request, Response } from 'express';
import { BedService } from './BedService';
import { CreateBedInput, UpdateBedInput } from './BedTypes';
import { AuthRequest } from '../../middleware/authMiddleware';

export class BedController {
  private bedService: BedService;

  constructor(bedService: BedService) {
    this.bedService = bedService;
  }

  async getBeds(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { page = '1', limit = '50', wardId, isOccupied } = req.query;
      
      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

      const filter: any = {};
      
      if (wardId) {
        filter.wardId = wardId as string;
      }
      
      if (isOccupied !== undefined) {
        filter.isOccupied = isOccupied === 'true';
      }

      const result = await this.bedService.getAllBeds(filter, pageNum, limitNum);
      
      res.json({
        success: true,
        data: result.beds,
        pagination: result.pagination,
        message: 'Beds retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching beds:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error fetching beds', 
        error: (error as Error).message 
      });
    }
  }

  async getBedById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const bed = await this.bedService.getBedById(id);
      
      res.json({
        success: true,
        data: bed,
        message: 'Bed retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching bed:', error);
      const errorMessage = (error as Error).message;
      
      if (errorMessage === 'Bed not found') {
        res.status(404).json({ 
          success: false,
          message: errorMessage 
        });
      } else {
        res.status(500).json({ 
          success: false,
          message: 'Error fetching bed', 
          error: errorMessage 
        });
      }
    }
  }

  async createBed(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { wardId, bedNumber }: CreateBedInput = req.body;

      if (!wardId || !bedNumber) {
        res.status(400).json({ 
          success: false,
          message: 'Ward ID and bed number are required' 
        });
        return;
      }

      // Validate bed number format
      if (!this.isValidBedNumber(bedNumber)) {
        res.status(400).json({ 
          success: false,
          message: 'Bed number must be alphanumeric (e.g., BED-001, A-01, 101)' 
        });
        return;
      }

      const bed = await this.bedService.createBed({ wardId, bedNumber });
      
      res.status(201).json({
        success: true,
        data: bed,
        message: 'Bed created successfully'
      });
    } catch (error) {
      console.error('Error creating bed:', error);
      const errorMessage = (error as Error).message;
      
      if (errorMessage === 'Ward not found') {
        res.status(404).json({ success: false, message: errorMessage });
      } else if (errorMessage.includes('already exists')) {
        res.status(400).json({ success: false, message: errorMessage });
      } else {
        res.status(500).json({ 
          success: false,
          message: 'Error creating bed', 
          error: errorMessage 
        });
      }
    }
  }

  async updateBed(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateBedInput = req.body;

      // Validate bed number format if provided
      if (data.bedNumber && !this.isValidBedNumber(data.bedNumber)) {
        res.status(400).json({ 
          success: false,
          message: 'Bed number must be alphanumeric (e.g., BED-001, A-01, 101)' 
        });
        return;
      }

      const bed = await this.bedService.updateBed(id, data);
      
      res.json({
        success: true,
        data: bed,
        message: 'Bed updated successfully'
      });
    } catch (error) {
      console.error('Error updating bed:', error);
      const errorMessage = (error as Error).message;
      
      if (errorMessage === 'Bed not found') {
        res.status(404).json({ success: false, message: errorMessage });
      } else if (errorMessage.includes('already exists')) {
        res.status(400).json({ success: false, message: errorMessage });
      } else {
        res.status(500).json({ 
          success: false,
          message: 'Error updating bed', 
          error: errorMessage 
        });
      }
    }
  }

  async deleteBed(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.bedService.deleteBed(id);
      
      res.json({ 
        success: true,
        message: 'Bed deleted successfully' 
      });
    } catch (error) {
      console.error('Error deleting bed:', error);
      const errorMessage = (error as Error).message;
      
      if (errorMessage === 'Bed not found') {
        res.status(404).json({ success: false, message: errorMessage });
      } else if (errorMessage.includes('Cannot delete occupied bed')) {
        res.status(400).json({ success: false, message: errorMessage });
      } else {
        res.status(500).json({ 
          success: false,
          message: 'Error deleting bed', 
          error: errorMessage 
        });
      }
    }
  }

  private isValidBedNumber(bedNumber: string): boolean {
    // Allow alphanumeric, hyphens, underscores, and spaces
    return /^[a-zA-Z0-9\s\-_]+$/.test(bedNumber);
  }
}