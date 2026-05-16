/**
 * Patient Controller
 * HTTP request handlers for Patient operations
 */

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
  }

  /**
   * GET /patients
   * Search and list patients with pagination
   */
  async searchPatients = this.asyncHandler(async (req: Request, res: Response) => {
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

    return this.paginated(res, result.data, result.pagination, 'Patients retrieved successfully');
  });

  /**
   * GET /patients/:id
   * Get patient by ID
   */
  async getPatientById = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const patient = await this.service.getPatientById(id, {
      attendances: true,
      admissions: true,
      appointments: true
    });

    // Calculate age and full name
    const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();
    const fullName = `${patient.firstName} ${patient.otherName || ''} ${patient.lastName}`.trim();

    return this.ok(
      res, 
      { ...patient, age, fullName }, 
      'Patient retrieved successfully'
    );
  });

  /**
   * GET /patients/nhis/:nhisNumber
   * Get patient by NHIS number
   */
  async getPatientByNHIS = this.asyncHandler(async (req: Request, res: Response) => {
    const { nhisNumber } = req.params;
    
    const patient = await this.service.getPatientByNHISNumber(nhisNumber);

    const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();
    const fullName = `${patient.firstName} ${patient.otherName || ''} ${patient.lastName}`.trim();

    return this.ok(
      res, 
      { ...patient, age, fullName }, 
      'Patient retrieved successfully'
    );
  });

  /**
   * POST /patients
   * Create a new patient
   */
  async createPatient = this.asyncHandler(async (req: Request, res: Response) => {
    const data: CreatePatientDTO = req.body;
    
    const patient = await this.service.createPatient(data);

    return this.created(res, patient, 'Patient created successfully');
  });

  /**
   * PUT /patients/:id
   * Update patient
   */
  async updatePatient = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = req.body;
    
    const patient = await this.service.updatePatient(id, data);

    return this.ok(res, patient, 'Patient updated successfully');
  });

  /**
   * DELETE /patients/:id
   * Delete patient
   */
  async deletePatient = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    await this.service.deletePatient(id);

    return this.ok(res, null, 'Patient deleted successfully');
  });

  /**
   * GET /patients/stats
   * Get patient statistics
   */
  async getStats = this.asyncHandler(async (req: Request, res: Response) => {
    const stats = await this.service.getPatientStats();

    return this.ok(res, stats, 'Patient statistics retrieved successfully');
  });

  /**
   * GET /patients/recent
   * Get recent patients
   */
  async getRecentPatients = this.asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    
    const patients = await this.service.getPatientSummaries(limit);

    return this.ok(res, patients, 'Recent patients retrieved successfully');
  });
}
