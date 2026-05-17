// HospitalController.ts
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { HospitalService } from './HospitalService';
import { CreateHospitalDTO, UpdateHospitalDTO } from './HospitalTypes';

export class HospitalController {
  private hospitalService: HospitalService;

  constructor(hospitalService?: HospitalService) {
    this.hospitalService = hospitalService || new HospitalService();
  }

  // GET ALL HOSPITALS
  getHospitals = async (req: Request, res: Response) => {
    try {
      const hospitals = await this.hospitalService.getAllHospitals();
      res.json(hospitals);
    } catch (error) {
      console.error('Error fetching hospitals:', error);
      res.status(500).json({ 
        message: 'Error fetching hospitals', 
        error: error instanceof Error ? error.message : error 
      });
    }
  };

  // GET HOSPITAL BY ID
  getHospitalById = async (req: Request, res: Response) => {
    try {
      const hospital = await this.hospitalService.getHospitalById(req.params.id);

      if (!hospital) {
        return res.status(404).json({ message: 'Hospital not found' });
      }

      res.json(hospital);
    } catch (error) {
      console.error('Error fetching hospital:', error);
      res.status(500).json({ 
        message: 'Error fetching hospital', 
        error: error instanceof Error ? error.message : error 
      });
    }
  };

  // CREATE HOSPITAL
  createHospital = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const hospitalData: CreateHospitalDTO = req.body;

      const hospital = await this.hospitalService.createHospital(hospitalData);

      res.status(201).json(hospital);
    } catch (error: any) {
      console.error('Error creating hospital:', error);

      // Handle duplicate NHIS facility code
      if (error.code === 'P2002' && error.meta?.target?.includes('nhisFacilityCode')) {
        return res.status(400).json({
          message: 'NHIS facility code already exists'
        });
      }

      res.status(500).json({ 
        message: 'Error creating hospital', 
        error: error.message 
      });
    }
  };

  // UPDATE HOSPITAL
  updateHospital = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const hospitalData: UpdateHospitalDTO = req.body;

      const hospital = await this.hospitalService.updateHospital(req.params.id, hospitalData);

      res.json(hospital);
    } catch (error: any) {
      console.error('Error updating hospital:', error);

      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Hospital not found' });
      }

      if (error.code === 'P2002' && error.meta?.target?.includes('nhisFacilityCode')) {
        return res.status(400).json({
          message: 'NHIS facility code already exists'
        });
      }

      res.status(500).json({ 
        message: 'Error updating hospital', 
        error: error.message 
      });
    }
  };

  // DELETE HOSPITAL
  deleteHospital = async (req: Request, res: Response) => {
    try {
      const hospital = await this.hospitalService.deleteHospital(req.params.id);

      res.json({
        message: 'Hospital deleted successfully',
        deletedHospital: {
          id: hospital.id,
          name: hospital.name,
          nhisFacilityCode: hospital.nhisFacilityCode
        }
      });
    } catch (error: any) {
      console.error('Error deleting hospital:', error);

      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Hospital not found' });
      }

      res.status(500).json({ 
        message: 'Error deleting hospital', 
        error: error.message 
      });
    }
  };

  // GET NHIS SETTINGS (Active Hospital)
  getHospitalNHISSettings = async (req: Request, res: Response) => {
    try {
      const nhisSettings = await this.hospitalService.getHospitalNHISSettings();

      if (!nhisSettings) {
        return res.status(404).json({ message: 'No active hospital found' });
      }

      res.json(nhisSettings);
    } catch (error) {
      console.error('Error fetching hospital NHIS settings:', error);
      res.status(500).json({ 
        message: 'Error fetching hospital NHIS settings', 
        error: error instanceof Error ? error.message : error 
      });
    }
  };

  // UPDATE NHIS SETTINGS (Active Hospital)
  updateHospitalNHISSettings = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const settingsData: Partial<UpdateHospitalDTO> = req.body;

      const hospital = await this.hospitalService.updateActiveHospitalNHISSettings(settingsData);

      res.json({
        message: 'Hospital NHIS settings updated successfully',
        hospital: {
          name: hospital.name,
          nhisFacilityCode: hospital.nhisFacilityCode,
          nhisFacilityType: hospital.nhisFacilityType,
          nhisAccreditationNumber: hospital.nhisAccreditationNumber || undefined,
          nhisAccreditationDate: hospital.nhisAccreditationDate || undefined,
          nhisAccreditationExpiry: hospital.nhisAccreditationExpiry || undefined
        }
      });
    } catch (error: any) {
      console.error('Error updating hospital NHIS settings:', error);

      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'No active hospital found' });
      }

      if (error.code === 'P2002' && error.meta?.target?.includes('nhisFacilityCode')) {
        return res.status(400).json({
          message: 'NHIS facility code already exists'
        });
      }

      res.status(500).json({ 
        message: 'Error updating hospital NHIS settings', 
        error: error.message 
      });
    }
  };
}
