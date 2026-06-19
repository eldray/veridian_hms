import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { PatientService } from './PatientService';
import { CreatePatientDTO, PatientFilters, CreateAllergyDTO, CreateMedicalHistoryDTO } from './PatientTypes';

const prisma = new PrismaClient();

export class PatientController extends BaseController {
  private service: PatientService;

  constructor() {
    super();
    this.service = new PatientService(prisma);
    console.log('✅ PatientController initialized');
  }

  // ✅ Refactored to use asyncHandler and BaseController helpers
  searchPatients = this.asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    
    const filters: PatientFilters = {
      search: req.query.search as string,
      nhisNumber: req.query.nhisNumber as string,
      phone: req.query.phone as string,
      email: req.query.email as string,
      gender: req.query.gender as any,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      page,
      limit
    };

    const result = await this.service.searchPatients(filters);

    return this.paginated(
      res, 
      result.data, 
      { page, limit, total: result.pagination.total }, 
      'Patients retrieved successfully'
    );
  });

  getPatientById = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    // ✅ FIXED: Added new EMR relations (allergies, medicalHistories, etc.)
    const patient = await this.service.getPatientById(id, {
      Attendance: true,
      appointments: true,
      Bill: true,
      InsuranceClaim: true,
      InsuranceProvider: true,
      Vitals: true,
      NHISEligibilityCheck: true,
      ReferralRecord: true,
      antenatalBookings: true,
      PatientWaiver: true,
      deliveryRecords: true,
      abortionRecords: true,
      postnatalRecords: true,
      proformaInvoices: true,
      // NEW EMR Relations
      allergies: true,
      medicalHistories: true,
      surgicalHistories: true,
      familyHistories: true,
      consents: true
    });

    const age = this.service['calculateAge'](patient.dateOfBirth); // Accessing private method for DRY
    const fullName = `${patient.surname} ${patient.otherNames || ''}`.trim();

    return this.ok(res, { ...patient, age, fullName }, 'Patient retrieved successfully');
  });

  getPatientByNHIS = this.asyncHandler(async (req: Request, res: Response) => {
    const { nhisNumber } = req.params;
    const patient = await this.service.getPatientByNHISNumber(nhisNumber);

    const age = this.service['calculateAge'](patient.dateOfBirth);
    const fullName = `${patient.surname} ${patient.otherNames || ''}`.trim();

    return this.ok(res, { ...patient, age, fullName }, 'Patient retrieved successfully');
  });

  createPatient = this.asyncHandler(async (req: Request, res: Response) => {
    const data: CreatePatientDTO = req.body;
    const { age, ageInMonths, ...cleanData } = data; // Remove non-DB fields
    
    const patient = await this.service.createPatient(cleanData);
    return this.created(res, patient, 'Patient created successfully');
  });

  updatePatient = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const patient = await this.service.updatePatient(id, req.body);
    return this.ok(res, patient, 'Patient updated successfully');
  });

  deletePatient = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.service.deletePatient(id);
    return this.ok(res, null, 'Patient deleted successfully');
  });

  getStats = this.asyncHandler(async (req: Request, res: Response) => {
    const stats = await this.service.getPatientStats();
    return this.ok(res, stats, 'Patient statistics retrieved successfully');
  });

  getRecentPatients = this.asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const patients = await this.service.getPatientSummaries(limit);
    return this.ok(res, patients, 'Recent patients retrieved successfully');
  });

  getPatientsByCorporateAccount = this.asyncHandler(async (req: Request, res: Response) => {
    const { corporateAccountId } = req.params;
    const { page, limit } = this.getPaginationParams(req);

    const result = await this.service.getPatientsByCorporateAccount(corporateAccountId, page, limit);
    return this.paginated(res, result.data, { page, limit, total: result.pagination.total }, 'Corporate patients retrieved successfully');
  });

  getPatientCorporateSummary = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const summary = await this.service.getPatientCorporateSummary(id);
    return this.ok(res, summary, 'Corporate summary retrieved successfully');
  });

  // ==========================================
  // NEW: EMR (Allergies & Histories) Endpoints
  // ==========================================

  addAllergy = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const allergy = await this.service.addAllergy(id, req.body);
    return this.created(res, allergy, 'Allergy added successfully');
  });

  getAllergies = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const allergies = await this.service.getAllergies(id);
    return this.ok(res, allergies, 'Allergies retrieved successfully');
  });

  addMedicalHistory = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const history = await this.service.addMedicalHistory(id, req.body);
    return this.created(res, history, 'Medical history added successfully');
  });

  getMedicalHistories = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const histories = await this.service.getMedicalHistories(id);
    return this.ok(res, histories, 'Medical histories retrieved successfully');
  });
}