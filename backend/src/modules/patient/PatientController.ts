// modules/patient/PatientController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { PatientService } from './PatientService';
import { CreatePatientDTO, PatientFilters } from './PatientTypes';

const prisma = new PrismaClient();

export class PatientController extends BaseController {
  private service: PatientService;

  constructor() {
    super();
    this.service = new PatientService(prisma);
    console.log('✅ PatientController initialized');
  }

  async searchPatients(req: Request, res: Response) {
    try {
      const filters: PatientFilters = {
        search: req.query.search as string,
        nhisNumber: req.query.nhisNumber as string,
        phone: req.query.phone as string,
        email: req.query.email as string,
        gender: req.query.gender as any,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10
      };

      const result = await this.service.searchPatients(filters);

      return res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Patients retrieved successfully'
      });
    } catch (error: any) {
      console.error('❌ Error in searchPatients:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error fetching patients'
      });
    }
  }

  async getPatientById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // ✅ FIXED: Use correct relation names from schema
      const patient = await this.service.getPatientById(id, {
        Attendance: true,      // ✅ Singular, capital A (not Attendances)
        appointments: true,    // ✅ This is correct (lowercase a)
        Bill: true,            // ✅ Singular, capital B
        InsuranceClaim: true,  // ✅ Singular, capital I, capital C
        InsuranceProvider: true, // ✅ Singular, capital I, capital P
        Vitals: true,          // ✅ Singular, capital V
        NHISEligibilityCheck: true,
        ReferralRecord: true,
        antenatalBookings: true,
        PatientWaiver: true,
        deliveryRecords: true,
        abortionRecords: true,
        postnatalRecords: true,
        proformaInvoices: true
      });

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();
      const fullName = `${patient.surname} ${patient.otherNames || ''}`.trim();

      return res.json({
        success: true,
        data: { ...patient, age, fullName },
        message: 'Patient retrieved successfully'
      });
    } catch (error: any) {
      console.error('❌ Error in getPatientById:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error fetching patient'
      });
    }
  }

  async getPatientByNHIS(req: Request, res: Response) {
    try {
      const { nhisNumber } = req.params;
      
      const patient = await this.service.getPatientByNHISNumber(nhisNumber);

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();
      const fullName = `${patient.surname} ${patient.otherNames || ''}`.trim();

      return res.json({
        success: true,
        data: { ...patient, age, fullName },
        message: 'Patient retrieved successfully'
      });
    } catch (error: any) {
      console.error('❌ Error in getPatientByNHIS:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error fetching patient by NHIS'
      });
    }
  }

  async createPatient(req: Request, res: Response) {
    try {
      const data = req.body;
      
      // ✅ Remove fields that don't exist in the database schema
      const { age, ageInMonths, ...cleanData } = data;
      
      const patient = await this.service.createPatient(cleanData);
  
      return res.status(201).json({
        success: true,
        data: patient,
        message: 'Patient created successfully'
      });
    } catch (error: any) {
      console.error('❌ Error in createPatient:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error creating patient'
      });
    }
  }

  async updatePatient(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      
      const patient = await this.service.updatePatient(id, data);

      return res.json({
        success: true,
        data: patient,
        message: 'Patient updated successfully'
      });
    } catch (error: any) {
      console.error('❌ Error in updatePatient:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error updating patient'
      });
    }
  }

  async deletePatient(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      await this.service.deletePatient(id);

      return res.json({
        success: true,
        message: 'Patient deleted successfully'
      });
    } catch (error: any) {
      console.error('❌ Error in deletePatient:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error deleting patient'
      });
    }
  }

  async getStats(req: Request, res: Response) {
    try {
      const stats = await this.service.getPatientStats();

      return res.json({
        success: true,
        data: stats,
        message: 'Patient statistics retrieved successfully'
      });
    } catch (error: any) {
      console.error('❌ Error in getStats:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error fetching patient statistics'
      });
    }
  }

  async getRecentPatients(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      
      const patients = await this.service.getPatientSummaries(limit);

      return res.json({
        success: true,
        data: patients,
        message: 'Recent patients retrieved successfully'
      });
    } catch (error: any) {
      console.error('❌ Error in getRecentPatients:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error fetching recent patients'
      });
    }
  }

  // ✅ NEW: Get patients by corporate account
  async getPatientsByCorporateAccount(req: Request, res: Response) {
    try {
      const { corporateAccountId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.service.getPatientsByCorporateAccount(corporateAccountId, page, limit);

      return res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Corporate patients retrieved successfully'
      });
    } catch (error: any) {
      console.error('❌ Error in getPatientsByCorporateAccount:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error fetching corporate patients'
      });
    }
  }

  // ✅ NEW: Get patient corporate summary
  async getPatientCorporateSummary(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const summary = await this.service.getPatientCorporateSummary(id);

      return res.json({
        success: true,
        data: summary,
        message: 'Corporate summary retrieved successfully'
      });
    } catch (error: any) {
      console.error('❌ Error in getPatientCorporateSummary:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error fetching corporate summary'
      });
    }
  }
}