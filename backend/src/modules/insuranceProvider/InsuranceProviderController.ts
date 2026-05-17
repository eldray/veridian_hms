// InsuranceProviderController.ts
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { InsuranceProviderService } from './InsuranceProviderService';
import { CreateInsuranceProviderDTO, UpdateInsuranceProviderDTO } from './InsuranceProviderTypes';
import { InsuranceType } from '@prisma/client';
import { AuthRequest } from '../../middleware/authMiddleware';

export class InsuranceProviderController {
  private insuranceProviderService: InsuranceProviderService;

  constructor(insuranceProviderService?: InsuranceProviderService) {
    this.insuranceProviderService = insuranceProviderService || new InsuranceProviderService();
  }

  getInsuranceProviders = async (req: AuthRequest, res: Response) => {
    try {
      const { isActive = 'true', type } = req.query;

      const filters: any = {};
      if (isActive !== undefined) {
        filters.isActive = isActive === 'true';
      }
      if (type) {
        filters.type = type as InsuranceType;
      }

      const providers = await this.insuranceProviderService.getAllProviders(filters);

      res.json({
        success: true,
        data: providers
      });
    } catch (error) {
      console.error('Error fetching insurance providers:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching insurance providers',
        error: error instanceof Error ? error.message : error
      });
    }
  };

  getInsuranceProviderById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const provider = await this.insuranceProviderService.getProviderById(id);

      if (!provider) {
        return res.status(404).json({
          success: false,
          message: 'Insurance provider not found'
        });
      }

      res.json({
        success: true,
        data: provider
      });
    } catch (error) {
      console.error('Error fetching insurance provider:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching insurance provider',
        error: error instanceof Error ? error.message : error
      });
    }
  };

  createInsuranceProvider = async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: 'Validation failed'
        });
      }

      const { name, type, coveragePercentage, contactInfo } = req.body;

      const providerData: CreateInsuranceProviderDTO = {
        name,
        type: type as InsuranceType,
        coveragePercentage: parseFloat(coveragePercentage),
        contactInfo: contactInfo || null
      };

      const provider = await this.insuranceProviderService.createProvider(providerData);

      res.status(201).json({
        success: true,
        data: provider,
        message: 'Insurance provider created successfully'
      });
    } catch (error: any) {
      console.error('Error creating insurance provider:', error);
      
      if (error.message.includes('already exists')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error creating insurance provider',
        error: error.message
      });
    }
  };

  updateInsuranceProvider = async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: 'Validation failed'
        });
      }

      const { id } = req.params;
      const updateData: UpdateInsuranceProviderDTO = req.body;

      const provider = await this.insuranceProviderService.updateProvider(id, updateData);

      res.json({
        success: true,
        data: provider,
        message: 'Insurance provider updated successfully'
      });
    } catch (error: any) {
      if (error.message === 'Insurance provider not found') {
        return res.status(404).json({
          success: false,
          message: 'Insurance provider not found'
        });
      }

      if (error.message.includes('already exists')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      console.error('Error updating insurance provider:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating insurance provider',
        error: error.message
      });
    }
  };

  deleteInsuranceProvider = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      await this.insuranceProviderService.deleteProvider(id);

      res.json({
        success: true,
        message: 'Insurance provider deleted successfully'
      });
    } catch (error: any) {
      if (error.message === 'Insurance provider not found') {
        return res.status(404).json({
          success: false,
          message: 'Insurance provider not found'
        });
      }

      if (error.message.includes('Cannot delete')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      console.error('Error deleting insurance provider:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting insurance provider',
        error: error.message
      });
    }
  };

  toggleInsuranceProviderStatus = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const provider = await this.insuranceProviderService.toggleProviderStatus(id);

      const action = provider.isActive ? 'activated' : 'deactivated';

      res.json({
        success: true,
        data: provider,
        message: `Insurance provider ${action} successfully`
      });
    } catch (error: any) {
      if (error.message === 'Insurance provider not found') {
        return res.status(404).json({
          success: false,
          message: 'Insurance provider not found'
        });
      }

      console.error('Error toggling insurance provider status:', error);
      res.status(500).json({
        success: false,
        message: 'Error toggling insurance provider status',
        error: error.message
      });
    }
  };

  getInsuranceProviderStats = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const stats = await this.insuranceProviderService.getProviderStats(id);

      if (!stats) {
        return res.status(404).json({
          success: false,
          message: 'Insurance provider not found'
        });
      }

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching insurance provider statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching insurance provider statistics',
        error: error instanceof Error ? error.message : error
      });
    }
  };

  getInsuranceTypes = async (req: AuthRequest, res: Response) => {
    try {
      const types = await this.insuranceProviderService.getInsuranceTypes();
      
      res.json({
        success: true,
        data: types
      });
    } catch (error) {
      console.error('Error fetching insurance types:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching insurance types',
        error: error instanceof Error ? error.message : error
      });
    }
  };
}
