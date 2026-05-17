import { Request, Response } from 'express';
import { waiverService } from './waiver.service';

export class WaiverController {
  // Create a new waiver request
  async create(req: Request, res: Response) {
    try {
      const result = await waiverService.create(req.body);
      res.status(201).json({
        success: true,
        message: 'Waiver request created successfully',
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create waiver request'
      });
    }
  }

  // Get all waivers with filters
  async getAll(req: Request, res: Response) {
    try {
      const { billId, patientId, status, startDate, endDate, page, limit } = req.query;
      const result = await waiverService.getAll({
        billId: billId as string,
        patientId: patientId as string,
        status: status as string,
        startDate: startDate as string,
        endDate: endDate as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
      });
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch waivers'
      });
    }
  }

  // Get waiver by ID
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await waiverService.getById(id);
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'Waiver not found'
      });
    }
  }

  // Approve waiver
  async approve(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { approvedBy, notes } = req.body;
      
      if (!approvedBy) {
        return res.status(400).json({
          success: false,
          message: 'approvedBy is required'
        });
      }

      const result = await waiverService.approve(id, approvedBy, notes);
      res.json({
        success: true,
        message: 'Waiver approved successfully',
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to approve waiver'
      });
    }
  }

  // Reject waiver
  async reject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { rejectedBy, notes } = req.body;
      
      if (!rejectedBy) {
        return res.status(400).json({
          success: false,
          message: 'rejectedBy is required'
        });
      }

      const result = await waiverService.reject(id, rejectedBy, notes);
      res.json({
        success: true,
        message: 'Waiver rejected successfully',
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to reject waiver'
      });
    }
  }

  // Get waiver statistics
  async getStatistics(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const result = await waiverService.getStatistics({
        startDate: startDate as string,
        endDate: endDate as string
      });
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch waiver statistics'
      });
    }
  }

  // Get waivers by bill
  async getByBill(req: Request, res: Response) {
    try {
      const { billId } = req.params;
      const result = await waiverService.getByBillId(billId);
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch waivers for bill'
      });
    }
  }

  // Get waivers by patient
  async getByPatient(req: Request, res: Response) {
    try {
      const { patientId } = req.params;
      const result = await waiverService.getByPatientId(patientId);
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch waivers for patient'
      });
    }
  }

  // Update waiver
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await waiverService.update(id, req.body);
      res.json({
        success: true,
        message: 'Waiver updated successfully',
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update waiver'
      });
    }
  }

  // Delete waiver
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await waiverService.delete(id);
      res.json({
        success: true,
        message: 'Waiver deleted successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to delete waiver'
      });
    }
  }
}

export const waiverController = new WaiverController();
