import { Request, Response } from 'express';
import { BedService } from './BedService';
import { CreateBedInput, UpdateBedInput } from './BedTypes';

export class BedController {
  private bedService: BedService;

  constructor(bedService: BedService) {
    this.bedService = bedService;
  }

  async getBeds(req: Request, res: Response): Promise<void> {
    try {
      const filter: any = {};
      
      if (req.query.wardId) {
        filter.wardId = req.query.wardId as string;
      }
      
      if (req.query.isOccupied !== undefined) {
        filter.isOccupied = req.query.isOccupied === 'true';
      }

      const beds = await this.bedService.getAllBeds(filter);
      res.json(beds);
    } catch (error) {
      console.error('Error fetching beds:', error);
      res.status(500).json({ 
        message: 'Error fetching beds', 
        error: (error as Error).message 
      });
    }
  }

  async getBedById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const bed = await this.bedService.getBedById(id);
      res.json(bed);
    } catch (error) {
      console.error('Error fetching bed:', error);
      res.status(404).json({ 
        message: 'Error fetching bed', 
        error: (error as Error).message 
      });
    }
  }

  async createBed(req: Request, res: Response): Promise<void> {
    try {
      const { wardId, bedNumber }: CreateBedInput = req.body;

      if (!wardId || !bedNumber) {
        res.status(400).json({ 
          message: 'Ward ID and bed number are required' 
        });
        return;
      }

      const bed = await this.bedService.createBed({ wardId, bedNumber });
      res.status(201).json(bed);
    } catch (error) {
      console.error('Error creating bed:', error);
      const errorMessage = (error as Error).message;
      
      if (errorMessage === 'Ward not found') {
        res.status(404).json({ message: errorMessage });
      } else if (errorMessage.includes('already exists')) {
        res.status(400).json({ message: errorMessage });
      } else {
        res.status(500).json({ 
          message: 'Error creating bed', 
          error: errorMessage 
        });
      }
    }
  }

  async updateBed(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateBedInput = req.body;

      const bed = await this.bedService.updateBed(id, data);
      res.json(bed);
    } catch (error) {
      console.error('Error updating bed:', error);
      const errorMessage = (error as Error).message;
      
      if (errorMessage === 'Bed not found') {
        res.status(404).json({ message: errorMessage });
      } else if (errorMessage.includes('already exists')) {
        res.status(400).json({ message: errorMessage });
      } else {
        res.status(500).json({ 
          message: 'Error updating bed', 
          error: errorMessage 
        });
      }
    }
  }

  async deleteBed(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.bedService.deleteBed(id);
      res.json({ message: 'Bed deleted successfully' });
    } catch (error) {
      console.error('Error deleting bed:', error);
      const errorMessage = (error as Error).message;
      
      if (errorMessage === 'Bed not found') {
        res.status(404).json({ message: errorMessage });
      } else if (errorMessage.includes('Cannot delete occupied bed')) {
        res.status(400).json({ message: errorMessage });
      } else {
        res.status(500).json({ 
          message: 'Error deleting bed', 
          error: errorMessage 
        });
      }
    }
  }
}
