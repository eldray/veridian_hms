// HospitalController.ts
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { BaseController } from '../../shared/base/BaseController';
import { HospitalService } from './HospitalService';
import { CreateHospitalDTO, UpdateHospitalDTO } from './HospitalTypes';
import { AuthRequest } from '../../middleware/authMiddleware';

export class HospitalController extends BaseController {
  private hospitalService: HospitalService;

  constructor(hospitalService?: HospitalService) {
    super();
    this.hospitalService = hospitalService || new HospitalService();
  }

  // GET ALL HOSPITALS
  getHospitals = async (req: AuthRequest, res: Response) => {
    try {
      const hospitals = await this.hospitalService.getAllHospitals();
      this.ok(res, hospitals, 'Hospitals retrieved successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  // GET HOSPITAL BY ID
  getHospitalById = async (req: AuthRequest, res: Response) => {
    try {
      const hospital = await this.hospitalService.getHospitalById(req.params.id);

      if (!hospital) {
        return this.notFound(res, 'Hospital');
      }

      this.ok(res, hospital, 'Hospital retrieved successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  // CREATE HOSPITAL
  createHospital = async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.badRequest(res, 'Validation failed', errors.array());
      }

      const hospitalData: CreateHospitalDTO = req.body;

      const hospital = await this.hospitalService.createHospital(hospitalData);

      this.created(res, hospital, 'Hospital created successfully');
    } catch (error: any) {
      console.error('Error creating hospital:', error);

      // Handle duplicate NHIS facility code
      if (error.code === 'P2002' && error.meta?.target?.includes('nhisFacilityCode')) {
        return this.conflict(res, 'NHIS facility code already exists');
      }

      this.error(res, error);
    }
  };

  // UPDATE HOSPITAL
  updateHospital = async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.badRequest(res, 'Validation failed', errors.array());
      }

      const hospitalData: UpdateHospitalDTO = req.body;

      const hospital = await this.hospitalService.updateHospital(req.params.id, hospitalData);

      this.ok(res, hospital, 'Hospital updated successfully');
    } catch (error: any) {
      console.error('Error updating hospital:', error);

      if (error.code === 'P2025') {
        return this.notFound(res, 'Hospital');
      }

      if (error.code === 'P2002' && error.meta?.target?.includes('nhisFacilityCode')) {
        return this.conflict(res, 'NHIS facility code already exists');
      }

      this.error(res, error);
    }
  };

  // DELETE HOSPITAL
  deleteHospital = async (req: AuthRequest, res: Response) => {
    try {
      const hospital = await this.hospitalService.deleteHospital(req.params.id);

      this.ok(res, {
        deletedHospital: {
          id: hospital.id,
          name: hospital.name,
          nhisFacilityCode: hospital.nhisFacilityCode
        }
      }, 'Hospital deleted successfully');
    } catch (error: any) {
      console.error('Error deleting hospital:', error);

      if (error.code === 'P2025') {
        return this.notFound(res, 'Hospital');
      }

      this.error(res, error);
    }
  };

  // GET NHIS SETTINGS (Active Hospital)
  getHospitalNHISSettings = async (req: AuthRequest, res: Response) => {
    try {
      const nhisSettings = await this.hospitalService.getHospitalNHISSettings();

      if (!nhisSettings) {
        return this.notFound(res, 'Active hospital');
      }

      this.ok(res, nhisSettings, 'NHIS settings retrieved successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  // UPDATE NHIS SETTINGS (Active Hospital)
  updateHospitalNHISSettings = async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.badRequest(res, 'Validation failed', errors.array());
      }

      const settingsData: Partial<UpdateHospitalDTO> = req.body;

      const hospital = await this.hospitalService.updateActiveHospitalNHISSettings(settingsData);

      this.ok(res, {
        hospital: {
          name: hospital.name,
          nhisFacilityCode: hospital.nhisFacilityCode,
          nhisFacilityType: hospital.nhisFacilityType,
          nhisAccreditationNumber: hospital.nhisAccreditationNumber || undefined,
          nhisAccreditationDate: hospital.nhisAccreditationDate || undefined,
          nhisAccreditationExpiry: hospital.nhisAccreditationExpiry || undefined
        }
      }, 'NHIS settings updated successfully');
    } catch (error: any) {
      console.error('Error updating hospital NHIS settings:', error);

      if (error.code === 'P2025') {
        return this.notFound(res, 'Active hospital');
      }

      if (error.code === 'P2002' && error.meta?.target?.includes('nhisFacilityCode')) {
        return this.conflict(res, 'NHIS facility code already exists');
      }

      this.error(res, error);
    }
  };
}